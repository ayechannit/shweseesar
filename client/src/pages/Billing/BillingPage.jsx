import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, User, DollarSign, Eye, Printer, Filter, X, RotateCcw, Hash, Stethoscope, Edit3, Trash2, MoreVertical } from 'lucide-react';
import VoucherEntry from './VoucherEntry';
import apiRequest from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

import { API_BASE } from '../../config';

export default function BillingPage() {
  const { user, hasPermission } = useAuth();
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [editVoucherId, setEditVoucherId] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printSettings, setPrintSettings] = useState(null);
  
  // Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

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
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
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
        setIsViewModalOpen(true);

        // Give React time to render the modal and the printable content
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
            
            // Add the content and basic styles to the iframe
            doc.open();
            doc.write(`
              <html>
                <head>
                  <title>Print Voucher - \${data.voucher_number}</title>
                  <style>
                    body { 
                      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                      margin: 0;
                      padding: 0;
                      color: #0f172a;
                    }
                    @page { 
                      margin: \${printSettings?.margin_top || '10px'} \${printSettings?.margin_right || '10px'} \${printSettings?.margin_bottom || '10px'} \${printSettings?.margin_left || '10px'}; 
                    }
                    #printable-voucher { 
                      width: \${printSettings?.width || '100%'}; 
                      margin: 0 auto;
                      background: white;
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
                      background-color: #d1fae5;
                      color: #059669;
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
                    \${printContent.innerHTML}
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
                className={`btn \${showFilters ? 'btn-primary' : 'btn-outline'}`} 
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
          {isViewModalOpen && selectedVoucher && (
            <div className="modal-overlay">
              <div className="modal" style={{ maxWidth: '800px', width: '90%' }}>
                <div className="modal-header">
                  <h2 className="modal-title">Voucher Details: {selectedVoucher.voucher_number}</h2>
                  <button className="close-btn" onClick={closeViewModal}><X size={24} /></button>
                </div>
                
                {/* Scrollable Container */}
                <div style={{ maxHeight: '75vh', overflowY: 'auto', padding: '1.5rem' }}>
                  
                  {/* Printable Area Wrapper */}
                  <div id="printable-voucher" style={{ backgroundColor: 'white', width: printSettings?.width || '100%', minHeight: printSettings?.height || 'auto', margin: '0 auto' }}>
                    <div style={{ marginBottom: '2rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {printSettings?.icon_path && (
                          <img src={`\${API_BASE.replace('/api', '')}/uploads/\${printSettings.icon_path}`} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                        )}
                        <div>
                          {printSettings?.address && printSettings.address.includes('\n') ? (
                            <>
                              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>{printSettings.address.split('\n')[0]}</h1>
                              <p style={{ margin: 0, color: '#64748b', whiteSpace: 'pre-line', fontSize: '0.875rem' }}>
                                {printSettings.address.substring(printSettings.address.indexOf('\n') + 1)}
                              </p>
                            </>
                          ) : (
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>{printSettings?.address || 'Shwe See Sar Clinic'}</h1>
                          )}
                          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>Voucher Date: {new Date(selectedVoucher.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#2563eb' }}>{selectedVoucher.voucher_number}</h2>
                        <span className="status-badge status-completed" style={{ display: 'inline-block' }}>{selectedVoucher.payment_status}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.5rem' }}>Patient Information</h3>
                        <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '1.1rem' }}>{selectedVoucher.patient_name}</p>
                        <p style={{ margin: '0 0 0.25rem 0', color: '#475569' }}>Code: {selectedVoucher.patient_code}</p>
                        <p style={{ margin: 0, color: '#475569' }}>Phone: {selectedVoucher.patient_phone || 'N/A'}</p>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.5rem' }}>Payment Details</h3>
                        <p style={{ margin: '0 0 0.25rem 0', color: '#475569' }}>Method: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedVoucher.payment_method}</span></p>
                        <p style={{ margin: '0 0 0.25rem 0', color: '#475569' }}>Physician: <span style={{ fontWeight: 600, color: '#6366f1' }}>{selectedVoucher.physician_name || 'N/A'}</span></p>
                        {selectedVoucher.tca_date && (
                          <p style={{ margin: '0.25rem 0 0 0', color: '#2563eb', fontWeight: 700 }}>
                            TCA Date: {new Date(selectedVoucher.tca_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Items & Services</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                      <thead style={{ backgroundColor: '#f1f5f9' }}>
                        <tr>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#475569', fontSize: '0.875rem' }}>Description</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569', fontSize: '0.875rem' }}>Type</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569', fontSize: '0.875rem' }}>Qty</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>Price</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVoucher.items?.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '1rem', fontWeight: 500 }}>
                              {item.name}
                              {item.laboratory_name && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Lab: {item.laboratory_name}</div>
                              )}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                              <span style={{ backgroundColor: '#f8fafc', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{item.item_type}</span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat(item.unit_price).toLocaleString()}</td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>{parseFloat(item.subtotal).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                      <div style={{ width: '300px', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#475569' }}>
                          <span>Subtotal:</span>
                          <span style={{ fontWeight: 600 }}>{parseFloat(selectedVoucher.total_amount).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#ef4444' }}>
                          <span>Discount:</span>
                          <span style={{ fontWeight: 600 }}>- {parseFloat(selectedVoucher.discount_amount).toLocaleString()}</span>
                        </div>
                        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>
                          <span>Net Total:</span>
                          <span>{parseFloat(selectedVoucher.net_amount).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {selectedVoucher.notes && (
                      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', color: '#92400e' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700 }}>Notes</h4>
                        <p style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{selectedVoucher.notes}</p>
                      </div>
                    )}
                    
                    {printSettings?.description && (
                      <div style={{ marginTop: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.875rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', whiteSpace: 'pre-line' }}>
                        {printSettings.description}
                      </div>
                    )}
                  </div>
                  {/* End Printable Area */}
                  
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
          )}
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

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown { 
          from { transform: translateY(-10px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
      `}} />
    </div>
  );
}
