import { useState, useEffect } from 'react';
import axios from 'axios';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const PAYPAL_CLIENT_ID = 'AdVyLaCwPuU1Adn3p-1HCu07rg-LvTUi2H30M-7-aCT0fuW3Q1o8ZeqFg7jnUaPo4ZTxCvKSuZQ6kLYW';

const NewUploadFlow = () => {
  // Updated step: 0: Landing, 1: Vehicle Selection, 2: Upload, 3: Processing, 4: Services, 5: Payment, 6: Success
  const [step, setStep] = useState(0);
  
  // Vehicle Selection State (Sedox-style)
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [models, setModels] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [engines, setEngines] = useState([]);
  
  const [selectedVehicleType, setSelectedVehicleType] = useState(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedGeneration, setSelectedGeneration] = useState(null);
  const [selectedEngine, setSelectedEngine] = useState(null);
  
  const [vehicleLoading, setVehicleLoading] = useState(false);
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Results state
  const [fileId, setFileId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [availableOptions, setAvailableOptions] = useState([]);
  
  // Selection state
  const [selectedServices, setSelectedServices] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  
  // DTC codes input
  const [dtcSingleCode, setDtcSingleCode] = useState('');
  const [dtcMultipleCodes, setDtcMultipleCodes] = useState('');
  const [dtcError, setDtcError] = useState('');
  
  // Customer info
  const [customerInfo, setCustomerInfo] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: ''
  });
  
  // Download state
  const [orderId, setOrderId] = useState(null);
  const [downloadLinks, setDownloadLinks] = useState([]);
  
  // Services from API
  const [allServices, setAllServices] = useState([]);

  useEffect(() => {
    fetchVehicleTypes();
    fetchServices();
  }, []);

  // Fetch vehicle types on load
  const fetchVehicleTypes = async () => {
    try {
      const response = await axios.get(`${API}/vehicles/types`);
      setVehicleTypes(response.data || []);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  // Fetch manufacturers when vehicle type is selected
  const handleVehicleTypeSelect = async (type) => {
    setSelectedVehicleType(type);
    setSelectedManufacturer(null);
    setSelectedModel(null);
    setSelectedGeneration(null);
    setSelectedEngine(null);
    setManufacturers([]);
    setModels([]);
    setGenerations([]);
    setEngines([]);
    
    setVehicleLoading(true);
    try {
      const response = await axios.get(`${API}/vehicles/manufacturers/${type.id}`);
      setManufacturers(response.data || []);
    } catch (error) {
      console.error('Error fetching manufacturers:', error);
    }
    setVehicleLoading(false);
  };

  // Fetch models when manufacturer is selected
  const handleManufacturerSelect = async (mfr) => {
    setSelectedManufacturer(mfr);
    setSelectedModel(null);
    setSelectedGeneration(null);
    setSelectedEngine(null);
    setModels([]);
    setGenerations([]);
    setEngines([]);
    
    setVehicleLoading(true);
    try {
      const response = await axios.get(`${API}/vehicles/models/${mfr.id}`);
      setModels(response.data || []);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
    setVehicleLoading(false);
  };

  // Fetch generations when model is selected
  const handleModelSelect = async (model) => {
    setSelectedModel(model);
    setSelectedGeneration(null);
    setSelectedEngine(null);
    setGenerations([]);
    setEngines([]);
    
    setVehicleLoading(true);
    try {
      const response = await axios.get(`${API}/vehicles/generations/${model.id}`);
      setGenerations(response.data || []);
    } catch (error) {
      console.error('Error fetching generations:', error);
    }
    setVehicleLoading(false);
  };

  // Fetch engines when generation is selected
  const handleGenerationSelect = async (gen) => {
    setSelectedGeneration(gen);
    setSelectedEngine(null);
    setEngines([]);
    
    setVehicleLoading(true);
    try {
      const response = await axios.get(`${API}/vehicles/engines/${gen.id}`);
      setEngines(response.data || []);
    } catch (error) {
      console.error('Error fetching engines:', error);
    }
    setVehicleLoading(false);
  };

  // Handle engine selection
  const handleEngineSelect = (engine) => {
    setSelectedEngine(engine);
  };

  // Proceed to upload after vehicle selection
  const proceedToUpload = () => {
    if (!selectedEngine) {
      alert('Please select your vehicle engine to continue');
      return;
    }
    setStep(2);
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setAllServices(response.data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  // Helper to get service price from API data
  const getServicePrice = (serviceId) => {
    const service = allServices.find(s => s.id === serviceId);
    return service ? service.base_price : 0;
  };

  // Get vehicle summary string
  const getVehicleSummary = () => {
    if (!selectedManufacturer || !selectedModel || !selectedGeneration || !selectedEngine) {
      return 'No vehicle selected';
    }
    return `${selectedManufacturer.name} ${selectedModel.name} ${selectedGeneration.name} - ${selectedEngine.name}`;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const startProcessing = async () => {
    if (!uploadedFile) return;
    
    setProcessing(true);
    setProcessingProgress(0);
    
    // Progress animation
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      // Include vehicle information with the upload
      if (selectedEngine) {
        formData.append('vehicle_info', JSON.stringify({
          vehicle_type: selectedVehicleType?.name,
          manufacturer: selectedManufacturer?.name,
          manufacturer_id: selectedManufacturer?.id,
          model: selectedModel?.name,
          model_id: selectedModel?.id,
          generation: selectedGeneration?.name,
          generation_id: selectedGeneration?.id,
          engine: selectedEngine?.name,
          engine_id: selectedEngine?.id
        }));
      }

      const response = await axios.post(`${API}/analyze-and-process-file`, formData);
      
      clearInterval(interval);
      setProcessingProgress(100);
      
      if (response.data.success) {
        setFileId(response.data.file_id);
        setAnalysisResult(response.data);
        setAvailableOptions(response.data.available_options || []);
        setTimeout(() => {
          setStep(4); // Go to service selection (step 4 in new flow)
        }, 500);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
      clearInterval(interval);
      setProcessing(false);
      setStep(2); // Back to upload step
    }
  };

  // Validate DTC code format
  const isValidDTC = (code) => {
    const dtcPattern = /^[PCBU][0-9]{4}$/i;
    return dtcPattern.test(code.trim());
  };

  const parseDTCCodes = (input) => {
    const codes = input.split(/[,\n\s]+/).filter(code => code.trim() !== '');
    return codes.map(code => code.trim().toUpperCase());
  };

  const handleServiceToggle = (serviceId, price) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
      setTotalPrice(prev => prev - price);
      if (serviceId === 'dtc-single') setDtcSingleCode('');
      if (serviceId === 'dtc-multiple') setDtcMultipleCodes('');
      setDtcError('');
    } else {
      if (serviceId === 'dtc-single' && selectedServices.includes('dtc-multiple')) {
        setSelectedServices(prev => prev.filter(id => id !== 'dtc-multiple'));
        setTotalPrice(prev => prev - 25 + price);
        setDtcMultipleCodes('');
      } else if (serviceId === 'dtc-multiple' && selectedServices.includes('dtc-single')) {
        setSelectedServices(prev => prev.filter(id => id !== 'dtc-single'));
        setTotalPrice(prev => prev - 10 + price);
        setDtcSingleCode('');
      } else {
        setTotalPrice(prev => prev + price);
      }
      setSelectedServices(prev => [...prev.filter(id => !id.startsWith('dtc-')), serviceId]);
      setDtcError('');
    }
  };

  const proceedToPayment = () => {
    if (selectedServices.length === 0) {
      alert('Please select at least one service');
      return;
    }
    
    if (selectedServices.includes('dtc-single')) {
      if (!dtcSingleCode.trim()) {
        setDtcError('Please enter the DTC code you want to remove');
        return;
      }
      if (!isValidDTC(dtcSingleCode)) {
        setDtcError('Invalid DTC format. Example: P0420, C1234, B0001');
        return;
      }
    }
    
    if (selectedServices.includes('dtc-multiple')) {
      if (!dtcMultipleCodes.trim()) {
        setDtcError('Please enter the DTC codes you want to remove');
        return;
      }
      const codes = parseDTCCodes(dtcMultipleCodes);
      if (codes.length === 0) {
        setDtcError('Please enter at least one DTC code');
        return;
      }
      const invalidCodes = codes.filter(code => !isValidDTC(code));
      if (invalidCodes.length > 0) {
        setDtcError(`Invalid DTC format: ${invalidCodes.join(', ')}. Example: P0420`);
        return;
      }
    }
    
    setDtcError('');
    setStep(5); // Payment step in new flow
  };

  const createOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [{
        amount: {
          value: totalPrice.toFixed(2)
        },
        description: `ECU Flash Service - ${selectedServices.length} service(s)`
      }]
    });
  };

  const onApprove = async (data, actions) => {
    const order = await actions.order.capture();
    
    try {
      const dtcCodesData = {};
      if (selectedServices.includes('dtc-single') && dtcSingleCode) {
        dtcCodesData.dtc_codes = [dtcSingleCode.trim().toUpperCase()];
        dtcCodesData.dtc_type = 'single';
      } else if (selectedServices.includes('dtc-multiple') && dtcMultipleCodes) {
        dtcCodesData.dtc_codes = parseDTCCodes(dtcMultipleCodes);
        dtcCodesData.dtc_type = 'multiple';
      }
      
      // Build vehicle info from Sedox-style selection
      const vehicleInfo = {
        vehicle_type: selectedVehicleType?.name,
        manufacturer: selectedManufacturer?.name,
        manufacturer_id: selectedManufacturer?.id,
        model: selectedModel?.name,
        model_id: selectedModel?.id,
        generation: selectedGeneration?.name,
        generation_id: selectedGeneration?.id,
        engine: selectedEngine?.name,
        engine_id: selectedEngine?.id
      };
      
      const purchaseData = new FormData();
      purchaseData.append('file_id', fileId);
      purchaseData.append('selected_services', JSON.stringify(selectedServices));
      purchaseData.append('customer_name', customerInfo.customer_name);
      purchaseData.append('customer_email', customerInfo.customer_email);
      purchaseData.append('customer_phone', customerInfo.customer_phone);
      purchaseData.append('vehicle_info', JSON.stringify(vehicleInfo));
      purchaseData.append('dtc_codes', JSON.stringify(dtcCodesData));
      purchaseData.append('paypal_order_id', order.id);
      purchaseData.append('paypal_transaction_id', order.purchase_units[0].payments.captures[0].id);
      
      const response = await axios.post(`${API}/purchase-processed-file`, purchaseData);
      
      if (response.data.success) {
        setOrderId(response.data.order_id);
        setDownloadLinks(response.data.download_links || []);
        setStep(6); // Success step in new flow
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Payment successful but error creating order. Contact support with PayPal order ID: ' + order.id);
    }
  };

  // ============== LANDING PAGE (Step 0) ==============
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">ECU Flash Service</h1>
                  <p className="text-xs text-slate-400">Professional ECU Tuning</p>
                </div>
              </div>
              <nav className="hidden md:flex items-center space-x-8">
                <a href="#services" className="text-slate-300 hover:text-white transition">Services</a>
                <a href="#how-it-works" className="text-slate-300 hover:text-white transition">How It Works</a>
                <a href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</a>
                <button 
                  onClick={() => setStep(1)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                >
                  Get Started
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                <span className="text-blue-400 text-sm font-medium">Professional Engineers • 20-60 Min Delivery</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Professional ECU
                <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">
                  Tuning Service
                </span>
              </h1>
              
              <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
                Upload your ECU file, select your services, and receive your professionally 
                modified file within 20-60 minutes. No software required.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => setStep(1)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all transform hover:-translate-y-1"
                >
                  Upload ECU File →
                </button>
                <a 
                  href="#how-it-works"
                  className="border border-slate-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-800 transition-all"
                >
                  Learn More
                </a>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-8 mb-16">
              <div className="flex items-center space-x-2 text-slate-400">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Secure PayPal Checkout</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Professional Engineers</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>20-60 Min Delivery</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>All Brands Supported</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { value: '10K+', label: 'Files Processed' },
                { value: '99%', label: 'Success Rate' },
                { value: '24/7', label: 'Support' },
                { value: '50+', label: 'Countries Served' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-slate-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-20 px-6 bg-slate-800/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Services</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Professional ECU modifications performed by certified engineers
              </p>
            </div>
            
            {/* Main Services - 6 cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {allServices.slice(0, 6).map((service, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all group">
                  <div className="text-4xl mb-4">{service.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{service.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{service.description}</p>
                  <div className="text-blue-400 font-semibold">${service.base_price?.toFixed(0)}</div>
                </div>
              ))}
            </div>
            
            {/* Additional Services - Smaller cards */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-white text-center mb-6">Additional Services</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allServices.slice(6).map((service, i) => (
                  <div key={i} className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 hover:border-blue-500/30 transition-all">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{service.icon}</span>
                      <span className="text-white font-medium text-sm">{service.name}</span>
                    </div>
                    <div className="text-blue-400 font-semibold text-sm">${service.base_price?.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Get your modified ECU file in 3 simple steps
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: '01', title: 'Upload Your File', desc: 'Upload your original ECU file (.bin, .hex, .ori). We support all major ECU brands.' },
                { step: '02', title: 'Select Services', desc: 'Choose the modifications you need. DTC removal, DPF OFF, EGR OFF, and more.' },
                { step: '03', title: 'Download & Flash', desc: 'Pay securely via PayPal. Receive your modified file within 20-60 minutes.' },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
                    <div className="text-6xl font-bold text-slate-700 mb-4">{item.step}</div>
                    <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                    <p className="text-slate-400">{item.desc}</p>
                  </div>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-slate-600 text-2xl">→</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-6 bg-slate-800/30">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Transparent Pricing</h2>
              <p className="text-slate-400">No hidden fees. Pay only for what you need.</p>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-3xl overflow-hidden">
              <div className="p-8 border-b border-slate-700/50">
                <h3 className="text-2xl font-bold text-white mb-2">Service Pricing</h3>
                <p className="text-slate-400">All prices in USD • 18 services available</p>
              </div>
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 divide-slate-700/50">
                <div className="divide-y divide-slate-700/50">
                  {allServices.slice(0, 9).map((service, i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-slate-800/50 transition">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{service.icon}</span>
                        <span className="text-white font-medium text-sm">{service.name}</span>
                      </div>
                      <span className="text-blue-400 font-bold">${service.base_price?.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-slate-700/50 md:border-l md:border-slate-700/50">
                  {allServices.slice(9).map((service, i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-slate-800/50 transition">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{service.icon}</span>
                        <span className="text-white font-medium text-sm">{service.name}</span>
                      </div>
                      <span className="text-blue-400 font-bold">${service.base_price?.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
                Upload your ECU file now and receive your professionally modified file within 20-60 minutes.
              </p>
              <button 
                onClick={() => setStep(1)}
                className="bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all transform hover:-translate-y-1"
              >
                Upload ECU File →
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 border-t border-slate-800 py-12 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-white">ECU Flash Service</span>
                </div>
                <p className="text-slate-400 text-sm">Professional ECU tuning services for automotive enthusiasts worldwide.</p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Services</h4>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li>DTC Removal</li>
                  <li>DPF OFF</li>
                  <li>EGR OFF</li>
                  <li>AdBlue OFF</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li>Contact Us</li>
                  <li>FAQ</li>
                  <li>Terms of Service</li>
                  <li>Privacy Policy</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Contact</h4>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li>admin@ecuflashservice.com</li>
                  <li>24/7 Email Support</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-slate-500 text-sm">© 2024 ECU Flash Service. All rights reserved.</p>
              <p className="text-slate-500 text-sm mt-2 md:mt-0">⚠️ For off-road and competition use only</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setStep(0)} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ECU Flash Service</h1>
                <p className="text-xs text-slate-400">Professional ECU Tuning</p>
              </div>
            </button>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center space-x-2">
              {['Upload', 'Analyze', 'Select', 'Pay', 'Done'].map((label, i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step > i ? 'bg-green-500 text-white' : 
                    step === i + 1 ? 'bg-blue-500 text-white' : 
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {step > i ? '✓' : i + 1}
                  </div>
                  {i < 4 && <div className={`w-8 h-0.5 ${step > i ? 'bg-green-500' : 'bg-slate-700'}`}></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        
        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Upload Your ECU File</h2>
              <p className="text-slate-400">Our engineers will analyze and process your file professionally</p>
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                isDragging ? 'border-blue-500 bg-blue-500/10' : 
                uploadedFile ? 'border-green-500 bg-green-500/10' : 
                'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".bin,.hex,.ecu,.ori,.mod"
                onChange={handleFileSelect}
              />
              
              {uploadedFile ? (
                <div>
                  <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-white mb-2">{uploadedFile.name}</p>
                  <p className="text-slate-400">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="text-blue-400 text-sm mt-4">Click to change file</p>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-white mb-2">Drag & drop your ECU file here</p>
                  <p className="text-slate-400 mb-4">or click to browse</p>
                  <p className="text-slate-500 text-sm">Supported: .bin, .hex, .ecu, .ori, .mod</p>
                </div>
              )}
            </div>
            
            {uploadedFile && (
              <button
                onClick={() => { setStep(2); startProcessing(); }}
                className="w-full mt-8 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                Analyze File →
              </button>
            )}
          </div>
        )}
        
        {/* STEP 2: Processing */}
        {step === 2 && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-3xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4">Analyzing Your File</h2>
            <p className="text-slate-400 mb-8">Please wait while we analyze your ECU file...</p>
            
            <div className="max-w-md mx-auto">
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              <p className="text-slate-400 mt-4">{Math.round(processingProgress)}% Complete</p>
            </div>
          </div>
        )}
        
        {/* STEP 3: Results & Selection */}
        {step === 3 && analysisResult && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-2">Analysis Complete</h2>
              <p className="text-slate-400">Select the services you need</p>
            </div>

            {/* File Info */}
            <div className="bg-slate-900/50 rounded-2xl p-6 mb-8">
              <h3 className="font-semibold mb-4 text-slate-300">File Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Filename:</span>
                  <span className="text-white ml-2">{analysisResult.original_filename}</span>
                </div>
                <div>
                  <span className="text-slate-500">Size:</span>
                  <span className="text-white ml-2">{analysisResult.file_size_mb?.toFixed(2)} MB</span>
                </div>
              </div>
            </div>

            {/* Services */}
            <h3 className="text-xl font-semibold mb-4">Available Services</h3>
            <div className="space-y-3 mb-8">
              {availableOptions.map((option) => (
                <div key={option.service_id} className="bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition">
                  <label className="flex items-center justify-between p-5 cursor-pointer">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(option.service_id)}
                        onChange={() => handleServiceToggle(option.service_id, option.price)}
                        className="w-5 h-5 rounded border-slate-500 text-blue-500 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-semibold text-white">{option.service_name}</div>
                        <div className="text-sm text-slate-400">Confidence: {(option.confidence * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-400">${option.price.toFixed(2)}</div>
                  </label>
                  
                  {/* DTC Input Fields */}
                  {option.service_id === 'dtc-single' && selectedServices.includes('dtc-single') && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-700/50">
                      <label className="block text-sm text-slate-400 mb-2">Enter DTC code to remove:</label>
                      <input
                        type="text"
                        value={dtcSingleCode}
                        onChange={(e) => { setDtcSingleCode(e.target.value.toUpperCase()); setDtcError(''); }}
                        placeholder="e.g., P0420"
                        className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none"
                        maxLength={5}
                      />
                      <p className="text-xs text-slate-500 mt-2">Format: P0420, C1234, B0001, U0100</p>
                    </div>
                  )}
                  
                  {option.service_id === 'dtc-multiple' && selectedServices.includes('dtc-multiple') && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-700/50">
                      <label className="block text-sm text-slate-400 mb-2">Enter DTC codes (one per line):</label>
                      <textarea
                        value={dtcMultipleCodes}
                        onChange={(e) => { setDtcMultipleCodes(e.target.value.toUpperCase()); setDtcError(''); }}
                        placeholder="P0420&#10;P2002&#10;P0401"
                        className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none min-h-[100px]"
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {dtcError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6">
                ⚠️ {dtcError}
              </div>
            )}

            {/* Total & Continue */}
            {selectedServices.length > 0 && (
              <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg text-slate-300">Total:</span>
                  <span className="text-3xl font-bold text-white">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={proceedToPayment}
              disabled={selectedServices.length === 0}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                selectedServices.length > 0
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/25'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              Continue to Payment →
            </button>
          </div>
        )}
        
        {/* STEP 4: Customer Info & Payment */}
        {step === 4 && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Complete Your Order</h2>
              <p className="text-slate-400">Enter your details and complete payment</p>
            </div>

            {/* Order Summary */}
            <div className="bg-slate-900/50 rounded-2xl p-6 mb-8">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                {availableOptions.filter(opt => selectedServices.includes(opt.service_id)).map(opt => (
                  <div key={opt.service_id} className="flex justify-between text-sm">
                    <span className="text-slate-400">{opt.service_name}</span>
                    <span className="text-white">${opt.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-700 pt-4 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-green-400">${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">Vehicle Information</h3>
              <div className="grid gap-4">
                <select
                  value={vehicleType}
                  onChange={(e) => {
                    setVehicleType(e.target.value);
                    setCustomerInfo({...customerInfo, vehicle_make: '', vehicle_model: ''});
                  }}
                  className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select Vehicle Type *</option>
                  <option value="Car">Car / Pickup</option>
                  <option value="Truck">Heavy Duty Truck</option>
                  <option value="Bus">Bus</option>
                </select>

                <select
                  value={customerInfo.vehicle_make}
                  onChange={(e) => setCustomerInfo({...customerInfo, vehicle_make: e.target.value, vehicle_model: ''})}
                  disabled={!vehicleType}
                  className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  required
                >
                  <option value="">Select Brand *</option>
                  {availableMakes.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={customerInfo.vehicle_model}
                    onChange={(e) => setCustomerInfo({...customerInfo, vehicle_model: e.target.value})}
                    placeholder="Model *"
                    className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                  <select
                    value={customerInfo.vehicle_year}
                    onChange={(e) => setCustomerInfo({...customerInfo, vehicle_year: e.target.value})}
                    className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none"
                    required
                  >
                    {Array.from({length: 36}, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">Contact Information</h3>
              <div className="grid gap-4">
                <input
                  type="text"
                  value={customerInfo.customer_name}
                  onChange={(e) => setCustomerInfo({...customerInfo, customer_name: e.target.value})}
                  placeholder="Full Name *"
                  className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none"
                  required
                />
                <input
                  type="email"
                  value={customerInfo.customer_email}
                  onChange={(e) => setCustomerInfo({...customerInfo, customer_email: e.target.value})}
                  placeholder="Email Address * (for download link)"
                  className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none"
                  required
                />
                <input
                  type="tel"
                  value={customerInfo.customer_phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, customer_phone: e.target.value})}
                  placeholder="Phone (optional)"
                  className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* PayPal */}
            <div className="bg-slate-900/50 rounded-2xl p-6">
              <h3 className="font-semibold mb-4 text-center">Secure Payment</h3>
              <PayPalScriptProvider options={{ "client-id": PAYPAL_CLIENT_ID, currency: "USD" }}>
                <PayPalButtons 
                  style={{ layout: "vertical", color: "blue", shape: "rect" }}
                  createOrder={createOrder}
                  onApprove={onApprove}
                />
              </PayPalScriptProvider>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full mt-4 py-3 rounded-xl text-slate-400 hover:text-white transition"
            >
              ← Back to Service Selection
            </button>
          </div>
        )}
        
        {/* STEP 5: Success */}
        {step === 5 && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-3xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4">Payment Successful!</h2>
            <p className="text-slate-400 mb-8">Your file has been submitted for processing</p>
            
            {/* Processing Status */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
                <span className="text-lg text-amber-400 font-semibold">Processing Your File...</span>
              </div>
              <p className="text-amber-300/80">
                Our engineers are working on your file. You'll receive an email within <strong>20-60 minutes</strong> with your download link.
              </p>
            </div>

            {/* Order Details */}
            <div className="bg-slate-900/50 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-semibold mb-4">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="text-white font-mono">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle:</span>
                  <span className="text-white">{customerInfo.vehicle_year} {customerInfo.vehicle_make} {customerInfo.vehicle_model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Paid:</span>
                  <span className="text-green-400 font-semibold">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-semibold mb-4 text-blue-400">What Happens Next?</h3>
              <ol className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mr-3 mt-0.5 flex-shrink-0">1</span>
                  Our engineers analyze and process your file
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mr-3 mt-0.5 flex-shrink-0">2</span>
                  You'll receive an email at <strong>{customerInfo.customer_email}</strong>
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mr-3 mt-0.5 flex-shrink-0">3</span>
                  Click the download link to get your modified file
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mr-3 mt-0.5 flex-shrink-0">4</span>
                  Flash the file to your vehicle ECU
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`${API}/order-status/${orderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition"
              >
                Check Order Status
              </a>
              <button
                onClick={() => window.location.reload()}
                className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-semibold transition"
              >
                Process Another File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer for inner pages */}
      {step > 0 && (
        <footer className="bg-slate-900/50 border-t border-slate-800 py-6 mt-16">
          <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
            <p>© 2024 ECU Flash Service | Professional ECU Tuning</p>
            <p className="mt-1">⚠️ For off-road and competition use only</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default NewUploadFlow;
