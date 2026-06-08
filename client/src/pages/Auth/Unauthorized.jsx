import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft, KeyRound, HelpCircle } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="unauthorized-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 10% 20%, rgb(240, 244, 248) 0%, rgb(220, 230, 242) 90%)',
      padding: '1.5rem',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Abstract Background Aesthetic Blobs */}
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        background: 'rgba(59, 130, 246, 0.15)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        top: '-100px',
        left: '-50px',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'rgba(139, 92, 246, 0.15)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        bottom: '-100px',
        right: '-50px',
        zIndex: 0
      }}></div>

      {/* Main Glass Card */}
      <div className="unauthorized-card" style={{
        maxWidth: '520px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.1), 0 0 1px 1px rgba(15, 23, 42, 0.05)',
        padding: '3rem 2.5rem',
        textAlign: 'center',
        zIndex: 1,
        boxSizing: 'border-box',
        transform: 'translateY(0)',
        animation: 'cardAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        
        {/* Animated Glowing Security Shield Icon */}
        <div style={{
          position: 'relative',
          width: '90px',
          height: '90px',
          margin: '0 auto 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fef2f2',
          borderRadius: '50%',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.15)'
        }}>
          <div className="icon-pulse" style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            animation: 'pulseGlow 2s infinite ease-in-out',
            zIndex: 0
          }}></div>
          <ShieldAlert size={42} color="#ef4444" style={{ zIndex: 1, position: 'relative' }} />
        </div>

        {/* Text Headers */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 900,
          color: '#0f172a',
          margin: '0 0 0.75rem 0',
          letterSpacing: '-0.025em',
          lineHeight: 1.2
        }}>
          Access Restricted
        </h1>
        
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          backgroundColor: '#eff6ff',
          color: '#2563eb',
          fontSize: '0.75rem',
          fontWeight: 700,
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          marginBottom: '1.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <KeyRound size={12} />
          <span>Status Code: 403</span>
        </div>

        <p style={{
          fontSize: '0.9375rem',
          color: '#475569',
          lineHeight: 1.6,
          margin: '0 0 2rem 0',
          padding: '0 0.5rem'
        }}>
          You do not have the required role permissions to view this section. Please contact your system administrator if you believe your user profile should have access.
        </p>

        {/* Action Buttons Stacker (Responsive Grid) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          width: '100%'
        }}>
          
          {/* Primary Action: Go Dashboard */}
          <Link
            to="/reception"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: 700,
              padding: '0.875rem 1.5rem',
              borderRadius: '0.75rem',
              textDecoration: 'none',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.35)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)';
            }}
          >
            <Home size={18} />
            <span>Go to Reception Dashboard</span>
          </Link>

          {/* Secondary Actions Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            width: '100%'
          }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: 'white',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                fontWeight: 600,
                padding: '0.8rem 1rem',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#94a3b8';
              }}
              onMouseOut={e => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            >
              <ArrowLeft size={16} />
              <span>Go Back</span>
            </button>

            <a
              href="mailto:support@clinic.com?subject=Permission%20Request%20-%20Shwe%20See%20Sar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: '#f8fafc',
                color: '#475569',
                border: '1px solid #e2e8f0',
                fontSize: '0.9rem',
                fontWeight: 600,
                padding: '0.8rem 1rem',
                borderRadius: '0.75rem',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseOut={e => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <HelpCircle size={16} />
              <span>Contact Admin</span>
            </a>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cardAppear {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 480px) {
          .unauthorized-card {
            padding: 2.25rem 1.5rem !important;
          }
          .unauthorized-card h1 {
            fontSize: '1.75rem' !important;
          }
        }
      `}} />

    </div>
  );
};

export default Unauthorized;