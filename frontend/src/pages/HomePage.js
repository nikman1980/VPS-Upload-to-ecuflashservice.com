import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// PayPal Client ID - In production, use environment variable
const PAYPAL_CLIENT_ID = 'test';

const HomePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Upload, 2: Analysis Result & Selection, 3: Payment, 4: Processing
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Analysis results
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  
  // Vehicle data
  const [vehicleMakes, setVehicleMakes] = useState([]);
  const [vehicleModels, setVehicleModels] = useState({});
  const [services, setServices] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pricingData, setPricingData] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    engine_type: '',
    ecu_type: '',
    vin: '',
    selected_services: [],
    issues_description: '',
    additional_notes: ''
  });

  useEffect(() => {
    fetchServices();
    fetchVehicleDatabase();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchVehicleDatabase = async () => {
    try {
      const response = await axios.get(`${API}/vehicles`);
      setVehicleMakes(response.data.makes);
      setVehicleModels(response.data.models);
    } catch (error) {
      console.error('Error fetching vehicle database:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset model when make changes
    if (name === 'vehicle_make') {
      setFormData(prev => ({ ...prev, vehicle_model: '' }));
    }
  };

  const handleServiceToggle = async (serviceId) => {
    const updatedServices = formData.selected_services.includes(serviceId)
      ? formData.selected_services.filter(id => id !== serviceId)
      : [...formData.selected_services, serviceId];
    
    setFormData(prev => ({ ...prev, selected_services: updatedServices }));
    
    // Calculate pricing
    if (updatedServices.length > 0) {
      try {
        const response = await axios.post(`${API}/calculate-price`, updatedServices);
        setPricingData(response.data);
      } catch (error) {
        console.error('Error calculating price:', error);
      }
    } else {
      setPricingData(null);
    }
  };

  const handleFileSelect = async (files) => {
    const validExtensions = ['.bin', '.hex', '.ecu', '.ori', '.mod'];
    
    for (let file of files) {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(ext)) {
        alert(`Invalid file type: ${file.name}. Only ECU files (.bin, .hex, .ecu, .ori, .mod) are allowed.`);
        continue;
      }
      
      // Add file to list
      setUploadedFiles(prev => [...prev, {
        file: file,
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        uploading: false
      }]);
      
      // Automatically analyze the file
      await analyzeFile(file);
    }
  };

  const analyzeFile = async (file) => {
    setAnalyzingFile(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/analyze-file`, formData, {
        headers: {'Content-Type': 'multipart/form-data'}
      });
      
      setAnalysisResult(response.data);
      setStep(2); // Move to analysis result step
      
    } catch (error) {
      console.error('Error analyzing file:', error);
      alert('Error analyzing file. Please try again.');
    } finally {
      setAnalyzingFile(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.selected_services.length === 0) {
      alert('Please select at least one service');
      return;
    }

    if (uploadedFiles.length === 0) {
      alert('Please upload at least one ECU file');
      return;
    }

    // Show payment section
    setShowPayment(true);
  };

  const createOrder = (data, actions) => {
    if (!pricingData) return;
    
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: pricingData.total_price.toFixed(2),
          },
          description: `ECU File Processing - ${formData.selected_services.length} service(s)`
        },
      ],
    });
  };

  const onApprove = async (data, actions) => {
    const order = await actions.order.capture();
    
    setLoading(true);
    try {
      // Create FormData for file upload
      const formDataObj = new FormData();
      
      // Add all form fields
      formDataObj.append('request_data', JSON.stringify(formData));
      
      // Add files
      uploadedFiles.forEach(file => {
        formDataObj.append('files', file.file);
      });
      
      // Create service request
      const response = await axios.post(`${API}/service-requests`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update payment status
      await axios.patch(`${API}/service-requests/${response.data.id}/payment`, {
        paypal_order_id: order.id,
        paypal_transaction_id: order.purchase_units[0].payments.captures[0].id,
        payment_status: 'completed'
      });
      
      navigate(`/success/${response.data.id}`);
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Error submitting request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const availableModels = formData.vehicle_make && vehicleModels[formData.vehicle_make] 
    ? vehicleModels[formData.vehicle_make] 
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔧</span>
            <h1 className="text-2xl font-bold text-white">DPF AdBlue Removal</h1>
          </div>
          <nav className="flex space-x-6">
            <a href="#services" className="hover:text-blue-400 transition">Services</a>
            <a href="#benefits" className="hover:text-blue-400 transition">Benefits</a>
            <a href="#pricing" className="hover:text-blue-400 transition">Pricing</a>
            <a href="/admin" className="hover:text-blue-400 transition">Admin</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold mb-6" data-testid="hero-title">
          {step === 1 ? 'Upload ECU File for Analysis' : 'Select Services to Remove'}
        </h2>
        <p className="text-xl text-gray-300 mb-4 max-w-3xl mx-auto">
          {step === 1 
            ? 'Upload your ECU file and our AI will detect what systems are available for removal.' 
            : 'We analyzed your file. Select the services you want to remove.'
          }
        </p>
        <p className="text-lg text-blue-400 mb-8">
          ⚡ AI Analysis • 🔒 Secure • ⚙️ Custom Options
        </p>
        {step === 1 && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105"
            data-testid="get-quote-btn"
          >
            Start Upload
          </button>
        )}
      </section>

      {/* Analysis Results Section */}
      {step === 2 && analysisResult && (
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-700 p-8 rounded-lg mb-8">
              <h3 className="text-3xl font-bold mb-6 text-center">
                🔍 AI Analysis Complete
              </h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* File Information */}
                <div className="bg-gray-800/50 p-6 rounded-lg">
                  <h4 className="text-xl font-semibold mb-4 text-blue-400">📄 File Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">File Name:</span>
                      <span>{analysisResult.file_info?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">File Size:</span>
                      <span>{analysisResult.file_info?.size || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ECU Type:</span>
                      <span>{analysisResult.ecu_info?.type || 'Detected automatically'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vehicle:</span>
                      <span>{analysisResult.vehicle_info?.make || 'Unknown'} {analysisResult.vehicle_info?.model || ''}</span>
                    </div>
                  </div>
                </div>

                {/* Available Services */}
                <div className="bg-gray-800/50 p-6 rounded-lg">
                  <h4 className="text-xl font-semibold mb-4 text-green-400">✅ Available Services</h4>
                  <div className="space-y-3">
                    {analysisResult.available_services?.map((service, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="text-green-400">✓</span>
                        <span className="text-sm">{service.name}</span>
                        <span className="text-xs text-gray-400">({service.confidence}% confidence)</span>
                      </div>
                    )) || (
                      <div className="text-gray-400 text-sm">
                        All standard services available (DPF, AdBlue, EGR)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Analysis Summary */}
              {analysisResult.analysis_summary && (
                <div className="mt-6 bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2 text-blue-400">🤖 AI Analysis Summary</h4>
                  <p className="text-sm text-gray-300">{analysisResult.analysis_summary}</p>
                </div>
              )}

              {/* Action Button */}
              <div className="text-center mt-8">
                <button 
                  onClick={() => setShowForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105"
                >
                  Select Services & Continue
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Loading Analysis */}
      {analyzingFile && (
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-blue-900/30 border border-blue-700 p-8 rounded-lg">
              <div className="text-6xl mb-4">🔄</div>
              <h3 className="text-2xl font-bold mb-4">Analyzing Your ECU File...</h3>
              <p className="text-gray-300 mb-6">
                Our AI is examining your file to detect available systems and compatibility.
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Services Section */}
      <section id="services" className="container mx-auto px-4 py-16">
        <h3 className="text-4xl font-bold text-center mb-4" data-testid="services-section">
          Our AI-Powered Services
        </h3>
        <p className="text-center text-gray-400 mb-12">Automated ECU file processing with advanced AI technology</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service) => (
            <div 
              key={service.id} 
              className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition transform hover:scale-105"
              data-testid={`service-card-${service.id}`}
            >
              <div className="text-5xl mb-4">{service.icon}</div>
              <h4 className="text-xl font-bold mb-2">{service.name}</h4>
              <p className="text-gray-400 mb-4">{service.description}</p>
              <div className="text-2xl font-bold text-blue-400">
                ${service.final_price.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">
                Processing cost: ${service.base_price.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-gray-800/50 py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-5xl mb-4">📤</div>
              <h4 className="text-xl font-bold mb-2">1. Upload File</h4>
              <p className="text-gray-400">Upload your ECU file (.bin, .hex, .ecu)</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h4 className="text-xl font-bold mb-2">2. Select Services</h4>
              <p className="text-gray-400">Choose DPF, AdBlue, or EGR removal</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">💳</div>
              <h4 className="text-xl font-bold mb-2">3. Pay Securely</h4>
              <p className="text-gray-400">Pay via PayPal</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">📥</div>
              <h4 className="text-xl font-bold mb-2">4. Download</h4>
              <p className="text-gray-400">Get your processed file in 24h</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12">Why Choose Us?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h4 className="text-xl font-bold mb-2">Fast Processing</h4>
              <p className="text-gray-400">Most files processed within 24-48 hours</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h4 className="text-xl font-bold mb-2">Secure & Tested</h4>
              <p className="text-gray-400">All solutions tested on real vehicles</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">💯</div>
              <h4 className="text-xl font-bold mb-2">Money-Back Guarantee</h4>
              <p className="text-gray-400">30-day refund if file doesn't work</p>
            </div>
          </div>
        </div>
      </section>

      {/* Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto" data-testid="request-form-modal">
          <div className="bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
            <button 
              onClick={() => { setShowForm(false); setShowPayment(false); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
              data-testid="close-form-btn"
            >
              ×
            </button>
            
            <h3 className="text-3xl font-bold mb-6">ECU File Processing Request</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload Section */}
              <div>
                <h4 className="text-xl font-semibold mb-4 text-blue-400">Upload ECU File *</h4>
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                    isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="text-5xl mb-4">📁</div>
                  <p className="text-lg mb-2">Drag & drop ECU files here</p>
                  <p className="text-sm text-gray-400 mb-4">or</p>
                  <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer inline-block">
                    Browse Files
                    <input 
                      type="file" 
                      multiple
                      accept=".bin,.hex,.ecu,.ori,.mod"
                      onChange={(e) => handleFileSelect(Array.from(e.target.files))}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-4">Supported: .bin, .hex, .ecu, .ori, .mod</p>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">📄</span>
                          <div>
                            <div className="font-semibold">{file.name}</div>
                            <div className="text-sm text-gray-400">{file.size}</div>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Information */}
              <div>
                <h4 className="text-xl font-semibold mb-4 text-blue-400">Customer Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="customer_name"
                    placeholder="Full Name *"
                    required
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="customer-name-input"
                  />
                  <input
                    type="email"
                    name="customer_email"
                    placeholder="Email Address *"
                    required
                    value={formData.customer_email}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="customer-email-input"
                  />
                    <input
                      type="tel"
                      name="customer_phone"
                      placeholder="Phone Number *"
                      required
                      value={formData.customer_phone}
                      onChange={handleInputChange}
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      data-testid="customer-phone-input"
                    />
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h4 className="text-xl font-semibold mb-4 text-blue-400">Vehicle Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <select
                    name="vehicle_make"
                    required
                    value={formData.vehicle_make}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="vehicle-make-select"
                  >
                    <option value="">Select Make *</option>
                    {vehicleMakes.map(make => (
                      <option key={make} value={make}>{make}</option>
                    ))}
                  </select>
                  
                  <select
                    name="vehicle_model"
                    required
                    value={formData.vehicle_model}
                    onChange={handleInputChange}
                    disabled={!formData.vehicle_make || availableModels.length === 0}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    data-testid="vehicle-model-select"
                  >
                    <option value="">Select Model *</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                    {!formData.vehicle_make && <option disabled>Select make first</option>}
                    {formData.vehicle_make && availableModels.length === 0 && (
                      <option value="other">Other (Please specify in notes)</option>
                    )}
                  </select>
                  
                  <input
                    type="number"
                    name="vehicle_year"
                    placeholder="Year *"
                    required
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    value={formData.vehicle_year}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="vehicle-year-input"
                  />
                  <input
                    type="text"
                    name="engine_type"
                    placeholder="Engine Type (e.g., 3.0L Diesel) *"
                    required
                    value={formData.engine_type}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="engine-type-input"
                  />
                  <input
                    type="text"
                    name="ecu_type"
                    placeholder="ECU Type (e.g., Bosch EDC17)"
                    value={formData.ecu_type}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="ecu-type-input"
                  />
                  <input
                    type="text"
                    name="vin"
                    placeholder="VIN (Optional)"
                    value={formData.vin}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="vin-input"
                  />
                </div>
              </div>

              {/* Service Selection */}
              <div>
                <h4 className="text-xl font-semibold mb-4 text-blue-400">Select Services *</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <label 
                      key={service.id} 
                      className="flex items-start space-x-3 bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition"
                      data-testid={`service-checkbox-${service.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selected_services.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="w-5 h-5 mt-1 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{service.icon} {service.name}</div>
                        <div className="text-sm text-gray-400 mb-1">{service.description}</div>
                        <div className="text-lg font-bold text-blue-400">${service.final_price.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Base: ${service.base_price} + 25%</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pricing Breakdown */}
              {pricingData && (
                <div className="bg-blue-900/30 border border-blue-700 p-6 rounded-lg">
                  <h4 className="text-xl font-semibold mb-4 text-blue-400">💰 Pricing Breakdown</h4>
                  <div className="space-y-2">
                    {pricingData.pricing_breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.service_name}</span>
                        <span>${item.final_price.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>Processing Cost:</span>
                        <span>${pricingData.base_total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>Service Fee (25%):</span>
                        <span>${pricingData.markup_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-2xl font-bold text-blue-400 mt-2">
                        <span>Total:</span>
                        <span>${pricingData.total_price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div>
                <h4 className="text-xl font-semibold mb-4 text-blue-400">Additional Information</h4>
                <textarea
                  name="issues_description"
                  placeholder="Describe current issues or symptoms"
                  rows="3"
                  value={formData.issues_description}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="issues-description-input"
                />
                <textarea
                  name="additional_notes"
                  placeholder="Any additional notes or specific requests"
                  rows="3"
                  value={formData.additional_notes}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-4"
                  data-testid="additional-notes-input"
                />
              </div>

              {!showPayment ? (
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-lg transition"
                  data-testid="proceed-to-payment-btn"
                >
                  Proceed to Payment
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-900/30 border border-green-700 p-4 rounded-lg text-center">
                    <p className="text-lg font-semibold mb-2">✅ Ready to Process</p>
                    <p className="text-sm text-gray-300">Complete payment to start processing your ECU file</p>
                  </div>
                  
                  <PayPalScriptProvider options={{ "client-id": PAYPAL_CLIENT_ID, currency: "USD" }}>
                    <PayPalButtons
                      style={{ layout: "vertical" }}
                      createOrder={createOrder}
                      onApprove={onApprove}
                      disabled={loading}
                    />
                  </PayPalScriptProvider>
                  
                  <p className="text-center text-sm text-gray-400">
                    Secure payment powered by PayPal
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2024 DPF AdBlue Removal Services. AI-powered ECU file processing</p>
          <p className="text-sm mt-2">⚠️ For off-road and racing use only. Check local regulations.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;