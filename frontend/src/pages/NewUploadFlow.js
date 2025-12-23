import { useState, useEffect } from 'react';
import axios from 'axios';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const PAYPAL_CLIENT_ID = 'AdVyLaCwPuU1Adn3p-1HCu07rg-LvTUi2H30M-7-aCT0fuW3Q1o8ZeqFg7jnUaPo4ZTxCvKSuZQ6kLYW';

const NewUploadFlow = () => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Processing, 3: Results, 4: Payment, 5: Download
  
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
  
  // Customer info
  const [vehicleMakes, setVehicleMakes] = useState([]);
  const [vehicleModels, setVehicleModels] = useState({});
  const [vehicleType, setVehicleType] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    engine_type: ''
  });
  
  // Download state
  const [orderId, setOrderId] = useState(null);
  const [downloadLinks, setDownloadLinks] = useState([]);

  useEffect(() => {
    fetchVehicleData();
  }, []);

  const fetchVehicleData = async () => {
    try {
      const response = await axios.get(`${API}/vehicles`);
      setVehicleMakes(response.data.makes);
      setVehicleModels(response.data.models);
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
    }
  };

  const vehicleTypes = {
    'Car': ['Audi', 'BMW', 'Chevrolet', 'Dodge', 'Ford', 'GMC', 'Honda', 'Jeep', 'Mercedes-Benz', 'Nissan', 'RAM', 'Toyota', 'Volkswagen'],
    'Truck': ['Peterbilt', 'Kenworth', 'Freightliner', 'Mack', 'International', 'Western Star', 'Volvo Trucks', 'Scania', 'MAN', 'DAF', 'Iveco'],
    'Bus': ['Blue Bird', 'Thomas Built', 'IC Bus', 'New Flyer', 'Gillig', 'Prevost', 'Mercedes-Benz Bus', 'Volvo Bus']
  };

  const handleFileSelect = (files) => {
    const file = files[0];
    if (!file) return;
    
    const validExtensions = ['.bin', '.hex', '.ecu', '.ori', '.mod'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      alert('Invalid file type. Only ECU files (.bin, .hex, .ecu, .ori, .mod) are allowed.');
      return;
    }
    
    setUploadedFile(file);
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

  const startProcessing = async () => {
    if (!uploadedFile) return;
    
    setStep(2);
    setProcessing(true);
    setProcessingProgress(10);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      
      setProcessingProgress(30);
      
      // Call new API that processes ALL options
      const response = await axios.post(`${API}/analyze-and-process-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setProcessingProgress(100);
      
      if (response.data.success) {
        setFileId(response.data.file_id);
        setAnalysisResult(response.data);
        setAvailableOptions(response.data.available_options);
        
        setTimeout(() => {
          setStep(3); // Show results
          setProcessing(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
      setProcessing(false);
      setStep(1);
    }
  };

  const handleServiceToggle = (serviceId, price) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
      setTotalPrice(prev => prev - price);
    } else {
      setSelectedServices(prev => [...prev, serviceId]);
      setTotalPrice(prev => prev + price);
    }
  };

  const proceedToPayment = () => {
    if (selectedServices.length === 0) {
      alert('Please select at least one service');
      return;
    }
    setStep(4);
  };

  const createOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [{
        amount: { value: totalPrice.toFixed(2) },
        description: `ECU File Processing - ${selectedServices.length} service(s)`
      }]
    });
  };

  const onApprove = async (data, actions) => {
    const order = await actions.order.capture();
    
    try {
      // Create purchase record
      const purchaseData = new FormData();
      purchaseData.append('file_id', fileId);
      purchaseData.append('selected_services', JSON.stringify(selectedServices));
      purchaseData.append('customer_name', customerInfo.customer_name);
      purchaseData.append('customer_email', customerInfo.customer_email);
      purchaseData.append('customer_phone', customerInfo.customer_phone);
      purchaseData.append('vehicle_info', JSON.stringify(customerInfo));
      purchaseData.append('paypal_order_id', order.id);
      purchaseData.append('paypal_transaction_id', order.purchase_units[0].payments.captures[0].id);
      
      const response = await axios.post(`${API}/purchase-processed-file`, purchaseData);
      
      if (response.data.success) {
        setOrderId(response.data.order_id);
        setDownloadLinks(response.data.download_links);
        setStep(5); // Download page
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Payment successful but error creating download. Contact support with PayPal order ID: ' + order.id);
    }
  };

  const availableMakes = vehicleType ? vehicleTypes[vehicleType] : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔧</span>
            <h1 className="text-2xl font-bold">ECU Flash Service</h1>
          </div>
          <a href="/admin" className="text-gray-400 hover:text-white">Admin</a>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* STEP 1: Upload File */}
        {step === 1 && (
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-4xl font-bold mb-4 text-center">Upload Your ECU File</h2>
            <p className="text-center text-gray-400 mb-8">AI will analyze and process your file instantly</p>
            
            <div 
              className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
                isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-6xl mb-4">📁</div>
              {!uploadedFile ? (
                <>
                  <p className="text-xl mb-4">Drag & drop your ECU file here</p>
                  <p className="text-gray-400 mb-4">or</p>
                  <label className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg cursor-pointer inline-block text-lg font-semibold">
                    Browse Files
                    <input 
                      type="file" 
                      accept=".bin,.hex,.ecu,.ori,.mod"
                      onChange={(e) => handleFileSelect(Array.from(e.target.files))}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-4">Supported: .bin, .hex, .ecu, .ori, .mod</p>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="text-5xl">✅</div>
                  <div className="bg-gray-700 p-4 rounded-lg inline-block">
                    <div className="font-semibold text-lg">{uploadedFile.name}</div>
                    <div className="text-gray-400">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <div className="flex gap-4 justify-center mt-6">
                    <button
                      onClick={startProcessing}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold text-lg"
                    >
                      Start AI Processing
                    </button>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg"
                    >
                      Change File
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Processing */}
        {step === 2 && (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-6xl mb-6 animate-bounce">🤖</div>
            <h2 className="text-3xl font-bold mb-4">AI is Processing Your File...</h2>
            <p className="text-gray-400 mb-8">Analyzing ECU type and creating all available options</p>
            
            <div className="max-w-md mx-auto">
              <div className="bg-gray-700 rounded-full h-4 mb-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">{processingProgress}% Complete</p>
            </div>
            
            <div className="mt-8 space-y-2 text-left max-w-md mx-auto text-sm text-gray-400">
              <div>✓ Analyzing ECU type...</div>
              <div>✓ Detecting available systems...</div>
              <div>✓ Processing DPF removal...</div>
              <div>✓ Processing AdBlue removal...</div>
              <div>✓ Processing EGR removal...</div>
              <div>✓ Processing other services...</div>
            </div>
          </div>
        )}

        {/* STEP 3: Results - Show Available Options */}
        {step === 3 && analysisResult && (
          <div className="bg-gray-800 rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold mb-2">Processing Complete!</h2>
              <p className="text-gray-400">Your file has been analyzed and processed</p>
            </div>

            {/* File Info */}
            <div className="bg-gray-900 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">File Information</h3>
              <div className="text-sm space-y-1">
                <div>📄 File: {analysisResult.original_filename}</div>
                <div>💾 Size: {analysisResult.file_size_mb.toFixed(2)} MB</div>
                <div>🎯 Detection Confidence: {(analysisResult.ecu_confidence * 100).toFixed(0)}%</div>
              </div>
            </div>

            {/* Available Services */}
            <h3 className="text-2xl font-bold mb-4">Select Services You Want:</h3>
            <p className="text-gray-400 mb-6">We processed all options. Select what you want to purchase:</p>
            
            <div className="space-y-3 mb-6">
              {availableOptions.map((option) => (
                <label 
                  key={option.service_id}
                  className="flex items-center justify-between bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(option.service_id)}
                      onChange={() => handleServiceToggle(option.service_id, option.price)}
                      className="w-5 h-5"
                    />
                    <div>
                      <div className="font-semibold text-lg">{option.service_name}</div>
                      <div className="text-sm text-gray-400">
                        Confidence: {(option.confidence * 100).toFixed(0)}% • 
                        Level: {option.confidence_level}
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-400">${option.price.toFixed(2)}</div>
                </label>
              ))}
            </div>

            {/* Total */}
            {selectedServices.length > 0 && (
              <div className="bg-blue-900/30 border border-blue-700 p-6 rounded-lg mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold">Total:</span>
                  <span className="text-3xl font-bold text-blue-400">${totalPrice.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  {selectedServices.length} service(s) selected • Files ready for instant download after payment
                </p>
              </div>
            )}

            <button
              onClick={proceedToPayment}
              disabled={selectedServices.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold text-xl"
            >
              Continue to Payment →
            </button>
            
            <p className="text-center text-sm text-gray-400 mt-4">
              💡 Files are already processed! Payment unlocks instant download.
            </p>
          </div>
        )}

        {/* STEP 4: Payment & Customer Info */}
        {step === 4 && (
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-3xl font-bold mb-8">Complete Your Order</h2>

            {/* Order Summary */}
            <div className="bg-gray-900 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
              <div className="space-y-2">
                {availableOptions.filter(opt => selectedServices.includes(opt.service_id)).map(opt => (
                  <div key={opt.service_id} className="flex justify-between">
                    <span>{opt.service_name}</span>
                    <span>${opt.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between text-2xl font-bold text-blue-400">
                    <span>Total:</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Vehicle Information</h3>
              <div className="space-y-4">
                <select
                  value={vehicleType}
                  onChange={(e) => {
                    setVehicleType(e.target.value);
                    setCustomerInfo({...customerInfo, vehicle_make: '', vehicle_model: ''});
                  }}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg"
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
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg disabled:opacity-50"
                  required
                >
                  <option value="">Select Brand *</option>
                  {availableMakes.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={customerInfo.vehicle_model}
                  onChange={(e) => setCustomerInfo({...customerInfo, vehicle_model: e.target.value})}
                  placeholder="Model *"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg"
                  required
                />

                <select
                  value={customerInfo.vehicle_year}
                  onChange={(e) => setCustomerInfo({...customerInfo, vehicle_year: e.target.value})}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg"
                  required
                >
                  {Array.from({length: 36}, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={customerInfo.engine_type}
                  onChange={(e) => setCustomerInfo({...customerInfo, engine_type: e.target.value})}
                  placeholder="Engine Type (e.g., 3.0L Diesel) *"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg"
                  required
                />
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={customerInfo.customer_name}
                  onChange={(e) => setCustomerInfo({...customerInfo, customer_name: e.target.value})}
                  placeholder="Full Name *"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg"
                  required
                />
                <input
                  type="email"
                  value={customerInfo.customer_email}
                  onChange={(e) => setCustomerInfo({...customerInfo, customer_email: e.target.value})}
                  placeholder="Email Address *"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg"
                  required
                />
                <input
                  type="tel"
                  value={customerInfo.customer_phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, customer_phone: e.target.value})}
                  placeholder="Phone with Country Code (e.g., +679 1234567) *"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg"
                  required
                />
              </div>
            </div>

            {/* PayPal Payment */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Complete Payment</h3>
              <PayPalScriptProvider options={{ "client-id": PAYPAL_CLIENT_ID, currency: "USD" }}>
                <PayPalButtons
                  style={{ layout: "vertical" }}
                  createOrder={createOrder}
                  onApprove={onApprove}
                  disabled={!customerInfo.customer_name || !customerInfo.customer_email || !customerInfo.vehicle_make}
                />
              </PayPalScriptProvider>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg"
            >
              ← Back to Selection
            </button>
          </div>
        )}

        {/* STEP 5: Download */}
        {step === 5 && (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-4xl font-bold mb-4">Payment Successful!</h2>
            <p className="text-xl text-gray-300 mb-8">Your processed files are ready for download</p>

            <div className="bg-gray-900 p-6 rounded-lg mb-6 text-left">
              <h3 className="text-xl font-semibold mb-4">Your Processed Files:</h3>
              <div className="space-y-3">
                {availableOptions.filter(opt => selectedServices.includes(opt.service_id)).map((opt, index) => (
                  <div key={opt.service_id} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                    <div>
                      <div className="font-semibold">{opt.service_name}</div>
                      <div className="text-sm text-gray-400">{analysisResult.original_filename}</div>
                    </div>
                    <a
                      href={`${API}/download-purchased/${fileId}/${opt.service_id}`}
                      download
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg mb-6">
              <p className="text-blue-300">
                📧 <strong>Download links sent to:</strong> {customerInfo.customer_email}<br/>
                💾 Keep your original file as backup<br/>
                ⚠️ Test on vehicle before permanent installation
              </p>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-400">Order ID:</p>
              <p className="font-mono">{orderId}</p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold"
            >
              Process Another File
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 py-6 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2024 ECU Flash Service | AI-Powered ECU Processing</p>
          <p className="text-sm mt-2">⚠️ For off-road and racing use only</p>
        </div>
      </footer>
    </div>
  );
};

export default NewUploadFlow;
