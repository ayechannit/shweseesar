import React, { useState, useEffect } from 'react';
import { X, Save, Plus, FileText, Calendar, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import apiRequest from '../../utils/api';

export default function PatientClinicalModal({ isOpen, onClose, patient, apiBase }) {
  const [activeTab, setActiveTab] = useState('clinical'); // 'clinical' or 'billing'
  const [notes, setNotes] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  
  // Pagination State
  const [notesPage, setNotesPage] = useState(1);
  const notesPerPage = 5;
  const [billingPage, setBillingPage] = useState(1);
  const billingPerPage = 3;

  // Billing Filters
  const [billingFromDate, setBillingFromDate] = useState('');
  const [billingToDate, setBillingToDate] = useState('');

  // Form State
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [ongoingPlan, setOngoingPlan] = useState('');

  useEffect(() => {
    if (isOpen && patient?.patient_id) {
      fetchNotes();
      fetchVouchers();
      resetForm();
      setActiveTab('clinical');
      setBillingFromDate('');
      setBillingToDate('');
      setNotesPage(1);
      setBillingPage(1);
    }
  }, [isOpen, patient]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingNoteId(null);
    setRecordDate(new Date().toISOString().split('T')[0]);
    setDiagnosis('');
    setTreatment('');
    setOngoingPlan('');
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/patients/${patient.patient_id}/clinical-notes`);
      if (res && res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to fetch clinical notes', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVouchers = async (fromDateOverride, toDateOverride) => {
    try {
      const params = new URLSearchParams();
      const from = fromDateOverride !== undefined ? fromDateOverride : billingFromDate;
      const to = toDateOverride !== undefined ? toDateOverride : billingToDate;

      if (from) params.append('fromDate', from);
      if (to) params.append('toDate', to);

      const res = await apiRequest(`/patients/${patient.patient_id}/voucher-items?${params.toString()}`);
      if (res && res.ok) {
        const data = await res.json();
        // Group items by voucher_number
        const grouped = data.reduce((acc, item) => {
          if (!acc[item.voucher_number]) {
            acc[item.voucher_number] = {
              voucher_number: item.voucher_number,
              voucher_date: item.voucher_date,
              items: []
            };
          }
          acc[item.voucher_number].items.push(item);
          return acc;
        }, {});
        setVouchers(Object.values(grouped));
        setBillingPage(1); // Reset to first page on filter
      }
    } catch (err) {
      console.error('Failed to fetch voucher items', err);
    }
  };

  // Derived Paginated Data
  const paginatedNotes = notes.slice((notesPage - 1) * notesPerPage, notesPage * notesPerPage);
  const notesTotalPages = Math.ceil(notes.length / notesPerPage);

  const paginatedVouchers = vouchers.slice((billingPage - 1) * billingPerPage, billingPage * billingPerPage);
  const billingTotalPages = Math.ceil(vouchers.length / billingPerPage);

  const handleSave = async () => {
    if (!diagnosis && !treatment && !ongoingPlan) {
      alert("Please enter at least one detail (Diagnosis, Treatment, or Plan).");
      return;
    }

    try {
      const endpoint = editingNoteId 
        ? `/patients/clinical-notes/${editingNoteId}`
        : `/patients/${patient.patient_id}/clinical-notes`;
      
      const method = editingNoteId ? 'PUT' : 'POST';

      const res = await apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          record_date: recordDate,
          diagnosis,
          treatment,
          ongoing_plan: ongoingPlan
        })
      });

      if (res && res.ok) {
        await fetchNotes();
        resetForm();
      } else {
        alert("Failed to save clinical note.");
      }
    } catch (err) {
      console.error('Save error:', err);
      alert("Error saving note.");
    }
  };

  const handleEdit = (note) => {
    setEditingNoteId(note.id);
    setIsAdding(true);
    setRecordDate(new Date(note.record_date).toISOString().split('T')[0]);
    setDiagnosis(note.diagnosis || '');
    setTreatment(note.treatment || '');
    setOngoingPlan(note.ongoing_plan || '');
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this clinical record? This action cannot be undone.")) return;

    try {
      const res = await apiRequest(`/patients/clinical-notes/${id}`, { method: 'DELETE' });
      if (res && res.ok) {
        await fetchNotes();
      } else {
        alert("Failed to delete note.");
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert("Error deleting note.");
    }
  };

  if (!isOpen || !patient) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '1.25rem', width: '100%', maxWidth: '800px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Patient Details</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              {patient.patient_name} <span style={{ color: '#cbd5e1', margin: '0 0.5rem' }}>|</span> {patient.patient_code}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.5rem' }}>
            <X size={24} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 1.5rem' }}>
          <button 
            onClick={() => setActiveTab('clinical')}
            style={{
              padding: '1rem 1.5rem', border: 'none', background: 'none',
              fontWeight: 600, color: activeTab === 'clinical' ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === 'clinical' ? '2px solid #4f46e5' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            Clinical Notes
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            style={{
              padding: '1rem 1.5rem', border: 'none', background: 'none',
              fontWeight: 600, color: activeTab === 'billing' ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === 'billing' ? '2px solid #4f46e5' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            Medical History
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
          
          {activeTab === 'clinical' ? (
            <>
              {/* Add/Edit Section */}
              <div style={{ marginBottom: '2rem' }}>
                {!isAdding ? (
                  <button 
                    onClick={() => setIsAdding(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      backgroundColor: '#4f46e5', color: 'white', border: 'none',
                      padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                    }}
                  >
                    <Plus size={18} /> Add New Clinical Note
                  </button>
                ) : (
                  <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '2px solid #4f46e5', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                      {editingNoteId ? 'Edit Clinical Record' : 'New Entry'}
                    </h3>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Record Date</label>
                      <input 
                        type="date" 
                        value={recordDate}
                        onChange={(e) => setRecordDate(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                      />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Diagnosis</label>
                      <textarea 
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="Enter diagnosis details..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minHeight: '80px', fontFamily: 'inherit' }}
                      />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Treatment</label>
                      <textarea 
                        value={treatment}
                        onChange={(e) => setTreatment(e.target.value)}
                        placeholder="Enter treatment provided..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minHeight: '80px', fontFamily: 'inherit' }}
                      />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Ongoing Plan</label>
                      <textarea 
                        value={ongoingPlan}
                        onChange={(e) => setOngoingPlan(e.target.value)}
                        placeholder="Enter ongoing plan or instructions..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minHeight: '80px', fontFamily: 'inherit' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={resetForm}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSave}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Save size={18} /> {editingNoteId ? 'Update Record' : 'Save Entry'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* History Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} color="#4f46e5" /> Clinical History
                </h3>
                
                {notesTotalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button 
                      onClick={() => setNotesPage(prev => Math.max(prev - 1, 1))}
                      disabled={notesPage === 1}
                      style={{ 
                        padding: '0.25rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0', 
                        backgroundColor: notesPage === 1 ? '#f8fafc' : 'white', 
                        color: notesPage === 1 ? '#cbd5e1' : '#64748b',
                        cursor: notesPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center'
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                      Page {notesPage} of {notesTotalPages}
                    </span>
                    <button 
                      onClick={() => setNotesPage(prev => Math.min(prev + 1, notesTotalPages))}
                      disabled={notesPage === notesTotalPages}
                      style={{ 
                        padding: '0.25rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0', 
                        backgroundColor: notesPage === notesTotalPages ? '#f8fafc' : 'white', 
                        color: notesPage === notesTotalPages ? '#cbd5e1' : '#64748b',
                        cursor: notesPage === notesTotalPages ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center'
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              {loading ? (
                <p style={{ color: '#64748b' }}>Loading history...</p>
              ) : notes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#94a3b8', margin: 0 }}>No clinical history recorded yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {paginatedNotes.map((note, index) => {
                    // Check if it's the actual latest record in the entire list
                    const isLatestOverall = notes.indexOf(note) === 0;
                    
                    return (
                      <div key={note.id} style={{ 
                        backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', 
                        border: isLatestOverall ? '2px solid #eef2ff' : '1px solid #e2e8f0', 
                        boxShadow: isLatestOverall ? '0 10px 15px -3px rgba(0, 0, 0, 0.05)' : 'none',
                        display: 'flex', flexDirection: 'column', gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#f8fafc', padding: '0.35rem 0.85rem', borderRadius: '99px', border: '1px solid #e2e8f0' }}>
                            <Calendar size={14} /> {new Date(note.record_date).toLocaleDateString()}
                          </div>
                          
                          {/* Only allow edit/delete for the latest record overall */}
                          {isLatestOverall && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                onClick={() => handleEdit(note)}
                                style={{ background: '#eef2ff', border: '1px solid #e0e7ff', cursor: 'pointer', color: '#4f46e5', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}
                                title="Edit latest record"
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(note.id)}
                                style={{ background: '#fff1f2', border: '1px solid #ffe4e6', cursor: 'pointer', color: '#e11d48', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}
                                title="Delete latest record"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {note.diagnosis && (
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diagnosis</span>
                            <p style={{ margin: '0.25rem 0 0 0', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{note.diagnosis}</p>
                          </div>
                        )}
                        
                        {note.treatment && (
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Treatment</span>
                            <p style={{ margin: '0.25rem 0 0 0', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{note.treatment}</p>
                          </div>
                        )}

                        {note.ongoing_plan && (
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ongoing Plan</span>
                            <p style={{ margin: '0.25rem 0 0 0', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{note.ongoing_plan}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} color="#4f46e5" /> Medical History
                  </h3>
                  
                  {billingTotalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button 
                        onClick={() => setBillingPage(prev => Math.max(prev - 1, 1))}
                        disabled={billingPage === 1}
                        style={{ 
                          padding: '0.25rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0', 
                          backgroundColor: billingPage === 1 ? '#f8fafc' : 'white', 
                          color: billingPage === 1 ? '#cbd5e1' : '#64748b',
                          cursor: billingPage === 1 ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center'
                        }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>
                        Page {billingPage} of {billingTotalPages}
                      </span>
                      <button 
                        onClick={() => setBillingPage(prev => Math.min(prev + 1, billingTotalPages))}
                        disabled={billingPage === billingTotalPages}
                        style={{ 
                          padding: '0.25rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0', 
                          backgroundColor: billingPage === billingTotalPages ? '#f8fafc' : 'white', 
                          color: billingPage === billingTotalPages ? '#cbd5e1' : '#64748b',
                          cursor: billingPage === billingTotalPages ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center'
                        }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Billing Date Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>From</label>
                    <input 
                      type="date" 
                      value={billingFromDate}
                      onChange={(e) => setBillingFromDate(e.target.value)}
                      style={{ padding: '0.4rem 0.6rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>To</label>
                    <input 
                      type="date" 
                      value={billingToDate}
                      onChange={(e) => setBillingToDate(e.target.value)}
                      style={{ padding: '0.4rem 0.6rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    />
                  </div>
                  <button 
                    onClick={fetchVouchers}
                    style={{
                      padding: '0.4rem 1rem', backgroundColor: '#4f46e5', color: 'white',
                      border: 'none', borderRadius: '0.4rem', fontWeight: 600, cursor: 'pointer',
                      fontSize: '0.875rem', height: '34px'
                    }}
                  >
                    Filter
                  </button>
                  <button 
                    onClick={() => { setBillingFromDate(''); setBillingToDate(''); fetchVouchers(); }}
                    style={{
                      padding: '0.4rem 1rem', backgroundColor: 'white', color: '#64748b',
                      border: '1px solid #cbd5e1', borderRadius: '0.4rem', fontWeight: 600, cursor: 'pointer',
                      fontSize: '0.875rem', height: '34px'
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {vouchers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#94a3b8', margin: 0 }}>No billing history found.</p>
                </div>
              ) : (
                paginatedVouchers.map((voucher) => (
                  <div key={voucher.voucher_number} style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{voucher.voucher_number}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>
                          <Calendar size={14} /> {new Date(voucher.voucher_date).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', backgroundColor: '#eef2ff', padding: '0.25rem 0.75rem', borderRadius: '99px' }}>
                        {voucher.items.length} Items
                      </span>
                    </div>
                    <div style={{ padding: '1rem 1.5rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <th style={{ textAlign: 'left', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Item Name</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Price</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {voucher.items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: idx === voucher.items.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                              <td style={{ padding: '0.75rem 0', fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>
                                {item.item_name}
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>({item.item_type})</span>
                              </td>
                              <td style={{ textAlign: 'center', padding: '0.75rem 0', fontSize: '0.875rem', color: '#64748b' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '0.75rem 0', fontSize: '0.875rem', color: '#64748b' }}>{parseFloat(item.unit_price).toLocaleString()}</td>
                              <td style={{ textAlign: 'right', padding: '0.75rem 0', fontSize: '0.875rem', color: '#1e293b', fontWeight: 600 }}>{parseFloat(item.subtotal).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid #f1f5f9' }}>
                            <td colSpan="3" style={{ textAlign: 'right', padding: '1rem 0 0 0', fontWeight: 700, color: '#64748b', fontSize: '0.875rem' }}>Total Amount:</td>
                            <td style={{ textAlign: 'right', padding: '1rem 0 0 0', fontWeight: 800, color: '#4f46e5', fontSize: '1rem' }}>
                              {voucher.items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
