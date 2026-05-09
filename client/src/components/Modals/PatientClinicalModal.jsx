import React, { useState, useEffect } from 'react';
import { X, Save, Plus, FileText, Calendar, Edit2, Trash2 } from 'lucide-react';
import apiRequest from '../../utils/api';

export default function PatientClinicalModal({ isOpen, onClose, patient, apiBase }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  
  // Form State
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [ongoingPlan, setOngoingPlan] = useState('');

  useEffect(() => {
    if (isOpen && patient?.patient_id) {
      fetchNotes();
      resetForm();
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
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Clinical Details</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              {patient.patient_name} <span style={{ color: '#cbd5e1', margin: '0 0.5rem' }}>|</span> {patient.patient_code}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.5rem' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
          
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
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="#4f46e5" /> Clinical History
          </h3>
          
          {loading ? (
            <p style={{ color: '#64748b' }}>Loading history...</p>
          ) : notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#94a3b8', margin: 0 }}>No clinical history recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notes.map((note, index) => (
                <div key={note.id} style={{ 
                  backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', 
                  border: index === 0 ? '2px solid #eef2ff' : '1px solid #e2e8f0', 
                  boxShadow: index === 0 ? '0 10px 15px -3px rgba(0, 0, 0, 0.05)' : 'none',
                  display: 'flex', flexDirection: 'column', gap: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 600, backgroundColor: '#f8fafc', padding: '0.35rem 0.85rem', borderRadius: '99px', border: '1px solid #e2e8f0' }}>
                      <Calendar size={14} /> {new Date(note.record_date).toLocaleDateString()}
                    </div>
                    
                    {/* Only allow edit/delete for the latest record (index 0) */}
                    {index === 0 && (
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
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
