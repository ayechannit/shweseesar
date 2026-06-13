import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, User, DollarSign, Eye, Printer, Filter, X, RotateCcw, Hash, Stethoscope, Edit3, Trash2, MoreVertical } from 'lucide-react';
import VoucherEntry from './VoucherEntry';
import apiRequest from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

import { API_BASE } from '../../config';

// Helper to auto-detect and format raw numbers as millimeters (mm)
const formatWithUnit = (val) => {
  if (!val) return '';
  const trimmed = val.toString().trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}mm`; // Default raw numbers to millimeters!
  }
  return trimmed;
};

// Helper to check if the configured print width is a narrow/receipt format
const isNarrowWidth = (width) => {
  if (!width) return false;
  const formatted = formatWithUnit(width);
  const w = formatted.toLowerCase().trim();
  if (w === '100%') return false;
  
  const num = parseFloat(w);
  if (isNaN(num)) return false;
  
  if (w.endsWith('mm')) return num < 120; // e.g. 58mm or 80mm
  if (w.endsWith('in')) return num < 5;    // e.g. 3in or 4in
  if (w.endsWith('px')) return num < 450;  // e.g. 300px
  
  return false;
};

export default function BillingPage() {
  const { hasPermission } = useAuth();
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [editVoucherId, setEditVoucherId] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printSettings, setPrintSettings] = useState(null);
  
  // Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'preview'

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    voucherno: '',
    fromdate: '',
    todate: '',
    patientcode: '',
    patientname: '',
    physician: ''
  });

  useEffect(() => {
    fetchPrintSettings();
  }, []);

  const fetchPrintSettings = async () => {
    try {
      const res = await apiRequest('/settings/voucher');
      if (res && res.ok) {
        const data = await res.json();
        setPrintSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch print settings', err);
    }
  };

  useEffect(() => {
    if (view === 'list') {
      fetchVouchers();
    }
  }, [view, page]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
      });
      const res = await apiRequest(`/billing/vouchers?${queryParams.toString()}`);
      if (res && res.ok) {
        const result = await res.json();
        setVouchers(result.data || []);
        setTotalPages(result.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id) => {
    try {
      const res = await apiRequest(`/billing/vouchers/${id}`);
      if (res && res.ok) {
        const data = await res.json();
        setSelectedVoucher(data);
        setActiveTab('details');
        setIsViewModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to fetch voucher details');
    }
  };

  const handlePrint = async (id) => {
    try {
      const res = await apiRequest(`/billing/vouchers/${id}`);
      if (res && res.ok) {
        const data = await res.json();
        setSelectedVoucher(data);

        // Give React time to render the background/hidden printable content
        setTimeout(() => {
          const printContent = document.getElementById('printable-voucher');
          if (printContent) {
            // Create a hidden iframe for printing
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow.document;
            
            const rawWidth = printSettings?.width || '100%';
            const configuredWidth = formatWithUnit(rawWidth);
            const lowerWidth = configuredWidth.toLowerCase().trim();
            
            let pageSizeCSS = 'auto';
            if (lowerWidth === '210mm' || lowerWidth === 'a4') {
              pageSizeCSS = 'A4';
            } else if (lowerWidth === '297mm') {
              pageSizeCSS = 'A4 landscape';
            } else if (lowerWidth === '8.5in' || lowerWidth === 'letter') {
              pageSizeCSS = 'letter';
            } else if (lowerWidth === '11in') {
              pageSizeCSS = 'letter landscape';
            } else if (configuredWidth && configuredWidth !== '100%') {
              pageSizeCSS = `${configuredWidth} auto`;
            }

            const elementWidthCSS = (lowerWidth === '210mm' || lowerWidth === 'a4' || lowerWidth === '8.5in' || lowerWidth === 'letter' || lowerWidth === '100%') 
              ? '100%' 
              : configuredWidth;

            // Add the content and basic styles to the iframe
            doc.open();
            doc.write(`
              <html>
                <head>
                  <title>Print Voucher - ${data.voucher_number}</title>
                  <style>
                    body { 
                      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                      margin: 0;
                      padding: 0;
                      color: #0f172a;
                    }
                    @page { 
                      size: ${pageSizeCSS};
                      margin: 0; 
                    }
                    #printable-voucher { 
                      width: ${elementWidthCSS}; 
                      max-width: 100%;
                      margin: 0 auto;
                      background: white;
                      box-sizing: border-box;
                      padding-top: ${printSettings?.margin_top || '10px'};
                      padding-right: ${printSettings?.margin_right || '10px'};
                      padding-bottom: ${printSettings?.margin_bottom || '10px'};
                      padding-left: ${printSettings?.margin_left || '10px'};
                    }
                    .status-badge {
                      display: inline-block;
                      padding: 0.25rem 0.5rem;
                      border-radius: 9999px;
                      font-size: 0.75rem;
                      font-weight: 600;
                      text-transform: uppercase;
                    }
                    .status-completed {
                      background-color: #ffffff;
                      border: 1px solid #0f172a;
                      color: #0f172a;
                    }
                    img {
                      filter: grayscale(100%) !important;
                    }
                    table {
                      width: 100%;
                      border-collapse: collapse;
                    }
                    th, td {
                      text-align: left;
                    }
                  </style>
                </head>
                <body>
                  <div id="printable-voucher">
                    ${printContent.innerHTML}
                  </div>
                </body>
              </html>
            `);
            doc.close();

            // Wait for the iframe to fully load before printing
            setTimeout(() => {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
              // Remove the iframe after printing
              setTimeout(() => {
                document.body.removeChild(iframe);
              }, 1000);
            }, 500);
          }
        }, 600);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to fetch voucher for printing');
    }
  };

  const handleVoucherCreated = async (id) => {
    setView('list');
    setEditVoucherId(null);
    setPage(1);
    await fetchVouchers();
    setTimeout(() => {
      handleView(id);
    }, 300);
  };

  const handleEdit = (id) => {
    setEditVoucherId(id);
    setView('create');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you absolutely sure you want to delete/void this voucher? This will permanently delete the billing record and completely restore all deducted stock balances.')) {
      try {
        const res = await apiRequest(`/billing/vouchers/${id}`, {
          method: 'DELETE'
        });
        if (res && res.ok) {
          alert('Voucher successfully deleted and stock levels restored!');
          await fetchVouchers();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to delete voucher');
        }
      } catch (err) {
        console.error(err);
        alert('Server error while deleting voucher');
      }
    }
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedVoucher(null);
    setActiveTab('details');
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterSearch = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchVouchers();
  };

  const handleFilterReset = () => {
    setFilters({
      voucherno: '',
      fromdate: '',
      todate: '',
      patientcode: '',
      patientname: '',
      physician: ''
    });
    setPage(1);
    setTimeout(() => fetchVouchers(), 0);
  };

  return (
    <div className="billing-page">
      {view === 'list' ? (
        <>
          <div className="page-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h1 className="page-title">Vouchers & Billing</h1>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '0.25rem' }}>View and manage clinic sales and billing records.</p>
            </div>
            <div className="flex gap-2">
              <button 
                className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`} 
                style={{ height: '38px', fontSize: '0.8125rem' }}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} /> {showFilters ? 'Hide Filters' : 'Filters'}
              </button>
              <button className="btn btn-primary" style={{ height: '38px', fontSize: '0.8125rem' }} onClick={() => setView('create')}>
                <Plus size={16} /> New Voucher
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <form onSubmit={handleFilterSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label className="form-label">Voucher Number</label>
                  <input
                    type="text"
                    name="voucherno"
                    className="form-control"
                    placeholder="Search #"
                    value={filters.voucherno}
                    onChange={handleFilterChange}
                  />
                </div>
                <div>
                  <label className="form-label">Patient Name</label>
                  <input
                    type="text"
                    name="patientname"
                    className="form-control"
                    placeholder="Search name"
                    value={filters.patientname}
                    onChange={handleFilterChange}
                  />
                </div>
                <div>
                  <label className="form-label">Patient Code</label>
                  <input
                    type="text"
                    name="patientcode"
                    className="form-control"
                    placeholder="Search code"
                    value={filters.patientcode}
                    onChange={handleFilterChange}
                  />
                </div>
                <div>
                  <label className="form-label">Physician</label>
                  <input
                    type="text"
                    name="physician"
                    className="form-control"
                    placeholder="Search doctor"
                    value={filters.physician}
                    onChange={handleFilterChange}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="form-label">Date Range</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="date"
                      name="fromdate"
                      className="form-control"
                      style={{ flex: 1 }}
                      value={filters.fromdate}
                      onChange={handleFilterChange}
                    />
                    <span style={{ color: '#cbd5e1' }}>-</span>
                    <input
                      type="date"
                      name="todate"
                      className="form-control"
                      style={{ flex: 1 }}
                      value={filters.todate}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1, height: '42px' }} onClick={handleFilterReset}>
                    <RotateCcw size={16} />
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, height: '42px' }}>
                    <Search size={18} /> Search
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Voucher #</th>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Physician</th>
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
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {v.patient_code} • {v.patient_age ? `${v.patient_age} Years` : 'Age N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: '#6366f1' }}>{v.physician_name || 'N/A'}</div>
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
                      <td style={{ textAlign: 'right', position: 'relative' }}>
                         <div className="action-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                           <button 
                             className="action-btn"
                             onClick={() => setActiveDropdownId(activeDropdownId === v.id ? null : v.id)}
                             style={{
                               padding: '0.35rem 0.6rem',
                               borderRadius: '0.375rem',
                               backgroundColor: '#f1f5f9',
                               border: '1px solid #cbd5e1',
                               cursor: 'pointer',
                               color: '#475569',
                               display: 'inline-flex',
                               alignItems: 'center',
                               justifyContent: 'center',
                               transition: 'all 0.15s'
                             }}
                           >
                             <MoreVertical size={16} />
                           </button>

                           {activeDropdownId === v.id && (
                             <div 
                               style={{
                                 position: 'absolute',
                                 right: 0,
                                 top: '110%',
                                 backgroundColor: 'white',
                                 borderRadius: '0.5rem',
                                 border: '1px solid #e2e8f0',
                                 boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                 zIndex: 100,
                                 minWidth: '140px',
                                 padding: '0.25rem',
                                 display: 'flex',
                                 flexDirection: 'column',
                                 gap: '0.125rem',
                                 textAlign: 'left'
                               }}
                             >
                               <button 
                                 className="dropdown-item" 
                                 onClick={() => { handleView(v.id); setActiveDropdownId(null); }}
                                 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', borderRadius: '0.375rem', width: '100%', textAlign: 'left' }}
                                 onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                 onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                               >
                                 <Eye size={14} color="#3b82f6" /> View Details
                               </button>

                               {hasPermission('edit_voucher') && (
                                 <button 
                                   className="dropdown-item" 
                                   onClick={() => { handleEdit(v.id); setActiveDropdownId(null); }}
                                   style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', borderRadius: '0.375rem', width: '100%', textAlign: 'left' }}
                                   onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                   onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                 >
                                   <Edit3 size={14} color="#d97706" /> Edit Voucher
                                 </button>
                               )}

                               <button 
                                 className="dropdown-item" 
                                 onClick={() => { handlePrint(v.id); setActiveDropdownId(null); }}
                                 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', borderRadius: '0.375rem', width: '100%', textAlign: 'left' }}
                                 onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                 onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                               >
                                 <Printer size={14} color="#64748b" /> Print Invoice
                               </button>

                               {hasPermission('delete_voucher') && (
                                 <>
                                   <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.25rem 0' }}></div>
                                   <button 
                                     className="dropdown-item" 
                                     onClick={() => { handleDelete(v.id); setActiveDropdownId(null); }}
                                     style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: 'none', background: '#fef2f2', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#ef4444', borderRadius: '0.375rem', width: '100%', textAlign: 'left' }}
                                     onMouseOver={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                     onMouseOut={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                   >
                                     <Trash2 size={14} color="#ef4444" /> Delete/Void
                                   </button>
                                 </>
                               )}
                             </div>
                           )}
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

          {/* View Voucher Modal */}
          {isViewModalOpen && selectedVoucher && (() => {
            const isNarrow = isNarrowWidth(printSettings?.width);
            return (
              <div className="modal-overlay">
                <div className="modal" style={{ maxWidth: '900px', width: '95%', padding: 0, overflow: 'hidden', borderRadius: '12px' }}>
                  <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: 0 }}>
                    <h2 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Voucher Details: {selectedVoucher.voucher_number}</h2>
                    <button className="close-btn" onClick={closeViewModal}><X size={24} /></button>
                  </div>
                  
                  {/* Scrollable Container */}
                  <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1.5rem', backgroundColor: '#ffffff' }}>
                    
                    {/* Voucher Screen Details (Fits the Screen Perfectly) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {/* Grid of Summary Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        
                        {/* Patient Card */}
                        <div style={{ 
                          backgroundColor: '#f8fafc', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          padding: '1.25rem',
                        }}>
                          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', margin: '0 0 0.75rem 0', letterSpacing: '0.05em' }}>
                            Patient Info
                          </h3>
                          <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '1.125rem', color: '#1e293b' }}>
                            {selectedVoucher.patient_name}
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 0.75rem', fontSize: '0.875rem', color: '#334155', marginTop: '0.5rem' }}>
                            <span style={{ fontWeight: 500, color: '#64748b' }}>Patient ID:</span>
                            <span style={{ fontWeight: 600 }}>{selectedVoucher.patient_code}</span>
                            
                            <span style={{ fontWeight: 500, color: '#64748b' }}>Phone:</span>
                            <span>{selectedVoucher.patient_phone || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Service Card */}
                        <div style={{ 
                          backgroundColor: '#f8fafc', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          padding: '1.25rem',
                        }}>
                          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', margin: '0 0 0.75rem 0', letterSpacing: '0.05em' }}>
                            Service & Metadata
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 0.75rem', fontSize: '0.875rem', color: '#334155' }}>
                            <span style={{ fontWeight: 500, color: '#64748b' }}>Physician:</span>
                            <span style={{ fontWeight: 600 }}>{selectedVoucher.physician_name || 'N/A'}</span>
                            
                            <span style={{ fontWeight: 500, color: '#64748b' }}>Method:</span>
                            <span style={{ fontWeight: 600 }}>{selectedVoucher.payment_method}</span>

                            <span style={{ fontWeight: 500, color: '#64748b' }}>Status:</span>
                            <div>
                              <span style={{ 
                                display: 'inline-block', 
                                padding: '0.15rem 0.5rem', 
                                backgroundColor: selectedVoucher.payment_status === 'COMPLETED' ? '#dcfce7' : '#fee2e2', 
                                border: `1px solid ${selectedVoucher.payment_status === 'COMPLETED' ? '#22c55e' : '#ef4444'}`, 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                color: selectedVoucher.payment_status === 'COMPLETED' ? '#15803d' : '#b91c1c'
                              }}>
                                {selectedVoucher.payment_status}
                              </span>
                            </div>

                            <span style={{ fontWeight: 500, color: '#64748b' }}>Invoice Date:</span>
                            <span>{new Date(selectedVoucher.created_at).toLocaleDateString()} {new Date(selectedVoucher.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            
                            {selectedVoucher.tca_date && (
                              <>
                                <span style={{ fontWeight: 500, color: '#64748b' }}>TCA Date:</span>
                                <span style={{ fontWeight: 700, color: '#2563eb' }}>{new Date(selectedVoucher.tca_date).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items Table Card */}
                      <div style={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px', 
                        overflow: 'hidden',
                      }}>
                        <div style={{ backgroundColor: '#f1f5f9', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
                          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                            Voucher Items & Services
                          </h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', width: '50px' }}>No.</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Description</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'center', width: '110px' }}>Type</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'right', width: '90px' }}>Qty</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'right', width: '130px' }}>Unit Price</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'right', width: '140px' }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedVoucher.items?.map((item, idx) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>{idx + 1}</td>
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{item.name}</div>
                                    {item.laboratory_name && (
                                      <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.125rem', fontWeight: 500 }}>Lab: {item.laboratory_name}</div>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                    <span style={{ 
                                      display: 'inline-block',
                                      padding: '2px 8px', 
                                      borderRadius: '4px', 
                                      fontSize: '0.75rem', 
                                      fontWeight: 600, 
                                      backgroundColor: '#f1f5f9',
                                      color: '#334155',
                                      border: '1px solid #cbd5e1'
                                    }}>
                                      {item.item_type}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{item.quantity}</td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>{parseFloat(item.unit_price).toLocaleString()}</td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{parseFloat(item.subtotal).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Bottom Summary and Referrals layout */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                        
                        {/* Left side: Notes and Referrals */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {/* Referrals Section */}
                          {selectedVoucher.referrals && selectedVoucher.referrals.length > 0 && (
                            <div style={{ 
                              backgroundColor: '#f0fdf4', 
                              border: '1px solid #bbf7d0', 
                              borderRadius: '8px', 
                              padding: '1.25rem',
                            }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.05em' }}>
                                Referral Payments
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {selectedVoucher.referrals.map(ref => (
                                  <div key={ref.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#14532d' }}>
                                    <span>{ref.referred_person_name} ({ref.item_name})</span>
                                    <span style={{ fontWeight: 600 }}>{parseFloat(ref.commission_amount).toLocaleString()} MMK</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {selectedVoucher.notes && (
                            <div style={{ 
                              backgroundColor: '#f8fafc', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '8px', 
                              padding: '1.25rem',
                            }}>
                              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>
                                Notes
                              </h4>
                              <p style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: '1.4', color: '#334155' }}>{selectedVoucher.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Right side: Financials Card */}
                        <div style={{ 
                          backgroundColor: '#f8fafc', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          padding: '1.25rem',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#475569', fontSize: '0.875rem' }}>
                            <span>Subtotal</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{parseFloat(selectedVoucher.total_amount).toLocaleString()} MMK</span>
                          </div>
                          {parseFloat(selectedVoucher.discount_amount) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#ef4444', fontSize: '0.875rem' }}>
                              <span>Discount</span>
                              <span style={{ fontWeight: 600 }}>- {parseFloat(selectedVoucher.discount_amount).toLocaleString()} MMK</span>
                            </div>
                          )}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            padding: '0.75rem 0', 
                            borderTop: '1.5px solid #cbd5e1', 
                            marginTop: '0.25rem', 
                            fontSize: '1.25rem', 
                            fontWeight: 800, 
                            color: '#0f172a' 
                          }}>
                            <span>Net Total</span>
                            <span style={{ color: '#2563eb' }}>{parseFloat(selectedVoucher.net_amount).toLocaleString()} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>MMK</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                  </div>

                  {/* Modal Footer Actions */}
                  <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', backgroundColor: '#f8fafc', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                    <button className="btn btn-outline" onClick={closeViewModal}>Close</button>
                    <button className="btn btn-primary" onClick={() => handlePrint(selectedVoucher.id)}>
                      <Printer size={18} style={{ marginRight: '0.5rem' }} /> Print Voucher
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <VoucherEntry 
          editVoucherId={editVoucherId}
          onSave={handleVoucherCreated}
          onCancel={() => {
            setView('list');
            setEditVoucherId(null);
          }}
        />
      )}

      {/* Hidden background printing container containing the actual #printable-voucher element */}
      <div style={{ display: 'none' }}>
        {selectedVoucher && (() => {
          const isNarrow = isNarrowWidth(printSettings?.width);
          return (
            <div id="printable-voucher" style={{ 
              backgroundColor: 'white', 
              width: formatWithUnit(printSettings?.width) || '100%', 
              minHeight: formatWithUnit(printSettings?.height) || 'auto', 
              paddingTop: printSettings?.margin_top || '10px',
              paddingRight: printSettings?.margin_right || '10px',
              paddingBottom: printSettings?.margin_bottom || '10px',
              paddingLeft: printSettings?.margin_left || '10px',
              boxSizing: 'border-box'
            }}>
              
              {/* Invoice Header Block - Clean compact layout without Logo, Clinic Name or Address */}
              <div style={{ 
                marginBottom: '0.4rem', 
                borderBottom: '2.5px solid #000000', 
                paddingBottom: '0.4rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-end'
              }}>
                <div>
                  <p style={{ margin: '0', color: '#000000', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice Date</p>
                  <p style={{ margin: '0', color: '#000000', fontSize: '0.85rem', fontWeight: 600 }}>{new Date(selectedVoucher.created_at).toLocaleDateString()} {new Date(selectedVoucher.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 0.125rem 0', color: '#000000', textTransform: 'uppercase', letterSpacing: '-0.025em' }}>INVOICE</h2>
                  <p style={{ margin: '0 0 0.25rem 0', color: '#000000', fontSize: '0.9rem', fontWeight: 700 }}># {selectedVoucher.voucher_number}</p>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '0.15rem 0.5rem', 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #000000', 
                    borderRadius: '4px', 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: '#000000' 
                  }}>
                    {selectedVoucher.payment_status}
                  </span>
                </div>
              </div>

              {/* Patient & Service Metadata - Compact spacing closer to header line */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '1.5rem', 
                marginBottom: '0.3rem',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <h3 style={{ width: '100%', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#000000', borderBottom: '1px solid #000000', paddingBottom: '0.25rem', margin: '0 0 0.4rem 0', letterSpacing: '0.05em' }}>Billed To</h3>
                  <p style={{ margin: '0 0 0.15rem 0', fontWeight: 700, fontSize: '0.95rem', color: '#000000' }}>{selectedVoucher.patient_name}</p>
                  <p style={{ margin: '0', color: '#000000', fontSize: '0.8rem' }}>Patient ID: <span style={{ fontWeight: 600 }}>{selectedVoucher.patient_code}</span></p>
                  {selectedVoucher.patient_phone && (
                    <p style={{ margin: '0.15rem 0 0 0', color: '#000000', fontSize: '0.8rem' }}>Phone: <span style={{ fontWeight: 500 }}>{selectedVoucher.patient_phone}</span></p>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <h3 style={{ width: '100%', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#000000', borderBottom: '1px solid #000000', paddingBottom: '0.25rem', margin: '0 0 0.4rem 0', letterSpacing: '0.05em' }}>Service Details</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '80px 1fr', 
                    gap: '0.15rem 0.35rem', 
                    fontSize: '0.8rem',
                    width: '100%'
                  }}>
                    <span style={{ color: '#000000' }}>Physician:</span>
                    <span style={{ fontWeight: 600, color: '#000000' }}>{selectedVoucher.physician_name || 'N/A'}</span>
                    
                    <span style={{ color: '#000000' }}>Method:</span>
                    <span style={{ fontWeight: 600, color: '#000000' }}>{selectedVoucher.payment_method}</span>
                    
                    {selectedVoucher.tca_date && (
                      <>
                        <span style={{ color: '#000000' }}>TCA Date:</span>
                        <span style={{ fontWeight: 700, color: '#000000' }}>{new Date(selectedVoucher.tca_date).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Table of Items - Highly compact for A5 fitment up to 15 items */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.2rem 0 0.3rem 0', textAlign: 'left', color: '#000000', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #000000', fontWeight: 700 }}>Description</th>
                    <th style={{ padding: '0.2rem 0 0.3rem 0', textAlign: 'center', color: '#000000', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #000000', fontWeight: 700, width: '70px' }}>Type</th>
                    <th style={{ padding: '0.2rem 0 0.3rem 0', textAlign: 'center', color: '#000000', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #000000', fontWeight: 700, width: '40px' }}>Qty</th>
                    <th style={{ padding: '0.2rem 0 0.3rem 0', textAlign: 'right', color: '#000000', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #000000', fontWeight: 700, width: '90px' }}>Price</th>
                    <th style={{ padding: '0.2rem 0 0.3rem 0', textAlign: 'right', color: '#000000', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #000000', fontWeight: 700, width: '100px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVoucher.items?.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1.5px solid #000000' }}>
                      <td style={{ padding: '0.2rem 0' }}>
                        <div style={{ fontWeight: 600, color: '#000000', fontSize: '0.72rem', lineHeight: '1.2' }}>{item.name}</div>
                        {item.laboratory_name && (
                          <div style={{ fontSize: '0.62rem', color: '#475569', marginTop: '0.05rem' }}>Lab: {item.laboratory_name}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.2rem 0', textAlign: 'center' }}>
                        <span style={{ border: '1px solid #000000', padding: '1px 4px', borderRadius: '3px', fontSize: '0.58rem', fontWeight: 600, color: '#000000', textTransform: 'uppercase' }}>{item.item_type}</span>
                      </td>
                      <td style={{ padding: '0.2rem 0', textAlign: 'center', fontWeight: 600, color: '#000000', fontSize: '0.72rem' }}>{item.quantity}</td>
                      <td style={{ padding: '0.2rem 0', textAlign: 'right', color: '#000000', fontSize: '0.72rem' }}>{parseFloat(item.unit_price).toLocaleString()}</td>
                      <td style={{ padding: '0.2rem 0', textAlign: 'right', fontWeight: 700, color: '#000000', fontSize: '0.72rem' }}>{parseFloat(item.subtotal).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <div style={{ width: '100%', maxWidth: '240px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#000000', fontSize: '0.8rem' }}>
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 600, color: '#000000' }}>{parseFloat(selectedVoucher.total_amount).toLocaleString()}</span>
                  </div>
                  {parseFloat(selectedVoucher.discount_amount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#000000', fontSize: '0.8rem' }}>
                      <span>Discount</span>
                      <span style={{ fontWeight: 600 }}>- {parseFloat(selectedVoucher.discount_amount).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '0.4rem 0', 
                    borderTop: '1px solid #000000', 
                    borderBottom: '3px double #000000', 
                    marginTop: '0.15rem', 
                    fontSize: '1rem', 
                    fontWeight: 800, 
                    color: '#000000' 
                  }}>
                    <span>Net Total</span>
                    <span>{parseFloat(selectedVoucher.net_amount).toLocaleString()} <span style={{ fontSize: '0.7rem', color: '#000000', fontWeight: 600 }}>MMK</span></span>
                  </div>
                </div>
              </div>

              {/* Notes Box */}
              {selectedVoucher.notes && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#ffffff', border: '1px solid #000000', borderRadius: '4px', color: '#000000' }}>
                  <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>{selectedVoucher.notes}</p>
                </div>
              )}
              
              {/* Footer Description */}
              {printSettings?.description && (
                <div style={{ marginTop: '1rem', textAlign: 'center', color: '#000000', fontSize: '0.75rem', borderTop: '1px dashed #000000', paddingTop: '0.5rem', whiteSpace: 'pre-line', lineHeight: '1.3' }}>
                  {printSettings.description}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown { 
          from { transform: translateY(-10px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
      `}} />
    </div>
  );
}
