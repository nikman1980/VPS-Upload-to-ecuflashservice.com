import { Link } from 'react-router-dom';

const DPFOffPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
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
              <Link to="/services/dtc-removal" className="text-gray-600 hover:text-blue-600 text-sm">DTC Removal</Link>
              <Link to="/services/egr-off" className="text-gray-600 hover:text-blue-600 text-sm">EGR OFF</Link>
              <Link to="/services/adblue-off" className="text-gray-600 hover:text-blue-600 text-sm">AdBlue OFF</Link>
              <Link to="/" className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full mb-6">
            <span className="text-2xl">🛡️</span>
            <span className="font-medium">Most Popular Service</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">DPF Delete Service</h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Remove DPF restrictions from your ECU and restore your engine&apos;s full performance potential
          </p>
          <Link 
            to="/" 
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg"
          >
            Order DPF Delete →
          </Link>
        </div>
      </section>

      {/* What is DPF */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">What is DPF Delete?</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                The Diesel Particulate Filter (DPF) is an emissions control device that captures and stores soot particles from your diesel engine&apos;s exhaust. Over time, the DPF requires &quot;regeneration&quot; cycles to burn off accumulated soot.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                DPF delete is an ECU software modification that removes all DPF-related functions from your engine management system. This includes disabling regeneration cycles, DPF monitoring, differential pressure sensors, and related error codes.
              </p>
              <p className="text-gray-600 leading-relaxed">
                After software modification, the physical DPF can be removed or replaced with a straight pipe by a qualified mechanic, allowing unrestricted exhaust flow.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">What We Disable</h3>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">DPF regeneration cycles</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">DPF differential pressure monitoring</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">DPF temperature sensors</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">Soot mass calculation</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">Related DTC error codes</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Problems with DPF */}
      <section className="py-16 px-6 bg-gray-100">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Common DPF Problems</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">These issues often lead vehicle owners to consider DPF delete</p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🔥', title: 'Failed Regeneration', desc: 'Short trips prevent complete regeneration, causing soot buildup and eventual clogging' },
              { icon: '⚠️', title: 'Limp Mode', desc: 'Blocked DPF triggers reduced power mode, limiting speed and acceleration' },
              { icon: '💸', title: 'Expensive Replacement', desc: 'New DPF units cost $1,000-$5,000+ plus labor for installation' },
              { icon: '⛽', title: 'Increased Fuel Use', desc: 'Active regeneration burns extra fuel, reducing economy by 5-10%' },
              { icon: '🛠️', title: 'Frequent Repairs', desc: 'Related sensors and components fail, requiring repeated repairs' },
              { icon: '📉', title: 'Performance Loss', desc: 'Back pressure from DPF reduces engine efficiency and power output' },
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
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Benefits of DPF Delete</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: '🚀', value: '+15-30%', label: 'More Power', desc: 'Reduced back pressure unleashes hidden power' },
              { icon: '⛽', value: '5-15%', label: 'Better MPG', desc: 'No regeneration cycles means better economy' },
              { icon: '💰', value: '$0', label: 'No DPF Repairs', desc: 'Never pay for DPF replacement again' },
              { icon: '♾️', value: '∞', label: 'Reliability', desc: 'Eliminate a major failure point' },
            ].map((item, i) => (
              <div key={i} className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 text-center">
                <span className="text-3xl mb-2 block">{item.icon}</span>
                <div className="text-2xl font-bold text-blue-600 mb-1">{item.value}</div>
                <div className="text-gray-900 font-semibold mb-2">{item.label}</div>
                <p className="text-gray-600 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Vehicles */}
      <section className="py-16 px-6 bg-gray-100">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Supported Vehicles</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Volkswagen / Audi', 'BMW', 'Mercedes-Benz', 'Ford',
              'Toyota / Lexus', 'Mazda', 'Hyundai / Kia', 'Nissan',
              'Peugeot / Citroën', 'Renault', 'Fiat', 'Volvo',
              'Land Rover', 'Jeep', 'Chinese Trucks', 'All Diesels'
            ].map((brand, i) => (
              <div key={i} className="bg-white rounded-lg p-4 text-center text-gray-700 font-medium shadow-sm">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200">
            <div className="flex items-start space-x-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Legal Notice</h3>
                <p className="text-gray-700 mb-4">
                  DPF delete is intended <strong>ONLY for off-road, racing, and competition vehicles</strong> in jurisdictions where such modifications are permitted. Removing or tampering with emission control devices on road-registered vehicles may violate local, state, or federal laws.
                </p>
                <p className="text-gray-600 text-sm">
                  By using this service, you confirm that the modified file will be used in compliance with all applicable laws in your jurisdiction. ECU Flash Service is not responsible for any misuse of modified files.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready for DPF-Free Performance?</h2>
          <p className="text-white/90 mb-8">Upload your ECU file and get your DPF delete solution within 20-60 minutes</p>
          <Link 
            to="/" 
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg"
          >
            Start Now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} ECU Flash Service | Professional ECU Tuning</p>
          <div className="mt-4 space-x-6">
            <Link to="/terms" className="hover:text-blue-600 transition">Terms</Link>
            <Link to="/privacy" className="hover:text-blue-600 transition">Privacy</Link>
            <Link to="/faq" className="hover:text-blue-600 transition">FAQ</Link>
            <Link to="/contact" className="hover:text-blue-600 transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DPFOffPage;
