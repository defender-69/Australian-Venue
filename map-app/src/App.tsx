import { useState, useMemo } from 'react';

import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import venuesData from './venues.json';
import type { Venue } from './types';

function App() {
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());

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
  );
}

export default App;
