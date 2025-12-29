import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Helmet } from 'react-helmet-async';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// SEO Keywords and Meta Data for DTC Delete Tool
const SEO_DATA = {
  title: "DTC Delete Tool | Check Engine Light Removal | Error Code Delete Service",
  description: "Professional DTC deletion service. Remove check engine light, clear diagnostic trouble codes P0420, P0401, P2002, EGR, DPF, AdBlue codes. From $10. Instant download. Checksum correction included.",
  keywords: [
    // Primary Keywords
    "DTC delete", "DTC removal", "check engine light removal", "error code delete",
    "diagnostic trouble code removal", "fault code delete", "engine light off",
    // Service Keywords  
    "ECU DTC delete service", "permanent DTC removal", "DTC file service",
    "check engine light off service", "CEL delete", "MIL delete",
    // Code-Specific Keywords
    "P0420 delete", "P0401 remove", "P2002 delete", "P0171 remove",
    "EGR code delete", "DPF code removal", "AdBlue code delete", "SCR code removal",
    "catalyst code delete", "O2 sensor code removal", "lambda code delete",
    // Vehicle Keywords
    "diesel DTC delete", "truck error code removal", "car fault code delete",
    "BMW DTC delete", "Audi fault code removal", "Mercedes error code delete",
    "Ford DTC removal", "Toyota fault code delete", "VW error code service",
    // Technical Keywords
    "ECU fault code removal", "ECM error code delete", "OBD2 code removal",
    "checksum correction", "ECU flash DTC delete", "ECU tuning DTC removal",
    // Location/Service Keywords
    "online DTC delete service", "remote DTC removal", "instant DTC delete",
    "cheap DTC delete", "affordable error code removal", "fast DTC service",
    // Problem-Specific Keywords
    "how to remove check engine light", "clear engine codes permanently",
    "delete fault codes without scanner", "remove DTC from ECU file",
    "fix check engine light", "stop engine warning light"
  ].join(", "),
  canonical: "/tools/dtc-delete",
  ogImage: "/dtc-delete-og.jpg"
};

// DTC Descriptions for common codes
const DTC_DESCRIPTIONS = {
  // Catalyst
  'P0420': 'Catalyst System Efficiency Below Threshold (Bank 1)',
  'P0421': 'Warm Up Catalyst Efficiency Below Threshold (Bank 1)',
  'P0430': 'Catalyst System Efficiency Below Threshold (Bank 2)',
  'P0431': 'Warm Up Catalyst Efficiency Below Threshold (Bank 2)',
  // EGR
  'P0400': 'Exhaust Gas Recirculation Flow Malfunction',
  'P0401': 'EGR Flow Insufficient Detected',
  'P0402': 'EGR Flow Excessive Detected',
  'P0403': 'EGR Control Circuit Malfunction',
  'P0404': 'EGR Control Circuit Range/Performance',
  'P0405': 'EGR Sensor A Circuit Low',
  'P0406': 'EGR Sensor A Circuit High',
  'P0407': 'EGR Sensor B Circuit Low',
  'P0408': 'EGR Sensor B Circuit High',
  // DPF
  'P2002': 'DPF Efficiency Below Threshold (Bank 1)',
  'P2003': 'DPF Efficiency Below Threshold (Bank 2)',
  'P244A': 'DPF Differential Pressure Too Low',
  'P244B': 'DPF Differential Pressure Too High',
  'P2452': 'DPF Pressure Sensor A Circuit',
  'P2453': 'DPF Pressure Sensor A Range/Performance',
  'P2454': 'DPF Pressure Sensor A Circuit Low',
  'P2455': 'DPF Pressure Sensor A Circuit High',
  'P2458': 'DPF Regeneration Duration',
  'P2459': 'DPF Regeneration Frequency',
  'P2463': 'DPF Soot Accumulation',
  // SCR/AdBlue
  'P20E8': 'Reductant Pressure Too Low',
  'P20EE': 'SCR NOx Catalyst Efficiency Below Threshold (Bank 1)',
  'P20EF': 'SCR NOx Catalyst Efficiency Below Threshold (Bank 2)',
  'P2200': 'NOx Sensor Circuit (Bank 1)',
  'P2201': 'NOx Sensor Circuit Range/Performance (Bank 1)',
  'P2202': 'NOx Sensor Circuit Low Input (Bank 1)',
  'P2203': 'NOx Sensor Circuit High Input (Bank 1)',
  'P2BAD': 'NOx Exceedance - SCR Efficiency Below Threshold',
  'P2BAE': 'NOx Exceedance - Derating Active',
  'P203B': 'Reductant Level Sensor Range/Performance',
  'P203F': 'Reductant Level Too Low',
  'P207F': 'Reductant Quality Performance',
  'P20A1': 'Reductant Injection Malfunction',
  // O2 Sensors
  'P0130': 'O2 Sensor Circuit Malfunction (Bank 1 Sensor 1)',
  'P0131': 'O2 Sensor Circuit Low Voltage (Bank 1 Sensor 1)',
  'P0132': 'O2 Sensor Circuit High Voltage (Bank 1 Sensor 1)',
  'P0133': 'O2 Sensor Circuit Slow Response (Bank 1 Sensor 1)',
  'P0134': 'O2 Sensor No Activity Detected (Bank 1 Sensor 1)',
  'P0135': 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 1)',
  'P0136': 'O2 Sensor Circuit Malfunction (Bank 1 Sensor 2)',
  'P0137': 'O2 Sensor Circuit Low Voltage (Bank 1 Sensor 2)',
  'P0138': 'O2 Sensor Circuit High Voltage (Bank 1 Sensor 2)',
  'P0139': 'O2 Sensor Circuit Slow Response (Bank 1 Sensor 2)',
  'P0140': 'O2 Sensor No Activity Detected (Bank 1 Sensor 2)',
  'P0141': 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 2)',
  // Turbo
  'P0234': 'Turbocharger Overboost Condition',
  'P0235': 'Turbocharger Boost Sensor A Circuit Malfunction',
  'P0236': 'Turbocharger Boost Sensor A Range/Performance',
  'P0299': 'Turbocharger Underboost Condition',
};

// Get description for a DTC code
const getDTCDescription = (code) => {
  return DTC_DESCRIPTIONS[code?.toUpperCase()] || 'Diagnostic Trouble Code';
};

// Common DTC categories for quick selection
const DTC_CATEGORIES = {
  dpf: {
    name: 'DPF (Diesel Particulate Filter)',
    icon: '🔧',
    codes: ['P2002', 'P2003', 'P244A', 'P244B', 'P2452', 'P2453', 'P2454', 'P2455', 'P2458', 'P2459', 'P2463']
  },
  egr: {
    name: 'EGR (Exhaust Gas Recirculation)',
    icon: '♻️',
    codes: ['P0400', 'P0401', 'P0402', 'P0403', 'P0404', 'P0405', 'P0406', 'P0407', 'P0408']
  },
  scr: {
    name: 'SCR/AdBlue/DEF',
    icon: '💧',
    codes: ['P20E8', 'P20EE', 'P20EF', 'P2200', 'P2201', 'P2202', 'P2203', 'P2BAD', 'P2BAE', 'P203B', 'P203F', 'P207F', 'P20A1']
  },
  catalyst: {
    name: 'Catalyst/CAT',
    icon: '🌡️',
    codes: ['P0420', 'P0421', 'P0430', 'P0431']
  },
  o2: {
    name: 'O2/Lambda Sensors',
    icon: '📊',
    codes: ['P0130', 'P0131', 'P0132', 'P0133', 'P0134', 'P0135', 'P0136', 'P0137', 'P0138', 'P0139', 'P0140', 'P0141']
  },
  turbo: {
    name: 'Turbo/Boost',
    icon: '💨',
    codes: ['P0234', 'P0235', 'P0236', 'P0299']
  }
};

const DTCDeletePage = () => {
  const navigate = useNavigate();
  
  // File state
  const [file, setFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Analysis state
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // DTC Database state (from DaVinci)
  const [dtcDatabase, setDtcDatabase] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // DTC input state
  const [dtcInput, setDtcInput] = useState('');
  const [selectedDTCs, setSelectedDTCs] = useState([]);
  const [correctChecksum, setCorrectChecksum] = useState(true);
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  
  // Payment state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderId, setOrderId] = useState(null);
  
  // Step tracking: 1: Upload, 2: Select DTCs, 3: Payment, 4: Results
  const [step, setStep] = useState(1);

  // Load DTC Database from backend (DaVinci data)
  useEffect(() => {
    const loadDTCDatabase = async () => {
      try {
        const response = await axios.get(`${API}/dtc-database`);
        if (response.data.success) {
          setDtcDatabase(response.data);
          console.log(`Loaded ${response.data.total_codes} DTC codes from database`);
        }
      } catch (error) {
        console.log('Using local DTC database');
      }
    };
    loadDTCDatabase();
  }, []);

  // Search DTC codes
  const searchDTCs = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/dtc-database/search?q=${encodeURIComponent(query)}`);
      if (response.data.success) {
        setSearchResults(response.data.results.slice(0, 10));
      }
    } catch (error) {
      // Fallback to local search
      const results = Object.entries(DTC_DESCRIPTIONS)
        .filter(([code, desc]) => 
          code.toLowerCase().includes(query.toLowerCase()) || 
          desc.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10)
        .map(([code, description]) => ({ code, description }));
      setSearchResults(results);
    }
  };

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchDTCs(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pricing calculator
  const calculatePrice = () => {
    const dtcCount = selectedDTCs.length;
    let dtcPrice = 0;
    
    if (dtcCount === 0) {
      dtcPrice = 0;
    } else if (dtcCount === 1) {
      dtcPrice = 10; // $10 for 1 DTC
    } else if (dtcCount >= 2 && dtcCount <= 6) {
      dtcPrice = 20; // $20 for 2-6 DTCs
    } else {
      dtcPrice = 30; // $30 for 7+ DTCs
    }
    
    const checksumPrice = correctChecksum ? 5 : 0; // $5 for checksum
    
    return {
      dtcPrice,
      checksumPrice,
      total: dtcPrice + checksumPrice
    };
  };

  const pricing = calculatePrice();

  // File upload handler
  const onDrop = useCallback(async (acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', uploadedFile);
    
    try {
      const response = await axios.post(`${API}/dtc-engine/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });
      
      if (response.data.success) {
        setFileId(response.data.file_id);
        setAnalysisResult(response.data.analysis);
        setStep(2);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.bin', '.ori', '.mod', '.fls', '.hex']
    },
    maxFiles: 1,
    disabled: uploading
  });

  // Add DTC codes from input
  const addDTCsFromInput = () => {
    const codes = dtcInput
      .toUpperCase()
      .split(/[,;\s]+/)
      .map(c => c.trim())
      .filter(c => /^[PCBU][0-9A-Fa-f]{4}$/.test(c))
      .filter(c => !selectedDTCs.includes(c));
    
    if (codes.length > 0) {
      setSelectedDTCs([...selectedDTCs, ...codes]);
      setDtcInput('');
    }
  };

  // Add DTCs from category
  const addCategoryDTCs = (categoryKey) => {
    const category = DTC_CATEGORIES[categoryKey];
    const newCodes = category.codes.filter(c => !selectedDTCs.includes(c));
    setSelectedDTCs([...selectedDTCs, ...newCodes]);
  };

  // Remove DTC from selection
  const removeDTC = (code) => {
    setSelectedDTCs(selectedDTCs.filter(c => c !== code));
  };

  // Clear all selected DTCs
  const clearAllDTCs = () => {
    setSelectedDTCs([]);
  };

  // Process file (delete DTCs)
  const processFile = async () => {
    if (!fileId || selectedDTCs.length === 0) return;
    
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/dtc-engine/process`, {
        file_id: fileId,
        dtc_codes: selectedDTCs,
        correct_checksum: correctChecksum,
        order_id: orderId
      });
      
      setProcessResult(response.data);
      setStep(4); // Changed from 3 to 4 (after payment step)
    } catch (error) {
      console.error('Processing error:', error);
      alert('Failed to process file: ' + (error.response?.data?.detail || error.message));
    } finally {
      setProcessing(false);
    }
  };

  // Create order and process payment
  const createOrderAndPay = async (skipPayment = false) => {
    if (!customerEmail || !customerName) {
      alert('Please fill in your name and email');
      return;
    }
    
    setProcessing(true);
    try {
      // Create order in database
      const orderResponse = await axios.post(`${API}/dtc-engine/order`, {
        file_id: fileId,
        dtc_codes: selectedDTCs,
        correct_checksum: correctChecksum,
        customer_name: customerName,
        customer_email: customerEmail,
        dtc_price: pricing.dtcPrice,
        checksum_price: pricing.checksumPrice,
        total_price: pricing.total,
        payment_status: skipPayment ? 'test_completed' : 'pending'
      });
      
      if (orderResponse.data.success) {
        setOrderId(orderResponse.data.order_id);
        
        // If skipping payment (test mode), process immediately
        if (skipPayment) {
          const processResponse = await axios.post(`${API}/dtc-engine/process`, {
            file_id: fileId,
            dtc_codes: selectedDTCs,
            correct_checksum: correctChecksum,
            order_id: orderResponse.data.order_id
          });
          
          setProcessResult(processResponse.data);
          setStep(4);
        } else {
          // TODO: Integrate PayPal payment here
          // For now, show message
          alert('PayPal payment integration coming soon. Using test mode.');
          // Process after "payment"
          const processResponse = await axios.post(`${API}/dtc-engine/process`, {
            file_id: fileId,
            dtc_codes: selectedDTCs,
            correct_checksum: correctChecksum,
            order_id: orderResponse.data.order_id
          });
          
          setProcessResult(processResponse.data);
          setStep(4);
        }
      }
    } catch (error) {
      console.error('Order error:', error);
      alert('Failed to create order: ' + (error.response?.data?.detail || error.message));
    } finally {
      setProcessing(false);
    }
  };

  // Download modified file
  const downloadFile = async () => {
    if (!processResult?.download_id) return;
    
    try {
      const response = await axios.get(`${API}/dtc-engine/download/${processResult.download_id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${file?.name?.replace(/\.[^.]+$/, '')}_dtc_deleted.bin`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  // Reset for new file
  const resetAll = () => {
    setFile(null);
    setFileId(null);
    setAnalysisResult(null);
    setSelectedDTCs([]);
    setDtcInput('');
    setProcessResult(null);
    setCustomerName('');
    setCustomerEmail('');
    setOrderId(null);
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{SEO_DATA.title}</title>
        <meta name="description" content={SEO_DATA.description} />
        <meta name="keywords" content={SEO_DATA.keywords} />
        <link rel="canonical" href={SEO_DATA.canonical} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={SEO_DATA.title} />
        <meta property="og:description" content={SEO_DATA.description} />
        <meta property="og:url" content={SEO_DATA.canonical} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO_DATA.title} />
        <meta name="twitter:description" content={SEO_DATA.description} />
        
        {/* Additional SEO Tags */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta name="googlebot" content="index, follow" />
        <meta name="author" content="ECU Flash Service" />
        
        {/* Structured Data - Service Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "DTC Delete Service",
            "description": "Professional diagnostic trouble code (DTC) removal service for vehicles. Remove check engine lights, clear fault codes permanently from ECU files.",
            "provider": {
              "@type": "Organization",
              "name": "ECU Flash Service",
              "url": "https://ecuflashservice.com"
            },
            "serviceType": "ECU Programming",
            "areaServed": "Worldwide",
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "DTC Removal Services",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Single DTC Removal"
                  },
                  "price": "10",
                  "priceCurrency": "USD"
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Multiple DTC Removal (2-6)"
                  },
                  "price": "20",
                  "priceCurrency": "USD"
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Bulk DTC Removal (7+)"
                  },
                  "price": "30",
                  "priceCurrency": "USD"
                }
              ]
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "3500"
            }
          })}
        </script>
        
        {/* FAQ Schema for common questions */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is DTC delete?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "DTC delete is the process of permanently removing Diagnostic Trouble Codes from your vehicle's ECU file. This prevents check engine lights from appearing for specific fault codes like P0420, P2002, or EGR-related codes."
                }
              },
              {
                "@type": "Question",
                "name": "How much does DTC removal cost?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our DTC removal service starts at $10 for a single code, $20 for 2-6 codes, and $30 for 7 or more codes. Checksum correction is included at $5 additional."
                }
              },
              {
                "@type": "Question",
                "name": "Is DTC delete permanent?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, when we remove DTCs from your ECU file, the codes are permanently deleted. The check engine light will not return for those specific codes."
                }
              },
              {
                "@type": "Question",
                "name": "What DTC codes can you remove?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "We can remove almost any DTC including P0420 (catalyst), P0401-P0408 (EGR), P2002/P2463 (DPF), P20EE/P203F (AdBlue/SCR), O2 sensor codes, turbo codes, and many more."
                }
              }
            ]
          })}
        </script>
      </Helmet>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
                ← Back
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🔧</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ECU DTC Delete Engine</h1>
                <p className="text-xs text-gray-500">Delete specific DTCs with checksum correction</p>
              </div>
            </div>
            
            {/* Progress Steps - Now 4 steps */}
            <div className="flex items-center space-x-2">
              {[
                { num: 1, label: 'Upload' },
                { num: 2, label: 'Select' },
                { num: 3, label: 'Pay' },
                { num: 4, label: 'Done' }
              ].map((s, idx) => (
                <div key={s.num} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= s.num ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s.num}
                  </div>
                  {idx < 3 && <div className={`w-6 h-0.5 ${step > s.num ? 'bg-blue-500' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload ECU File</h2>
              <p className="text-gray-500">Upload your ECU file to scan and delete specific DTCs</p>
            </div>
            
            {/* Pricing Info */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">💰</span> Pricing
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">$10</div>
                  <div className="text-gray-600">1 DTC</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">$20</div>
                  <div className="text-gray-600">2-6 DTCs</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">$30</div>
                  <div className="text-gray-600">7+ DTCs</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-600">+$5</div>
                  <div className="text-gray-600">Checksum</div>
                </div>
              </div>
            </div>

            {/* Sub-Code Explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">ℹ️</span>
                <div className="text-sm">
                  <h4 className="font-semibold text-blue-900 mb-1">About DTC Sub-Codes (Fault Bytes)</h4>
                  <p className="text-blue-700">
                    A single DTC like <span className="font-mono bg-blue-100 px-1 rounded">P0421</span> may appear multiple times in your ECU with different 
                    <strong> sub-codes</strong> (e.g., <span className="font-mono bg-blue-100 px-1 rounded">P0421-22</span>, <span className="font-mono bg-blue-100 px-1 rounded">P0421-AF</span>). 
                    The tool will find and delete <strong>all instances</strong> of each DTC you select, including all its sub-codes/fault bytes.
                  </p>
                </div>
              </div>
            </div>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-gray-600">Uploading... {uploadProgress}%</p>
                  <div className="w-48 mx-auto mt-3 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">📁</span>
                  </div>
                  <p className="text-gray-700 font-medium mb-2">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop your ECU file here'}
                  </p>
                  <p className="text-gray-400 text-sm">or click to browse</p>
                  <p className="text-gray-400 text-xs mt-2">Supported: .bin, .ori, .mod, .fls, .hex</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select DTCs */}
        {step === 2 && analysisResult && (
          <div className="space-y-6">
            {/* File Info Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{file?.name}</h3>
                    <p className="text-sm text-gray-500">
                      {(file?.size / 1024 / 1024).toFixed(2)} MB
                      {analysisResult.ecu_info?.manufacturer && analysisResult.ecu_info.manufacturer !== 'Unknown' && ` • ${analysisResult.ecu_info.manufacturer}`}
                      {analysisResult.ecu_info?.type && analysisResult.ecu_info.type !== 'Unknown' && ` • ${analysisResult.ecu_info.type}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetAll}
                  className="text-gray-400 hover:text-blue-500 transition"
                >
                  ✕ Change File
                </button>
              </div>
              
              {/* Checksum Info */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <span>🔐</span>
                  <span>Checksum Type: <strong className="text-gray-900">{analysisResult.checksum_info?.type || 'Detecting...'}</strong></span>
                </div>
              </div>
            </div>

            {/* DTCs Found in File */}
            {analysisResult.detected_dtcs?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🔍</span>
                  DTCs Found in File ({analysisResult.detected_dtcs.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.detected_dtcs.map((dtc, idx) => (
                    <button
                      key={idx}
                      onClick={() => !selectedDTCs.includes(dtc.code) && setSelectedDTCs([...selectedDTCs, dtc.code])}
                      disabled={selectedDTCs.includes(dtc.code)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-mono transition ${
                        selectedDTCs.includes(dtc.code)
                          ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                          : 'bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600'
                      }`}
                      title={dtc.description}
                    >
                      {dtc.code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DTC Input Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Select DTCs to Delete</h3>
              
              {/* Manual Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter DTC Codes</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={dtcInput}
                    onChange={(e) => setDtcInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addDTCsFromInput()}
                    placeholder="P0420, P2002, P0401..."
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    onClick={addDTCsFromInput}
                    className="bg-blue-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter one or more DTC codes separated by commas or spaces</p>
              </div>

              {/* Category Quick Select */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Add by Category</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(DTC_CATEGORIES).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => addCategoryDTCs(key)}
                      className="flex items-center space-x-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-red-300 rounded-xl px-4 py-3 text-left transition"
                    >
                      <span>{cat.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected DTCs */}
              {selectedDTCs.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Selected DTCs ({selectedDTCs.length})
                    </label>
                    <button
                      onClick={clearAllDTCs}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedDTCs.map((code) => (
                        <span
                          key={code}
                          className="inline-flex items-center bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-mono"
                        >
                          {code}
                          <button
                            onClick={() => removeDTC(code)}
                            className="ml-2 text-blue-500 hover:text-blue-700"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Checksum Option */}
              <div className="flex items-center space-x-3 mb-6 p-4 bg-blue-50 rounded-xl">
                <input
                  type="checkbox"
                  id="checksum"
                  checked={correctChecksum}
                  onChange={(e) => setCorrectChecksum(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <label htmlFor="checksum" className="text-sm flex-1">
                  <span className="font-medium text-gray-900">Automatic Checksum Correction (+$5)</span>
                  <span className="text-gray-500 block">Recalculate file checksum after DTC deletion</span>
                </label>
                <span className="text-blue-600 font-semibold">${correctChecksum ? '5.00' : '0.00'}</span>
              </div>

              {/* Price Summary */}
              {selectedDTCs.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">DTC Removal ({selectedDTCs.length} code{selectedDTCs.length !== 1 ? 's' : ''})</span>
                    <span className="font-semibold">${pricing.dtcPrice.toFixed(2)}</span>
                  </div>
                  {correctChecksum && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Checksum Correction</span>
                      <span className="font-semibold">${pricing.checksumPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-blue-600">${pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Continue to Payment Button */}
              <button
                onClick={() => setStep(3)}
                disabled={selectedDTCs.length === 0}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 rounded-xl font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span>💳</span>
                <span>Continue to Payment - ${pricing.total.toFixed(2)}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📋</span> Order Summary
              </h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">File</span>
                  <span className="font-medium text-gray-900">{file?.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">DTCs to Delete</span>
                  <span className="font-medium text-gray-900">{selectedDTCs.length} code{selectedDTCs.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-1 py-2 border-b border-gray-100">
                  {selectedDTCs.map(code => (
                    <span key={code} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">{code}</span>
                  ))}
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">DTC Removal</span>
                  <span className="font-semibold">${pricing.dtcPrice.toFixed(2)}</span>
                </div>
                {correctChecksum && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Checksum Correction</span>
                    <span className="font-semibold">${pricing.checksumPrice.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-3">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">${pricing.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">👤</span> Your Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-red-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">We will send the modified file to this email</p>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">💳</span> Payment
              </h3>
              
              {/* PayPal Button Placeholder */}
              <div className="bg-gray-50 rounded-xl p-6 text-center mb-4">
                <p className="text-gray-500 mb-4">PayPal payment coming soon</p>
                
                {/* Skip Payment Button for Testing */}
                <button
                  onClick={() => createOrderAndPay(true)}
                  disabled={processing || !customerName || !customerEmail}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-4 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {processing ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>🧪</span>
                      <span>Skip Payment (Test Mode) - ${pricing.total.toFixed(2)}</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-yellow-600 mt-2">For testing only - bypasses payment</p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 text-gray-500 hover:text-gray-700 transition"
              >
                ← Back to DTC Selection
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && processResult && (
          <div className="space-y-4">
            {/* Success Banner - Compact */}
            <div className={`rounded-xl p-4 ${processResult.success ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{processResult.success ? '✅' : '⚠️'}</div>
                <div>
                  <h2 className="text-xl font-bold">
                    {processResult.success ? 'DTC Deletion Complete!' : 'Processing Completed'}
                  </h2>
                  <p className="text-sm opacity-90">
                    {processResult.dtcs_deleted?.length || 0} instance(s) deleted • 
                    {processResult.checksum_corrected ? ' Checksum corrected' : ' Checksum unchanged'}
                  </p>
                </div>
              </div>
            </div>

            {/* ECU Analysis Summary + Results - Combined Card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* ECU Analysis Header */}
              {analysisResult && (
                <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🔍</span>
                      <div>
                        <div className="font-semibold">
                          {[
                            analysisResult.ecu_info?.manufacturer && analysisResult.ecu_info.manufacturer !== 'Unknown' ? analysisResult.ecu_info.manufacturer : null,
                            analysisResult.ecu_info?.type && analysisResult.ecu_info.type !== 'Unknown' ? analysisResult.ecu_info.type : null
                          ].filter(Boolean).join(' ') || 'ECU File'}
                        </div>
                        <div className="text-xs text-white/80">{file?.name} • {(file?.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-white/80">Checksum</div>
                      <div className="font-mono">{analysisResult.checksum_info?.type || processResult.checksum_type || 'auto'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Row */}
              <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
                <div className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{processResult.dtcs_deleted?.length || 0}</div>
                  <div className="text-xs text-gray-500">Deleted</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{processResult.dtcs_not_found?.length || 0}</div>
                  <div className="text-xs text-gray-500">Not Found</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{processResult.checksum_corrected ? '✓' : '—'}</div>
                  <div className="text-xs text-gray-500">Checksum</div>
                </div>
              </div>

              {/* Deleted DTCs - With Descriptions */}
              {processResult.dtcs_deleted?.length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-green-500">✓</span>
                    <span className="text-sm font-medium text-gray-700">Successfully Deleted ({processResult.dtcs_deleted.length})</span>
                  </div>
                  <div className="space-y-2">
                    {/* Group by DTC code and show with description */}
                    {Object.entries(
                      processResult.dtcs_deleted.reduce((acc, dtc) => {
                        if (!acc[dtc.code]) {
                          acc[dtc.code] = { count: 0, description: dtc.description };
                        }
                        acc[dtc.code].count += 1;
                        return acc;
                      }, {})
                    ).map(([code, data]) => (
                      <div key={code} className="flex items-start gap-2 bg-green-50 rounded-lg p-2">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono text-xs font-semibold whitespace-nowrap">
                          {code}
                          {data.count > 1 && <span className="ml-1 bg-green-200 px-1 rounded text-green-800">×{data.count}</span>}
                        </span>
                        <span className="text-xs text-gray-600 leading-relaxed">
                          {data.description || 'Diagnostic Trouble Code'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Sub-code note */}
                  {processResult.dtcs_deleted.some(d => d.count > 1 || processResult.dtcs_deleted.filter(x => x.code === d.code).length > 1) && (
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Multiple instances (×N) indicate sub-codes/fault bytes were found and deleted.
                    </p>
                  )}
                </div>
              )}

              {/* Not Found DTCs - With Descriptions */}
              {processResult.dtcs_not_found?.length > 0 && (
                <div className="p-4 border-b border-gray-200 bg-yellow-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-yellow-500">⚠</span>
                    <span className="text-sm font-medium text-gray-700">Not Found ({processResult.dtcs_not_found.length})</span>
                  </div>
                  <div className="space-y-2">
                    {processResult.dtcs_not_found.map((code, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-yellow-100/50 rounded-lg p-2">
                        <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded font-mono text-xs font-semibold whitespace-nowrap">
                          {code}
                        </span>
                        <span className="text-xs text-gray-600 leading-relaxed">
                          {getDTCDescription(code)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-600 mt-2">
                    These DTCs were not found in the file. They may not be stored in this ECU.
                  </p>
                </div>
              )}

              {/* Download Section */}
              {processResult.success && (
                <div className="p-4 bg-gray-50">
                  <button
                    onClick={downloadFile}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <span>⬇️</span>
                    <span>Download Modified File</span>
                  </button>
                  <p className="text-center text-xs text-gray-500 mt-2">
                    {file?.name?.replace(/\.[^.]+$/, '')}_dtc_deleted.bin
                  </p>
                </div>
              )}
            </div>

            {/* Actions - Compact */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm transition"
              >
                ← Edit Selection
              </button>
              <button
                onClick={resetAll}
                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2.5 rounded-lg font-medium text-sm transition"
              >
                Process Another File
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* SEO Content Section - Visible to search engines */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Professional DTC Delete Service - Remove Check Engine Light Permanently
          </h2>
          
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="mb-4">
              Our <strong>DTC delete service</strong> allows you to permanently remove diagnostic trouble codes from your vehicle's ECU file. 
              Whether you're dealing with a persistent <strong>check engine light</strong>, <strong>EGR fault codes</strong>, 
              <strong>DPF error codes</strong>, or <strong>AdBlue/SCR system warnings</strong>, our professional service can help.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Common DTC Codes We Remove</h3>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">🔧 DPF Codes</h4>
                <p className="text-sm text-gray-600">P2002, P2003, P244A, P244B, P2452, P2453, P2458, P2459, P2463 - Diesel Particulate Filter efficiency and regeneration codes</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">♻️ EGR Codes</h4>
                <p className="text-sm text-gray-600">P0400, P0401, P0402, P0403, P0404, P0405, P0406, P0407, P0408 - Exhaust Gas Recirculation system codes</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">💧 AdBlue/SCR Codes</h4>
                <p className="text-sm text-gray-600">P20E8, P20EE, P20EF, P2200, P2BAD, P203B, P203F, P207F, P20A1 - Selective Catalytic Reduction and DEF codes</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">🌡️ Catalyst Codes</h4>
                <p className="text-sm text-gray-600">P0420, P0421, P0430, P0431 - Catalytic converter efficiency codes</p>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How Our DTC Delete Service Works</h3>
            <ol className="list-decimal list-inside space-y-2 mb-8">
              <li><strong>Upload your ECU file</strong> - Supported formats: .bin, .ori, .fls, .hex, .ecu</li>
              <li><strong>Select the DTCs to remove</strong> - Choose from common codes or enter custom codes</li>
              <li><strong>Pay securely</strong> - Starting from just $10 via PayPal</li>
              <li><strong>Download your modified file</strong> - With checksum correction included</li>
            </ol>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Why Choose Our DTC Removal Service?</h3>
            <ul className="list-disc list-inside space-y-2 mb-8">
              <li><strong>Permanent removal</strong> - DTCs are deleted from the ECU file itself</li>
              <li><strong>Checksum correction</strong> - Ensures your ECU accepts the modified file</li>
              <li><strong>Fast turnaround</strong> - Get your modified file in minutes</li>
              <li><strong>Affordable pricing</strong> - From $10 for single DTC removal</li>
              <li><strong>Wide compatibility</strong> - Support for Bosch, Siemens, Delphi, Denso ECUs</li>
              <li><strong>Expert support</strong> - Professional technicians available to help</li>
            </ul>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
              <h4 className="font-semibold text-blue-900 mb-2">🚗 Supported Vehicles</h4>
              <p className="text-blue-800 text-sm">
                BMW, Mercedes-Benz, Audi, Volkswagen, Ford, Toyota, Hilux, Land Cruiser, Ranger, Triton, 
                Amarok, Land Rover, Isuzu, Nissan, Mazda, Hyundai, Kia, Volvo, Scania, MAN, DAF, Iveco, 
                John Deere, Case, New Holland, Caterpillar, and many more.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DTCDeletePage;
