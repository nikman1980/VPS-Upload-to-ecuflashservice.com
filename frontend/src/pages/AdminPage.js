import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Data state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  
  // Upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Email state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Message state
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Notification sound
  const playNotification = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...');
    audio.play().catch(() => {});
  };

  useEffect(() => {
    fetchOrders();
    // Poll for new orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      // Fetch from both service_requests and orders collections
      const [requestsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/service-requests`).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/orders`).catch(() => ({ data: [] }))
      ]);
      
      const allOrders = [...(requestsRes.data || []), ...(ordersRes.data || [])];
      
      // Sort by created_at descending
      allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Check for new orders
      if (orders.length > 0 && allOrders.length > orders.length) {
        playNotification();
      }
      
      setOrders(allOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`${API}/admin/order/${orderId}/status`, { status: newStatus });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const uploadModifiedFile = async (file) => {
    if (!file || !selectedOrder) return;
    
    setUploadingFile(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order_id', selectedOrder.id);
    
    try {
      await axios.post(`${API}/admin/upload-modified`, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });
      
      alert('Modified file uploaded successfully!');
      fetchOrders();
      
      // Refresh selected order
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const sendDownloadEmail = async () => {
    if (!selectedOrder) return;
    
    setSendingEmail(true);
    try {
      await axios.post(`${API}/admin/send-download-email`, {
        order_id: selectedOrder.id,
        email: selectedOrder.customer_email
      });
      
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
      alert('Download link sent to customer!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSendingEmail(false);
    }
  };

  const sendAdminMessage = async () => {
    if (!adminMessage.trim() || !selectedOrder) return;
    
    setSendingMessage(true);
    try {
      await axios.post(`${API}/portal/message`, {
        order_id: selectedOrder.id,
        email: selectedOrder.customer_email,
        message: adminMessage.trim(),
        sender: 'admin'
      });
      
      setAdminMessage('');
      alert('Message sent to customer!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const downloadFile = async (filename) => {
    try {
      window.open(`${API}/download/${filename}`, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      pending_payment: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      refunded: 'bg-orange-100 text-orange-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(r => r.status === 'pending' || r.status === 'pending_payment').length;
  const processingOrders = orders.filter(r => r.status === 'processing' || r.status === 'paid').length;
  const completedOrders = orders.filter(r => r.status === 'completed').length;
  const totalRevenue = orders.filter(r => r.payment_status === 'paid' || r.status === 'completed').reduce((sum, o) => sum + (o.total_amount || o.price || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <h1 className="font-bold">ECU Flash</h1>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              activeTab === 'orders' ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            <span>📦</span> Orders
            {pendingOrders > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingOrders}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              activeTab === 'stats' ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            <span>📊</span> Statistics
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-gray-800 transition"
          >
            <span>🏠</span> Back to Site
          </button>
        </nav>
        
        {/* Quick Stats */}
        <div className="p-4 border-t border-gray-800">
          <div className="text-gray-400 text-xs mb-2">TODAY'S REVENUE</div>
          <div className="text-2xl font-bold text-green-400">${totalRevenue.toFixed(2)}</div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-xl text-gray-500">Loading...</div>
          </div>
        ) : (
          <>
            {activeTab === 'orders' && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
                  <button
                    onClick={fetchOrders}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition"
                  >
                    🔄 Refresh
                  </button>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
                    <div className="text-gray-500 text-sm">Total Orders</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
                    <div className="text-yellow-600 text-sm">Pending</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{processingOrders}</div>
                    <div className="text-blue-600 text-sm">Processing</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{completedOrders}</div>
                    <div className="text-green-600 text-sm">Completed</div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-400">${totalRevenue.toFixed(2)}</div>
                    <div className="text-gray-400 text-sm">Revenue</div>
                  </div>
                </div>
                
                {/* Orders Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Vehicle</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Services</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                            No orders yet. Orders will appear here when customers place them.
                          </td>
                        </tr>
                      ) : (
                        orders.map((order) => (
                          <tr
                            key={order.id}
                            className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${
                              selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => setSelectedOrder(order)}
                          >
                            <td className="px-4 py-3 text-sm">{formatDate(order.created_at)}</td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                              <div className="text-xs text-gray-500">{order.customer_email}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{order.vehicle_info || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {(order.services || order.selected_services || []).slice(0, 2).map(s => typeof s === 'object' ? s.name : s).join(', ') || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">${(order.total_amount || order.price || 0).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {order.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="text-4xl font-bold text-gray-900">{totalOrders}</div>
                    <div className="text-gray-500">Total Orders</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="text-4xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
                    <div className="text-gray-500">Total Revenue</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="text-4xl font-bold text-blue-600">{completedOrders}</div>
                    <div className="text-gray-500">Completed</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="text-4xl font-bold text-yellow-600">{pendingOrders}</div>
                    <div className="text-gray-500">Pending</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      
      {/* Order Detail Sidebar */}
      {selectedOrder && (
        <aside className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Order ID */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="text-xs text-gray-500 mb-1">Order ID</div>
              <div className="font-mono text-sm">{selectedOrder.id}</div>
            </div>
            
            {/* Customer Info */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Customer</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{selectedOrder.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-blue-600">{selectedOrder.customer_email}</span>
                </div>
              </div>
            </div>
            
            {/* Vehicle */}
            {selectedOrder.vehicle_info && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Vehicle</h4>
                <div className="bg-gray-50 rounded-xl p-3 text-sm">{selectedOrder.vehicle_info}</div>
              </div>
            )}
            
            {/* Services */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Services</h4>
              <div className="space-y-2">
                {(selectedOrder.services || selectedOrder.selected_services || []).map((s, i) => (
                  <div key={i} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm">
                    {typeof s === 'object' ? s.name : s}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right">
                <span className="text-gray-500">Total:</span>
                <span className="text-xl font-bold text-gray-900 ml-2">
                  ${(selectedOrder.total_amount || selectedOrder.price || 0).toFixed(2)}
                </span>
              </div>
            </div>
            
            {/* Status Update */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Update Status</h4>
              <div className="grid grid-cols-2 gap-2">
                {['pending', 'processing', 'completed', 'cancelled'].map(status => (
                  <button
                    key={status}
                    onClick={() => updateStatus(selectedOrder.id, status)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      selectedOrder.status === status
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Files Section */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Files</h4>
              
              {/* Original File */}
              {(selectedOrder.original_file || selectedOrder.uploaded_files?.length > 0) && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Original File</div>
                      <div className="text-sm font-medium">
                        {selectedOrder.original_filename || selectedOrder.uploaded_files?.[0]?.original_name || 'ECU File'}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadFile(selectedOrder.original_file || selectedOrder.uploaded_files?.[0]?.file_id)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}
              
              {/* Modified File */}
              {selectedOrder.modified_file ? (
                <div className="bg-green-50 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-green-600">Modified File ✓</div>
                      <div className="text-sm font-medium text-green-700">
                        {selectedOrder.modified_filename || 'Modified ECU File'}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadFile(selectedOrder.modified_file)}
                      className="text-green-600 hover:text-green-700 text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-xl p-3 mb-3">
                  <div className="text-xs text-yellow-600 mb-2">No modified file yet</div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => uploadModifiedFile(e.target.files?.[0])}
                    className="hidden"
                    accept=".bin,.hex,.ecu,.ori,.mod,.fls"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {uploadingFile ? `Uploading... ${uploadProgress}%` : '📤 Upload Modified File'}
                  </button>
                </div>
              )}
            </div>
            
            {/* Send Download Link */}
            {selectedOrder.modified_file && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Email Customer</h4>
                <button
                  onClick={sendDownloadEmail}
                  disabled={sendingEmail}
                  className={`w-full py-3 rounded-xl font-medium transition ${
                    emailSent
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:shadow-lg'
                  } disabled:opacity-50`}
                >
                  {emailSent ? '✓ Email Sent!' : sendingEmail ? 'Sending...' : '📧 Send Download Link'}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Sends email to {selectedOrder.customer_email}
                </p>
              </div>
            )}
            
            {/* Message Customer */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Message Customer</h4>
              <textarea
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                placeholder="Type a message to the customer..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
              />
              <button
                onClick={sendAdminMessage}
                disabled={sendingMessage || !adminMessage.trim()}
                className="w-full mt-2 bg-gray-900 text-white py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    updateStatus(selectedOrder.id, 'completed');
                    if (selectedOrder.modified_file) {
                      sendDownloadEmail();
                    }
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-sm font-medium transition"
                >
                  ✓ Mark Complete & Notify
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

export default AdminPage;
