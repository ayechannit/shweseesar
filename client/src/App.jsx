import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/Layout/DashboardLayout';
import MasterDataPage from './pages/MasterData/MasterDataPage';
import ReceptionDashboard from './pages/Reception/ReceptionDashboard';
import ExecutiveDashboard from './pages/Dashboard/ExecutiveDashboard';
import StockManagement from './pages/Stock/StockManagement';
import PricingManagement from './pages/Pricing/PricingManagement';
import GPPackageManagement from './pages/GPPackage/GPPackageManagement';
import BillingPage from './pages/Billing/BillingPage';
import ReferralPaymentManagement from './pages/Billing/ReferralPaymentManagement';
import LabPaymentManagement from './pages/Laboratory/LabPaymentManagement';
import LabTestPricing from './pages/Laboratory/LabTestPricing';
import PurchaseManagement from './pages/Purchase/PurchaseManagement';
import LaboratoryManagement from './pages/Laboratory/LaboratoryManagement';
import LaboratoryDashboard from './pages/Laboratory/LaboratoryDashboard';
import InventoryDashboard from './pages/Stock/InventoryDashboard';
import PurchaseDashboard from './pages/Purchase/PurchaseDashboard';
import ReferralDashboard from './pages/Referral/ReferralDashboard';
import ExternalReferralDashboard from './pages/Referral/ExternalReferralDashboard';
import ReportsPage from './pages/Reports/ReportsPage';
import DetailedRevenueReport from './pages/Reports/DetailedRevenueReport';

import ClinicReferralTransaction from './pages/Referral/ClinicReferralTransaction';

function App() {
  console.log('App rendering, current location:', window.location.pathname);
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ExecutiveDashboard />} />
          <Route path="/lab-dashboard" element={<LaboratoryDashboard />} />
          <Route path="/inventory-dashboard" element={<InventoryDashboard />} />
          <Route path="/purchase-dashboard" element={<PurchaseDashboard />} />
          <Route path="/referral-dashboard" element={<ReferralDashboard />} />
          <Route path="/external-referral-dashboard" element={<ExternalReferralDashboard />} />
          <Route path="/reception" element={<ReceptionDashboard />} />
          <Route path="/purchases" element={<PurchaseManagement />} />
          <Route path="/stock" element={<StockManagement />} />
          <Route path="/pricing" element={<PricingManagement />} />
          <Route path="/gp-packages" element={<GPPackageManagement />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/referral-payments" element={<ReferralPaymentManagement />} />
          <Route path="/clinic-referral-transactions" element={<ClinicReferralTransaction />} />
          <Route path="/lab-payments" element={<LabPaymentManagement />} />
          <Route path="/lab-pricing" element={<LabTestPricing />} />
          <Route path="/laboratory-investigations" element={<LaboratoryManagement />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/revenue-dashboard" element={<DetailedRevenueReport />} />
          <Route path="/patients" element={<MasterDataPage type="patients" />} />
          <Route path="/physicians" element={<MasterDataPage type="physicians" />} />
          <Route path="/medical_officers" element={<MasterDataPage type="medical_officers" />} />
          <Route path="/nurses" element={<MasterDataPage type="nurses" />} />
          <Route path="/suppliers" element={<MasterDataPage type="suppliers" />} />
          <Route path="/referred_persons" element={<MasterDataPage type="referred_persons" />} />
          <Route path="/item_categories" element={<MasterDataPage type="item_categories" />} />
          <Route path="/item_subcategories" element={<MasterDataPage type="item_subcategories" />} />
          <Route path="/laboratories" element={<MasterDataPage type="laboratories" />} />
          <Route path="/refer_clinics" element={<MasterDataPage type="refer_clinics" />} />
          <Route path="*" element={<Navigate to="/reception" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;