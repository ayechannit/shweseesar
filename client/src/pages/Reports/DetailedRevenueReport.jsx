import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Activity, Calendar, PieChart, BarChart3, 
  TrendingDown, TrendingUp, ShieldCheck, Calculator, ArrowRight, Target
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function RevenueProfitDashboard() {
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
      const res = await fetch(`${API_BASE}/dashboard/revenue-profit?startDate=${startDate}&endDate=${endDate}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch revenue/profit data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="modern-loading-container">
        <div className="modern-spinner"></div>
        <p className="modern-loading-text">CALCULATING FINANCIALS...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          .modern-loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; }
          .modern-spinner { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top: 4px solid #059669; border-radius: 50%; animation: spin 1s linear infinite; }
          .modern-loading-text { margin-top: 24px; font-weight: 800; color: #64748b; letter-spacing: 0.1em; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  const { metrics = {}, charts = {} } = data || {};
  const { revenue_vs_cost = [], lab_profit_analysis = {}, revenue_breakdown = [] } = charts;

  // Stream Split Colors
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
  const processedStreams = (revenue_breakdown || []).map(item => {
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
    <div className="rp-dashboard">
      <div className="rp-header-row">
        <div className="rp-header-content">
          <div className="rp-badge-emerald">FINANCIAL INTELLIGENCE</div>
          <h1 className="rp-main-title">Revenue & Profit Analysis</h1>
          <p className="rp-subtitle">Deep dive into clinic margins, costs, and bottom-line profit</p>
        </div>

        <div className="rp-date-controls">
          <div className="rp-input-group">
            <Calendar size={16} />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="rp-divider-small"></div>
          <div className="rp-input-group">
            <Calendar size={16} />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button onClick={fetchDashboardData} className="rp-refresh-btn">
            <Calculator size={18} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="rp-metrics-grid">
        <MetricCard title="Gross Revenue" value={metrics.total_revenue} icon={<TrendingUp />} color="emerald" isCurrency highlight />
        <MetricCard title="Total Cost (COGS + Referrals)" value={metrics.total_cost} icon={<TrendingDown />} color="rose" isCurrency />
        <MetricCard title="Net Profit" value={metrics.net_profit} icon={<DollarSign />} color="indigo" isCurrency highlight />
        <MetricCard title="Lab Profit Margin" value={metrics.lab_profit} icon={<Activity />} color="violet" isCurrency />
      </div>

      {/* CHARTS LAYER 1: REVENUE VS COST */}
      <div className="rp-charts-row">
        <div className="rp-card chart-main">
          <div className="rp-card-header">
            <div>
              <h3 className="rp-card-title">Revenue vs. Cost Analysis</h3>
              <p className="rp-card-subtitle">Daily trend mapping of gross inflow against total operational costs</p>
            </div>
            <div className="rp-chart-legend">
              <span className="dot emerald"></span> <span className="legend-text">Revenue</span>
              <span className="dot rose"></span> <span className="legend-text">Cost</span>
            </div>
          </div>
          
          <div className="rp-chart-container dual-bar">
            {revenue_vs_cost.length === 0 ? (
              <div className="rp-empty-state">No financial data for this period</div>
            ) : revenue_vs_cost.map((day, idx) => {
              const maxVal = Math.max(
                ...revenue_vs_cost.map(d => Math.max(parseFloat(d.total_revenue), parseFloat(d.total_cost))), 
                1
              );
              const revHeight = (parseFloat(day.total_revenue) / maxVal) * 100;
              const costHeight = (parseFloat(day.total_cost) / maxVal) * 100;
              return (
                <div key={idx} className="rp-bar-group">
                  <div className="rp-bar-track-dual">
                    <div className="rp-bar-fill-dual emerald" style={{ height: `${revHeight}%` }}>
                       <div className="rp-bar-tooltip">Rev: {parseFloat(day.total_revenue).toLocaleString()}</div>
                    </div>
                    <div className="rp-bar-fill-dual rose" style={{ height: `${costHeight}%` }}>
                       <div className="rp-bar-tooltip">Cost: {parseFloat(day.total_cost).toLocaleString()}</div>
                    </div>
                  </div>
                  <span className="rp-bar-label">
                    {new Date(day.date).getDate()}/{new Date(day.date).getMonth()+1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CHARTS LAYER 2: BREAKDOWN & LAB ANALYSIS */}
      <div className="rp-split-row">
        {/* Lab Profit Breakdown */}
        <div className="rp-card flex flex-col">
          <div className="rp-card-header">
            <div>
              <h3 className="rp-card-title">Laboratory Margins</h3>
              <p className="rp-card-subtitle">Detailed breakdown of laboratory financials</p>
            </div>
          </div>

          <div className="lab-analysis-grid">
            <div className="lab-stat-box revenue">
              <span className="lab-stat-label">Gross Revenue</span>
              <span className="lab-stat-val">{Math.round(lab_profit_analysis.revenue || 0).toLocaleString()}</span>
            </div>
            <div className="lab-stat-box cost">
              <span className="lab-stat-label">Lab Cost (Payouts + Items)</span>
              <span className="lab-stat-val">{Math.round(lab_profit_analysis.cost || 0).toLocaleString()}</span>
            </div>
            <div className="lab-stat-box profit">
              <span className="lab-stat-label">Net Profit</span>
              <span className="lab-stat-val">{Math.round(lab_profit_analysis.profit || 0).toLocaleString()}</span>
            </div>
          </div>
          
          {/* Visual Bar */}
          <div className="lab-visual-bar-container">
            {lab_profit_analysis.revenue > 0 ? (
              <div className="lab-visual-bar">
                <div className="bar-segment cost-segment" style={{ width: `${(lab_profit_analysis.cost / lab_profit_analysis.revenue) * 100}%` }}></div>
                <div className="bar-segment profit-segment" style={{ width: `${(lab_profit_analysis.profit / lab_profit_analysis.revenue) * 100}%` }}></div>
              </div>
            ) : (
              <div className="lab-visual-bar bg-slate-100"></div>
            )}
            <div className="lab-visual-legend">
              <span>Cost ({(lab_profit_analysis.revenue > 0 ? (lab_profit_analysis.cost / lab_profit_analysis.revenue * 100) : 0).toFixed(1)}%)</span>
              <span>Profit ({(lab_profit_analysis.revenue > 0 ? (lab_profit_analysis.profit / lab_profit_analysis.revenue * 100) : 0).toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Revenue Sources (Pie) */}
        <div className="rp-card chart-side flex flex-col items-center">
          <div className="w-full mb-6">
            <h3 className="rp-card-title">Revenue Sources</h3>
            <p className="rp-card-subtitle">Distribution by category</p>
          </div>

          <div className="rp-pie-container">
            <div className="rp-pie-chart" style={{ background: `conic-gradient(${conicString})` }}>
              <div className="rp-pie-center">
                <span className="pie-label">TOTAL</span>
                <span className="pie-value">{(totalStreamValue/1000000).toFixed(1)}M</span>
              </div>
            </div>
            
            <div className="rp-pie-legend">
              {processedStreams.map((item, idx) => (
                <div key={idx} className="rp-legend-item">
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

      <style dangerouslySetInnerHTML={{ __html: `
        /* --- GLOBAL OVERRIDES --- */
        .rp-dashboard * { box-sizing: border-box; }
        
        .rp-dashboard {
          padding: 2.5rem;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
          color: #1e293b;
          line-height: 1.5;
        }

        /* --- HEADER --- */
        .rp-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .rp-badge-emerald {
          display: inline-block;
          padding: 0.35rem 0.85rem;
          background: #ecfdf5;
          color: #059669;
          font-size: 0.7rem;
          font-weight: 800;
          border-radius: 99px;
          letter-spacing: 0.12em;
          margin-bottom: 0.75rem;
          box-shadow: 0 0 0 1px #d1fae5;
        }

        .rp-main-title { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.03em; margin: 0; color: #0f172a; }
        .rp-subtitle { color: #64748b; font-weight: 500; font-size: 1rem; margin-top: 0.25rem; }

        .rp-date-controls {
          display: flex;
          align-items: center;
          background: white;
          padding: 0.6rem;
          border-radius: 1.25rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
          border: 1px solid #f1f5f9;
        }

        .rp-input-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 1rem;
          color: #94a3b8;
        }

        .rp-input-group input {
          border: none;
          background: transparent;
          font-family: inherit;
          font-weight: 800;
          color: #1e293b;
          outline: none;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .rp-divider-small { width: 1px; height: 24px; background: #e2e8f0; }

        .rp-refresh-btn {
          background: #059669;
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
        .rp-refresh-btn:hover { background: #047857; transform: translateY(-2px) scale(1.05); box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3); }

        /* --- METRICS --- */
        .rp-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
        .metric-card.highlight.emerald { border: 2px solid #d1fae5; background: linear-gradient(135deg, #ffffff, #f0fdf4); }
        .metric-card.highlight.indigo { border: 2px solid #e0e7ff; background: linear-gradient(135deg, #ffffff, #f5f7ff); }

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
        .rp-charts-row {
          margin-bottom: 2rem;
        }
        .rp-split-row {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .rp-card { background: white; border-radius: 2.5rem; border: 1px solid #f1f5f9; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.03); padding: 2.5rem; position: relative; }
        .rp-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
        .rp-card-title { font-size: 1.5rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
        .rp-card-subtitle { font-size: 0.95rem; color: #94a3b8; font-weight: 600; margin-top: 0.25rem; }

        /* Chart Legends */
        .rp-chart-legend { display: flex; align-items: center; gap: 1rem; }
        .dot { width: 10px; height: 10px; border-radius: 3px; }
        .dot.emerald { background: #10b981; }
        .dot.rose { background: #f43f5e; }
        .legend-text { font-size: 0.85rem; font-weight: 700; color: #475569; }

        /* Dual Bar Chart */
        .rp-chart-container.dual-bar { height: 350px; display: flex; align-items: flex-end; gap: 1rem; padding-top: 2rem; border-bottom: 2px solid #f8fafc; }
        .rp-bar-group { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .rp-bar-track-dual { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 4px; position: relative; }
        
        .rp-bar-fill-dual {
          width: 45%; border-radius: 0.5rem 0.5rem 0.25rem 0.25rem;
          transition: all 1s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer; position: relative;
        }
        .rp-bar-fill-dual.emerald { background: linear-gradient(to top, #059669, #34d399); }
        .rp-bar-fill-dual.rose { background: linear-gradient(to top, #e11d48, #fb7185); }
        
        .rp-bar-fill-dual:hover { filter: brightness(1.15); z-index: 5; }
        .rp-bar-tooltip {
          position: absolute; top: -35px; left: 50%; transform: translateX(-50%) translateY(5px); background: #0f172a; color: white; padding: 4px 8px; border-radius: 8px;
          font-size: 0.75rem; font-weight: 800; opacity: 0; pointer-events: none; transition: all 0.2s; z-index: 20; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); white-space: nowrap;
        }
        .rp-bar-fill-dual:hover .rp-bar-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
        .rp-bar-label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; padding-bottom: 0.5rem; }
        .rp-empty-state { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #94a3b8; }

        /* Lab Analysis Breakdown */
        .lab-analysis-grid { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 3rem; }
        .lab-stat-box { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-radius: 1.5rem; }
        .lab-stat-box.revenue { background: #f8fafc; border: 1px solid #e2e8f0; }
        .lab-stat-box.cost { background: #fff1f2; border: 1px solid #ffe4e6; color: #e11d48; }
        .lab-stat-box.profit { background: #ecfdf5; border: 1px solid #d1fae5; color: #059669; }
        
        .lab-stat-label { font-weight: 800; font-size: 0.95rem; }
        .lab-stat-box.revenue .lab-stat-label { color: #64748b; }
        
        .lab-stat-val { font-weight: 900; font-size: 1.5rem; }
        .lab-stat-box.revenue .lab-stat-val { color: #0f172a; }

        .lab-visual-bar-container { display: flex; flex-direction: column; gap: 1rem; }
        .lab-visual-bar { width: 100%; height: 24px; border-radius: 12px; display: flex; overflow: hidden; background: #e2e8f0; }
        .bar-segment { height: 100%; transition: width 1s ease-in-out; }
        .cost-segment { background: #fb7185; }
        .profit-segment { background: #34d399; }
        .lab-visual-legend { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 800; color: #64748b; }

        /* Pie Chart */
        .rp-pie-container { display: flex; flex-direction: column; align-items: center; gap: 3rem; width: 100%; }
        .rp-pie-chart {
          width: 220px; height: 220px; border-radius: 50%; position: relative;
          display: flex; align-items: center; justify-content: center; transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 15px 30px -10px rgba(0,0,0,0.1);
        }
        .rp-pie-chart:hover { transform: rotate(8deg) scale(1.08); }
        .rp-pie-center { width: 130px; height: 130px; background: white; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 4px 8px rgba(0,0,0,0.06); }
        .pie-label { font-size: 0.75rem; font-weight: 800; color: #cbd5e1; letter-spacing: 0.2em; margin-bottom: 0.25rem; }
        .pie-value { font-size: 1.5rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }

        .rp-pie-legend { width: 100%; display: flex; flex-direction: column; gap: 0.75rem; }
        .rp-legend-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-radius: 1rem; transition: all 0.2s; border: 1px solid transparent; }
        .rp-legend-item:hover { background: #f8fafc; border-color: #f1f5f9; transform: translateX(5px); }
        .legend-info { display: flex; align-items: center; gap: 1rem; }
        .legend-color { width: 12px; height: 12px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .legend-name { font-size: 0.95rem; font-weight: 700; color: #475569; }
        .legend-values { display: flex; align-items: center; gap: 1rem; }
        .legend-amount { font-size: 1rem; font-weight: 900; color: #0f172a; }
        .legend-pct { font-size: 0.75rem; font-weight: 800; color: #4f46e5; background: #eef2ff; padding: 3px 8px; border-radius: 6px; }

        @media (max-width: 1200px) {
          .rp-split-row { grid-template-columns: 1fr; }
        }
        
        @media (max-width: 768px) {
          .rp-dashboard { padding: 1.5rem; }
          .rp-header-row { flex-direction: column; align-items: flex-start; }
          .rp-date-controls { width: 100%; flex-direction: column; align-items: stretch; }
          .rp-divider-small { display: none; }
          .rp-refresh-btn { margin-left: 0; margin-top: 0.5rem; }
        }
      `}} />
    </div>
  );
}

function MetricCard({ title, value, icon, color, isCurrency, highlight }) {
  return (
    <div className={`metric-card ${highlight ? 'highlight ' + color : ''}`}>
      <div className={`metric-icon-box ${color}`}>
        {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
      </div>
      <div>
        <div className="metric-title">{title}</div>
        <div className="metric-value-row">
          {isCurrency && <span className="metric-unit">MMK</span>}
          <span className="metric-value">{Math.round(parseFloat(value || 0)).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
