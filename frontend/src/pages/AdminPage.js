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

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      in_progress: 'bg-blue-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔧</span>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
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
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="text-3xl font-bold" data-testid="total-requests">{requests.length}</div>
                <div className="text-gray-400">Total Requests</div>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-700 p-6 rounded-lg">
                <div className="text-3xl font-bold" data-testid="pending-requests">
                  {requests.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-yellow-300">Pending</div>
              </div>
              <div className="bg-blue-900/30 border border-blue-700 p-6 rounded-lg">
                <div className="text-3xl font-bold" data-testid="in-progress-requests">
                  {requests.filter(r => r.status === 'in_progress').length}
                </div>
                <div className="text-blue-300">In Progress</div>
              </div>
              <div className="bg-green-900/30 border border-green-700 p-6 rounded-lg">
                <div className="text-3xl font-bold" data-testid="completed-requests">
                  {requests.filter(r => r.status === 'completed').length}
                </div>
                <div className="text-green-300">Completed</div>
              </div>
            </div>

            {/* Requests Table */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="requests-table">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Customer</th>
                      <th className="px-6 py-3 text-left">Vehicle</th>
                      <th className="px-6 py-3 text-left">Services</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                          No service requests yet
                        </td>
                      </tr>
                    ) : (
                      requests.map((request) => (
                        <tr key={request.id} className="border-t border-gray-700 hover:bg-gray-700/50" data-testid={`request-row-${request.id}`}>
                          <td className="px-6 py-4">{formatDate(request.created_at)}</td>
                          <td className="px-6 py-4">
                            <div>{request.customer_name}</div>
                            <div className="text-sm text-gray-400">{request.customer_email}</div>
                          </td>
                          <td className="px-6 py-4">
                            {request.vehicle_year} {request.vehicle_make} {request.vehicle_model}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">{request.selected_services.length} service(s)</div>
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
          <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
              data-testid="close-details-btn"
            >
              ×
            </button>
            
            <h3 className="text-3xl font-bold mb-6">Request Details</h3>
            
            <div className="space-y-6">
              {/* Status Update */}
              <div className="bg-gray-900 p-4 rounded-lg">
                <label className="block text-sm font-semibold mb-2">Update Status</label>
                <select
                  value={selectedRequest.status}
                  onChange={(e) => updateStatus(selectedRequest.id, e.target.value)}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="status-select"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Customer Information */}
              <div>
                <h4 className="text-xl font-semibold mb-3 text-blue-400">Customer Information</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <div className="font-semibold" data-testid="detail-customer-name">{selectedRequest.customer_name}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <div className="font-semibold" data-testid="detail-customer-email">{selectedRequest.customer_email}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone:</span>
                    <div className="font-semibold" data-testid="detail-customer-phone">{selectedRequest.customer_phone}</div>
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h4 className="text-xl font-semibold mb-3 text-blue-400">Vehicle Information</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Make:</span>
                    <div className="font-semibold">{selectedRequest.vehicle_make}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Model:</span>
                    <div className="font-semibold">{selectedRequest.vehicle_model}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Year:</span>
                    <div className="font-semibold">{selectedRequest.vehicle_year}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Engine Type:</span>
                    <div className="font-semibold">{selectedRequest.engine_type}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Mileage:</span>
                    <div className="font-semibold">{selectedRequest.mileage.toLocaleString()} miles</div>
                  </div>
                  {selectedRequest.vin && (
                    <div>
                      <span className="text-gray-400">VIN:</span>
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
                  <p className="text-gray-300 bg-gray-900 p-4 rounded-lg">{selectedRequest.issues_description}</p>
                </div>
              )}

              {selectedRequest.additional_notes && (
                <div>
                  <h4 className="text-xl font-semibold mb-3 text-blue-400">Additional Notes</h4>
                  <p className="text-gray-300 bg-gray-900 p-4 rounded-lg">{selectedRequest.additional_notes}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-400">
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