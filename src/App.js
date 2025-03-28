import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import InterlockingMosaic from './components/InterlockingMosaic';
import Modal from './components/Modal';
import SoundUtils from './utils/SoundUtils';
import DebugPanel from './components/DebugPanel';

function App() {
  const [activeTab, setActiveTab] = useState('explore');
  const [currentView, setCurrentView] = useState('main');
  const [selectedTile, setSelectedTile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [parentStack, setParentStack] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Handle back navigation with visual history
  const handleBack = useCallback(() => {
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
  }, [modalOpen, currentView, handleBack]);

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

  // Handle direct navigation to a specific level - now used by BreadcrumbNavigation
  const handleDirectNavigation = useCallback((index) => {
    // Validate index
    if (index < 0 || index >= parentStack.length) return;
    
    // Update parent stack to include only items up to the clicked index
    setParentStack(prev => prev.slice(0, index + 1));
    
    // Set view based on the level
    setCurrentView(index === 0 ? 'splinters' : 'fragments');
    
    // Play click sound
    SoundUtils.play('click');
  }, [parentStack.length]);

  // Render philosophy content
  const renderPhilosophy = () => (
    <div className="content-area philosophy-content">
      <h1>Our Philosophy</h1>
      <p className="lead">
        Mosaic is founded on the belief that creative work flourishes through collaboration, 
        where diversity of ideas forms the cornerstone of innovation. Like the timeless artistry of 
        Roman mosaics, each contribution builds a unique whole, celebrating collective creativity 
        while honoring individual input.
      </p>
      
      <section className="content-section">
        <h2>Fair Recognition for All Contributors</h2>
        <p>
          One of the greatest challenges in creative collaboration is ensuring that everyone receives 
          appropriate credit and compensation for their contributions. Mosaic&apos;s unique algorithm 
          evaluates both conceptual contributions and execution work, ensuring that idea originators 
          receive fair recognition even if they lack the technical skills to execute their vision.
        </p>
        <p>
          In the classical tradition, where master artisans and apprentices worked together to create 
          enduring works, we believe in recognizing both the visionary and the craftsperson. Each 
          tile in our mosaic represents the perfect balance between concept and execution.
        </p>
      </section>
      
      <section className="content-section">
        <h2>The Value of Creative Evolution</h2>
        <p>
          Great ideas rarely emerge perfectly formed. They evolve through iteration, reinterpretation, 
          and collaborative enhancement. Our system of Tiles, Splinters, and Fragments visualizes this 
          creative evolution, making the intellectual genealogy of projects transparent and traceable.
        </p>
        <p>
          This process mirrors the evolution of classical art forms across centuries, where themes and 
          techniques were passed down, refined, and transformed. Every fragment in our system acknowledges 
          its origins while celebrating its unique contributions.
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
        <p>
          In the spirit of the Enlightenment thinkers who inspired works like "Liberty Leading the People," 
          we believe in the free exchange of ideas while ensuring proper attribution. Our framework 
          enables innovation while preserving the lineage of creative thought.
        </p>
      </section>
    </div>
  );

  // Render projects content
  const renderProjects = () => (
    <div className="content-area projects-content">
      <h1>Projects</h1>
      <p className="lead">
        Explore a diverse collection of creative collaborations managed through our visual version 
        control system. Each project represents a unique mosaic of contributions from talented individuals.
      </p>
      
      <div className="projects-grid">
        <div className="project-card">
          <div className="project-preview" style={{ backgroundColor: "#4e54c8" }}></div>
          <h3>Renaissance Reimagined</h3>
          <p>A collaborative digital recreation of classical Renaissance techniques applied to modern subjects.</p>
          <div className="project-contributors">12 contributors</div>
        </div>
        
        <div className="project-card">
          <div className="project-preview" style={{ backgroundColor: "#16a085" }}></div>
          <h3>Voices of Liberty</h3>
          <p>An audio-visual essay exploring the themes of freedom in contemporary society.</p>
          <div className="project-contributors">8 contributors</div>
        </div>
        
        <div className="project-card">
          <div className="project-preview" style={{ backgroundColor: "#e74c3c" }}></div>
          <h3>Architectural Visions</h3>
          <p>Conceptual designs inspired by neoclassical architecture adapted for sustainable urban living.</p>
          <div className="project-contributors">15 contributors</div>
        </div>
        
        <div className="project-card">
          <div className="project-preview" style={{ backgroundColor: "#f39c12" }}></div>
          <h3>Digital Antiquities</h3>
          <p>Modern interpretations of ancient mosaic techniques through digital media.</p>
          <div className="project-contributors">7 contributors</div>
        </div>
      </div>
      
      <div className="projects-cta">
        <button className="cta-button">Start Your Project</button>
        <button className="secondary-button">Browse All Projects</button>
      </div>
    </div>
  );

  // Render community content
  const renderCommunity = () => (
    <div className="content-area community-content">
      <h1>Community</h1>
      <p className="lead">
        Join a vibrant collective of creators dedicated to collaborative innovation and fair recognition 
        of creative contributions. Our community spans various disciplines, united by a shared philosophy.
      </p>
      
      <section className="community-section">
        <h2>Creative Collectives</h2>
        <p>
          Discover groups of like-minded creators working together on thematic projects. 
          Each collective functions as its own ecosystem within the broader Mosaic community,
          sharing resources and expertise while maintaining their unique creative identity.
        </p>
        <div className="collectives-preview">
          <div className="collective-item">Classical Revivalists</div>
          <div className="collective-item">Digital Humanists</div>
          <div className="collective-item">Modern Enlightenment</div>
          <div className="collective-item">Visual Storytellers</div>
        </div>
      </section>
      
      <section className="community-section">
        <h2>Events & Workshops</h2>
        <p>
          Participate in regular community events designed to foster collaboration, 
          share knowledge, and celebrate creative achievements. From virtual workshops 
          to exhibition showcases, our events calendar offers opportunities for growth and connection.
        </p>
        <div className="events-calendar">
          <div className="event-item">
            <div className="event-date">APR 15</div>
            <div className="event-info">
              <h4>Workshop: &quot;The Art of Collaborative Design&quot;</h4>
              <p>Virtual • 2:00 PM EDT</p>
            </div>
          </div>
          <div className="event-item">
            <div className="event-date">MAY 02</div>
            <div className="event-info">
              <h4>Exhibition: New Classical Movement</h4>
              <p>Online Gallery • All Day</p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="community-section">
        <h2>Join Us</h2>
        <p>
          Become part of our growing community of creators, thinkers, and makers.
          Whether you're an established artist or just beginning your creative journey,
          there's a place for you in the Mosaic.
        </p>
        <div className="join-actions">
          <button className="cta-button">Create Account</button>
          <button className="secondary-button">Learn More</button>
        </div>
      </section>
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
            Our Philosophy
          </button>
          <button 
            className={`nav-tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => handleTabChange('projects')}
            aria-selected={activeTab === 'projects'}
            role="tab"
          >
            Projects
          </button>
          <button 
            className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => handleTabChange('community')}
            aria-selected={activeTab === 'community'}
            role="tab"
          >
            Community
          </button>
          
          {/* Sound Controls */}
          <button 
            className={`sound-toggle ${soundEnabled ? 'sound-on' : 'sound-off'}`}
            onClick={handleToggleSound}
            aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
            title={soundEnabled ? "Sound On" : "Sound Off"}
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
            
            {/* Simple breadcrumb navigation */}
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
                    onClick={() => handleDirectNavigation(index)}
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
        {activeTab === 'projects' && renderProjects()}
        {activeTab === 'community' && renderCommunity()}
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
      
      {/* Debug panel for troubleshooting */}
      <DebugPanel />
    </div>
  );
}

export default App;