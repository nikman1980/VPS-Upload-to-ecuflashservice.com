import { useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NewUploadFlow from './pages/NewUploadFlow';
import AdminPage from './pages/AdminPage';
import CustomerPortal from './pages/CustomerPortal';
import FAQPage from './pages/FAQPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';
import DTCRemovalPage from './pages/services/DTCRemovalPage';
import DPFOffPage from './pages/services/DPFOffPage';
import EGROffPage from './pages/services/EGROffPage';
import AdBlueOffPage from './pages/services/AdBlueOffPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NewUploadFlow />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/portal" element={<CustomerPortal />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          {/* Service Pages */}
          <Route path="/services/dtc-removal" element={<DTCRemovalPage />} />
          <Route path="/services/dpf-off" element={<DPFOffPage />} />
          <Route path="/services/egr-off" element={<EGROffPage />} />
          <Route path="/services/adblue-off" element={<AdBlueOffPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
