import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, AlertCircle, Calendar, Zap, Award, Activity
} from 'lucide-react';

import apiRequest from '../../utils/api';

export default function ExternalReferralDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const currentDay = today.toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(currentDay);

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/dashboard/external-referral?startDate=${startDate}&endDate=${endDate}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch external referral dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="modern-loading-container">
        <div className="modern-spinner"></div>
        <p className="modern-loading-text">ANALYZING EXTERNAL REFERRAL DATA...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          .modern-loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; }
          .modern-spinner { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top: 4px solid #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; }
          .modern-loading-text { margin-top: 24px; font-weight: 800; color: #64748b; letter-spacing: 0.1em; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  const { metrics = {}, reports = {} } = data || {};
  const { by_clinic = [], by_visit_type = [] } = reports;

  return (
    <div className="modern-dashboard">
      <div className="modern-header-row">
        <div className="modern-header-content">
          <div className="modern-badge-indigo">EXTERNAL REFERRALS</div>
          <h1 className="modern-main-title">Clinic Referral Income</h1>
          <p className="modern-subtitle">Tracking patients referred out to other clinics and incoming commission</p>
        </div>

        <div className="modern-date-controls">
          <div className="modern-input-group">
            <Calendar size={16} />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="modern-divider-small"></div>
          <div className="modern-input-group">
            <Calendar size={16} />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button onClick={fetchDashboardData} className="modern-refresh-btn">
            <Zap size={18} fill="currentColor" />
          </button>
        </div>
      </div>

      <div className="modern-metrics-grid">
        <MetricCard title="Total Referrals Out" value={metrics.total_referrals_out} icon={<Users />} color="indigo" highlight />
        <MetricCard title="Total Income" value={metrics.total_income} icon={<DollarSign />} color="emerald" currency="MMK" />
        <MetricCard title="Pending Income" value={metrics.pending_income} icon={<AlertCircle />} color="orange" currency="MMK" />
      </div>

      <div className="modern-charts-row">
        <div className="modern-card chart-main">
          <div className="modern-card-header">
            <div>
              <h3 className="modern-card-title">Income by Clinic</h3>
              <p className="modern-card-subtitle">Commission earned from partner clinics</p>
            </div>
          </div>
          
          <div className="modern-chart-container-table">
            {by_clinic.length === 0 ? (
              <div className="modern-empty-state">No referral data for this period</div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Clinic Name</th>
                    <th>Total Referrals</th>
                    <th>Total Income (MMK)</th>
                    <th>Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {by_clinic.map((clinic, idx) => {
                    const contribution = metrics.total_income > 0 
                      ? (clinic.total_income / metrics.total_income * 100) 
                      : 0;
                    return (
                      <tr key={idx}>
                        <td className="font-bold text-slate-700">
                          <div className="flex items-center gap-2">
                            {idx < 3 && <Award size={16} className={idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : "text-amber-700"} />}
                            {clinic.clinic_name || 'Unknown'}
                          </div>
                        </td>
                        <td className="font-bold">{clinic.total_referrals}</td>
                        <td className="text-emerald-600 font-bold">{Math.round(clinic.total_income).toLocaleString()}</td>
                        <td>
                          <div className="contribution-bar-container">
                            <div className="contribution-bar" style={{ width: `${contribution}%` }}></div>
                            <span className="contribution-text">{contribution.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="modern-card chart-side">
          <div className="modern-card-header">
            <h3 className="modern-card-title">By Visit Type</h3>
            <p className="modern-card-subtitle">Referral breakdown by care level</p>
          </div>

          <div className="pending-list-container">
            {by_visit_type.length === 0 ? (
              <div className="modern-empty-state">No visit type data</div>
            ) : (
              <div className="pending-scroll">
                {by_visit_type.map((vt, idx) => (
                  <div key={idx} className="pending-item">
                    <div className="pending-item-info">
                      <span className="pending-voucher flex items-center gap-2">
                        <Activity size={14} className="text-indigo-500" /> 
                        {vt.visit_type}
                      </span>
                      <span className="pending-lab">{vt.total_referrals} Referrals</span>
                    </div>
                    <div className="pending-item-amount text-emerald-600">
                      {Math.round(vt.total_income).toLocaleString()} MMK
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* --- GLOBAL OVERRIDES --- */
        .modern-dashboard * { box-sizing: border-box; }
        
        .modern-dashboard {
          padding: 0;
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
          color: #1e293b;
          line-height: 1.5;
        }

        /* --- HEADER --- */
        .modern-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .modern-badge-indigo {
          display: inline-block;
          padding: 0.35rem 0.85rem;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 0.7rem;
          font-weight: 800;
          border-radius: 99px;
          letter-spacing: 0.12em;
          margin-bottom: 0.75rem;
          box-shadow: 0 0 0 1px #e0e7ff;
        }

        .modern-main-title { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.03em; margin: 0; color: #0f172a; }
        .modern-subtitle { color: #64748b; font-weight: 500; font-size: 1rem; margin-top: 0.25rem; }

        .modern-date-controls {
          display: flex;
          align-items: center;
          background: white;
          padding: 0.6rem;
          border-radius: 1.25rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
          border: 1px solid #f1f5f9;
        }

        .modern-input-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 1rem;
          color: #94a3b8;
        }

        .modern-input-group input {
          border: none;
          background: transparent;
          font-family: inherit;
          font-weight: 800;
          color: #1e293b;
          outline: none;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .modern-divider-small { width: 1px; height: 24px; background: #e2e8f0; }

        .modern-refresh-btn {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-left: 0.5rem;
          cursor: pointer;
        }
        .modern-refresh-btn:hover { background: #3730a3; transform: translateY(-2px) scale(1.05); box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); }

        /* --- METRICS --- */
        .modern-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.75rem;
          margin-bottom: 3rem;
        }

        .metric-card {
          background: white;
          padding: 2rem;
          border-radius: 2rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 10px 20px -5px rgba(0,0,0,0.03);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 180px;
          position: relative;
          overflow: hidden;
        }
        .metric-card:hover { transform: translateY(-8px); box-shadow: 0 25px 30px -10px rgba(0,0,0,0.08); border-color: #e2e8f0; }
        .metric-card.highlight { border: 2px solid #e0e7ff; background: linear-gradient(135deg, #ffffff, #f9faff); }

        .metric-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          transition: 0.3s;
        }
        .metric-card:hover .metric-icon-box { transform: scale(1.1) rotate(-5deg); }

        .metric-icon-box.indigo { background: #eef2ff; color: #4f46e5; border: 1px solid #e0e7ff; }
        .metric-icon-box.emerald { background: #ecfdf5; color: #10b981; border: 1px solid #d1fae5; }
        .metric-icon-box.orange { background: #fff7ed; color: #f97316; border: 1px solid #ffedd5; }

        .metric-title { font-size: 0.8rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem; }
        .metric-value-row { display: flex; align-items: baseline; gap: 0.4rem; }
        .metric-value { font-size: 2rem; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; }
        .metric-unit { font-size: 0.9rem; font-weight: 700; color: #cbd5e1; }

        /* --- CHARTS & TABLES --- */
        .modern-charts-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .modern-card { background: white; border-radius: 2.5rem; border: 1px solid #f1f5f9; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.03); padding: 2.5rem; position: relative; }
        .modern-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
        .modern-card-title { font-size: 1.5rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
        .modern-card-subtitle { font-size: 0.95rem; color: #94a3b8; font-weight: 600; margin-top: 0.25rem; }

        .modern-chart-container-table { min-height: 300px; max-height: 600px; overflow: auto; }
        .modern-table { width: 100%; border-collapse: separate; border-spacing: 0 0.75rem; }
        .modern-table th { text-align: left; padding: 1rem; color: #94a3b8; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; position: sticky; top: 0; background: white; z-index: 10; }
        .modern-table td { padding: 1.25rem 1rem; background: #f8fafc; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
        .modern-table td:first-child { border-left: 1px solid #f1f5f9; border-radius: 1rem 0 0 1rem; }
        .modern-table td:last-child { border-right: 1px solid #f1f5f9; border-radius: 0 1rem 1rem 0; }
        
        .contribution-bar-container { display: flex; align-items: center; gap: 0.75rem; }
        .contribution-bar { height: 8px; background: #10b981; border-radius: 4px; }
        .contribution-text { font-size: 0.75rem; font-weight: 800; color: #64748b; white-space: nowrap; }

        .pending-list-container { max-height: 400px; overflow-y: auto; }
        .pending-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f8fafc; border-radius: 1rem; margin-bottom: 0.75rem; border: 1px solid #f1f5f9; }
        .pending-item-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .pending-voucher { font-size: 0.85rem; font-weight: 800; color: #1e293b; }
        .pending-lab { font-size: 0.75rem; color: #64748b; font-weight: 600; }
        .pending-item-amount { font-weight: 900; font-size: 0.95rem; }

        .modern-empty-state { display: flex; align-items: center; justify-content: center; height: 200px; color: #94a3b8; font-weight: 600; font-style: italic; }

        @media (max-width: 1200px) {
          .modern-charts-row { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .modern-dashboard { padding: 0; }
          .modern-header-row { flex-direction: column; align-items: flex-start; }
          .modern-date-controls { width: 100%; flex-direction: column; align-items: stretch; }
          .modern-divider-small { display: none; }
          .modern-refresh-btn { margin-left: 0; margin-top: 0.5rem; }
        }
      `}} />
    </div>
  );
}

function MetricCard({ title, value, icon, color, currency, unit, highlight }) {
  return (
    <div className={`metric-card ${highlight ? 'highlight' : ''}`}>
      <div className={`metric-icon-box ${color}`}>
        {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
      </div>
      <div>
        <div className="metric-title">{title}</div>
        <div className="metric-value-row">
          {currency && <span className="metric-unit">{currency}</span>}
          <span className="metric-value">{Math.round(parseFloat(value || 0)).toLocaleString()}</span>
          {unit && <span className="metric-unit">{unit}</span>}
        </div>
      </div>
    </div>
  );
}
