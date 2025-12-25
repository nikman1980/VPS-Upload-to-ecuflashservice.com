import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerPortal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Login state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOrderId, setLoginOrderId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Order state
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Messages state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const doLogin = async (email, orderId) => {
    if (!email || !orderId) {
      setLoginError('Please enter both email and order number');
      return;
    }
    
    setLoginLoading(true);
    setLoginError('');
    
    try {
      const response = await axios.post(`${API}/portal/login`, {
        email: email.trim(),
        order_id: orderId.trim()
      });
      
      if (response.data.success) {
        setOrder(response.data.order);
        setMessages(response.data.messages || []);
        setIsLoggedIn(true);
        // Update URL without reload
        window.history.replaceState({}, '', `/portal?order=${orderId}&email=${encodeURIComponent(email)}`);
      } else {
        setLoginError(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.response?.data?.detail || 'Invalid email or order number');
    } finally {
      setLoginLoading(false);
    }
  };

  // Check URL params for auto-login
  useEffect(() => {
    const orderId = searchParams.get('order');
    const email = searchParams.get('email');
    
    if (orderId && email) {
      setLoginEmail(email);
      setLoginOrderId(orderId);
      doLogin(email, orderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleLogin = async (email = loginEmail, orderId = loginOrderId) => {
    doLogin(email, orderId);
    setLoginError('');
    
    try {
      const response = await axios.post(`${API}/portal/login`, {
        email: email.trim(),
        order_id: orderId.trim()
      });
      
      if (response.data.success) {
        setOrder(response.data.order);
        setMessages(response.data.messages || []);
        setIsLoggedIn(true);
        // Update URL without reload
        window.history.replaceState({}, '', `/portal?order=${orderId}&email=${encodeURIComponent(email)}`);
      } else {
        setLoginError(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.response?.data?.detail || 'Invalid email or order number');
    } finally {
      setLoginLoading(false);
    }
  };

  const refreshOrder = async () => {
    if (!order?.id) return;
    
    try {
      const response = await axios.get(`${API}/portal/order/${order.id}?email=${encodeURIComponent(loginEmail)}`);
      setOrder(response.data.order);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !order?.id) return;
    
    setSendingMessage(true);
    try {
      const response = await axios.post(`${API}/portal/message`, {
        order_id: order.id,
        email: loginEmail,
        message: newMessage.trim(),
        sender: 'customer'
      });
      
      if (response.data.success) {
        setMessages([...messages, response.data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Send message error:', error);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !order?.id) return;
    
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order_id', order.id);
    formData.append('email', loginEmail);
    
    try {
      const response = await axios.post(`${API}/portal/upload-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setUploadedFile(response.data.file);
        refreshOrder();
        alert('File uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const response = await axios.get(
        `${API}/portal/download/${order.id}/${fileId}?email=${encodeURIComponent(loginEmail)}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  const getStatusInfo = (status) => {
    const statuses = {
      'pending_payment': { label: 'Pending Payment', color: 'bg-yellow-500', icon: '💳' },
      'paid': { label: 'Paid - Awaiting Processing', color: 'bg-blue-500', icon: '✅' },
      'processing': { label: 'Processing', color: 'bg-cyan-500', icon: '⚙️' },
      'completed': { label: 'Completed', color: 'bg-green-500', icon: '✅' },
      'cancelled': { label: 'Cancelled', color: 'bg-red-500', icon: '❌' },
      'refunded': { label: 'Refunded', color: 'bg-orange-500', icon: '↩️' }
    };
    return statuses[status] || { label: status, color: 'bg-gray-500', icon: '❓' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mb-4">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Customer Portal</h1>
            <p className="text-slate-400 mt-2">Access your order and files</p>
          </div>
          
          {/* Login Card */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8">
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Order Number</label>
                  <input
                    type="text"
                    value={loginOrderId}
                    onChange={(e) => setLoginOrderId(e.target.value)}
                    placeholder="Enter your order ID"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                
                {loginError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                    {loginError}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {loginLoading ? 'Logging in...' : 'Access My Order'}
                </button>
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-slate-400 hover:text-white transition"
              >
                ← Back to Home
              </button>
            </div>
          </div>
          
          <p className="text-center text-slate-500 text-sm mt-6">
            Check your email for order details
          </p>
        </div>
      </div>
    );
  }

  // Portal Dashboard
  const statusInfo = getStatusInfo(order?.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Customer Portal</h1>
                <p className="text-xs text-slate-400">Order #{order?.id?.substring(0, 8)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshOrder}
                className="text-slate-400 hover:text-white transition p-2"
                title="Refresh"
              >
                🔄
              </button>
              <button
                onClick={() => { setIsLoggedIn(false); setOrder(null); }}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Banner */}
            <div className={`${statusInfo.color} rounded-2xl p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-4xl">{statusInfo.icon}</span>
                  <div>
                    <h2 className="text-2xl font-bold">{statusInfo.label}</h2>
                    <p className="opacity-90">Last updated: {formatDate(order?.updated_at)}</p>
                  </div>
                </div>
                {order?.status === 'completed' && (
                  <div className="text-right">
                    <div className="text-sm opacity-80">Ready for Download</div>
                    <div className="text-lg font-bold">✅ File Ready</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Order Details */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">📋</span> Order Details
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Vehicle Info */}
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Vehicle</h4>
                  <p className="text-white font-semibold">
                    {order?.vehicle_year} {order?.vehicle_make} {order?.vehicle_model}
                  </p>
                  {order?.engine_type && (
                    <p className="text-slate-400 text-sm mt-1">{order?.engine_type}</p>
                  )}
                  {order?.ecu_type && (
                    <p className="text-cyan-400 text-sm mt-1">ECU: {order?.ecu_type}</p>
                  )}
                </div>
                
                {/* Payment Info */}
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Payment</h4>
                  <p className="text-green-400 font-bold text-2xl">${order?.total_price?.toFixed(2)}</p>
                  <p className="text-slate-400 text-sm">
                    {order?.payment_status === 'completed' ? '✅ Paid' : '⏳ ' + order?.payment_status}
                  </p>
                </div>
              </div>
              
              {/* Services */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Services Purchased</h4>
                <div className="flex flex-wrap gap-2">
                  {order?.selected_services?.map((service, idx) => (
                    <span key={idx} className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-sm">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Files Section */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">📁</span> Files
              </h3>
              
              {/* Uploaded Files (Original) */}
              {order?.uploaded_files?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-400 mb-3">Original Files</h4>
                  <div className="space-y-2">
                    {order.uploaded_files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-700/30 rounded-xl p-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">📄</span>
                          <div>
                            <p className="text-white font-medium">{file.original_filename}</p>
                            <p className="text-slate-400 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <span className="text-slate-500 text-sm">Uploaded</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Processed Files (Download) */}
              {order?.processed_files?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-green-400 mb-3">✅ Processed Files (Ready for Download)</h4>
                  <div className="space-y-2">
                    {order.processed_files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">✅</span>
                          <div>
                            <p className="text-white font-medium">{file.processed_filename || file.original_filename}</p>
                            <p className="text-green-400 text-sm">Ready for download</p>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadFile(file.file_id, file.processed_filename || 'processed_file.bin')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center space-x-2"
                        >
                          <span>📥</span>
                          <span>Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Upload New File */}
              {order?.status !== 'completed' && (
                <div className="border-t border-slate-700 pt-6">
                  <h4 className="text-sm font-medium text-slate-400 mb-3">Upload Additional File</h4>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-xl p-8 cursor-pointer hover:border-blue-500 hover:bg-slate-700/30 transition">
                    <input
                      type="file"
                      className="hidden"
                      accept=".bin,.hex,.ecu,.ori,.mod"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                    {uploadingFile ? (
                      <div className="text-slate-400">Uploading...</div>
                    ) : (
                      <>
                        <span className="text-4xl mb-2">📤</span>
                        <span className="text-slate-400">Click to upload file</span>
                        <span className="text-slate-500 text-sm mt-1">.bin, .hex, .ecu, .ori, .mod</span>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>
            
            {/* Communication Section */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">💬</span> Messages
              </h3>
              
              {/* Messages List */}
              <div className="space-y-4 max-h-96 overflow-y-auto mb-6 pr-2">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <span className="text-4xl block mb-2">💬</span>
                    No messages yet. Send a message to our team!
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 ${
                          msg.sender === 'customer'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-2 ${
                          msg.sender === 'customer' ? 'text-blue-200' : 'text-slate-400'
                        }`}>
                          {formatDate(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Send Message */}
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>Send</span>
                  <span>📤</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            
            {/* Order Summary Card */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID</span>
                  <span className="text-white font-mono text-sm">{order?.id?.substring(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created</span>
                  <span className="text-white text-sm">{formatDate(order?.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Services</span>
                  <span className="text-white">{order?.selected_services?.length || 0}</span>
                </div>
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total</span>
                    <span className="text-green-400 font-bold text-xl">${order?.total_price?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Timeline */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Status Timeline</h3>
              
              <div className="space-y-4">
                {[
                  { status: 'paid', label: 'Order Received', icon: '📝' },
                  { status: 'processing', label: 'Processing', icon: '⚙️' },
                  { status: 'completed', label: 'Completed', icon: '✅' }
                ].map((step, idx) => {
                  const isActive = order?.status === step.status;
                  const isPast = ['pending_payment', 'paid', 'processing', 'completed'].indexOf(order?.status) >= 
                                 ['pending_payment', 'paid', 'processing', 'completed'].indexOf(step.status);
                  
                  return (
                    <div key={idx} className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isPast ? 'bg-green-500' : 'bg-slate-700'
                      }`}>
                        <span className="text-lg">{step.icon}</span>
                      </div>
                      <div>
                        <p className={`font-medium ${isPast ? 'text-white' : 'text-slate-500'}`}>
                          {step.label}
                        </p>
                        {isActive && (
                          <p className="text-green-400 text-sm">Current status</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Help Card */}
            <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Need Help?</h3>
              <p className="text-slate-400 text-sm mb-4">
                Our team typically responds within 20-60 minutes during business hours.
              </p>
              <a
                href="mailto:admin@ecuflashservice.com"
                className="text-blue-400 hover:text-blue-300 flex items-center space-x-2"
              >
                <span>📧</span>
                <span>admin@ecuflashservice.com</span>
              </a>
            </div>
            
            {/* Back to Home */}
            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl transition"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
