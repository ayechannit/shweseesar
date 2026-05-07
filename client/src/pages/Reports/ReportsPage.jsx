import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, DollarSign, Users, TrendingUp, 
  FileText, Download, Filter, ChevronRight, ArrowRight, 
  Wallet, PieChart, Package, AlertTriangle, Clock, 
  UserPlus, Star, Stethoscope, ShoppingBag, History, 
  CheckCircle, XCircle, MoreVertical, Layout, Truck, Printer
} from 'lucide-react';

import { API_BASE } from '../../config';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => { fetchReportData(); }, [activeTab, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let endpoint = `reports/${activeTab}`;
      const res = await fetch(`${API_BASE}/${endpoint}?start_date=${startDate}&end_date=${endDate}`);
      const result = await res.json();
      setData(result);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const totalRevenue = data?.paymentBreakdown?.reduce((sum, item) => sum + parseFloat(item.total), 0) || data?.totalRevenue || 0;

  const tabs = [
    { id: 'revenue', label: 'Revenue', icon: <TrendingUp size={18} />, color: '#3b82f6' },
    { id: 'referrals', label: 'Referrals', icon: <Stethoscope size={18} />, color: '#8b5cf6' },
    { id: 'stock', label: 'Inventory', icon: <Package size={18} />, color: '#10b981' },
    { id: 'patients', label: 'Patients', icon: <Users size={18} />, color: '#f59e0b' },
    { id: 'appointments', label: 'Schedule', icon: <Calendar size={18} />, color: '#ef4444' },
    { id: 'financial', label: 'Finance', icon: <Wallet size={18} />, color: '#64748b' },
  ];

  return (
    <div className="reports-container" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      <div className="reports-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div><h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Reports Center</h1><p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.9rem' }}>Comprehensive clinic analytics.</p></div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="date-picker-modern">
            <Calendar size={16} color="#94a3b8" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <ArrowRight size={14} color="#94a3b8" style={{ margin: '0 4px' }} />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="btn-modern secondary" onClick={() => window.print()}><Printer size={18} /><span>Print</span></button>
        </div>
      </div>
      <div className="tabs-nav-modern no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`} style={{ '--tab-color': tab.color }}>
            {tab.icon}<span>{tab.label}</span>
          </button>
        ))}
      </div>
      {loading ? <div className="loading-state-modern"><div className="pulse-loader"></div><p>Generating reports...</p></div> : data && (
        <div className="report-animation-wrapper">
          {activeTab === 'revenue' && <RevenueView data={data} total={totalRevenue} />}
          {activeTab === 'referrals' && <ReferralView data={data} />}
          {activeTab === 'stock' && <StockView data={data} />}
          {activeTab === 'patients' && <PatientView data={data} />}
          {activeTab === 'appointments' && <ApptView data={data} />}
          {activeTab === 'financial' && <FinancialView data={data} />}
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .date-picker-modern { display: flex; align-items: center; background: white; padding: 0.5rem 1rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .date-picker-modern input { border: none; outline: none; font-size: 0.875rem; font-weight: 600; color: #1e293b; cursor: pointer; }
        .btn-modern { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; border-radius: 12px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-modern.secondary { background: white; border: 1px solid #e2e8f0; color: #1e293b; }
        .tab-pill { display: flex; align-items: center; gap: 0.625rem; padding: 0.75rem 1.25rem; border-radius: 9999px; border: 1px solid transparent; background: #f8fafc; color: #64748b; font-weight: 600; font-size: 0.9rem; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .tab-pill.active { background: white; border-color: var(--tab-color); color: var(--tab-color); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .card-modern { background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); overflow: hidden; }
        .metric-label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.5rem; }
        .metric-value { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1; }
        .card-modern p { margin: 0; line-height: 1.5; color: #64748b; }
        .table-modern { width: 100%; border-collapse: collapse; }
        .table-modern th { text-align: left; padding: 0.875rem 1.25rem; background: #f8fafc; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #f1f5f9; }
        .table-modern td { padding: 0.875rem 1.25rem; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; }
        .pulse-loader { width: 40px; height: 40px; background-color: #3b82f6; border-radius: 50%; animation: pulse 1.5s infinite ease-in-out; margin-bottom: 1rem; }
        @keyframes pulse { 0% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.8); opacity: 0.5; } }
        @media print { .no-print { display: none !important; } .reports-container { padding: 0 !important; } .card-modern { box-shadow: none !important; border: 1px solid #eee !important; } }
      `}} />
    </div>
  );
}

const RevenueView = ({ data, total }) => {
  const growth = data.comparison?.previous > 0 ? ((data.comparison.current - data.comparison.previous) / data.comparison.previous * 100).toFixed(1) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card-modern" style={{ padding: '1.5rem', borderLeft: '5px solid #3b82f6' }}>
          <span className="metric-label">Total Revenue</span><div className="metric-value">{total.toLocaleString()} <small>MMK</small></div>
          <span style={{ color: growth >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '0.8rem', marginTop: '0.75rem', display: 'block' }}>{growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}% vs last period</span>
        </div>
        <div className="card-modern" style={{ padding: '1.5rem' }}>
          <span className="metric-label">Payment Methods</span>
          {data.paymentBreakdown?.map((p, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}><span>{p.payment_method}</span><strong>{parseFloat(p.total).toLocaleString()}</strong></div>)}
        </div>
      </div>
      <div className="card-modern">
        <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Daily Collection Details</h3></div>
        <div style={{ overflowX: 'auto' }}><table className="table-modern">
          <thead><tr><th>Date</th><th>Voucher #</th><th>Patient</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Net</th></tr></thead>
          <tbody>{data.collectionDetail?.map((c, i) => <tr key={i}><td>{new Date(c.date).toLocaleDateString()}</td><td style={{ fontWeight: 700, color: '#2563eb' }}>{c.voucher_number}</td><td>{c.patient_name}</td><td style={{ textAlign: 'right' }}>{parseFloat(c.total_amount).toLocaleString()}</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{parseFloat(c.net_amount).toLocaleString()}</td></tr>)}</tbody>
        </table></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <MiniTable title="Top Medicines" items={data.topMeds} />
        <MiniTable title="Top Services" items={data.topServices} />
        <MiniTable title="Top Packages" items={data.topPackages} />
      </div>
    </div>
  );
};

const MiniTable = ({ title, items }) => (
  <div className="card-modern">
    <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>{title}</h3></div>
    <table className="table-modern">
      <thead><tr><th>Name</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Rev</th></tr></thead>
      <tbody>{items?.map((it, idx) => <tr key={idx}><td>{it.name}</td><td style={{ textAlign: 'center' }}>{it.qty}</td><td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>{parseFloat(it.revenue).toLocaleString()}</td></tr>)}</tbody>
    </table>
  </div>
);

const ReferralView = ({ data }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
    <div className="card-modern"><div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Attending Physician Performance</h3></div>
      <table className="table-modern">
        <thead><tr><th>Physician</th><th style={{ textAlign: 'center' }}>Patients</th><th style={{ textAlign: 'right' }}>Revenue</th></tr></thead>
        <tbody>{data.physicianPerformance?.map((p, i) => <tr key={i}><td>{p.physician_name}</td><td style={{ textAlign: 'center' }}>{p.patients_handled}</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{parseFloat(p.revenue_generated).toLocaleString()}</td></tr>)}</tbody>
      </table>
    </div>
    <div className="card-modern"><div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Referral Commission Report</h3></div>
      <table className="table-modern">
        <thead><tr><th>Referrer</th><th>Cases</th><th style={{ textAlign: 'right' }}>Commission</th></tr></thead>
        <tbody>{data.performance?.map((r, i) => <tr key={i}><td>{r.name}</td><td style={{ textAlign: 'center' }}>{r.total_referrals}</td><td style={{ textAlign: 'right', fontWeight: 800, color: '#7c3aed' }}>{parseFloat(r.total_commission).toLocaleString()}</td></tr>)}</tbody>
      </table>
    </div>
  </div>
);

const StockView = ({ data }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div className="card-modern p-6" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', padding: '1.5rem' }}>
        <span className="metric-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Asset Valuation</span><div className="metric-value" style={{ color: 'white' }}>{data.valuation?.toLocaleString()}</div>
      </div>
      <div className="card-modern" style={{ padding: '1.5rem', borderLeft: '5px solid #ef4444' }}><span className="metric-label">Low Stock</span><div className="metric-value" style={{ color: '#dc2626' }}>{data.lowStock?.length}</div></div>
      <div className="card-modern" style={{ padding: '1.5rem', borderLeft: '5px solid #f59e0b' }}><span className="metric-label">Expiring Soon</span><div className="metric-value" style={{ color: '#d97706' }}>{data.expiringSoon?.length}</div></div>
    </div>
    <div className="card-modern"><div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Stock Movement History</h3></div>
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}><table className="table-modern">
        <thead><tr><th>Timestamp</th><th>Item</th><th>Type</th><th>Qty</th><th>Reason</th></tr></thead>
        <tbody>{data.stockMovement?.map((m, i) => <tr key={i}><td>{new Date(m.date).toLocaleString()}</td><td>{m.item_name}</td><td>{m.type}</td><td>{m.quantity}</td><td>{m.reason}</td></tr>)}</tbody>
      </table></div>
    </div>
    <div className="card-modern"><div style={{ padding: '1.25rem 1.5rem', background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}><h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#166534' }}>Profit Margins Analysis</h3></div>
      <table className="table-modern">
        <thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Sale</th><th style={{ textAlign: 'right' }}>Margin</th><th style={{ textAlign: 'right' }}>%</th></tr></thead>
        <tbody>{data.itemProfitability?.map((p, i) => <tr key={i}><td>{p.name}</td><td style={{ textAlign: 'right' }}>{parseFloat(p.s_price).toLocaleString()}</td><td style={{ textAlign: 'right' }}>{parseFloat(p.margin_amt).toLocaleString()}</td><td style={{ textAlign: 'right' }}>{p.margin_pct}%</td></tr>)}</tbody>
      </table>
    </div>
  </div>
);

const PatientView = ({ data }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div className="card-modern" style={{ padding: '1.5rem', borderTop: '4px solid #3b82f6' }}><span className="metric-label">New patients</span><div className="metric-value">{data.newPatientsCount}</div></div>
      <div className="card-modern" style={{ padding: '1.5rem', borderTop: '4px solid #8b5cf6' }}><span className="metric-label">Returning</span><div className="metric-value">{data.returningPatientsCount}</div></div>
      <div className="card-modern" style={{ padding: '1.5rem' }}><span className="metric-label">Demographics</span>{data.genderStats?.map((g, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>{g.gender || 'Other'}</span><strong>{g.count}</strong></div>)}</div>
    </div>
    <div className="card-modern"><div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Visit History Log</h3></div>
      <table className="table-modern">
        <thead><tr><th>Date</th><th>Patient</th><th>Voucher #</th><th style={{ textAlign: 'right' }}>Spent</th></tr></thead>
        <tbody>{data.visitHistory?.map((v, i) => <tr key={i}><td>{new Date(v.date).toLocaleDateString()}</td><td style={{ fontWeight: 700 }}>{v.patient_name}</td><td style={{ color: '#2563eb' }}>{v.voucher_number}</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{parseFloat(v.net_amount).toLocaleString()}</td></tr>)}</tbody>
      </table>
    </div>
  </div>
);

const ApptView = ({ data }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
      <div className="card-modern" style={{ padding: '1.5rem' }}><span className="metric-label">Breakdown</span>{data.statusBreakdown?.map((s, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span>{s.status}</span><strong>{s.count}</strong></div>)}</div>
      <div className="card-modern"><div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Schedule Log</h3></div>
        <table className="table-modern">
          <thead><tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead>
          <tbody>{data.appointmentList?.map((a, i) => <tr key={i}><td>{new Date(a.date).toLocaleString()}</td><td>{a.patient_name}</td><td>{a.physician_name}</td><td>{a.status}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  </div>
);

const FinancialView = ({ data }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
      <div className="card-modern p-6" style={{ padding: '1.5rem', borderLeft: '5px solid #10b981' }}><span className="metric-label">Revenue</span><div className="metric-value" style={{ color: '#059669' }}>{data.totalRevenue?.toLocaleString()}</div></div>
      <div className="card-modern p-6" style={{ padding: '1.5rem', borderLeft: '5px solid #ef4444' }}><span className="metric-label">COGS</span><div className="metric-value" style={{ color: '#dc2626' }}>{data.totalPurchaseCost?.toLocaleString()}</div></div>
    </div>
    <div className="card-modern"><div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Package Usage</h3></div>
      <table className="table-modern">
        <thead><tr><th>Package</th><th style={{ textAlign: 'center' }}>Usage</th><th style={{ textAlign: 'right' }}>Revenue</th></tr></thead>
        <tbody>{data.packageProfitability?.map((pkg, i) => <tr key={i}><td>{pkg.name}</td><td style={{ textAlign: 'center' }}>{pkg.usage_count}</td><td style={{ textAlign: 'right' }}>{parseFloat(pkg.total_revenue).toLocaleString()}</td></tr>)}</tbody>
      </table>
    </div>
  </div>
);
