import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import apiRequest from '../../utils/api';

export default function AddPatientModal({ isOpen, onClose, onSave }) {
  const [newPatient, setNewPatient] = useState({
    patient_code: '',
    name: '',
    phone_number: '',
    age: '',
    date_of_birth: '',
    gender: 'Other',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      setNewPatient({
        patient_code: `PT-${datePart}-${randomPart}`,
        name: '',
        phone_number: '',
        age: '',
        date_of_birth: '',
        gender: 'Other',
        address: ''
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPatient(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'age' && value) {
        const today = new Date();
        const birthYear = today.getFullYear() - parseInt(value, 10);
        const dob = new Date(birthYear, today.getMonth(), today.getDate());
        const mm = String(dob.getMonth() + 1).padStart(2, '0');
        const dd = String(dob.getDate()).padStart(2, '0');
        updated.date_of_birth = `${dob.getFullYear()}-${mm}-${dd}`;
      } else if (name === 'date_of_birth' && value) {
        const dob = new Date(value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        updated.age = age.toString();
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...newPatient };
      delete payload.age; // Remove transient field
      const res = await apiRequest(`/master-data/patients`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res && res.ok) {
        const addedPatient = await res.json();
        onSave(addedPatient);
        onClose();
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
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={24} className="text-blue-600" /> New Patient Registration
          </h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }} className="mb-4">
            <div className="form-group">
              <label className="form-label">Patient Code</label>
              <input 
                type="text" className="form-control" disabled
                value={newPatient.patient_code}
                placeholder="Auto-generated"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" className="form-control" required
                name="name"
                value={newPatient.name}
                onChange={handleInputChange}
                placeholder="Enter patient name"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }} className="mb-4">
            <div className="form-group">
              <label className="form-label">Age</label>
              <input 
                type="number" className="form-control"
                name="age"
                value={newPatient.age}
                onChange={handleInputChange}
                placeholder="Years"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input 
                type="date" className="form-control" required
                name="date_of_birth"
                value={newPatient.date_of_birth}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select 
                className="form-control"
                name="gender"
                value={newPatient.gender}
                onChange={handleInputChange}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Phone Number</label>
            <input 
              type="text" className="form-control" required
              name="phone_number"
              value={newPatient.phone_number}
              onChange={handleInputChange}
              placeholder="e.g. 09..."
            />
          </div>

          <div className="form-group mb-6">
            <label className="form-label">Address</label>
            <textarea 
              className="form-control" rows="3"
              name="address"
              value={newPatient.address}
              onChange={handleInputChange}
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

