import { Link } from 'react-router-dom';

const EGROffPage = () => {
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
              <Link to="/services/adblue-off" className="text-gray-600 hover:text-blue-600 text-sm hidden md:block">AdBlue OFF</Link>
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
            <span className="text-2xl">🌿</span>
            <span className="font-medium">Engine Health</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">EGR Delete Service</h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Eliminate carbon buildup and restore your engine&apos;s efficiency by disabling the EGR system
          </p>
          <Link 
            to="/" 
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg"
          >
            Order EGR Delete →
          </Link>
        </div>
      </section>

      {/* What is EGR */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">What is EGR Delete?</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                The Exhaust Gas Recirculation (EGR) system redirects a portion of exhaust gases back into the engine&apos;s intake manifold to reduce nitrogen oxide (NOx) emissions. While environmentally beneficial, this system introduces hot, dirty exhaust gases into your engine.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                EGR delete is an ECU software modification that disables the EGR valve operation and related monitoring systems. This prevents exhaust gases from recirculating into the engine, keeping the intake system clean and improving combustion efficiency.
              </p>
              <p className="text-gray-600 leading-relaxed">
                The modification includes disabling EGR valve control, EGR cooler monitoring, and all related diagnostic trouble codes to ensure smooth operation.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">What We Disable</h3>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">EGR valve actuation</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">EGR position monitoring</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">EGR cooler bypass valve</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">EGR temperature sensors</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
                  <span className="text-gray-700">Related DTC error codes</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-16 px-6 bg-gray-100">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">The EGR Problem</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Why many diesel owners choose to delete the EGR system</p>
          
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Carbon Buildup - The Silent Engine Killer</h3>
            <p className="text-gray-600 mb-4">
              When hot, sooty exhaust gases mix with oil vapors from the crankcase ventilation system, they create a sticky, tar-like substance that coats the intake manifold, intake valves, and EGR passages. Over time, this buildup:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Restricts airflow to the engine',
                'Reduces combustion efficiency',
                'Causes rough idle and misfires',
                'Decreases power and throttle response',
                'Increases fuel consumption',
                'Can cause complete EGR valve failure'
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🔧', title: 'EGR Valve Failure', desc: 'Carbon buildup causes the valve to stick open or closed, triggering limp mode' },
              { icon: '❄️', title: 'Cooler Cracks', desc: 'EGR coolers can crack, leaking coolant into the exhaust and causing overheating' },
              { icon: '💨', title: 'Intake Clogging', desc: 'Severe buildup can reduce intake port size by 50% or more' },
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

      {/* Benefits */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Benefits of EGR Delete</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🧹', title: 'Cleaner Intake System', desc: 'No more soot and carbon entering your intake manifold. Fresh air only means cleaner combustion.' },
              { icon: '🌡️', title: 'Lower Intake Temps', desc: 'Removing hot exhaust gases reduces intake temperatures, increasing air density and power.' },
              { icon: '⚡', title: 'Better Throttle Response', desc: 'Cleaner intake paths mean better airflow and more responsive acceleration.' },
              { icon: '⛽', title: 'Improved Fuel Economy', desc: 'More efficient combustion with fresh air leads to better fuel consumption.' },
              { icon: '💪', title: 'Extended Engine Life', desc: 'Eliminating carbon buildup reduces wear on valves, pistons, and turbo.' },
              { icon: '🔄', title: 'Reduced Maintenance', desc: 'No more EGR valve cleaning, cooler replacements, or intake walnut blasting.' },
            ].map((item, i) => (
              <div key={i} className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 flex items-start space-x-4">
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

      {/* Combine with DPF */}
      <section className="py-16 px-6 bg-gradient-to-r from-green-500 to-teal-600">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-2xl font-bold mb-4">💡 Best Results: Combine with DPF Delete</h2>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            For maximum performance and reliability gains, many customers choose to delete both EGR and DPF systems together. This combination provides the cleanest intake, lowest exhaust back pressure, and greatest efficiency improvements.
          </p>
          <Link 
            to="/services/dpf-off" 
            className="inline-block bg-white text-green-600 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition"
          >
            Learn About DPF Delete →
          </Link>
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
                  EGR delete is intended <strong>ONLY for off-road, racing, and competition vehicles</strong> in jurisdictions where such modifications are permitted. Tampering with emission control devices on road-registered vehicles may violate environmental regulations.
                </p>
                <p className="text-gray-600 text-sm">
                  We recommend consulting local regulations before proceeding with any emission system modifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-green-500 to-teal-600">
        <div className="container mx-auto max-w-4xl text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready for a Cleaner Engine?</h2>
          <p className="text-white/90 mb-8">Upload your ECU file and get your EGR delete solution within 20-60 minutes</p>
          <Link 
            to="/" 
            className="inline-block bg-white text-green-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition shadow-lg"
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

export default EGROffPage;
