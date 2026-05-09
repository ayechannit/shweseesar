import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import apiRequest from '../../utils/api';

export default function AddPatientModal({ isOpen, onClose, onSave, apiBase }) {
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone_number: '',
    date_of_birth: '',
    gender: 'Other',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiRequest(`/master-data/patients`, {
        method: 'POST',
        body: JSON.stringify(newPatient)
      });
      if (res && res.ok) {
        const addedPatient = await res.json();
        onSave(addedPatient);
        onClose();
        setNewPatient({ name: '', phone_number: '', date_of_birth: '', gender: 'Other', address: '' });
      } else {
        alert("Failed to add patient");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={24} className="text-blue-600" /> New Patient Registration
          </h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="form-group mb-4">
            <label className="form-label">Full Name</label>
            <input 
              type="text" className="form-control" required
              value={newPatient.name}
              onChange={e => setNewPatient({...newPatient, name: e.target.value})}
              placeholder="Enter patient name"
            />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Phone Number</label>
            <input 
              type="text" className="form-control" required
              value={newPatient.phone_number}
              onChange={e => setNewPatient({...newPatient, phone_number: e.target.value})}
              placeholder="e.g. 09..."
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="mb-4">
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input 
                type="date" className="form-control" required
                value={newPatient.date_of_birth}
                onChange={e => setNewPatient({...newPatient, date_of_birth: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select 
                className="form-control"
                value={newPatient.gender}
                onChange={e => setNewPatient({...newPatient, gender: e.target.value})}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-group mb-6">
            <label className="form-label">Address</label>
            <textarea 
              className="form-control" rows="3"
              value={newPatient.address}
              onChange={e => setNewPatient({...newPatient, address: e.target.value})}
              placeholder="Patient address"
            />
          </div>
          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
