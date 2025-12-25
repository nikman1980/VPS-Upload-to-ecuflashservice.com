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
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Orders state (all orders for this email)
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Messages state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);

  // Check URL params for auto-login
  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      setLoginEmail(email);
      doLogin(email);
    }
  }, [searchParams]);

  const doLogin = async (email) => {
    if (!email) {
      setLoginError('Please enter your email address');
      return;
    }
    
    setLoginLoading(true);
    setLoginError('');
    
    try {
      const response = await axios.post(`${API}/portal/login-email`, {
        email: email.trim()
      });
      
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setIsLoggedIn(true);
        // Auto-select first order if any
        if (response.data.orders?.length > 0) {
          setSelectedOrder(response.data.orders[0]);
          setMessages(response.data.orders[0].messages || []);
        }
        window.history.replaceState({}, '', `/portal?email=${encodeURIComponent(email)}`);
      } else {
        setLoginError(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.response?.data?.detail || 'No orders found for this email');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    doLogin(loginEmail);
  };

  const selectOrder = async (order) => {
    setSelectedOrder(order);
    // Fetch messages for this order
    try {
      const response = await axios.get(`${API}/portal/messages/${order.id}?email=${encodeURIComponent(loginEmail)}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const refreshOrders = async () => {
    if (!loginEmail) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API}/portal/login-email`, {
        email: loginEmail.trim()
      });
      if (response.data.success) {
        setOrders(response.data.orders || []);
        // Refresh selected order
        if (selectedOrder) {
          const updated = response.data.orders.find(o => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedOrder?.id) return;
    
    setSendingMessage(true);
    try {
      const response = await axios.post(`${API}/portal/message`, {
        order_id: selectedOrder.id,
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
    if (!file || !selectedOrder?.id) return;
    
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order_id', selectedOrder.id);
    formData.append('email', loginEmail);
    
    try {
      const response = await axios.post(`${API}/portal/upload-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        refreshOrders();
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
        `${API}/portal/download/${selectedOrder.id}/${fileId}?email=${encodeURIComponent(loginEmail)}`,
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
    return statuses[status] || { label: status || 'Unknown', color: 'bg-gray-500', icon: '❓' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mb-4">
              <svg className="w-9 h-9 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Portal</h1>
            <p className="text-gray-500 mt-2">Access all your orders and files</p>
          </div>
          
          {/* Login Card */}
          <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-2xl p-8">
            <form onSubmit={handleLogin}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-gray-100/50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <p className="text-gray-500 text-sm mt-2">Enter the email you used when placing orders</p>
                </div>
                
                {loginError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                    {loginError}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-gray-900 py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {loginLoading ? 'Loading...' : 'Access My Orders'}
                </button>
              </div>
            </form>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-500 text-sm text-center mb-4">Don't have an order yet?</p>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 rounded-xl transition"
              >
                Start New Order →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Portal Dashboard
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Customer Portal</h1>
                <p className="text-xs text-gray-500">{loginEmail}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshOrders}
                className="text-gray-500 hover:text-blue-600 transition p-2"
                title="Refresh"
              >
                🔄
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-gray-900 px-4 py-2 rounded-lg transition"
              >
                + New Order
              </button>
              <button
                onClick={() => { setIsLoggedIn(false); setOrders([]); setSelectedOrder(null); }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {orders.length === 0 ? (
          /* No Orders State */
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Orders Found</h2>
            <p className="text-gray-500 mb-8">You haven't placed any orders with this email yet.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-gray-900 px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition"
            >
              Start Your First Order →
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-4 gap-6">
            
            {/* Orders List Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-2xl p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                  <span>My Orders ({orders.length})</span>
                </h3>
                
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {orders.map((order) => {
                    const status = getStatusInfo(order.status);
                    return (
                      <button
                        key={order.id}
                        onClick={() => selectOrder(order)}
                        className={`w-full text-left p-4 rounded-xl transition ${
                          selectedOrder?.id === order.id
                            ? 'bg-blue-600/20 border border-blue-500/50'
                            : 'bg-gray-100/30 hover:bg-gray-100/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-900 font-mono text-sm">#{order.id?.substring(0, 8)}</span>
                          <span className={`${status.color} text-gray-900 text-xs px-2 py-0.5 rounded-full`}>
                            {status.icon}
                          </span>
                        </div>
                        <div className="text-gray-500 text-sm">
                          {order.vehicle_make} {order.vehicle_model}
                        </div>
                        <div className="text-green-400 font-semibold text-sm mt-1">
                          ${order.total_price?.toFixed(2)}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          {formatDate(order.created_at).split(',')[0]}
                        </div>
                        {order.processed_files?.length > 0 && (
                          <div className="text-green-400 text-xs mt-1 flex items-center">
                            <span className="mr-1">✅</span> Ready for download
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Order Details - Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {selectedOrder ? (
                <>
                  {/* Status Banner */}
                  {(() => {
                    const status = getStatusInfo(selectedOrder.status);
                    return (
                      <div className={`${status.color} rounded-2xl p-6 text-gray-900`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-4xl">{status.icon}</span>
                            <div>
                              <h2 className="text-2xl font-bold">{status.label}</h2>
                              <p className="opacity-90">Order #{selectedOrder.id?.substring(0, 8)}</p>
                            </div>
                          </div>
                          {selectedOrder.processed_files?.length > 0 && (
                            <div className="text-right">
                              <div className="text-sm opacity-80">Ready for Download</div>
                              <div className="text-lg font-bold">📥 {selectedOrder.processed_files.length} file(s)</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Order Details Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Vehicle & Services */}
                    <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Order Details</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-gray-100/30 rounded-xl p-4">
                          <h4 className="text-sm text-gray-500 mb-1">Vehicle</h4>
                          <p className="text-gray-900 font-semibold">
                            {selectedOrder.vehicle_year} {selectedOrder.vehicle_make} {selectedOrder.vehicle_model}
                          </p>
                          {selectedOrder.engine_type && (
                            <p className="text-gray-500 text-sm">{selectedOrder.engine_type}</p>
                          )}
                          {selectedOrder.ecu_type && (
                            <p className="text-cyan-400 text-sm">ECU: {selectedOrder.ecu_type}</p>
                          )}
                        </div>
                        
                        <div className="bg-gray-100/30 rounded-xl p-4">
                          <h4 className="text-sm text-gray-500 mb-2">Services</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedOrder.selected_services?.map((service, idx) => (
                              <span key={idx} className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-sm">
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                          <span className="text-gray-500">Total Paid</span>
                          <span className="text-green-400 font-bold text-2xl">${selectedOrder.total_price?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Files Section */}
                    <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">📁 Files</h3>
                      
                      {/* Processed Files (Download) */}
                      {selectedOrder.processed_files?.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm text-green-400 mb-3">✅ Ready for Download</h4>
                          <div className="space-y-2">
                            {selectedOrder.processed_files.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                                <div className="flex items-center space-x-3">
                                  <span className="text-xl">✅</span>
                                  <div>
                                    <p className="text-gray-900 text-sm font-medium">{file.processed_filename || file.original_filename}</p>
                                    <p className="text-green-400 text-xs">Processed</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => downloadFile(file.file_id, file.processed_filename || 'processed_file.bin')}
                                  className="bg-green-600 hover:bg-green-700 text-gray-900 px-3 py-1.5 rounded-lg text-sm transition"
                                >
                                  📥 Download
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Uploaded Files */}
                      {selectedOrder.uploaded_files?.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm text-gray-500 mb-3">Uploaded Files</h4>
                          <div className="space-y-2">
                            {selectedOrder.uploaded_files.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-100/30 rounded-xl p-3">
                                <div className="flex items-center space-x-3">
                                  <span className="text-xl">📄</span>
                                  <div>
                                    <p className="text-gray-900 text-sm">{file.original_filename}</p>
                                    <p className="text-gray-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Upload New File */}
                      {selectedOrder.status !== 'completed' && (
                        <div>
                          <h4 className="text-sm text-gray-500 mb-3">Upload Additional File</h4>
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-blue-500 hover:bg-gray-100/30 transition">
                            <input
                              type="file"
                              className="hidden"
                              accept=".bin,.hex,.ecu,.ori,.mod"
                              onChange={handleFileUpload}
                              disabled={uploadingFile}
                            />
                            {uploadingFile ? (
                              <div className="text-gray-500">Uploading...</div>
                            ) : (
                              <>
                                <span className="text-3xl mb-2">📤</span>
                                <span className="text-gray-500 text-sm">Click to upload</span>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Communication Section */}
                  <div className="bg-gray-50/50 backdrop-blur border border-gray-200/50 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">💬 Messages</h3>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto mb-4 pr-2">
                      {messages.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          No messages yet. Send a message to our team!
                        </div>
                      ) : (
                        messages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl p-3 ${
                                msg.sender === 'customer'
                                  ? 'bg-blue-600 text-gray-900'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              <p className={`text-xs mt-1 ${
                                msg.sender === 'customer' ? 'text-blue-200' : 'text-gray-500'
                              }`}>
                                {formatDate(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-gray-100/50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-slate-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-gray-900 px-6 py-3 rounded-xl transition disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <div className="text-5xl mb-4">👈</div>
                  <p>Select an order from the list to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPortal;
