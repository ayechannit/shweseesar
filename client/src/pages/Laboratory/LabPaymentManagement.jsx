import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, CheckCircle, Clock, Calendar, 
  DollarSign, FileText, FlaskConical, ChevronRight, 
  ArrowRight, CreditCard, History
} from 'lucide-react';

import apiRequest from '../../utils/api';

export default function LabPaymentManagement() {
  const [investigations, setInvestigations] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Filters
  const [filters, setFilters] = useState({
    laboratory_id: '',
    payment_status: 'Pending',
    from_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchLaboratories();
    fetchLabPayments();
  }, []);

  const fetchLaboratories = async () => {
    try {
      const res = await apiRequest('/master-data/laboratories?limit=100');
      const data = await res.json();
      setLaboratories(data.data || []);
    } catch (err) {
      console.error('Failed to fetch laboratories:', err);
    }
  };

  const fetchLabPayments = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters);
      const res = await apiRequest(`/lab-payments?${queryParams.toString()}`);
      const data = await res.json();
      setInvestigations(data || []);
      setSelectedIds(new Set()); // Clear selection
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPay = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Mark ${selectedIds.size} investigations as paid to laboratory?`)) return;

    try {
      const res = await apiRequest('/lab-payments/bulk-pay', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        alert('Payments recorded successfully');
        fetchLabPayments();
      } else {
        alert('Failed to process bulk payment');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Error processing lab payment');
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      const pendingIds = investigations.filter(i => i.lab_payment_status === 'Pending').map(i => i.id);
      setSelectedIds(new Set(pendingIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectRow = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const pendingList = investigations.filter(i => i.lab_payment_status === 'Pending');
  
  // Logic: Cost - (Cost * Percentage / 100)
  const getNetPayable = (cost, percentage) => {
    const c = parseFloat(cost) || 0;
    const p = parseFloat(percentage) || 0;
    return c - (c * (p / 100));
  };

  const totalNetPayable = investigations.reduce((sum, i) => sum + getNetPayable(i.lab_cost_price, i.lab_commission_pct), 0);
  const selectedCost = investigations.filter(i => selectedIds.has(i.id)).reduce((sum, i) => sum + getNetPayable(i.lab_cost_price, i.lab_commission_pct), 0);

  return (
    <div className="lab-payment-page" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>External Lab Payments</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Track and settle discounted balances with partner laboratories.</p>
        </div>
        {selectedIds.size > 0 && (
          <button className="btn-modern-primary" onClick={handleBulkPay}>
            <CheckCircle size={18} />
            <span>Pay Selected ({selectedIds.size}) - {selectedCost.toLocaleString()} MMK</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card-modern" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'flex-end' }}>
          <div className="form-group-modern">
            <label>Partner Laboratory</label>
            <select value={filters.laboratory_id} onChange={e => setFilters({...filters, laboratory_id: e.target.value})}>
              <option value="">All Laboratories</option>
              {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
            </select>
          </div>
          <div className="form-group-modern">
            <label>Payment Status</label>
            <select value={filters.payment_status} onChange={e => setFilters({...filters, payment_status: e.target.value})}>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid (History)</option>
              <option value="">All Status</option>
            </select>
          </div>
          <div className="form-group-modern">
            <label>Date Range</label>
            <div className="date-input-group">
               <input type="date" value={filters.from_date} onChange={e => setFilters({...filters, from_date: e.target.value})} />
               <ArrowRight size={14} color="#94a3b8" />
               <input type="date" value={filters.to_date} onChange={e => setFilters({...filters, to_date: e.target.value})} />
            </div>
          </div>
          <button className="btn btn-primary w-full" onClick={fetchLabPayments} style={{ height: '46px', borderRadius: '12px' }}>
            <Search size={18} />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card-modern metric-box" style={{ borderLeft: '6px solid #3b82f6' }}>
          <span className="metric-label">Total Net Payable</span>
          <div className="metric-value">{totalNetPayable.toLocaleString()} <small>MMK</small></div>
        </div>
        <div className="card-modern metric-box" style={{ borderLeft: '6px solid #f59e0b' }}>
          <span className="metric-label">Pending Records</span>
          <div className="metric-value">{pendingList.length}</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card-modern overflow-hidden">
        <div style={{ overflowX: 'auto' }}>
          <table className="table-modern">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={investigations.length > 0 && selectedIds.size === pendingList.length && pendingList.length > 0} 
                    onChange={toggleSelectAll} 
                  />
                </th>
                <th>Voucher / Date</th>
                <th>Patient</th>
                <th>Investigation Item</th>
                <th>Laboratory</th>
                <th style={{ textAlign: 'right' }}>Cost Price</th>
                <th style={{ textAlign: 'center' }}>Lab %</th>
                <th style={{ textAlign: 'right' }}>Net Payable</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '4rem' }}>Loading data...</td></tr>
              ) : investigations.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>No investigations found for the selected filters.</td></tr>
              ) : investigations.map(inv => (
                <tr key={inv.id} className={selectedIds.has(inv.id) ? 'selected-row' : ''}>
                  <td style={{ textAlign: 'center' }}>
                    {inv.lab_payment_status === 'Pending' && (
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(inv.id)} 
                        onChange={() => toggleSelectRow(inv.id)} 
                      />
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: '#2563eb' }}>{inv.voucher_number}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(inv.voucher_date).toLocaleDateString()}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{inv.patient_name}</td>
                  <td style={{ fontWeight: 700 }}>{inv.name}</td>
                  <td><span className="lab-badge">{inv.laboratory_name}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#64748b' }}>{parseFloat(inv.lab_cost_price).toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{inv.lab_commission_pct}%</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: '#059669' }}>
                    {getNetPayable(inv.lab_cost_price, inv.lab_commission_pct).toLocaleString()}
                  </td>
                  <td>
                    <span className={`status-pill ${inv.lab_payment_status.toLowerCase()}`}>
                      {inv.lab_payment_status}
                    </span>
                    {inv.lab_paid_at && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{new Date(inv.lab_paid_at).toLocaleDateString()}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .lab-payment-page { font-family: 'Inter', system-ui, sans-serif; animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .card-modern { background: white; border-radius: 20px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); overflow: hidden; }
        
        .form-group-modern label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.75rem; }
        .form-group-modern select { width: 100%; height: 46px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0 1rem; font-weight: 600; color: #1e293b; outline: none; }
        
        .date-input-group { display: flex; align-items: center; gap: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0 1rem; height: 46px; }
        .date-input-group input { border: none; background: none; font-weight: 600; color: #1e293b; outline: none; cursor: pointer; font-size: 0.9rem; }

        .btn-modern-primary { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1.75rem; background: #2563eb; color: white; border-radius: 14px; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3); }
        .btn-modern-primary:hover { transform: translateY(-2px); box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.4); }

        .btn-modern.secondary { display: flex; align-items: center; gap: 0.625rem; padding: 0.75rem 1.5rem; background: white; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-modern.secondary:hover { background: #f8fafc; transform: translateY(-1px); }

        .metric-box { padding: 1.5rem 2rem; }
        .metric-label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 0.5rem; }
        .metric-value { font-size: 2rem; font-weight: 900; color: #0f172a; margin: 0; line-height: 1; letter-spacing: -0.03em; }

        .table-modern { width: 100%; border-collapse: collapse; }
        .table-modern th { text-align: left; padding: 1.125rem 1.5rem; background: #fcfcfd; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #f1f5f9; }
        .table-modern td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
        .table-modern tr:hover td { background: #fcfdfc; }
        .selected-row td { background: #eff6ff !important; }

        .lab-badge { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
        
        .status-pill { padding: 4px 10px; border-radius: 100px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
        .status-pill.pending { background: #fffbeb; color: #d97706; }
        .status-pill.paid { background: #ecfdf5; color: #059669; }

        input[type="checkbox"] { width: 18px; height: 18px; border-radius: 6px; border: 2px solid #cbd5e1; cursor: pointer; }
      `}} />
    </div>
  );
}
