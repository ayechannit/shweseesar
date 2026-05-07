import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Edit2, Save, X, Search, Filter, ArrowUpDown, ChevronDown, CheckCircle2, AlertCircle, Plus, FileSpreadsheet } from 'lucide-react';

import { API_BASE } from '../../config';

export default function PricingManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // Notification state
  const [notification, setNotification] = useState(null);
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '', item_code: '', subcategory_id: '', unit: 'Tab',
    default_purchase_price: 0, default_sale_price: 0, pricing_method: 'MANUAL', markup_percentage: 0
  });

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const fileInputRef = useRef(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/pricing/items?page=${page}&limit=${limit}`;
      if (selectedCategory) url += `&category_id=${selectedCategory}`;
      
      const res = await fetch(url);
      const result = await res.json();
      setItems(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch items', err);
      showNotification('Failed to load pricing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/master-data/item_categories?limit=100`);
      const result = await res.json();
      setCategories(result.data || []);
      
      // Also fetch all subcategories for the create modal
      const subRes = await fetch(`${API_BASE}/master-data/item_subcategories?limit=200`);
      const subResult = await subRes.json();
      setSubcategories(subResult.data || []);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setPage(1); // Reset to first page when category changes
  }, [selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [selectedCategory, page]);

  const handleExport = () => {
    window.location.href = `${API_BASE}/pricing/export`;
    showNotification('Exporting pricing data...');
  };

  const handleDownloadSample = () => {
    window.location.href = `${API_BASE}/pricing/sample`;
    showNotification('Downloading sample CSV...');
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/pricing/import`, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        showNotification(`Import complete! Success: ${result.success}, Failed: ${result.failed}`);
        fetchData();
      } else {
        showNotification(result.error || 'Import failed', 'error');
      }
    } catch (err) {
      console.error('Import error', err);
      showNotification('Import failed', 'error');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/stock/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemForm)
      });
      if (res.ok) {
        showNotification('Item created successfully');
        setIsCreateModalOpen(false);
        setNewItemForm({
          name: '', item_code: '', subcategory_id: '', unit: 'Tab',
          default_purchase_price: 0, default_sale_price: 0, pricing_method: 'MANUAL', markup_percentage: 0
        });
        fetchData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to create item', 'error');
      }
    } catch (err) {
      showNotification('Server error', 'error');
    }
  };

  const handleNewItemChange = (field, value) => {
    let updatedForm = { ...newItemForm, [field]: value };
    if (updatedForm.pricing_method === 'MARKUP_PERCENT' && (field === 'default_purchase_price' || field === 'markup_percentage' || field === 'pricing_method')) {
      const purchasePrice = parseFloat(updatedForm.default_purchase_price) || 0;
      const markup = parseFloat(updatedForm.markup_percentage) || 0;
      updatedForm.default_sale_price = (purchasePrice + (purchasePrice * (markup / 100))).toFixed(2);
    }
    setNewItemForm(updatedForm);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      default_purchase_price: item.default_purchase_price || 0,
      default_sale_price: item.default_sale_price || 0,
      pricing_method: item.pricing_method || 'MANUAL',
      markup_percentage: item.markup_percentage || 0
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/pricing/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditingId(null);
        showNotification('Pricing updated successfully');
        fetchData();
      } else {
        const error = await res.json();
        showNotification(error.error || 'Update failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Update failed', 'error');
    }
  };

  const handleEditChange = (field, value) => {
    let updatedForm = { ...editForm, [field]: value };
    
    if (updatedForm.pricing_method === 'MARKUP_PERCENT') {
      const purchasePrice = parseFloat(updatedForm.default_purchase_price) || 0;
      const markup = parseFloat(updatedForm.markup_percentage) || 0;
      updatedForm.default_sale_price = (purchasePrice + (purchasePrice * (markup / 100))).toFixed(2);
    }
    
    setEditForm(updatedForm);
  };

  const filteredItems = items.filter(item => 
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.item_code && item.item_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="pricing-page">
      
      {/* Notifications */}
      {notification && (
        <div className={`notification ${notification.type}`} style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 1100,
          padding: '1rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem',
          backgroundColor: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: notification.type === 'error' ? '#991b1b' : '#166534',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          borderLeft: `4px solid ${notification.type === 'error' ? '#ef4444' : '#22c55e'}`,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span style={{ fontWeight: 500 }}>{notification.message}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Pharmacy Pricing Management</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Configure purchase costs, selling prices, and automatic markup rules.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleDownloadSample} style={{ backgroundColor: 'white' }}>
            <FileSpreadsheet size={18} />
            <span>Sample CSV</span>
          </button>

          <button className="btn btn-outline" onClick={handleExport} style={{ backgroundColor: 'white' }}>
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          
          <input 
            type="file" accept=".csv" ref={fileInputRef} 
            onChange={handleImport} style={{ display: 'none' }} 
          />
          <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()} style={{ backgroundColor: 'white' }}>
            <Upload size={18} />
            <span>Import CSV</span>
          </button>

          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} />
            <span>Create New Item</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search by item name or code..." 
              className="form-control"
              style={{ paddingLeft: '40px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
              <Filter size={16} style={{ color: '#64748b' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Category Filter:</span>
            </div>
            <select 
              className="form-control" 
              style={{ width: '220px' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Item Details</th>
                <th>Pricing Mode</th>
                <th>Cost (Purchase)</th>
                <th>Markup %</th>
                <th>Sale Price</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #f3f3f3', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: 500 }}>Fetching latest pricing...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                    <Search size={48} style={{ marginBottom: '1.25rem', opacity: 0.15 }} />
                    <p style={{ fontSize: '1rem' }}>No matching items found.</p>
                  </td>
                </tr>
              ) : filteredItems.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id} className="hover-row">
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '1rem' }}>{item.item_name}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.375rem' }}>
                        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.025em' }}>{item.item_code || 'N/A'}</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontWeight: 500 }}>{item.category_name}</span>
                      </div>
                    </td>
                    
                    <td>
                      {isEditing ? (
                        <select 
                          className="form-control" 
                          style={{ height: '38px', fontSize: '0.875rem' }}
                          value={editForm.pricing_method}
                          onChange={(e) => handleEditChange('pricing_method', e.target.value)}
                        >
                          <option value="MANUAL">Manual Fixed</option>
                          <option value="MARKUP_PERCENT">Percentage Markup</option>
                        </select>
                      ) : (
                        <span className={`status-badge ${item.pricing_method === 'MARKUP_PERCENT' ? 'status-completed' : 'status-scheduled'}`} style={{ textTransform: 'none', fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }}>
                          {item.pricing_method === 'MARKUP_PERCENT' ? 'Percentage Markup' : 'Manual Fixed'}
                        </span>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8' }}>$</span>
                          <input 
                            type="number" className="form-control" style={{ paddingLeft: '24px', height: '38px', width: '130px' }}
                            value={editForm.default_purchase_price}
                            onChange={(e) => handleEditChange('default_purchase_price', e.target.value)}
                          />
                        </div>
                      ) : (
                        <div style={{ color: '#475569', fontWeight: 600, fontSize: '1rem' }}>
                          {parseFloat(item.default_purchase_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="number" className="form-control" 
                            style={{ height: '38px', width: '100px', paddingRight: '28px' }}
                            value={editForm.markup_percentage}
                            disabled={editForm.pricing_method !== 'MARKUP_PERCENT'}
                            onChange={(e) => handleEditChange('markup_percentage', e.target.value)}
                          />
                          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8', fontWeight: 600 }}>%</span>
                        </div>
                      ) : (
                        <div style={{ 
                          fontWeight: 600,
                          color: item.pricing_method === 'MARKUP_PERCENT' ? '#2563eb' : '#cbd5e1',
                          fontSize: '1rem'
                        }}>
                          {item.pricing_method === 'MARKUP_PERCENT' ? `${item.markup_percentage}%` : '—'}
                        </div>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8' }}>$</span>
                          <input 
                            type="number" className="form-control" 
                            style={{ paddingLeft: '24px', height: '38px', width: '130px', fontWeight: 700, color: '#059669', borderColor: '#059669', backgroundColor: editForm.pricing_method === 'MARKUP_PERCENT' ? '#f0fdf4' : 'white' }}
                            value={editForm.default_sale_price}
                            disabled={editForm.pricing_method === 'MARKUP_PERCENT'}
                            onChange={(e) => handleEditChange('default_sale_price', e.target.value)}
                          />
                        </div>
                      ) : (
                        <div style={{ fontWeight: 700, color: '#059669', fontSize: '1.25rem' }}>
                          {parseFloat(item.default_sale_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', backgroundColor: '#059669' }} onClick={() => handleSave(item.id)}>
                            <Save size={16} />
                            <span>Apply</span>
                          </button>
                          <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={cancelEdit}>
                            <X size={16} />
                            <span>Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-outline edit-btn" style={{ padding: '0.5rem 1rem' }} onClick={() => startEdit(item)}>
                          <Edit2 size={16} />
                          <span>Edit Price</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button 
              className="btn btn-outline" 
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            >
              Previous
            </button>
            <button 
              className="btn btn-outline" 
              disabled={page === totalPages}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Pharmacy Item</h2>
              <button className="close-btn" onClick={() => setIsCreateModalOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleCreateItem}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Item Name</label>
                  <input 
                    type="text" className="form-control" required
                    value={newItemForm.name} onChange={(e) => handleNewItemChange('name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Item Code</label>
                  <input 
                    type="text" className="form-control" 
                    value={newItemForm.item_code} onChange={(e) => handleNewItemChange('item_code', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category / Subcategory</label>
                  <select 
                    className="form-control" required
                    value={newItemForm.subcategory_id} onChange={(e) => handleNewItemChange('subcategory_id', e.target.value)}
                  >
                    <option value="">Select Subcategory</option>
                    {subcategories.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input 
                    type="text" className="form-control" placeholder="Tab, Bottle, etc."
                    value={newItemForm.unit} onChange={(e) => handleNewItemChange('unit', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', margin: '1rem 0', paddingTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Initial Pricing</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Pricing Method</label>
                    <select 
                      className="form-control"
                      value={newItemForm.pricing_method} onChange={(e) => handleNewItemChange('pricing_method', e.target.value)}
                    >
                      <option value="MANUAL">Manual Fixed</option>
                      <option value="MARKUP_PERCENT">Percentage Markup</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Price (Cost)</label>
                    <input 
                      type="number" className="form-control"
                      value={newItemForm.default_purchase_price} onChange={(e) => handleNewItemChange('default_purchase_price', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Markup Percentage (%)</label>
                    <input 
                      type="number" className="form-control"
                      disabled={newItemForm.pricing_method !== 'MARKUP_PERCENT'}
                      value={newItemForm.markup_percentage} onChange={(e) => handleNewItemChange('markup_percentage', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price</label>
                    <input 
                      type="number" className="form-control"
                      disabled={newItemForm.pricing_method === 'MARKUP_PERCENT'}
                      style={{ fontWeight: 700, color: '#059669' }}
                      value={newItemForm.default_sale_price} onChange={(e) => handleNewItemChange('default_sale_price', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .loading-spinner { border-top-color: #2563eb !important; }
        .hover-row:hover { background-color: #f8fafc; }
        .edit-btn:hover { 
          color: #2563eb; 
          border-color: #2563eb; 
          background-color: #eff6ff;
        }
      `}} />
    </div>
  );
}