import React, { useState, useEffect } from 'react';
import { Calendar, Search, UserPlus, Clock, X, Check, Search as SearchIcon, Plus } from 'lucide-react';
import AddPatientModal from '../../components/Modals/AddPatientModal';

import apiRequest from '../../utils/api';
import { API_BASE } from '../../config';

export default function ReceptionDashboard() {
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' or 'search'
  
  // --- New Patient Modal ---
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  
  // --- Appointments Pagination ---
  const [apptPage, setApptPage] = useState(1);
  const [apptTotalPages, setApptTotalPages] = useState(1);
  const [apptLimit] = useState(10);

  // --- Search Pagination ---
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchLimit] = useState(10);

  // --- Appointments State ---
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  
  // Appt Form State
  const [apptForm, setApptForm] = useState({ patient_id: '', physician_id: '', appointment_date: '', reason: '' });
  const [physicians, setPhysicians] = useState([]);
  const [patients, setPatients] = useState([]); // For dropdown

  // --- Search State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAge, setSearchAge] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchPhysicians();
    // Pre-fetch some patients for the dropdown (top 50)
    fetchPatientsForDropdown();
    // Initial search load
    handleSearch();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [apptPage]);

  useEffect(() => {
    if (activeTab === 'search') {
       handleSearch();
    }
  }, [searchPage, activeTab]);

  const fetchAppointments = async () => {
    setLoadingAppts(true);
    try {
      const res = await apiRequest(`/appointments?page=${apptPage}&limit=${apptLimit}`);
      const result = await res.json();
      setAppointments(result.data || []);
      setApptTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAppts(false);
    }
  };

  const fetchPhysicians = async () => {
    try {
      const res = await apiRequest('/master-data/physicians?limit=100');
      const result = await res.json();
      setPhysicians(result.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPatientsForDropdown = async () => {
    try {
      const res = await apiRequest('/master-data/patients?limit=50');
      const result = await res.json();
      setPatients(result.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Search Handlers ---
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (e) setSearchPage(1); // Reset to first page on new search
    
    setIsSearching(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('query', searchQuery);
      if (searchAge) queryParams.append('age', searchAge);
      queryParams.append('page', searchPage);
      queryParams.append('limit', searchLimit);
      
      const res = await apiRequest(`/reception/patients/search?${queryParams.toString()}`);
      const result = await res.json();
      setSearchResults(result.data || []);
      setSearchTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // --- Appointment Booking Handlers ---
  const openApptModal = (patientId = '') => {
    setApptForm({ patient_id: patientId, physician_id: '', appointment_date: '', reason: '' });
    setIsApptModalOpen(true);
  };

  const submitAppointment = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/appointments', {
        method: 'POST',
        body: JSON.stringify(apptForm)
      });
      if (res.ok) {
        setIsApptModalOpen(false);
        fetchAppointments();
        setActiveTab('appointments');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateApptStatus = async (id, status) => {
    try {
      const res = await apiRequest(`/appointments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewPatientSave = (newPatient) => {
    setPatients(prev => [newPatient, ...prev]);
    setApptForm(prev => ({ ...prev, patient_id: newPatient.id }));
    setIsApptModalOpen(true);
  };

  // Helper to calculate age from DOB
  const calculateAge = (dob) => {
    if (!dob) return '-';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  return (
    <div className="container-fluid p-2 p-md-4">
      <div className="page-header flex-column flex-md-row gap-3">
        <h1 className="page-title">Reception Dashboard</h1>
        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setIsPatientModalOpen(true)}>
            <UserPlus size={16} /> Quick Register
          </button>
          <button className="btn btn-primary" onClick={() => openApptModal()}>
            <Calendar size={16} /> Book Appointment
          </button>
        </div>
      </div>

      <div className="tabs mt-4">
        <button 
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          <Clock size={16} /> Appointments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={16} /> Patient Search
        </button>
      </div>

      <div className="card tab-content" style={{ marginTop: '1rem', padding: '1.5rem' }}>
        {activeTab === 'appointments' && (
          <div className="appointments-view">
            <h3 style={{ marginBottom: '1rem' }}>Upcoming Appointments</h3>
            {loadingAppts ? (
              <div className="text-center p-5">Loading...</div>
            ) : appointments.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>No appointments scheduled.</div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Phone</th>
                      <th>Physician</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(appt => (
                      <tr key={appt.id}>
                        <td>
                          <div className="font-medium">{new Date(appt.appointment_date).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td>
                          <div className="font-medium">{appt.patient_name}</div>
                          <small style={{ color: '#64748b' }}>{appt.patient_code}</small>
                        </td>
                        <td>{appt.patient_phone}</td>
                        <td>{appt.physician_name}</td>
                        <td>
                          <span className={`status-badge status-${appt.status.toLowerCase()}`}>
                            {appt.status}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            {appt.status === 'Scheduled' && (
                              <div className="flex gap-1">
                                <button className="btn btn-success p-1" style={{ background: '#10b981', color: 'white' }} onClick={() => updateApptStatus(appt.id, 'Completed')} title="Complete">
                                  <Check size={16} />
                                </button>
                                <button className="btn btn-danger p-1" onClick={() => updateApptStatus(appt.id, 'Cancelled')} title="Cancel">
                                  <X size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Appointments Pagination */}
            {!loadingAppts && apptTotalPages > 1 && (
              <div className="flex flex-column flex-md-row justify-between items-center mt-4 gap-3">
                <div className="text-sm text-gray-500">Page {apptPage} of {apptTotalPages}</div>
                <div className="flex gap-2">
                  <button className="btn btn-outline" disabled={apptPage === 1} onClick={() => setApptPage(p => Math.max(p - 1, 1))}>Previous</button>
                  <button className="btn btn-outline" disabled={apptPage === apptTotalPages} onClick={() => setApptPage(p => Math.min(p + 1, apptTotalPages))}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="search-view">
            <form onSubmit={handleSearch} className="flex flex-column flex-lg-row gap-3 mb-4">
              <div style={{ flex: '2', minWidth: '200px' }}>
                <label className="form-label">Search Name / Phone / Code</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. John Doe, 09..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ flex: '1', minWidth: '100px' }}>
                <label className="form-label">Age</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="e.g. 25"
                  value={searchAge}
                  onChange={e => setSearchAge(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className="btn btn-primary" disabled={isSearching} style={{ height: '42px', whiteSpace: 'nowrap' }}>
                  <SearchIcon size={16} /> Search
                </button>
                <a href="/patients" className="btn btn-outline" style={{ textDecoration: 'none', height: '42px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                  <UserPlus size={16} className="mr-1" /> Register
                </a>
              </div>
            </form>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Patient Code</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Age</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        {isSearching ? 'Searching...' : 'No results found. Please search.'}
                      </td>
                    </tr>
                  ) : (
                    searchResults.map(patient => (
                      <tr key={patient.id}>
                        <td><strong>{patient.patient_code}</strong></td>
                        <td>{patient.name}</td>
                        <td>{patient.phone_number}</td>
                        <td>{calculateAge(patient.date_of_birth)}</td>
                        <td>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => openApptModal(patient.id)}
                          >
                            Book Appt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Search Pagination */}
            {!isSearching && searchTotalPages > 1 && (
              <div className="flex flex-column flex-md-row justify-between items-center mt-4 gap-3">
                <div className="text-sm text-gray-500">Page {searchPage} of {searchTotalPages}</div>
                <div className="flex gap-2">
                  <button className="btn btn-outline" disabled={searchPage === 1} onClick={() => setSearchPage(p => Math.max(p - 1, 1))}>Previous</button>
                  <button className="btn btn-outline" disabled={searchPage === searchTotalPages} onClick={() => setSearchPage(p => Math.min(p + 1, searchTotalPages))}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isApptModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Book Appointment</h2>
              <button className="close-btn" onClick={() => setIsApptModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={submitAppointment}>
              <div className="form-group">
                <label className="form-label">Patient</label>
                <select 
                  className="form-control" 
                  required 
                  value={apptForm.patient_id}
                  onChange={e => setApptForm({...apptForm, patient_id: e.target.value})}
                >
                  <option value="">-- Select Patient --</option>
                  {/* If the selected patient isn't in our top 50 array (e.g. from search), they might not show correctly if we only map top 50. 
                      For a robust system, this should be an async search dropdown. For now, we list fetched patients. */}
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.patient_code})</option>
                  ))}
                  {/* Append searched patient if they aren't in the list */}
                  {apptForm.patient_id && !patients.find(p => p.id == apptForm.patient_id) && searchResults.find(p => p.id == apptForm.patient_id) && (
                    <option value={apptForm.patient_id}>
                      {searchResults.find(p => p.id == apptForm.patient_id).name} (Selected from Search)
                    </option>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Physician</label>
                <select 
                  className="form-control" 
                  required 
                  value={apptForm.physician_id}
                  onChange={e => setApptForm({...apptForm, physician_id: e.target.value})}
                >
                  <option value="">-- Select Physician --</option>
                  {physicians.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="form-control" 
                  required 
                  value={apptForm.appointment_date}
                  onChange={e => setApptForm({...apptForm, appointment_date: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reason / Notes (Optional)</label>
                <textarea 
                  className="form-control" 
                  rows="3"
                  value={apptForm.reason}
                  onChange={e => setApptForm({...apptForm, reason: e.target.value})}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsApptModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AddPatientModal 
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSave={handleNewPatientSave}
        apiBase={API_BASE}
      />
    </div>
  );
}