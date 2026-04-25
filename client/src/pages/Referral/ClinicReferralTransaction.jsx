import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function ClinicReferralTransaction() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    patient_id: '',
    refer_clinic_id: '',
    notes: ''
  });

  const [updateForm, setUpdateForm] = useState({ visit_type: 'OPD' });
  const [selectedTx, setSelectedTx] = useState(null);

  const [patients, setPatients] = useState([]);
  const [clinics, setClinics] = useState([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  
  const [summary, setSummary] = useState({ paid: 0, unpaid: 0 });

  // Filters state
  const [filters, setFilters] = useState({
    refer_clinic_id: '',
    patient_name: '',
    from_date: '',
    to_date: '',
    visit_type: '',
    payment_status: ''
  });

  const fetchData = async (page = currentPage) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: itemsPerPage,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const res = await fetch(`${API_BASE}/clinic-referral-transactions?${queryParams}`);
      const result = await res.json();
      setTransactions(result.data || []);
      setTotalPages(result.totalPages || 1);
      setTotalItems(result.total || 0);
      setSummary(result.summary || { paid: 0, unpaid: 0 });
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [patientsRes, clinicsRes] = await Promise.all([
        fetch(`${API_BASE}/master-data/patients?limit=1000`),
        fetch(`${API_BASE}/master-data/refer_clinics?limit=1000`)
      ]);
      const patientsData = await patientsRes.json();
      const clinicsData = await clinicsRes.json();
      setPatients(patientsData.data || []);
      setClinics(clinicsData.data || []);
    } catch (error) {
      console.error('Failed to fetch dropdown data', error);
    }
  };

  useEffect(() => {
    fetchData(1);
    fetchDropdownData();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchData(1);
  };

  const clearFilters = () => {
    setFilters({
      refer_clinic_id: '',
      patient_name: '',
      from_date: '',
      to_date: '',
      visit_type: '',
      payment_status: ''
    });
    setCurrentPage(1);
    // fetchData will be called via useEffect on filters change or we can call it directly. 
    // It's better to call it directly after clearing state to avoid race conditions if not using effect on filters.
    setTimeout(() => fetchData(1), 0);
  };

  const handleOpenModal = () => {
    setFormData({
      patient_id: '',
      refer_clinic_id: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/clinic-referral-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        handleCloseModal();
        fetchData(1);
        setCurrentPage(1);
      } else {
        const errorData = await res.json();
        alert('Failed to save record: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving record', error);
      alert('Error saving record');
    }
  };

  const handleOpenUpdateModal = (tx) => {
    setSelectedTx(tx);
    setUpdateForm({ visit_type: 'OPD' });
    setIsUpdateModalOpen(true);
  };

  const handleUpdateVisitType = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/clinic-referral-transactions/${selectedTx.id}/visit-type`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm)
      });
      if (res.ok) {
        setIsUpdateModalOpen(false);
        fetchData(currentPage);
      } else {
        const errorData = await res.json();
        alert('Failed to update visit type: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating visit type', error);
      alert('Error updating visit type');
    }
  };

  const handleMarkAsPaid = async (txId) => {
    if (!window.confirm('Are you sure you want to mark this transaction as Paid?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/clinic-referral-transactions/${txId}/pay`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchData(currentPage);
      } else {
        alert('Failed to mark as paid');
      }
    } catch (error) {
      console.error('Error marking as paid', error);
      alert('Error marking as paid');
    }
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    fetchData(pageNumber);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clinic Referral Transactions</h1>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={16} /> New Transaction
        </button>
      </div>

      {/* Filters Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: '1.5rem' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Patient Name</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search patient..." 
              name="patient_name"
              value={filters.patient_name}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Refer Clinic</label>
            <select 
              className="form-control" 
              name="refer_clinic_id"
              value={filters.refer_clinic_id}
              onChange={handleFilterChange}
            >
              <option value="">All Clinics</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Visit Type</label>
            <select 
              className="form-control"
              name="visit_type"
              value={filters.visit_type}
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              <option value="PENDING">Pending (Not Set)</option>
              <option value="OPD">OPD</option>
              <option value="OT">OT</option>
              <option value="ADMISSION">ADMISSION</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Payment Status</label>
            <select 
              className="form-control"
              name="payment_status"
              value={filters.payment_status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>From Date</label>
            <input 
              type="date" 
              className="form-control" 
              name="from_date"
              value={filters.from_date}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>To Date</label>
            <input 
              type="date" 
              className="form-control" 
              name="to_date"
              value={filters.to_date}
              onChange={handleFilterChange}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={applyFilters}>
              <Filter size={16} /> Filter
            </button>
            <button className="btn btn-outline" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {/* Summary Totals */}
        <div style={{ display: 'flex', gap: '1rem', padding: '1.5rem 1.5rem 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
          <div style={{ flex: 1, padding: '1rem', backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '0.5rem' }}>
            <h3 style={{ margin: 0, color: '#065f46', fontSize: '0.9rem' }}>Paid Total</h3>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#047857' }}>{summary.paid.toFixed(2)}</p>
          </div>
          <div style={{ flex: 1, padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '0.5rem' }}>
            <h3 style={{ margin: 0, color: '#92400e', fontSize: '0.9rem' }}>Unpaid Total</h3>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#b45309' }}>{summary.unpaid.toFixed(2)}</p>
          </div>
        </div>

        <div className="table-responsive">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Refer Clinic</th>
                    <th>Visit Type</th>
                    <th>Commission Amount</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(row => (
                      <tr key={row.id}>
                        <td>{new Date(row.created_at).toLocaleDateString()}</td>
                        <td>{row.patient_name}</td>
                        <td>{row.refer_clinic_name}</td>
                        <td>
                          {row.visit_type ? (
                            <span className={`badge ${row.visit_type === 'OPD' ? 'bg-blue-100 text-blue-800' : row.visit_type === 'OT' ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800'}`}>
                              {row.visit_type}
                            </span>
                          ) : (
                            <span className="badge bg-gray-100 text-gray-800">Pending</span>
                          )}
                        </td>
                        <td>{parseFloat(row.commission_amount).toFixed(2)}</td>
                        <td>
                           <span className={`badge ${row.payment_status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {row.payment_status}
                          </span>
                        </td>
                        <td>{row.notes || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {!row.visit_type && (
                              <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleOpenUpdateModal(row)}>
                                Set Visit Type
                              </button>
                            )}
                            {row.visit_type && row.payment_status === 'Pending' && (
                              <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleMarkAsPaid(row.id)}>
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {totalItems > itemsPerPage && (
                <div className="pagination-container">
                  <div className="page-summary">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                  </div>
                  <div className="pagination-controls">
                    <button 
                      className="btn btn-outline" 
                      onClick={() => paginate(currentPage - 1)} 
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <span className="page-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => paginate(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Creation Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">New Referral Transaction</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Patient *</label>
                <select
                  name="patient_id"
                  className="form-control"
                  required
                  value={formData.patient_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select Patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.patient_code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Refer Clinic *</label>
                <select
                  name="refer_clinic_id"
                  className="form-control"
                  required
                  value={formData.refer_clinic_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select Clinic</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Reason)</label>
                <textarea
                  name="notes"
                  className="form-control"
                  rows="3"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Enter reason or additional notes..."
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Visit Type Modal */}
      {isUpdateModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Update Visit Type</h2>
              <button className="close-btn" onClick={() => setIsUpdateModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateVisitType}>
              <div className="form-group">
                <label className="form-label">Patient</label>
                <input type="text" className="form-control" value={selectedTx?.patient_name || ''} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Visit Type *</label>
                <select
                  className="form-control"
                  required
                  value={updateForm.visit_type}
                  onChange={(e) => setUpdateForm({ visit_type: e.target.value })}
                >
                  <option value="OPD">OPD</option>
                  <option value="OT">OT</option>
                  <option value="ADMISSION">ADMISSION</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsUpdateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update & Calculate Commission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
