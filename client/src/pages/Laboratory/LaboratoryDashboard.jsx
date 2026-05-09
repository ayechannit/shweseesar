import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Activity, Calendar, PieChart, BarChart3, 
  AlertCircle, CreditCard, ArrowUpRight, Receipt, 
  ChevronRight, ArrowRight, Target, Zap, FlaskConical, DollarSign, Percent
} from 'lucide-react';

import apiRequest from '../../utils/api';

export default function LaboratoryDashboard() {
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
      const res = await apiRequest(`/dashboard/laboratory?startDate=${startDate}&endDate=${endDate}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch laboratory dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="modern-loading-container">
        <div className="modern-spinner"></div>
        <p className="modern-loading-text">ANALYZING LAB DATA...</p>
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
  const { pending_lab_payments = [], profit_by_lab = [] } = reports;

  return (
    <div className="modern-dashboard">
      <div className="modern-header-row">
        <div className="modern-header-content">
          <div className="modern-badge-indigo">LABORATORY INTELLIGENCE</div>
          <h1 className="modern-main-title">Lab Performance</h1>
          <p className="modern-subtitle">Investigation yields, partner profitability, and payment tracking</p>
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
        <MetricCard title="Lab Revenue" value={metrics.lab_revenue} icon={<TrendingUp />} color="indigo" currency="MMK" highlight />
        <MetricCard title="Lab Cost" value={metrics.lab_cost} icon={<DollarSign />} color="rose" currency="MMK" />
        <MetricCard title="Lab Profit" value={metrics.lab_profit} icon={<PieChart />} color="emerald" currency="MMK" />
        <MetricCard title="Margin %" value={metrics.lab_margin_pct} icon={<Percent />} color="violet" unit="%" />
      </div>

      <div className="modern-charts-row">
        <div className="modern-card chart-main">
          <div className="modern-card-header">
            <div>
              <h3 className="modern-card-title">Profit by Laboratory</h3>
              <p className="modern-card-subtitle">Performance breakdown by partner lab</p>
            </div>
          </div>
          
          <div className="modern-chart-container-table">
            {profit_by_lab.length === 0 ? (
              <div className="modern-empty-state">No laboratory data for this period</div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Laboratory</th>
                    <th>Revenue (MMK)</th>
                    <th>Profit (MMK)</th>
                    <th>Margin (%)</th>
                    <th>Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {profit_by_lab.map((lab, idx) => {
                    const margin = lab.revenue > 0 ? (lab.profit / lab.revenue * 100) : 0;
                    const contribution = metrics.lab_profit > 0 ? (lab.profit / metrics.lab_profit * 100) : 0;
                    return (
                      <tr key={idx}>
                        <td className="font-bold text-slate-700">{lab.laboratory_name || 'Unassigned'}</td>
                        <td>{Math.round(lab.revenue).toLocaleString()}</td>
                        <td className="text-emerald-600 font-bold">{Math.round(lab.profit).toLocaleString()}</td>
                        <td>{margin.toFixed(1)}%</td>
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
            <h3 className="modern-card-title">Pending Payments</h3>
            <p className="modern-card-subtitle">Outstanding lab payables</p>
          </div>

          <div className="pending-list-container">
            {pending_lab_payments.length === 0 ? (
              <div className="modern-empty-state">All lab payments cleared</div>
            ) : (
              <div className="pending-scroll">
                {pending_lab_payments.slice(0, 10).map((pay, idx) => (
                  <div key={idx} className="pending-item">
                    <div className="pending-item-info">
                      <span className="pending-voucher">{pay.voucher_number}</span>
                      <span className="pending-lab">{pay.laboratory_name}</span>
                    </div>
                    <div className="pending-item-amount">
                      {Math.round(pay.lab_cost_price).toLocaleString()}
                    </div>
                  </div>
                ))}
                {pending_lab_payments.length > 10 && (
                   <div className="pending-more-link">
                      +{pending_lab_payments.length - 10} more pending
                   </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <div className="summary-row">
              <span>Total Outstanding:</span>
              <span className="text-rose-600 font-black">
                {pending_lab_payments.reduce((acc, curr) => acc + parseFloat(curr.lab_cost_price || 0), 0).toLocaleString()} MMK
              </span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* --- GLOBAL OVERRIDES --- */
        .modern-dashboard * { box-sizing: border-box; }
        
        .modern-dashboard {
          padding: 2.5rem;
          background: #f8fafc;
          min-height: 100vh;
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
        .metric-icon-box.rose { background: #fff1f2; color: #f43f5e; border: 1px solid #ffe4e6; }
        .metric-icon-box.violet { background: #f5f3ff; color: #8b5cf6; border: 1px solid #ede9fe; }

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

        .modern-chart-container-table { min-height: 300px; }
        .modern-table { width: 100%; border-collapse: separate; border-spacing: 0 0.75rem; }
        .modern-table th { text-align: left; padding: 1rem; color: #94a3b8; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .modern-table td { padding: 1.25rem 1rem; background: #f8fafc; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
        .modern-table td:first-child { border-left: 1px solid #f1f5f9; border-radius: 1rem 0 0 1rem; }
        .modern-table td:last-child { border-right: 1px solid #f1f5f9; border-radius: 0 1rem 1rem 0; }
        
        .contribution-bar-container { display: flex; align-items: center; gap: 0.75rem; }
        .contribution-bar { height: 8px; background: #4f46e5; border-radius: 4px; }
        .contribution-text { font-size: 0.75rem; font-weight: 800; color: #64748b; white-space: nowrap; }

        .pending-list-container { max-height: 400px; overflow-y: auto; }
        .pending-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f8fafc; border-radius: 1rem; margin-bottom: 0.75rem; border: 1px solid #f1f5f9; }
        .pending-item-info { display: flex; flex-direction: column; }
        .pending-voucher { font-size: 0.85rem; font-weight: 800; color: #1e293b; }
        .pending-lab { font-size: 0.75rem; color: #64748b; font-weight: 600; }
        .pending-item-amount { font-weight: 900; color: #f43f5e; font-size: 0.95rem; }
        
        .pending-more-link { text-align: center; font-size: 0.8rem; color: #4f46e5; font-weight: 700; margin-top: 0.5rem; cursor: pointer; }
        
        .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; background: #fff1f2; border-radius: 1.5rem; border: 1px solid #ffe4e6; font-weight: 800; }

        .modern-empty-state { display: flex; align-items: center; justify-content: center; height: 200px; color: #94a3b8; font-weight: 600; font-style: italic; }

        @media (max-width: 1200px) {
          .modern-charts-row { grid-template-columns: 1fr; }
        }
        
        @media (max-width: 768px) {
          .modern-dashboard { padding: 1.5rem; }
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
