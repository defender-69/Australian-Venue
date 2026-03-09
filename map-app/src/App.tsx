import { useState, useMemo } from 'react';
import LeftPanel from './components/LeftPanel';
import MapView from './components/MapView';
import BundleView from './components/QuoteBundle';
import CreateBundleModal from './components/CreateBundleModal';
import { useBundles } from './useBundles';
import venuesData from './venues.json';
import type { Venue } from './types';
import { Toaster } from 'react-hot-toast';

type ActiveTab = 'map' | string; // 'map' or a bundle id



function App() {
  const venues: Venue[] = venuesData as Venue[];

  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bulkSelectBundleId, setBulkSelectBundleId] = useState<string | null>(null);

  const {
    bundles,
    createBundle,
    deleteBundle,
    renameBundle,
    setDiscount,
    addVenueToBundle,
    removeVenueFromBundle,
    setBundleNotes,
    setBundleStatus,
    reorderVenuesInBundle,
    getBundleForVenue,
  } = useBundles();

  const filteredVenues = useMemo(() => {
    return venues;
  }, [venues]);

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
      {/* ─── Body ─── */}
      <div className="main-layout">
        {/* Left Panel — always visible */}
        <LeftPanel
          venues={venues}
          bundles={bundles}
          activeTab={resolvedTab}
          onOpenBundleTab={setActiveTab}
          onCreateBundle={() => setShowCreateModal(true)}
          onBulkSelectFromMap={(bundleId: string) => {
            setBulkSelectBundleId(bundleId);
            setActiveTab('map');
          }}
        />

        {/* Right content area */}
        <main className="main-content-area">
          {resolvedTab === 'map' ? (
            <MapView
              venues={filteredVenues}
              bundles={bundles}
              getBundleForVenue={getBundleForVenue}
              addVenueToBundle={addVenueToBundle}
              removeVenueFromBundle={removeVenueFromBundle}
              bulkSelectBundleId={bulkSelectBundleId}
              onBulkSelectComplete={() => setBulkSelectBundleId(null)}
            />
          ) : activeBundle ? (
            <BundleView
              bundle={activeBundle}
              venues={venues}
              onDiscountChange={setDiscount}
              onRemoveVenue={removeVenueFromBundle}
              onDeleteBundle={handleDeleteBundle}
              onRenameBundle={renameBundle}
              onNotesChange={setBundleNotes}
              onStatusChange={setBundleStatus}
              onReorderVenues={reorderVenuesInBundle}
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
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
