import { Link } from 'react-router-dom';

const AdBlueOffPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">⚡</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ECU Flash Service</h1>
                <p className="text-xs text-gray-500">Professional ECU Tuning</p>
              </div>
            </Link>
            <div className="flex items-center space-x-6">
              <Link to="/services/dtc-removal" className="text-gray-600 hover:text-blue-600 text-sm hidden md:block">DTC Removal</Link>
              <Link to="/services/dpf-off" className="text-gray-600 hover:text-blue-600 text-sm hidden md:block">DPF OFF</Link>
              <Link to="/services/egr-off" className="text-gray-600 hover:text-blue-600 text-sm hidden md:block">EGR OFF</Link>
              <Link to="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Blue Gradient */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full mb-6">
            <span className="text-2xl">🚛</span>
            <span className="font-medium">Truck & Commercial Specialist</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">AdBlue / SCR Delete</h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Eliminate AdBlue system headaches and costly DEF fluid expenses from your diesel vehicle
          </p>
          <Link 
            to="/" 
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg"
          >
            Order AdBlue Delete →
          </Link>
        </div>
      </section>

      {/* Chinese Trucks Banner */}
      <section className="py-8 px-6 bg-gradient-to-r from-red-500 to-orange-500">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center space-x-4 text-white">
            <span className="text-3xl">🇨🇳</span>
            <div className="text-center">
              <p className="font-bold text-lg">AdBlue Delete Available for ALL Chinese Trucks</p>
              <p className="text-white/90 text-sm">Weichai • Yuchai • FAW • Sinotruk HOWO • Dongfeng • Foton • Shacman</p>
            </div>
            <span className="text-3xl">🚛</span>
          </div>
        </div>
      </section>

      {/* Important DCU Notice */}
      <section className="py-8 px-6 bg-blue-50">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-2xl p-6 border border-blue-200 flex items-start space-x-4">
            <span className="text-3xl">📋</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Important Notice for AdBlue Removal</h3>
              <p className="text-gray-700">
                For AdBlue Removal, we will advise further if <strong>Dosing Unit ECU (DCU)</strong> data is required or not. 
                Some vehicles have a separate DCU module that controls AdBlue injection, and this may need to be modified along with 
                the main engine ECU for complete system deactivation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What is AdBlue */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">What is AdBlue/SCR Delete?</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                AdBlue (also known as DEF - Diesel Exhaust Fluid) is a urea-based solution used in SCR (Selective Catalytic Reduction) systems to reduce NOx emissions. The system injects AdBlue into the exhaust where it converts harmful nitrogen oxides into harmless nitrogen and water.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                AdBlue/SCR delete is an ECU software modification that completely disables the AdBlue injection system, SCR monitoring, NOx sensors, and all related functions. This eliminates the need for AdBlue fluid and removes the risk of SCR-related breakdowns.
              </p>
              <p className="text-gray-600 leading-relaxed">
                This service is particularly popular for commercial trucks and vehicles operating in regions where AdBlue quality is inconsistent or availability is limited.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">What We Disable</h3>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">AdBlue/DEF injection system</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">SCR catalyst monitoring</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">NOx sensors (upstream & downstream)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">AdBlue tank level sensor</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">AdBlue quality sensor</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">Speed/start limitation (inducement)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">All related DTC error codes</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="py-16 px-6 bg-gray-100">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Common AdBlue Problems</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Issues that make AdBlue systems a headache for many vehicle owners</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🚫', title: 'Engine Start Prevention', desc: 'When AdBlue runs out or system detects a fault, many vehicles will not start at all after a certain number of key cycles' },
              { icon: '🐢', title: 'Speed Limitation', desc: 'Low AdBlue level triggers "inducement" - limiting vehicle speed to as low as 20 km/h, making highway driving impossible' },
              { icon: '❄️', title: 'Freezing Issues', desc: 'AdBlue freezes at -11°C (12°F), causing system failures in cold climates and requiring heated tanks/lines' },
              { icon: '💧', title: 'Contamination', desc: 'Using wrong fluid or contaminated AdBlue can destroy the entire SCR system, costing thousands to repair' },
              { icon: '💰', title: 'Ongoing Costs', desc: 'AdBlue consumption of 3-6% of fuel usage means continuous expense - significant for commercial fleets' },
              { icon: '🔧', title: 'Expensive Components', desc: 'NOx sensors cost $300-800 each, injectors $500+, and SCR catalysts can exceed $3,000 to replace' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm flex items-start space-x-4">
                <span className="text-3xl">{item.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Benefits of AdBlue Delete</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: '💰', value: '$0', label: 'AdBlue Costs', desc: 'Never buy DEF fluid again' },
              { icon: '🔓', value: 'No', label: 'Speed Limits', desc: 'No inducement restrictions' },
              { icon: '✅', value: '100%', label: 'Reliability', desc: 'One less system to fail' },
              { icon: '🌍', value: 'Any', label: 'Location', desc: 'Operate anywhere without AdBlue concerns' },
            ].map((item, i) => (
              <div key={i} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 text-center">
                <span className="text-3xl mb-2 block">{item.icon}</span>
                <div className="text-2xl font-bold text-purple-600 mb-1">{item.value}</div>
                <div className="text-gray-900 font-semibold mb-2">{item.label}</div>
                <p className="text-gray-600 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Trucks */}
      <section className="py-16 px-6 bg-gray-100">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Supported Vehicles</h2>
          <p className="text-gray-600 text-center mb-12">We support AdBlue delete for a wide range of vehicles including</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🚛</span> Commercial Trucks
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Weichai WP10/WP12/WP13', 'Yuchai YC6J/YC6L/YC6K',
                  'FAW J6/J7', 'Sinotruk HOWO A7/T7',
                  'Dongfeng Tianlong', 'Foton Auman',
                  'Shacman X3000/F3000', 'MAN TGX/TGS',
                  'Scania R/S Series', 'Volvo FH/FM',
                  'DAF XF/CF', 'Mercedes Actros'
                ].map((truck, i) => (
                  <div key={i} className="text-sm text-gray-600 py-1">• {truck}</div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🚗</span> Passenger Vehicles
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'BMW X5/X6/5/7 Series', 'Mercedes ML/GL/S/E',
                  'Audi Q7/A6/A8', 'VW Touareg/Phaeton',
                  'Porsche Cayenne', 'Range Rover',
                  'Land Rover Discovery', 'Jeep Grand Cherokee',
                  'Toyota Land Cruiser', 'Nissan Patrol',
                  'Hyundai Santa Fe', 'Kia Sorento'
                ].map((car, i) => (
                  <div key={i} className="text-sm text-gray-600 py-1">• {car}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Special Offer */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">🎯 Complete Emission Delete Package</h3>
                <p className="text-white/90">DPF + EGR + AdBlue delete together for maximum savings and reliability</p>
              </div>
              <Link 
                to="/" 
                className="bg-white text-purple-600 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition"
              >
                Get Quote →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Post-Modification Info */}
      <section className="py-16 px-6 bg-blue-50">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-2xl p-8 border border-blue-200">
            <div className="flex items-start space-x-4">
              <span className="text-3xl">🔌</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">After Modification</h3>
                <p className="text-gray-700 mb-4">
                  After AdBlue delete, we will advise you on which components may need to be disconnected or addressed:
                </p>
                <ul className="text-gray-600 space-y-2">
                  <li>• AdBlue injector - may be left connected or removed</li>
                  <li>• NOx sensors - typically left connected</li>
                  <li>• AdBlue pump - can be disconnected to prevent dry running</li>
                  <li>• Tank heating element - disconnect to save power</li>
                </ul>
                <p className="text-gray-600 mt-4 text-sm">
                  Our modified file ensures no error codes or warnings regardless of sensor connection status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Notice */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200">
            <div className="flex items-start space-x-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Legal Notice</h3>
                <p className="text-gray-700 mb-4">
                  AdBlue/SCR delete is intended <strong>ONLY for off-road, agricultural, mining, and competition vehicles</strong> in jurisdictions where such modifications are permitted. Removing emission control systems from road-registered vehicles may violate environmental regulations.
                </p>
                <p className="text-gray-600 text-sm">
                  It is the customer&apos;s responsibility to ensure compliance with all applicable laws in their jurisdiction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-purple-600 to-indigo-700">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Go AdBlue-Free?</h2>
          <p className="text-white/90 mb-8">Upload your ECU file and get your AdBlue delete solution within 20-60 minutes</p>
          <Link 
            to="/" 
            className="inline-block bg-white text-purple-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg"
          >
            Start Now →
          </Link>
        </div>
      </section>

      {/* Footer - Dark Background */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">© {new Date().getFullYear()} ECU Flash Service | Professional ECU Tuning</p>
          <div className="mt-4 space-x-6">
            <Link to="/terms" className="text-gray-400 hover:text-white transition">Terms</Link>
            <Link to="/privacy" className="text-gray-400 hover:text-white transition">Privacy</Link>
            <Link to="/faq" className="text-gray-400 hover:text-white transition">FAQ</Link>
            <Link to="/contact" className="text-gray-400 hover:text-white transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdBlueOffPage;
