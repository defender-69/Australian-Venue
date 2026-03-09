import { useState, useMemo } from 'react';
import LeftPanel from './components/LeftPanel';
import MapView from './components/MapView';
import BundleView from './components/QuoteBundle';
import CreateBundleModal from './components/CreateBundleModal';
import { useBundles } from './useBundles';
import venuesData from './venues.json';
import type { Venue, Bundle } from './types';
import { Toaster, toast } from 'react-hot-toast';

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
    loadBundles,
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

  const handleExportSession = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bundles, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `quote-bundles-session-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("Session saved successfully");
  };

  const handleImportSession = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedBundles = JSON.parse(content) as Bundle[];

        // Very basic validation
        if (!Array.isArray(parsedBundles)) throw new Error("Invalid format");

        // Sanitize: ensure venue exclusivity across all bundles
        const seen = new Set<string>();
        parsedBundles.forEach(b => {
          b.venueNames = b.venueNames.filter(n => !seen.has(n));
          b.venueNames.forEach(n => seen.add(n));
        });

        loadBundles(parsedBundles);
        setActiveTab('map');
        toast.success("Session loaded successfully");
      } catch (error) {
        console.error("Failed to parse session file:", error);
        toast.error("Failed to load session. Invalid file format.");
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file could be selected again if needed
    event.target.value = '';
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
          onExportSession={handleExportSession}
          onImportSession={handleImportSession}
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
