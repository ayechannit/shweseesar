import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, User, DollarSign, Eye, Printer, Filter } from 'lucide-react';
import VoucherEntry from './VoucherEntry';

const API_BASE = 'http://localhost:5000/api';

export default function BillingPage() {
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    if (view === 'list') {
      fetchVouchers();
    }
  }, [view, page]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/billing/vouchers?page=${page}&limit=${limit}`);
      const result = await res.json();
      setVouchers(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-page">
      {view === 'list' ? (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Vouchers & Billing</h1>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>View and manage clinic sales and billing records.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setView('create')}>
              <Plus size={18} /> New Voucher
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Voucher #</th>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Total Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="text-center p-8">Loading vouchers...</td></tr>
                  ) : vouchers.length === 0 ? (
                    <tr><td colSpan="7" className="text-center p-8 text-gray-500">No vouchers found.</td></tr>
                  ) : vouchers.map(v => (
                    <tr key={v.id} className="hover-row">
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>{v.voucher_number}</td>
                      <td>
                        <div style={{ fontSize: '0.875rem' }}>{new Date(v.created_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.patient_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{v.patient_code}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>
                        {parseFloat(v.net_amount).toLocaleString()} MMK
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>{v.payment_method}</span>
                      </td>
                      <td>
                        <span className="status-badge status-completed">{v.payment_status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                         <div className="flex justify-end gap-2">
                           <button className="btn-icon text-blue-600" title="View Details"><Eye size={18} /></button>
                           <button className="btn-icon text-gray-600" title="Print"><Printer size={18} /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
              <div className="flex gap-2">
                <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage(p => Math.max(p - 1, 1))}>Previous</button>
                <button className="btn btn-outline" disabled={page === totalPages} onClick={() => setPage(p => Math.min(p + 1, totalPages))}>Next</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <VoucherEntry 
          onSave={() => { setView('list'); setPage(1); }}
          onCancel={() => setView('list')}
        />
      )}
    </div>
  );
}