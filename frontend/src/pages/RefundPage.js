import { Link } from 'react-router-dom';

const RefundPage = () => {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Refund Policy</h1>
          <p className="text-white/90">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Overview</h2>
              <p className="text-gray-600 leading-relaxed">
                <strong>ECU Flash Service, Sole Trader</strong> is committed to customer satisfaction. This Refund Policy outlines the terms and conditions under which refunds may be provided for our ECU file modification services. By using our services, you agree to the terms of this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Nature of Our Services</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                ECU Flash Service provides digital file modification services. Our services include:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>ECU file tuning and optimization</li>
                <li>DTC (Diagnostic Trouble Code) deletion</li>
                <li>DPF, EGR, and AdBlue software solutions</li>
                <li>Performance tuning (Stage 1, Stage 2)</li>
                <li>Speed limiter modifications</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                Due to the digital nature of our services, once a modified file has been delivered, the service is considered complete and fulfilled.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Refund Eligibility</h2>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">✓ Eligible for Refund</h3>
                <ul className="list-disc pl-6 text-green-700 space-y-2">
                  <li><strong>Service Not Delivered:</strong> If we are unable to process your file within 24 hours of payment and you have not received any modified file</li>
                  <li><strong>Technical Impossibility:</strong> If we determine that the requested modification cannot be performed on your specific ECU file</li>
                  <li><strong>Duplicate Payment:</strong> If you were charged multiple times for the same order in error</li>
                  <li><strong>File Not Received:</strong> If you did not receive the download link or the file is inaccessible due to our technical issues</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-800 mb-2">✗ Not Eligible for Refund</h3>
                <ul className="list-disc pl-6 text-red-700 space-y-2">
                  <li><strong>File Already Delivered:</strong> Once the modified file has been sent to you and successfully downloaded</li>
                  <li><strong>Change of Mind:</strong> If you decide you no longer want the modification after placing the order</li>
                  <li><strong>Incorrect Information:</strong> If you provided incorrect vehicle or ECU information that resulted in an incompatible modification</li>
                  <li><strong>Third-Party Issues:</strong> Problems caused by your tuning tool, flash equipment, or installation process</li>
                  <li><strong>Legal or Regulatory Reasons:</strong> If you cannot use the modified file due to local laws or regulations</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Free Rework Guarantee</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Instead of a refund, we offer a <strong>free rework guarantee</strong> for the following situations:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>File Does Not Work as Specified:</strong> If the modified file does not function as described, we will rework it at no additional cost</li>
                <li><strong>Additional DTC Codes:</strong> Free DTC correction for 30 days on the same file</li>
                <li><strong>Fine-Tuning Requests:</strong> Minor adjustments to the modification within 14 days of delivery</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                Our goal is to ensure you receive a working, satisfactory modification. We encourage customers to contact us for rework before requesting a refund.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Refund Process</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                To request a refund, please follow these steps:
              </p>
              <ol className="list-decimal pl-6 text-gray-600 space-y-2">
                <li>Contact us within <strong>7 days</strong> of your purchase via our <Link to="/contact" className="text-blue-600 hover:underline">Contact Page</Link> or email <a href="mailto:support@ecuflashservice.com" className="text-blue-600 hover:underline">support@ecuflashservice.com</a></li>
                <li>Provide your <strong>Order ID</strong> and the <strong>reason for refund request</strong></li>
                <li>Include any relevant documentation (screenshots, error messages, etc.)</li>
                <li>Our team will review your request within <strong>2-3 business days</strong></li>
                <li>If approved, refunds will be processed to your original payment method within <strong>5-10 business days</strong></li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Partial Refunds</h2>
              <p className="text-gray-600 leading-relaxed">
                In some cases, we may offer a partial refund at our discretion. This may apply when:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
                <li>Only part of the requested service could be completed</li>
                <li>There were minor issues with the delivery that did not significantly impact the service</li>
                <li>A compromise is reached between the customer and our support team</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Chargebacks</h2>
              <p className="text-gray-600 leading-relaxed">
                We encourage customers to contact us directly before initiating a chargeback with their payment provider. Chargebacks initiated without first contacting our support team may result in the customer being blocked from future services. We are committed to resolving disputes amicably and fairly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Governing Law</h2>
              <p className="text-gray-600 leading-relaxed">
                This Refund Policy shall be governed by and construed in accordance with the laws of <strong>Fiji</strong>. Any disputes arising from this policy shall be subject to the exclusive jurisdiction of the courts of Fiji.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact Us</h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about this Refund Policy or need assistance with a refund request, please contact us:
              </p>
              <ul className="list-none pl-0 text-gray-600 space-y-2 mt-4">
                <li><strong>Email:</strong> <a href="mailto:support@ecuflashservice.com" className="text-blue-600 hover:underline">support@ecuflashservice.com</a></li>
                <li><strong>Contact Form:</strong> <Link to="/contact" className="text-blue-600 hover:underline">Contact Page</Link></li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Policy Updates</h2>
              <p className="text-gray-600 leading-relaxed">
                ECU Flash Service reserves the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting to our website. Your continued use of our services after any changes constitutes acceptance of the updated policy.
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
            <Link to="/terms" className="text-gray-400 hover:text-white transition">Terms of Service</Link>
            <Link to="/privacy" className="text-gray-400 hover:text-white transition">Privacy Policy</Link>
            <Link to="/faq" className="text-gray-400 hover:text-white transition">FAQ</Link>
            <Link to="/contact" className="text-gray-400 hover:text-white transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RefundPage;
