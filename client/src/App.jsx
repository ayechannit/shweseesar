import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/Layout/DashboardLayout';
import MasterDataPage from './pages/MasterData/MasterDataPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/patients" replace />} />
          <Route path="patients" element={<MasterDataPage type="patients" />} />
          <Route path="physicians" element={<MasterDataPage type="physicians" />} />
          <Route path="medical_officers" element={<MasterDataPage type="medical_officers" />} />
          <Route path="nurses" element={<MasterDataPage type="nurses" />} />
          <Route path="suppliers" element={<MasterDataPage type="suppliers" />} />
          <Route path="referred_persons" element={<MasterDataPage type="referred_persons" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;