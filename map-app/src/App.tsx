import { useState, useMemo } from 'react';
import LeftPanel from './components/LeftPanel';
import MapView from './components/MapView';
import BundleView from './components/QuoteBundle';
import CreateBundleModal from './components/CreateBundleModal';
import { useBundles } from './useBundles';
import venuesData from './venues.json';
import type { Venue } from './types';

type ActiveTab = 'map' | string; // 'map' or a bundle id

function App() {
  const venues: Venue[] = venuesData as Venue[];

  const [selectedState, setSelectedState] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    bundles,
    createBundle,
    deleteBundle,
    renameBundle,
    setDiscount,
    addVenueToBundle,
    removeVenueFromBundle,
    getBundleForVenue,
  } = useBundles();

  const uniqueStates = useMemo(() => {
    const states = new Set(venues.map(v => v.State).filter(s => s && s !== 'Unknown'));
    return ['All', ...Array.from(states)].sort();
  }, [venues]);

  const filteredVenues = useMemo(() => {
    if (selectedState === 'All') return venues;
    return venues.filter(v => v.State === selectedState || v.is_hq);
  }, [venues, selectedState]);

  const handleCreateBundle = (name: string, color: string) => {
    const id = createBundle(name, color);
    setShowCreateModal(false);
    setActiveTab(id); // switch to the new bundle tab immediately
  };

  const handleDeleteBundle = (bundleId: string) => {
    deleteBundle(bundleId);
    // If the active tab was this bundle, go back to map
    if (activeTab === bundleId) setActiveTab('map');
  };

  // If the activeTab points to a bundle that no longer exists, fall back to map
  const resolvedTab = activeTab === 'map' || bundles.some(b => b.id === activeTab)
    ? activeTab
    : 'map';

  const activeBundle = bundles.find(b => b.id === resolvedTab);

  return (
    <div className="app-container">
      {/* ─── Header ─── */}
      <header className="app-header">
        <div className="header-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="header-title">Venue Quoter</span>
        </div>

        <nav className="tab-navigation">
          {/* Map tab */}
          <button
            className={`tab-btn ${resolvedTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            Map View
          </button>

          {/* One tab per bundle */}
          {bundles.map(bundle => (
            <button
              key={bundle.id}
              className={`tab-btn bundle-tab ${resolvedTab === bundle.id ? 'active' : ''}`}
              style={{
                borderBottomColor: resolvedTab === bundle.id ? bundle.color : 'transparent',
                '--bundle-color': bundle.color,
              } as React.CSSProperties}
              onClick={() => setActiveTab(bundle.id)}
            >
              <span className="tab-bundle-dot" style={{ backgroundColor: bundle.color }} />
              {bundle.name}
              <span className="tab-count">{bundle.venueNames.length}</span>
            </button>
          ))}

          {/* New bundle shortcut */}
          <button
            className="tab-btn tab-new-bundle"
            onClick={() => setShowCreateModal(true)}
            title="Create new bundle"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Bundle
          </button>
        </nav>
      </header>

      {/* ─── Body ─── */}
      <div className="main-layout">
        {/* Left Panel — always visible */}
        <LeftPanel
          venues={venues}
          bundles={bundles}
          selectedState={selectedState}
          states={uniqueStates}
          onStateChange={setSelectedState}
          onOpenBundleTab={setActiveTab}
          onCreateBundle={() => setShowCreateModal(true)}
        />

        {/* Right content area */}
        <main className="main-content-area">
          {resolvedTab === 'map' ? (
            <MapView
              venues={filteredVenues}
              bundles={bundles}
              selectedState={selectedState}
              getBundleForVenue={getBundleForVenue}
              addVenueToBundle={addVenueToBundle}
              removeVenueFromBundle={removeVenueFromBundle}
            />
          ) : activeBundle ? (
            <BundleView
              bundle={activeBundle}
              venues={venues}
              onDiscountChange={setDiscount}
              onRemoveVenue={removeVenueFromBundle}
              onDeleteBundle={handleDeleteBundle}
              onRenameBundle={renameBundle}
            />
          ) : null}
        </main>
      </div>

      {/* Create Bundle Modal */}
      {showCreateModal && (
        <CreateBundleModal
          bundles={bundles}
          onConfirm={handleCreateBundle}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

export default App;
