import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, DollarSign, Activity, Calendar, PieChart, BarChart3, 
  AlertCircle, ShoppingCart, CreditCard, ArrowUpRight, Receipt, 
  ChevronRight, ArrowRight, Target, Zap, ShieldCheck
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function ExecutiveDashboard() {
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
      const res = await fetch(`${API_BASE}/dashboard/executive?startDate=${startDate}&endDate=${endDate}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch executive dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="modern-loading-container">
        <div className="modern-spinner"></div>
        <p className="modern-loading-text">SYNCING DATA...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          .modern-loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; }
          .modern-spinner { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top: 4px solid #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; }
          .modern-loading-text { margin-top: 24px; font-weight: 800; color: #64748b; letter-spacing: 0.1em; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  const { metrics = {}, charts = {} } = data || {};
  const { revenue_trend = [], revenue_stream_split = [] } = charts;

  const streamColors = {
    'PHARMACY': '#6366f1',
    'INVESTIGATION': '#10b981',
    'SERVICE': '#8b5cf6',
    'PACKAGE': '#f59e0b',
    'EXTERNAL_REFERRAL': '#f43f5e',
    'OTHER': '#64748b'
  };

  const streamLabels = {
    'PHARMACY': 'Pharmacy',
    'INVESTIGATION': 'Laboratory',
    'SERVICE': 'Services',
    'PACKAGE': 'Packages',
    'EXTERNAL_REFERRAL': 'Referrals'
  };

  let totalStreamValue = 0;
  const processedStreams = (revenue_stream_split || []).map(item => {
    const val = parseFloat(item.value);
    totalStreamValue += val;
    return { ...item, stream: (item.stream || 'OTHER').toUpperCase(), value: val };
  }).filter(item => item.value > 0);

  let conicString = '';
  let cumulativePercent = 0;
  if (totalStreamValue > 0) {
    conicString = processedStreams.map(item => {
      const percent = (item.value / totalStreamValue) * 100;
      const color = streamColors[item.stream] || streamColors['OTHER'];
      const segment = `${color} ${cumulativePercent}% ${cumulativePercent + percent}%`;
      cumulativePercent += percent;
      return segment;
    }).join(', ');
  } else {
    conicString = '#e2e8f0 0% 100%';
  }

  return (
    <div className="modern-dashboard">
      <div className="modern-header-row">
        <div className="modern-header-content">
          <div className="modern-badge-indigo">SYSTEM COMMAND</div>
          <h1 className="modern-main-title">Executive Intelligence</h1>
          <p className="modern-subtitle">Consolidated operational metrics and financial KPIs</p>
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
        <MetricCard title="Total Revenue" value={metrics.total_revenue} icon={<TrendingUp />} color="indigo" currency="MMK" highlight />
        <MetricCard title="Patient Intake" value={metrics.total_patients} icon={<Users />} color="emerald" unit="Visits" />
        <MetricCard title="Referral Income" value={metrics.external_referral_income} icon={<ArrowUpRight />} color="rose" currency="MMK" />
        <MetricCard title="Laboratory Yield" value={metrics.lab_profit} icon={<PieChart />} color="violet" currency="MMK" />
      </div>

      <div className="modern-charts-row">
        <div className="modern-card chart-main">
          <div className="modern-card-header">
            <div>
              <h3 className="modern-card-title">Revenue Velocity</h3>
              <p className="modern-card-subtitle">Daily financial inflow analysis</p>
            </div>
            <div className="modern-chart-legend">
              <span className="dot indigo"></span> <span className="legend-text">Revenue</span>
            </div>
          </div>
          
          <div className="modern-chart-container">
            {revenue_trend.length === 0 ? (
              <div className="modern-empty-state">No transaction data for this period</div>
            ) : revenue_trend.map((day, idx) => {
              const maxAmount = Math.max(...revenue_trend.map(d => parseFloat(d.total_revenue)), 1);
              const height = (parseFloat(day.total_revenue) / maxAmount) * 100;
              return (
                <div key={idx} className="modern-bar-group">
                  <div className="modern-bar-track">
                    <div className="modern-bar-fill" style={{ height: `${height}%` }}>
                       <div className="modern-bar-tooltip">{parseFloat(day.total_revenue).toLocaleString()}</div>
                    </div>
                  </div>
                  <span className="modern-bar-label">
                    {new Date(day.date).getDate()}/{new Date(day.date).getMonth()+1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modern-card chart-side">
          <div className="modern-card-header">
            <h3 className="modern-card-title">Revenue Sources</h3>
            <p className="modern-card-subtitle">Distribution by category</p>
          </div>

          <div className="modern-pie-container">
            <div className="modern-pie-chart" style={{ background: `conic-gradient(${conicString})` }}>
              <div className="modern-pie-center">
                <span className="pie-label">TOTAL</span>
                <span className="pie-value">{(totalStreamValue/1000000).toFixed(1)}M</span>
              </div>
            </div>
            
            <div className="modern-pie-legend">
              {processedStreams.map((item, idx) => (
                <div key={idx} className="modern-legend-item">
                  <div className="legend-info">
                    <div className="legend-color" style={{ backgroundColor: streamColors[item.stream] || streamColors['OTHER'] }}></div>
                    <span className="legend-name">{streamLabels[item.stream] || item.stream}</span>
                  </div>
                  <div className="legend-values">
                    <span className="legend-amount">{item.value.toLocaleString()}</span>
                    <span className="legend-pct">{((item.value / totalStreamValue) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="modern-bottom-grid">
        <OperationalSection title="Operational Efficiency" icon={<Zap color="#f59e0b" />}>
           <StatLine label="Avg Revenue / Patient" value={metrics.avg_revenue_per_patient} currency="MMK" color="indigo" />
           <StatLine label="Total Vouchers Issued" value={metrics.total_vouchers} unit="Units" color="emerald" />
           <StatLine label="Direct Pharmacy Sales" value={metrics.voucher_revenue} currency="MMK" color="sky" />
        </OperationalSection>

        <OperationalSection title="Risk Exposure" icon={<ShieldCheck color="#10b981" />}>
           <StatLine label="Unpaid Lab Invoices" value={metrics.pending_lab_payable} currency="MMK" isNegative color="rose" />
           <StatLine label="Pending Agent Fees" value={metrics.pending_referral_payable} currency="MMK" isNegative color="orange" />
           <StatLine label="Trade Supplier Balances" value={metrics.supplier_balance} currency="MMK" isNegative color="red" />
        </OperationalSection>

        {/* <div className="modern-ai-card">
          <div className="ai-header">
             <div className="ai-icon-pulse"></div>
             <h3>AI Insights</h3>
          </div>
          <div className="ai-content">
             <div className="ai-bubble">
               <span className="ai-tag">ANALYSIS</span>
               <p>{metrics.total_patients > 0 ? "Clinic profitability is currently stable. High correlation detected between laboratory yields and overall monthly growth. Recommend optimizing pharmacy inventory for top 10 products." : "Insufficient data for detailed AI projections. Start recording vouchers to activate predictive modeling."}</p>
             </div>
             <div className="ai-footer">
               <span>Performance Report Alpha</span>
               <ArrowRight size={16} />
             </div>
          </div>
        </div> */}
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

        /* --- CHARTS --- */
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

        .modern-chart-container { height: 300px; display: flex; align-items: flex-end; gap: 1.25rem; padding-top: 2rem; border-bottom: 2px solid #f8fafc; }
        .modern-bar-group { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .modern-bar-track { flex: 1; width: 100%; background: #f8fafc; border-radius: 1rem; display: flex; align-items: flex-end; position: relative; }
        .modern-bar-fill {
          width: 100%; background: linear-gradient(to top, #4f46e5, #818cf8); border-radius: 0.75rem 0.75rem 0.4rem 0.4rem;
          transition: all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer; position: relative;
        }
        .modern-bar-fill:hover { filter: brightness(1.15); transform: scaleX(1.1); z-index: 5; }
        .modern-bar-tooltip {
          position: absolute; top: -45px; left: 50%; transform: translateX(-50%) translateY(10px); background: #0f172a; color: white; padding: 6px 12px; border-radius: 10px;
          font-size: 0.8rem; font-weight: 800; opacity: 0; pointer-events: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 20; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
        }
        .modern-bar-fill:hover .modern-bar-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
        .modern-bar-label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; padding-bottom: 0.5rem; }

        .modern-pie-container { display: flex; flex-direction: column; align-items: center; gap: 3rem; }
        .modern-pie-chart {
          width: 220px; height: 220px; border-radius: 50%; position: relative;
          display: flex; align-items: center; justify-content: center; transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 15px 30px -10px rgba(0,0,0,0.1);
        }
        .modern-pie-chart:hover { transform: rotate(8deg) scale(1.08); }
        .modern-pie-center { width: 130px; height: 130px; background: white; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 4px 8px rgba(0,0,0,0.06); }
        .pie-label { font-size: 0.75rem; font-weight: 800; color: #cbd5e1; letter-spacing: 0.2em; margin-bottom: 0.25rem; }
        .pie-value { font-size: 1.5rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }

        .modern-pie-legend { width: 100%; display: flex; flex-direction: column; gap: 0.75rem; }
        .modern-legend-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-radius: 1rem; transition: all 0.2s; border: 1px solid transparent; }
        .modern-legend-item:hover { background: #f8fafc; border-color: #f1f5f9; transform: translateX(5px); }
        .legend-info { display: flex; align-items: center; gap: 1rem; }
        .legend-color { width: 12px; height: 12px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .legend-name { font-size: 0.95rem; font-weight: 700; color: #475569; }
        .legend-values { display: flex; align-items: center; gap: 1rem; }
        .legend-amount { font-size: 1rem; font-weight: 900; color: #0f172a; }
        .legend-pct { font-size: 0.75rem; font-weight: 800; color: #4f46e5; background: #eef2ff; padding: 3px 8px; border-radius: 6px; }

        /* --- OPERATIONAL --- */
        .modern-bottom-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem; margin-bottom: 2rem; }
        .modern-op-card { background: white; padding: 2.5rem; border-radius: 2.5rem; border: 1px solid #f1f5f9; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.03); }
        .op-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; font-weight: 900; font-size: 1.25rem; color: #0f172a; }
        .op-lines { display: flex; flex-direction: column; gap: 1rem; }

        .stat-line { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; background: #f8fafc; border-radius: 1.5rem; border: 1px solid #f1f5f9; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; }
        .stat-line:hover { background: white; border-color: #e2e8f0; transform: scale(1.02); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.04); }
        .stat-label { font-size: 1rem; font-weight: 700; color: #64748b; }
        .stat-value-group { display: flex; align-items: baseline; gap: 0.4rem; font-weight: 900; font-size: 1.15rem; color: #0f172a; }
        .stat-currency { font-size: 0.8rem; color: #94a3b8; font-weight: 700; }
        .stat-neg { color: #f43f5e; }

        /* --- AI CARD --- */
        .modern-ai-card {
          background: linear-gradient(145deg, #4f46e5, #7c3aed, #4338ca);
          padding: 2.5rem;
          border-radius: 2.5rem;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px -10px rgba(79, 70, 229, 0.4);
        }
        .ai-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
        .ai-icon-pulse { width: 14px; height: 14px; background: #10b981; border-radius: 50%; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.2); animation: ai-pulse 2s infinite; }
        .ai-header h3 { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; }
        .ai-bubble { background: rgba(255,255,255,0.12); padding: 1.75rem; border-radius: 1.75rem; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); }
        .ai-tag { display: inline-block; font-size: 0.7rem; font-weight: 900; background: rgba(255,255,255,0.25); padding: 3px 10px; border-radius: 6px; margin-bottom: 1rem; letter-spacing: 0.15em; }
        .ai-bubble p { font-size: 1rem; font-weight: 600; line-height: 1.7; color: rgba(255,255,255,0.95); }
        .ai-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; font-size: 0.9rem; font-weight: 800; color: rgba(255,255,255,0.7); }

        @keyframes ai-pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); } 70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

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

function OperationalSection({ title, icon, children }) {
  return (
    <div className="modern-op-card">
       <div className="op-header">
         {React.cloneElement(icon, { size: 24, strokeWidth: 3 })}
         <span>{title}</span>
       </div>
       <div className="op-lines">
         {children}
       </div>
    </div>
  );
}

function StatLine({ label, value, currency, unit, isNegative }) {
  return (
    <div className="stat-line">
      <span className="stat-label">{label}</span>
      <div className={`stat-value-group ${isNegative ? 'stat-neg' : ''}`}>
        {currency && <span className="stat-currency">{currency}</span>}
        <span>{Math.round(parseFloat(value || 0)).toLocaleString()}</span>
        {unit && <span className="stat-currency">{unit}</span>}
      </div>
    </div>
  );
}
