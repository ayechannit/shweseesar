import React, { useState, useEffect } from 'react';
import { Package, Plus, ArrowDown, ArrowUp, AlertTriangle, X, Search } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

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
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form States
  const [itemForm, setItemForm] = useState({ subcategory_id: '', item_code: '', name: '', unit: '', min_stock_level: 0 });
  const [modalSelectedCategoryId, setModalSelectedCategoryId] = useState('');
  const [stockInForm, setStockInForm] = useState({ batch_number: '', expiry_date: '', quantity: 0, purchase_price: 0, sale_price: 0 });

  // Add Subcategory State
  const [isAddingSubcat, setIsAddingSubcat] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState('');

  // Load initial data
  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  useEffect(() => {
    setPage(1); // Reset to page 1 when filter changes
  }, [categoryFilter]);

  useEffect(() => {
    fetchItems();
  }, [categoryFilter, page]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/master-data/item_categories?limit=100`);
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
      const res = await fetch(`${API_BASE}/master-data/item_subcategories?limit=200`);
      const result = await res.json();
      setSubcategories(result.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/stock/items?page=${page}&limit=${limit}`;
      if (categoryFilter) url += `&category_id=${categoryFilter}`;
      
      const res = await fetch(url);
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

  const handleModalCategoryChange = (catId) => {
    setModalSelectedCategoryId(catId);
    // Auto-select first subcategory of the new category
    const firstSubcat = subcategories.find(s => String(s.category_id) === String(catId));
    setItemForm({ ...itemForm, subcategory_id: firstSubcat ? firstSubcat.id : '' });
  };

  const handleAddSubcategory = async () => {
    if (!newSubcatName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/master-data/item_subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newSubcatName, 
          category_id: modalSelectedCategoryId 
        })
      });
      if (res.ok) {
        const created = await res.json();
        await fetchSubcategories(); // Refresh list
        setItemForm({ ...itemForm, subcategory_id: created.id }); // Select the new one
        setIsAddingSubcat(false);
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
      const res = await fetch(`${API_BASE}/stock/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleStockIn = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/stock/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...stockInForm, item_id: selectedItem.id })
      });
      if (res.ok) {
        setIsStockInModalOpen(false);
        setStockInForm({ batch_number: '', expiry_date: '', quantity: 0, purchase_price: 0, sale_price: 0 });
        fetchItems();
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
                          <div className="actions" style={{ justifyContent: 'center' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.25rem 0.5rem', color: '#2563eb' }}
                              onClick={() => { setSelectedItem(item); setIsStockInModalOpen(true); }}
                              title="Add Stock (Purchase)"
                            >
                              <ArrowDown size={16} /> Stock In
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
                      <button type="button" className="btn btn-primary" onClick={handleAddSubcategory} style={{ padding: '0.5rem' }}>Save</button>
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
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsItemModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Stock In (Purchase) */}
      {isStockInModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Stock In: {selectedItem?.name}</h2>
              <button className="close-btn" onClick={() => setIsStockInModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleStockIn}>
              <div className="form-group">
                <label className="form-label">Batch Number</label>
                <input type="text" className="form-control" value={stockInForm.batch_number} onChange={e => setStockInForm({...stockInForm, batch_number: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input type="date" className="form-control" value={stockInForm.expiry_date} onChange={e => setStockInForm({...stockInForm, expiry_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity Received</label>
                <input type="number" className="form-control" required value={stockInForm.quantity} onChange={e => setStockInForm({...stockInForm, quantity: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Price (Per Unit)</label>
                <input type="number" step="0.01" className="form-control" value={stockInForm.purchase_price} onChange={e => setStockInForm({...stockInForm, purchase_price: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Sale Price (Per Unit)</label>
                <input type="number" step="0.01" className="form-control" value={stockInForm.sale_price} onChange={e => setStockInForm({...stockInForm, sale_price: e.target.value})} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsStockInModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Receive Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
