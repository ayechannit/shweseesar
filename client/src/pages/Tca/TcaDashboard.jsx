import React, { useState, useEffect } from 'react';
import { Calendar, User, Search, Filter, FileText, Star, AlertCircle, RotateCcw } from 'lucide-react';
import PatientClinicalModal from '../../components/Modals/PatientClinicalModal';
import { API_BASE } from '../../config';
import apiRequest from '../../utils/api';

export default function PatientDashboard() {
  const [patients, setPatients] = useState([]);
  const [physicians, setPhysicians] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [physicianId, setPhysicianId] = useState('');
  const [showAllPatients, setShowAllPatients] = useState(false);
  const [isNewToday, setIsNewToday] = useState(false);
  const [isTotalTca, setIsTotalTca] = useState(false);
  const [activeCard, setActiveCard] = useState(null); // 'total', 'new', 'tca', 'tomorrow'
  
  // Default dates to today
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 50;
  const [hasMore, setHasMore] = useState(true);

  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [totalTcaCount, setTotalTcaCount] = useState(0);
  const [tomorrowTcaCount, setTomorrowTcaCount] = useState(0);

  // Modal State
  const [selectedPatientForModal, setSelectedPatientForModal] = useState(null);
  const [isClinicalModalOpen, setIsClinicalModalOpen] = useState(false);

  useEffect(() => {
    fetchPhysicians();
    fetchPatientData(1);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      fetchPatientData(1);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [search, physicianId, fromDate, toDate, showAllPatients, isNewToday, isTotalTca]);

  const fetchPhysicians = async () => {
    try {
      const res = await apiRequest('/master-data/physicians?limit=200');
      if (res.ok) {
        const data = await res.json();
        setPhysicians(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch physicians', err);
    }
  };

  const fetchPatientData = async (pageNum = page) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        ...(search && { search }),
        ...(physicianId && { physicianId }),
        ...(showAllPatients ? {} : (fromDate && { fromDate })),
        ...(showAllPatients ? {} : (toDate && { toDate })),
        showAllPatients: showAllPatients ? 'true' : 'false',
        isNewToday: isNewToday ? 'true' : 'false',
        isTotalTca: isTotalTca ? 'true' : 'false',
        page: pageNum,
        limit
      });
      
      const res = await apiRequest(`/dashboard/patients?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        
        if (pageNum === 1) {
            setPatients(data.patients || []);
        } else {
            setPatients(prev => [...prev, ...(data.patients || [])]);
        }
        
        setHasMore((data.patients || []).length === limit);

        setTotalCount(data.totalCount || 0);
        setTodayCount(data.todayCount || 0);
        setTotalTcaCount(data.totalTcaCount || 0);
        setTomorrowTcaCount(data.tomorrowTcaCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch patient data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPatientData(nextPage);
  };

  const clearFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setSearch('');
    setPhysicianId('');
    setFromDate(today);
    setToDate(today);
    setShowAllPatients(false);
    setIsNewToday(false);
    setIsTotalTca(false);
    setActiveCard(null);
    setPage(1);
  };

  const handleCardClick = (type) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setActiveCard(type);
    setSearch('');
    setPhysicianId('');
    setPage(1);

    if (type === 'total') {
      setShowAllPatients(true);
      setIsNewToday(false);
      setIsTotalTca(false);
    } else if (type === 'new') {
      setShowAllPatients(true); // Don't filter by TCA dates
      setIsNewToday(true);
      setIsTotalTca(false);
    } else if (type === 'tca') {
      setShowAllPatients(false);
      setIsNewToday(false);
      setIsTotalTca(true);
    } else if (type === 'tomorrow') {
      setShowAllPatients(false);
      setIsNewToday(false);
      setIsTotalTca(false);
      setFromDate(tomorrowStr);
      setToDate(tomorrowStr);
    }
  };

  const getCardStyle = (type) => {
    const isActive = activeCard === type;
    return {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '12px',
      border: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: isActive ? '0 10px 15px -3px rgba(59, 130, 246, 0.1)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      transform: isActive ? 'translateY(-2px)' : 'none'
    };
  };

  return (
    <div className="modern-dashboard">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Patient Dashboard</h1>
          <p style={{ color: '#64748b', margin: 0 }}>View and manage all registered patients and follow-ups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div 
          onClick={() => handleCardClick('total')}
          style={getCardStyle('total')}
        >
          <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '50%', color: '#3b82f6' }}>
            <User size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Total Patients</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{totalCount}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>All time registered</p>
          </div>
        </div>
        
        <div 
          onClick={() => handleCardClick('new')}
          style={getCardStyle('new')}
        >
          <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '50%', color: '#16a34a' }}>
            <User size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>New Today</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{todayCount}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>Registered today</p>
          </div>
        </div>

        <div 
          onClick={() => handleCardClick('tca')}
          style={getCardStyle('tca')}
        >
          <div style={{ backgroundColor: '#fdf4ff', padding: '1rem', borderRadius: '50%', color: '#d946ef' }}>
            <Calendar size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Total TCA</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{totalTcaCount}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>Patients with follow-ups</p>
          </div>
        </div>

        <div 
          onClick={() => handleCardClick('tomorrow')}
          style={getCardStyle('tomorrow')}
        >
          <div style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '50%', color: '#ef4444' }}>
            <Calendar size={24} />
          </div>
          <div>
            <p style={{ color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Tomorrow's TCA</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{tomorrowTcaCount}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>Scheduled for tomorrow</p>
          </div>
        </div>
      </div>


      {/* Filters */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2" style={{ color: '#475569', fontWeight: 600 }}>
            <Filter size={18} /> Filters
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
              <input 
                type="checkbox" 
                checked={showAllPatients}
                onChange={(e) => setShowAllPatients(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              Show All Patients (Ignore Dates)
            </label>
            <button 
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-200 hover:border-blue-200"
            >
              <RotateCcw size={14} /> Clear All
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Search Patient</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Name, Code or Phone..."
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 1rem 0 2.5rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Physician</label>
            <select 
              className="form-control" 
              value={physicianId} 
              onChange={(e) => setPhysicianId(e.target.value)}
              style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 1rem', backgroundColor: 'white', cursor: 'pointer' }}
            >
              <option value="">All Physicians</option>
              {physicians.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>TCA From Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)}
              disabled={showAllPatients}
              style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 1rem', backgroundColor: showAllPatients ? '#f1f5f9' : 'white', cursor: showAllPatients ? 'not-allowed' : 'pointer' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>TCA To Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)}
              disabled={showAllPatients}
              style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 1rem', backgroundColor: showAllPatients ? '#f1f5f9' : 'white', cursor: showAllPatients ? 'not-allowed' : 'pointer' }}
            />
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Recent Patients</h2>
        </div>
        <div className="table-responsive">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '0.875rem', borderBottom: '1px solid #e2e8f0' }}>Patient Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '0.875rem', borderBottom: '1px solid #e2e8f0' }}>Patient Code</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '0.875rem', borderBottom: '1px solid #e2e8f0' }}>Phone Number</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '0.875rem', borderBottom: '1px solid #e2e8f0' }}>Last Visit Date</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '0.875rem', borderBottom: '1px solid #e2e8f0' }}>TCA Date</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '0.875rem', borderBottom: '1px solid #e2e8f0' }}>Last Voucher #</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '0.875rem', borderBottom: '1px solid #e2e8f0' }}>Last Attending Physician</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '0.875rem', borderBottom: '1px solid #e2e8f0' }}>Clinical History</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No patients found for the selected criteria.</td>
                </tr>
              ) : (
                patients.map(p => {
                  let isTodayTca = false;
                  let isTomorrowTca = false;
                  let isPastTca = false;
                  let tcaDateFormatted = '-';

                  if (p.tca_date) {
                    const tcaDateObj = new Date(p.tca_date);
                    tcaDateFormatted = tcaDateObj.toLocaleDateString();
                    
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    
                    isTodayTca = tcaDateObj.getTime() === today.getTime();
                    isTomorrowTca = tcaDateObj.getTime() === tomorrow.getTime();
                    isPastTca = tcaDateObj.getTime() < today.getTime();
                  }

                  return (
                    <tr key={p.patient_id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50 transition-colors">
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#1e293b' }}>{p.patient_name}</td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>{p.patient_code}</td>
                      <td style={{ padding: '1rem', color: '#64748b' }}>{p.phone_number || '-'}</td>
                      
                      <td style={{ padding: '1rem', color: '#475569', fontSize: '0.875rem' }}>
                         {p.last_visit_date ? new Date(p.last_visit_date).toLocaleDateString() : 'No visits'}
                      </td>
                      
                      <td style={{ padding: '1rem' }}>
                        {!p.tca_date ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>-</span>
                        ) : isTodayTca ? (
                          <span style={{ 
                            fontWeight: 800, 
                            color: '#b91c1c',
                            backgroundColor: '#fef2f2',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: '1px solid #fca5a5'
                          }}>
                            <AlertCircle size={14} color="#dc2626" />
                            TCA Today
                          </span>
                        ) : isTomorrowTca ? (
                          <span style={{ 
                            fontWeight: 700, 
                            color: '#b45309',
                            backgroundColor: '#fef3c7',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Star size={14} fill="#f59e0b" color="#f59e0b" />
                            TCA Tomorrow
                          </span>
                        ) : isPastTca ? (
                          <span style={{ 
                            fontWeight: 600, 
                            color: '#b91c1c',
                            backgroundColor: '#fee2e2',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.875rem'
                          }}>
                            {tcaDateFormatted} (Overdue)
                          </span>
                        ) : (
                          <span style={{ 
                            fontWeight: 600, 
                            color: '#047857',
                            backgroundColor: '#d1fae5',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.875rem'
                          }}>
                            {tcaDateFormatted}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                        {p.voucher_number || '-'}
                      </td>
                      <td style={{ padding: '1rem', color: '#6366f1', fontWeight: 500 }}>
                        {p.physician_name || '-'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button 
                          onClick={() => {
                            setSelectedPatientForModal({ patient_id: p.patient_id, patient_name: p.patient_name });
                            setIsClinicalModalOpen(true);
                          }}
                          style={{
                            background: '#eef2ff', color: '#4f46e5', border: 'none',
                            padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          title="View Clinical Details"
                        >
                          <FileText size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Load More Button */}
        {!loading && hasMore && (
          <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
            <button 
              onClick={handleLoadMore}
              style={{
                backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1',
                padding: '0.5rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
            >
              Load More Patients
            </button>
          </div>
        )}
      </div>
      
      <PatientClinicalModal 
        isOpen={isClinicalModalOpen} 
        onClose={() => setIsClinicalModalOpen(false)} 
        patient={selectedPatientForModal} 
        apiBase={API_BASE} 
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .flex { display: flex; }
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        @media (min-width: 768px) {
          .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        .gap-2 { gap: 0.5rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-8 { margin-bottom: 2rem; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .hover\\:bg-slate-50:hover { background-color: #f8fafc; }
        .transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
      `}} />
    </div>
  );
}
