import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/Layout/DashboardLayout';
import MasterDataPage from './pages/MasterData/MasterDataPage';
import ReceptionDashboard from './pages/Reception/ReceptionDashboard';
import StockManagement from './pages/Stock/StockManagement';
import PricingManagement from './pages/Pricing/PricingManagement';
import GPPackageManagement from './pages/GPPackage/GPPackageManagement';
import BillingPage from './pages/Billing/BillingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/reception" replace />} />
          <Route path="reception" element={<ReceptionDashboard />} />
          <Route path="stock" element={<StockManagement />} />
          <Route path="pricing" element={<PricingManagement />} />
          <Route path="gp-packages" element={<GPPackageManagement />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="patients" element={<MasterDataPage type="patients" />} />
          <Route path="physicians" element={<MasterDataPage type="physicians" />} />
          <Route path="medical_officers" element={<MasterDataPage type="medical_officers" />} />
          <Route path="nurses" element={<MasterDataPage type="nurses" />} />
          <Route path="suppliers" element={<MasterDataPage type="suppliers" />} />
          <Route path="referred_persons" element={<MasterDataPage type="referred_persons" />} />
          <Route path="item_categories" element={<MasterDataPage type="item_categories" />} />
          <Route path="item_subcategories" element={<MasterDataPage type="item_subcategories" />} />
          <Route path="laboratories" element={<MasterDataPage type="laboratories" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;