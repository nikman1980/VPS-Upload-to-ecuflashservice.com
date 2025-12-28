import { useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
                ← Back
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-400 rounded-xl flex items-center justify-center">
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
                    step >= s.num ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s.num}
                  </div>
                  {idx < 3 && <div className={`w-6 h-0.5 ${step > s.num ? 'bg-red-500' : 'bg-gray-200'}`} />}
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
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">💰</span> Pricing
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">$10</div>
                  <div className="text-gray-600">1 DTC</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">$20</div>
                  <div className="text-gray-600">2-6 DTCs</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">$30</div>
                  <div className="text-gray-600">7+ DTCs</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">+$5</div>
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
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-red-400 hover:bg-red-50/50'
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-gray-600">Uploading... {uploadProgress}%</p>
                  <div className="w-48 mx-auto mt-3 bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
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
                      {(file?.size / 1024 / 1024).toFixed(2)} MB • 
                      {analysisResult.ecu_info?.manufacturer || 'Unknown'} • 
                      {analysisResult.ecu_info?.type || 'Unknown ECU'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetAll}
                  className="text-gray-400 hover:text-red-500 transition"
                >
                  ✕ Change File
                </button>
              </div>
              
              {/* Checksum Info */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <span>🔐</span>
                  <span>Checksum Type: <strong className="text-gray-900">{analysisResult.checksum_info?.type || 'Unknown'}</strong></span>
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
                          ? 'bg-red-100 text-red-600 cursor-not-allowed'
                          : 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600'
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
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    onClick={addDTCsFromInput}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition"
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
                      className="flex items-center space-x-2 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl px-4 py-3 text-left transition"
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
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedDTCs.map((code) => (
                        <span
                          key={code}
                          className="inline-flex items-center bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-mono"
                        >
                          {code}
                          <button
                            onClick={() => removeDTC(code)}
                            className="ml-2 text-red-500 hover:text-red-700"
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
                    <span className="text-2xl font-bold text-red-600">${pricing.total.toFixed(2)}</span>
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
                    <span key={code} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-mono">{code}</span>
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
                  <span className="text-2xl font-bold text-red-600">${pricing.total.toFixed(2)}</span>
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
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
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
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll send the modified file to this email</p>
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
                          {analysisResult.ecu_info?.manufacturer || 'Unknown'} {analysisResult.ecu_info?.type || 'ECU'}
                        </div>
                        <div className="text-xs text-white/80">{file?.name} • {(file?.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-white/80">Checksum</div>
                      <div className="font-mono">{analysisResult.checksum_info?.type || processResult.checksum_type}</div>
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

              {/* Deleted DTCs - Compact Badges */}
              {processResult.dtcs_deleted?.length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-sm font-medium text-gray-700">Successfully Deleted ({processResult.dtcs_deleted.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Group by DTC code and count instances */}
                    {Object.entries(
                      processResult.dtcs_deleted.reduce((acc, dtc) => {
                        acc[dtc.code] = (acc[dtc.code] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([code, count]) => (
                      <span key={code} className="inline-flex items-center bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-mono">
                        {code}
                        {count > 1 && <span className="ml-1 bg-green-200 px-1 rounded text-green-800">×{count}</span>}
                      </span>
                    ))}
                  </div>
                  {/* Sub-code note */}
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Multiple instances indicate sub-codes/fault bytes were found and deleted for each DTC.
                  </p>
                </div>
              )}

              {/* Not Found DTCs - Compact */}
              {processResult.dtcs_not_found?.length > 0 && (
                <div className="p-4 border-b border-gray-200 bg-yellow-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-500">⚠</span>
                    <span className="text-sm font-medium text-gray-700">Not Found ({processResult.dtcs_not_found.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {processResult.dtcs_not_found.map((code, idx) => (
                      <span key={idx} className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-mono">
                        {code}
                      </span>
                    ))}
                  </div>
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
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-600 mt-2">
                      These DTCs were not found in the file. They may not be stored in this ECU or use a different encoding format.
                    </p>
                  </div>
                </div>
              )}

              {/* Checksum Details */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">🔐 Checksum Information:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Type: <span className="font-mono text-gray-900">{processResult.checksum_type}</span></div>
                  <div>Status: <span className={processResult.checksum_corrected ? 'text-green-600' : 'text-gray-500'}>
                    {processResult.checksum_corrected ? 'Corrected' : 'Not modified'}
                  </span></div>
                </div>
              </div>
            </div>

            {/* Download Button */}
            {processResult.success && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <button
                  onClick={downloadFile}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 rounded-xl font-semibold text-lg transition flex items-center justify-center space-x-2"
                >
                  <span>⬇️</span>
                  <span>Download Modified File</span>
                </button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  File will be saved as: {file?.name?.replace(/\.[^.]+$/, '')}_dtc_deleted.bin
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition"
              >
                ← Edit Selection
              </button>
              <button
                onClick={resetAll}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-semibold transition"
              >
                Process Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DTCDeletePage;
