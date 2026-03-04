import { useState, useMemo } from 'react';

import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import QuoteBundle from './components/QuoteBundle';
import venuesData from './venues.json';
import type { Venue } from './types';

function App() {
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'map' | 'bundle'>('map');
  const [discount, setDiscount] = useState<number>(0);

  const venues: Venue[] = venuesData as Venue[];

  const filteredVenues = useMemo(() => {
    if (selectedState === 'All') return venues;
    return venues.filter((v) => v.State === selectedState || v.is_hq);
  }, [venues, selectedState]);


  const uniqueStates = useMemo(() => {
    const states = new Set(venues.map((v) => v.State).filter(s => s && s !== 'Unknown'));
    return ['All', ...Array.from(states)].sort();
  }, [venues]);

  const handleVenueToggle = (venueName: string, selected: boolean) => {
    setSelectedVenues(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(venueName);
      } else {
        newSet.delete(venueName);
      }
      return newSet;
    });
  };

  const handleToggleAll = (selectAll: boolean) => {
    setSelectedVenues(prev => {
      const newSet = new Set(prev);
      filteredVenues.forEach(v => {
        if (!v.is_hq) {
          if (selectAll) newSet.add(v['Venue name']);
          else newSet.delete(v['Venue name']);
        }
      });
      return newSet;
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Venue Quotation Map</h1>
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            Map View
          </button>
          <button
            className={`tab-btn ${activeTab === 'bundle' ? 'active' : ''}`}
            onClick={() => setActiveTab('bundle')}
          >
            Quote Bundle ({selectedVenues.size})
          </button>
        </div>
      </header>

      {activeTab === 'map' ? (
        <div className="main-content">
          <Sidebar
            venues={filteredVenues}
            states={uniqueStates}
            selectedState={selectedState}
            onStateChange={setSelectedState}
            selectedVenues={selectedVenues}
            onVenueToggle={handleVenueToggle}
            onToggleAll={handleToggleAll}
          />
          <main className="map-container">
            <MapView
              venues={filteredVenues}
              selectedVenues={selectedVenues}
              onVenueToggle={handleVenueToggle}
            />
          </main>
        </div>
      ) : (
        <div className="main-content bundle-view">
          <QuoteBundle
            venues={venues}
            selectedVenues={selectedVenues}
            onRemoveVenue={handleVenueToggle}
            discount={discount}
            onDiscountChange={setDiscount}
          />
        </div>
      )}
    </div>
  );
}

export default App;
