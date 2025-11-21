import React, { useState, useRef, useEffect } from 'react';
import { Camera, Package, PlayCircle, CheckCircle, Home, Box, Flower2, QrCode, X, Plus, Search, LogOut } from 'lucide-react';
import { supabase, signUp, signIn, signOut, getCurrentUser, subscribeToTable } from './supabaseClient';
import { BrowserMultiFormatReader } from '@zxing/library';

export default function FlowerInventoryApp() {
  // Auth state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // App state
  const [currentView, setCurrentView] = useState('dashboard');
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [productionLines, setProductionLines] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [producedBunches, setProducedBunches] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    flowers: [{ id: Date.now(), type: '', color: '', quantity: '' }]
  });
  
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize auth listener
  useEffect(() => {
    // Check current session
    getCurrentUser().then(currentUser => {
      setUser(currentUser);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      loadAllData();
      const cleanup = setupRealtimeSubscriptions();
      return cleanup;
    }
  }, [user]);

  const loadAllData = async () => {
    // Load inventory
    const { data: inventoryData } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });
    if (inventoryData) setInventory(inventoryData);

    // Load production lines
    const { data: linesData } = await supabase
      .from('production_lines')
      .select('*')
      .order('id', { ascending: true });
    if (linesData) setProductionLines(linesData);

    // Load recipes
    const { data: recipesData } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });
    if (recipesData) setRecipes(recipesData);

    // Load produced bunches
    const { data: bunchesData } = await supabase
      .from('produced_bunches')
      .select('*')
      .order('produced_at', { ascending: false });
    if (bunchesData) setProducedBunches(bunchesData);

    // Load line items
    const { data: lineItemsData } = await supabase
      .from('production_line_items')
      .select('*');
    if (lineItemsData) setLineItems(lineItemsData);
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to inventory changes
    const inventorySubscription = subscribeToTable('inventory', (payload) => {
      if (payload.eventType === 'INSERT') {
        setInventory(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setInventory(prev => prev.map(item => 
          item.id === payload.new.id ? payload.new : item
        ));
      } else if (payload.eventType === 'DELETE') {
        setInventory(prev => prev.filter(item => item.id !== payload.old.id));
      }
    });

    // Subscribe to production lines changes
    const linesSubscription = subscribeToTable('production_lines', (payload) => {
      if (payload.eventType === 'UPDATE') {
        setProductionLines(prev => prev.map(line => 
          line.id === payload.new.id ? payload.new : line
        ));
      }
    });

    // Subscribe to recipes changes
    const recipesSubscription = subscribeToTable('recipes', (payload) => {
      if (payload.eventType === 'INSERT') {
        setRecipes(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setRecipes(prev => prev.map(recipe => 
          recipe.id === payload.new.id ? payload.new : recipe
        ));
      } else if (payload.eventType === 'DELETE') {
        setRecipes(prev => prev.filter(recipe => recipe.id !== payload.old.id));
      }
    });

    // Subscribe to produced bunches changes
    const bunchesSubscription = subscribeToTable('produced_bunches', (payload) => {
      if (payload.eventType === 'INSERT') {
        setProducedBunches(prev => [payload.new, ...prev]);
      }
    });

    // Subscribe to line items changes
    const lineItemsSubscription = subscribeToTable('production_line_items', (payload) => {
      if (payload.eventType === 'INSERT') {
        setLineItems(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'DELETE') {
        setLineItems(prev => prev.filter(item => item.id !== payload.old.id));
      }
    });

    return () => {
      inventorySubscription.unsubscribe();
      linesSubscription.unsubscribe();
      recipesSubscription.unsubscribe();
      bunchesSubscription.unsubscribe();
      lineItemsSubscription.unsubscribe();
    };
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    const { error } = authMode === 'signin' 
      ? await signIn(email, password)
      : await signUp(email, password);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setAuthError('Invalid email or password');
      } else if (error.message.includes('User already registered')) {
        setAuthError('This email is already registered. Please sign in.');
        setAuthMode('signin');
      } else {
        setAuthError(error.message);
      }
    } else if (authMode === 'signup') {
      alert('Account created successfully! Please check your email to verify your account, then sign in.');
      setAuthMode('signin');
      setPassword('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setEmail('');
    setPassword('');
  };

  const logActivity = async (actionType, description, metadata = {}) => {
    await supabase.from('activity_log').insert({
      action_type: actionType,
      description: description,
      user_email: user.email,
      metadata: metadata
    });
  };

  const startCamera = async (mode, lineId = null) => {
    setScanMode(mode);
    setSelectedLine(lineId);
    setScanning(true);
    setScanResult('');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Initialize barcode reader
        codeReaderRef.current = new BrowserMultiFormatReader();
        
        // Start continuous scanning
        codeReaderRef.current.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, error) => {
            if (result) {
              handleBarcodeScan(result.getText());
            }
          }
        );
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Camera access denied. Please enable camera permissions.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setScanning(false);
    setScanMode(null);
    setSelectedLine(null);
    setScanResult('');
  };

  const handleBarcodeScan = async (barcode) => {
    setScanResult(barcode);
    
    // Prevent multiple rapid scans
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }

    try {
      if (scanMode === 'inventory') {
        await addToInventory(barcode);
      } else if (scanMode === 'checkout') {
        await checkoutBox(barcode);
      } else if (scanMode === 'line' && selectedLine) {
        await assignToLine(barcode, selectedLine);
      } else if (scanMode === 'output' && selectedLine) {
        await completeBunch(barcode, selectedLine);
      }
    } catch (error) {
      alert('Error processing barcode: ' + error.message);
    }

    // Close scanner after successful scan
    setTimeout(() => {
      stopCamera();
    }, 1500);
  };

  const addToInventory = async (barcode) => {
    // Parse barcode - format: TYPE|COLOR|QUANTITY|UNIT
    // Example: ROSES|RED|200|STEMS
    const parts = barcode.split('|');
    
    if (parts.length !== 4) {
      alert('Invalid barcode format. Expected: TYPE|COLOR|QUANTITY|UNIT');
      return;
    }

    const [type, color, quantity, unit] = parts;

    const { error } = await supabase.from('inventory').insert({
      box_id: `BOX${Date.now()}`,
      flower_type: type,
      color: color,
      quantity: parseInt(quantity),
      unit: unit.toLowerCase(),
      location: 'inventory',
      updated_by: user.email
    });

    if (error) {
      alert('Error adding to inventory: ' + error.message);
    } else {
      await logActivity('ADD_INVENTORY', `Added ${type} ${color} to inventory`, { barcode });
      alert(`✓ Added ${type} - ${color} to inventory!`);
    }
  };

  const checkoutBox = async (boxId) => {
    const { error } = await supabase
      .from('inventory')
      .update({ 
        location: 'checked-out',
        updated_by: user.email
      })
      .eq('box_id', boxId);

    if (error) {
      alert('Box not found or error: ' + error.message);
    } else {
      await logActivity('CHECKOUT', `Checked out box ${boxId}`, { boxId });
      alert(`✓ Box ${boxId} checked out!`);
    }
  };

  const assignToLine = async (boxId, lineId) => {
    // Update inventory location
    const { error: invError } = await supabase
      .from('inventory')
      .update({ 
        location: `line-${lineId}`,
        updated_by: user.email
      })
      .eq('box_id', boxId);

    if (invError) {
      alert('Box not found: ' + invError.message);
      return;
    }

    // Add to production line items
    const { error: lineError } = await supabase
      .from('production_line_items')
      .insert({
        line_id: lineId,
        box_id: boxId,
        assigned_by: user.email
      });

    if (lineError) {
      alert('Error assigning to line: ' + lineError.message);
      return;
    }

    // Update line status to active
    await supabase
      .from('production_lines')
      .update({ status: 'active' })
      .eq('id', lineId);

    await logActivity('ASSIGN_TO_LINE', `Assigned box ${boxId} to Line ${lineId}`, { boxId, lineId });
    alert(`✓ Box ${boxId} assigned to Line ${lineId}!`);
  };

  const completeBunch = async (bunchBarcode, lineId) => {
    const line = productionLines.find(l => l.id === lineId);
    
    const { error } = await supabase.from('produced_bunches').insert({
      bunch_id: bunchBarcode,
      recipe_name: line?.active_recipe_id || 'Unknown',
      line_id: lineId,
      produced_by: user.email,
      status: 'completed'
    });

    if (error) {
      alert('Error recording bunch: ' + error.message);
      return;
    }

    // Increment produced count
    await supabase
      .from('production_lines')
      .update({ produced_count: (line?.produced_count || 0) + 1 })
      .eq('id', lineId);

    await logActivity('COMPLETE_BUNCH', `Completed bunch ${bunchBarcode} on Line ${lineId}`, { bunchBarcode, lineId });
    alert(`✓ Bunch ${bunchBarcode} completed on Line ${lineId}!`);
  };

  const addFlowerToRecipe = React.useCallback(() => {
    setNewRecipe(prev => ({
      ...prev,
      flowers: [...prev.flowers, { id: Date.now(), type: '', color: '', quantity: '' }]
    }));
  }, []);

  const removeFlowerFromRecipe = React.useCallback((index) => {
    setNewRecipe(prev => ({
      ...prev,
      flowers: prev.flowers.filter((_, i) => i !== index)
    }));
  }, []);

  const updateFlower = React.useCallback((index, field, value) => {
    setNewRecipe(prev => ({
      ...prev,
      flowers: prev.flowers.map((f, i) => 
        i === index ? { ...f, [field]: value } : f
      )
    }));
  }, []);

  const saveRecipe = React.useCallback(async () => {
    if (!newRecipe.name.trim()) {
      alert('Please enter a recipe name');
      return;
    }

    const validFlowers = newRecipe.flowers.filter(f => f.type && f.color && f.quantity);
    if (validFlowers.length === 0) {
      alert('Please add at least one flower');
      return;
    }

    const recipeId = `R${String(recipes.length + 1).padStart(3, '0')}`;

    const { error } = await supabase.from('recipes').insert({
      recipe_id: recipeId,
      name: newRecipe.name,
      flowers: validFlowers.map(f => ({
        type: f.type,
        color: f.color,
        quantity: parseInt(f.quantity)
      })),
      created_by: user.email
    });

    if (error) {
      alert('Error creating recipe: ' + error.message);
      return;
    }

    await logActivity('CREATE_RECIPE', `Created recipe: ${newRecipe.name}`, { recipeId, name: newRecipe.name });
    alert(`✓ Recipe "${newRecipe.name}" created!`);
    setShowRecipeModal(false);
    setNewRecipe({ name: '', flowers: [{ id: Date.now(), type: '', color: '', quantity: '' }] });
  }, [newRecipe, recipes.length, user]);

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
    if (location?.startsWith('line-')) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const filteredInventory = inventory.filter(item => 
    item.box_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.flower_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.color?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get items for each line
  const getLineItems = (lineId) => {
    return lineItems.filter(item => item.line_id === lineId);
  };

  // Auth Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Flower2 size={64} className="text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">Bloom Manager</h1>
            <p className="text-gray-600 mt-2">Flower Production System</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                required
                minLength={6}
              />
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setAuthError('');
              }}
              className="w-full text-green-600 text-sm hover:underline"
            >
              {authMode === 'signin' 
                ? "Don't have an account? Create one" 
                : 'Already have an account? Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Secure authentication for your flower business</p>
            <p className="mt-1">Create an account with any valid email address</p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  const DashboardView = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Bloom Manager</h2>
            <p className="text-green-100 mt-1">Welcome, {user.email.split('@')[0]}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-white bg-opacity-20 backdrop-blur p-2 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            <LogOut size={24} />
          </button>
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
              <p className="text-2xl font-bold text-gray-800">
                {productionLines.filter(l => l.status === 'active').length}
              </p>
            </div>
            <PlayCircle className="text-green-500" size={32} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">In Stock</p>
              <p className="text-2xl font-bold text-gray-800">
                {inventory.filter(i => i.location === 'inventory').length}
              </p>
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
            <CheckCircle className="text-green-600" size={32} />
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
          {productionLines.slice(0, 5).map(line => {
            const items = getLineItems(line.id);
            return (
              <div key={line.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(line.status)}`}></div>
                  <div>
                    <p className="font-medium text-gray-800">{line.name}</p>
                    <p className="text-sm text-gray-500">{items.length} boxes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{line.produced_count || 0}</p>
                  <p className="text-xs text-gray-500">bunches</p>
                </div>
              </div>
            );
          })}
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

      <div className="space-y-3">
        {filteredInventory.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow text-center text-gray-500">
            <Package size={48} className="mx-auto mb-2 opacity-50" />
            <p>No inventory items found</p>
          </div>
        ) : (
          filteredInventory.map(item => (
            <div key={item.id} className="bg-white rounded-lg p-4 shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-800">{item.box_id}</p>
                  <p className="text-sm text-gray-600">{item.flower_type} - {item.color}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs text-white ${getLocationBadgeColor(item.location)}`}>
                  {item.location === 'inventory' ? 'In Stock' : 
                   item.location === 'checked-out' ? 'Checked Out' : 
                   `Line ${item.location?.split('-')[1]}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.quantity} {item.unit}</span>
                <span className="text-gray-400">{new Date(item.date_added).toLocaleDateString()}</span>
              </div>
              {item.updated_by && (
                <p className="text-xs text-gray-400 mt-2">Updated by: {item.updated_by.split('@')[0]}</p>
              )}
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => startCamera('inventory')}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center active:bg-blue-600 z-30"
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
        {productionLines.map(line => {
          const items = getLineItems(line.id);
          return (
            <div key={line.id} className="bg-white rounded-lg p-4 shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(line.status)}`}></div>
                  <div>
                    <p className="font-semibold text-gray-800">{line.name}</p>
                    <p className="text-sm text-gray-500">{line.status}</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-800">{line.produced_count || 0}</span>
              </div>
              
              {items.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Boxes in line: {items.length}</p>
                  <div className="flex flex-wrap gap-1">
                    {items.map(item => (
                      <span key={item.id} className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded">
                        {item.box_id}
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
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 active:bg-green-700"
                >
                  <CheckCircle size={16} />
                  Complete Bunch
                </button>
              </div>
            </div>
          );
        })}
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
        {recipes.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow text-center text-gray-500">
            <Flower2 size={48} className="mx-auto mb-2 opacity-50" />
            <p>No recipes created yet</p>
            <p className="text-sm mt-2">Tap the + button to create your first recipe</p>
          </div>
        ) : (
          recipes.map(recipe => (
            <div key={recipe.id} className="bg-white rounded-lg p-4 shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{recipe.name}</p>
                  <p className="text-xs text-gray-500">{recipe.recipe_id}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Composition:</p>
                {recipe.flowers && Array.isArray(recipe.flowers) && recipe.flowers.map((flower, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{flower.type} - {flower.color}</span>
                    <span className="text-gray-600 font-medium">{flower.quantity} stems</span>
                  </div>
                ))}
              </div>
              {recipe.created_by && (
                <p className="text-xs text-gray-400 mt-3">Created by: {recipe.created_by.split('@')[0]}</p>
              )}
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setShowRecipeModal(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center active:bg-green-700 z-30"
      >
        <Plus size={28} />
      </button>
    </div>
  );

  // Recipe Creation Modal
  const RecipeModal = React.memo(() => {
    const handleNameChange = (e) => {
      setNewRecipe(prev => ({ ...prev, name: e.target.value }));
    };

    const handleFlowerChange = (index, field, value) => {
      setNewRecipe(prev => ({
        ...prev,
        flowers: prev.flowers.map((f, i) => 
          i === index ? { ...f, [field]: value } : f
        )
      }));
    };

    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Create Recipe</h2>
          <button onClick={() => setShowRecipeModal(false)} className="text-gray-500">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Recipe Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipe Name
            </label>
            <input
              type="text"
              value={newRecipe.name}
              onChange={handleNameChange}
              placeholder="e.g., Spring Mix Bouquet"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Flowers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Flowers in Bouquet
            </label>
            <div className="space-y-3">
              {newRecipe.flowers.map((flower, index) => (
                <div key={flower.id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Flower {index + 1}</span>
                    {newRecipe.flowers.length > 1 && (
                      <button
                        onClick={() => removeFlowerFromRecipe(index)}
                        className="text-red-500 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={flower.type}
                      onChange={(e) => handleFlowerChange(index, 'type', e.target.value)}
                      placeholder="Type (e.g., Roses)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      value={flower.color}
                      onChange={(e) => handleFlowerChange(index, 'color', e.target.value)}
                      placeholder="Color (e.g., Red)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="number"
                      value={flower.quantity}
                      onChange={(e) => handleFlowerChange(index, 'quantity', e.target.value)}
                      placeholder="Quantity (stems)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addFlowerToRecipe}
              className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-medium hover:border-green-500 hover:text-green-600"
            >
              + Add Another Flower
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={saveRecipe}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Create Recipe
          </button>
        </div>
      </div>
    </div>
    );
  });

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
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 border-4 border-white rounded-lg opacity-50"></div>
        </div>

        <button
          onClick={stopCamera}
          className="absolute top-6 right-6 w-12 h-12 bg-white bg-opacity-30 backdrop-blur rounded-full flex items-center justify-center"
        >
          <X className="text-white" size={28} />
        </button>

        <div className="absolute top-6 left-6 right-6 bg-black bg-opacity-50 backdrop-blur px-4 py-2 rounded-full">
          <p className="text-white text-sm font-medium text-center">
            {scanMode === 'inventory' && 'Scan box barcode (TYPE|COLOR|QTY|UNIT)'}
            {scanMode === 'checkout' && 'Scan box ID to check out'}
            {scanMode === 'line' && `Scan box ID for Line ${selectedLine}`}
            {scanMode === 'output' && `Scan bunch barcode from Line ${selectedLine}`}
          </p>
        </div>

        {scanResult && (
          <div className="absolute bottom-32 left-6 right-6 bg-green-500 text-white px-4 py-3 rounded-lg text-center font-medium">
            ✓ Scanned: {scanResult}
          </div>
        )}
      </div>

      <div className="bg-white p-6">
        <p className="text-center text-gray-600 text-sm mb-4">
          Position barcode within the frame
        </p>
        <p className="text-center text-xs text-gray-500">
          Barcode format for inventory: TYPE|COLOR|QUANTITY|UNIT
          <br />
          Example: ROSES|RED|200|STEMS
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
              <span className="text-sm text-gray-600">Live</span>
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

      {/* Recipe Modal */}
      {showRecipeModal && <RecipeModal />}
    </div>
  );
}