import { useState, useEffect } from 'react';
import axios from 'axios';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// PayPal Configuration
// SANDBOX Client ID - For Testing
const PAYPAL_SANDBOX_CLIENT_ID = 'AUKI1eDyXSrMhAJ_Lo4E-WL1ptVJQ3NaIsamoiklSc2p83EEyRvDxVBvhDV3k6q8FeG_vdMYPQv5DJtC';
// LIVE Client ID - For Production (payments@ecuflashservice.com)
const PAYPAL_LIVE_CLIENT_ID = 'AVHOtncoJmXhk_-HrJGRk1Yblmm25Zv7BdQbIByEhXrkzc5Gw9Rv9jP8q9YJ5HPPqqIZGtWQDP7jIDko';

// Toggle this to switch between Sandbox (testing) and Live (production)
const USE_SANDBOX = false;  // Set to false for LIVE payments
const PAYPAL_CLIENT_ID = USE_SANDBOX ? PAYPAL_SANDBOX_CLIENT_ID : PAYPAL_LIVE_CLIENT_ID;

// Debug log
console.log("PayPal Mode:", USE_SANDBOX ? "SANDBOX" : "LIVE");
console.log("PayPal Client ID:", PAYPAL_CLIENT_ID.substring(0, 20) + "...");

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
  const [selectedEcu, setSelectedEcu] = useState(null);
  const [customEcu, setCustomEcu] = useState('');
  
  // Dynamic ECU types based on selected engine
  const [dynamicEcuTypes, setDynamicEcuTypes] = useState([]);
  const [ecuLoading, setEcuLoading] = useState(false);
  
  // Manual vehicle entry (for "Other" option)
  const [isManualVehicle, setIsManualVehicle] = useState(false);
  const [manualVehicle, setManualVehicle] = useState({
    make: '',
    model: '',
    year: '',
    engine: ''
  });
  
  const [vehicleLoading, setVehicleLoading] = useState(false);
  
  // Fallback ECU types for manual entry
  const commonEcuTypes = [
    // Bosch
    { id: 'bosch-edc17c49', name: 'Bosch EDC17C49', manufacturer: 'Bosch' },
    { id: 'bosch-edc17c46', name: 'Bosch EDC17C46', manufacturer: 'Bosch' },
    { id: 'bosch-edc17c50', name: 'Bosch EDC17C50', manufacturer: 'Bosch' },
    { id: 'bosch-edc17c54', name: 'Bosch EDC17C54', manufacturer: 'Bosch' },
    { id: 'bosch-edc17c57', name: 'Bosch EDC17C57', manufacturer: 'Bosch' },
    { id: 'bosch-edc17c60', name: 'Bosch EDC17C60', manufacturer: 'Bosch' },
    { id: 'bosch-edc17c64', name: 'Bosch EDC17C64', manufacturer: 'Bosch' },
    { id: 'bosch-edc17cp14', name: 'Bosch EDC17CP14', manufacturer: 'Bosch' },
    { id: 'bosch-edc17cp20', name: 'Bosch EDC17CP20', manufacturer: 'Bosch' },
    { id: 'bosch-edc17cp44', name: 'Bosch EDC17CP44', manufacturer: 'Bosch' },
    { id: 'bosch-edc17cp52', name: 'Bosch EDC17CP52', manufacturer: 'Bosch' },
    { id: 'bosch-edc16c34', name: 'Bosch EDC16C34', manufacturer: 'Bosch' },
    { id: 'bosch-edc16c39', name: 'Bosch EDC16C39', manufacturer: 'Bosch' },
    { id: 'bosch-edc16u1', name: 'Bosch EDC16U1', manufacturer: 'Bosch' },
    { id: 'bosch-edc16u31', name: 'Bosch EDC16U31', manufacturer: 'Bosch' },
    { id: 'bosch-med17', name: 'Bosch MED17', manufacturer: 'Bosch' },
    { id: 'bosch-med9', name: 'Bosch MED9', manufacturer: 'Bosch' },
    { id: 'bosch-me7', name: 'Bosch ME7', manufacturer: 'Bosch' },
    { id: 'bosch-md1', name: 'Bosch MD1', manufacturer: 'Bosch' },
    { id: 'bosch-mg1', name: 'Bosch MG1', manufacturer: 'Bosch' },
    // Siemens/Continental
    { id: 'siemens-sid201', name: 'Siemens SID201', manufacturer: 'Siemens' },
    { id: 'siemens-sid206', name: 'Siemens SID206', manufacturer: 'Siemens' },
    { id: 'siemens-sid208', name: 'Siemens SID208', manufacturer: 'Siemens' },
    { id: 'siemens-sid209', name: 'Siemens SID209', manufacturer: 'Siemens' },
    { id: 'siemens-sid305', name: 'Siemens SID305', manufacturer: 'Siemens' },
    { id: 'siemens-sid310', name: 'Siemens SID310', manufacturer: 'Siemens' },
    { id: 'siemens-sid803', name: 'Siemens SID803', manufacturer: 'Siemens' },
    { id: 'siemens-sid803a', name: 'Siemens SID803A', manufacturer: 'Siemens' },
    { id: 'continental-simos18', name: 'Continental Simos 18', manufacturer: 'Continental' },
    { id: 'continental-simos19', name: 'Continental Simos 19', manufacturer: 'Continental' },
    // Delphi
    { id: 'delphi-dcm35', name: 'Delphi DCM3.5', manufacturer: 'Delphi' },
    { id: 'delphi-dcm62', name: 'Delphi DCM6.2', manufacturer: 'Delphi' },
    { id: 'delphi-dcm71', name: 'Delphi DCM7.1', manufacturer: 'Delphi' },
    // Denso
    { id: 'denso-sh7058', name: 'Denso SH7058', manufacturer: 'Denso' },
    { id: 'denso-sh7059', name: 'Denso SH7059', manufacturer: 'Denso' },
    { id: 'denso-sh72531', name: 'Denso SH72531', manufacturer: 'Denso' },
    // Marelli
    { id: 'marelli-mj8', name: 'Marelli MJ8', manufacturer: 'Marelli' },
    { id: 'marelli-mj9', name: 'Marelli MJ9', manufacturer: 'Marelli' },
    { id: 'marelli-8gmf', name: 'Marelli 8GMF', manufacturer: 'Marelli' },
    // Weichai ECUs (Chinese Trucks)
    { id: 'weichai-ecm', name: 'Weichai ECM', manufacturer: 'Weichai' },
    { id: 'weichai-wp10-ecu', name: 'Weichai WP10 ECU', manufacturer: 'Weichai' },
    { id: 'weichai-wp12-ecu', name: 'Weichai WP12 ECU', manufacturer: 'Weichai' },
    { id: 'weichai-wp13-ecu', name: 'Weichai WP13 ECU', manufacturer: 'Weichai' },
    { id: 'weichai-bosch-edc17cv44', name: 'Weichai Bosch EDC17CV44', manufacturer: 'Weichai' },
    { id: 'weichai-bosch-edc17cv54', name: 'Weichai Bosch EDC17CV54', manufacturer: 'Weichai' },
    // Cummins ECUs (Chinese Trucks)
    { id: 'cummins-cm2150', name: 'Cummins CM2150', manufacturer: 'Cummins' },
    { id: 'cummins-cm2250', name: 'Cummins CM2250', manufacturer: 'Cummins' },
    { id: 'cummins-cm2350', name: 'Cummins CM2350', manufacturer: 'Cummins' },
    { id: 'cummins-cm870', name: 'Cummins CM870', manufacturer: 'Cummins' },
    { id: 'cummins-celect', name: 'Cummins CELECT', manufacturer: 'Cummins' },
    // Yuchai ECUs (Chinese Trucks)
    { id: 'yuchai-ecu', name: 'Yuchai ECU', manufacturer: 'Yuchai' },
    { id: 'yuchai-bosch-edc17', name: 'Yuchai Bosch EDC17', manufacturer: 'Yuchai' },
    // FAW ECUs
    { id: 'faw-ecu', name: 'FAW ECU', manufacturer: 'FAW' },
    { id: 'faw-bosch-edc17', name: 'FAW Bosch EDC17', manufacturer: 'FAW' },
    // Sinotruk/HOWO ECUs
    { id: 'sinotruk-ecu', name: 'Sinotruk ECU', manufacturer: 'Sinotruk' },
    { id: 'sinotruk-bosch-edc17', name: 'Sinotruk Bosch EDC17', manufacturer: 'Sinotruk' },
    { id: 'howo-mc11-ecu', name: 'HOWO MC11 ECU', manufacturer: 'Sinotruk' },
    // Dongfeng ECUs
    { id: 'dongfeng-dci-ecu', name: 'Dongfeng dCi ECU', manufacturer: 'Dongfeng' },
    { id: 'dongfeng-bosch-edc17', name: 'Dongfeng Bosch EDC17', manufacturer: 'Dongfeng' },
    { id: 'dongfeng-renault-ecu', name: 'Dongfeng Renault ECU', manufacturer: 'Dongfeng' },
    // Bosch Truck ECUs (Common in Chinese Trucks)
    { id: 'bosch-edc7', name: 'Bosch EDC7', manufacturer: 'Bosch' },
    { id: 'bosch-edc17cv41', name: 'Bosch EDC17CV41', manufacturer: 'Bosch' },
    { id: 'bosch-edc17cv44', name: 'Bosch EDC17CV44', manufacturer: 'Bosch' },
    { id: 'bosch-edc17cv54', name: 'Bosch EDC17CV54', manufacturer: 'Bosch' },
    { id: 'bosch-md1ce100', name: 'Bosch MD1CE100', manufacturer: 'Bosch' },
    { id: 'bosch-md1cs001', name: 'Bosch MD1CS001', manufacturer: 'Bosch' },
    { id: 'bosch-md1cs006', name: 'Bosch MD1CS006', manufacturer: 'Bosch' },
    // Other
    { id: 'other', name: 'Other (Enter manually)', manufacturer: 'Other' },
  ];
  
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
  
  // FREE Additional DTCs (included with DPF/EGR/AdBlue services)
  const [additionalDtcCodes, setAdditionalDtcCodes] = useState('');
  
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

  // Initialize data on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        const [typesResponse, servicesResponse] = await Promise.all([
          axios.get(`${API}/vehicles/types`),
          axios.get(`${API}/services`)
        ]);
        setVehicleTypes(typesResponse.data || []);
        setAllServices(servicesResponse.data || []);
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };
    initializeData();
  }, []);

  // Fetch manufacturers when vehicle type is selected
  const handleVehicleTypeSelect = async (type) => {
    // Check if "Other" was selected
    if (type.id === 'other') {
      setIsManualVehicle(true);
      setSelectedVehicleType({ id: 'other', name: 'Other / Not Listed', slug: 'other' });
      setSelectedManufacturer(null);
      setSelectedModel(null);
      setSelectedGeneration(null);
      setSelectedEngine(null);
      setSelectedEcu(null);
      return;
    }
    
    setIsManualVehicle(false);
    setSelectedVehicleType(type);
    setSelectedManufacturer(null);
    setSelectedModel(null);
    setSelectedGeneration(null);
    setSelectedEngine(null);
    setSelectedEcu(null);
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

  // Fetch engines when model is selected (dpfoffservice structure: Model -> Engine directly)
  const handleModelSelect = async (model) => {
    setSelectedModel(model);
    setSelectedGeneration(null); // Keep for backward compatibility
    setSelectedEngine(null);
    setGenerations([]);
    setEngines([]);
    
    setVehicleLoading(true);
    try {
      // New structure: engines are directly under models
      const response = await axios.get(`${API}/vehicles/engines/${model.id}`);
      setEngines(response.data || []);
    } catch (error) {
      console.error('Error fetching engines:', error);
    }
    setVehicleLoading(false);
  };

  // Keep for backward compatibility but not used in new flow
  const handleGenerationSelect = async (gen) => {
    setSelectedGeneration(gen);
    setSelectedEngine(null);
    setEngines([]);
  };

  // Handle engine selection - use ECUs from engine document (dpfoffservice structure)
  const handleEngineSelect = async (engine) => {
    setSelectedEngine(engine);
    setSelectedEcu(null);
    setCustomEcu('');
    setDynamicEcuTypes([]);
    
    if (engine && engine.id !== 'other') {
      // New structure: ECUs are embedded in the engine document
      if (engine.ecus && engine.ecus.length > 0) {
        // Map to match the expected format
        const ecuTypes = engine.ecus.map(ecu => ({
          id: ecu.id,
          name: ecu.name,
          manufacturer: ecu.name.split(' ')[0], // Extract manufacturer from name (e.g., "Bosch EDC17...")
          has_dpf: ecu.has_dpf,
          has_egr: ecu.has_egr,
          has_adblue: ecu.has_adblue
        }));
        setDynamicEcuTypes(ecuTypes);
        
        // Auto-select if only one ECU
        if (ecuTypes.length === 1) {
          setSelectedEcu(ecuTypes[0]);
        }
      } else {
        // Fallback to API call for backward compatibility
        setEcuLoading(true);
        try {
          const response = await axios.get(`${API}/vehicles/ecu-types/${engine.id}`);
          if (response.data && response.data.ecu_types) {
            setDynamicEcuTypes(response.data.ecu_types);
          }
        } catch (error) {
          console.error('Error fetching ECU types:', error);
          setDynamicEcuTypes([]);
        }
        setEcuLoading(false);
      }
    }
  };

  // Handle ECU selection
  const handleEcuSelect = (ecuId) => {
    if (ecuId === 'other') {
      setSelectedEcu({ id: 'other', name: 'Other', manufacturer: 'Other' });
    } else {
      // First check dynamic ECU types, then fallback to common types
      let ecu = dynamicEcuTypes.find(e => e.id === ecuId);
      if (!ecu) {
        ecu = commonEcuTypes.find(e => e.id === ecuId);
      }
      if (ecu) {
        setSelectedEcu(ecu);
        setCustomEcu('');
      }
    }
  };

  // Proceed to upload after vehicle selection
  const proceedToUpload = () => {
    if (isManualVehicle) {
      // Validate manual vehicle entry
      if (!manualVehicle.make.trim()) {
        alert('Please enter the vehicle make/brand');
        return;
      }
      if (!manualVehicle.model.trim()) {
        alert('Please enter the vehicle model');
        return;
      }
      if (!selectedEcu) {
        alert('Please select your ECU type');
        return;
      }
      if (selectedEcu.id === 'other' && !customEcu.trim()) {
        alert('Please enter your ECU type');
        return;
      }
    } else {
      if (!selectedEngine) {
        alert('Please select your vehicle engine to continue');
        return;
      }
      if (!selectedEcu) {
        alert('Please select your ECU type to continue');
        return;
      }
      if (selectedEcu.id === 'other' && !customEcu.trim()) {
        alert('Please enter your ECU type');
        return;
      }
    }
    setStep(2);
  };

  // Helper to get service price from API data
  const getServicePrice = (serviceId) => {
    const service = allServices.find(s => s.id === serviceId);
    return service ? service.base_price : 0;
  };

  // Get vehicle summary string
  const getVehicleSummary = () => {
    if (isManualVehicle) {
      const ecuInfo = selectedEcu ? (selectedEcu.id === 'other' ? customEcu : selectedEcu.name) : '';
      return `${manualVehicle.make} ${manualVehicle.model} ${manualVehicle.year} - ${manualVehicle.engine}${ecuInfo ? ` (${ecuInfo})` : ''}`;
    }
    // Updated: No longer requires selectedGeneration (dpfoffservice structure: Model -> Engine directly)
    if (!selectedManufacturer || !selectedModel || !selectedEngine) {
      return 'No vehicle selected';
    }
    const ecuInfo = selectedEcu ? (selectedEcu.id === 'other' ? customEcu : selectedEcu.name) : '';
    return `${selectedManufacturer.name} ${selectedModel.name} - ${selectedEngine.name}${ecuInfo ? ` (${ecuInfo})` : ''}`;
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
      if (isManualVehicle) {
        formData.append('vehicle_info', JSON.stringify({
          is_manual: true,
          vehicle_type: 'Other / Not Listed',
          manufacturer: manualVehicle.make,
          model: manualVehicle.model,
          generation: manualVehicle.year,
          engine: manualVehicle.engine,
          ecu: selectedEcu?.id === 'other' ? customEcu : selectedEcu?.name,
          ecu_manufacturer: selectedEcu?.manufacturer
        }));
      } else if (selectedEngine) {
        formData.append('vehicle_info', JSON.stringify({
          is_manual: false,
          vehicle_type: selectedVehicleType?.name,
          manufacturer: selectedManufacturer?.name,
          manufacturer_id: selectedManufacturer?.id,
          model: selectedModel?.name,
          model_id: selectedModel?.id,
          generation: selectedGeneration?.name,
          generation_id: selectedGeneration?.id,
          engine: selectedEngine?.name,
          engine_id: selectedEngine?.id,
          ecu: selectedEcu?.id === 'other' ? customEcu : selectedEcu?.name,
          ecu_manufacturer: selectedEcu?.manufacturer
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
      } else {
        // Analysis failed - show error and go back
        const errorMsg = response.data.error || 'Could not analyze file';
        const warnings = response.data.warnings || [];
        alert(`Analysis failed: ${errorMsg}\n${warnings.join('\n')}\n\nPlease try with a different ECU file.`);
        setProcessing(false);
        setStep(2); // Back to upload step
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
    // Validate price
    const price = parseFloat(totalPrice);
    if (isNaN(price) || price <= 0) {
      console.error("Invalid price for PayPal order:", totalPrice);
      alert("Error: Invalid order amount. Please select services first.");
      return Promise.reject(new Error("Invalid order amount"));
    }
    
    return actions.order.create({
      purchase_units: [{
        amount: {
          currency_code: "USD",
          value: price.toFixed(2)
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
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">ECU Flash Service</h1>
                  <p className="text-xs text-gray-500">Professional ECU Tuning</p>
                </div>
              </div>
              <nav className="hidden md:flex items-center space-x-8">
                <a href="#services" className="text-gray-600 hover:text-blue-600 transition">Services</a>
                <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition">How It Works</a>
                <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition">Pricing</a>
                <a href="/tools/dtc-delete" className="text-gray-600 hover:text-blue-600 transition">DTC Tool</a>
                <a href="/blog" className="text-gray-600 hover:text-blue-600 transition">Blog</a>
                <a href="/portal" className="text-gray-600 hover:text-blue-600 transition">My Orders</a>
                <button 
                  onClick={() => setStep(1)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-gray-900 px-6 py-2.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
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
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Professional ECU
                <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">
                  Tuning Service
                </span>
              </h1>
              
              <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
                Select your vehicle, upload your ECU file, choose your services, and receive your professionally 
                modified file within 20-60 minutes. No software required.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => setStep(1)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all transform hover:-translate-y-1"
                >
                  Select Your Vehicle →
                </button>
                <a 
                  href="#how-it-works"
                  className="border border-gray-300 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all"
                >
                  Learn More
                </a>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-8 mb-16">
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Secure PayPal Checkout</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Professional Engineers</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>20-60 Min Delivery</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-500">
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
                <div key={i} className="bg-gray-50/50 border border-gray-200/50 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-gray-500 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Customer Reviews Section - International Reviews */}
        <section className="py-16 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">What Our Customers Say</h2>
              <p className="text-gray-500">Trusted by thousands of vehicle owners and workshops worldwide</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Review 1 - India */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"Excellent service! DPF delete on my Innova Crysta was done in under 2 hours. Vehicle performance improved significantly. Very professional team!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">R</div>
                  <div>
                    <div className="font-semibold text-gray-900">Rajesh Kumar</div>
                    <div className="text-gray-500 text-sm">2021 Toyota Innova • DPF Off • 🇮🇳 India</div>
                  </div>
                </div>
              </div>
              
              {/* Review 2 - Nigeria */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"I was skeptical at first but these guys delivered! EGR + DPF combo on my Hilux. File came back in 40 minutes. My mechanic was impressed with the quality."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">C</div>
                  <div>
                    <div className="font-semibold text-gray-900">Chukwuemeka Obi</div>
                    <div className="text-gray-500 text-sm">2019 Toyota Hilux • EGR+DPF • 🇳🇬 Nigeria</div>
                  </div>
                </div>
              </div>
              
              {/* Review 3 - Spain */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"Servicio increíble! AdBlue delete on my Audi saved me €600 in repairs. Fast turnaround and great communication. Muy recomendado!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">C</div>
                  <div>
                    <div className="font-semibold text-gray-900">Carlos García</div>
                    <div className="text-gray-500 text-sm">2018 Audi A6 3.0 TDI • AdBlue Off • 🇪🇸 Spain</div>
                  </div>
                </div>
              </div>
              
              {/* Review 4 - Philippines */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"Super legit! Got my Ford Ranger's DPF removed. No more warning lights and fuel consumption improved. These guys know their stuff. Salamat po!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">J</div>
                  <div>
                    <div className="font-semibold text-gray-900">Juan Miguel Santos</div>
                    <div className="text-gray-500 text-sm">2020 Ford Ranger • DPF Off • 🇵🇭 Philippines</div>
                  </div>
                </div>
              </div>
              
              {/* Review 5 - South Africa */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"As a workshop owner in Johannesburg, I've done 30+ vehicles through ECU Flash. Consistent quality, fast delivery, fair prices. My go-to for all ECU work!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold">T</div>
                  <div>
                    <div className="font-semibold text-gray-900">Thabo Molefe</div>
                    <div className="text-gray-500 text-sm">Auto Workshop • 30+ Orders • 🇿🇦 South Africa</div>
                  </div>
                </div>
              </div>
              
              {/* Review 6 - UAE */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"DTC removal service is excellent. Had P2002 and P2459 codes cleared permanently from my Land Cruiser. No more check engine lights. Worth every dirham!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">A</div>
                  <div>
                    <div className="font-semibold text-gray-900">Ahmed Al-Rashid</div>
                    <div className="text-gray-500 text-sm">2019 Land Cruiser • DTC Delete • 🇦🇪 UAE</div>
                  </div>
                </div>
              </div>
              
              {/* Review 7 - Brazil */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"Muito bom! EGR delete on my Amarok V6 improved throttle response dramatically. The team was very helpful and explained everything. Highly recommend!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">P</div>
                  <div>
                    <div className="font-semibold text-gray-900">Pedro Silva</div>
                    <div className="text-gray-500 text-sm">2020 VW Amarok V6 • EGR Off • 🇧🇷 Brazil</div>
                  </div>
                </div>
              </div>
              
              {/* Review 8 - Thailand */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"Professional service! Got DPF + EGR combo for my Triton. File quality is excellent, car runs smooth. Fast response even with time zone difference. ขอบคุณครับ!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">S</div>
                  <div>
                    <div className="font-semibold text-gray-900">Somchai Tanaka</div>
                    <div className="text-gray-500 text-sm">2021 Mitsubishi Triton • DPF+EGR • 🇹🇭 Thailand</div>
                  </div>
                </div>
              </div>
              
              {/* Review 9 - UK */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"Brilliant service! AdBlue system was giving me grief on my Discovery. Both ECU and DCU files were handled perfectly. Saved me a fortune at the dealer!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">J</div>
                  <div>
                    <div className="font-semibold text-gray-900">James Wilson</div>
                    <div className="text-gray-500 text-sm">2018 Land Rover Discovery • AdBlue Off • 🇬🇧 UK</div>
                  </div>
                </div>
              </div>
              
              {/* Review 10 - Kenya */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"Outstanding service for fleet vehicles! We've processed 15 trucks through ECU Flash. DPF issues sorted, fuel efficiency improved. Great for African road conditions!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">W</div>
                  <div>
                    <div className="font-semibold text-gray-900">Wanjiku Mwangi</div>
                    <div className="text-gray-500 text-sm">Fleet Manager • 15 Trucks • 🇰🇪 Kenya</div>
                  </div>
                </div>
              </div>
              
              {/* Review 11 - Australia */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"Ripper service mate! DPF delete on my 79 Series LandCruiser. Perfect for outback driving now. No more forced regens in the middle of nowhere!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold">M</div>
                  <div>
                    <div className="font-semibold text-gray-900">Mitchell O'Brien</div>
                    <div className="text-gray-500 text-sm">2020 LC79 Series • DPF Off • 🇦🇺 Australia</div>
                  </div>
                </div>
              </div>
              
              {/* Review 12 - Pakistan */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-700 mb-4">"Very satisfied with the EGR removal service. My Fortuner runs much better now. Affordable prices and quick delivery. Shukriya! Will use again."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">A</div>
                  <div>
                    <div className="font-semibold text-gray-900">Ali Hassan</div>
                    <div className="text-gray-500 text-sm">2019 Toyota Fortuner • EGR Off • 🇵🇰 Pakistan</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Trust Stats */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-6 bg-gray-50 rounded-2xl px-8 py-4">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-xl">★</span>)}
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-900">4.9 out of 5</div>
                  <div className="text-gray-500 text-sm">Based on 3,500+ reviews from 45+ countries</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-20 px-6 bg-gray-50/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Professional ECU modifications performed by certified engineers
              </p>
            </div>
            
            {/* Main Services - 6 cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {allServices.slice(0, 6).map((service, i) => (
                <div key={i} className="bg-gray-50/50 border border-gray-200/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all group">
                  <div className="text-4xl mb-4">{service.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{service.description}</p>
                  <div className="text-blue-400 font-semibold">${service.base_price?.toFixed(0)}</div>
                </div>
              ))}
            </div>
            
            {/* Additional Services - Smaller cards */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-6">Additional Services</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allServices.slice(6).map((service, i) => (
                  <div key={i} className="bg-gray-50/30 border border-gray-200/30 rounded-xl p-4 hover:border-blue-500/30 transition-all">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{service.icon}</span>
                      <span className="text-gray-900 font-medium text-sm">{service.name}</span>
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
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Get your modified ECU file in 6 simple steps
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { step: '01', title: 'Select Vehicle', desc: 'Choose your vehicle type, manufacturer, model, generation, and engine.' },
                { step: '02', title: 'Select ECU Type', desc: 'Choose your ECU type from the recommended list based on your vehicle.' },
                { step: '03', title: 'Upload ECU File', desc: 'Upload your original ECU file (.bin, .hex, .ori, .ecu, .mod).' },
                { step: '04', title: 'Auto Analysis', desc: 'Our system automatically analyzes your file and detects ECU details.' },
                { step: '05', title: 'Choose Services', desc: 'Select the modifications: DPF, EGR, AdBlue, DTC removal, Stage tuning.' },
                { step: '06', title: 'Pay & Receive', desc: 'Pay via PayPal. Receive modified file within 20-60 minutes.' },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200/50 rounded-2xl p-4">
                    <div className="text-4xl font-bold text-gray-300 mb-2">{item.step}</div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                  {i < 5 && (
                    <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-gray-200 text-lg">→</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Special Features / Advertising */}
        <section className="py-16 px-6 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Why Choose Us</h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">🚛</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chinese Trucks Specialist</h3>
                <p className="text-gray-600 text-sm">AdBlue/SCR Delete available for all newer Chinese Trucks - Weichai, Yuchai, FAW, Sinotruk, Dongfeng, Foton.</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">100% Accurate Toyota Files</h3>
                <p className="text-gray-600 text-sm">100% correct Toyota modified files as per your service request. We guarantee quality on every Toyota ECU file.</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">🔌</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Installation Guidance</h3>
                <p className="text-gray-600 text-sm">After modification, we advise which plugs you need to disconnect if required for proper operation.</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">🆓</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Free DTC Support</h3>
                <p className="text-gray-600 text-sm">If further DTCs need to be deleted for your job file - it&apos;s FREE for 1 month after purchase (same file only).</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-6 bg-gray-50/30">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Transparent Pricing</h2>
              <p className="text-gray-500">No hidden fees. Pay only for what you need.</p>
            </div>
            
            <div className="bg-gradient-to-br from-gray-100 to-white border border-gray-200/50 rounded-3xl overflow-hidden">
              <div className="p-8 border-b border-gray-200/50">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Service Pricing</h3>
                <p className="text-gray-500">All prices in USD • 18 services available</p>
              </div>
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 divide-gray-300/50">
                <div className="divide-y divide-gray-300/50">
                  {allServices.slice(0, 9).map((service, i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-gray-50/50 transition">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{service.icon}</span>
                        <span className="text-gray-900 font-medium text-sm">{service.name}</span>
                      </div>
                      <span className="text-blue-400 font-bold">${service.base_price?.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-gray-300/50 md:border-l md:border-gray-200/50">
                  {allServices.slice(9).map((service, i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-gray-50/50 transition">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{service.icon}</span>
                        <span className="text-gray-900 font-medium text-sm">{service.name}</span>
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
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
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
        <footer className="bg-white border-t border-gray-100 py-12 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-gray-900">ECU Flash Service</span>
                </div>
                <p className="text-gray-500 text-sm">Professional ECU tuning services for automotive enthusiasts worldwide.</p>
              </div>
              <div>
                <h4 className="text-gray-900 font-semibold mb-4">Services</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/services/dtc-removal" className="text-gray-500 hover:text-blue-600 transition">DTC Removal</a></li>
                  <li><a href="/services/dpf-off" className="text-gray-500 hover:text-blue-600 transition">DPF OFF</a></li>
                  <li><a href="/services/egr-off" className="text-gray-500 hover:text-blue-600 transition">EGR OFF</a></li>
                  <li><a href="/services/adblue-off" className="text-gray-500 hover:text-blue-600 transition">AdBlue OFF</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-gray-900 font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/contact" className="text-gray-500 hover:text-blue-600 transition">Contact Us</a></li>
                  <li><a href="/faq" className="text-gray-500 hover:text-blue-600 transition">FAQ</a></li>
                  <li><a href="/terms" className="text-gray-500 hover:text-blue-600 transition">Terms of Service</a></li>
                  <li><a href="/privacy" className="text-gray-500 hover:text-blue-600 transition">Privacy Policy</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-gray-900 font-semibold mb-4">Contact</h4>
                <ul className="space-y-2 text-gray-500 text-sm">
                  <li>support@ecuflashservice.com</li>
                  <li>24/7 Email Support</li>
                  <li className="pt-2">
                    <a href="/contact" className="inline-block bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-600 transition">
                      Send Message
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-sm">© {new Date().getFullYear()} ECU Flash Service. All rights reserved.</p>
              <div className="flex items-center space-x-6 mt-4 md:mt-0">
                <a href="/faq" className="text-gray-400 hover:text-blue-600 text-sm transition">FAQ</a>
                <a href="/terms" className="text-gray-400 hover:text-blue-600 text-sm transition">Terms</a>
                <a href="/privacy" className="text-gray-400 hover:text-blue-600 text-sm transition">Privacy</a>
                <span className="text-gray-400 text-sm">⚠️ For off-road use only</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setStep(0)} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ECU Flash Service</h1>
                <p className="text-xs text-gray-500">Professional ECU Tuning</p>
              </div>
            </button>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center space-x-2">
              {['Vehicle', 'Upload', 'Analyze', 'Services', 'Pay', 'Done'].map((label, i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step > i ? 'bg-green-500 text-gray-900' : 
                    step === i + 1 ? 'bg-blue-500 text-gray-900' : 
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {step > i ? '✓' : i + 1}
                  </div>
                  {i < 5 && <div className={`w-6 h-0.5 ${step > i ? 'bg-green-500' : 'bg-gray-100'}`}></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        
        {/* STEP 1: Vehicle Selection (Sedox-style) */}
        {step === 1 && (
          <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Select Your Vehicle</h2>
              <p className="text-gray-500">Choose your vehicle to see available tuning services</p>
              <p className="text-sm text-blue-600 mt-2 flex items-center justify-center">
                <span className="mr-2">💡</span>
                Can&apos;t find your vehicle? Select &quot;Other&quot; to enter details manually
              </p>
            </div>
            
            {/* Vehicle Selection Chain */}
            <div className="space-y-6">
              
              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Vehicle Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
                  {vehicleTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleVehicleTypeSelect(type)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        selectedVehicleType?.id === type.id 
                          ? 'border-blue-500 bg-blue-500/20 text-gray-900' 
                          : 'border-gray-300 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-1">
                        {type.id === 'car' ? '🚗' : 
                         type.id === 'truck' ? '🚛' : 
                         type.id === 'agriculture' ? '🚜' : 
                         type.id === 'marine' ? '🚤' :
                         type.id === 'bus' ? '🚌' :
                         type.id === 'construction' ? '🏗️' : '🏍️'}
                      </div>
                      <div className="text-sm font-medium">{type.name}</div>
                    </button>
                  ))}
                  {/* Other / Not Listed Option */}
                  <button
                    onClick={() => handleVehicleTypeSelect({ id: 'other', name: 'Other / Not Listed', slug: 'other' })}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      isManualVehicle 
                        ? 'border-orange-500 bg-orange-500/20 text-gray-900' 
                        : 'border-gray-300 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">❓</div>
                    <div className="text-sm font-medium">Other</div>
                  </button>
                </div>
              </div>
              
              {/* Manual Vehicle Entry Form */}
              {isManualVehicle && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 space-y-4">
                  <h3 className="text-orange-600 font-semibold flex items-center">
                    <span className="mr-2">✏️</span> Enter Vehicle Details Manually
                  </h3>
                  <p className="text-sm text-gray-500">Your vehicle is not in our database? No problem! Enter the details below.</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Make / Brand *</label>
                      <input
                        type="text"
                        value={manualVehicle.make}
                        onChange={(e) => setManualVehicle({...manualVehicle, make: e.target.value})}
                        placeholder="e.g., Shacman, Sinotruk, FAW..."
                        className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Model *</label>
                      <input
                        type="text"
                        value={manualVehicle.model}
                        onChange={(e) => setManualVehicle({...manualVehicle, model: e.target.value})}
                        placeholder="e.g., X3000, HOWO A7..."
                        className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Year</label>
                      <input
                        type="text"
                        value={manualVehicle.year}
                        onChange={(e) => setManualVehicle({...manualVehicle, year: e.target.value})}
                        placeholder="e.g., 2020"
                        className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Engine</label>
                      <input
                        type="text"
                        value={manualVehicle.engine}
                        onChange={(e) => setManualVehicle({...manualVehicle, engine: e.target.value})}
                        placeholder="e.g., Weichai WP10 375hp"
                        className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  {/* ECU Type for Manual Entry - Always visible */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">ECU Type *</label>
                      <select
                        value={selectedEcu?.id || ''}
                        onChange={(e) => handleEcuSelect(e.target.value)}
                        className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="">Select ECU type...</option>
                        <optgroup label="⭐ Chinese Truck ECUs">
                          {commonEcuTypes.filter(e => ['Weichai', 'Cummins', 'Yuchai', 'FAW', 'Sinotruk', 'Dongfeng'].includes(e.manufacturer)).map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Bosch">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Bosch').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Siemens">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Siemens').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Continental">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Continental').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Delphi">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Delphi').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Denso">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Denso').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Marelli">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Marelli').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Other">
                          <option value="other">Other (Enter manually)</option>
                        </optgroup>
                      </select>
                      
                      {selectedEcu?.id === 'other' && (
                        <input
                          type="text"
                          value={customEcu}
                          onChange={(e) => setCustomEcu(e.target.value)}
                          placeholder="Enter your ECU type (e.g., Bosch EDC17C49)"
                          className="w-full mt-3 bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        />
                      )}
                    </div>
                  
                  {/* Summary for Manual Entry */}
                  {manualVehicle.make && manualVehicle.model && selectedEcu && (selectedEcu.id !== 'other' || customEcu.trim()) && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mt-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-green-400 text-sm font-medium">Vehicle Ready</p>
                          <p className="text-gray-900 font-semibold">{getVehicleSummary()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Manufacturer */}
              {selectedVehicleType && !isManualVehicle && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Manufacturer</label>
                  {vehicleLoading && manufacturers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">Loading manufacturers...</div>
                  ) : (
                    <select
                      value={selectedManufacturer?.id || ''}
                      onChange={(e) => {
                        const mfr = manufacturers.find(m => String(m.id) === e.target.value);
                        if (mfr) handleManufacturerSelect(mfr);
                      }}
                      className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select manufacturer...</option>
                      {manufacturers.map((mfr) => (
                        <option key={mfr.id} value={mfr.id}>{mfr.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              
              {/* Model */}
              {selectedManufacturer && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Model</label>
                  {vehicleLoading && models.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">Loading models...</div>
                  ) : (
                    <select
                      value={selectedModel?.id || ''}
                      onChange={(e) => {
                        const model = models.find(m => String(m.id) === e.target.value);
                        if (model) handleModelSelect(model);
                      }}
                      className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select model...</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              
              {/* Engine - Shown directly after Model (dpfoffservice structure) */}
              {selectedModel && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Engine</label>
                  {vehicleLoading && engines.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">Loading engines...</div>
                  ) : (
                    <select
                      value={selectedEngine?.id || ''}
                      onChange={(e) => {
                        if (e.target.value === 'other') {
                          handleEngineSelect({ id: 'other', name: 'Other / Not Listed' });
                        } else {
                          const eng = engines.find(en => String(en.id) === e.target.value);
                          if (eng) handleEngineSelect(eng);
                        }
                      }}
                      className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select engine...</option>
                      {engines.map((eng) => {
                        // Simplify engine name display - extract key info
                        const name = eng.name;
                        return (
                          <option key={eng.id} value={eng.id}>{name}</option>
                        );
                      })}
                      <option value="other">➕ Other / Not Listed</option>
                    </select>
                  )}
                </div>
              )}
              
              {/* ECU Type */}
              {selectedEngine && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    ECU Type
                    {ecuLoading && <span className="ml-2 text-xs text-blue-500">Loading recommended ECUs...</span>}
                  </label>
                  <select
                    value={selectedEcu?.id || ''}
                    onChange={(e) => handleEcuSelect(e.target.value)}
                    disabled={ecuLoading}
                    className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Select ECU type...</option>
                    
                    {/* Dynamic ECU Types - From engine document (dpfoffservice structure) */}
                    {dynamicEcuTypes.length > 0 ? (
                      <>
                        {/* Group by manufacturer */}
                        {(() => {
                          const manufacturers = [...new Set(dynamicEcuTypes.filter(e => e.id !== 'other').map(e => e.manufacturer))];
                          return manufacturers.map(mfr => (
                            <optgroup key={mfr} label={`⭐ ${mfr}`}>
                              {dynamicEcuTypes.filter(e => e.manufacturer === mfr).map((ecu) => (
                                <option key={ecu.id} value={ecu.id}>
                                  {ecu.name}
                                </option>
                              ))}
                            </optgroup>
                          ));
                        })()}
                        <optgroup label="Other">
                          <option value="other">Other (Enter manually)</option>
                        </optgroup>
                      </>
                    ) : (
                      /* Fallback to static list if no dynamic ECUs */
                      <>
                        <optgroup label="⭐ Chinese Truck ECUs">
                          {commonEcuTypes.filter(e => ['Weichai', 'Cummins', 'Yuchai', 'FAW', 'Sinotruk', 'Dongfeng'].includes(e.manufacturer)).map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Bosch">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Bosch').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Siemens">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Siemens').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Continental">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Continental').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Delphi">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Delphi').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Denso">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Denso').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Marelli">
                          {commonEcuTypes.filter(e => e.manufacturer === 'Marelli').map((ecu) => (
                            <option key={ecu.id} value={ecu.id}>{ecu.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Other">
                          <option value="other">Other (Enter manually)</option>
                        </optgroup>
                      </>
                    )}
                  </select>
                  
                  {/* Custom ECU Input */}
                  {selectedEcu?.id === 'other' && (
                    <input
                      type="text"
                      value={customEcu}
                      onChange={(e) => setCustomEcu(e.target.value)}
                      placeholder="Enter your ECU type (e.g., Bosch EDC17C49)"
                      className="w-full mt-3 bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </div>
              )}
              
              {/* Selected Vehicle Summary */}
              {selectedEcu && (selectedEcu.id !== 'other' || customEcu.trim()) && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-green-400 text-sm font-medium">Selected Vehicle</p>
                      <p className="text-gray-900 font-semibold">{getVehicleSummary()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Continue Button */}
            {((isManualVehicle && manualVehicle.make && manualVehicle.model && selectedEcu && (selectedEcu.id !== 'other' || customEcu.trim())) ||
              (!isManualVehicle && selectedEcu && (selectedEcu.id !== 'other' || customEcu.trim()))) && (
              <button
                onClick={proceedToUpload}
                className="w-full mt-8 bg-gradient-to-r from-blue-600 to-cyan-500 text-gray-900 py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                Continue to File Upload →
              </button>
            )}
          </div>
        )}
        
        {/* STEP 2: Upload */}
        {step === 2 && (
          <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Upload Your ECU File</h2>
              <p className="text-gray-500">Our engineers will analyze and process your file professionally</p>
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                isDragging ? 'border-blue-500 bg-blue-500/10' : 
                uploadedFile ? 'border-green-500 bg-green-500/10' : 
                'border-gray-300 hover:border-gray-300 hover:bg-gray-100/30'
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
                  <p className="text-xl font-semibold text-gray-900 mb-2">{uploadedFile.name}</p>
                  <p className="text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="text-blue-400 text-sm mt-4">Click to change file</p>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 bg-gray-100/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-gray-900 mb-2">Drag & drop your ECU file here</p>
                  <p className="text-gray-500 mb-4">or click to browse</p>
                  <p className="text-gray-500 text-sm">Supported: .bin, .hex, .ecu, .ori, .mod</p>
                </div>
              )}
            </div>
            
            {uploadedFile && (
              <button
                onClick={() => { setStep(3); startProcessing(); }}
                className="w-full mt-8 bg-gradient-to-r from-blue-600 to-cyan-500 text-gray-900 py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                Analyze File →
              </button>
            )}
            
            {/* Vehicle Info Summary */}
            {selectedEngine && (
              <div className="mt-6 bg-gray-100/30 rounded-xl p-4">
                <p className="text-gray-500 text-sm">Vehicle: <span className="text-gray-900 font-medium">{getVehicleSummary()}</span></p>
              </div>
            )}
          </div>
        )}
        
        {/* STEP 3: Processing */}
        {step === 3 && (
          <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-3xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4">Analyzing Your File</h2>
            <p className="text-gray-500 mb-8">Please wait while we analyze your ECU file...</p>
            
            <div className="max-w-md mx-auto">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              <p className="text-gray-500 mt-4">{Math.round(processingProgress)}% Complete</p>
            </div>
          </div>
        )}
        
        {/* STEP 4: Results & Service Selection */}
        {step === 4 && analysisResult && (
          <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-2">Upload Complete</h2>
              <p className="text-gray-500">Select the services you need</p>
            </div>

            {/* ECU Analysis Results - Compact Format */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
              {/* Header with main info */}
              <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🎯</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {[
                          analysisResult.detected_manufacturer && analysisResult.detected_manufacturer !== 'Unknown' ? analysisResult.detected_manufacturer : null,
                          analysisResult.detected_ecu && analysisResult.detected_ecu !== 'Unknown' ? analysisResult.detected_ecu : null
                        ].filter(Boolean).join(' ') || 'ECU Analysis Complete'}
                      </h3>
                      <p className="text-white/80 text-xs">
                        {analysisResult.original_filename} • {analysisResult.file_size_mb?.toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <span className="text-white bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                    {analysisResult.total_services_detected || 0} services available
                  </span>
                </div>
              </div>
              
              {/* Compact Info Grid */}
              <div className="p-3 grid grid-cols-3 md:grid-cols-6 gap-2 text-xs border-b border-gray-100">
                {analysisResult.metadata?.part_number && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400 block">Part #</span>
                    <span className="text-gray-800 font-mono font-medium">{analysisResult.metadata.part_number}</span>
                  </div>
                )}
                {analysisResult.metadata?.calibration_id && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400 block">Calibration</span>
                    <span className="text-gray-800 font-mono font-medium">{analysisResult.metadata.calibration_id}</span>
                  </div>
                )}
                {analysisResult.metadata?.software_version && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400 block">Software</span>
                    <span className="text-gray-800 font-mono font-medium">{analysisResult.metadata.software_version}</span>
                  </div>
                )}
                {analysisResult.metadata?.hardware_version && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400 block">Hardware</span>
                    <span className="text-gray-800 font-mono font-medium">{analysisResult.metadata.hardware_version}</span>
                  </div>
                )}
                {analysisResult.metadata?.processor && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400 block">Processor</span>
                    <span className="text-gray-800 font-mono font-medium">{analysisResult.metadata.processor}</span>
                  </div>
                )}
                {analysisResult.metadata?.vin && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400 block">VIN</span>
                    <span className="text-gray-800 font-mono font-medium">{analysisResult.metadata.vin}</span>
                  </div>
                )}
              </div>
              
              {/* Detected Systems - Inline */}
              {analysisResult.detected_maps && Object.keys(analysisResult.detected_maps).some(k => analysisResult.detected_maps[k]) && (
                <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">Detected:</span>
                  {analysisResult.detected_maps.dpf && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">DPF</span>
                  )}
                  {analysisResult.detected_maps.egr && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">EGR</span>
                  )}
                  {analysisResult.detected_maps.scr && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">SCR/AdBlue</span>
                  )}
                  {analysisResult.detected_maps.lambda && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Lambda</span>
                  )}
                  {analysisResult.detected_maps.catalyst && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Catalyst</span>
                  )}
                </div>
              )}
            </div>



            <h3 className="text-xl font-semibold mb-2">Select Services</h3>
            <p className="text-gray-500 text-sm mb-4">
              {availableOptions.length > 0 
                ? "Based on our ECU analysis, the following services are detected. You can also add additional services manually."
                : "Select the services you need for your ECU file:"}
            </p>
            
            {/* AdBlue/DCU Notice - Important Information */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-600">⚠️</span>
                </div>
                <div>
                  <h4 className="font-semibold text-amber-800 mb-1">Important: AdBlue/SCR System Notice</h4>
                  <p className="text-amber-700 text-sm">
                    Our analyzer may not always detect AdBlue/SCR systems because they are often controlled by a separate 
                    <strong> Dosing Control Unit (DCU)</strong>, not the main ECU. If you need AdBlue removal, please upload 
                    <strong> both your ECU file AND DCU file</strong> for complete system modification. Contact us if unsure 
                    about your vehicle's configuration.
                  </p>
                </div>
              </div>
            </div>
            
            {/* DTC Removal Recommendation - Shows when DPF, EGR, or AdBlue is selected */}
            {(selectedServices.some(s => ['dpf-removal', 'egr-removal', 'adblue-removal', 'egr-dpf-combo'].includes(s)) && 
              !selectedServices.includes('dtc-multiple') && !selectedServices.includes('dtc-single')) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600">💡</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-800 mb-1">Recommended: Add DTC Removal</h4>
                    <p className="text-blue-700 text-sm mb-3">
                      When removing DPF, EGR, or AdBlue systems, related <strong>Diagnostic Trouble Codes (DTCs)</strong> may 
                      appear. We recommend adding DTC removal to prevent check engine lights and ensure a clean modification.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleServiceToggle('dtc-multiple', 50)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                      >
                        <span>✓</span> Add DTC Removal (+$50)
                      </button>
                      <button
                        type="button"
                        className="bg-white hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 transition"
                        onClick={() => {}}
                      >
                        No Thanks
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Detected Services */}
            {availableOptions.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Detected Services
                </h4>
                <div className="space-y-3">
                  {availableOptions.map((option) => (
                    <div key={option.service_id} className={`rounded-xl overflow-hidden border transition ${
                      selectedServices.includes(option.service_id)
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                      <label className="flex items-center justify-between p-4 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(option.service_id)}
                            onChange={() => handleServiceToggle(option.service_id, option.price)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{option.service_name}</span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                ✓ Detected
                              </span>
                            </div>
                            {option.indicators && option.indicators.length > 0 && (
                              <div className="text-xs text-gray-500 mt-0.5">{option.indicators[0]}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-xl font-bold text-green-600">${option.price.toFixed(2)}</div>
                      </label>
                      
                      {/* DTC Input Fields */}
                      {option.service_id === 'dtc_off' && selectedServices.includes('dtc_off') && (
                        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                          <label className="block text-sm text-gray-500 mb-2">Enter DTC codes to remove (optional):</label>
                          <textarea
                            value={dtcMultipleCodes}
                            onChange={(e) => { setDtcMultipleCodes(e.target.value.toUpperCase()); setDtcError(''); }}
                            placeholder="P0420&#10;P2002&#10;P0401"
                            className="w-full bg-gray-50 text-gray-900 px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none min-h-[60px] text-sm"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Manual Service Selection - Always Available */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {availableOptions.length > 0 ? "Add More Services" : "Available Services"}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {allServices
                  .filter(s => !availableOptions.find(opt => opt.service_id === s.id))
                  .map((service) => {
                    const isSelected = selectedServices.includes(service.id);
                    return (
                      <label 
                        key={service.id} 
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-300' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleServiceToggle(service.id, service.base_price)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-900">{service.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">${service.base_price}</span>
                      </label>
                    );
                  })}
              </div>
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
                  <span className="text-lg text-gray-600">Total:</span>
                  <span className="text-3xl font-bold text-gray-900">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={proceedToPayment}
              disabled={selectedServices.length === 0}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                selectedServices.length > 0
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-gray-900 hover:shadow-lg hover:shadow-blue-500/25'
                  : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to Payment →
            </button>
          </div>
        )}
        
        {/* STEP 5: Customer Info & Payment */}
        {step === 5 && (
          <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Complete Your Order</h2>
              <p className="text-gray-500">Enter your details and complete payment</p>
            </div>

            {/* Order Summary */}
            <div className="bg-white/50 rounded-2xl p-6 mb-8">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                {availableOptions.filter(opt => selectedServices.includes(opt.service_id)).map(opt => (
                  <div key={opt.service_id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{opt.service_name}</span>
                    <span className="text-gray-900">${opt.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-4 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-green-400">${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Vehicle Information (Read-only - from step 1) */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">Vehicle Information</h3>
              <div className="bg-white/50 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">
                      {selectedVehicleType?.slug === 'cars' ? '🚗' : 
                       selectedVehicleType?.slug === 'trucks' ? '🚛' : 
                       selectedVehicleType?.slug === 'agriculture' ? '🚜' : 
                       selectedVehicleType?.slug === 'marine' ? '🚤' : '🏍️'}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Selected Vehicle</p>
                    <p className="text-gray-900 font-medium">{getVehicleSummary()}</p>
                  </div>
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
                  className="w-full bg-white text-gray-900 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none"
                  required
                />
                <input
                  type="email"
                  value={customerInfo.customer_email}
                  onChange={(e) => setCustomerInfo({...customerInfo, customer_email: e.target.value})}
                  placeholder="Email Address * (for download link)"
                  className="w-full bg-white text-gray-900 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none"
                  required
                />
                <input
                  type="tel"
                  value={customerInfo.customer_phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, customer_phone: e.target.value})}
                  placeholder="Phone (optional)"
                  className="w-full bg-white text-gray-900 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* PayPal */}
            <div className="bg-white/50 rounded-2xl p-6">
              <h3 className="font-semibold mb-4 text-center">Secure Payment</h3>
              <PayPalScriptProvider 
                options={{ 
                  "client-id": PAYPAL_CLIENT_ID, 
                  currency: "USD",
                  intent: "capture",
                  components: "buttons",
                  "enable-funding": "paypal",
                  "disable-funding": "credit,card"
                }}
                onError={(err) => console.error("PayPal Script Error:", err)}
              >
                <PayPalButtons 
                  style={{ layout: "vertical", color: "blue", shape: "rect", label: "paypal", height: 45 }}
                  fundingSource="paypal"
                  createOrder={createOrder}
                  onApprove={onApprove}
                  onError={(err) => {
                    console.error("PayPal Button Error:", err);
                    let errorMsg = "Payment error occurred";
                    if (err) {
                      if (typeof err === 'string') {
                        errorMsg = err;
                      } else if (err.message) {
                        errorMsg = err.message;
                      } else if (Array.isArray(err)) {
                        errorMsg = err.map(e => e.message || e.description || 'Unknown error').join(', ');
                      } else if (err.description) {
                        errorMsg = err.description;
                      }
                    }
                    alert("PayPal Error: " + errorMsg);
                  }}
                  onCancel={() => {
                    console.log("Payment cancelled");
                    alert("Payment was cancelled");
                  }}
                  onInit={(data, actions) => {
                    console.log("PayPal Button Initialized", data);
                  }}
                />
              </PayPalScriptProvider>
              <p className="text-xs text-gray-500 text-center mt-3">
                {USE_SANDBOX ? "🧪 Sandbox Mode - Test payments only" : "🔒 Secure live payments via PayPal"}
              </p>
              
              {/* Test Mode: Skip Payment Button */}
              {USE_SANDBOX && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={async () => {
                      try {
                        // Create a test order without actual payment
                        const orderData = {
                          file_id: fileId,
                          services: selectedServices.map(s => s.id),
                          total_amount: totalPrice,
                          vehicle_info: getVehicleSummary(),
                          customer_email: customerInfo.customer_email || 'test@example.com',
                          customer_name: customerInfo.customer_name || 'Test Customer',
                          payment_status: 'test_completed',
                          paypal_order_id: 'TEST_' + Date.now(),
                          paypal_transaction_id: 'TEST_TXN_' + Date.now(),
                        };
                        
                        const response = await axios.post(`${API}/orders`, orderData);
                        
                        if (response.data.success) {
                          setOrderId(response.data.order_id);
                          setStep(6); // Go to success page
                        } else {
                          alert('Failed to create test order');
                        }
                      } catch (error) {
                        console.error('Test order error:', error);
                        alert('Error: ' + (error.response?.data?.detail || error.message));
                      }
                    }}
                    className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
                  >
                    🧪 Skip Payment (Test Mode)
                  </button>
                  <p className="text-xs text-yellow-600 text-center mt-2">
                    For testing only - bypasses PayPal payment
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full mt-4 py-3 rounded-xl text-gray-500 hover:text-blue-600 transition"
            >
              ← Back to Service Selection
            </button>
          </div>
        )}
        
        {/* STEP 6: Success */}
        {step === 6 && (
          <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-3xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h2>
            <p className="text-gray-500 mb-8">Your file has been submitted for processing</p>
            
            {/* Processing Status */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                <span className="text-lg text-amber-700 font-semibold">Processing Your File...</span>
              </div>
              <p className="text-amber-600">
                Our engineers are working on your file. You&apos;ll receive an email within <strong>20-60 minutes</strong> with your download link.
              </p>
            </div>

            {/* Order Details */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID:</span>
                  <span className="text-gray-900 font-mono">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle:</span>
                  <span className="text-gray-900">{getVehicleSummary()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="text-gray-900">{customerInfo.customer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Paid:</span>
                  <span className="text-green-600 font-semibold">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Portal Access Options */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-center">
                <span className="text-2xl mr-2">🔐</span>
                Access Your Customer Portal
              </h3>
              <p className="text-gray-600 mb-6">
                Track your order status, download files, and manage your requests. Choose how you&apos;d like to access:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Option 1: Quick Access via Email */}
                <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-400 transition">
                  <div className="text-3xl mb-3">📧</div>
                  <h4 className="font-semibold text-gray-900 mb-2">Quick Access</h4>
                  <p className="text-gray-500 text-sm mb-4">
                    Access portal instantly using your order email. No registration required.
                  </p>
                  <a
                    href={`/portal?email=${encodeURIComponent(customerInfo.customer_email)}`}
                    className="block w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold transition text-center"
                  >
                    Access with Email →
                  </a>
                </div>
                
                {/* Option 2: Create Account */}
                <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-green-400 transition">
                  <div className="text-3xl mb-3">👤</div>
                  <h4 className="font-semibold text-gray-900 mb-2">Create Account</h4>
                  <p className="text-gray-500 text-sm mb-4">
                    Register for a full account with password. Manage all your orders easily.
                  </p>
                  <a
                    href={`/portal?register=true&email=${encodeURIComponent(customerInfo.customer_email)}&name=${encodeURIComponent(customerInfo.customer_name)}`}
                    className="block w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition text-center"
                  >
                    Create Account →
                  </a>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-gray-100 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">What Happens Next?</h3>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-xs font-bold">1</span>
                  Our engineers analyze and process your file
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-xs font-bold">2</span>
                  You&apos;ll receive an email at <strong className="text-gray-900">{customerInfo.customer_email}</strong>
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-xs font-bold">3</span>
                  Click the download link or access portal to get your modified file
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-xs font-bold">4</span>
                  Flash the file to your vehicle ECU
                </li>
              </ol>
            </div>

            {/* Free DTC Support Notice */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8">
              <p className="text-green-700 text-sm">
                <strong>🆓 Free DTC Support:</strong> If any DTCs appear after our modification, we&apos;ll fix them FREE for 1 month (same file only).
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold transition"
            >
              Process Another File
            </button>
          </div>
        )}
      </div>

      {/* Footer for inner pages */}
      {step > 0 && (
        <footer className="bg-white/50 border-t border-gray-100 py-6 mt-16">
          <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
            <p>© 2024 ECU Flash Service | Professional ECU Tuning</p>
            <p className="mt-1">⚠️ For off-road and competition use only</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default NewUploadFlow;
