import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiRequest from '../../utils/api';

import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

import heroImage from '../../assets/hero.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/reception';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (response && response.ok) {
        const data = await response.json();
        setSuccess(true);
        setTimeout(() => {
          login(data.token, data.user);
          navigate(from, { replace: true });
        }, 800);
      } else if (response) {
        const data = await response.json();
        setError(data.error || 'Invalid credentials. Please verify your details.');
      } else {
        setError('Network connection failed. Please try again.');
      }
    } catch {
      setError('A system error occurred. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      
      {/* LEFT SIDE - Hero Image */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem', backgroundColor: '#0f172a', overflow: 'hidden' }}>
        <img
          src={heroImage}
          alt="Clinic Hero"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom right, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.8))' }} />
        
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '4rem' }}>
            <div style={{ background: '#2563eb', padding: '0.5rem', borderRadius: '0.5rem' }}>
              <ShieldCheck size={24} color="white" />
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Shwe See Sar</span>
          </div>
          
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white', lineHeight: 1.2, marginBottom: '1.5rem' }}>
            Intelligent care.<br/>
            <span style={{ color: '#60a5fa' }}>Seamless operations.</span>
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '1.125rem', maxWidth: '400px', lineHeight: 1.6 }}>
            A unified platform designed for modern medical practices. Streamline operations and focus on delivering better patient care.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 10, color: '#94a3b8', fontSize: '0.875rem' }}>
          © {new Date().getFullYear()} Shwe See Sar Clinic. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
          
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 0.5rem 0' }}>Log in</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>Enter your credentials to access your workspace.</p>

          <div style={{ minHeight: '60px', marginBottom: '1.5rem' }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#b91c1c', fontSize: '0.875rem' }}>
                <AlertCircle size={20} /> <span>{error}</span>
              </div>
            )}
            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', color: '#15803d', fontSize: '0.875rem' }}>
                <CheckCircle2 size={20} /> <span>Authentication successful. Redirecting...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="form-control"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter username"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password">Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  tabIndex="-1"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || success}
              style={{ width: '100%', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign in securely</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
};

export default Login;