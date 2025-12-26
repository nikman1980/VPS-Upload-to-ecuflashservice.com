import { Link } from 'react-router-dom';

const DTCRemovalPage = () => {
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
              <Link to="/services/dpf-off" className="text-gray-600 hover:text-blue-600 text-sm">DPF OFF</Link>
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
      <section className="bg-gradient-to-br from-red-500 to-orange-500 py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full mb-6">
            <span className="text-2xl">🔧</span>
            <span className="font-medium">Professional Service</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">DTC Removal Service</h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Eliminate annoying dashboard warning lights and error codes caused by modifications or faulty sensors
          </p>
          <Link 
            to="/" 
            className="inline-block bg-white text-red-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg"
          >
            Order DTC Removal →
          </Link>
        </div>
      </section>

      {/* What is DTC */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">What is DTC Removal?</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                DTC (Diagnostic Trouble Code) removal is a software modification that eliminates specific error codes from your vehicle's ECU. When sensors detect issues or when modifications trigger false errors, these codes cause warning lights on your dashboard.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our DTC removal service permanently disables the generation of specific error codes in the ECU software, preventing warning lights from appearing while maintaining normal vehicle operation.
              </p>
              <p className="text-gray-600 leading-relaxed">
                This service is essential after DPF, EGR, or AdBlue removal to prevent related error codes from triggering limp mode or dashboard warnings.
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Common DTCs We Remove</h3>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <span className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">P</span>
                  <span className="text-gray-700">P0400-P0409 (EGR System)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">P</span>
                  <span className="text-gray-700">P2002-P2004 (DPF Efficiency)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">P</span>
                  <span className="text-gray-700">P20EE-P20EF (SCR/AdBlue)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">P</span>
                  <span className="text-gray-700">P0420-P0430 (Catalyst)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">P</span>
                  <span className="text-gray-700">P0171-P0175 (Fuel System)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6 bg-gray-100">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Benefits of DTC Removal</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🚫', title: 'No Warning Lights', desc: 'Eliminate dashboard error lights permanently' },
              { icon: '⚡', title: 'No Limp Mode', desc: 'Prevent power reduction from error codes' },
              { icon: '🔧', title: 'After Modifications', desc: 'Essential after DPF/EGR/AdBlue removal' },
              { icon: '💰', title: 'Save Money', desc: 'Avoid expensive sensor replacements' },
              { icon: '✅', title: 'Clean Diagnostics', desc: 'Pass diagnostic scans without issues' },
              { icon: '🔄', title: 'Reversible', desc: 'Can be restored with original file' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                <span className="text-3xl mb-4 block">{item.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
          <div className="space-y-6">
            {[
              { step: '1', title: 'Upload Your File', desc: 'Read your ECU file using a compatible tool and upload it to our platform.' },
              { step: '2', title: 'Specify DTCs', desc: 'Tell us which error codes you want removed or describe the warning lights you\'re seeing.' },
              { step: '3', title: 'We Modify', desc: 'Our engineers locate and disable the specific DTC triggers in your ECU software.' },
              { step: '4', title: 'Flash & Go', desc: 'Download your modified file, flash it to your ECU, and enjoy error-free driving.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-6 bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-red-500 text-white rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-16 px-6 bg-amber-50">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-2xl p-8 border border-amber-200">
            <div className="flex items-start space-x-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Important Information</h3>
                <ul className="text-gray-600 space-y-2">
                  <li>• DTC removal does not fix underlying mechanical issues - it only prevents error codes from being generated</li>
                  <li>• Always diagnose and repair actual faults before requesting DTC removal</li>
                  <li>• Some DTCs are safety-related and should not be removed</li>
                  <li>• This service is intended for off-road and competition vehicles where permitted</li>
                  <li>• <strong>FREE for 1 month:</strong> If additional DTCs appear after our modification, we&apos;ll remove them at no extra cost</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-red-500 to-orange-500">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Remove Error Codes?</h2>
          <p className="text-white/90 mb-8">Upload your ECU file and get your DTC-free solution within 20-60 minutes</p>
          <Link 
            to="/" 
            className="inline-block bg-white text-red-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg"
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

export default DTCRemovalPage;
