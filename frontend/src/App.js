import { useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import NewUploadFlow from './pages/NewUploadFlow';
import AdminPage from './pages/AdminPage';
import CustomerPortal from './pages/CustomerPortal';
import FAQPage from './pages/FAQPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';
import DTCDeletePage from './pages/DTCDeletePage';
import BlogPage from './pages/BlogPage';
import DTCRemovalPage from './pages/services/DTCRemovalPage';
import DPFOffPage from './pages/services/DPFOffPage';
import EGROffPage from './pages/services/EGROffPage';
import AdBlueOffPage from './pages/services/AdBlueOffPage';

function App() {
  return (
    <HelmetProvider>
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
          {/* Tools */}
          <Route path="/tools/dtc-delete" element={<DTCDeletePage />} />
          {/* Blog */}
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:articleId" element={<BlogPage />} />
          {/* Service Pages */}
          <Route path="/services/dtc-removal" element={<DTCRemovalPage />} />
          <Route path="/services/dpf-off" element={<DPFOffPage />} />
          <Route path="/services/egr-off" element={<EGROffPage />} />
          <Route path="/services/adblue-off" element={<AdBlueOffPage />} />
        </Routes>
      </BrowserRouter>
    </div>
    </HelmetProvider>
  );
}

export default App;
