import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, FlaskConical, Calendar, User, Hash, MapPin, 
  Activity, Upload, CheckCircle2, 
  Clock, Send, Eye, X, Filter, CheckSquare, 
  MoreVertical, Download, ExternalLink, RefreshCw, AlertCircle,
  ClipboardList, Database, ChevronLeft, ChevronRight, Info
} from 'lucide-react';

import apiRequest from '../../utils/api';
import { UPLOAD_BASE } from '../../config';

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: '#d1fae5',
    error: '#fee2e2',
    info: '#e0f2fe'
  };
  const textColors = {
    success: '#065f46',
    error: '#991b1b',
    info: '#075985'
  };
  
  const icons = {
    success: <CheckCircle2 size={18} color="#059669" />,
    error: <AlertCircle size={18} color="#dc2626" />,
    info: <Info size={18} color="#0284c7" />
  };

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
      backgroundColor: bgColors[type], color: textColors[type],
      padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      display: 'flex', alignItems: 'center', gap: '1rem', border: `1px solid ${textColors[type]}33`
    }}>
      {icons[type]}
      <span style={{ fontWeight: 500 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textColors[type], marginLeft: '0.5rem' }}>
        <X size={16} />
      </button>
    </div>
  );
};

export default function LaboratoryManagement() {
  const [viewMode, setViewMode] = useState('investigations'); // 'investigations' or 'labs'
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'sent', 'completed'
  const [laboratories, setLaboratories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLab, setSelectedLab] = useState(null);
  const [investigations, setInvestigations] = useState([]);
  const [loadingInvs, setLoadingInvs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Advanced filters
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterLabId, setFilterLabId] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchLaboratories();
    fetchAllInvestigations();
  }, []);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchLaboratories = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/master-data/laboratories?limit=100');
      const result = await res.json();
      setLaboratories(result.data || []);
    } catch (error) {
      addNotification('Failed to fetch laboratories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllInvestigations = async () => {
    setLoadingInvs(true);
    try {
      const res = await apiRequest('/investigations');
      const data = await res.json();
      setInvestigations(data || []);
    } catch (error) {
      addNotification('Failed to fetch investigations', 'error');
    } finally {
      setLoadingInvs(false);
    }
  };

  const fetchLabInvestigations = async (labId) => {
    setLoadingInvs(true);
    try {
      const res = await apiRequest(`/laboratories/${labId}/investigations`);
      const data = await res.json();
      setInvestigations(data || []);
    } catch (error) {
      addNotification('Failed to fetch laboratory investigations', 'error');
    } finally {
      setLoadingInvs(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await apiRequest(`/investigations/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        addNotification(`Investigation marked as ${newStatus.toLowerCase()}`, 'success');
        fetchAllInvestigations();
      }
    } catch (error) {
      addNotification('Failed to update status', 'error');
    }
  };

  const handleBatchStatusUpdate = async (newStatus) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await apiRequest('/investigations/batch/status', {
        method: 'PUT',
        body: JSON.stringify({ ids: selectedIds, status: newStatus })
      });
      if (res.ok) {
        addNotification(`Processed ${selectedIds.length} items successfully`, 'success');
        setSelectedIds([]);
        fetchAllInvestigations();
      }
    } catch (error) {
      addNotification('Batch update failed', 'error');
    }
  };

  const handleFileUpload = async (id, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiRequest(`/investigations/${id}/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        addNotification('Report uploaded successfully', 'success');
        fetchAllInvestigations();
      } else {
        addNotification('Upload failed. Please try again.', 'error');
      }
    } catch (error) {
      addNotification('Error uploading file', 'error');
    }
  };

  const handleDownload = async (filePath, originalName) => {
    try {
      const res = await fetch(`${UPLOAD_BASE}/${filePath}`);
      if (!res.ok) throw new Error('Network response was not ok');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = originalName || filePath.split('/').pop();
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      addNotification('Failed to download file', 'error');
    }
  };

  const handleLabClick = (lab) => {
    setSelectedLab(lab);
    fetchLabInvestigations(lab.id);
    setViewMode('investigations');
  };

  const handleBack = () => {
    setSelectedLab(null);
    fetchAllInvestigations();
  };

  const toggleSelectAll = (filteredInvs) => {
    const allFilteredSelected = filteredInvs.length > 0 && filteredInvs.every(inv => selectedIds.includes(inv.id));
    if (allFilteredSelected) {
      const filteredIds = filteredInvs.map(inv => inv.id);
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = filteredInvs.map(inv => inv.id);
      setSelectedIds(prev => {
        const next = [...prev];
        filteredIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredInvestigations = useMemo(() => {
    let filtered = investigations;
    
    // Tab filtering
    if (activeTab === 'pending') {
      filtered = filtered.filter(inv => inv.status === 'PENDING' || !inv.status);
    } else if (activeTab === 'sent') {
      filtered = filtered.filter(inv => inv.status === 'SENT');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(inv => inv.status === 'COMPLETED');
    }

    // Search filtering
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.laboratory_name?.toLowerCase().includes(q) ||
        inv.patient_name?.toLowerCase().includes(q) ||
        inv.patient_code?.toLowerCase().includes(q) ||
        inv.voucher_number?.toLowerCase().includes(q) ||
        inv.name?.toLowerCase().includes(q)
      );
    }

    // Lab ID Filter
    if (filterLabId !== 'all') {
      filtered = filtered.filter(inv => String(inv.laboratory_id) === String(filterLabId));
    }

    // Date Filters
    if (filterDateStart) {
      const startDate = new Date(filterDateStart);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.voucher_date);
        invDate.setHours(0, 0, 0, 0);
        return invDate >= startDate;
      });
    }
    if (filterDateEnd) {
      const endDate = new Date(filterDateEnd);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.voucher_date);
        return invDate <= endDate;
      });
    }

    // If a lab is selected, further filter
    if (selectedLab) {
      filtered = filtered.filter(inv => inv.laboratory_id === selectedLab.id);
    }

    return filtered;
  }, [investigations, activeTab, searchQuery, selectedLab, filterDateStart, filterDateEnd, filterLabId]);

  const stats = useMemo(() => {
    return {
      pending: investigations.filter(inv => inv.status === 'PENDING' || !inv.status).length,
      sent: investigations.filter(inv => inv.status === 'SENT').length,
      completed: investigations.filter(inv => inv.status === 'COMPLETED').length
    };
  }, [investigations]);

  const paginatedInvestigations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInvestigations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInvestigations, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredInvestigations.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterLabId, filterDateStart, filterDateEnd, selectedLab]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
      case null:
      case undefined:
        return <span className="status-badge" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>Pending</span>;
      case 'SENT':
        return <span className="status-badge" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>Sent</span>;
      case 'COMPLETED':
        return <span className="status-badge status-completed">Completed</span>;
      default:
        return <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>{status}</span>;
    }
  };

  return (
    <div>
      {/* Notifications */}
      {notifications.map(n => (
        <Notification key={n.id} {...n} onClose={() => removeNotification(n.id)} />
      ))}

      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {selectedLab && (
              <button 
                onClick={handleBack}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <ChevronLeft size={24} color="#64748b" />
              </button>
            )}
            Laboratory Management {selectedLab ? `- ${selectedLab.name}` : ''}
          </h1>
        </div>
        <div className="header-actions">
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
            <button 
              className="btn" 
              style={{ 
                backgroundColor: viewMode === 'investigations' && !selectedLab ? '#fff' : 'transparent', 
                color: viewMode === 'investigations' && !selectedLab ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'investigations' && !selectedLab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
              onClick={() => { setViewMode('investigations'); setSelectedLab(null); }}
            >
              <ClipboardList size={16} /> Investigations
            </button>
            <button 
              className="btn" 
              style={{ 
                backgroundColor: viewMode === 'labs' ? '#fff' : 'transparent', 
                color: viewMode === 'labs' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'labs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
              onClick={() => setViewMode('labs')}
            >
              <Database size={16} /> By Lab
            </button>
          </div>
          <button className="btn btn-outline" onClick={() => { fetchLaboratories(); fetchAllInvestigations(); addNotification('Data refreshed', 'info'); }}>
            <RefreshCw size={16} className={loading || loadingInvs ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      {!selectedLab && viewMode === 'investigations' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '12px', color: '#d97706' }}><Clock size={24} /></div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Pending</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.pending}</div>
            </div>
          </div>
          <div className="card" style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#dbeafe', borderRadius: '12px', color: '#2563eb' }}><Send size={24} /></div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Sent to Labs</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.sent}</div>
            </div>
          </div>
          <div className="card" style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#d1fae5', borderRadius: '12px', color: '#059669' }}><CheckCircle2 size={24} /></div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Completed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.completed}</div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'labs' && !selectedLab ? (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Lab Partners</h2>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Search size={16} color="#64748b" style={{ marginRight: '0.5rem' }} />
              <input 
                type="text" 
                placeholder="Search labs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none' }}
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {laboratories.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase())).map((lab) => {
              const pendingCount = investigations.filter(inv => String(inv.laboratory_id) === String(lab.id) && (inv.status === 'PENDING' || !inv.status)).length;
              
              return (
                <div key={lab.id} onClick={() => handleLabClick(lab)} className="card" style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '8px', color: '#475569' }}>
                      <FlaskConical size={24} />
                    </div>
                    {pendingCount > 0 && (
                      <span className="status-badge" style={{ backgroundColor: '#fef3c7', color: '#d97706', fontSize: '0.7rem' }}>{pendingCount} Pending</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#0f172a' }}>{lab.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <User size={14} /> {lab.contact_person || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                    <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lab.address || 'No address'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
                <button className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => { setActiveTab('pending'); setSelectedIds([]); }}>
                  <Clock size={16} /> Pending Queue
                </button>
                <button className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`} onClick={() => { setActiveTab('sent'); setSelectedIds([]); }}>
                  <Send size={16} /> Sent to Lab
                </button>
                <button className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => { setActiveTab('completed'); setSelectedIds([]); }}>
                  <CheckCircle2 size={16} /> Completed
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Search size={16} color="#64748b" style={{ marginRight: '0.5rem' }} />
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none' }}
                  />
                </div>
                <button className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowFilters(!showFilters)}>
                  <Filter size={16} /> Filters
                </button>
              </div>
            </div>

            {showFilters && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Laboratory</label>
                  <select className="form-control" value={filterLabId} onChange={(e) => setFilterLabId(e.target.value)} style={{ padding: '0.5rem' }}>
                    <option value="all">All Labs</option>
                    {laboratories.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>From Date</label>
                  <input type="date" className="form-control" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} style={{ padding: '0.5rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>To Date</label>
                  <input type="date" className="form-control" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} style={{ padding: '0.5rem' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => { setFilterLabId('all'); setFilterDateStart(''); setFilterDateEnd(''); setSearchQuery(''); }}>
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedIds.length > 0 && activeTab === 'pending' && (
            <div style={{ padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #bae6fd' }}>
              <span style={{ color: '#0369a1', fontWeight: 500 }}>{selectedIds.length} items selected for batch shipment</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" onClick={() => setSelectedIds([])} style={{ backgroundColor: '#fff' }}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleBatchStatusUpdate('SENT')}><Send size={16} /> Mark as Sent</button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="table-responsive">
              {loadingInvs ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading investigations...</div>
              ) : filteredInvestigations.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <ClipboardList size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                  <p>No investigations found matching your criteria.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      {activeTab === 'pending' && (
                        <th style={{ width: '40px' }}>
                          <input 
                            type="checkbox" 
                            checked={filteredInvestigations.length > 0 && filteredInvestigations.every(inv => selectedIds.includes(inv.id))}
                            onChange={() => toggleSelectAll(filteredInvestigations)}
                            style={{ cursor: 'pointer' }}
                          />
                        </th>
                      )}
                      <th>Laboratory</th>
                      <th>Date / Voucher</th>
                      <th>Patient</th>
                      <th>Investigation</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInvestigations.map((inv) => (
                      <tr key={inv.id} style={{ backgroundColor: selectedIds.includes(inv.id) ? '#f8fafc' : 'transparent' }}>
                        {activeTab === 'pending' && (
                          <td>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(inv.id)}
                              onChange={() => toggleSelect(inv.id)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                        )}
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.laboratory_name || 'Generic Lab'}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.875rem' }}>{new Date(inv.voucher_date).toLocaleDateString()}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>#{inv.voucher_number}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{inv.patient_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{inv.patient_code}</div>
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem', color: '#334155' }}>
                            <Activity size={14} color="#2563eb" /> {inv.name}
                          </div>
                        </td>
                        <td>{getStatusBadge(inv.status)}</td>
                        <td>
                          <div className="actions" style={{ justifyContent: 'flex-end' }}>
                            {activeTab === 'pending' && (
                              <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleStatusUpdate(inv.id, 'SENT')}>
                                <Send size={14} /> Send
                              </button>
                            )}
                            {activeTab === 'sent' && (
                              <label className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', color: '#059669', borderColor: '#059669' }}>
                                <Upload size={14} /> Result
                                <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(inv.id, e.target.files[0])} />
                              </label>
                            )}
                            {activeTab === 'completed' && inv.result_file_path && (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => handleDownload(inv.result_file_path, inv.result_file_path.split('/').pop())}
                              >
                                <Download size={14} /> Download
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="page-summary">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredInvestigations.length)} of {filteredInvestigations.length} entries
                  </div>
                  <div className="pagination-controls">
                    <button className="btn btn-outline" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <span className="page-info">Page {currentPage} of {totalPages}</span>
                    <button className="btn btn-outline" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

