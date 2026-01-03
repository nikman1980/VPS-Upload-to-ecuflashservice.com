import { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "What is ECU tuning and how does it work?",
      answer: "ECU (Engine Control Unit) tuning involves modifying the software that controls your vehicle's engine parameters. By adjusting values like fuel injection timing, boost pressure, and ignition timing, we can optimize your engine's performance, improve fuel efficiency, or remove certain emission control systems. Our process involves reading your original ECU file, making precise modifications based on your requirements, and providing you with a modified file ready for flashing back to your vehicle."
    },
    {
      question: "Is ECU tuning safe for my vehicle?",
      answer: "When done professionally, ECU tuning is safe for your vehicle. Our experienced technicians understand the safe operating limits of each engine type and never push parameters beyond manufacturer tolerances. We use industry-standard tools and extensively tested calibration maps. However, it is important to note that modifications to emission systems (DPF, EGR, AdBlue) are intended for off-road and competition use only where permitted by local regulations."
    },
    {
      question: "How long does it take to receive my modified file?",
      answer: "Most orders are processed within 20-60 minutes during business hours. Complex modifications or rare ECU types may take up to 24 hours. You will receive an email notification as soon as your modified file is ready for download. Rush processing is available for urgent requests - please contact us for availability."
    },
    {
      question: "What file formats do you accept?",
      answer: "We accept all common ECU file formats including .bin, .hex, .ori, .ecu, .mod, and .fls files. File sizes typically range from 256KB to 8MB depending on the ECU type. If you are unsure about your file format, simply upload it and our system will automatically analyze it. We support ECUs from all major manufacturers including Bosch, Siemens/Continental, Denso, Delphi, Marelli, and more."
    },
    {
      question: "What is DPF delete and why would I need it?",
      answer: "DPF (Diesel Particulate Filter) delete involves removing the DPF system from your vehicle's ECU software. This is typically requested when the DPF becomes clogged or damaged, causing reduced performance, increased fuel consumption, or limp mode. DPF delete is intended for off-road and competition vehicles only. After software modification, the physical DPF may need to be removed or replaced with a straight pipe by a qualified mechanic."
    },
    {
      question: "Do you offer a warranty or guarantee on your work?",
      answer: "Yes! We stand behind our work with a satisfaction guarantee. If the modified file does not work correctly or causes issues, we will rework it free of charge until you are satisfied. Additionally, if any DTC (Diagnostic Trouble Code) errors appear related to our modifications within 30 days, we will resolve them at no extra cost. Please note that warranty does not cover physical damage to components or issues caused by incorrect flashing procedures."
    },
    {
      question: "Can I revert to my original ECU file?",
      answer: "Absolutely! We always recommend keeping a backup of your original ECU file before making any modifications. If you need to revert for any reason (warranty service, selling the vehicle, etc.), you can simply flash the original file back to your ECU. We also keep records of original files for returning customers, so contact us if you need assistance."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept payments through PayPal, which supports all major credit cards (Visa, Mastercard, American Express) as well as PayPal balance. PayPal provides buyer protection for your peace of mind. All prices are displayed in USD. For business accounts or volume orders, please contact us for alternative payment arrangements."
    },
    {
      question: "Do you support Chinese truck brands like Weichai, Sinotruk, and FAW?",
      answer: "Yes! We specialize in Chinese truck ECU tuning and have extensive experience with brands including Weichai, Yuchai, FAW, Sinotruk (HOWO), Dongfeng, Foton, and Shacman. We offer AdBlue/SCR delete, DPF solutions, and performance tuning for these vehicles. Our database includes ECU maps for most Chinese truck engine configurations."
    },
    {
      question: "How do I read and write ECU files from my vehicle?",
      answer: "ECU files can be read and written using specialized tools such as KESS, KTAG, CMD, PCMFlash, or manufacturer-specific diagnostic equipment. The method depends on your vehicle and ECU type - some can be done via OBD port while others require bench or boot mode connection. If you are not familiar with the process, we recommend visiting a professional tuning shop or automotive electrician who can assist with the reading and writing process."
    }
  ];

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
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">Find answers to common questions about our ECU tuning services</p>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition"
              >
                <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                <span className={`text-2xl text-blue-500 transition-transform ${openIndex === index ? 'rotate-45' : ''}`}>
                  +
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 pt-0">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="mb-6 opacity-90">Our support team is here to help you with any inquiries</p>
          <Link 
            to="/contact" 
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-xl hover:bg-gray-100 transition"
          >
            Contact Us
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} ECU Flash Service | Professional ECU Tuning</p>
          <p className="mt-2">⚠️ For off-road and competition use only</p>
        </div>
      </footer>
    </div>
  );
};

export default FAQPage;
