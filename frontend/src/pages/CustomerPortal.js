import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const CustomerPortal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  
  // Registration state
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);
  
  // Portal state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Messages state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // New Order state - Enhanced with full vehicle selection
  const [newOrderStep, setNewOrderStep] = useState(1); // 1: Vehicle, 2: Upload, 3: Analysis, 4: Services, 5: Confirm
  const [newOrderFile, setNewOrderFile] = useState(null);
  const [newOrderServices, setNewOrderServices] = useState([]);
  const [newOrderNotes, setNewOrderNotes] = useState('');
  const [additionalDtcCodes, setAdditionalDtcCodes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  
  // Vehicle Selection State
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [models, setModels] = useState([]);
  const [engines, setEngines] = useState([]);
  
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('');
  const [selectedEcu, setSelectedEcu] = useState('');
  
  // Manual vehicle entry
  const [isManualVehicle, setIsManualVehicle] = useState(false);
  const [manualVehicle, setManualVehicle] = useState({ make: '', model: '', year: '', engine: '' });
  
  // Vehicle loading states
  const [vehicleLoading, setVehicleLoading] = useState(false);
  
  // ECU Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [detectedServices, setDetectedServices] = useState([]);
  const [fileId, setFileId] = useState(null);
  
  // Common ECU types for manual entry
  const commonEcuTypes = [
    { id: 'bosch-edc17c50', name: 'Bosch EDC17C50' },
    { id: 'bosch-edc17c46', name: 'Bosch EDC17C46' },
    { id: 'bosch-edc17c54', name: 'Bosch EDC17C54' },
    { id: 'bosch-edc17c64', name: 'Bosch EDC17C64' },
    { id: 'bosch-edc16', name: 'Bosch EDC16' },
    { id: 'bosch-med17', name: 'Bosch MED17' },
    { id: 'bosch-me7', name: 'Bosch ME7' },
    { id: 'siemens-sid201', name: 'Siemens SID201' },
    { id: 'siemens-sid206', name: 'Siemens SID206' },
    { id: 'siemens-sid803', name: 'Siemens SID803' },
    { id: 'continental-simos18', name: 'Continental Simos 18' },
    { id: 'delphi-dcm35', name: 'Delphi DCM3.5' },
    { id: 'denso', name: 'Denso' },
    { id: 'marelli', name: 'Marelli' },
    { id: 'other', name: 'Other / Unknown' },
  ];
  
  // Settings state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState({ type: '', text: '' });

  // Available services - using original app pricing
  const availableServices = [
    { id: 'dtc-single', name: 'DTC Removal (Single)', price: 20 },
    { id: 'dtc-multiple', name: 'DTC Removal (Multiple)', price: 50 },
    { id: 'egr-removal', name: 'EGR Removal', price: 50 },
    { id: 'dpf-removal', name: 'DPF Removal', price: 248 },
    { id: 'egr-dpf-combo', name: 'EGR + DPF Combo', price: 248 },
    { id: 'adblue-removal', name: 'AdBlue/DEF Removal', price: 698 },
    { id: 'immo-off', name: 'Immobilizer Off', price: 70 },
    { id: 'decat', name: 'Decat (Cat OFF)', price: 40 },
    { id: 'vmax-off', name: 'Speed Limiter OFF', price: 30 },
    { id: 'checksum', name: 'Checksum Correction', price: 10 },
    { id: 'swirl-flap-off', name: 'Swirl Flap OFF', price: 40 },
    { id: 'nox-off', name: 'NOX Sensor OFF', price: 40 },
    { id: 'start-stop-off', name: 'Start & Stop OFF', price: 40 },
  ];

  // Fetch vehicle types on component mount
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      try {
        const response = await axios.get(`${API}/vehicles/types`);
        setVehicleTypes(response.data || []);
      } catch (error) {
        console.error('Error fetching vehicle types:', error);
      }
    };
    fetchVehicleTypes();
  }, []);

  // Fetch manufacturers when vehicle type changes
  const handleVehicleTypeChange = async (typeId) => {
    setSelectedVehicleType(typeId);
    setSelectedManufacturer('');
    setSelectedModel('');
    setSelectedEngine('');
    setSelectedEcu('');
    setManufacturers([]);
    setModels([]);
    setEngines([]);
    
    if (typeId === 'other') {
      setIsManualVehicle(true);
      return;
    }
    
    setIsManualVehicle(false);
    if (!typeId) return;
    
    setVehicleLoading(true);
    try {
      const response = await axios.get(`${API}/vehicles/manufacturers/${typeId}`);
      setManufacturers(response.data || []);
    } catch (error) {
      console.error('Error fetching manufacturers:', error);
    }
    setVehicleLoading(false);
  };

  // Fetch models when manufacturer changes
  const handleManufacturerChange = async (manufacturerId) => {
    setSelectedManufacturer(manufacturerId);
    setSelectedModel('');
    setSelectedEngine('');
    setSelectedEcu('');
    setModels([]);
    setEngines([]);
    
    if (!manufacturerId) return;
    
    setVehicleLoading(true);
    try {
      const response = await axios.get(`${API}/vehicles/models/${manufacturerId}`);
      setModels(response.data || []);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
    setVehicleLoading(false);
  };

  // Fetch engines when model changes (skipping generations - not used in new DB structure)
  const handleModelChange = async (modelId) => {
    setSelectedModel(modelId);
    setSelectedEngine('');
    setSelectedEcu('');
    setEngines([]);
    
    if (!modelId) return;
    
    setVehicleLoading(true);
    try {
      // Fetch engines directly for the model (generations are skipped)
      const response = await axios.get(`${API}/vehicles/engines/${modelId}`);
      setEngines(response.data || []);
    } catch (error) {
      console.error('Error fetching engines:', error);
    }
    setVehicleLoading(false);
  };

  // Fetch ECU types when engine changes
  const handleEngineChange = (engineId) => {
    setSelectedEngine(engineId);
    setSelectedEcu('');
    // ECU types are provided from commonEcuTypes list
  };

  // Get vehicle summary for display
  const getVehicleSummary = () => {
    if (isManualVehicle) {
      const parts = [manualVehicle.year, manualVehicle.make, manualVehicle.model].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : 'Manual Entry';
    }
    
    const manufacturer = manufacturers.find(m => m.id === selectedManufacturer);
    const model = models.find(m => m.id === selectedModel);
    const engine = engines.find(e => e.id === selectedEngine);
    
    const parts = [
      manufacturer?.name || '',
      model?.name || '',
      engine?.name || ''
    ].filter(Boolean);
    
    return parts.join(' ') || 'Select Vehicle';
  };

  // Get ECU name for display
  const getEcuName = () => {
    if (isManualVehicle) {
      const ecu = commonEcuTypes.find(e => e.id === selectedEcu);
      return ecu?.name || '';
    }
    // Use common ECU types for now (can be enhanced)
    const ecu = commonEcuTypes.find(e => e.id === selectedEcu);
    return ecu?.name || '';
  };

  // Check if vehicle selection is complete
  const isVehicleComplete = () => {
    if (isManualVehicle) {
      return manualVehicle.make && manualVehicle.model && selectedEcu;
    }
    return selectedVehicleType && selectedManufacturer && selectedModel && selectedEngine && selectedEcu;
  };

  // Analyze uploaded file
  const analyzeFile = async () => {
    if (!newOrderFile) return;
    
    setAnalyzing(true);
    const formData = new FormData();
    formData.append('file', newOrderFile);
    
    // Add vehicle info
    if (isManualVehicle) {
      formData.append('vehicle_type', 'Other');
      formData.append('manufacturer', manualVehicle.make);
      formData.append('model', manualVehicle.model);
      formData.append('year', manualVehicle.year);
      formData.append('engine', manualVehicle.engine);
    } else {
      const vType = vehicleTypes.find(v => v.id === selectedVehicleType);
      const manufacturer = manufacturers.find(m => m.id === selectedManufacturer);
      const model = models.find(m => m.id === selectedModel);
      const engine = engines.find(e => e.id === selectedEngine);
      
      formData.append('vehicle_type', vType?.name || '');
      formData.append('manufacturer', manufacturer?.name || '');
      formData.append('model', model?.name || '');
      formData.append('year', ''); // Year extracted from engine/model if available
      formData.append('engine', engine?.name || '');
    }
    
    formData.append('ecu_type', getEcuName());
    
    try {
      const response = await axios.post(`${API}/analyze-and-process-file`, formData);
      
      if (response.data.success) {
        setFileId(response.data.file_id);
        setAnalysisResult(response.data);
        setDetectedServices(response.data.available_options || []);
        setNewOrderStep(4); // Move to services step
      } else {
        alert('Analysis failed: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      alert('Error analyzing file. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Reset new order form
  const resetNewOrder = () => {
    setNewOrderStep(1);
    setNewOrderFile(null);
    setNewOrderServices([]);
    setNewOrderNotes('');
    setSelectedVehicleType('');
    setSelectedManufacturer('');
    setSelectedModel('');
    setSelectedEngine('');
    setSelectedEcu('');
    setIsManualVehicle(false);
    setManualVehicle({ make: '', model: '', year: '', engine: '' });
    setAnalysisResult(null);
    setDetectedServices([]);
    setFileId(null);
  };

  // Check URL params for auto-login
  useEffect(() => {
    const email = searchParams.get('email');
    const register = searchParams.get('register');
    
    if (register === 'true') {
      setShowRegister(true);
      if (email) setRegisterEmail(email);
    } else if (email) {
      setLoginEmail(email);
      doLoginEmail(email);
    }
  }, [searchParams]);

  // Password-based login
  const doLoginPassword = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter your email and password');
      return;
    }
    
    setLoginLoading(true);
    setLoginError('');
    
    try {
      const response = await axios.post(`${API}/portal/login-password`, {
        email: loginEmail.trim(),
        password: loginPassword
      });
      
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setAccountInfo(response.data.account);
        setProfileName(response.data.account?.name || '');
        setIsLoggedIn(true);
        window.history.replaceState({}, '', `/portal?email=${encodeURIComponent(loginEmail)}`);
      }
    } catch (error) {
      setLoginError(error.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoginLoading(false);
    }
  };

  // Email-only login (quick access)
  const doLoginEmail = async (email) => {
    if (!email) {
      setLoginError('Please enter your email address');
      return;
    }
    
    setLoginLoading(true);
    setLoginError('');
    
    try {
      const response = await axios.post(`${API}/portal/login-email`, {
        email: email.trim()
      });
      
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setAccountInfo(response.data.account || { email: email, name: 'Guest' });
        setIsLoggedIn(true);
        window.history.replaceState({}, '', `/portal?email=${encodeURIComponent(email)}`);
      }
    } catch (error) {
      setLoginError(error.response?.data?.detail || 'No orders found for this email');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (loginPassword) {
      doLoginPassword();
    } else {
      doLoginEmail(loginEmail);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setRegisterError('');
    
    if (!registerName || !registerEmail || !registerPassword) {
      setRegisterError('Please fill in all fields');
      return;
    }
    
    if (registerPassword !== registerConfirm) {
      setRegisterError('Passwords do not match');
      return;
    }
    
    if (registerPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters');
      return;
    }
    
    setLoginLoading(true);
    
    try {
      const response = await axios.post(`${API}/portal/register`, {
        name: registerName.trim(),
        email: registerEmail.trim(),
        password: registerPassword
      });
      
      if (response.data.success) {
        setRegisterSuccess(true);
        setTimeout(() => {
          setLoginEmail(registerEmail);
          setLoginPassword(registerPassword);
          setShowRegister(false);
          doLoginPassword();
        }, 1500);
      }
    } catch (error) {
      setRegisterError(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAccountInfo(null);
    setOrders([]);
    setSelectedOrder(null);
    setLoginEmail('');
    setLoginPassword('');
    setActiveTab('dashboard');
    window.history.replaceState({}, '', '/portal');
  };

  // Fetch messages for selected order
  const fetchMessages = async (orderId) => {
    try {
      const response = await axios.get(`${API}/portal/messages/${orderId}?email=${encodeURIComponent(accountInfo?.email || loginEmail)}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedOrder) return;
    
    setSendingMessage(true);
    try {
      await axios.post(`${API}/portal/message`, {
        order_id: selectedOrder.id,
        email: accountInfo?.email || loginEmail,
        message: newMessage.trim(),
        sender: 'customer'
      });
      
      setMessages([...messages, {
        id: Date.now(),
        message: newMessage.trim(),
        sender: 'customer',
        created_at: new Date().toISOString()
      }]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Upload additional file
  const uploadFile = async (file) => {
    if (!file || !selectedOrder) return;
    
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order_id', selectedOrder.id);
    formData.append('email', accountInfo?.email || loginEmail);
    
    try {
      await axios.post(`${API}/portal/upload-file`, formData);
      alert('File uploaded successfully!');
      // Refresh order
      const response = await axios.post(`${API}/portal/login-email`, { email: accountInfo?.email || loginEmail });
      if (response.data.success) {
        setOrders(response.data.orders || []);
        const updated = response.data.orders.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (error) {
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  // Submit new order from portal
  const submitNewOrder = async () => {
    if (!fileId && !newOrderFile) {
      alert('Please upload and analyze a file first');
      return;
    }
    if (newOrderServices.length === 0) {
      alert('Please select at least one service');
      return;
    }
    
    setSubmittingOrder(true);
    
    // Build vehicle info
    let vehicleInfo = {};
    if (isManualVehicle) {
      vehicleInfo = {
        vehicle_make: manualVehicle.make,
        vehicle_model: manualVehicle.model,
        vehicle_year: manualVehicle.year,
        engine: manualVehicle.engine,
        ecu: getEcuName(),
        type: 'Other'
      };
    } else {
      const vType = vehicleTypes.find(v => v.id === selectedVehicleType);
      const manufacturer = manufacturers.find(m => m.id === selectedManufacturer);
      const model = models.find(m => m.id === selectedModel);
      const engine = engines.find(e => e.id === selectedEngine);
      
      vehicleInfo = {
        vehicle_make: manufacturer?.name || '',
        vehicle_model: model?.name || '',
        vehicle_year: '', // Year extracted from engine/model if available
        engine: engine?.name || '',
        ecu: getEcuName(),
        type: vType?.name || ''
      };
    }
    
    const formData = new FormData();
    if (newOrderFile) {
      formData.append('file', newOrderFile);
    }
    formData.append('file_id', fileId || '');
    formData.append('email', accountInfo?.email || loginEmail);
    formData.append('name', accountInfo?.name || 'Customer');
    formData.append('services', JSON.stringify(newOrderServices));
    formData.append('notes', newOrderNotes);
    formData.append('vehicle', JSON.stringify(vehicleInfo));
    
    try {
      const response = await axios.post(`${API}/portal/new-order`, formData);
      if (response.data.success) {
        alert('Order submitted successfully!');
        // Refresh orders
        const ordersResponse = await axios.post(`${API}/portal/login-email`, { email: accountInfo?.email || loginEmail });
        if (ordersResponse.data.success) {
          setOrders(ordersResponse.data.orders || []);
        }
        // Reset form
        resetNewOrder();
        setActiveTab('orders');
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to submit order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Update profile
  const updateProfile = async () => {
    try {
      await axios.post(`${API}/portal/update-profile`, {
        email: accountInfo?.email,
        name: profileName
      });
      setAccountInfo({ ...accountInfo, name: profileName });
      setEditingProfile(false);
      setSettingsMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setSettingsMessage({ type: 'error', text: 'Failed to update profile' });
    }
  };

  // Change password
  const changePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      setSettingsMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setSettingsMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    
    try {
      await axios.post(`${API}/portal/change-password`, {
        email: accountInfo?.email,
        current_password: currentPassword,
        new_password: newPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSettingsMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error) {
      setSettingsMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to change password' });
    }
  };

  // Calculate totals for dashboard
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.total_amount || o.price || 0), 0);

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mb-4">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
            <p className="text-gray-500">Access your orders, files, and account</p>
          </div>
          
          {showRegister ? (
            /* Registration Card */
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Create Account</h2>
              
              {registerSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-700 font-medium">Account created! Signing you in...</p>
                </div>
              ) : (
                <form onSubmit={handleRegister}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                      <input
                        type="password"
                        value={registerConfirm}
                        onChange={(e) => setRegisterConfirm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    {registerError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                        {registerError}
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
                    >
                      {loginLoading ? 'Creating...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              )}
              
              <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                <button
                  onClick={() => setShowRegister(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            /* Login Card */
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <form onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="text-gray-400 text-xs mt-1">Leave blank for quick access with email only</p>
                  </div>
                  
                  {loginError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                      {loginError}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
                  >
                    {loginLoading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
              </form>
              
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <button
                  onClick={() => setShowRegister(true)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl transition"
                >
                  Create New Account
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Portal UI
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">ECU Flash</h1>
              <p className="text-xs text-gray-500">Customer Portal</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'orders', icon: '📦', label: 'My Orders' },
            { id: 'new-order', icon: '➕', label: 'New Order' },
            { id: 'files', icon: '📁', label: 'Files' },
            { id: 'messages', icon: '💬', label: 'Messages' },
            { id: 'payments', icon: '💳', label: 'Payments' },
            { id: 'settings', icon: '⚙️', label: 'Settings' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'messages' && selectedOrder) {
                  fetchMessages(selectedOrder.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* User Info */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
              {accountInfo?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{accountInfo?.name || 'Guest'}</p>
              <p className="text-xs text-gray-500 truncate">{accountInfo?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-gray-500 hover:text-red-600 text-sm py-2 transition"
          >
            Sign Out
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
              
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <p className="text-gray-500 text-sm mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <p className="text-gray-500 text-sm mb-1">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">{pendingOrders}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <p className="text-gray-500 text-sm mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{completedOrders}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <p className="text-gray-500 text-sm mb-1">Total Spent</p>
                  <p className="text-3xl font-bold text-gray-900">${totalSpent.toFixed(2)}</p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button
                  onClick={() => setActiveTab('new-order')}
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-2xl p-6 text-left hover:shadow-lg transition"
                >
                  <span className="text-3xl mb-2 block">📤</span>
                  <span className="font-semibold block">Upload New File</span>
                  <span className="text-sm opacity-80">Start a new order</span>
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:shadow-md transition"
                >
                  <span className="text-3xl mb-2 block">📋</span>
                  <span className="font-semibold text-gray-900 block">View Orders</span>
                  <span className="text-sm text-gray-500">Check order status</span>
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:shadow-md transition"
                >
                  <span className="text-3xl mb-2 block">💬</span>
                  <span className="font-semibold text-gray-900 block">Messages</span>
                  <span className="text-sm text-gray-500">Contact support</span>
                </button>
              </div>
              
              {/* Recent Orders */}
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
                  <p className="text-gray-500 mb-4">No orders yet</p>
                  <button
                    onClick={() => setActiveTab('new-order')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition"
                  >
                    Create Your First Order
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {orders.slice(0, 5).map(order => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => { setSelectedOrder(order); setActiveTab('orders'); }}
                    >
                      <div>
                        <p className="font-medium text-gray-900">Order #{order.id?.slice(-8)}</p>
                        <p className="text-sm text-gray-500">{order.vehicle_info || order.services?.join(', ') || 'ECU Service'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status || 'Pending'}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h2>
              
              {selectedOrder ? (
                /* Order Detail View */
                <div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
                  >
                    ← Back to Orders
                  </button>
                  
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Order #{selectedOrder.id?.slice(-8)}</h3>
                        <p className="text-gray-500">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`px-4 py-2 rounded-full font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status || 'Pending'}
                      </span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Services</h4>
                        <ul className="space-y-1">
                          {(selectedOrder.services || selectedOrder.selected_services || ['ECU Service']).map((s, i) => (
                            <li key={i} className="text-gray-600">• {typeof s === 'object' ? s.name : s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Vehicle</h4>
                        <p className="text-gray-600">{selectedOrder.vehicle_info || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <h4 className="font-semibold text-gray-900 mb-3">Files</h4>
                      <div className="space-y-2">
                        {selectedOrder.original_file && (
                          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                            <span className="text-gray-700">📄 Original File</span>
                            <a
                              href={`${API}/download/${selectedOrder.original_file}`}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                              download
                            >
                              Download
                            </a>
                          </div>
                        )}
                        {selectedOrder.modified_file && (
                          <div className="flex items-center justify-between bg-green-50 rounded-xl p-3">
                            <span className="text-green-700">✅ Modified File</span>
                            <a
                              href={`${API}/download/${selectedOrder.modified_file}`}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                              download
                            >
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {/* Upload Additional File */}
                      <div className="mt-4">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={(e) => uploadFile(e.target.files?.[0])}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFile}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          {uploadingFile ? 'Uploading...' : '+ Upload Additional File'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Messages Section */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Messages</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                      {messages.length === 0 ? (
                        <p className="text-gray-500 text-sm">No messages yet</p>
                      ) : (
                        messages.map((msg, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-xl ${
                              msg.sender === 'customer' ? 'bg-blue-50 ml-8' : 'bg-gray-100 mr-8'
                            }`}
                          >
                            <p className="text-sm text-gray-800">{msg.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {msg.sender === 'customer' ? 'You' : 'Support'} • {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Orders List */
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {orders.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500 mb-4">No orders found</p>
                      <button
                        onClick={() => setActiveTab('new-order')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition"
                      >
                        Create New Order
                      </button>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Order ID</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Services</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Amount</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-500"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-sm">#{order.id?.slice(-8)}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {(order.services || order.selected_services || ['ECU Service']).slice(0, 2).map(s => typeof s === 'object' ? s.name : s).join(', ')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-medium">${(order.total_amount || order.price || 0).toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {order.status || 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => { setSelectedOrder(order); fetchMessages(order.id); }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          {/* New Order Tab - Enhanced with Vehicle Selection & Analysis */}
          {activeTab === 'new-order' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Order</h2>
                {newOrderStep > 1 && (
                  <button
                    onClick={resetNewOrder}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    ← Start Over
                  </button>
                )}
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-center mb-8">
                {['Vehicle', 'Upload', 'Analyze', 'Services'].map((label, i) => (
                  <div key={i} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      newOrderStep > i + 1 ? 'bg-green-500 text-white' :
                      newOrderStep === i + 1 ? 'bg-blue-500 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {newOrderStep > i + 1 ? '✓' : i + 1}
                    </div>
                    <span className={`mx-2 text-sm ${newOrderStep === i + 1 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {label}
                    </span>
                    {i < 3 && <div className={`w-8 h-0.5 ${newOrderStep > i + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
              
              <div className="max-w-2xl mx-auto">
                
                {/* Step 1: Vehicle Selection */}
                {newOrderStep === 1 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Select Your Vehicle</h3>
                    
                    {/* Vehicle Type */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                      <select
                        value={selectedVehicleType}
                        onChange={(e) => handleVehicleTypeChange(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500"
                      >
                        <option value="">Select vehicle type...</option>
                        {vehicleTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                        <option value="other">Other / Enter Manually</option>
                      </select>
                    </div>

                    {/* Manual Vehicle Entry */}
                    {isManualVehicle ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                        <h4 className="font-medium text-orange-700 mb-3">Enter Vehicle Details</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Make (e.g., BMW)"
                            value={manualVehicle.make}
                            onChange={(e) => setManualVehicle({...manualVehicle, make: e.target.value})}
                            className="bg-white border border-gray-300 rounded-xl px-4 py-3"
                          />
                          <input
                            type="text"
                            placeholder="Model (e.g., 320d)"
                            value={manualVehicle.model}
                            onChange={(e) => setManualVehicle({...manualVehicle, model: e.target.value})}
                            className="bg-white border border-gray-300 rounded-xl px-4 py-3"
                          />
                          <input
                            type="text"
                            placeholder="Year (e.g., 2018)"
                            value={manualVehicle.year}
                            onChange={(e) => setManualVehicle({...manualVehicle, year: e.target.value})}
                            className="bg-white border border-gray-300 rounded-xl px-4 py-3"
                          />
                          <input
                            type="text"
                            placeholder="Engine (e.g., 2.0 Diesel)"
                            value={manualVehicle.engine}
                            onChange={(e) => setManualVehicle({...manualVehicle, engine: e.target.value})}
                            className="bg-white border border-gray-300 rounded-xl px-4 py-3"
                          />
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">ECU Type</label>
                          <select
                            value={selectedEcu}
                            onChange={(e) => setSelectedEcu(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3"
                          >
                            <option value="">Select ECU type...</option>
                            {commonEcuTypes.map(ecu => (
                              <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Manufacturer */}
                        {selectedVehicleType && manufacturers.length > 0 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer</label>
                            <select
                              value={selectedManufacturer}
                              onChange={(e) => handleManufacturerChange(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3"
                              disabled={vehicleLoading}
                            >
                              <option value="">Select manufacturer...</option>
                              {manufacturers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Model */}
                        {selectedManufacturer && models.length > 0 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                            <select
                              value={selectedModel}
                              onChange={(e) => handleModelChange(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3"
                              disabled={vehicleLoading}
                            >
                              <option value="">Select model...</option>
                              {models.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Engine - Shows directly after Model (no generations) */}
                        {selectedModel && engines.length > 0 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Engine</label>
                            <select
                              value={selectedEngine}
                              onChange={(e) => handleEngineChange(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3"
                              disabled={vehicleLoading}
                            >
                              <option value="">Select engine...</option>
                              {engines.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* ECU Type */}
                        {selectedEngine && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">ECU Type</label>
                            <select
                              value={selectedEcu}
                              onChange={(e) => setSelectedEcu(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3"
                            >
                              <option value="">Select ECU...</option>
                              {commonEcuTypes.map(ecu => (
                                <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    {/* Vehicle Summary */}
                    {isVehicleComplete() && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 text-green-700">
                          <span>✓</span>
                          <span className="font-medium">{getVehicleSummary()}</span>
                          {getEcuName() && <span className="text-sm">({getEcuName()})</span>}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setNewOrderStep(2)}
                      disabled={!isVehicleComplete()}
                      className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-4 rounded-xl font-semibold transition"
                    >
                      Continue to Upload →
                    </button>
                  </div>
                )}

                {/* Step 2: File Upload */}
                {newOrderStep === 2 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Upload ECU File</h3>
                    <p className="text-sm text-gray-500 mb-4">Vehicle: {getVehicleSummary()} ({getEcuName()})</p>
                    
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                        newOrderFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {newOrderFile ? (
                        <div>
                          <span className="text-4xl mb-2 block">✅</span>
                          <p className="font-medium text-gray-900">{newOrderFile.name}</p>
                          <p className="text-sm text-gray-500">{(newOrderFile.size / 1024).toFixed(1)} KB</p>
                          <button
                            onClick={() => setNewOrderFile(null)}
                            className="text-red-600 hover:text-red-700 text-sm mt-2"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-4xl mb-2 block">📤</span>
                          <p className="text-gray-600 mb-2">Drag & drop your ECU file here, or</p>
                          <label className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl cursor-pointer transition">
                            Browse Files
                            <input
                              type="file"
                              onChange={(e) => setNewOrderFile(e.target.files?.[0])}
                              className="hidden"
                              accept=".bin,.ori,.fls,.hex,.ecu,.mod"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setNewOrderStep(1)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold transition"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => setNewOrderStep(3)}
                        disabled={!newOrderFile}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-4 rounded-xl font-semibold transition"
                      >
                        Analyze File →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Analysis */}
                {newOrderStep === 3 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Analyzing ECU File</h3>
                    
                    <div className="text-center py-8">
                      {analyzing ? (
                        <div>
                          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-600">Analyzing your ECU file...</p>
                          <p className="text-sm text-gray-400">This may take a moment</p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-5xl mb-4 block">🔍</span>
                          <p className="text-gray-600 mb-4">Ready to analyze your ECU file</p>
                          <p className="text-sm text-gray-500 mb-6">
                            File: {newOrderFile?.name}<br/>
                            Vehicle: {getVehicleSummary()}
                          </p>
                          <button
                            onClick={analyzeFile}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold transition"
                          >
                            Start Analysis
                          </button>
                        </div>
                      )}
                    </div>

                    {!analyzing && (
                      <button
                        onClick={() => setNewOrderStep(2)}
                        className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition"
                      >
                        ← Back to Upload
                      </button>
                    )}
                  </div>
                )}

                {/* Step 4: Service Selection */}
                {newOrderStep === 4 && (
                  <div>
                    {/* Analysis Result */}
                    {analysisResult && (
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl p-4 mb-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{analysisResult.detected_manufacturer || 'ECU'} {analysisResult.detected_ecu || ''}</p>
                            <p className="text-sm text-white/80">{newOrderFile?.name}</p>
                          </div>
                          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                            {detectedServices.length} detected
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* AdBlue/DCU Notice */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <span className="text-amber-600">⚠️</span>
                        <div>
                          <h4 className="font-semibold text-amber-800 text-sm mb-1">AdBlue/SCR System Notice</h4>
                          <p className="text-amber-700 text-xs">
                            AdBlue systems are often controlled by a separate <strong>Dosing Control Unit (DCU)</strong>. 
                            If you need AdBlue removal, please upload both ECU and DCU files.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* FREE DTC Removal Input - Shows when DPF/EGR/AdBlue is selected */}
                    {newOrderServices.some(s => ['dpf-removal', 'egr-removal', 'adblue-removal', 'egr-dpf-combo'].includes(s)) && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <span className="text-green-600 text-xl">✓</span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-green-800 text-sm mb-1">FREE DTC Removal Included</h4>
                            <p className="text-green-700 text-xs mb-2">
                              All related DTCs are automatically removed with DPF/EGR/AdBlue services. Specify any additional DTCs below (optional).
                            </p>
                            <textarea
                              value={additionalDtcCodes}
                              onChange={(e) => setAdditionalDtcCodes(e.target.value.toUpperCase())}
                              placeholder="Additional DTCs (e.g., P0420, P0401)"
                              rows={2}
                              className="w-full bg-white border border-green-200 rounded-lg px-3 py-2 text-xs focus:border-green-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">💡 New DTCs after flashing? Contact us - FREE removal!</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Select Services</h3>
                      
                      {/* Detected Services */}
                      {detectedServices.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Detected Services
                          </h4>
                          <div className="space-y-2">
                            {detectedServices.map(service => (
                              <label
                                key={service.service_id}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                                  newOrderServices.includes(service.service_id)
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={newOrderServices.includes(service.service_id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewOrderServices([...newOrderServices, service.service_id]);
                                      } else {
                                        setNewOrderServices(newOrderServices.filter(s => s !== service.service_id));
                                      }
                                    }}
                                    className="w-5 h-5 text-blue-500"
                                  />
                                  <div>
                                    <span className="font-medium text-gray-900">{service.service_name}</span>
                                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Detected</span>
                                  </div>
                                </div>
                                <span className="font-semibold text-green-600">${service.price}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All Available Services */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {detectedServices.length > 0 ? 'Additional Services' : 'Available Services'}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {availableServices
                            .filter(s => !detectedServices.find(d => d.service_id === s.id))
                            .map(service => (
                            <label
                              key={service.id}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                                newOrderServices.includes(service.id)
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={newOrderServices.includes(service.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewOrderServices([...newOrderServices, service.id]);
                                    } else {
                                      setNewOrderServices(newOrderServices.filter(s => s !== service.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-900">{service.name}</span>
                              </div>
                              <span className="text-sm text-gray-600">${service.price}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Additional Notes (Optional)</h3>
                      <textarea
                        value={newOrderNotes}
                        onChange={(e) => setNewOrderNotes(e.target.value)}
                        placeholder="Any special instructions or requirements..."
                        rows={3}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500"
                      />
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gray-900 rounded-2xl p-6 text-white">
                      <h3 className="font-semibold mb-4">Order Summary</h3>
                      
                      <div className="text-sm text-gray-400 mb-3">
                        Vehicle: {getVehicleSummary()}
                      </div>
                      
                      {newOrderServices.length > 0 ? (
                        <>
                          {newOrderServices.map(serviceId => {
                            const detected = detectedServices.find(s => s.service_id === serviceId);
                            const available = availableServices.find(s => s.id === serviceId);
                            const service = detected || available;
                            const name = detected?.service_name || available?.name;
                            const price = detected?.price || available?.price || 0;
                            
                            return service ? (
                              <div key={serviceId} className="flex justify-between text-sm mb-2">
                                <span className="text-gray-300">{name}</span>
                                <span>${price}</span>
                              </div>
                            ) : null;
                          })}
                          <div className="border-t border-gray-700 mt-4 pt-4 flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>${newOrderServices.reduce((sum, id) => {
                              const detected = detectedServices.find(s => s.service_id === id);
                              const available = availableServices.find(s => s.id === id);
                              return sum + (detected?.price || available?.price || 0);
                            }, 0)}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-400">No services selected</p>
                      )}
                      
                      <button
                        onClick={submitNewOrder}
                        disabled={submittingOrder || newOrderServices.length === 0}
                        className="w-full mt-6 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white py-4 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingOrder ? 'Submitting...' : 'Submit Order'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">My Files</h2>
              
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {orders.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No files yet. Create an order to upload files.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">File</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Order</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Type</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.flatMap(order => {
                        const files = [];
                        if (order.original_file) {
                          files.push({
                            name: order.original_filename || 'Original File',
                            type: 'Original',
                            file: order.original_file,
                            order: order,
                            date: order.created_at
                          });
                        }
                        if (order.modified_file) {
                          files.push({
                            name: order.modified_filename || 'Modified File',
                            type: 'Modified',
                            file: order.modified_file,
                            order: order,
                            date: order.completed_at || order.created_at
                          });
                        }
                        return files;
                      }).map((file, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{file.type === 'Modified' ? '✅' : '📄'}</span>
                              <span className="font-medium text-gray-900">{file.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">#{file.order.id?.slice(-8)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              file.type === 'Modified' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {file.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{new Date(file.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <a
                              href={`${API}/download/${file.file}`}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              download
                            >
                              Download
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Messages</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Order List */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Select Order</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {orders.length === 0 ? (
                      <p className="p-4 text-gray-500 text-sm">No orders</p>
                    ) : (
                      orders.map(order => (
                        <button
                          key={order.id}
                          onClick={() => { setSelectedOrder(order); fetchMessages(order.id); }}
                          className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition ${
                            selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <p className="font-medium text-gray-900">Order #{order.id?.slice(-8)}</p>
                          <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Chat */}
                <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: '500px' }}>
                  {selectedOrder ? (
                    <>
                      <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <p className="font-semibold text-gray-900">Order #{selectedOrder.id?.slice(-8)}</p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 ? (
                          <p className="text-gray-500 text-center py-8">No messages yet. Start the conversation!</p>
                        ) : (
                          messages.map((msg, i) => (
                            <div
                              key={i}
                              className={`max-w-[80%] p-3 rounded-2xl ${
                                msg.sender === 'customer'
                                  ? 'bg-blue-500 text-white ml-auto'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <p>{msg.message}</p>
                              <p className={`text-xs mt-1 ${msg.sender === 'customer' ? 'text-blue-100' : 'text-gray-400'}`}>
                                {new Date(msg.created_at).toLocaleString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-4 border-t border-gray-100">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          />
                          <button
                            onClick={sendMessage}
                            disabled={sendingMessage || !newMessage.trim()}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition disabled:opacity-50"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      Select an order to view messages
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment History</h2>
              
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {orders.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No payments yet</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Order ID</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Description</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Amount</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 font-mono text-sm">#{order.id?.slice(-8)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {(order.services || order.selected_services || []).slice(0, 2).map(s => typeof s === 'object' ? s.name : s).join(', ') || 'ECU Service'}
                          </td>
                          <td className="px-6 py-4 font-semibold">${(order.total_amount || order.price || 0).toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {order.payment_status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-blue-600 hover:text-blue-700 text-sm">
                              Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                
                {/* Total Summary */}
                {orders.length > 0 && (
                  <div className="p-6 bg-gray-50 border-t border-gray-200">
                    <div className="flex justify-end gap-8">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total Paid</p>
                        <p className="text-2xl font-bold text-gray-900">${totalSpent.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
              
              <div className="max-w-2xl space-y-6">
                {/* Profile */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Profile Information</h3>
                  
                  {settingsMessage.text && (
                    <div className={`mb-4 p-3 rounded-xl text-sm ${
                      settingsMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {settingsMessage.text}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      {editingProfile ? (
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900 py-3">{accountInfo?.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900 py-3">{accountInfo?.email}</p>
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>
                    
                    {editingProfile ? (
                      <div className="flex gap-3">
                        <button
                          onClick={updateProfile}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => { setEditingProfile(false); setProfileName(accountInfo?.name || ''); }}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-xl transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingProfile(true)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Change Password */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={changePassword}
                      disabled={!currentPassword || !newPassword}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition disabled:opacity-50"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
                
                {/* Danger Zone */}
                <div className="bg-white rounded-2xl border border-red-200 p-6">
                  <h3 className="font-semibold text-red-600 mb-4">Danger Zone</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-6 py-2 rounded-xl transition">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomerPortal;
