import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const RequestSuccessPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      const response = await axios.get(`${API}/service-requests/${requestId}`);
      setRequest(response.data);
    } catch (error) {
      console.error('Error fetching request:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-900 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">Request not found</div>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-900">
      {/* Header */}
      <header className="bg-white/50 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔧</span>
            <h1 className="text-2xl font-bold">DPF AdBlue Removal</h1>
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

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto bg-gray-50 rounded-lg p-8 text-center" data-testid="success-message">
          {/* Success Icon */}
          <div className="text-6xl mb-6">✅</div>
          
          <h2 className="text-4xl font-bold mb-4">Request Submitted Successfully!</h2>
          
          <p className="text-xl text-gray-600 mb-8">
            Thank you for your service request. We&apos;ve received your information and will contact you shortly.
          </p>

          <div className="bg-white p-6 rounded-lg mb-8 text-left">
            <h3 className="text-xl font-semibold mb-4 text-blue-400">Request Details</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Request ID:</span>
                <div className="font-mono font-semibold" data-testid="request-id">{request.id}</div>
              </div>
              
              <div>
                <span className="text-gray-500">Customer:</span>
                <div className="font-semibold">{request.customer_name}</div>
              </div>
              
              <div>
                <span className="text-gray-500">Email:</span>
                <div className="font-semibold">{request.customer_email}</div>
              </div>
              
              <div>
                <span className="text-gray-500">Vehicle:</span>
                <div className="font-semibold">
                  {request.vehicle_year} {request.vehicle_make} {request.vehicle_model}
                </div>
              </div>
              
              <div>
                <span className="text-gray-500">Selected Services:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {request.selected_services.map((serviceId) => (
                    <span key={serviceId} className="bg-blue-600 px-3 py-1 rounded-full text-xs">
                      {serviceId}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <span className="text-gray-500">Status:</span>
                <div>
                  <span className="bg-yellow-500 px-3 py-1 rounded-full text-xs font-semibold inline-block mt-1">
                    PENDING
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg mb-8">
            <p className="text-blue-300">
              💡 <strong>What&apos;s Next?</strong><br/>
              Our AI system is now processing your ECU file. You will receive an email with the download link within 24 hours. Most files are processed automatically within 1-2 hours.
            </p>
          </div>
          
          {request.uploaded_files && request.uploaded_files.length > 0 && (
            <div className="bg-white p-4 rounded-lg mb-8">
              <h4 className="font-semibold mb-2 text-blue-400">📁 Uploaded Files:</h4>
              {request.uploaded_files.map((file, index) => (
                <div key={index} className="text-sm py-1">
                  • {file.original_filename} ({(file.size / 1024).toFixed(2)} KB)
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold transition"
              data-testid="return-home-btn"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestSuccessPage;