import { useState, useMemo } from 'react';

import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import venuesData from './venues.json';
import type { Venue } from './types';

function App() {
  const [selectedState, setSelectedState] = useState<string>('All');

  const venues: Venue[] = venuesData as Venue[];

  const filteredVenues = useMemo(() => {
    if (selectedState === 'All') return venues;
    return venues.filter((v) => v.State === selectedState || v.is_hq);
  }, [venues, selectedState]);

  const uniqueStates = useMemo(() => {
    const states = new Set(venues.map((v) => v.State).filter(s => s && s !== 'Unknown'));
    return ['All', ...Array.from(states)].sort();
  }, [venues]);

  return (
    <div className="app-container">
      <Sidebar
        venues={filteredVenues}
        states={uniqueStates}
        selectedState={selectedState}
        onStateChange={setSelectedState}
      />
      <main className="map-container">
        <MapView venues={filteredVenues} />
      </main>
    </div>
  );
}

export default App;
