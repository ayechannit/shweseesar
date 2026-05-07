import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Search, Package, CheckCircle2, AlertCircle } from 'lucide-react';

import { API_BASE } from '../../config';

export default function GPPackageManagement() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [searchItemQuery, setSearchItemQuery] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(6); // 6 per page for cards

  // Notification state
  const [notification, setNotification] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    items: [] // array of { item_id, quantity, item_name }
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/gp-packages?page=${page}&limit=${limit}`);
      const result = await res.json();
      setPackages(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      showNotification('Failed to load packages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/pricing/items?limit=1000`); // Get many for search
      const result = await res.json();
      setStockItems(result.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  useEffect(() => {
    fetchStockItems();
  }, []);

  const openModal = (pkg = null) => {
    if (pkg) {
      setEditingPkg(pkg);
      setFormData({
        name: pkg.name,
        price: pkg.price,
        items: pkg.items.map(item => ({
          item_id: item.item_id,
          quantity: item.quantity,
          item_name: item.item_name
        }))
      });
    } else {
      setEditingPkg(null);
      setFormData({ name: '', price: '', items: [] });
    }
    setIsModalOpen(true);
  };

  const addItemToPackage = (item) => {
    if (formData.items.find(i => i.item_id === item.id)) {
      showNotification('Item already in package', 'error');
      return;
    }
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: item.id, quantity: 1, item_name: item.item_name }]
    });
    setSearchItemQuery('');
  };

  const removeItemFromPackage = (itemId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(i => i.item_id !== itemId)
    });
  };

  const updateItemQuantity = (itemId, qty) => {
    setFormData({
      ...formData,
      items: formData.items.map(i => i.item_id === itemId ? { ...i, quantity: parseInt(qty) || 1 } : i)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      showNotification('Please add at least one item', 'error');
      return;
    }

    const method = editingPkg ? 'PUT' : 'POST';
    const url = editingPkg ? `${API_BASE}/gp-packages/${editingPkg.id}` : `${API_BASE}/gp-packages`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showNotification(editingPkg ? 'Package updated' : 'Package created');
        setIsModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Operation failed', 'error');
      }
    } catch (err) {
      showNotification('Server error', 'error');
    }
  };

  const deletePackage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      const res = await fetch(`${API_BASE}/gp-packages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Package deleted');
        fetchData();
      }
    } catch (err) {
      showNotification('Failed to delete', 'error');
    }
  };

  const filteredStockItems = stockItems.filter(item => 
    item.item_name.toLowerCase().includes(searchItemQuery.toLowerCase()) ||
    (item.item_code && item.item_code.toLowerCase().includes(searchItemQuery.toLowerCase()))
  ).slice(0, 10);

  return (
    <div className="gp-packages-page">
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
          <h1 className="page-title">GP Package Management</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Create and manage clinic packages with bundled pharmacy items.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={18} />
            <span>Create New Package</span>
          </button>
        </div>
      </div>

      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
             <div className="loading-spinner" style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #f3f3f3', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          </div>
        ) : packages.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p>No GP packages defined yet.</p>
          </div>
        ) : packages.map(pkg => (
          <div key={pkg.id} className="card hover-row" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{pkg.name}</h3>
                <div style={{ color: '#059669', fontWeight: 700, fontSize: '1.25rem', marginTop: '0.25rem' }}>
                  {parseFloat(pkg.price).toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>MMK</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-icon text-blue-600" onClick={() => openModal(pkg)} title="Edit">
                  <Edit2 size={18} />
                </button>
                <button className="btn-icon text-red-600" onClick={() => deletePackage(pkg.id)} title="Delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Included Items ({pkg.items.length})
              </div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {pkg.items.map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                    <span style={{ color: '#475569' }}>{item.item_name}</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>x{item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-between items-center mt-8">
          <div className="text-sm text-gray-500">
            Showing page {page} of {totalPages}
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

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingPkg ? 'Edit GP Package' : 'Create GP Package'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Package Name</label>
                  <input 
                    type="text" className="form-control" required placeholder="e.g., GP Package A"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Package Price (MMK)</label>
                  <input 
                    type="number" className="form-control" required placeholder="9000"
                    value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Manage Included Items</h3>
                
                {/* Item Search and Selection */}
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type="text" className="form-control" placeholder="Search pharmacy items to add..."
                      style={{ paddingLeft: '40px' }}
                      value={searchItemQuery}
                      onChange={(e) => setSearchItemQuery(e.target.value)}
                    />
                  </div>
                  
                  {searchItemQuery && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', zIndex: 10, marginTop: '4px' }}>
                      {filteredStockItems.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No items found</div>
                      ) : filteredStockItems.map(item => (
                        <div 
                          key={item.id} 
                          style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}
                          onClick={() => addItemToPackage(item)}
                          className="hover-row"
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.item_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.item_code} • {item.unit}</div>
                          </div>
                          <Plus size={18} className="text-blue-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Items List */}
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                  <table className="table" style={{ margin: 0 }}>
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                        <th style={{ fontSize: '0.75rem' }}>Item Name</th>
                        <th style={{ fontSize: '0.75rem', width: '120px' }}>Quantity</th>
                        <th style={{ textAlign: 'right', width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No items added yet</td>
                        </tr>
                      ) : formData.items.map(item => (
                        <tr key={item.item_id}>
                          <td style={{ fontWeight: 500 }}>{item.item_name}</td>
                          <td>
                            <input 
                              type="number" className="form-control" style={{ height: '32px', padding: '0 0.5rem' }}
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.item_id, e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" className="text-red-600" onClick={() => removeItemFromPackage(item.item_id)}>
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  <span>{editingPkg ? 'Save Changes' : 'Create Package'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .loading-spinner { border-top-color: #2563eb !important; }
        .hover-row:hover { background-color: #f8fafc; }
        .btn-icon { background: none; border: none; padding: 0.25rem; border-radius: 4px; transition: background 0.2s; }
        .btn-icon:hover { background-color: #f1f5f9; }
      `}} />
    </div>
  );
}