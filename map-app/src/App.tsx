import { useState, useMemo } from 'react';
import LeftPanel from './components/LeftPanel';
import MapView from './components/MapView';
import BundleView from './components/QuoteBundle';
import CreateBundleModal from './components/CreateBundleModal';
import { useBundles } from './useBundles';
import venuesData from './venues.json';
import type { Venue, Bundle, DateFilterPreset } from './types';
import { Toaster, toast } from 'react-hot-toast';
import type { QuoteStatus } from './types';

function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    // DD/MM/YYYY
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

type ActiveTab = 'map' | string; // 'map' or a bundle id

function App() {
  const venues: Venue[] = venuesData as Venue[];

  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bulkSelectBundleId, setBulkSelectBundleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<QuoteStatus>>(new Set(['draft', 'submitted', 'won', 'lost']));
  const [dateFilterType, setDateFilterType] = useState<DateFilterPreset>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: string, to: string }>({ from: '', to: '' });

  const {
    bundles,
    createBundle,
    deleteBundle,
    renameBundle,
    loadBundles,
    setDiscount,
    addVenueToBundle,
    removeVenueFromBundle,
    setNotesChange: setBundleNotes,
    setQuoteStatus,
    bulkSetQuoteStatus,
    getQuoteStatus,
    reorderVenuesInBundle,
    reorderBundles,
    getBundleForVenue,
    quoteStatuses,
  } = useBundles();

  const filteredVenues = useMemo(() => {
    let result = venues.filter(v => statusFilter.has(getQuoteStatus(v['Venue name'])));

    if (dateFilterType !== 'all') {
      const now = new Date();
      // Use start of day for accurate full-day comparisons
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      result = result.filter(v => {
        const d = parseDate(v['Date']);
        if (!d) return false;

        const dTime = d.getTime();

        if (dateFilterType === 'last7days') {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return dTime >= sevenDaysAgo.getTime();
        } else if (dateFilterType === 'last30days') {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return dTime >= thirtyDaysAgo.getTime();
        } else if (dateFilterType === 'thisMonth') {
          return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
        } else if (dateFilterType === 'lastMonth') {
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
        } else if (dateFilterType === 'thisYear') {
          return d.getFullYear() === today.getFullYear();
        } else if (dateFilterType === 'custom') {
          const fromStr = customDateRange.from;
          const toStr = customDateRange.to;
          let pass = true;
          if (fromStr) {
            const fromDate = new Date(fromStr);
            // Ignore timezone offsets by using parts or just comparing dates directly. Custom input is YYYY-MM-DD.
            // When standard Date parses YYYY-MM-DD it will default to UTC.
            if (!isNaN(fromDate.getTime()) && dTime < fromDate.getTime()) pass = false;
          }
          if (toStr) {
            const toDate = new Date(toStr);
            if (!isNaN(toDate.getTime()) && dTime > toDate.getTime()) pass = false;
          }
          return pass;
        }
        return true;
      });
    }

    return result;
  }, [venues, statusFilter, getQuoteStatus, dateFilterType, customDateRange]);

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
        parsedBundles.forEach((b: any) => {
          b.venueNames = b.venueNames.filter((n: string) => !seen.has(n));
          b.venueNames.forEach((n: string) => seen.add(n));
        });

        loadBundles(parsedBundles);
        // Note: we might also want to import quoteStatuses here if added to the export.

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
          onReorderBundles={reorderBundles}
          onExportSession={handleExportSession}
          onImportSession={handleImportSession}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          quoteStatuses={quoteStatuses}
          dateFilterType={dateFilterType}
          onDateFilterTypeChange={setDateFilterType}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
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
              quoteStatuses={quoteStatuses}
              setQuoteStatus={setQuoteStatus}
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
              onReorderVenues={reorderVenuesInBundle}
              quoteStatuses={quoteStatuses}
              setQuoteStatus={setQuoteStatus}
              bulkSetQuoteStatus={bulkSetQuoteStatus}
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
