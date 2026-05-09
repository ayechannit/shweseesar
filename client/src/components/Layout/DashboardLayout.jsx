import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Stethoscope, HeartPulse, Truck, Share2, 
  Menu, X, Database, ChevronDown, ChevronRight, Monitor, 
  Package, Tags, FileText, FlaskConical, DollarSign, 
  LayoutDashboard, BarChart3, Settings, Bell, Search, ShoppingBag, Layout, CreditCard, Percent, TrendingUp, Activity, ShoppingCart, Calendar, LogOut, UserCog, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const masterDataLinks = [
  { path: '/patients', label: 'Patients', icon: Users, permission: 'access_master_patients' },
  { path: '/physicians', label: 'Physicians', icon: Stethoscope, permission: 'access_master_physicians' },
  { path: '/medical_officers', label: 'Medical Officers', icon: UserPlus, permission: 'access_master_mo' },
  { path: '/nurses', label: 'Nurses', icon: HeartPulse, permission: 'access_master_nurses' },
  { path: '/suppliers', label: 'Suppliers', icon: Truck, permission: 'access_master_suppliers' },
  { path: '/referred_persons', label: 'Referred Persons', icon: Share2, permission: 'access_master_referrers' },
  { path: '/laboratories', label: 'Laboratories', icon: FlaskConical, permission: 'access_master_laboratories' },
  { path: '/refer_clinics', label: 'Refer Clinics', icon: Monitor, permission: 'access_master_refer_clinics' },
  { path: '/voucher-settings', label: 'Voucher Settings', icon: Settings, permission: 'access_voucher_settings' },
];

export default function DashboardLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  
  const navigate = useNavigate();

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'Admin';

  const renderSidebarLink = (to, icon, label, permission) => {
    if (!isAdmin && permission && !hasPermission(permission)) return null;
    return <SidebarLink to={to} icon={icon} label={label} onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />;
  };

  return (
    <div className="app-container">
      {/* Modern Sidebar */}
      <aside className={`sidebar-modern ${isDrawerOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header-modern">
          <div className="brand-box">
            <div className="brand-logo">S</div>
            <span className="brand-name">Shwe See Sar</span>
          </div>
          <button className="mobile-close" onClick={toggleDrawer}><X size={20} /></button>
        </div>

        <nav className="sidebar-nav-modern">
          <div className="nav-section">
            <span className="section-label">Main Menu</span>
            {renderSidebarLink('/dashboard', <LayoutDashboard size={20} />, 'Dashboard', 'access_dashboard')}
            {renderSidebarLink('/reception', <Monitor size={20} />, 'Reception', 'access_reception')}
            {renderSidebarLink('/billing', <FileText size={20} />, 'Billing', 'access_billing')}
            {renderSidebarLink('/referral-payments', <DollarSign size={20} />, 'Referral Payouts', 'access_referral_payouts')}
            {renderSidebarLink('/clinic-referral-transactions', <Share2 size={20} />, 'Clinic Referrals', 'access_clinic_referrals')}
          </div>

          <div className="nav-section">
            <span className="section-label">Operations</span>
            {renderSidebarLink('/stock', <Package size={20} />, 'Inventory', 'access_inventory')}
            {renderSidebarLink('/purchases', <ShoppingBag size={20} />, 'Purchases', 'access_purchases')}
            {renderSidebarLink('/pricing', <Tags size={20} />, 'Price List', 'access_price_list')}
            {renderSidebarLink('/gp-packages', <Layout size={20} />, 'GP Packages', 'access_gp_packages')}
            {renderSidebarLink('/laboratory-investigations', <FlaskConical size={20} />, 'Laboratory', 'access_laboratory')}
            {renderSidebarLink('/lab-pricing', <Percent size={20} />, 'Lab Pricing Setup', 'access_lab_pricing')}
          </div>

          <div className="nav-section">
            <span className="section-label">Analysis</span>
            {renderSidebarLink('/tca-dashboard', <User size={20} />, 'Patient Dashboard', 'access_tca_dashboard')}
            {renderSidebarLink('/reports', <BarChart3 size={20} />, 'Reports Center', 'access_reports_center')}
            {renderSidebarLink('/revenue-dashboard', <TrendingUp size={20} />, 'Revenue Dashboard', 'access_revenue_dashboard')}
            {renderSidebarLink('/referral-dashboard', <Users size={20} />, 'Referral Dashboard', 'access_referral_dashboard')}
            {renderSidebarLink('/external-referral-dashboard', <Share2 size={20} />, 'Ext. Referral Dashboard', 'access_ext_referral_dashboard')}
            {renderSidebarLink('/lab-dashboard', <Activity size={20} />, 'Lab Dashboard', 'access_lab_dashboard')}
            {renderSidebarLink('/inventory-dashboard', <Package size={20} />, 'Inventory Dashboard', 'access_inventory_dashboard')}
            {renderSidebarLink('/stock-balance-report', <FileText size={20} />, 'Stock Balance Report', 'access_stock_balance_report')}
            {renderSidebarLink('/purchase-dashboard', <ShoppingCart size={20} />, 'Purchase Dashboard', 'access_purchase_dashboard')}
            {renderSidebarLink('/lab-payments', <CreditCard size={20} />, 'Lab Payouts', 'access_lab_payouts')}
          </div>

          <div className="nav-section">
            {(isAdmin || hasPermission('manage_users')) && (
               <>
                 <SidebarLink to="/users" icon={<UserCog size={20} />} label="User Management" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
                 <SidebarLink to="/roles" icon={<Users size={20} />} label="Role Management" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
               </>
            )}

            <button 
              className={`nav-dropdown-btn ${isMasterDataOpen ? 'active' : ''}`}
              onClick={() => setIsMasterDataOpen(!isMasterDataOpen)}
            >
              <div className="flex-center gap-3">
                <Database size={20} />
                <span>Master Data</span>
              </div>
              {isMasterDataOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {isMasterDataOpen && (
              <div className="dropdown-content-modern">
                {masterDataLinks
                  .filter(link => !link.permission || hasPermission(link.permission))
                  .map(link => (
                    <NavLink 
                      key={link.path} 
                      to={link.path} 
                      className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                      onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)}
                    >
                      <link.icon size={16} />
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
              </div>
            )}
          </div>
        </nav>

        <div className="sidebar-footer-modern">
           <div className="user-profile-pill">
             <div className="user-avatar">{user?.username?.substring(0, 2).toUpperCase() || '??'}</div>
             <div className="user-info">
               <span className="user-name">{user?.username || 'Guest'}</span>
               <span className="user-role">{user?.role || 'User'}</span>
             </div>
             <button 
               onClick={handleLogout}
               className="logout-btn"
               title="Logout"
             >
               <LogOut size={18} />
             </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`main-container-modern ${isDrawerOpen ? 'with-sidebar' : 'full-width'}`}>
        <header className="topbar-modern">
          <button className="menu-toggle" onClick={toggleDrawer}>
            <Menu size={22} />
          </button>
          
          <div style={{ flex: 1 }}></div>

        </header>

        <div className="content-scroller">
          <div className="content-inner">
            <Outlet />
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --sidebar-width: 280px;
          --topbar-height: 70px;
          --primary-brand: #2563eb;
          --sidebar-bg: #ffffff;
          --app-bg: #f8fafc;
          --border-light: #f1f5f9;
        }

        .app-container {
          display: flex;
          height: 100vh;
          background: var(--app-bg);
          font-family: 'Inter', system-ui, sans-serif;
          overflow: hidden;
        }

        /* Sidebar Styles */
        .sidebar-modern {
          width: var(--sidebar-width);
          min-width: var(--sidebar-width); /* Add min-width to prevent shrinking */
          box-sizing: border-box; /* Ensure padding/borders don't affect width */
          background: var(--sidebar-bg);
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
          position: relative;
        }

        .sidebar-modern.closed { margin-left: calc(-1 * var(--sidebar-width)); }

        .sidebar-header-modern {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .brand-box { display: flex; align-items: center; gap: 0.75rem; }
        .brand-logo {
          width: 36px;
          height: 36px;
          background: var(--primary-brand);
          color: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.25rem;
        }
        .brand-name { font-weight: 800; font-size: 1.15rem; color: #0f172a; letter-spacing: -0.02em; }

        .sidebar-nav-modern {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .nav-section { display: flex; flex-direction: column; gap: 0.25rem; }
        .section-label { 
          font-size: 0.7rem; 
          font-weight: 800; 
          text-transform: uppercase; 
          color: #94a3b8; 
          padding: 0 0.75rem 0.5rem; 
          letter-spacing: 0.05em;
        }

        .nav-link-modern {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          color: #64748b;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.925rem;
          transition: all 0.2s;
        }

        .nav-link-modern:hover { background: #f1f5f9; color: #0f172a; }
        .nav-link-modern.active { background: #eff6ff; color: var(--primary-brand); }

        .nav-dropdown-btn {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          border-radius: 12px;
          color: #64748b;
          font-weight: 600;
          font-size: 0.925rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-dropdown-btn:hover { background: #f1f5f9; }

        .dropdown-content-modern {
          margin-top: 0.25rem;
          padding-left: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 1rem;
          border-radius: 10px;
          color: #64748b;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .dropdown-item:hover { color: #0f172a; background: #f8fafc; }
        .dropdown-item.active { color: var(--primary-brand); font-weight: 700; }

        .sidebar-footer-modern {
          padding: 1.25rem;
          border-top: 1px solid #f1f5f9;
        }

        .user-profile-pill {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 16px;
        }
        .user-avatar {
          width: 38px;
          height: 38px;
          background: #e2e8f0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #475569;
          font-size: 0.8rem;
        }
        .user-info { display: flex; flex-grow: 1; flex-direction: column; min-width: 0; }
        .user-name { font-size: 0.85rem; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .user-role { font-size: 0.7rem; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .logout-btn {
          color: #94a3b8;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s;
          background: none;
          border: none;
          cursor: pointer;
        }
        .logout-btn:hover { background: #fee2e2; color: #ef4444; }

        /* Main Container Styles */
        .main-container-modern {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .topbar-modern {
          height: var(--topbar-height);
          background: white;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          padding: 0 2rem;
          gap: 2rem;
        }

        .content-scroller {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
        }

        .content-inner {
          max-width: 1600px;
          margin: 0 auto;
        }

        .mobile-close { display: none; background: none; border: none; color: #94a3b8; }
        .menu-toggle { background: none; border: none; color: #64748b; cursor: pointer; }

        @media (max-width: 768px) {
          .sidebar-modern { position: fixed; height: 100%; left: 0; }
          .sidebar-modern.closed { left: calc(-1 * var(--sidebar-width)); margin-left: 0; }
          .main-container-modern { width: 100%; }
          .mobile-close { display: block; }
        }

        /* Utility Classes */
        .flex-center { display: flex; align-items: center; }
        .gap-3 { gap: 0.75rem; }
      `}} />
    </div>
  );
}

function SidebarLink({ to, icon, label, onClick }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => `nav-link-modern ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
