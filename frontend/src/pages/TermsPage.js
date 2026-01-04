import { Link } from 'react-router-dom';

const TermsPage = () => {
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
            <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Blue Gradient */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Terms of Service</h1>
          <p className="text-white/90">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                By accessing and using ECU Flash Service (&quot;the Service&quot;), operated by <strong>ECU Flash Service, Sole Trader</strong>, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
              <p className="text-gray-600 leading-relaxed">
                These terms apply to all users of the Service, including without limitation users who are browsers, customers, merchants, and/or contributors of content.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Service Description</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                ECU Flash Service provides electronic engine control unit (ECU) file modification services. Our services include but are not limited to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>ECU file analysis and diagnostics</li>
                <li>Performance tuning and optimization</li>
                <li>DPF (Diesel Particulate Filter) software solutions</li>
                <li>EGR (Exhaust Gas Recirculation) software solutions</li>
                <li>AdBlue/SCR system software modifications</li>
                <li>DTC (Diagnostic Trouble Code) removal</li>
                <li>Speed limiter adjustments</li>
                <li>Stage 1, Stage 2, and custom performance tuning</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Intended Use & Legal Disclaimer</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-4">
                <p className="text-amber-800 font-semibold mb-2">⚠️ Important Notice</p>
                <p className="text-amber-700">
                  All modifications to emission control systems (DPF, EGR, AdBlue/SCR, catalytic converters) are intended <strong>SOLELY for off-road, racing, and competition use</strong> in jurisdictions where such modifications are permitted. It is the customer responsibility to ensure compliance with all applicable local, state, and federal laws and regulations.
                </p>
              </div>
              <p className="text-gray-600 leading-relaxed">
                By using our services, you confirm that you understand the modified files will be used in accordance with all applicable laws in your jurisdiction. ECU Flash Service shall not be held liable for any misuse of the modified files or any violations of environmental regulations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Customer Responsibilities</h2>
              <p className="text-gray-600 leading-relaxed mb-4">As a customer, you agree to:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Provide accurate vehicle and ECU information</li>
                <li>Ensure the original ECU file is correctly read and not corrupted</li>
                <li>Maintain a backup of your original ECU file before any modifications</li>
                <li>Use appropriate and compatible tools for reading and writing ECU files</li>
                <li>Understand that improper flashing procedures may damage your ECU or vehicle</li>
                <li>Comply with all applicable laws regarding vehicle modifications in your jurisdiction</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Warranty & Guarantees</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                ECU Flash Service provides the following guarantees:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li><strong>File Quality:</strong> Modified files are tested and verified before delivery</li>
                <li><strong>Rework Policy:</strong> Free rework if the modified file does not function as specified</li>
                <li><strong>DTC Support:</strong> Free DTC correction for 30 days on the same file</li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                Our warranty does not cover: physical damage to ECU or vehicle components, issues caused by incorrect flashing procedures, use of incompatible or faulty reading/writing tools, or customer-provided incorrect vehicle information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Payment Terms</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                All payments are processed securely through PayPal. By making a purchase, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Pay the full amount as displayed at checkout</li>
                <li>All prices are in USD unless otherwise specified</li>
                <li>Payments are non-refundable once the modified file has been delivered</li>
                <li>Refunds may be issued at our discretion if the service cannot be completed</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
              <p className="text-gray-600 leading-relaxed">
                All modified ECU files are provided for your personal use only. You may not redistribute, sell, or share modified files with third parties. ECU Flash Service retains all intellectual property rights to our modification methodologies, calibration data, and proprietary techniques.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                To the maximum extent permitted by law, ECU Flash Service shall not be liable for:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Damage to your vehicle, engine, or ECU resulting from modifications</li>
                <li>Loss of vehicle warranty due to ECU modifications</li>
                <li>Legal penalties or fines resulting from use of modified files</li>
                <li>Any damages exceeding the amount paid for the specific service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Modifications to Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                ECU Flash Service reserves the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to our website. Your continued use of the Service after any changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Governing Law</h2>
              <p className="text-gray-600 leading-relaxed">
                These Terms of Service shall be governed by and construed in accordance with the laws of <strong>Fiji</strong>, without regard to its conflict of law provisions. Any disputes arising from or relating to these terms shall be subject to the exclusive jurisdiction of the courts of Fiji.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Business Information</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>ECU Flash Service</strong> is a Sole Trader business providing professional ECU tuning and file modification services.
              </p>
              <p className="text-gray-600 leading-relaxed">
                For business inquiries, support, or questions about these Terms of Service, please contact us through our <Link to="/contact" className="text-blue-600 hover:underline">Contact Page</Link> or email us at <a href="mailto:support@ecuflashservice.com" className="text-blue-600 hover:underline">support@ecuflashservice.com</a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer - Dark Background */}
      <footer className="bg-gray-900 text-white py-12 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">© {new Date().getFullYear()} ECU Flash Service | Sole Trader | Professional ECU Tuning</p>
          <div className="mt-4 space-x-6">
            <Link to="/privacy" className="text-gray-400 hover:text-white transition">Privacy Policy</Link>
            <Link to="/refund" className="text-gray-400 hover:text-white transition">Refund Policy</Link>
            <Link to="/faq" className="text-gray-400 hover:text-white transition">FAQ</Link>
            <Link to="/contact" className="text-gray-400 hover:text-white transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
