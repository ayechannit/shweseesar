import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, UserPlus, Stethoscope, HeartPulse, Truck, Share2, Menu, X, Database, ChevronDown, ChevronRight, Monitor, Package, Tags, FileText } from 'lucide-react';

const navItems = [
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/physicians', label: 'Physicians', icon: Stethoscope },
  { path: '/medical_officers', label: 'Medical Officers', icon: UserPlus },
  { path: '/nurses', label: 'Nurses', icon: HeartPulse },
  { path: '/suppliers', label: 'Suppliers', icon: Truck },
  { path: '/referred_persons', label: 'Referred Persons', icon: Share2 },
  { path: '/item_categories', label: 'Item Categories', icon: Tags },
  { path: '/item_subcategories', label: 'Item Subcategories', icon: Tags },
  { path: '/laboratories', label: 'Laboratories', icon: Monitor },
];

export default function DashboardLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const toggleMasterData = () => {
    setIsMasterDataOpen(!isMasterDataOpen);
  };

  return (
    <div className={`dashboard-layout ${isDrawerOpen ? 'drawer-open' : 'drawer-closed'}`}>
      
      {/* Mobile Overlay */}
      {isDrawerOpen && (
        <div className="drawer-overlay" onClick={toggleDrawer}></div>
      )}

      {/* Sidebar / Navigation Drawer */}
      <aside className={`sidebar ${isDrawerOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <span className="logo-text">Shwe See Sar</span>
          </div>
          {/* Close button for mobile */}
          <button className="mobile-close-btn" onClick={toggleDrawer}>
            <X size={24} />
          </button>
        </div>
        
        <div className="sidebar-content">
          {/* Main Modules */}
          <nav className="nav-links" style={{ paddingTop: '1.5rem' }}>
            <NavLink 
              to="/reception" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)}
            >
              <Monitor size={20} />
              <span>Reception</span>
            </NavLink>
            <NavLink 
              to="/billing" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)}
            >
              <FileText size={20} />
              <span>Billing & Vouchers</span>
            </NavLink>
            <NavLink 
              to="/stock" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)}
            >
              <Package size={20} />
              <span>Stock & Inventory</span>
            </NavLink>
            <NavLink 
              to="/pricing" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)}
            >
              <Tags size={20} />
              <span>Pricing</span>
            </NavLink>
            <NavLink 
              to="/gp-packages" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth <= 768 && setIsDrawerOpen(false)}
            >
              <Package size={20} />
              <span>GP Packages</span>
            </NavLink>
          </nav>

          {/* Collapsible Section Header */}
          <button className="nav-group-header" onClick={toggleMasterData}>
            <div className="nav-group-header-left">
              <Database size={16} />
              <span>Master Data</span>
            </div>
            {isMasterDataOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {/* Collapsible Section Body */}
          {isMasterDataOpen && (
            <nav className="nav-links">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      // Close drawer on mobile after clicking a link
                      if (window.innerWidth <= 768) {
                        setIsDrawerOpen(false);
                      }
                    }}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          )}
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <button className="menu-btn" onClick={toggleDrawer}>
            <Menu size={24} />
          </button>
          <span className="topbar-title">Clinic Management System</span>
        </header>
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}