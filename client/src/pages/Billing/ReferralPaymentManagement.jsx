import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, Clock, Calendar, User, DollarSign, FileText } from 'lucide-react';

import { API_BASE } from '../../config';

export default function ReferralPaymentManagement() {
  const [referrals, setReferrals] = useState([]);
  const [referredPersons, setReferredPersons] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Filters
  const [filters, setFilters] = useState({
    referred_person_id: '',
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    payment_status: 'Pending'
  });

  useEffect(() => {
    fetchReferredPersons();
    fetchReferrals();
  }, []);

  const fetchReferredPersons = async () => {
    try {
      const res = await fetch(`${API_BASE}/master-data/referred_persons?limit=200`);
      const data = await res.json();
      setReferredPersons(data.data || []);
    } catch (err) {
      console.error('Failed to fetch referred persons:', err);
    }
  };

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.referred_person_id) queryParams.append('referred_person_id', filters.referred_person_id);
      if (filters.from_date) queryParams.append('from_date', filters.from_date);
      if (filters.to_date) queryParams.append('to_date', filters.to_date);
      if (filters.payment_status) queryParams.append('payment_status', filters.payment_status);

      const res = await fetch(`${API_BASE}/billing/referrals?${queryParams.toString()}`);
      const data = await res.json();
      setReferrals(data || []);
      // Clear selection on new fetch
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to fetch referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id) => {
    if (!window.confirm('Mark this referral as paid?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/billing/referrals/${id}/pay`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchReferrals();
      } else {
        alert('Failed to process payment');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Error processing payment');
    }
  };

  const handleBulkPay = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Mark ${selectedIds.size} referrals as paid?`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/billing/referrals/bulk-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        fetchReferrals();
      } else {
        alert('Failed to process bulk payment');
      }
    } catch (err) {
      console.error('Bulk payment error:', err);
      alert('Error processing bulk payment');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Selection Handlers
  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      const pendingIds = referrals.filter(r => r.payment_status === 'Pending').map(r => r.id);
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

  const pendingReferrals = referrals.filter(r => r.payment_status === 'Pending');
  const allPendingSelected = pendingReferrals.length > 0 && selectedIds.size === pendingReferrals.length;
  const totalAmount = referrals.reduce((sum, ref) => sum + parseFloat(ref.amount), 0);
  const selectedAmount = referrals.filter(r => selectedIds.has(r.id)).reduce((sum, ref) => sum + parseFloat(ref.amount), 0);

  return (
    <div className="referral-payment-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Referral Fee Payments</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Track and manage payments to referred persons.</p>
        </div>
        {selectedIds.size > 0 && (
          <button className="btn btn-primary" onClick={handleBulkPay}>
            <CheckCircle size={18} style={{ marginRight: '6px' }} />
            Pay Selected ({selectedIds.size}) - {selectedAmount.toLocaleString()} MMK
          </button>
        )}
      </div>

      {/* Filters Card */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">Referred Person</label>
            <select 
              className="form-control" 
              name="referred_person_id" 
              value={filters.referred_person_id} 
              onChange={handleFilterChange}
            >
              <option value="">All Persons</option>
              {referredPersons.map(rp => (
                <option key={rp.id} value={rp.id}>{rp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">From Date</label>
            <input 
              type="date" 
              className="form-control" 
              name="from_date" 
              value={filters.from_date} 
              onChange={handleFilterChange} 
            />
          </div>
          <div>
            <label className="form-label">To Date</label>
            <input 
              type="date" 
              className="form-control" 
              name="to_date" 
              value={filters.to_date} 
              onChange={handleFilterChange} 
            />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select 
              className="form-control" 
              name="payment_status" 
              value={filters.payment_status} 
              onChange={handleFilterChange}
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <button className="btn btn-primary w-full" onClick={fetchReferrals} disabled={loading}>
              <Search size={18} /> Search
            </button>
          </div>
        </div>
      </div>

      {/* Summary Info */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.75rem', borderRadius: '8px' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Total Fee Amount</p>
            <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{totalAmount.toLocaleString()} MMK</p>
          </div>
        </div>
        <div className="card" style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '0.75rem', borderRadius: '8px' }}>
            <FileText size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Referrals Count</p>
            <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{referrals.length}</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  {pendingReferrals.length > 0 && (
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      checked={allPendingSelected}
                      onChange={toggleSelectAll}
                    />
                  )}
                </th>
                <th>Date</th>
                <th>Voucher #</th>
                <th>Referred Person</th>
                <th>Type</th>
                <th>Fee Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="text-center p-8">Loading referrals...</td></tr>
              ) : referrals.length === 0 ? (
                <tr><td colSpan="8" className="text-center p-8 text-gray-500">No referral fees found for the selected filters.</td></tr>
              ) : referrals.map(ref => (
                <tr key={ref.id} className={`hover-row ${selectedIds.has(ref.id) ? 'bg-blue-50' : ''}`}>
                  <td style={{ textAlign: 'center' }}>
                    {ref.payment_status === 'Pending' && (
                      <input 
                        type="checkbox" 
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        checked={selectedIds.has(ref.id)}
                        onChange={() => toggleSelectRow(ref.id)}
                      />
                    )}
                  </td>
                  <td>{new Date(ref.voucher_date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600, color: '#2563eb' }}>{ref.voucher_number}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ref.referred_person_name}</div>
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>{ref.referral_type}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#059669' }}>
                    {parseFloat(ref.amount).toLocaleString()} MMK
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>({ref.percentage}%)</div>
                  </td>
                  <td>
                    {ref.payment_status === 'Paid' ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="status-badge status-completed">Paid</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                          {new Date(ref.paid_at).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="status-badge status-pending">Pending</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {ref.payment_status === 'Pending' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 10px', fontSize: '0.875rem', color: '#16a34a', borderColor: '#16a34a' }}
                        onClick={() => handlePay(ref.id)}
                      >
                        <CheckCircle size={14} style={{ marginRight: '4px' }} /> Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
