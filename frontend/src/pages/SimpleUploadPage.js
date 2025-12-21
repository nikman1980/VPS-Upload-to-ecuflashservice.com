import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const PAYPAL_CLIENT_ID = 'test';

const SimpleUploadPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Upload, 2: Payment, 3: Processing
  
  // Vehicle data
  const [vehicleMakes, setVehicleMakes] = useState([]);
  const [vehicleModels, setVehicleModels] = useState({});
  const [services, setServices] = useState([]);
  
  // Form data - simplified
  const [vehicleType, setVehicleType] = useState(''); // Car, Truck, Bus
  const [formData, setFormData] = useState({
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    engine_type: '',
    ecu_type: '',
    selected_services: [],
    customer_name: '',
    customer_email: '',
    customer_phone: ''
  });
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pricingData, setPricingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, vehiclesRes] = await Promise.all([
        axios.get(`${API}/services`),
        axios.get(`${API}/vehicles`)
      ]);
      setServices(servicesRes.data);
      setVehicleMakes(vehiclesRes.data.makes);
      setVehicleModels(vehiclesRes.data.models);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Vehicle types with their makes
  const vehicleTypes = {
    'Car': ['Audi', 'BMW', 'Chevrolet', 'Dodge', 'Ford', 'GMC', 'Honda', 'Jeep', 'Mercedes-Benz', 'Nissan', 'RAM', 'Toyota', 'Volkswagen'],
    'Truck': ['Peterbilt', 'Kenworth', 'Freightliner', 'Mack', 'International', 'Western Star', 'Volvo Trucks', 'Scania', 'MAN', 'DAF', 'Iveco', 'Hino', 'Isuzu Trucks'],
    'Bus': ['Blue Bird', 'Thomas Built', 'IC Bus', 'New Flyer', 'Gillig', 'MCI (Motor Coach)', 'Prevost', 'Van Hool', 'Mercedes-Benz Bus', 'Volvo Bus', 'Scania Bus']
  };

  const handleVehicleTypeChange = (type) => {
    setVehicleType(type);
    setFormData({...formData, vehicle_make: '', vehicle_model: ''});
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'vehicle_make') {
      setFormData(prev => ({ ...prev, vehicle_model: '' }));
    }
  };

  const handleServiceToggle = async (serviceId) => {
    const updatedServices = formData.selected_services.includes(serviceId)
      ? formData.selected_services.filter(id => id !== serviceId)
      : [...formData.selected_services, serviceId];
    
    setFormData(prev => ({ ...prev, selected_services: updatedServices }));
    
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
        alert(`Invalid file type: ${file.name}. Only ECU files allowed.`);
        continue;
      }
      
      setUploadedFiles(prev => [...prev, {
        file: file,
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB'
      }]);
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

  const handleStepOneSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.vehicle_make || !formData.vehicle_model) {
      alert('Please select vehicle make and model');
      return;
    }
    
    if (formData.selected_services.length === 0) {
      alert('Please select at least one service');
      return;
    }
    
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one ECU file');
      return;
    }
    
    setStep(2); // Move to payment
  };

  const createOrder = (data, actions) => {
    if (!pricingData) return;
    
    return actions.order.create({
      purchase_units: [{
        amount: {
          value: pricingData.total_price.toFixed(2),
        },
        description: `ECU Processing - ${formData.selected_services.length} service(s)`
      }],
    });
  };

  const onApprove = async (data, actions) => {
    const order = await actions.order.capture();
    
    setLoading(true);
    setStep(3); // Move to processing
    
    try {
      const formDataObj = new FormData();
      formDataObj.append('request_data', JSON.stringify(formData));
      
      uploadedFiles.forEach(file => {
        formDataObj.append('files', file.file);
      });
      
      const response = await axios.post(`${API}/service-requests`, formDataObj, {
        headers: {'Content-Type': 'multipart/form-data'}
      });
      
      await axios.patch(`${API}/service-requests/${response.data.id}/payment`, {
        paypal_order_id: order.id,
        paypal_transaction_id: order.purchase_units[0].payments.captures[0].id,
        payment_status: 'completed'
      });
      
      setRequestId(response.data.id);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing request');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const availableMakes = vehicleType ? vehicleTypes[vehicleType] : [];
  const availableModels = formData.vehicle_make && vehicleModels[formData.vehicle_make] ? vehicleModels[formData.vehicle_make] : [];

  return (
    <div className=\"min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white\">
      {/* Simple Header */}
      <header className=\"bg-gray-900/50 backdrop-blur-sm border-b border-gray-700\">
        <div className=\"container mx-auto px-4 py-4 flex justify-between items-center\">
          <div className=\"flex items-center space-x-2\">
            <span className=\"text-2xl\">🔧</span>
            <h1 className=\"text-2xl font-bold\">ECU File Processing</h1>
          </div>
          <a href=\"/admin\" className=\"text-gray-400 hover:text-white\">Admin</a>
        </div>
      </header>

      <div className=\"container mx-auto px-4 py-8 max-w-4xl\">
        {/* Step 1: Upload & Select */}
        {step === 1 && (
          <div className=\"bg-gray-800 rounded-lg p-8\">
            <h2 className=\"text-3xl font-bold mb-8 text-center\">Upload ECU File for Processing</h2>
            
            <form onSubmit={handleStepOneSubmit} className=\"space-y-6\">
              {/* File Upload - First! */}
              <div>
                <label className=\"block text-sm font-semibold mb-2\">ECU File *</label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                    isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className=\"text-5xl mb-4\">📁</div>
                  <p className=\"text-lg mb-2\">Drag & drop your ECU file here</p>
                  <p className=\"text-sm text-gray-400 mb-4\">or</p>
                  <label className=\"bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg cursor-pointer inline-block\">
                    Browse Files
                    <input 
                      type=\"file\" 
                      multiple
                      accept=\".bin,.hex,.ecu,.ori,.mod\"
                      onChange={(e) => handleFileSelect(Array.from(e.target.files))}
                      className=\"hidden\"
                    />
                  </label>
                  <p className=\"text-xs text-gray-500 mt-4\">.bin, .hex, .ecu, .ori, .mod</p>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className=\"mt-4 space-y-2\">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className=\"flex items-center justify-between bg-gray-700 p-3 rounded\">
                        <div className=\"flex items-center space-x-3\">
                          <span className=\"text-2xl\">📄</span>
                          <div>
                            <div className=\"font-semibold\">{file.name}</div>
                            <div className=\"text-sm text-gray-400\">{file.size}</div>
                          </div>
                        </div>
                        <button 
                          type=\"button\"
                          onClick={() => removeFile(index)}
                          className=\"text-red-400 hover:text-red-300\"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle Type */}
              <div>
                <label className=\"block text-sm font-semibold mb-2\">Vehicle Type *</label>
                <select
                  value={vehicleType}
                  onChange={(e) => handleVehicleTypeChange(e.target.value)}
                  className=\"w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg\"
                  required
                >
                  <option value=\"\">Select Vehicle Type</option>
                  <option value=\"Car\">Car / Pickup Truck</option>
                  <option value=\"Truck\">Heavy Duty Truck</option>
                  <option value=\"Bus\">Bus / Motor Coach</option>
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className=\"block text-sm font-semibold mb-2\">Brand *</label>
                <select
                  value={formData.vehicle_make}
                  onChange={(e) => handleInputChange('vehicle_make', e.target.value)}
                  disabled={!vehicleType}
                  className=\"w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-lg\"
                  required
                >
                  <option value=\"\">Select Brand</option>
                  {availableMakes.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className=\"block text-sm font-semibold mb-2\">Model *</label>
                <select
                  value={formData.vehicle_model}
                  onChange={(e) => handleInputChange('vehicle_model', e.target.value)}
                  disabled={!formData.vehicle_make}
                  className=\"w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-lg\"
                  required
                >
                  <option value=\"\">Select Model</option>
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                  {formData.vehicle_make && availableModels.length === 0 && (
                    <option value=\"other\">Other (specify in notes)</option>
                  )}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className=\"block text-sm font-semibold mb-2\">Year *</label>
                <select
                  value={formData.vehicle_year}
                  onChange={(e) => handleInputChange('vehicle_year', e.target.value)}
                  className=\"w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg\"
                  required
                >
                  {Array.from({length: 36}, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Engine Type */}
              <div>
                <label className=\"block text-sm font-semibold mb-2\">Engine Type *</label>
                <input
                  type=\"text\"
                  value={formData.engine_type}
                  onChange={(e) => handleInputChange('engine_type', e.target.value)}
                  placeholder=\"e.g., 3.0L Diesel, Cummins ISX\"
                  className=\"w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg\"
                  required
                />
              </div>

              {/* ECU Type */}
              <div>
                <label className=\"block text-sm font-semibold mb-2\">ECU Type (Optional)</label>
                <input
                  type=\"text\"
                  value={formData.ecu_type}
                  onChange={(e) => handleInputChange('ecu_type', e.target.value)}
                  placeholder=\"e.g., Bosch EDC17, Delphi DCM\"
                  className=\"w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg\"
                />
              </div>

              {/* Service Selection */}
              <div>
                <label className=\"block text-sm font-semibold mb-4\">Select Services to Remove *</label>
                <div className=\"grid md:grid-cols-2 gap-4\">
                  {services.map((service) => (
                    <label 
                      key={service.id} 
                      className=\"flex items-start space-x-3 bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition\"
                    >
                      <input
                        type=\"checkbox\"
                        checked={formData.selected_services.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className=\"w-5 h-5 mt-1\"
                      />
                      <div className=\"flex-1\">
                        <div className=\"font-semibold text-lg\">{service.icon} {service.name}</div>
                        <div className=\"text-blue-400 font-bold mt-1\">${service.final_price.toFixed(2)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Display */}
              {pricingData && (
                <div className=\"bg-blue-900/30 border border-blue-700 p-6 rounded-lg\">
                  <h4 className=\"text-xl font-semibold mb-3\">Total Cost</h4>
                  <div className=\"flex justify-between items-center\">
                    <span className=\"text-lg\">Total:</span>
                    <span className=\"text-3xl font-bold text-blue-400\">${pricingData.total_price.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                type=\"submit\"
                className=\"w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-semibold text-xl transition\"
              >
                Continue to Payment
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <div className=\"bg-gray-800 rounded-lg p-8\">
            <h2 className=\"text-3xl font-bold mb-8 text-center\">Complete Payment</h2>
            
            <div className=\"mb-8\">
              <h3 className=\"text-xl font-semibold mb-4\">Order Summary</h3>
              <div className=\"bg-gray-700 p-4 rounded-lg space-y-2\">
                <div className=\"flex justify-between\">
                  <span>Vehicle:</span>
                  <span>{formData.vehicle_year} {formData.vehicle_make} {formData.vehicle_model}</span>
                </div>
                <div className=\"flex justify-between\">
                  <span>Services:</span>
                  <span>{formData.selected_services.length} service(s)</span>
                </div>
                <div className=\"flex justify-between\">
                  <span>Files:</span>
                  <span>{uploadedFiles.length} file(s)</span>
                </div>
                <div className=\"border-t border-gray-600 pt-2 mt-2\">
                  <div className=\"flex justify-between text-2xl font-bold text-blue-400\">
                    <span>Total:</span>
                    <span>${pricingData?.total_price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className=\"mb-6\">
              <h3 className=\"text-xl font-semibold mb-4\">Contact Information</h3>
              <div className=\"space-y-4\">
                <input
                  type=\"text\"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  placeholder=\"Full Name *\"
                  className=\"w-full bg-gray-700 text-white px-4 py-3 rounded-lg\"
                  required
                />
                <input
                  type=\"email\"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  placeholder=\"Email Address *\"
                  className=\"w-full bg-gray-700 text-white px-4 py-3 rounded-lg\"
                  required
                />
                <input
                  type=\"tel\"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  placeholder=\"Phone Number *\"
                  className=\"w-full bg-gray-700 text-white px-4 py-3 rounded-lg\"
                  required
                />
              </div>
            </div>

            <PayPalScriptProvider options={{ \"client-id\": PAYPAL_CLIENT_ID, currency: \"USD\" }}>
              <PayPalButtons
                style={{ layout: \"vertical\" }}
                createOrder={createOrder}
                onApprove={onApprove}
                disabled={!formData.customer_name || !formData.customer_email || !formData.customer_phone}
              />
            </PayPalScriptProvider>

            <button
              onClick={() => setStep(1)}
              className=\"w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg\"
            >
              ← Go Back
            </button>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 3 && (
          <div className=\"bg-gray-800 rounded-lg p-8 text-center\">
            <div className=\"text-6xl mb-6\">✅</div>
            <h2 className=\"text-3xl font-bold mb-4\">Payment Successful!</h2>
            <p className=\"text-xl text-gray-300 mb-8\">
              Your ECU file is being processed by our AI system
            </p>
            
            <div className=\"bg-blue-900/30 border border-blue-700 p-6 rounded-lg mb-8\">
              <p className=\"text-blue-300\">
                <strong>What's Next?</strong><br/>
                Processing typically takes 1-2 hours. You'll receive an email with the download link when ready.
              </p>
            </div>

            {requestId && (
              <div className=\"bg-gray-700 p-4 rounded-lg mb-6\">
                <p className=\"text-sm text-gray-400\">Request ID:</p>
                <p className=\"font-mono text-lg\">{requestId}</p>
              </div>
            )}

            <button
              onClick={() => navigate(`/success/${requestId}`)}
              className=\"bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold\"
            >
              View Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleUploadPage;
