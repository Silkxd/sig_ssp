
import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MapViewer } from './components/MapViewer';
import { DbService } from './utils/DbService';
import { useMapStore } from './store/useMapStore';

function App() {
  const { addLayer } = useMapStore();

  useEffect(() => {
    const loadLayers = async () => {
      console.log('Loading saved layers...');
      const savedLayers = await DbService.getSavedLayers();
      console.log('Saved Layers fetched:', savedLayers);
      savedLayers.forEach(layer => {
        addLayer(layer);
      });
      console.log(`Loaded ${savedLayers.length} layers from database.`);
    };

    loadLayers();
  }, [addLayer]);

  return (
    <div className="flex w-full h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 h-full relative">
        <MapViewer />
      </div>
    </div>
  );
}

export default App;
