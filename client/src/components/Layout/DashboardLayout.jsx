import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, UserPlus, Stethoscope, HeartPulse, Truck, Share2, Menu, X, Database, ChevronDown, ChevronRight } from 'lucide-react';

const navItems = [
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/physicians', label: 'Physicians', icon: Stethoscope },
  { path: '/medical_officers', label: 'Medical Officers', icon: UserPlus },
  { path: '/nurses', label: 'Nurses', icon: HeartPulse },
  { path: '/suppliers', label: 'Suppliers', icon: Truck },
  { path: '/referred_persons', label: 'Referred Persons', icon: Share2 },
];

export default function DashboardLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(true);

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