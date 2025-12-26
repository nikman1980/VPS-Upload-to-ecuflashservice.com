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

  // Fetch vehicle types on load
  const fetchVehicleTypes = async () => {
    try {
      const response = await axios.get(`${API}/vehicles/types`);
      setVehicleTypes(response.data || []);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  // Fetch services
  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setAllServices(response.data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  useEffect(() => {
    fetchVehicleTypes();
    fetchServices();
     
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

  // Handle engine selection - fetch recommended ECU types
  const handleEngineSelect = async (engine) => {
    setSelectedEngine(engine);
    setSelectedEcu(null);
    setCustomEcu('');
    setDynamicEcuTypes([]);
    
    if (engine && engine.id !== 'other') {
      setEcuLoading(true);
      try {
        const response = await axios.get(`${API}/vehicles/ecu-types/${engine.id}`);
        if (response.data && response.data.ecu_types) {
          setDynamicEcuTypes(response.data.ecu_types);
        }
      } catch (error) {
        console.error('Error fetching ECU types:', error);
        // Fallback to empty - will use commonEcuTypes
        setDynamicEcuTypes([]);
      }
      setEcuLoading(false);
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
    if (!selectedManufacturer || !selectedModel || !selectedGeneration || !selectedEngine) {
      return 'No vehicle selected';
    }
    const ecuInfo = selectedEcu ? (selectedEcu.id === 'other' ? customEcu : selectedEcu.name) : '';
    return `${selectedManufacturer.name} ${selectedModel.name} ${selectedGeneration.name} - ${selectedEngine.name}${ecuInfo ? ` (${ecuInfo})` : ''}`;
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
                Get your modified ECU file in 4 simple steps
              </p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Select Vehicle', desc: 'Choose your vehicle make, model, generation, and engine from our database.' },
                { step: '02', title: 'Upload ECU File', desc: 'Upload your original ECU file (.bin, .hex, .ori). We support all major brands.' },
                { step: '03', title: 'Choose Services', desc: 'Select the modifications you need: DPF OFF, EGR OFF, DTC removal, and more.' },
                { step: '04', title: 'Pay & Download', desc: 'Pay securely via PayPal. Receive your modified file within 20-60 minutes.' },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200/50 rounded-2xl p-6">
                    <div className="text-5xl font-bold text-gray-300 mb-3">{item.step}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-gray-200 text-xl">→</div>
                  )}
                </div>
              ))}
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
                <ul className="space-y-2 text-gray-500 text-sm">
                  <li>DTC Removal</li>
                  <li>DPF OFF</li>
                  <li>EGR OFF</li>
                  <li>AdBlue OFF</li>
                </ul>
              </div>
              <div>
                <h4 className="text-gray-900 font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-gray-500 text-sm">
                  <li>Contact Us</li>
                  <li>FAQ</li>
                  <li>Terms of Service</li>
                  <li>Privacy Policy</li>
                </ul>
              </div>
              <div>
                <h4 className="text-gray-900 font-semibold mb-4">Contact</h4>
                <ul className="space-y-2 text-gray-500 text-sm">
                  <li>admin@ecuflashservice.com</li>
                  <li>24/7 Email Support</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-sm">© 2024 ECU Flash Service. All rights reserved.</p>
              <p className="text-gray-500 text-sm mt-2 md:mt-0">⚠️ For off-road and competition use only</p>
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
            </div>
            
            {/* Vehicle Selection Chain */}
            <div className="space-y-6">
              
              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Vehicle Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
                        {type.slug === 'cars' ? '🚗' : 
                         type.slug === 'trucks' ? '🚛' : 
                         type.slug === 'agriculture' ? '🚜' : 
                         type.slug === 'marine' ? '🚤' : '🏍️'}
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
                  <h3 className="text-orange-400 font-semibold flex items-center">
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
                  
                  {/* ECU Type for Manual Entry */}
                  {manualVehicle.make && manualVehicle.model && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">ECU Type</label>
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
                  )}
                  
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
                        const mfr = manufacturers.find(m => m.id === parseInt(e.target.value));
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
                        const model = models.find(m => m.id === parseInt(e.target.value));
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
              
              {/* Generation */}
              {selectedModel && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Generation</label>
                  {vehicleLoading && generations.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">Loading generations...</div>
                  ) : (
                    <select
                      value={selectedGeneration?.id || ''}
                      onChange={(e) => {
                        const gen = generations.find(g => g.id === parseInt(e.target.value));
                        if (gen) handleGenerationSelect(gen);
                      }}
                      className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select generation...</option>
                      {generations.map((gen) => (
                        <option key={gen.id} value={gen.id}>
                          {gen.name} {gen.year ? `(${gen.year}${gen.yearend ? `-${gen.yearend}` : '+'})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              
              {/* Engine */}
              {selectedGeneration && (
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
                          const eng = engines.find(en => en.id === parseInt(e.target.value));
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
                    
                    {/* Dynamic ECU Types - Recommended for selected vehicle */}
                    {dynamicEcuTypes.length > 0 ? (
                      <>
                        {/* Group by supplier */}
                        {(() => {
                          const suppliers = [...new Set(dynamicEcuTypes.filter(e => e.id !== 'other').map(e => e.supplier))];
                          return suppliers.map(supplier => (
                            <optgroup key={supplier} label={`⭐ ${supplier}`}>
                              {dynamicEcuTypes.filter(e => e.supplier === supplier).map((ecu) => (
                                <option key={ecu.id} value={ecu.id}>
                                  {ecu.name} {ecu.years ? `(${ecu.years})` : ''}
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

            {/* ECU Analysis Results - Clean Table Format */}
            <div className="bg-white/80 border border-gray-200/50 rounded-2xl overflow-hidden mb-8">
              {/* Header */}
              <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-200/50">
                <h3 className="font-bold text-xl text-gray-900 flex items-center">
                  <span className="text-2xl mr-3">📊</span>
                  ECU Analysis Results: {analysisResult.original_filename}
                </h3>
              </div>
              
              {/* Table */}
              <div className="divide-y divide-gray-300/50">
                {/* Table Header */}
                <div className="grid grid-cols-2 bg-gray-50/50">
                  <div className="px-6 py-3 text-gray-500 font-semibold text-sm">Field</div>
                  <div className="px-6 py-3 text-gray-500 font-semibold text-sm">Value</div>
                </div>
                
                {/* File Size */}
                <div className="grid grid-cols-2 hover:bg-gray-50/30 transition-colors">
                  <div className="px-6 py-4 text-gray-900 font-medium">File Size</div>
                  <div className="px-6 py-4 text-gray-600">
                    {analysisResult.file_size_mb?.toFixed(2)} MB ({Math.round(analysisResult.file_size_mb * 1024 * 1024).toLocaleString()} bytes)
                  </div>
                </div>
                
                {/* Manufacturer */}
                <div className="grid grid-cols-2 hover:bg-gray-50/30 transition-colors">
                  <div className="px-6 py-4 text-gray-900 font-medium">Manufacturer</div>
                  <div className="px-6 py-4 text-cyan-400 font-semibold">
                    {analysisResult.detected_manufacturer || 'Unknown'}
                    {analysisResult.metadata?.vehicle_info && (
                      <span className="text-gray-500 font-normal"> (for {analysisResult.metadata.vehicle_info})</span>
                    )}
                  </div>
                </div>
                
                {/* ECU Type */}
                <div className="grid grid-cols-2 hover:bg-gray-50/30 transition-colors">
                  <div className="px-6 py-4 text-gray-900 font-medium">ECU Type</div>
                  <div className="px-6 py-4 text-gray-900">
                    {analysisResult.detected_ecu || 'Unknown ECU'}
                    {analysisResult.metadata?.processor && (
                      <span className="text-cyan-400"> / {analysisResult.metadata.processor} processor</span>
                    )}
                  </div>
                </div>
                
                {/* Part Number */}
                {analysisResult.metadata?.part_number && (
                  <div className="grid grid-cols-2 hover:bg-gray-50/30 transition-colors">
                    <div className="px-6 py-4 text-gray-900 font-medium">Part Number</div>
                    <div className="px-6 py-4 text-yellow-400 font-mono font-semibold">
                      {analysisResult.metadata.part_number}
                      {analysisResult.metadata.part_number.startsWith('89') && (
                        <span className="text-gray-500 font-normal font-sans"> (Toyota Part)</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Calibration ID */}
                {analysisResult.metadata?.calibration_id && (
                  <div className="grid grid-cols-2 hover:bg-gray-50/30 transition-colors">
                    <div className="px-6 py-4 text-gray-900 font-medium">Calibration ID</div>
                    <div className="px-6 py-4 text-green-400 font-mono">{analysisResult.metadata.calibration_id}</div>
                  </div>
                )}
                
                {/* Software Version */}
                {analysisResult.metadata?.software_version && (
                  <div className="grid grid-cols-2 hover:bg-gray-50/30 transition-colors">
                    <div className="px-6 py-4 text-gray-900 font-medium">Software Version</div>
                    <div className="px-6 py-4 text-gray-600 font-mono">{analysisResult.metadata.software_version}</div>
                  </div>
                )}
                
                {/* VIN */}
                {analysisResult.metadata?.vin && (
                  <div className="grid grid-cols-2 hover:bg-gray-50/30 transition-colors">
                    <div className="px-6 py-4 text-gray-900 font-medium">VIN</div>
                    <div className="px-6 py-4 text-gray-600 font-mono">{analysisResult.metadata.vin}</div>
                  </div>
                )}
                
                {/* Binary Strings */}
                {analysisResult.metadata?.strings?.length > 0 && (
                  <div className="grid grid-cols-2 hover:bg-gray-50/30 transition-colors">
                    <div className="px-6 py-4 text-gray-900 font-medium">Detected Strings</div>
                    <div className="px-6 py-4">
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {analysisResult.metadata.strings.map((str, idx) => (
                          <div key={idx} className="text-gray-500 text-sm font-mono truncate" title={str}>
                            {str}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>



            <h3 className="text-xl font-semibold mb-4">Available Services</h3>
            <div className="space-y-3 mb-8">
              {availableOptions.map((option) => (
                <div key={option.service_id} className="bg-white/50 rounded-2xl overflow-hidden border border-gray-200/50 hover:border-gray-300 transition">
                  <label className="flex items-center justify-between p-5 cursor-pointer">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(option.service_id)}
                        onChange={() => handleServiceToggle(option.service_id, option.price)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{option.service_name}</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-400">${option.price.toFixed(2)}</div>
                  </label>
                  
                  {/* DTC Input Fields */}
                  {option.service_id === 'dtc-single' && selectedServices.includes('dtc-single') && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-200/50">
                      <label className="block text-sm text-gray-500 mb-2">Enter DTC code to remove:</label>
                      <input
                        type="text"
                        value={dtcSingleCode}
                        onChange={(e) => { setDtcSingleCode(e.target.value.toUpperCase()); setDtcError(''); }}
                        placeholder="e.g., P0420"
                        className="w-full bg-gray-50 text-gray-900 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none"
                        maxLength={5}
                      />
                      <p className="text-xs text-gray-500 mt-2">Format: P0420, C1234, B0001, U0100</p>
                    </div>
                  )}
                  
                  {option.service_id === 'dtc-multiple' && selectedServices.includes('dtc-multiple') && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-200/50">
                      <label className="block text-sm text-gray-500 mb-2">Enter DTC codes (one per line):</label>
                      <textarea
                        value={dtcMultipleCodes}
                        onChange={(e) => { setDtcMultipleCodes(e.target.value.toUpperCase()); setDtcError(''); }}
                        placeholder="P0420&#10;P2002&#10;P0401"
                        className="w-full bg-gray-50 text-gray-900 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none min-h-[100px]"
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
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4">Payment Successful!</h2>
            <p className="text-gray-500 mb-8">Your file has been submitted for processing</p>
            
            {/* Processing Status */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
                <span className="text-lg text-amber-400 font-semibold">Processing Your File...</span>
              </div>
              <p className="text-amber-300/80">
                Our engineers are working on your file. You&apos;ll receive an email within <strong>20-60 minutes</strong> with your download link.
              </p>
            </div>

            {/* Order Details */}
            <div className="bg-white/50 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-semibold mb-4">Order Details</h3>
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
                  <span className="text-gray-500">Total Paid:</span>
                  <span className="text-green-400 font-semibold">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-semibold mb-4 text-blue-400">What Happens Next?</h3>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mr-3 mt-0.5 flex-shrink-0">1</span>
                  Our engineers analyze and process your file
                </li>
                <li className="flex items-start">
                  <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mr-3 mt-0.5 flex-shrink-0">2</span>
                  You&apos;ll receive an email at <strong>{customerInfo.customer_email}</strong>
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
                href={`/portal?order=${orderId}&email=${encodeURIComponent(customerInfo.customer_email)}`}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/25 text-gray-900 px-8 py-3 rounded-xl font-semibold transition"
              >
                Go to Customer Portal
              </a>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-8 py-3 rounded-xl font-semibold transition"
              >
                Process Another File
              </button>
            </div>
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
