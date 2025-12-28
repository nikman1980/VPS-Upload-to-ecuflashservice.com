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
  
  // Step tracking
  const [step, setStep] = useState(1); // 1: Upload, 2: Select DTCs, 3: Results

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
        correct_checksum: correctChecksum
      });
      
      setProcessResult(response.data);
      setStep(3);
    } catch (error) {
      console.error('Processing error:', error);
      alert('Failed to process file: ' + (error.response?.data?.detail || error.message));
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
            
            {/* Progress Steps */}
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= s ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-red-500' : 'bg-gray-200'}`} />}
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
                <label htmlFor="checksum" className="text-sm">
                  <span className="font-medium text-gray-900">Automatic Checksum Correction</span>
                  <span className="text-gray-500 block">Recalculate file checksum after DTC deletion</span>
                </label>
              </div>

              {/* Process Button */}
              <button
                onClick={processFile}
                disabled={selectedDTCs.length === 0 || processing}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 rounded-xl font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                    <span>🗑️</span>
                    <span>Delete {selectedDTCs.length} DTC{selectedDTCs.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && processResult && (
          <div className="space-y-6">
            {/* Success Banner */}
            <div className={`rounded-2xl p-6 ${processResult.success ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{processResult.success ? '✅' : '⚠️'}</div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {processResult.success ? 'DTC Deletion Complete!' : 'Processing Completed with Warnings'}
                  </h2>
                  <p className="opacity-90">
                    {processResult.dtcs_deleted?.length || 0} DTCs deleted • 
                    {processResult.checksum_corrected ? ' Checksum corrected' : ' Checksum unchanged'}
                  </p>
                </div>
              </div>
            </div>

            {/* Results Summary */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Processing Results</h3>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{processResult.dtcs_deleted?.length || 0}</div>
                  <div className="text-sm text-green-700">DTCs Deleted</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">{processResult.dtcs_not_found?.length || 0}</div>
                  <div className="text-sm text-yellow-700">Not Found</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{processResult.checksum_corrected ? '✓' : '—'}</div>
                  <div className="text-sm text-blue-700">Checksum</div>
                </div>
              </div>

              {/* Deleted DTCs */}
              {processResult.dtcs_deleted?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">✅ Successfully Deleted:</h4>
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {processResult.dtcs_deleted.map((dtc, idx) => (
                        <span key={idx} className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-mono">
                          {dtc.code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Not Found DTCs */}
              {processResult.dtcs_not_found?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">⚠️ Not Found in File:</h4>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {processResult.dtcs_not_found.map((code, idx) => (
                        <span key={idx} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm font-mono">
                          {code}
                        </span>
                      ))}
                    </div>
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
