import { useState, useEffect } from 'react';
import axios from 'axios';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

// PayPal Configuration - LIVE MODE (payments@ecuflashservice.com)
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID;

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
  
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Reviews expand state
  const [showAllReviews, setShowAllReviews] = useState(false);
  
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
  const [showDtcSelector, setShowDtcSelector] = useState(false);
  const [selectedFileDtcs, setSelectedFileDtcs] = useState([]);
  
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
    console.log("PayPal onApprove called, orderID:", data.orderID);
    
    let order;
    try {
      console.log("Attempting to capture payment...");
      order = await actions.order.capture();
      console.log("Payment captured successfully:", order);
    } catch (captureError) {
      console.error('PayPal capture error:', captureError);
      alert(`Payment failed: ${captureError.message || 'Please try again or use a different payment method.'}`);
      return;
    }
    
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
      
      console.log("Creating order in backend...");
      const purchaseData = new FormData();
      purchaseData.append('file_id', fileId);
      purchaseData.append('selected_services', JSON.stringify(selectedServices));
      purchaseData.append('customer_name', customerInfo.customer_name);
      purchaseData.append('customer_email', customerInfo.customer_email);
      purchaseData.append('customer_phone', customerInfo.customer_phone);
      purchaseData.append('vehicle_info', JSON.stringify(vehicleInfo));
      purchaseData.append('dtc_codes', JSON.stringify(dtcCodesData));
      purchaseData.append('additional_dtc_codes', additionalDtcCodes);
      purchaseData.append('paypal_order_id', order.id);
      purchaseData.append('paypal_transaction_id', order.purchase_units[0].payments.captures[0].id);
      
      const response = await axios.post(`${API}/purchase-processed-file`, purchaseData);
      console.log("Order response:", response.data);
      
      if (response.data.success) {
        setOrderId(response.data.order_id);
        setDownloadLinks(response.data.download_links || []);
        setStep(6);
      } else {
        alert("There was an issue with your order. Please contact support.");
      }
    } catch (error) {
      console.error('Error:', error);
      console.error('Error response:', error.response);
      alert('Error processing order: ' + (error.response?.data?.detail || error.message) + '\n\nYour payment was successful. Please contact support with PayPal Order ID: ' + order.id);
    }
  };

  // ============== LANDING PAGE (Step 0) ==============
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">ECU Flash Service</h1>
                  <p className="text-xs text-gray-500">Professional ECU Tuning</p>
                </div>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                <a href="#services" className="text-gray-600 hover:text-blue-600 transition">Services</a>
                <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition">How It Works</a>
                <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition">Pricing</a>
                <a href="/tools/dtc-delete" className="text-gray-600 hover:text-blue-600 transition">DTC Tool</a>
                <a href="/blog" className="text-gray-600 hover:text-blue-600 transition">Blog</a>
                <a href="/portal" className="text-gray-600 hover:text-blue-600 transition">Customer Portal</a>
                <button 
                  onClick={() => setStep(1)}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Get Started
                </button>
              </nav>
              
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
            
            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
              <nav className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
                <div className="flex flex-col space-y-3">
                  <a href="#services" className="text-gray-600 hover:text-blue-600 transition py-2">Services</a>
                  <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition py-2">How It Works</a>
                  <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition py-2">Pricing</a>
                  <a href="/tools/dtc-delete" className="text-blue-600 font-semibold hover:text-blue-700 transition py-2 flex items-center">
                    <span className="mr-2">🔍</span> DTC Delete Tool
                  </a>
                  <a href="/blog" className="text-gray-600 hover:text-blue-600 transition py-2">Blog</a>
                  <a href="/portal" className="text-gray-600 hover:text-blue-600 transition py-2">Customer Portal</a>
                  <a href="/contact" className="text-gray-600 hover:text-blue-600 transition py-2">Contact</a>
                  <button 
                    onClick={() => { setStep(1); setMobileMenuOpen(false); }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-center mt-2"
                  >
                    Get Started
                  </button>
                </div>
              </nav>
            )}
          </div>
        </header>

        {/* Hero Section - Blue Gradient (Compact) */}
        <section className="pt-20 bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
          <div className="container mx-auto px-6 py-10 md:py-14">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center bg-white/20 border border-white/30 rounded-full px-3 py-1.5 mb-4">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                <span className="text-white text-sm font-medium">Professional Engineers • 20-60 Min Delivery</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                Professional ECU Tuning Service
              </h1>
              
              <p className="text-lg text-white/90 max-w-xl mx-auto mb-6">
                Upload your ECU file, choose services, and receive your modified file within 20-60 minutes.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <button 
                  onClick={() => setStep(1)}
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Get Started →
                </button>
                <a 
                  href="#services"
                  className="border border-white/50 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-all"
                >
                  View Services
                </a>
              </div>

              {/* Trust Badges - Compact */}
              <div className="flex flex-wrap justify-center gap-4 text-sm text-white/80">
                <span>✓ Secure Payment</span>
                <span>✓ Fast Delivery</span>
                <span>✓ All Brands</span>
                <span>✓ 24/7 Support</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section - White Background */}
        <section className="bg-white py-12 px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: '10K+', label: 'Files Processed' },
                { value: '99%', label: 'Success Rate' },
                { value: '24/7', label: 'Support' },
                { value: '50+', label: 'Countries Served' },
              ].map((stat, i) => (
                <div key={i} className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-gray-200 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{stat.value}</div>
                  <div className="text-gray-600 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Customer Reviews Section - Simplified */}
        <section className="py-16 px-6 bg-white">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <span className="text-yellow-500">★★★★★</span> 4.9/5 from 3,500+ reviews
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Trusted Worldwide</h2>
            </div>
            
            {/* First 4 Reviews - Always Visible */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Review 1 */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-1 mb-2 text-yellow-400 text-sm">★★★★★</div>
                <p className="text-gray-700 text-sm mb-3">"DPF delete on my Innova Crysta was done in under 2 hours. Vehicle performance improved significantly. Very professional team!"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">R</div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">Rajesh Kumar</div>
                    <div className="text-gray-500 text-xs">Toyota Innova • 🇮🇳 India</div>
                  </div>
                </div>
              </div>
              
              {/* Review 2 */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-1 mb-2 text-yellow-400 text-sm">★★★★★</div>
                <p className="text-gray-700 text-sm mb-3">"As a workshop owner, I've done 30+ vehicles through ECU Flash. Consistent quality, fast delivery, fair prices. My go-to for all ECU work!"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold text-sm">T</div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">Thabo Molefe</div>
                    <div className="text-gray-500 text-xs">Auto Workshop • 🇿🇦 South Africa</div>
                  </div>
                </div>
              </div>
              
              {/* Review 3 */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-1 mb-2 text-yellow-400 text-sm">★★★★★</div>
                <p className="text-gray-700 text-sm mb-3">"EGR + DPF combo on my Hilux. File came back in 40 minutes. My mechanic was impressed with the quality. These guys delivered!"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">C</div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">Chukwuemeka Obi</div>
                    <div className="text-gray-500 text-xs">Toyota Hilux • 🇳🇬 Nigeria</div>
                  </div>
                </div>
              </div>
              
              {/* Review 4 */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-1 mb-2 text-yellow-400 text-sm">★★★★★</div>
                <p className="text-gray-700 text-sm mb-3">"AdBlue delete on my Audi saved me €600 in repairs. Fast turnaround and great communication. Muy recomendado!"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">C</div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">Carlos García</div>
                    <div className="text-gray-500 text-xs">Audi A6 3.0 TDI • 🇪🇸 Spain</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Reviews - Expandable */}
            {showAllReviews && (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {/* Review 5 */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center gap-1 mb-2 text-yellow-400 text-sm">★★★★★</div>
                  <p className="text-gray-700 text-sm mb-3">"DPF delete on my 79 Series LandCruiser. Perfect for outback driving now. No more forced regens in the middle of nowhere!"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold text-sm">M</div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Mitchell O'Brien</div>
                      <div className="text-gray-500 text-xs">LC79 Series • 🇦🇺 Australia</div>
                    </div>
                  </div>
                </div>
                
                {/* Review 6 */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center gap-1 mb-2 text-yellow-400 text-sm">★★★★★</div>
                  <p className="text-gray-700 text-sm mb-3">"DTC removal service is excellent. Had P2002 and P2459 codes cleared permanently from my Land Cruiser. Worth every dirham!"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">A</div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Ahmed Al-Rashid</div>
                      <div className="text-gray-500 text-xs">Land Cruiser • 🇦🇪 UAE</div>
                    </div>
                  </div>
                </div>
                
                {/* Review 7 */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center gap-1 mb-2 text-yellow-400 text-sm">★★★★★</div>
                  <p className="text-gray-700 text-sm mb-3">"Outstanding service for fleet vehicles! We've processed 15 trucks through ECU Flash. DPF issues sorted, fuel efficiency improved."</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">W</div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Wanjiku Mwangi</div>
                      <div className="text-gray-500 text-xs">Fleet Manager • 🇰🇪 Kenya</div>
                    </div>
                  </div>
                </div>
                
                {/* Review 8 */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center gap-1 mb-2 text-yellow-400 text-sm">★★★★★</div>
                  <p className="text-gray-700 text-sm mb-3">"AdBlue system was giving me grief on my Discovery. Both ECU and DCU files were handled perfectly. Saved me a fortune at the dealer!"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">J</div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">James Wilson</div>
                      <div className="text-gray-500 text-xs">Land Rover Discovery • 🇬🇧 UK</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* View More Button */}
            <div className="text-center mt-6">
              <button 
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-1"
              >
                {showAllReviews ? 'Show Less' : 'View More Reviews'} 
                <svg className={`w-4 h-4 transition-transform ${showAllReviews ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Services Section - Organized by Category */}
        <section id="services" className="py-16 px-6 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Our Services</h2>
              <p className="text-gray-500">Professional ECU modifications by certified engineers</p>
            </div>
            
            {/* Service Categories */}
            <div className="space-y-6">
              {/* Emission Delete Services */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 text-xl">🚫</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Emission System Delete</h3>
                    <p className="text-gray-500 text-sm">Remove problematic emission controls</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {allServices.filter(s => ['EGR Removal', 'DPF Removal', 'AdBlue/DEF Removal', 'Decat (Cat OFF)'].includes(s.name)).map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="font-semibold text-gray-900 text-sm">{s.name.replace(' Removal', ' Off').replace('AdBlue/DEF Removal', 'AdBlue Off').replace('Decat (Cat OFF)', 'Catalyst Off')}</div>
                      <div className="text-blue-600 font-bold">${s.base_price?.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* DTC Removal Services */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-xl">🔍</div>
                  <div>
                    <h3 className="font-bold text-gray-900">DTC Code Removal</h3>
                    <p className="text-gray-500 text-sm">Clear diagnostic trouble codes permanently</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {allServices.filter(s => s.name.includes('DTC Removal')).map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="font-semibold text-gray-900 text-sm">{s.name.replace('DTC Removal ', '')}</div>
                      <div className="text-blue-600 font-bold">${s.base_price?.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Other Services */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 text-xl">⚡</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Additional Services</h3>
                    <p className="text-gray-500 text-sm">Other ECU modifications</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {allServices.filter(s => ['Speed Limiter OFF', 'Start & Stop OFF', 'Immobilizer Off', 'Checksum Correction'].includes(s.name)).map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="font-semibold text-gray-900 text-sm">{s.name}</div>
                      <div className="text-blue-600 font-bold">${s.base_price?.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* View All Services Link */}
            <div className="text-center mt-6">
              <a href="#pricing" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                View Complete Price List →
              </a>
            </div>
          </div>
        </section>

        {/* How It Works - Compact */}
        <section id="how-it-works" className="py-16 px-6 bg-white">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">How It Works</h2>
              <p className="text-gray-500">Get your modified ECU file in 6 simple steps</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { step: '1', title: 'Select Vehicle', icon: '🚗' },
                { step: '2', title: 'Choose ECU', icon: '🔧' },
                { step: '3', title: 'Upload File', icon: '📤' },
                { step: '4', title: 'Auto Analysis', icon: '🔍' },
                { step: '5', title: 'Select Services', icon: '✅' },
                { step: '6', title: 'Pay & Receive', icon: '💳' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 mb-2">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-xs font-bold text-blue-600">Step {item.step}</div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{item.title}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Why Choose Us - Compact */}
        <section className="py-12 px-6 bg-gradient-to-r from-blue-600 to-cyan-500">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white text-center">
              <div>
                <div className="text-2xl mb-1">🚛</div>
                <div className="font-semibold text-sm">Chinese Trucks</div>
                <div className="text-white/70 text-xs">Full Support</div>
              </div>
              <div>
                <div className="text-2xl mb-1">🎯</div>
                <div className="font-semibold text-sm">100% Accurate</div>
                <div className="text-white/70 text-xs">Toyota Files</div>
              </div>
              <div>
                <div className="text-2xl mb-1">🔌</div>
                <div className="font-semibold text-sm">Install Guide</div>
                <div className="text-white/70 text-xs">Included Free</div>
              </div>
              <div>
                <div className="text-2xl mb-1">🆓</div>
                <div className="font-semibold text-sm">Free DTC</div>
                <div className="text-white/70 text-xs">30 Days Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section - 3 Packages */}
        <section id="pricing" className="py-16 px-6 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Transparent Pricing</h2>
              <p className="text-gray-500">No hidden fees. Pay only for what you need.</p>
            </div>
            
            {/* Pricing Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">All Services</h3>
                  <span className="text-white/80 text-sm">Prices in USD</span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allServices.map((service, i) => (
                    <div key={i} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{service.icon}</span>
                        <span className="text-gray-700 text-sm">{service.name}</span>
                      </div>
                      <span className="text-blue-600 font-bold">${service.base_price?.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <p className="text-gray-500 text-xs text-center">
                  Combo discounts available • Select multiple services during checkout for best value
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Blue Gradient */}
        <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-12">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Ready to Get Started?</h2>
            <p className="text-white/90 text-lg mb-8 max-w-xl mx-auto">
              Upload your ECU file now and receive your professionally modified file within 20-60 minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => setStep(1)}
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all"
              >
                Upload ECU File →
              </button>
              <a 
                href="/contact"
                className="bg-white/20 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/30 transition border border-white/30"
              >
                Contact Us
              </a>
            </div>
          </div>
        </section>

        {/* Footer - Dark Background */}
        <footer className="bg-gray-900 text-white py-12 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold">ECU Flash Service</span>
                </div>
                <p className="text-gray-400 text-sm">Professional ECU tuning and modification services. Fast turnaround, all brands supported.</p>
              </div>
              <div>
                <h4 className="font-bold mb-4">Services</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="/services/dtc-removal" className="hover:text-white transition">DTC Removal</a></li>
                  <li><a href="/services/dpf-off" className="hover:text-white transition">DPF Delete</a></li>
                  <li><a href="/services/egr-off" className="hover:text-white transition">EGR Delete</a></li>
                  <li><a href="/services/adblue-off" className="hover:text-white transition">AdBlue Delete</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Resources</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="/blog" className="hover:text-white transition">Blog</a></li>
                  <li><a href="/faq" className="hover:text-white transition">FAQ</a></li>
                  <li><a href="/contact" className="hover:text-white transition">Contact</a></li>
                  <li><a href="/portal" className="hover:text-white transition">Customer Portal</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Legal</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="/terms" className="hover:text-white transition">Terms of Service</a></li>
                  <li><a href="/privacy" className="hover:text-white transition">Privacy Policy</a></li>
                  <li><a href="/refund" className="hover:text-white transition">Refund Policy</a></li>
                  <li className="pt-2 text-yellow-500 text-xs">⚠️ For off-road use only</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
              © {new Date().getFullYear()} ECU Flash Service | Sole Trader. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Blue Gradient - Compact */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-500">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setStep(0)} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ECU Flash Service</h1>
                <p className="text-xs text-white/70">Professional ECU Tuning</p>
              </div>
            </button>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center space-x-2">
              {['Vehicle', 'Upload', 'Analyze', 'Services', 'Pay', 'Done'].map((label, i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step > i ? 'bg-white text-blue-600' : 
                    step === i + 1 ? 'bg-white/30 text-white border-2 border-white' : 
                    'bg-white/10 text-white/60'
                  }`}>
                    {step > i ? '✓' : i + 1}
                  </div>
                  {i < 5 && <div className={`w-6 h-0.5 ${step > i ? 'bg-white' : 'bg-white/30'}`}></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Blue Hero Section for Steps */}
        <div className="container mx-auto px-6 pb-8 pt-4">
          <div className="text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              {step === 1 && 'Select Your Vehicle'}
              {step === 2 && 'Upload ECU File'}
              {step === 3 && 'Processing Your File'}
              {step === 4 && 'Choose Services'}
              {step === 5 && 'Complete Payment'}
              {step === 6 && 'Order Complete'}
            </h2>
            <p className="text-white/80">
              {step === 1 && 'Choose your vehicle to see available tuning services'}
              {step === 2 && 'Upload your original ECU file for analysis'}
              {step === 3 && 'Analyzing your file...'}
              {step === 4 && 'Select the modifications you need'}
              {step === 5 && 'Secure payment via PayPal'}
              {step === 6 && 'Your modified file is ready'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-6 max-w-4xl">
        
        {/* STEP 1: Vehicle Selection */}
        {step === 1 && (
          <div>
            {/* Vehicle Type */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Vehicle Type</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                {vehicleTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleVehicleTypeSelect(type)}
                    className={`p-4 rounded-xl border-2 text-center transition-colors ${
                      selectedVehicleType?.id === type.id 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:border-blue-300 bg-white text-gray-600'
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
                    <div className="text-xs font-medium">{type.name}</div>
                  </button>
                ))}
                {/* Other Option */}
                <button
                  onClick={() => handleVehicleTypeSelect({ id: 'other', name: 'Other', slug: 'other' })}
                  className={`p-4 rounded-xl border-2 text-center transition-colors ${
                    isManualVehicle 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-blue-300 bg-white text-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">❓</div>
                  <div className="text-xs font-medium">Other</div>
                </button>
              </div>
            </div>
            
            {/* Vehicle Selection Chain */}
            <div className="space-y-4">
              {isManualVehicle && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-blue-700 font-semibold flex items-center text-sm">
                    <span className="mr-2">✏️</span> Enter Vehicle Details Manually
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Make / Brand *</label>
                      <input
                        type="text"
                        value={manualVehicle.make}
                        onChange={(e) => setManualVehicle({...manualVehicle, make: e.target.value})}
                        placeholder="e.g., Shacman, Sinotruk, FAW..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                      <input
                        type="text"
                        value={manualVehicle.model}
                        onChange={(e) => setManualVehicle({...manualVehicle, model: e.target.value})}
                        placeholder="e.g., X3000, HOWO A7..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <input
                        type="text"
                        value={manualVehicle.year}
                        onChange={(e) => setManualVehicle({...manualVehicle, year: e.target.value})}
                        placeholder="e.g., 2020"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Engine</label>
                      <input
                        type="text"
                        value={manualVehicle.engine}
                        onChange={(e) => setManualVehicle({...manualVehicle, engine: e.target.value})}
                        placeholder="e.g., Weichai WP10 375hp"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* ECU Type for Manual Entry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ECU Type *</label>
                      <select
                        value={selectedEcu?.id || ''}
                        onChange={(e) => handleEcuSelect(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                          className="w-full mt-3 border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  
                  {/* Summary for Manual Entry */}
                  {manualVehicle.make && manualVehicle.model && selectedEcu && (selectedEcu.id !== 'other' || customEcu.trim()) && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-green-600 text-sm font-medium">Vehicle Ready</p>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Manufacturer</label>
                  {vehicleLoading && manufacturers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">Loading manufacturers...</div>
                  ) : (
                    <select
                      value={selectedManufacturer?.id || ''}
                      onChange={(e) => {
                        const mfr = manufacturers.find(m => String(m.id) === e.target.value);
                        if (mfr) handleManufacturerSelect(mfr);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                  {vehicleLoading && models.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">Loading models...</div>
                  ) : (
                    <select
                      value={selectedModel?.id || ''}
                      onChange={(e) => {
                        const model = models.find(m => String(m.id) === e.target.value);
                        if (model) handleModelSelect(model);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select model...</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              
              {/* Engine */}
              {selectedModel && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Engine</label>
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select engine...</option>
                      {engines.map((eng) => {
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ECU Type
                    {ecuLoading && <span className="ml-2 text-xs text-blue-500">Loading...</span>}
                  </label>
                  <select
                    value={selectedEcu?.id || ''}
                    onChange={(e) => handleEcuSelect(e.target.value)}
                    disabled={ecuLoading}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Select ECU type...</option>
                    
                    {/* Dynamic ECU Types */}
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
                      className="w-full mt-3 border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </div>
              )}
              
              {/* Selected Vehicle Summary */}
              {selectedEcu && (selectedEcu.id !== 'other' || customEcu.trim()) && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-green-600 text-sm font-medium">Selected Vehicle</p>
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
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Continue to File Upload →
              </button>
            )}
          </div>
        )}
        
        {/* STEP 2: Upload */}
        {step === 2 && (
          <div>
            <div 
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
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
            
            {/* FREE DTC Removal Input - Shows when DPF, EGR, or AdBlue is selected */}
            {selectedServices.some(s => ['dpf-removal', 'egr-removal', 'adblue-removal', 'egr-dpf-combo'].includes(s)) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-800 mb-1">FREE DTC Removal Included</h4>
                    <p className="text-green-700 text-sm mb-3">
                      When processing DPF, EGR, or AdBlue removal, <strong>all related DTCs are automatically removed</strong> at no extra cost.
                    </p>
                    
                    {/* DTC Count & View/Select Button */}
                    {analysisResult?.detected_dtcs?.length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-green-200 mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-green-600">{analysisResult.detected_dtcs.length}</span>
                            <span className="text-sm text-gray-600">DTCs found in your file</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDtcSelector(!showDtcSelector)}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                          >
                            <span>{showDtcSelector ? 'Hide' : 'View & Select'}</span>
                            <svg className={`w-4 h-4 transition-transform ${showDtcSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* DTC Selection Grid */}
                        {showDtcSelector && (
                          <div className="mt-4 border-t border-green-200 pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">Select DTCs to remove:</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFileDtcs(analysisResult.detected_dtcs.map(d => d.code));
                                    setAdditionalDtcCodes(analysisResult.detected_dtcs.map(d => d.code).join(', '));
                                  }}
                                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                                >
                                  Select All
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFileDtcs([]);
                                    setAdditionalDtcCodes('');
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                                >
                                  Clear All
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                              {analysisResult.detected_dtcs.map((dtc) => (
                                <label
                                  key={dtc.code}
                                  className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                                    selectedFileDtcs.includes(dtc.code)
                                      ? 'bg-green-100 border-green-400'
                                      : 'bg-gray-50 border-gray-200 hover:border-green-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedFileDtcs.includes(dtc.code)}
                                    onChange={(e) => {
                                      let newSelected;
                                      if (e.target.checked) {
                                        newSelected = [...selectedFileDtcs, dtc.code];
                                      } else {
                                        newSelected = selectedFileDtcs.filter(c => c !== dtc.code);
                                      }
                                      setSelectedFileDtcs(newSelected);
                                      setAdditionalDtcCodes(newSelected.join(', '));
                                    }}
                                    className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-mono font-semibold text-sm text-gray-800">{dtc.code}</span>
                                    <p className="text-xs text-gray-500 truncate" title={dtc.description}>{dtc.description}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                            {selectedFileDtcs.length > 0 && (
                              <div className="mt-3 p-2 bg-green-100 rounded-lg">
                                <span className="text-sm text-green-700">
                                  <strong>{selectedFileDtcs.length}</strong> DTC(s) selected for removal
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Manual DTC Input */}
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {analysisResult?.detected_dtcs?.length > 0 ? 'Or enter additional DTCs manually:' : 'Enter DTCs to remove (Optional - FREE)'}
                      </label>
                      <textarea
                        value={additionalDtcCodes}
                        onChange={(e) => setAdditionalDtcCodes(e.target.value.toUpperCase())}
                        placeholder="Enter DTC codes separated by commas (e.g., P0420, P0401, P2002)"
                        rows={2}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        💡 <strong>Tip:</strong> If new DTCs appear after flashing, contact us and we'll remove them for FREE.
                      </p>
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

            {/* PayPal Payment Section */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-center">
                <span className="mr-2">💳</span> Payment
              </h3>
              
              <PayPalScriptProvider 
                options={{ 
                  "client-id": PAYPAL_CLIENT_ID, 
                  currency: "USD",
                  intent: "capture",
                  "disable-funding": "paylater"
                }}
                onError={(err) => console.error("PayPal Script Error:", err)}
              >
                <PayPalButtons 
                  style={{ 
                    layout: "vertical",
                    color: "blue",
                    shape: "rect",
                    label: "pay"
                  }}
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
              
              <p className="text-xs text-gray-500 text-center mt-4">
                Secure payment processed by PayPal
              </p>
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

      {/* Footer for inner pages - Dark Background */}
      {step > 0 && (
        <footer className="bg-gray-900 text-white py-12 mt-16">
          <div className="container mx-auto px-6 text-center">
            <p className="text-gray-400">© {new Date().getFullYear()} ECU Flash Service | Sole Trader | Professional ECU Tuning</p>
            <div className="mt-4 space-x-6">
              <a href="/terms" className="text-gray-400 hover:text-white transition">Terms</a>
              <a href="/privacy" className="text-gray-400 hover:text-white transition">Privacy</a>
              <a href="/refund" className="text-gray-400 hover:text-white transition">Refund Policy</a>
              <a href="/faq" className="text-gray-400 hover:text-white transition">FAQ</a>
              <a href="/contact" className="text-gray-400 hover:text-white transition">Contact</a>
            </div>
            <p className="mt-4 text-yellow-500 text-xs">⚠️ For off-road and competition use only</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default NewUploadFlow;
