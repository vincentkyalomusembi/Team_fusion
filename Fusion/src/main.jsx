import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard/Dashboard';
import Results from './pages/Results/Results';
import Report from './pages/Report/Report';
import Auth from './pages/Auth/Auth';
import './styles/global.css';


ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<Auth mode="signin" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          {/* Dashboard is a layout: /portfolios slides the upload sheet over it */}
          <Route element={<Dashboard />}>
            <Route path="/dashboard" element={null} />
            <Route path="/portfolios" element={null} />
          </Route>

          {/* Results + report are separate pages */}
          <Route path="/analysis/:id" element={<Results />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/results/:id/report" element={<Report />} />

          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/signup" replace />} />
          <Route path="*" element={<Navigate to="/signup" replace />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
);
