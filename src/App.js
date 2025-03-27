import React, { useState, useEffect } from 'react';
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

  // Initialize sound effects
  useEffect(() => {
    SoundUtils.preloadSounds();
  }, []);

  // Handle tile click
  const handleTileClick = (tile) => {
    setSelectedTile(tile);
    
    if (tile.hasChildren) {
      // Track parent for back navigation
      setParentStack(prev => [...prev, tile.id]);
      
      // Move to next view level
      if (currentView === 'main') {
        setCurrentView('splinters');
      } else if (currentView === 'splinters') {
        setCurrentView('fragments');
      }
    } else {
      // Show details modal for tiles without children
      setModalOpen(true);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (currentView === 'fragments') {
      setCurrentView('splinters');
    } else if (currentView === 'splinters') {
      setCurrentView('main');
    }
    
    // Pop the latest parent from the stack
    setParentStack(prev => prev.slice(0, -1));
    SoundUtils.play('click');
  };

  // Change active tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Reset view when changing to explore tab
    if (tab === 'explore') {
      setCurrentView('main');
      setParentStack([]);
    }
    
    SoundUtils.play('click');
  };

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
            <p>Each creative project appears as a unique shape in the Mosaic. The size reflects the amount of work invested.</p>
          </div>
        </div>
        
        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>Explore Different Versions with Splinters</h3>
            <p>Click on a project to break it apart and reveal its Splinters – variations that maintain the original vision while exploring new directions.</p>
          </div>
        </div>
        
        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3>Create Personal Interpretations with Fragments</h3>
            <p>Splinters can be further broken down into Fragments – more radical reinterpretations that take creative liberties.</p>
          </div>
        </div>
        
        <div className="step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h3>Fair IP Rights Distribution</h3>
            <p>Our unique algorithm balances concept creation (40%) and execution work (60%) to ensure everyone gets appropriate credit.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">Mosaic</div>
        <nav className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => handleTabChange('explore')}
          >
            Explore
          </button>
          <button 
            className={`nav-tab ${activeTab === 'philosophy' ? 'active' : ''}`}
            onClick={() => handleTabChange('philosophy')}
          >
            Philosophy
          </button>
          <button 
            className={`nav-tab ${activeTab === 'howItWorks' ? 'active' : ''}`}
            onClick={() => handleTabChange('howItWorks')}
          >
            How It Works
          </button>
        </nav>
      </header>
      
      <main className="main-content">
        {activeTab === 'explore' && (
          <div className="mosaic-container">
            {currentView !== 'main' && (
              <button className="back-button" onClick={handleBack}>
                ← Back
              </button>
            )}
            
            <InterlockingMosaic 
              onTileClick={handleTileClick}
              depth={currentView === 'main' ? 0 : currentView === 'splinters' ? 1 : 2}
              viewType={currentView}
            />
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
            
            <div className="detail-description">
              <p>This is a creative project represented by a {currentView === 'main' ? 'tile' : currentView === 'splinters' ? 'splinter' : 'fragment'} in the Mosaic.</p>
              <p>Click on tiles with a white center dot to explore their splinters and fragments.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;