import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Calendar, AlertTriangle, 
  DollarSign, Package, ShoppingBag, ArrowUpRight, 
  ArrowDownRight, Clock, ChevronRight, Receipt, Activity,
  Layout, ClipboardList, PackageCheck, Star
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/summary`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state-modern">
        <div className="pulse-loader"></div>
        <p>Analyzing clinic metrics...</p>
      </div>
    );
  }
  
  const { 
    metrics = {}, 
    revenueTrend = [], 
    topItems = [], 
    recentVouchers = [], 
    patientTrend = [] 
  } = data || {};

  const revenueToday = metrics.revenueToday || 0;
  const revenueMonth = metrics.revenueMonth || 0;
  const patientsToday = metrics.patientsToday || 0;
  const appts = metrics.appointmentsToday || { scheduled: 0, completed: 0 };
  const lowStockCount = metrics.lowStockCount || 0;
  const expiringStockCount = metrics.expiringStockCount || 0;
  const pendingReferrals = metrics.pendingReferrals || 0;

  return (
    <div className="dashboard-wrapper">
      {/* Header Section */}
      <div className="dashboard-header-premium">
        <div className="header-text">
          <h1>Clinic Overview</h1>
          <p>Real-time insights for <strong>Shwe See Sar</strong> clinical operations.</p>
        </div>
        <div className="header-stats-pill">
           <div className="pill-item">
             <span className="dot online"></span>
             <span>System Live</span>
           </div>
           <div className="pill-divider"></div>
           <div className="pill-item">
             <Calendar size={14} />
             <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
           </div>
        </div>
      </div>

      {/* Hero Metrics Row */}
      <div className="metrics-grid-premium">
        <MetricCardPremium 
          title="Daily Revenue" 
          value={`${revenueToday.toLocaleString()}`} 
          unit="MMK"
          trend="+12.5%"
          isPositive={true}
          icon={<DollarSign size={22} />}
          color="#3b82f6"
        />
        <MetricCardPremium 
          title="Monthly Total" 
          value={`${revenueMonth.toLocaleString()}`} 
          unit="MMK"
          trend="+8.2%"
          isPositive={true}
          icon={<TrendingUp size={22} />}
          color="#8b5cf6"
        />
        <MetricCardPremium 
          title="Patients Today" 
          value={patientsToday} 
          unit="Visits"
          trend="-2%"
          isPositive={false}
          icon={<Users size={22} />}
          color="#10b981"
        />
        <MetricCardPremium 
          title="Daily Schedule" 
          value={appts.scheduled} 
          unit="Appts"
          trend="Stable"
          isPositive={true}
          icon={<ClipboardList size={22} />}
          color="#f59e0b"
        />
      </div>

      {/* Main Charts Row */}
      <div className="charts-container-premium">
        <div className="card-premium chart-main">
          <div className="card-header-premium">
            <div className="title-group">
              <h3 className="card-title">Revenue Growth</h3>
              <p className="card-subtitle">Last 7 days performance</p>
            </div>
            <div className="chart-legend">
              <span className="legend-item"><span className="legend-dot blue"></span> Sales</span>
            </div>
          </div>
          <div className="chart-canvas-modern">
            {revenueTrend.map((day, idx) => {
              const maxAmount = Math.max(...revenueTrend.map(d => parseFloat(d.amount)), 1);
              const height = (parseFloat(day.amount) / maxAmount) * 100;
              return (
                <div key={idx} className="chart-bar-group">
                  <div className="bar-track">
                    <div className="bar-fill blue" style={{ height: `${height}%` }}>
                       <div className="bar-tooltip">{parseFloat(day.amount).toLocaleString()}</div>
                    </div>
                  </div>
                  <span className="bar-axis-label">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-premium chart-secondary">
          <div className="card-header-premium">
             <div className="title-group">
               <h3 className="card-title">Patient Flow</h3>
               <p className="card-subtitle">Daily distinct visitors</p>
             </div>
          </div>
          <div className="chart-canvas-modern">
            {patientTrend.map((day, idx) => {
              const maxCount = Math.max(...patientTrend.map(d => parseInt(d.count)), 1);
              const height = (parseInt(day.count) / maxCount) * 100;
              return (
                <div key={idx} className="chart-bar-group">
                  <div className="bar-track">
                    <div className="bar-fill green" style={{ height: `${height}%` }}>
                       <div className="bar-tooltip">{day.count} Patients</div>
                    </div>
                  </div>
                  <span className="bar-axis-label">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operational & Activity Row */}
      <div className="operations-grid-premium">
        {/* Urgent Alerts */}
        <div className="card-premium">
          <div className="card-header-premium">
            <h3 className="card-title">Operational Health</h3>
            <Activity size={18} color="#94a3b8" />
          </div>
          <div className="alerts-list-premium">
             <OperationItem 
               title="Low Stock Warning" 
               count={lowStockCount} 
               status="Critical"
               icon={<AlertTriangle size={18} />} 
               color="#ef4444"
               link="/stock"
             />
             <OperationItem 
               title="Upcoming Expiry" 
               count={expiringStockCount} 
               status="Attention"
               icon={<Clock size={18} />} 
               color="#f59e0b"
               link="/stock"
             />
             <OperationItem 
               title="Referral Balances" 
               count={`${Math.round(pendingReferrals/1000)}k`} 
               status="Pending"
               icon={<ShoppingBag size={18} />} 
               color="#3b82f6"
               link="/referral-payments"
             />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card-premium">
          <div className="card-header-premium">
            <h3 className="card-title">Recent Transactions</h3>
            <Receipt size={18} color="#94a3b8" />
          </div>
          <div className="activity-table-container">
            <table className="table-premium">
              <thead>
                <tr><th>Voucher</th><th>Patient</th><th className="text-right">Net</th></tr>
              </thead>
              <tbody>
                {recentVouchers.map((v, idx) => (
                  <tr key={idx}>
                    <td className="font-bold text-blue">{v.voucher_number}</td>
                    <td>{v.patient_name}</td>
                    <td className="text-right font-black">{parseFloat(v.net_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performers */}
        <div className="card-premium">
          <div className="card-header-premium">
            <h3 className="card-title">Best Sellers (April)</h3>
            <Star size={18} color="#f59e0b" />
          </div>
          <div className="top-performers-list">
             {topItems.slice(0, 4).map((item, idx) => (
               <div key={idx} className="performer-item">
                 <div className="performer-rank">{idx + 1}</div>
                 <div className="performer-info">
                   <span className="performer-name">{item.name}</span>
                   <span className="performer-meta">{item.total_qty} units sold</span>
                 </div>
                 <div className="performer-value">
                   {Math.round(item.total_revenue/1000)}k
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-wrapper { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* Premium Header */
        .dashboard-header-premium {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        .header-text h1 { font-size: 2.25rem; fontWeight: 900; color: #0f172a; margin: 0; letter-spacing: -0.04em; }
        .header-text p { color: #64748b; margin: 0.25rem 0 0; font-size: 1rem; }
        .header-stats-pill {
          display: flex;
          align-items: center;
          background: white;
          padding: 0.5rem 1.25rem;
          border-radius: 100px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          gap: 1rem;
        }
        .pill-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; color: #475569; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot.online { background: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }
        .pill-divider { width: 1px; height: 16px; background: #e2e8f0; }

        /* Metrics Cards */
        .metrics-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }
        .metric-card-premium {
          background: white;
          border-radius: 24px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          border: 1px solid #f1f5f9;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.03);
          position: relative;
          transition: transform 0.2s;
        }
        .metric-card-premium:hover { transform: translateY(-4px); }
        .m-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
        .m-icon-box { padding: 0.75rem; border-radius: 16px; }
        .m-trend { font-size: 0.75rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; }
        .m-trend.up { background: #ecfdf5; color: #059669; }
        .m-trend.down { background: #fef2f2; color: #dc2626; }
        .m-title { font-size: 0.875rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .m-value-row { display: flex; align-items: baseline; gap: 0.5rem; margin-top: 0.25rem; }
        .m-value { font-size: 2.25rem; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; }
        .m-unit { font-size: 0.9rem; font-weight: 600; color: #94a3b8; }
        .m-subtitle { font-size: 0.8rem; color: #94a3b8; margin-top: 0.5rem; font-weight: 500; }

        /* Charts */
        .charts-container-premium {
          display: grid;
          grid-template-columns: 1.8fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }
        .card-premium {
          background: white;
          border-radius: 28px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.03);
          overflow: hidden;
        }
        .card-header-premium {
          padding: 1.75rem 2rem;
          border-bottom: 1px solid #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-title { font-size: 1.125rem; font-weight: 800; color: #1e293b; margin: 0; }
        .card-subtitle { font-size: 0.875rem; color: #94a3b8; margin: 0.25rem 0 0; font-weight: 500; }
        
        .chart-canvas-modern {
          height: 280px;
          padding: 2.5rem 2rem 1.5rem;
          display: flex;
          align-items: flex-end;
          gap: 1.5rem;
        }
        .chart-bar-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          height: 100%;
        }
        .bar-track {
          flex: 1;
          width: 100%;
          background: #f8fafc;
          border-radius: 12px;
          display: flex;
          align-items: flex-end;
          position: relative;
        }
        .bar-fill {
          width: 100%;
          border-radius: 10px 10px 6px 6px;
          transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          cursor: pointer;
        }
        .bar-fill.blue { background: linear-gradient(to top, #2563eb, #60a5fa); }
        .bar-fill.green { background: linear-gradient(to top, #059669, #34d399); }
        .bar-fill:hover { filter: brightness(1.1); transform: scaleX(1.05); }
        
        .bar-tooltip {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: white;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          opacity: 0;
          transition: all 0.2s;
          pointer-events: none;
          white-space: nowrap;
          z-index: 10;
        }
        .bar-fill:hover .bar-tooltip { opacity: 1; top: -42px; }
        .bar-axis-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }

        /* Operations & Activity */
        .operations-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }
        .alerts-list-premium { display: flex; flex-direction: column; gap: 0.75rem; padding: 1.5rem; }
        .op-item-modern {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: #f8fafc;
          border-radius: 20px;
          text-decoration: none;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .op-item-modern:hover { background: white; border-color: #e2e8f0; transform: translateX(6px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .op-icon-box { padding: 0.75rem; border-radius: 14px; }
        .op-title { font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0; }
        .op-status { font-size: 0.75rem; font-weight: 600; color: #94a3b8; }
        .op-value { font-size: 1.25rem; font-weight: 900; margin-left: auto; }

        .activity-table-container { padding: 0.5rem 0; }
        .table-premium { width: 100%; border-collapse: collapse; }
        .table-premium th { text-align: left; padding: 1rem 1.5rem; background: #fcfcfd; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .table-premium td { padding: 1.125rem 1.5rem; border-bottom: 1px solid #f8fafc; font-size: 0.95rem; color: #475569; }
        .font-black { font-weight: 900; color: #0f172a; }
        
        .top-performers-list { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .performer-item { display: flex; align-items: center; gap: 1rem; }
        .performer-rank { width: 28px; height: 28px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: #64748b; }
        .performer-info { flex: 1; display: flex; flex-direction: column; }
        .performer-name { font-size: 0.95rem; font-weight: 700; color: #1e293b; }
        .performer-meta { font-size: 0.75rem; color: #94a3b8; }
        .performer-value { font-weight: 800; color: #10b981; font-size: 0.95rem; }

        .loading-state-modern { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 70vh; color: #94a3b8; }
        .pulse-loader { width: 56px; height: 56px; background: #3b82f6; border-radius: 50%; animation: pulse 1.5s infinite ease-in-out; margin-bottom: 2rem; box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.1); }
        
        @media (max-width: 1200px) {
          .charts-container-premium { grid-template-columns: 1fr; }
        }
      `}} />
    </div>
  );
}

function MetricCardPremium({ title, value, unit, trend, isPositive, icon, color }) {
  return (
    <div className="metric-card-premium" style={{ borderLeft: `6px solid ${color}` }}>
      <div className="m-header">
        <div className="m-icon-box" style={{ background: `${color}15`, color: color }}>
          {icon}
        </div>
        <div className={`m-trend ${isPositive ? 'up' : 'down'}`}>
          {trend}
        </div>
      </div>
      <span className="m-title">{title}</span>
      <div className="m-value-row">
        <span className="m-value">{value}</span>
        <span className="m-unit" style={{ marginLeft: '4px' }}>{unit}</span>
      </div>
    </div>
  );
}

function OperationItem({ title, count, status, icon, color, link }) {
  return (
    <a href={link} className="op-item-modern">
      <div className="op-icon-box" style={{ background: `${color}10`, color: color }}>
        {icon}
      </div>
      <div className="op-info">
        <h4 className="op-title">{title}</h4>
        <span className="op-status">{status}</span>
      </div>
      <div className="op-value" style={{ color: color }}>{count}</div>
      <ChevronRight size={14} color="#cbd5e1" />
    </a>
  );
}
