import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { throttle } from 'lodash';
import PropTypes from 'prop-types';
import './InterlockingMosaic.css';

import { useFocusMode } from '../../hooks/useFocusMode';
import usePanAndZoom from '../../hooks/usePanAndZoom';
import { createInteractionFeedback, isPointInPolygon } from '../../utils/InteractionUtils';
import { createEnhancedAnimations } from '../../utils/AnimationUtils';
import {
  toroidalDistance,
  polygonCentroid,
  drawTile,
  generateVoronoiRegionsToroidal,
  calculateGradient2D
} from '../../utils/TessellationUtils';
import SoundUtils from '../../utils/SoundUtils';

import MosaicLoader from './MosaicLoader';
import MosaicStatus from './MosaicStatus';
import MosaicControls from './MosaicControls';
import MosaicCanvas from './MosaicCanvas';

import TessellationWorker from 'worker-loader!../../workers/Tessellation.worker.js';

// --- Configuration Parameters ---
const WIDTH = 10.0; const HEIGHT = 8.0; const CENTER = [WIDTH / 2, HEIGHT / 2];
const NUM_POINTS = 500;
const LEARNING_RATE = 0.02; const LAMBDA_AREA = 2.5; const LAMBDA_CENTROID = 0.0;
const LAMBDA_ANGLE = 0.01; const LAMBDA_MIN_AREA = 0.0; const MIN_AREA_THRESHOLD = 0.0;
const TARGET_TOTAL_AREA = WIDTH * HEIGHT; const BASE_AREA = TARGET_TOTAL_AREA / NUM_POINTS;
const MAX_DIST = Math.sqrt(Math.pow(WIDTH / 2, 2) + Math.pow(HEIGHT / 2, 2));
const TARGET_AREA_FACTOR = 1.2;
const calculateTargetArea = (p) => { if (!p || p.length !== 2) return BASE_AREA; const dist = toroidalDistance(p, CENTER, WIDTH, HEIGHT); const normalizedDist = MAX_DIST > 0 ? dist / MAX_DIST : 0; const target = BASE_AREA * (1 + TARGET_AREA_FACTOR * (1 - normalizedDist)); return target > 0 ? target : 1e-9; };

// Corrected: Define as a plain const object outside the component
const STATIC_OPTIMIZATION_PARAMS = {
    width: WIDTH, height: HEIGHT, learningRate: LEARNING_RATE, lambdaArea: LAMBDA_AREA,
    lambdaCentroid: LAMBDA_CENTROID, lambdaAngle: LAMBDA_ANGLE, lambdaMinArea: LAMBDA_MIN_AREA,
    minAreaThreshold: MIN_AREA_THRESHOLD, verbose: false
};
// --- End Configuration ---


const InterlockingMosaic = ({ onTileClick, viewType = 'main' }) => {
  // State
  const [tiles, setTiles] = useState([]); const [selectedTileId, setSelectedTileId] = useState(null);
  const [isShattered, setIsShattered] = useState(false); const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...'); const [debugMode, setDebugMode] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0});
  const [time, setTime] = useState(0);
  const [currentPoints, setCurrentPoints] = useState([]);

  // Refs
  const containerRef = useRef(null); const canvasRef = useRef(null);
  const workerRef = useRef(null); const isMountedRef = useRef(false);
  const imageRef = useRef(null); const imageDataRef = useRef(null);
  const animationFrameRef = useRef(null); const iterationFrameRef = useRef(null);
  const isProcessingRef = useRef(false);
  const targetAreasRef = useRef([]);

  // Hooks
  const { focusMode, focusScale, interactionEnabled, initializeFocus, exitFocus } = useFocusMode();
  const { transform, panEnabled, setPanEnabled } = usePanAndZoom(containerRef, { domainWidth: WIDTH, domainHeight: HEIGHT });
  const interactionFeedback = useCallback(createInteractionFeedback(SoundUtils), []);
  // eslint-disable-next-line no-unused-vars
  const { enhancedShatterAnimation } = useMemo(createEnhancedAnimations, []); // This useMemo is correctly inside

   // --- Load Source Image ---
   useEffect(() => {
    console.log("Attempting to load source image..."); const img = new Image(); img.crossOrigin = "Anonymous"; img.onload = () => { console.log("Source image loaded."); imageRef.current = img; const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true }); tempCanvas.width = img.naturalWidth; tempCanvas.height = img.naturalHeight; try { const data = tempCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight); imageDataRef.current = data; console.log("ImageData extracted."); } catch (e) { console.error("Error getting ImageData:", e); } setImageLoaded(true); }; img.onerror = (err) => { console.error("Failed to load source image:", err); imageDataRef.current = null; setImageLoaded(true); }; // eslint-disable-next-line no-undef
    img.src = process.env.PUBLIC_URL + '/images/lady-liberty.jpeg';
   }, []);


  // --- Web Worker Setup and Initial Point Generation ---
  useEffect(() => {
    if (!imageLoaded) { setLoadingMessage('Loading source image...'); return; }
    isMountedRef.current = true; console.log('Component mounted, initializing worker...');
    try { workerRef.current = new TessellationWorker(); console.log('Worker initialized.'); }
    catch (e) { console.error("Failed to initialize Worker:", e); setIsLoading(false); setLoadingMessage("Error initializing worker."); return; }
    const worker = workerRef.current;
    if (currentPoints.length === 0) { setLoadingMessage('Generating initial state...'); const initialPoints = Array.from({ length: NUM_POINTS }, () => [ Math.random() * WIDTH, Math.random() * HEIGHT ]); setCurrentPoints(initialPoints); console.log(`Generated ${initialPoints.length} initial points.`); targetAreasRef.current = initialPoints.map(p => calculateTargetArea(p)); console.log(`Calculated ${targetAreasRef.current.length} target areas.`); const initialRegions = generateVoronoiRegionsToroidal(initialPoints, WIDTH, HEIGHT); if (initialRegions) { const sampleColor = (domainX, domainY) => { const d = imageDataRef.current, img = imageRef.current; if (!d || !img) return '#888'; const iw = img.naturalWidth, ih = img.naturalHeight; const ix = Math.floor((domainX/WIDTH)*iw), iy = Math.floor((domainY/HEIGHT)*ih); const cx=Math.max(0,Math.min(iw-1,ix)), cy=Math.max(0,Math.min(ih-1,iy)); const idx=(cy*iw+cx)*4; if(idx<0||idx+3>=d.data.length) return '#f0f'; const r=d.data[idx],g=d.data[idx+1],b=d.data[idx+2]; return `rgb(${r},${g},${b})`; }; const initialTiles = initialPoints.map((pt, i) => { const pcs = initialRegions[i]||[]; const mp = pcs.length>0?pcs[0]:null; const cent = mp?polygonCentroid(mp):pt; const clr=sampleColor(cent[0],cent[1]); return {id:`tile-${i}`, points:mp||[], allPieces:pcs, x:cent[0], y:cent[1], generatorX:pt[0], generatorY:pt[1], color:clr, hasChildren:Math.random()>0.9};}); setTiles(initialTiles); console.log("Processed initial tiles."); } else { console.error("Failed to generate initial regions."); } setIsLoading(false); setLoadingMessage(''); }
    worker.onmessage = (event) => { if (!isMountedRef.current) return; const { status, message, result } = event.data; if (status === 'iterationStepComplete') { if (result && result.points) { const newPoints = result.points; const newRegions = generateVoronoiRegionsToroidal(newPoints, WIDTH, HEIGHT); if (newRegions) { const sampleColor = (domainX, domainY) => { const d = imageDataRef.current, img = imageRef.current; if (!d || !img) { return '#888'; } const iw = img.naturalWidth, ih = img.naturalHeight; const ix = Math.floor((domainX/WIDTH)*iw), iy = Math.floor((domainY/HEIGHT)*ih); const cx=Math.max(0,Math.min(iw-1,ix)), cy=Math.max(0,Math.min(ih-1,iy)); const idx=(cy*iw+cx)*4; if(idx<0||idx+3>=d.data.length) { return '#f0f'; } const r=d.data[idx],g=d.data[idx+1],b=d.data[idx+2]; return `rgb(${r},${g},${b})`; }; const newTiles = newPoints.map((point, i) => { const pcs = newRegions[i]||[]; const mp = pcs.length>0?pcs[0]:null; const cent = mp?polygonCentroid(mp):point; const clr=sampleColor(cent[0],cent[1]); return {id:`tile-${i}`, points:mp||[], allPieces:pcs, x:cent[0], y:cent[1], generatorX:point[0], generatorY:point[1], color:clr, hasChildren:Math.random()>0.9};}); setTiles(newTiles); } else { console.warn("Main thread failed to generate regions."); } setCurrentPoints(newPoints); } else { console.warn('Incomplete iteration step result:', result); } requestAnimationFrame(() => { isProcessingRef.current = false; }); } else if (status === 'error') { console.error('Worker Error:', message, event.data.stack); setLoadingMessage(`Error: ${message}`); setIsLoading(false); isProcessingRef.current = false; } };
     worker.onerror = (error) => { if (!isMountedRef.current) return; console.error('Worker onerror:', error); setLoadingMessage(`Worker error: ${error.message || 'Unknown'}`); setIsLoading(false); isProcessingRef.current = false; };
    return () => { console.log('Unmounting. Terminating worker.'); isMountedRef.current = false; if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; } if (iterationFrameRef.current) cancelAnimationFrame(iterationFrameRef.current); };
  }, [imageLoaded]);


  // --- Continuous Iteration Loop ---
  useEffect(() => {
      if (isLoading || !workerRef.current || currentPoints.length === 0 || !targetAreasRef.current || targetAreasRef.current.length !== currentPoints.length) { return; }
      let isActive = true;
      const requestNextIteration = () => {
          if (!isActive || !isMountedRef.current || !workerRef.current || isProcessingRef.current) { if(isActive) iterationFrameRef.current = requestAnimationFrame(requestNextIteration); return; }
           isProcessingRef.current = true;
           const currentParams = { ...STATIC_OPTIMIZATION_PARAMS, targetAreas: targetAreasRef.current }; // Use the const defined outside
           const currentRegions = generateVoronoiRegionsToroidal(currentPoints, WIDTH, HEIGHT);
           if (!currentRegions) { console.warn("Iteration loop: Failed regions for gradient calc."); isProcessingRef.current = false; if(isActive) iterationFrameRef.current = requestAnimationFrame(requestNextIteration); return; }
           const grad = calculateGradient2D(currentPoints, currentParams, 1e-6);
           let gradFinite = grad.every(g => isFinite(g[0]) && isFinite(g[1])); let gradNorm = gradFinite ? Math.sqrt(grad.reduce((sum, g) => sum + g[0]**2 + g[1]**2, 0)) : Infinity;
           if (!gradFinite || gradNorm < 1e-9) { isProcessingRef.current = false; if(isActive) iterationFrameRef.current = requestAnimationFrame(requestNextIteration); return; }
           workerRef.current.postMessage({ command: 'iterate_step', data: { currentPoints: currentPoints, grad: grad, params: currentParams, requestId: `iterate-step-${Date.now()}` } });
           iterationFrameRef.current = requestAnimationFrame(requestNextIteration);
      };
      iterationFrameRef.current = requestAnimationFrame(requestNextIteration);
      return () => { isActive = false; if (iterationFrameRef.current) { cancelAnimationFrame(iterationFrameRef.current); iterationFrameRef.current = null; } isProcessingRef.current = false; };
  }, [isLoading, currentPoints, STATIC_OPTIMIZATION_PARAMS]); // Dependency is now the static params object


  // --- Animation Loop for Time (Pulsing Effect) ---
  useEffect(() => { let isActive = true; const loop = (currentTime) => { if (!isActive) return; setTime(currentTime); animationFrameRef.current = requestAnimationFrame(loop); }; animationFrameRef.current = requestAnimationFrame(loop); return () => { isActive = false; if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); } }; }, []);


  // --- Dynamic Canvas Resizing Logic ---
  useEffect(() => { const resizeCanvas = () => { if (!canvasRef.current || !containerRef.current) return; const canvas = canvasRef.current; const container = containerRef.current; const rect = container.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; const targetWidth = Math.max(1, Math.floor(rect.width * dpr)); const targetHeight = Math.max(1, Math.floor(rect.height * dpr)); const targetStyleWidth = Math.max(1, rect.width); const targetStyleHeight = Math.max(1, rect.height); let needsUpdate = false; if (canvas.width !== targetWidth || canvas.height !== targetHeight) { canvas.width = targetWidth; canvas.height = targetHeight; needsUpdate = true; } if (canvasSize.width !== targetStyleWidth || canvasSize.height !== targetStyleHeight) { setCanvasSize({ width: targetStyleWidth, height: targetStyleHeight }); needsUpdate = true; } if (needsUpdate) { const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); } }; let resizeObserver; let initialResizeFrameId; const observedElement = containerRef.current; if (observedElement) { const handleResize = throttle(resizeCanvas, 100, { leading: false, trailing: true }); resizeObserver = new ResizeObserver(handleResize); resizeObserver.observe(observedElement); initialResizeFrameId = requestAnimationFrame(resizeCanvas); } else { console.warn("Container ref not ready"); initialResizeFrameId = requestAnimationFrame(resizeCanvas); } return () => { if (resizeObserver && observedElement) { resizeObserver.unobserve(observedElement); } if (initialResizeFrameId) cancelAnimationFrame(initialResizeFrameId); }; }, []);


  // --- Canvas Drawing Effect ---
  useEffect(() => {
    if (!canvasRef.current || tiles.length === 0 || canvasSize.width <= 0) return; // Removed isLoading check
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1; const displayWidth = canvasSize.width; const displayHeight = canvasSize.height; const scaleX = displayWidth / WIDTH; const scaleY = displayHeight / HEIGHT; const baseDomainScale = Math.max(scaleX, scaleY); const baseTranslateX = (displayWidth - WIDTH * baseDomainScale) / 2; const baseTranslateY = (displayHeight - HEIGHT * baseDomainScale) / 2; const pulseSpeed = 30000; const pulseMagnitude = 0.003; const dynamicScaleBase = 1.0 + Math.sin(time / pulseSpeed) * pulseMagnitude;
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#13192a'; ctx.fillRect(0, 0, displayWidth, displayHeight); ctx.restore();
    ctx.save(); ctx.translate(baseTranslateX, baseTranslateY); ctx.scale(baseDomainScale, baseDomainScale);
    tiles.forEach(tile => { drawTile(ctx, tile, dynamicScaleBase); }); // Use color fill version
    ctx.restore();
  }, [tiles, canvasSize, time]); // Removed isLoading dependency


  // --- Interaction Handlers ---
  const getDomainCoords = useCallback((canvasX, canvasY) => { const canvas = canvasRef.current; const container = containerRef.current; if (!canvas || !container || canvasSize.width <= 0) return null; const displayWidth = canvasSize.width; const displayHeight = canvasSize.height; const scaleX = displayWidth / WIDTH; const scaleY = displayHeight / HEIGHT; const baseScale = Math.max(scaleX, scaleY); const baseTranslateX = (displayWidth - WIDTH * baseScale) / 2; const baseTranslateY = (displayHeight - HEIGHT * baseScale) / 2; const currentPanZoomScale = transform.scale; const currentPanX = transform.x; const currentPanY = transform.y; const currentFocusScale = focusScale; const totalScale = currentPanZoomScale * currentFocusScale; const canvasCenterX = displayWidth / 2; const canvasCenterY = displayHeight / 2; const xRelativeToCenter = canvasX - canvasCenterX; const yRelativeToCenter = canvasY - canvasCenterY; const preScaleX = xRelativeToCenter / totalScale; const preScaleY = yRelativeToCenter / totalScale; const preScaleTopLeftX = preScaleX + canvasCenterX; const preScaleTopLeftY = preScaleY + canvasCenterY; const preTranslateX = preScaleTopLeftX - currentPanX; const preTranslateY = preScaleTopLeftY - currentPanY; let domainX = (preTranslateX - baseTranslateX) / baseScale; let domainY = (preTranslateY - baseTranslateY) / baseScale; domainX = ((domainX % WIDTH) + WIDTH) % WIDTH; domainY = ((domainY % HEIGHT) + HEIGHT) % HEIGHT; return { x: domainX, y: domainY }; }, [transform, focusScale, canvasSize]);
  const findTileAtDomainPoint = useCallback((domainX, domainY) => { if (tiles.length === 0 || domainX === null || domainY === null) return null; const found = tiles.find(tile => tile.points && tile.points.length >= 3 && isPointInPolygon(domainX, domainY, tile.points)); return found; }, [tiles]);
  const handleCanvasClick = useCallback( throttle((event) => { if (isShattered || !interactionEnabled || panEnabled) return; const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); const canvasX = event.clientX - rect.left; const canvasY = event.clientY - rect.top; const domainCoords = getDomainCoords(canvasX, canvasY); if (!domainCoords) return; const clickedTile = findTileAtDomainPoint(domainCoords.x, domainCoords.y); if (clickedTile) { const current = selectedTileId === clickedTile.id; setSelectedTileId(clickedTile.id); if (current && event.detail === 2) { if (focusMode) exitFocus(); else initializeFocus({ x: clickedTile.x, y: clickedTile.y }); return; } if (clickedTile.hasChildren) { setIsShattered(true); interactionFeedback('shatter'); setTimeout(() => { if (isMountedRef.current) setIsShattered(false); if (isMountedRef.current && onTileClick) onTileClick(clickedTile); }, 500); } else { interactionFeedback('click'); if (onTileClick) onTileClick(clickedTile); } } else { setSelectedTileId(null); } }, 200), [tiles, onTileClick, isShattered, interactionEnabled, selectedTileId, focusMode, exitFocus, initializeFocus, interactionFeedback, panEnabled, getDomainCoords, findTileAtDomainPoint]);
  const handleCanvasHover = useCallback( throttle((event) => { const canvas = canvasRef.current; if (!canvas || isShattered || !interactionEnabled || panEnabled) { if(canvas) canvas.style.cursor = panEnabled ? 'grab' : 'default'; return; }; const rect = canvas.getBoundingClientRect(); const canvasX = event.clientX - rect.left; const canvasY = event.clientY - rect.top; const domainCoords = getDomainCoords(canvasX, canvasY); const hoveredTile = domainCoords ? findTileAtDomainPoint(domainCoords.x, domainCoords.y) : null; canvas.style.cursor = hoveredTile ? 'pointer' : (panEnabled ? 'grab' : 'default'); }, 50), [tiles, isShattered, interactionEnabled, panEnabled, getDomainCoords, findTileAtDomainPoint]);
  const handleTogglePan = () => { setPanEnabled(!panEnabled); }; const handleToggleFocus = () => { focusMode ? exitFocus() : initializeFocus(); }; const handleToggleDebug = () => { setDebugMode(!debugMode); };

  // --- Render ---
  return ( <div className={`interlocking-mosaic ${isShattered ? 'shattered' : ''} ${viewType} ${focusMode ? 'focus-mode' : ''}`} ref={containerRef} aria-label={`${viewType} visualization`} style={{ backgroundColor: '#13192a', cursor: panEnabled ? 'grab' : 'default', overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }} > {isLoading && <MosaicLoader message={loadingMessage} />} <MosaicCanvas ref={canvasRef} onClick={handleCanvasClick} onMouseMove={handleCanvasHover} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transformOrigin: 'center center', transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale * focusScale})` }} /> <MosaicStatus viewType={viewType} tileCount={tiles.length} debugMode={debugMode} /> <MosaicControls viewType={viewType} focusMode={focusMode} onToggleFocus={handleToggleFocus} onToggleDebug={handleToggleDebug} debugMode={debugMode} panEnabled={panEnabled} onTogglePan={handleTogglePan} /> </div> );
};
InterlockingMosaic.propTypes = { onTileClick: PropTypes.func, viewType: PropTypes.string, };
export default InterlockingMosaic;
