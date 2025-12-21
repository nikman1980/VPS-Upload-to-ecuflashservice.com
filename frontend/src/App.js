import { useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SimpleUploadPage from './pages/SimpleUploadPage';
import AdminPage from './pages/AdminPage';
import RequestSuccessPage from './pages/RequestSuccessPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SimpleUploadPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/success/:requestId" element={<RequestSuccessPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;