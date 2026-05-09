import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './pages/Auth/Login';
import Unauthorized from './pages/Auth/Unauthorized';
import UserManagement from './pages/Auth/UserManagement';
import RoleManagement from './pages/Auth/RoleManagement';

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
import StockBalanceReport from './pages/Reports/StockBalanceReport';

import ClinicReferralTransaction from './pages/Referral/ClinicReferralTransaction';
import VoucherSettings from './pages/MasterData/VoucherSettings';
import PatientDashboard from './pages/Tca/TcaDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/reception" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute requiredPermission="access_dashboard"><ExecutiveDashboard /></ProtectedRoute>} />
            <Route path="/reception" element={<ProtectedRoute requiredPermission="access_reception"><ReceptionDashboard /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute requiredPermission="access_billing"><BillingPage /></ProtectedRoute>} />
            <Route path="/referral-payments" element={<ProtectedRoute requiredPermission="access_referral_payouts"><ReferralPaymentManagement /></ProtectedRoute>} />
            <Route path="/clinic-referral-transactions" element={<ProtectedRoute requiredPermission="access_clinic_referrals"><ClinicReferralTransaction /></ProtectedRoute>} />
            
            <Route path="/stock" element={<ProtectedRoute requiredPermission="access_inventory"><StockManagement /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute requiredPermission="access_purchases"><PurchaseManagement /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute requiredPermission="access_price_list"><PricingManagement /></ProtectedRoute>} />
            <Route path="/gp-packages" element={<ProtectedRoute requiredPermission="access_gp_packages"><GPPackageManagement /></ProtectedRoute>} />
            <Route path="/laboratory-investigations" element={<ProtectedRoute requiredPermission="access_laboratory"><LaboratoryManagement /></ProtectedRoute>} />
            <Route path="/lab-pricing" element={<ProtectedRoute requiredPermission="access_lab_pricing"><LabTestPricing /></ProtectedRoute>} />
            
            <Route path="/tca-dashboard" element={<ProtectedRoute requiredPermission="access_tca_dashboard"><PatientDashboard /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute requiredPermission="access_reports_center"><ReportsPage /></ProtectedRoute>} />
            <Route path="/revenue-dashboard" element={<ProtectedRoute requiredPermission="access_revenue_dashboard"><DetailedRevenueReport /></ProtectedRoute>} />
            <Route path="/referral-dashboard" element={<ProtectedRoute requiredPermission="access_referral_dashboard"><ReferralDashboard /></ProtectedRoute>} />
            <Route path="/external-referral-dashboard" element={<ProtectedRoute requiredPermission="access_ext_referral_dashboard"><ExternalReferralDashboard /></ProtectedRoute>} />
            <Route path="/lab-dashboard" element={<ProtectedRoute requiredPermission="access_lab_dashboard"><LaboratoryDashboard /></ProtectedRoute>} />
            <Route path="/inventory-dashboard" element={<ProtectedRoute requiredPermission="access_inventory_dashboard"><InventoryDashboard /></ProtectedRoute>} />
            <Route path="/stock-balance-report" element={<ProtectedRoute requiredPermission="access_stock_balance_report"><StockBalanceReport /></ProtectedRoute>} />
            <Route path="/purchase-dashboard" element={<ProtectedRoute requiredPermission="access_purchase_dashboard"><PurchaseDashboard /></ProtectedRoute>} />
            <Route path="/lab-payments" element={<ProtectedRoute requiredPermission="access_lab_payouts"><LabPaymentManagement /></ProtectedRoute>} />
            
            <Route path="/voucher-settings" element={<ProtectedRoute requiredPermission="access_voucher_settings"><VoucherSettings /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute requiredPermission="manage_users"><UserManagement /></ProtectedRoute>} />
            <Route path="/roles" element={<ProtectedRoute requiredPermission="manage_users"><RoleManagement /></ProtectedRoute>} />
            
            <Route path="/patients" element={<ProtectedRoute requiredPermission="access_master_patients"><MasterDataPage type="patients" /></ProtectedRoute>} />
            <Route path="/physicians" element={<ProtectedRoute requiredPermission="access_master_physicians"><MasterDataPage type="physicians" /></ProtectedRoute>} />
            <Route path="/medical_officers" element={<ProtectedRoute requiredPermission="access_master_mo"><MasterDataPage type="medical_officers" /></ProtectedRoute>} />
            <Route path="/nurses" element={<ProtectedRoute requiredPermission="access_master_nurses"><MasterDataPage type="nurses" /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute requiredPermission="access_master_suppliers"><MasterDataPage type="suppliers" /></ProtectedRoute>} />
            <Route path="/referred_persons" element={<ProtectedRoute requiredPermission="access_master_referrers"><MasterDataPage type="referred_persons" /></ProtectedRoute>} />
            <Route path="/item_categories" element={<ProtectedRoute requiredPermission="access_master_categories"><MasterDataPage type="item_categories" /></ProtectedRoute>} />
            <Route path="/item_subcategories" element={<ProtectedRoute requiredPermission="access_master_subcategories"><MasterDataPage type="item_subcategories" /></ProtectedRoute>} />
            <Route path="/laboratories" element={<ProtectedRoute requiredPermission="access_master_laboratories"><MasterDataPage type="laboratories" /></ProtectedRoute>} />
            <Route path="/refer_clinics" element={<ProtectedRoute requiredPermission="access_master_refer_clinics"><MasterDataPage type="refer_clinics" /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/reception" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;