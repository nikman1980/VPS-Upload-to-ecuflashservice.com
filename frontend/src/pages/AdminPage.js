import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/service-requests`);
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId, newStatus) => {
    try {
      await axios.patch(`${API}/service-requests/${requestId}/status`, {
        status: newStatus
      });
      fetchRequests();
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const downloadFile = async (requestId, fileId, fileName) => {
    try {
      const response = await axios.get(
        `${API}/download-file/${requestId}/${fileId}`,
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
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_payment: 'bg-yellow-500',
      paid: 'bg-green-500',
      processing: 'bg-blue-500',
      completed: 'bg-green-600',
      cancelled: 'bg-red-500',
      refunded: 'bg-orange-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      refunded: 'bg-orange-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-900">
      {/* Header */}
      <header className="bg-white/50 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔧</span>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-gray-100 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
            data-testid="back-to-home-btn"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-2xl">Loading...</div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid md:grid-cols-5 gap-4 mb-8">
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="text-3xl font-bold" data-testid="total-requests">{requests.length}</div>
                <div className="text-gray-500">Total Requests</div>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-700 p-6 rounded-lg">
                <div className="text-3xl font-bold" data-testid="pending-payment">
                  {requests.filter(r => r.status === 'pending_payment').length}
                </div>
                <div className="text-yellow-300">Pending Payment</div>
              </div>
              <div className="bg-green-900/30 border border-green-700 p-6 rounded-lg">
                <div className="text-3xl font-bold" data-testid="paid-requests">
                  {requests.filter(r => r.status === 'paid').length}
                </div>
                <div className="text-green-300">Paid</div>
              </div>
              <div className="bg-blue-900/30 border border-blue-700 p-6 rounded-lg">
                <div className="text-3xl font-bold" data-testid="processing-requests">
                  {requests.filter(r => r.status === 'processing').length}
                </div>
                <div className="text-blue-300">Processing</div>
              </div>
              <div className="bg-green-900/30 border border-green-700 p-6 rounded-lg">
                <div className="text-3xl font-bold" data-testid="completed-requests">
                  {requests.filter(r => r.status === 'completed').length}
                </div>
                <div className="text-green-300">Completed</div>
              </div>
            </div>

            {/* Requests Table */}
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="requests-table">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Customer</th>
                      <th className="px-6 py-3 text-left">Vehicle</th>
                      <th className="px-6 py-3 text-left">Services</th>
                      <th className="px-6 py-3 text-left">Files</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                      <th className="px-6 py-3 text-left">Payment</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                          No service requests yet
                        </td>
                      </tr>
                    ) : (
                      requests.map((request) => (
                        <tr key={request.id} className="border-t border-gray-200 hover:bg-gray-100/50" data-testid={`request-row-${request.id}`}>
                          <td className="px-6 py-4">{formatDate(request.created_at)}</td>
                          <td className="px-6 py-4">
                            <div>{request.customer_name}</div>
                            <div className="text-sm text-gray-500">{request.customer_email}</div>
                          </td>
                          <td className="px-6 py-4">
                            {request.vehicle_year} {request.vehicle_make} {request.vehicle_model}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">{request.selected_services.length} service(s)</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              {request.uploaded_files?.length || 0} file(s)
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-green-400">
                              ${request.total_price?.toFixed(2) || '0.00'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`${getPaymentStatusColor(request.payment_status)} px-2 py-1 rounded-full text-xs font-semibold`}>
                              {request.payment_status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`${getStatusColor(request.status)} px-3 py-1 rounded-full text-xs font-semibold`}>
                              {request.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setSelectedRequest(request)}
                              className="text-blue-400 hover:text-blue-300"
                              data-testid={`view-details-btn-${request.id}`}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" data-testid="request-details-modal">
          <div className="bg-gray-50 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-blue-600 text-2xl"
              data-testid="close-details-btn"
            >
              ×
            </button>
            
            <h3 className="text-3xl font-bold mb-6">Request Details</h3>
            
            <div className="space-y-6">
              {/* Status Update */}
              <div className="bg-white p-4 rounded-lg">
                <label className="block text-sm font-semibold mb-2">Update Status</label>
                <select
                  value={selectedRequest.status}
                  onChange={(e) => updateStatus(selectedRequest.id, e.target.value)}
                  className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="status-select"
                >
                  <option value="pending_payment">Pending Payment</option>
                  <option value="paid">Paid</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {/* Payment Information */}
              <div className="bg-white p-4 rounded-lg">
                <h4 className="text-xl font-semibold mb-3 text-blue-400">Payment Information</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Payment Status:</span>
                    <div className="font-semibold">
                      <span className={`${getPaymentStatusColor(selectedRequest.payment_status)} px-2 py-1 rounded text-xs`}>
                        {selectedRequest.payment_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Amount:</span>
                    <div className="font-semibold text-green-400 text-lg">
                      ${selectedRequest.total_price?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  {selectedRequest.paypal_order_id && (
                    <div>
                      <span className="text-gray-500">PayPal Order ID:</span>
                      <div className="font-semibold text-xs">{selectedRequest.paypal_order_id}</div>
                    </div>
                  )}
                  {selectedRequest.paypal_transaction_id && (
                    <div>
                      <span className="text-gray-500">Transaction ID:</span>
                      <div className="font-semibold text-xs">{selectedRequest.paypal_transaction_id}</div>
                    </div>
                  )}
                  {selectedRequest.payment_date && (
                    <div>
                      <span className="text-gray-500">Payment Date:</span>
                      <div className="font-semibold">{formatDate(selectedRequest.payment_date)}</div>
                    </div>
                  )}
                </div>
                
                {/* Pricing Breakdown */}
                {selectedRequest.pricing_breakdown && selectedRequest.pricing_breakdown.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="font-semibold mb-2">Pricing Breakdown:</h5>
                    {selectedRequest.pricing_breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm py-1">
                        <span>{item.service_name}</span>
                        <span>${item.final_price.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-300 mt-2 pt-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Base Total (dpfoffservice.com):</span>
                        <span>${selectedRequest.base_total?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Markup (25%):</span>
                        <span>${selectedRequest.markup_amount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg mt-2">
                        <span>Total:</span>
                        <span className="text-green-400">${selectedRequest.total_price?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Uploaded Files */}
              {selectedRequest.uploaded_files && selectedRequest.uploaded_files.length > 0 && (
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="text-xl font-semibold mb-3 text-blue-400">Uploaded ECU Files</h4>
                  <div className="space-y-2">
                    {selectedRequest.uploaded_files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 p-3 rounded">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">📄</span>
                          <div>
                            <div className="font-semibold">{file.original_filename}</div>
                            <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadFile(selectedRequest.id, file.file_id, file.original_filename)}
                          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Information */}
              <div>
                <h4 className="text-xl font-semibold mb-3 text-blue-400">Customer Information</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <div className="font-semibold" data-testid="detail-customer-name">{selectedRequest.customer_name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <div className="font-semibold" data-testid="detail-customer-email">{selectedRequest.customer_email}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <div className="font-semibold" data-testid="detail-customer-phone">{selectedRequest.customer_phone}</div>
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h4 className="text-xl font-semibold mb-3 text-blue-400">Vehicle Information</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Make:</span>
                    <div className="font-semibold">{selectedRequest.vehicle_make}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Model:</span>
                    <div className="font-semibold">{selectedRequest.vehicle_model}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Year:</span>
                    <div className="font-semibold">{selectedRequest.vehicle_year}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Engine Type:</span>
                    <div className="font-semibold">{selectedRequest.engine_type}</div>
                  </div>
                  {selectedRequest.ecu_type && (
                    <div>
                      <span className="text-gray-500">ECU Type:</span>
                      <div className="font-semibold">{selectedRequest.ecu_type}</div>
                    </div>
                  )}
                  {selectedRequest.vin && (
                    <div>
                      <span className="text-gray-500">VIN:</span>
                      <div className="font-semibold">{selectedRequest.vin}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Services */}
              <div>
                <h4 className="text-xl font-semibold mb-3 text-blue-400">Selected Services</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.selected_services.map((serviceId) => (
                    <span key={serviceId} className="bg-blue-600 px-3 py-1 rounded-full text-sm">
                      {serviceId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Issues and Notes */}
              {selectedRequest.issues_description && (
                <div>
                  <h4 className="text-xl font-semibold mb-3 text-blue-400">Issues Description</h4>
                  <p className="text-gray-600 bg-white p-4 rounded-lg">{selectedRequest.issues_description}</p>
                </div>
              )}

              {selectedRequest.additional_notes && (
                <div>
                  <h4 className="text-xl font-semibold mb-3 text-blue-400">Additional Notes</h4>
                  <p className="text-gray-600 bg-white p-4 rounded-lg">{selectedRequest.additional_notes}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <span>Created:</span> {formatDate(selectedRequest.created_at)}
                </div>
                <div>
                  <span>Last Updated:</span> {formatDate(selectedRequest.updated_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
