import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    engine_type: '',
    vin: '',
    mileage: '',
    selected_services: [],
    issues_description: '',
    additional_notes: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      selected_services: prev.selected_services.includes(serviceId)
        ? prev.selected_services.filter(id => id !== serviceId)
        : [...prev.selected_services, serviceId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.selected_services.length === 0) {
      alert('Please select at least one service');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        vehicle_year: parseInt(formData.vehicle_year),
        mileage: parseInt(formData.mileage)
      };
      
      const response = await axios.post(`${API}/service-requests`, submitData);
      navigate(`/success/${response.data.id}`);
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Error submitting request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <a href="/admin" className="hover:text-blue-400 transition">Admin</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold mb-6" data-testid="hero-title">
          Professional DPF & AdBlue Removal Services
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Eliminate DPF and AdBlue issues permanently with our expert ECU remapping services. 
          Improve performance, reliability, and reduce maintenance costs.
        </p>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105"
          data-testid="get-quote-btn"
        >
          Get a Free Quote
        </button>
      </section>

      {/* Services Section */}
      <section id="services" className="container mx-auto px-4 py-16">
        <h3 className="text-4xl font-bold text-center mb-12" data-testid="services-section">
          Our Services
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service) => (
            <div 
              key={service.id} 
              className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition transform hover:scale-105"
              data-testid={`service-card-${service.id}`}
            >
              <div className="text-5xl mb-4">{service.icon}</div>
              <h4 className="text-xl font-bold mb-2">{service.name}</h4>
              <p className="text-gray-400">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="bg-gray-800/50 py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12">Why Choose Us?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h4 className="text-xl font-bold mb-2">Expert Technicians</h4>
              <p className="text-gray-400">Certified professionals with years of experience</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h4 className="text-xl font-bold mb-2">Fast Turnaround</h4>
              <p className="text-gray-400">Most services completed within 24-48 hours</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">🛡️</div>
              <h4 className="text-xl font-bold mb-2">Lifetime Warranty</h4>
              <p className="text-gray-400">Full warranty on all our remapping services</p>
            </div>
          </div>
        </div>
      </section>

      {/* Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto" data-testid="request-form-modal">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
            <button 
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
              data-testid="close-form-btn"
            >
              ×
            </button>
            
            <h3 className="text-3xl font-bold mb-6">Request Service</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  <input
                    type="text"
                    name="vehicle_make"
                    placeholder="Make (e.g., Ford) *"
                    required
                    value={formData.vehicle_make}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="vehicle-make-input"
                  />
                  <input
                    type="text"
                    name="vehicle_model"
                    placeholder="Model (e.g., F-150) *"
                    required
                    value={formData.vehicle_model}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="vehicle-model-input"
                  />
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
                    name="vin"
                    placeholder="VIN (Optional)"
                    value={formData.vin}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="vin-input"
                  />
                  <input
                    type="number"
                    name="mileage"
                    placeholder="Current Mileage *"
                    required
                    min="0"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="mileage-input"
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
                      className="flex items-center space-x-3 bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition"
                      data-testid={`service-checkbox-${service.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selected_services.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <div>
                        <div className="font-semibold">{service.icon} {service.name}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h4 className="text-xl font-semibold mb-4 text-blue-400">Additional Information</h4>
                <textarea
                  name="issues_description"
                  placeholder="Describe any current issues or symptoms"
                  rows="3"
                  value={formData.issues_description}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="issues-description-input"
                />
                <textarea
                  name="additional_notes"
                  placeholder="Any additional notes or requests"
                  rows="3"
                  value={formData.additional_notes}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-4"
                  data-testid="additional-notes-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                data-testid="submit-request-btn"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2024 DPF AdBlue Removal Services. Professional ECU remapping and emissions solutions.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;