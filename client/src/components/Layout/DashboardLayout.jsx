import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Users, UserPlus, Stethoscope, HeartPulse, Truck, Share2, 
  Menu, X, Database, ChevronDown, ChevronRight, Monitor, 
  Package, Tags, FileText, FlaskConical, DollarSign, 
  LayoutDashboard, BarChart3, Settings, Bell, Search, ShoppingBag, Layout, CreditCard, Percent, TrendingUp
} from 'lucide-react';

const masterDataLinks = [
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/physicians', label: 'Physicians', icon: Stethoscope },
  { path: '/medical_officers', label: 'Medical Officers', icon: UserPlus },
  { path: '/nurses', label: 'Nurses', icon: HeartPulse },
  { path: '/suppliers', label: 'Suppliers', icon: Truck },
  { path: '/referred_persons', label: 'Referred Persons', icon: Share2 },
  { path: '/laboratories', label: 'Laboratories', icon: FlaskConical },
  { path: '/refer_clinics', label: 'Refer Clinics', icon: Monitor },
];

export default function DashboardLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(false);

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

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
            <SidebarLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/reception" icon={<Monitor size={20} />} label="Reception" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/billing" icon={<FileText size={20} />} label="Billing" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/referral-payments" icon={<DollarSign size={20} />} label="Referral Payouts" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/clinic-referral-transactions" icon={<Share2 size={20} />} label="Clinic Referrals" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
          </div>

          <div className="nav-section">
            <span className="section-label">Operations</span>
            <SidebarLink to="/stock" icon={<Package size={20} />} label="Inventory" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/purchases" icon={<ShoppingBag size={20} />} label="Purchases" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/pricing" icon={<Tags size={20} />} label="Price List" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/gp-packages" icon={<Layout size={20} />} label="GP Packages" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/laboratory-investigations" icon={<FlaskConical size={20} />} label="Laboratory" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/lab-pricing" icon={<Percent size={20} />} label="Lab Pricing Setup" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
          </div>

          <div className="nav-section">
            <span className="section-label">Analysis</span>
            <SidebarLink to="/reports" icon={<BarChart3 size={20} />} label="Reports Center" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/revenue-dashboard" icon={<TrendingUp size={20} />} label="Revenue Dashboard" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
            <SidebarLink to="/lab-payments" icon={<CreditCard size={20} />} label="Lab Payouts" onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)} />
          </div>

          <div className="nav-section">
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
                {masterDataLinks.map(link => (
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
             <div className="user-avatar">AD</div>
             <div className="user-info">
               <span className="user-name">Administrator</span>
               <span className="user-role">Clinic Manager</span>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`main-container-modern ${isDrawerOpen ? 'with-sidebar' : 'full-width'}`}>
        <header className="topbar-modern">
          <button className="menu-toggle" onClick={toggleDrawer}>
            <Menu size={22} />
          </button>
          
          {/* <div className="topbar-search">
            <Search size={18} color="#94a3b8" />
            <input type="text" placeholder="Search patients or vouchers..." />
          </div> */}

          <div className="topbar-actions">
            <button className="icon-btn-modern"><Bell size={20} /><span className="badge-dot"></span></button>
            <button className="icon-btn-modern"><Settings size={20} /></button>
          </div>
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
        .user-info { display: flex; flex-direction: column; }
        .user-name { font-size: 0.85rem; font-weight: 700; color: #1e293b; }
        .user-role { font-size: 0.7rem; color: #94a3b8; }

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

        .topbar-search {
          flex: 1;
          max-width: 500px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f1f5f9;
          padding: 0.6rem 1.25rem;
          border-radius: 12px;
        }
        .topbar-search input {
          background: none;
          border: none;
          outline: none;
          width: 100%;
          font-size: 0.9rem;
          color: #1e293b;
          font-weight: 500;
        }

        .topbar-actions { display: flex; align-items: center; gap: 1rem; }
        .icon-btn-modern {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #64748b;
          cursor: pointer;
          position: relative;
        }
        .badge-dot {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
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
          .topbar-search { display: none; }
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
