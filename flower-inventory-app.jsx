import React, { useState, useRef, useEffect } from 'react';
import { Camera, Package, PlayCircle, CheckCircle, Home, BarChart3, Box, Flower2, QrCode, X, Plus, Minus, Search } from 'lucide-react';

export default function FlowerInventoryApp() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [inventory, setInventory] = useState([
    { id: 'BOX001', type: 'Roses', color: 'Red', quantity: 200, unit: 'stems', location: 'inventory', date: new Date().toISOString() },
    { id: 'BOX002', type: 'Tulips', color: 'Yellow', quantity: 150, unit: 'stems', location: 'inventory', date: new Date().toISOString() },
    { id: 'BOX003', type: 'Lilies', color: 'White', quantity: 100, unit: 'stems', location: 'line-1', date: new Date().toISOString() }
  ]);
  const [productionLines, setProductionLines] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Line ${i + 1}`,
      status: i === 0 ? 'active' : 'idle',
      recipe: i === 0 ? 'Spring Mix' : null,
      items: i === 0 ? ['BOX003'] : [],
      produced: i === 0 ? 15 : 0
    }))
  );
  const [recipes, setRecipes] = useState([
    { id: 'R001', name: 'Spring Mix', flowers: [{ type: 'Roses', color: 'Red', quantity: 3 }, { type: 'Tulips', color: 'Yellow', quantity: 5 }, { type: 'Lilies', color: 'White', quantity: 2 }] },
    { id: 'R002', name: 'Romance Bundle', flowers: [{ type: 'Roses', color: 'Red', quantity: 12 }] },
    { id: 'R003', name: 'Garden Delight', flowers: [{ type: 'Tulips', color: 'Yellow', quantity: 6 }, { type: 'Lilies', color: 'White', quantity: 4 }] }
  ]);
  const [producedBunches, setProducedBunches] = useState([
    { id: 'BUN001', recipe: 'Spring Mix', line: 1, timestamp: new Date().toISOString(), status: 'completed' }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async (mode, lineId = null) => {
    setScanMode(mode);
    setSelectedLine(lineId);
    setScanning(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Camera access denied. Please enable camera permissions.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setScanMode(null);
    setSelectedLine(null);
  };

  const simulateScan = () => {
    // Simulate barcode scan - in production, integrate with a barcode scanning library
    const mockBarcodes = {
      'inventory': { id: `BOX${String(inventory.length + 1).padStart(3, '0')}`, type: 'Roses', color: 'Pink', quantity: 180, unit: 'stems' },
      'checkout': inventory.find(item => item.location === 'inventory')?.id,
      'checkin': `BOX${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
      'line': inventory.find(item => item.location === 'inventory')?.id,
      'output': `BUN${String(producedBunches.length + 1).padStart(3, '0')}`
    };

    const scannedData = mockBarcodes[scanMode];
    
    if (scanMode === 'inventory') {
      setInventory([...inventory, { 
        ...scannedData, 
        location: 'inventory', 
        date: new Date().toISOString() 
      }]);
      alert(`Box ${scannedData.id} added to inventory!`);
    } else if (scanMode === 'checkout') {
      setInventory(inventory.map(item => 
        item.id === scannedData ? { ...item, location: 'checked-out', date: new Date().toISOString() } : item
      ));
      alert(`Box ${scannedData} checked out!`);
    } else if (scanMode === 'line' && selectedLine) {
      setInventory(inventory.map(item => 
        item.id === scannedData ? { ...item, location: `line-${selectedLine}`, date: new Date().toISOString() } : item
      ));
      setProductionLines(productionLines.map(line => 
        line.id === selectedLine ? { ...line, items: [...line.items, scannedData], status: 'active' } : line
      ));
      alert(`Box ${scannedData} assigned to Line ${selectedLine}!`);
    } else if (scanMode === 'output' && selectedLine) {
      const line = productionLines.find(l => l.id === selectedLine);
      setProducedBunches([...producedBunches, {
        id: scannedData,
        recipe: line.recipe || 'Unknown',
        line: selectedLine,
        timestamp: new Date().toISOString(),
        status: 'completed'
      }]);
      setProductionLines(productionLines.map(l => 
        l.id === selectedLine ? { ...l, produced: l.produced + 1 } : l
      ));
      alert(`Bunch ${scannedData} completed on Line ${selectedLine}!`);
    }
    
    stopCamera();
  };

  const filteredInventory = inventory.filter(item => 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.color.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-gray-400';
      case 'maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getLocationBadgeColor = (location) => {
    if (location === 'inventory') return 'bg-blue-500';
    if (location === 'checked-out') return 'bg-orange-500';
    if (location.startsWith('line-')) return 'bg-green-500';
    return 'bg-gray-500';
  };

  // Dashboard View
  const DashboardView = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Bloom Manager</h2>
            <p className="text-pink-100 mt-1">Flower Production System</p>
          </div>
          <Flower2 size={48} className="opacity-80" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Boxes</p>
              <p className="text-2xl font-bold text-gray-800">{inventory.length}</p>
            </div>
            <Box className="text-blue-500" size={32} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Lines</p>
              <p className="text-2xl font-bold text-gray-800">{productionLines.filter(l => l.status === 'active').length}</p>
            </div>
            <PlayCircle className="text-green-500" size={32} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">In Stock</p>
              <p className="text-2xl font-bold text-gray-800">{inventory.filter(i => i.location === 'inventory').length}</p>
            </div>
            <Package className="text-purple-500" size={32} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Produced Today</p>
              <p className="text-2xl font-bold text-gray-800">{producedBunches.length}</p>
            </div>
            <CheckCircle className="text-rose-500" size={32} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <QrCode size={20} />
          Quick Actions
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => startCamera('inventory')}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 active:bg-blue-600"
          >
            <Camera size={20} />
            Scan New Box to Inventory
          </button>
          <button
            onClick={() => startCamera('checkout')}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 active:bg-orange-600"
          >
            <Package size={20} />
            Check Out Box
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-semibold text-gray-800 mb-3">Production Lines Status</h3>
        <div className="space-y-2">
          {productionLines.slice(0, 5).map(line => (
            <div key={line.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(line.status)}`}></div>
                <div>
                  <p className="font-medium text-gray-800">{line.name}</p>
                  <p className="text-sm text-gray-500">{line.recipe || 'Idle'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{line.produced}</p>
                <p className="text-xs text-gray-500">bunches</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Inventory View
  const InventoryView = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex items-center gap-2 mb-4">
          <Search className="text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-800"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm whitespace-nowrap">All</button>
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm whitespace-nowrap">In Stock</button>
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm whitespace-nowrap">In Production</button>
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm whitespace-nowrap">Checked Out</button>
      </div>

      <div className="space-y-3">
        {filteredInventory.map(item => (
          <div key={item.id} className="bg-white rounded-lg p-4 shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-800">{item.id}</p>
                <p className="text-sm text-gray-600">{item.type} - {item.color}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs text-white ${getLocationBadgeColor(item.location)}`}>
                {item.location === 'inventory' ? 'In Stock' : 
                 item.location === 'checked-out' ? 'Checked Out' : 
                 `Line ${item.location.split('-')[1]}`}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{item.quantity} {item.unit}</span>
              <span className="text-gray-400">{new Date(item.date).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => startCamera('inventory')}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center active:bg-blue-600"
      >
        <Plus size={28} />
      </button>
    </div>
  );

  // Production Lines View
  const ProductionView = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-semibold text-gray-800 mb-3">Production Lines</h3>
      </div>

      <div className="space-y-3">
        {productionLines.map(line => (
          <div key={line.id} className="bg-white rounded-lg p-4 shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${getStatusColor(line.status)}`}></div>
                <div>
                  <p className="font-semibold text-gray-800">{line.name}</p>
                  <p className="text-sm text-gray-500">{line.recipe || 'No active recipe'}</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-800">{line.produced}</span>
            </div>
            
            {line.items.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Boxes in line:</p>
                <div className="flex flex-wrap gap-1">
                  {line.items.map(itemId => (
                    <span key={itemId} className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded">
                      {itemId}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => startCamera('line', line.id)}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 active:bg-green-600"
              >
                <Camera size={16} />
                Add Box
              </button>
              <button
                onClick={() => startCamera('output', line.id)}
                className="flex-1 bg-rose-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 active:bg-rose-600"
              >
                <CheckCircle size={16} />
                Complete Bunch
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Recipes View
  const RecipesView = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-semibold text-gray-800 mb-3">Bunch Recipes</h3>
      </div>

      <div className="space-y-3">
        {recipes.map(recipe => (
          <div key={recipe.id} className="bg-white rounded-lg p-4 shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-800">{recipe.name}</p>
                <p className="text-xs text-gray-500">{recipe.id}</p>
              </div>
              <button className="text-blue-500 text-sm font-medium">Assign to Line</button>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">Composition:</p>
              {recipe.flowers.map((flower, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{flower.type} - {flower.color}</span>
                  <span className="text-gray-600 font-medium">{flower.quantity} stems</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        className="fixed bottom-24 right-6 w-14 h-14 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center active:bg-rose-600"
      >
        <Plus size={28} />
      </button>
    </div>
  );

  // Scanner View
  const ScannerView = () => (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 border-4 border-white rounded-lg opacity-50"></div>
        </div>

        <button
          onClick={stopCamera}
          className="absolute top-6 right-6 w-12 h-12 bg-white bg-opacity-30 backdrop-blur rounded-full flex items-center justify-center"
        >
          <X className="text-white" size={28} />
        </button>

        <div className="absolute top-6 left-6 bg-black bg-opacity-50 backdrop-blur px-4 py-2 rounded-full">
          <p className="text-white text-sm font-medium">
            {scanMode === 'inventory' && 'Scan box to add to inventory'}
            {scanMode === 'checkout' && 'Scan box to check out'}
            {scanMode === 'line' && `Scan box for Line ${selectedLine}`}
            {scanMode === 'output' && `Scan completed bunch from Line ${selectedLine}`}
          </p>
        </div>
      </div>

      <div className="bg-white p-6">
        <button
          onClick={simulateScan}
          className="w-full bg-blue-500 text-white py-4 rounded-lg font-semibold text-lg active:bg-blue-600"
        >
          Simulate Scan (Demo Mode)
        </button>
        <p className="text-center text-gray-500 text-xs mt-2">
          In production, this will automatically detect barcodes
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">
              {currentView === 'dashboard' && 'Dashboard'}
              {currentView === 'inventory' && 'Inventory'}
              {currentView === 'production' && 'Production Lines'}
              {currentView === 'recipes' && 'Recipes'}
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'inventory' && <InventoryView />}
        {currentView === 'production' && <ProductionView />}
        {currentView === 'recipes' && <RecipesView />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg ${
              currentView === 'dashboard' ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            <Home size={24} />
            <span className="text-xs font-medium">Home</span>
          </button>
          
          <button
            onClick={() => setCurrentView('inventory')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg ${
              currentView === 'inventory' ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            <Package size={24} />
            <span className="text-xs font-medium">Inventory</span>
          </button>
          
          <button
            onClick={() => setCurrentView('production')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg ${
              currentView === 'production' ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            <PlayCircle size={24} />
            <span className="text-xs font-medium">Lines</span>
          </button>
          
          <button
            onClick={() => setCurrentView('recipes')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg ${
              currentView === 'recipes' ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            <Flower2 size={24} />
            <span className="text-xs font-medium">Recipes</span>
          </button>
        </div>
      </div>

      {/* Scanner Overlay */}
      {scanning && <ScannerView />}
    </div>
  );
}