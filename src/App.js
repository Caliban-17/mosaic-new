import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import InterlockingMosaic from './components/InterlockingMosaic';
import Modal from './components/Modal';
import SoundUtils from './utils/SoundUtils';

function App() {
  const [activeTab, setActiveTab] = useState('explore');
  const [currentView, setCurrentView] = useState('main');
  const [selectedTile, setSelectedTile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [parentStack, setParentStack] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize sound effects
  useEffect(() => {
    // Pre-load sounds for better performance
    SoundUtils.preloadSounds();
    
    // Initialize sound preference from stored settings
    setSoundEnabled(SoundUtils.enabled);
    
    // Add keyboard shortcuts for navigation
    const handleKeyDown = (e) => {
      // ESC key closes modal
      if (e.key === 'Escape' && modalOpen) {
        setModalOpen(false);
      }
      
      // Backspace or left arrow for going back in navigation
      if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && currentView !== 'main') {
        handleBack();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen, currentView]);

  // Handle tile click with enhanced feedback
  const handleTileClick = useCallback((tile) => {
    setSelectedTile(tile);
    
    if (tile.hasChildren) {
      // Track parent for back navigation
      setParentStack(prev => [...prev, { id: tile.id, color: tile.color }]);
      
      // Play appropriate sound based on current view
      if (currentView === 'main') {
        SoundUtils.play('shatter', { 
          position: { x: window.innerWidth / 2, y: window.innerHeight / 2 } 
        });
        setCurrentView('splinters');
      } else if (currentView === 'splinters') {
        SoundUtils.play('shatter', { 
          pitch: 1.2, // Higher pitch for fragment transition
          position: { x: window.innerWidth / 2, y: window.innerHeight / 2 } 
        });
        setCurrentView('fragments');
      }
    } else {
      // Show details modal for tiles without children
      SoundUtils.play('modal');
      setModalOpen(true);
    }
  }, [currentView]);

  // Handle back navigation with visual history
  const handleBack = useCallback(() => {
    // Get the previous parent color for transition effect
    const previousParent = parentStack[parentStack.length - 1];
    
    if (currentView === 'fragments') {
      setCurrentView('splinters');
    } else if (currentView === 'splinters') {
      setCurrentView('main');
    }
    
    // Pop the latest parent from the stack
    setParentStack(prev => prev.slice(0, -1));
    
    // Play sound with pitch variation for "going back"
    SoundUtils.play('click', { pitch: 0.9 });
  }, [currentView, parentStack]);

  // Change active tab
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    
    // Reset view when changing to explore tab
    if (tab === 'explore') {
      setCurrentView('main');
      setParentStack([]);
      
      // Play reset sound when returning to explore from other tabs
      if (activeTab !== 'explore') {
        SoundUtils.play('reset', { volume: 0.7 });
      } else {
        SoundUtils.play('click');
      }
    } else {
      // Regular tab change click sound
      SoundUtils.play('click');
    }
  }, [activeTab]);

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    const newState = SoundUtils.toggleSounds();
    setSoundEnabled(newState);
    
    // Play confirmation sound if enabling
    if (newState) {
      SoundUtils.play('click');
    }
  }, []);

  // Render philosophy content
  const renderPhilosophy = () => (
    <div className="content-area philosophy-content">
      <h1>Our Philosophy</h1>
      <p className="lead">
        Mosaic is a platform where the collaboration of diverse ideas forms the cornerstone of
        innovation. Like the timeless artistry of Roman mosaics, each contribution builds a unique
        whole, celebrating collective creativity.
      </p>
      
      <section className="content-section">
        <h2>Fair Recognition for All Contributors</h2>
        <p>
          One of the greatest challenges in creative collaboration is ensuring that everyone receives 
          appropriate credit and compensation for their contributions. Mosaic's unique algorithm 
          evaluates both conceptual contributions and execution work, ensuring that idea originators 
          receive fair recognition even if they lack the technical skills to execute their vision.
        </p>
      </section>
      
      <section className="content-section">
        <h2>The Value of Creative Evolution</h2>
        <p>
          Great ideas rarely emerge perfectly formed. They evolve through iteration, reinterpretation, 
          and collaborative enhancement. Our system of Tiles, Splinters, and Fragments visualizes this 
          creative evolution, making the intellectual genealogy of projects transparent and traceable.
        </p>
      </section>
      
      <section className="content-section">
        <h2>Intellectual Property Framework</h2>
        <p>
          Unlike traditional version control systems that focus solely on contributions to code, 
          Mosaic recognizes that creative work has multiple dimensions. Our IP allocation algorithm 
          gives 40% weight to conceptual work and 60% to execution, valuing both the idea creator 
          and those who bring it to life.
        </p>
      </section>
    </div>
  );

  // Render how it works content
  const renderHowItWorks = () => (
    <div className="content-area how-it-works-content">
      <h1>How Mosaic Works</h1>
      
      <div className="steps-container">
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>Create or Join a Creative Project</h3>
            <p>Each creative project appears as a unique shape in the Mosaic. The size reflects the amount of work invested, and the color represents the project's creative domain.</p>
          </div>
        </div>
        
        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>Explore Different Versions with Splinters</h3>
            <p>Click on a project with a white center dot to break it apart and reveal its Splinters – variations that maintain the original vision while exploring new directions.</p>
          </div>
        </div>
        
        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3>Create Personal Interpretations with Fragments</h3>
            <p>Splinters can be further broken down into Fragments – more radical reinterpretations that take creative liberties while still acknowledging their source.</p>
          </div>
        </div>
        
        <div className="step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h3>Fair IP Rights Distribution</h3>
            <p>Our unique algorithm balances concept creation (40%) and execution work (60%) to ensure everyone gets appropriate credit for their contributions to the creative process.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">Mosaic</div>
        <nav className="nav-tabs" role="tablist">
          <button 
            className={`nav-tab ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => handleTabChange('explore')}
            aria-selected={activeTab === 'explore'}
            role="tab"
          >
            Explore
          </button>
          <button 
            className={`nav-tab ${activeTab === 'philosophy' ? 'active' : ''}`}
            onClick={() => handleTabChange('philosophy')}
            aria-selected={activeTab === 'philosophy'}
            role="tab"
          >
            Philosophy
          </button>
          <button 
            className={`nav-tab ${activeTab === 'howItWorks' ? 'active' : ''}`}
            onClick={() => handleTabChange('howItWorks')}
            aria-selected={activeTab === 'howItWorks'}
            role="tab"
          >
            How It Works
          </button>
          
          {/* Added sound toggle button */}
          <button 
            className={`sound-toggle ${soundEnabled ? 'sound-on' : 'sound-off'}`}
            onClick={handleToggleSound}
            aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
            title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </nav>
      </header>
      
      <main className="main-content">
        {activeTab === 'explore' && (
          <div className="mosaic-container">
            {currentView !== 'main' && (
              <button 
                className="back-button" 
                onClick={handleBack}
                aria-label="Go back to previous view"
              >
                ← Back
              </button>
            )}
            
            <InterlockingMosaic 
              onTileClick={handleTileClick}
              depth={currentView === 'main' ? 0 : currentView === 'splinters' ? 1 : 2}
              viewType={currentView}
              parentColor={parentStack.length > 0 ? parentStack[parentStack.length - 1].color : null}
            />
            
            {/* Added visual breadcrumb navigation */}
            {parentStack.length > 0 && (
              <div className="navigation-breadcrumb">
                <button 
                  className="breadcrumb-home" 
                  onClick={() => {
                    setCurrentView('main');
                    setParentStack([]);
                    SoundUtils.play('reset');
                  }}
                  style={{ backgroundColor: "#3498db" }}
                  aria-label="Return to main mosaic"
                >
                  Home
                </button>
                
                {parentStack.map((parent, index) => (
                  <button 
                    key={index}
                    className={`breadcrumb-item ${index === parentStack.length - 1 ? 'active' : ''}`}
                    style={{ backgroundColor: parent.color }}
                    onClick={() => {
                      if (index < parentStack.length - 1) {
                        setParentStack(prev => prev.slice(0, index + 1));
                        setCurrentView(index === 0 ? 'splinters' : 'fragments');
                        SoundUtils.play('click');
                      }
                    }}
                    aria-label={`Navigate to level ${index + 1}`}
                  >
                    {index === 0 ? 'Splinters' : `Fragment ${index}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'philosophy' && renderPhilosophy()}
        {activeTab === 'howItWorks' && renderHowItWorks()}
      </main>
      
      {/* Modal for displaying tile details */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Project Details"
      >
        {selectedTile && (
          <div className="project-details">
            <div className="detail-row">
              <span className="detail-label">Project ID:</span>
              <span className="detail-value">{selectedTile.id}</span>
            </div>
            
            <div className="color-preview" style={{ backgroundColor: selectedTile.color }}></div>
            
            <div className="detail-row">
              <span className="detail-label">Sides:</span>
              <span className="detail-value">{selectedTile.sides}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Size:</span>
              <span className="detail-value">{Math.round(selectedTile.size)} units</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{
                currentView === 'main' ? 'Original Tile' : 
                currentView === 'splinters' ? 'Splinter' : 'Fragment'
              }</span>
            </div>
            
            <div className="detail-description">
              <p>This is a creative project represented by a {
                currentView === 'main' ? 'tile' : 
                currentView === 'splinters' ? 'splinter' : 'fragment'
              } in the Mosaic.</p>
              <p>Click on tiles with a white center dot to explore their splinters and fragments.</p>
            </div>
            
            {/* Added IP Rights visualization */}
            <div className="ip-rights-section">
              <h3>Intellectual Property Rights</h3>
              <div className="ip-rights-bar">
                <div 
                  className="concept-bar" 
                  style={{ width: '40%' }}
                  title="Concept Creation: 40%"
                >
                  <span>Concept 40%</span>
                </div>
                <div 
                  className="execution-bar" 
                  style={{ width: '60%' }}
                  title="Execution Work: 60%"
                >
                  <span>Execution 60%</span>
                </div>
              </div>
              <p className="ip-rights-note">
                This represents our standard IP rights allocation, balancing concept creation with execution work.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;