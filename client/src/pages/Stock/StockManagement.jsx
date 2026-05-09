import React, { useState, useEffect } from 'react';
import { Package, Plus, ArrowDown, ArrowUp, AlertTriangle, X, Search } from 'lucide-react';

import apiRequest from '../../utils/api';

export default function StockManagement() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form States
  const [itemForm, setItemForm] = useState({ 
    subcategory_id: '', item_code: '', name: '', unit: '', min_stock_level: 0,
    default_purchase_price: 0, default_sale_price: 0
  });
  const [editForm, setEditForm] = useState({ 
    subcategory_id: '', item_code: '', name: '', unit: '', min_stock_level: 0,
    default_purchase_price: 0, default_sale_price: 0
  });
  const [adjustForm, setAdjustForm] = useState({
    item_id: '',
    adjustment_qty: 0,
    reason: '',
    type: 'ADJUST'
  });
  const [modalSelectedCategoryId, setModalSelectedCategoryId] = useState('');
  const [editModalSelectedCategoryId, setEditModalSelectedCategoryId] = useState('');

  // Add Subcategory State
  const [isAddingSubcat, setIsAddingSubcat] = useState(false);
  const [isAddingEditSubcat, setIsAddingEditSubcat] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState('');

  // Load initial data
  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1); // Reset to page 1 when filter changes
  }, [categoryFilter]);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, page]);

  const fetchCategories = async () => {
    try {
      const res = await apiRequest('/master-data/item_categories?limit=100');
      const result = await res.json();
      const fetchedCats = result.data || [];
      setCategories(fetchedCats);
      // If we are currently in the modal, we might need to update the selected category
      if (isItemModalOpen && !modalSelectedCategoryId && fetchedCats.length > 0) {
        setModalSelectedCategoryId(fetchedCats[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const res = await apiRequest('/master-data/item_subcategories?limit=200');
      const result = await res.json();
      setSubcategories(result.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = `/stock/items?page=${page}&limit=${limit}`;
      if (categoryFilter) url += `&category_id=${categoryFilter}`;
      
      const res = await apiRequest(url);
      const result = await res.json();
      setItems(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNewItemModal = () => {
    // Generate auto Item Code: ITM-YYMMDD-XXXX
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Default to first category if available
    const defaultCatId = categories.length > 0 ? categories[0].id : '';
    setModalSelectedCategoryId(defaultCatId);
    
    // Default to first subcategory of that category if available
    const subcats = subcategories.filter(s => String(s.category_id) === String(defaultCatId));
    
    setItemForm({ 
      subcategory_id: subcats.length > 0 ? subcats[0].id : '', 
      item_code: `ITM-${datePart}-${randomPart}`, 
      name: '', 
      unit: '', 
      min_stock_level: 0 
    });
    setIsAddingSubcat(false);
    setNewSubcatName('');
    setIsItemModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setEditForm({
      subcategory_id: item.subcategory_id,
      item_code: item.item_code,
      name: item.name,
      unit: item.unit,
      min_stock_level: item.min_stock_level,
      default_purchase_price: item.default_purchase_price || 0,
      default_sale_price: item.default_sale_price || 0
    });
    setEditModalSelectedCategoryId(item.category_id);
    setIsAddingEditSubcat(false);
    setNewSubcatName('');
    setIsEditModalOpen(true);
  };

  const handleModalCategoryChange = (catId) => {
    setModalSelectedCategoryId(catId);
    // Auto-select first subcategory of the new category
    const firstSubcat = subcategories.find(s => String(s.category_id) === String(catId));
    setItemForm({ ...itemForm, subcategory_id: firstSubcat ? firstSubcat.id : '' });
  };

  const handleEditModalCategoryChange = (catId) => {
    setEditModalSelectedCategoryId(catId);
    // Auto-select first subcategory of the new category
    const firstSubcat = subcategories.find(s => String(s.category_id) === String(catId));
    setEditForm({ ...editForm, subcategory_id: firstSubcat ? firstSubcat.id : '' });
  };

  const handleAddSubcategory = async (isEdit = false) => {
    if (!newSubcatName.trim()) return;
    try {
      const catId = isEdit ? editModalSelectedCategoryId : modalSelectedCategoryId;
      const res = await apiRequest('/master-data/item_subcategories', {
        method: 'POST',
        body: JSON.stringify({ 
          name: newSubcatName, 
          category_id: catId 
        })
      });
      if (res.ok) {
        const created = await res.json();
        await fetchSubcategories(); // Refresh list
        if (isEdit) {
          setEditForm({ ...editForm, subcategory_id: created.id });
          setIsAddingEditSubcat(false);
        } else {
          setItemForm({ ...itemForm, subcategory_id: created.id }); // Select the new one
          setIsAddingSubcat(false);
        }
        setNewSubcatName('');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add subcategory");
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!itemForm.subcategory_id) {
      alert("Please select a subcategory");
      return;
    }
    try {
      const res = await apiRequest('/stock/items', {
        method: 'POST',
        body: JSON.stringify(itemForm)
      });
      if (res.ok) {
        setIsItemModalOpen(false);
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest(`/stock/items/${selectedItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchItems();
      } else {
        alert("Failed to update item");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustForm.adjustment_qty || adjustForm.adjustment_qty == 0) {
      alert("Please enter a non-zero adjustment quantity");
      return;
    }
    try {
      const res = await apiRequest('/stock/adjust', {
        method: 'POST',
        body: JSON.stringify(adjustForm)
      });
      if (res.ok) {
        setIsAdjustModalOpen(false);
        setAdjustForm({ item_id: '', adjustment_qty: 0, reason: '', type: 'ADJUST' });
        fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || "Adjustment failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setAdjustForm({
      item_id: item.id,
      adjustment_qty: 0,
      reason: '',
      type: 'ADJUST'
    });
    setIsAdjustModalOpen(true);
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await apiRequest(`/stock/items/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchItems();
      } else {
        alert("Failed to delete item");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stock & Inventory</h1>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={openNewItemModal}>
            <Plus size={16} /> New Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Search size={20} style={{ color: '#64748b' }} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              className={`btn ${categoryFilter === '' ? 'btn-primary' : 'btn-outline'}`} 
              onClick={() => setCategoryFilter('')}
              style={{ fontSize: '0.75rem' }}
            >
              All
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                className={`btn ${categoryFilter == cat.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setCategoryFilter(cat.id)}
                style={{ fontSize: '0.75rem' }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Category / Sub</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Unit</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No items found.</td>
                  </tr>
                ) : (
                  items.map(item => {
                    const lowStock = parseInt(item.total_quantity) <= parseInt(item.min_stock_level);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '10px', width: 'fit-content' }}>{item.category_name}</span>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>{item.subcategory_name}</span>
                          </div>
                        </td>
                        <td><strong>{item.item_code}</strong></td>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.unit}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: lowStock ? '#ef4444' : 'inherit' }}>
                            {item.total_quantity}
                          </span>
                        </td>
                        <td>
                          {lowStock ? (
                            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                              <AlertTriangle size={14} /> LOW STOCK
                            </span>
                          ) : (
                            <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>HEALTHY</span>
                          )}
                        </td>
                        <td>
                          <div className="actions" style={{ justifyContent: 'center', gap: '0.5rem' }}>
                            {item.category_name === 'Pharmacy' && (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.25rem 0.5rem', color: '#10b981', borderColor: '#10b981' }}
                                onClick={() => openAdjustModal(item)}
                                title="Adjust Stock"
                              >
                                Adjust
                              </button>
                            )}
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.25rem 0.5rem', color: '#2563eb' }}
                              onClick={() => openEditModal(item)}
                              title="Edit Item"
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.25rem 0.5rem', color: '#ef4444' }}
                              onClick={() => handleDeleteItem(item.id)}
                              title="Delete Item"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination (already here) */}
      
      {/* Modals... */}

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

      {/* Modal: New Item */}
      {isItemModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Define New Item</h2>
              <button className="close-btn" onClick={() => setIsItemModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateItem}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-control" 
                    required 
                    value={modalSelectedCategoryId} 
                    onChange={e => handleModalCategoryChange(e.target.value)}
                  >
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Subcategory</label>
                    {!isAddingSubcat && (
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ padding: '2px 8px', fontSize: '10px' }}
                        onClick={() => setIsAddingSubcat(true)}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  
                  {isAddingSubcat ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="New Subcat Name" 
                        value={newSubcatName}
                        onChange={e => setNewSubcatName(e.target.value)}
                        autoFocus
                      />
                      <button type="button" className="btn btn-primary" onClick={() => handleAddSubcategory(false)} style={{ padding: '0.5rem' }}>Save</button>
                      <button type="button" className="btn btn-outline" onClick={() => setIsAddingSubcat(false)} style={{ padding: '0.5rem' }}>X</button>
                    </div>
                  ) : (
                    <select 
                      className="form-control" 
                      required 
                      value={itemForm.subcategory_id} 
                      onChange={e => setItemForm({...itemForm, subcategory_id: e.target.value})}
                    >
                      <option value="">-- Select Subcategory --</option>
                      {subcategories
                        .filter(s => String(s.category_id) === String(modalSelectedCategoryId))
                        .map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)
                      }
                    </select>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Item Code</label>
                <input type="text" className="form-control" required value={itemForm.item_code} onChange={e => setItemForm({...itemForm, item_code: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input type="text" className="form-control" required value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit (e.g. Tab, Bottle, Service)</label>
                <input type="text" className="form-control" required value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Min Stock Level (Alert Threshold)</label>
                <input type="number" className="form-control" value={itemForm.min_stock_level} onChange={e => setItemForm({...itemForm, min_stock_level: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Default Purchase Price</label>
                  <input type="number" step="0.01" className="form-control" value={itemForm.default_purchase_price} onChange={e => setItemForm({...itemForm, default_purchase_price: parseFloat(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Default Sale Price</label>
                  <input type="number" step="0.01" className="form-control" value={itemForm.default_sale_price} onChange={e => setItemForm({...itemForm, default_sale_price: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsItemModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Item */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Item: {selectedItem?.name}</h2>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateItem}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-control" 
                    required 
                    value={editModalSelectedCategoryId} 
                    onChange={e => handleEditModalCategoryChange(e.target.value)}
                  >
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Subcategory</label>
                    {!isAddingEditSubcat && (
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ padding: '2px 8px', fontSize: '10px' }}
                        onClick={() => setIsAddingEditSubcat(true)}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  
                  {isAddingEditSubcat ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="New Subcat Name" 
                        value={newSubcatName}
                        onChange={e => setNewSubcatName(e.target.value)}
                        autoFocus
                      />
                      <button type="button" className="btn btn-primary" onClick={() => handleAddSubcategory(true)} style={{ padding: '0.5rem' }}>Save</button>
                      <button type="button" className="btn btn-outline" onClick={() => setIsAddingEditSubcat(false)} style={{ padding: '0.5rem' }}>X</button>
                    </div>
                  ) : (
                    <select 
                      className="form-control" 
                      required 
                      value={editForm.subcategory_id} 
                      onChange={e => setEditForm({...editForm, subcategory_id: e.target.value})}
                    >
                      <option value="">-- Select Subcategory --</option>
                      {subcategories
                        .filter(s => String(s.category_id) === String(editModalSelectedCategoryId))
                        .map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)
                      }
                    </select>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Item Code</label>
                <input type="text" className="form-control" required value={editForm.item_code} onChange={e => setEditForm({...editForm, item_code: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input type="text" className="form-control" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <input type="text" className="form-control" required value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Current Stock (Read-only)</label>
                <input type="text" className="form-control" value={selectedItem?.total_quantity} readOnly style={{ backgroundColor: '#f1f5f9' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Min Stock Level</label>
                <input type="number" className="form-control" value={editForm.min_stock_level} onChange={e => setEditForm({...editForm, min_stock_level: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Default Purchase Price</label>
                  <input type="number" step="0.01" className="form-control" value={editForm.default_purchase_price} onChange={e => setEditForm({...editForm, default_purchase_price: parseFloat(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Default Sale Price</label>
                  <input type="number" step="0.01" className="form-control" value={editForm.default_sale_price} onChange={e => setEditForm({...editForm, default_sale_price: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Stock Adjustment */}
      {isAdjustModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Manual Stock Adjustment</h2>
              <button className="close-btn" onClick={() => setIsAdjustModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAdjustStock} style={{ padding: '1.5rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                 <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Item Name</p>
                 <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{selectedItem?.name}</p>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                    <span>Current Stock:</span>
                    <strong>{selectedItem?.total_quantity} {selectedItem?.unit}</strong>
                 </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Adjustment Quantity</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                   <input 
                    type="number" className="form-control" required 
                    placeholder="e.g. 10 or -5"
                    value={adjustForm.adjustment_qty}
                    onChange={e => setAdjustForm({...adjustForm, adjustment_qty: e.target.value})}
                   />
                   <span style={{ fontWeight: 600 }}>{selectedItem?.unit}</span>
                </div>
                <small style={{ color: '#64748b', display: 'block', marginTop: '0.5rem' }}>
                  Use <strong>positive</strong> numbers to add stock, and <strong>negative</strong> numbers to deduct (e.g., damage).
                </small>
              </div>

              <div className="form-group mb-6">
                <label className="form-label">Reason for Adjustment</label>
                <textarea 
                  className="form-control" required rows="3"
                  placeholder="e.g. Expired items removal, Inventory recount correction..."
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm({...adjustForm, reason: e.target.value})}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsAdjustModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
