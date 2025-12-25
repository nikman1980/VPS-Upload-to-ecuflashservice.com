import { useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NewUploadFlow from './pages/NewUploadFlow';
import AdminPage from './pages/AdminPage';
import CustomerPortal from './pages/CustomerPortal';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NewUploadFlow />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/portal" element={<CustomerPortal />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;