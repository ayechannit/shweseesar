import React, { useState, useEffect } from 'react';
import { Truck, Plus, Eye, X, AlertTriangle, ShoppingBag, Search, Edit, Trash2, MoreVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import apiRequest from '../../utils/api';

export default function PurchaseManagement() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Filter State
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [invoiceNoFilter, setInvoiceNoFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modals
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Add Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    company_name: '',
    contact_person: '',
    phone_number: '',
    address: ''
  });

  // Master Data
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);
  const [stockItems, setStockItems] = useState([]);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Searchable Dropdown State
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  
  // Item entry
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    item_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: 1,
    purchase_price: 0,
    sale_price: 0,
    subtotal: 0
  });

  useEffect(() => {
    fetchSuppliers();
    fetchStockItems();
  }, []);

  useEffect(() => {
    fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      let url = `/purchases?page=${page}&limit=10`;
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;
      if (invoiceNoFilter) url += `&invoice_no=${invoiceNoFilter}`;
      if (supplierFilter) url += `&supplier_id=${supplierFilter}`;

      const res = await apiRequest(url);
      const data = await res.json();
      setPurchases(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (page === 1) {
      fetchPurchases();
    } else {
      setPage(1);
    }
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setInvoiceNoFilter('');
    setSupplierFilter('');
    if (page === 1) {
      fetchPurchases();
    } else {
      setPage(1);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await apiRequest('/master-data/suppliers?limit=100');
      const data = await res.json();
      setSuppliers(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStockItems = async () => {
    try {
      // First fetch categories to find the ID for 'PHARMACY'
      const catRes = await apiRequest('/master-data/item_categories?limit=100');
      const catData = await catRes.json();
      const pharmacyCat = (catData.data || catData).find(c => c.name === 'PHARMACY');
      
      let url = '/stock/items?limit=1000';
      if (pharmacyCat) {
        url += `&category_id=${pharmacyCat.id}`;
      }

      const res = await apiRequest(url);
      const data = await res.json();
      setStockItems(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const viewPurchase = async (id) => {
    try {
      const res = await apiRequest(`/purchases/${id}`);
      const data = await res.json();
      setSelectedPurchase(data);
      setIsViewOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const editPurchase = async (id) => {
    try {
      const res = await apiRequest(`/purchases/${id}`);
      const data = await res.json();
      
      // Populate form
      setSupplierId(data.supplier_id);
      setSupplierSearch(data.supplier_name);
      setPaymentMethod(data.payment_method);
      setNotes(data.notes || '');
      setPaidAmount(parseFloat(data.paid_amount) || 0);
      setDiscountAmount(parseFloat(data.discount_amount) || 0);
      setItems(data.items.map(item => ({
        ...item,
        purchase_price: parseFloat(item.purchase_price),
        subtotal: parseFloat(item.subtotal),
        expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : ''
      })));
      
      setEditingId(id);
      setIsEditMode(true);
      setIsEntryOpen(true);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch purchase details for editing");
    }
  };

  const deletePurchase = async (id) => {
    if (window.confirm('Are you absolutely sure you want to delete/void this purchase? This will permanently delete the purchase invoice and completely remove the added stock levels from your inventory. This action is irreversible!')) {
      try {
        const res = await apiRequest(`/purchases/${id}`, {
          method: 'DELETE'
        });
        if (res && res.ok) {
          alert('Purchase invoice successfully deleted and stock levels removed!');
          fetchPurchases();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to delete purchase. Some items from this invoice might already have been sold.');
        }
      } catch (err) {
        console.error(err);
        alert('Server error while deleting purchase');
      }
    }
  };

  const handleItemSelect = (id) => {
    const item = stockItems.find(i => String(i.id) === String(id));
    if (item) {
      setCurrentItem({
        ...currentItem,
        item_id: item.id,
        purchase_price: parseFloat(item.default_purchase_price) || 0,
        sale_price: parseFloat(item.default_sale_price) || 0,
        subtotal: (parseFloat(item.default_purchase_price) || 0) * currentItem.quantity
      });
    } else {
      setCurrentItem({ ...currentItem, item_id: id });
    }
  };

  const handleQuantityChange = (val) => {
    if (val === '') {
      setCurrentItem({ ...currentItem, quantity: '', subtotal: 0 });
      return;
    }
    const q = parseInt(val);
    if (isNaN(q)) return;
    setCurrentItem({
      ...currentItem,
      quantity: q,
      subtotal: q * (parseFloat(currentItem.purchase_price) || 0)
    });
  };

  const handlePurchasePriceChange = (val) => {
    if (val === '') {
      setCurrentItem({ ...currentItem, purchase_price: '', subtotal: 0 });
      return;
    }
    const p = parseFloat(val);
    if (isNaN(p)) return;
    setCurrentItem({
      ...currentItem,
      purchase_price: p,
      subtotal: (parseInt(currentItem.quantity) || 0) * p
    });
  };

  const addItemToPurchase = () => {
    const qty = parseInt(currentItem.quantity);
    const price = parseFloat(currentItem.purchase_price);

    if (!currentItem.item_id || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      alert("Please fill item details correctly with valid numbers.");
      return;
    }

    const itemData = stockItems.find(i => String(i.id) === String(currentItem.item_id));
    
    // Check if item already exists in the list (matching item_id, batch_number, and purchase_price)
    const existingItemIndex = items.findIndex(item => 
      item.item_id === currentItem.item_id && 
      (item.batch_number || '') === (currentItem.batch_number || '') &&
      item.purchase_price === price
    );

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...items];
      const existingItem = updatedItems[existingItemIndex];
      const newQuantity = existingItem.quantity + qty;
      
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        subtotal: newQuantity * existingItem.purchase_price
      };
      setItems(updatedItems);
    } else {
      // Add new item
      setItems([...items, { ...currentItem, quantity: qty, purchase_price: price, item_name: itemData?.name, unit: itemData?.unit }]);
    }
    
    // Reset
    setCurrentItem({
      item_id: '',
      batch_number: '',
      expiry_date: '',
      quantity: 1,
      purchase_price: 0,
      sale_price: 0,
      subtotal: 0
    });
    setItemSearch(''); // Clear the search input
  };

  const removeItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    setItemSearch(''); // Optional: clear search if they remove an item to start fresh
  };

  const updateItemQuantity = (index, val) => {
    const newItems = [...items];
    const item = newItems[index];

    if (val === '') {
      newItems[index] = { ...item, quantity: '', subtotal: 0 };
      setItems(newItems);
      return;
    }

    const qty = parseInt(val);
    if (isNaN(qty)) return;

    if (qty <= 0) {
      // Option B: Just don't allow it to go below 1 (or allow 0 but prompt)
      // Here we allow the user to type it, but we can't save it as 0.
      newItems[index] = { ...item, quantity: qty, subtotal: 0 };
      setItems(newItems);
      return; 
    }

    newItems[index] = {
      ...item,
      quantity: qty,
      subtotal: qty * parseFloat(item.purchase_price)
    };
    setItems(newItems);
  };

  const updateItemBatch = (index, val) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], batch_number: val };
    setItems(newItems);
  };

  const updateItemExpiry = (index, val) => {
    const newItems = [...items];
    const formattedDate = val ? val.split('T')[0] : '';
    newItems[index] = { ...newItems[index], expiry_date: formattedDate };
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
  const netAmount = totalAmount - (parseFloat(discountAmount) || 0);
  const balanceAmount = netAmount - (parseFloat(paidAmount) || 0);

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/master-data/suppliers', {
        method: 'POST',
        body: JSON.stringify(newSupplier)
      });
      if (res.ok) {
        const addedSupplier = await res.json();
        // Refresh suppliers list
        await fetchSuppliers();
        // Auto-select the new supplier
        setSupplierId(addedSupplier.id);
        // Close modal and reset form
        setIsSupplierModalOpen(false);
        setNewSupplier({ company_name: '', contact_person: '', phone_number: '', address: '' });
      } else {
        alert("Failed to add supplier");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding supplier");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!supplierId) {
      alert("Please select a supplier.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item.");
      return;
    }
    const hasInvalidItems = items.some(i => i.quantity === '' || i.quantity <= 0);
    if (hasInvalidItems) {
      alert("Please ensure all items have a valid quantity greater than 0.");
      return;
    }

    const payload = {
      supplier_id: supplierId,
      items: items,
      total_amount: totalAmount,
      discount_amount: parseFloat(discountAmount) || 0,
      paid_amount: parseFloat(paidAmount) || 0,
      balance_amount: balanceAmount,
      payment_method: paymentMethod,
      notes: notes
    };

    try {
      const url = isEditMode ? `/purchases/${editingId}` : '/purchases';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await apiRequest(url, {
        method: method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsEntryOpen(false);
        setIsEditMode(false);
        setEditingId(null);
        fetchPurchases();
        // Reset form
        setSupplierId('');
        setSupplierSearch('');
        setItems([]);
        setPaidAmount(0);
        setDiscountAmount(0);
        setNotes('');
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to save purchase");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving purchase");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Purchases</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => { setIsEditMode(false); setEditingId(null); setSupplierId(''); setSupplierSearch(''); setItems([]); setPaidAmount(0); setDiscountAmount(0); setNotes(''); setIsEntryOpen(true); }}>
            <Plus size={16} /> New Purchase Invoice
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>From Date</label>
            <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>To Date</label>
            <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Invoice No.</label>
            <input type="text" className="form-control" placeholder="Search Invoice..." value={invoiceNoFilter} onChange={e => setInvoiceNoFilter(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Supplier</label>
            <select className="form-control" value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.company_name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleSearch} style={{ flex: 1 }}>
              <Search size={16} /> Search
            </button>
            <button className="btn btn-outline" onClick={handleClearFilters} title="Clear Filters">
              <X size={16} />
            </button>
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
                  <th>Date</th>
                  <th>Invoice No.</th>
                  <th>Supplier</th>
                  <th>Total Amount</th>
                  <th>Discount</th>
                  <th>Net Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>No purchases found.</td>
                  </tr>
                ) : (
                  purchases.map(p => {
                    const grossAmount = parseFloat(p.total_amount) || 0;
                    const discountAmt = parseFloat(p.discount_amount) || 0;
                    const netAmt = grossAmount - discountAmt;
                    return (
                      <tr key={p.id}>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td><strong>{p.invoice_number}</strong></td>
                        <td>{p.supplier_name}</td>
                        <td>{grossAmount.toLocaleString()}</td>
                        <td style={{ color: discountAmt > 0 ? '#ea580c' : 'inherit', fontWeight: discountAmt > 0 ? 600 : 'normal' }}>
                          {discountAmt > 0 ? `-${discountAmt.toLocaleString()}` : '0'}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{netAmt.toLocaleString()}</td>
                        <td>{parseFloat(p.paid_amount).toLocaleString()}</td>
                        <td style={{ color: parseFloat(p.balance_amount) > 0 ? '#ef4444' : 'inherit' }}>
                          {parseFloat(p.balance_amount).toLocaleString()}
                        </td>
                        <td><span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{p.payment_method}</span></td>
                      <td style={{ textAlign: 'center', position: 'relative' }}>
                         <div className="action-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                           <button 
                             className="action-btn"
                             onClick={() => setActiveDropdownId(activeDropdownId === p.id ? null : p.id)}
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

                           {activeDropdownId === p.id && (
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
                                 onClick={() => { viewPurchase(p.id); setActiveDropdownId(null); }}
                                 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', borderRadius: '0.375rem', width: '100%', textAlign: 'left' }}
                                 onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                 onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                               >
                                 <Eye size={14} color="#2563eb" /> View Invoice
                               </button>

                               {user?.role === 'Admin' && (
                                 <button 
                                   className="dropdown-item" 
                                   onClick={() => { editPurchase(p.id); setActiveDropdownId(null); }}
                                   style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', borderRadius: '0.375rem', width: '100%', textAlign: 'left' }}
                                   onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                   onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                 >
                                   <Edit size={14} color="#059669" /> Edit Invoice
                                 </button>
                               )}

                               {user?.role === 'Admin' && (
                                 <>
                                   <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.25rem 0' }}></div>
                                   <button 
                                     className="dropdown-item" 
                                     onClick={() => { deletePurchase(p.id); setActiveDropdownId(null); }}
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
          <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage(prev => Math.max(prev - 1, 1))}>Prev</button>
            <button className="btn btn-outline" disabled={page === totalPages} onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}>Next</button>
          </div>
        </div>
      )}

      {/* New Purchase Modal */}
      {isEntryOpen && (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '3rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: '1200px', width: '95%', borderRadius: '1.25rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ backgroundColor: '#f8fafc', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
              <h2 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={20} color="#4f46e5" /> {isEditMode ? 'Edit Purchase Entry' : 'New Purchase Entry'}
              </h2>
              <button className="close-btn" onClick={() => { setIsEntryOpen(false); setIsEditMode(false); setEditingId(null); setSupplierId(''); setSupplierSearch(''); setItems([]); setPaidAmount(0); setNotes(''); }} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem', borderRadius: '50%', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => Object.assign(e.currentTarget.style, { background: '#e2e8f0', color: '#0f172a' })} onMouseOut={e => Object.assign(e.currentTarget.style, { background: '#f1f5f9', color: '#64748b' })}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', padding: '2rem', maxHeight: '75vh', overflowY: 'auto', backgroundColor: '#ffffff' }}>
              
              {/* Left Side: Items & Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Supplier</label>
                    <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input 
                          type="text"
                          placeholder="Search Supplier..."
                          value={supplierSearch}
                          onChange={(e) => {
                            setSupplierSearch(e.target.value);
                            setIsSupplierDropdownOpen(true);
                            setSupplierId(''); // clear ID if typing
                          }}
                          onFocus={() => setIsSupplierDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setIsSupplierDropdownOpen(false), 200)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', outline: 'none' }}
                        />
                        {isSupplierDropdownOpen && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                            {suppliers.filter(s => s.company_name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 ? (
                              <div style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>No matches found.</div>
                            ) : (
                              suppliers.filter(s => s.company_name.toLowerCase().includes(supplierSearch.toLowerCase())).map(s => (
                                <div 
                                  key={s.id} 
                                  onClick={() => {
                                    setSupplierId(s.id);
                                    setSupplierSearch(s.company_name);
                                    setIsSupplierDropdownOpen(false);
                                  }}
                                  style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}
                                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                  {s.company_name}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setIsSupplierModalOpen(true)} 
                        title="Add New Supplier" 
                        style={{ padding: '0 0.875rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#4f46e5', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e => Object.assign(e.currentTarget.style, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' })}
                        onMouseOut={e => Object.assign(e.currentTarget.style, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' })}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Invoice Notes</label>
                    <input 
                      type="text" 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      placeholder="Optional details or references..." 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#0f172a' }}>Add Stock Item</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Item</label>
                      <input 
                        type="text"
                        placeholder="Search Item..."
                        value={itemSearch}
                        onChange={(e) => {
                          setItemSearch(e.target.value);
                          setIsItemDropdownOpen(true);
                          if(currentItem.item_id) {
                            setCurrentItem({ ...currentItem, item_id: '', purchase_price: 0, subtotal: 0 });
                          }
                        }}
                        onFocus={() => setIsItemDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsItemDropdownOpen(false), 200)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                      />
                      {isItemDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                          {stockItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 ? (
                            <div style={{ padding: '0.6rem', color: '#64748b', fontSize: '0.875rem' }}>No matches found.</div>
                          ) : (
                            stockItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase())).map(i => (
                              <div 
                                key={i.id} 
                                onClick={() => {
                                  handleItemSelect(i.id);
                                  setItemSearch(`${i.name} (${i.unit})`);
                                  setIsItemDropdownOpen(false);
                                }}
                                style={{ padding: '0.6rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                              >
                                {i.name} ({i.unit})
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Batch No. (Optional)</label>
                      <input 
                        type="text" 
                        value={currentItem.batch_number} 
                        onChange={e => setCurrentItem({...currentItem, batch_number: e.target.value})} 
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Expiry Date</label>
                      <input 
                        type="date" 
                        value={currentItem.expiry_date} 
                        onChange={e => setCurrentItem({...currentItem, expiry_date: e.target.value})} 
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Quantity</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={currentItem.quantity} 
                        onChange={e => handleQuantityChange(e.target.value)} 
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                        onWheel={(e) => e.target.blur()}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Unit Price</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={currentItem.purchase_price} 
                        onChange={e => handlePurchasePriceChange(e.target.value)} 
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                        onWheel={(e) => e.target.blur()}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Subtotal</label>
                      <input 
                        type="text" 
                        value={currentItem.subtotal.toFixed(2)} 
                        readOnly 
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#94a3b8', fontSize: '0.875rem', outline: 'none', fontWeight: 600 }} 
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={addItemToPurchase}
                      style={{ padding: '0.6rem 1.5rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      onMouseOver={e => Object.assign(e.currentTarget.style, { backgroundColor: '#4338ca' })}
                      onMouseOut={e => Object.assign(e.currentTarget.style, { backgroundColor: '#4f46e5' })}
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: '200px', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', margin: 0 }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1, borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Item</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Batch</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Expiry</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Price</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Subtotal</th>
                          <th style={{ padding: '0.75rem 1rem' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>No items added to invoice yet.</td></tr>
                        ) : (
                          items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{item.item_name}</td>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                                <input 
                                  type="text" 
                                  value={item.batch_number || ''} 
                                  onChange={(e) => updateItemBatch(idx, e.target.value)}
                                  placeholder="Batch..."
                                  style={{ 
                                    width: '100px', 
                                    padding: '0.25rem 0.5rem', 
                                    borderRadius: '0.25rem', 
                                    border: '1px solid #cbd5e1',
                                    outline: 'none',
                                    fontSize: '0.75rem'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                                <input 
                                  type="date" 
                                  value={item.expiry_date ? item.expiry_date.split('T')[0] : ''} 
                                  onChange={(e) => updateItemExpiry(idx, e.target.value)}
                                  style={{ 
                                    width: '120px', 
                                    padding: '0.25rem 0.5rem', 
                                    borderRadius: '0.25rem', 
                                    border: '1px solid #cbd5e1',
                                    outline: 'none',
                                    fontSize: '0.75rem'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>
                                <input 
                                  type="number" 
                                  value={item.quantity} 
                                  min="1"
                                  onChange={(e) => updateItemQuantity(idx, e.target.value)}
                                  onWheel={(e) => e.target.blur()}
                                  style={{ 
                                    width: '60px', 
                                    padding: '0.25rem 0.5rem', 
                                    textAlign: 'right', 
                                    borderRadius: '0.25rem', 
                                    border: '1px solid #cbd5e1',
                                    outline: 'none'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'right' }}>{item.purchase_price.toLocaleString()}</td>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#059669', textAlign: 'right' }}>{item.subtotal.toLocaleString()}</td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                <button 
                                  type="button" 
                                  style={{ color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0.25rem', display: 'inline-flex' }} 
                                  onClick={() => removeItem(idx)}
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Side: Summary & Payment */}
              <div style={{ backgroundColor: '#f8fafc', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary & Payment</h3>
                
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Total Items:</span>
                    <span style={{ fontWeight: 800, color: '#1e293b' }}>{items.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Gross Total:</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{totalAmount.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>MMK</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.25rem', paddingTop: '0.5rem', borderTop: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Net Total:</span>
                    <span style={{ fontWeight: 900, color: '#0f172a' }}>{netAmount.toLocaleString()} <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>MMK</span></span>
                  </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                  <div className="form-group" style={{ margin: '0 0 1rem 0' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Discount Amount</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 700 }}>MMK</span>
                      <input 
                        type="number" 
                        value={discountAmount} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setDiscountAmount('');
                          } else {
                            setDiscountAmount(parseFloat(val) || 0);
                          }
                        }} 
                        onWheel={(e) => e.target.blur()}
                        style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', borderRadius: '0.5rem', border: '2px solid #cbd5e1', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={e => e.target.style.borderColor = '#4f46e5'}
                        onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: '0 0 1rem 0' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Payment Method</label>
                    <select 
                      value={paymentMethod} 
                      onChange={e => setPaymentMethod(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', outline: 'none', backgroundColor: '#f8fafc' }}
                    >
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>Credit</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: '0 0 1rem 0' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Amount Paid</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 700 }}>MMK</span>
                      <input 
                        type="number" 
                        value={paidAmount} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setPaidAmount('');
                          } else {
                            setPaidAmount(parseFloat(val) || 0);
                          }
                        }} 
                        onWheel={(e) => e.target.blur()}
                        style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', borderRadius: '0.5rem', border: '2px solid #cbd5e1', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={e => e.target.style.borderColor = '#4f46e5'}
                        onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance Due</span>
                    <span style={{ fontWeight: 900, fontSize: '1.5rem', color: balanceAmount > 0 ? '#ef4444' : '#10b981' }}>
                      {balanceAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <button 
                    type="button" 
                    onClick={handleSubmit}
                    style={{ 
                      width: '100%', padding: '1rem', backgroundColor: '#10b981', color: 'white', border: 'none', 
                      borderRadius: '0.75rem', fontSize: '1.125rem', fontWeight: 800, cursor: 'pointer', 
                      boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 20px -5px rgba(16, 185, 129, 0.4)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(16, 185, 129, 0.3)'; }}
                  >
                    {isEditMode ? 'Update Purchase' : 'Confirm Purchase'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsEntryOpen(false)}
                    style={{ width: '100%', padding: '1rem', backgroundColor: 'transparent', color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem', transition: 'color 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.color = '#0f172a'}
                    onMouseOut={e => e.currentTarget.style.color = '#64748b'}
                  >
                    Cancel
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* View Purchase Modal */}
      {isViewOpen && selectedPurchase && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Purchase Invoice: {selectedPurchase.invoice_number}</h2>
              <button className="close-btn" onClick={() => setIsViewOpen(false)}><X size={24} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.5rem', color: '#64748b' }}>Supplier</p>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '1.125rem' }}>{selectedPurchase.supplier_name}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 0.5rem', color: '#64748b' }}>Date</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>{new Date(selectedPurchase.created_at).toLocaleString()}</p>
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Items</h3>
              <div className="table-responsive">
                <table style={{ marginBottom: '1.5rem' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items?.map(item => (
                      <tr key={item.id}>
                        <td>{item.item_name}</td>
                        <td>{item.batch_number || '-'}</td>
                        <td>{item.expiry_date ? item.expiry_date.split('T')[0] : '-'}</td>
                        <td>{item.quantity}</td>
                        <td>{parseFloat(item.purchase_price).toLocaleString()}</td>
                        <td>{parseFloat(item.subtotal).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', width: '300px', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Gross Total:</span>
                  <span style={{ fontWeight: 600 }}>{parseFloat(selectedPurchase.total_amount).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', width: '300px', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Discount:</span>
                  <span style={{ fontWeight: 600 }}>{parseFloat(selectedPurchase.discount_amount || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', width: '300px', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.25rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Net Total:</span>
                  <span style={{ fontWeight: 700 }}>{(parseFloat(selectedPurchase.total_amount) - parseFloat(selectedPurchase.discount_amount || 0)).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', width: '300px', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Paid ({selectedPurchase.payment_method}):</span>
                  <span style={{ fontWeight: 600 }}>{parseFloat(selectedPurchase.paid_amount).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', width: '300px', justifyContent: 'space-between', fontSize: '1.125rem', color: parseFloat(selectedPurchase.balance_amount) > 0 ? '#ef4444' : 'inherit', borderTop: '1px solid #cbd5e1', paddingTop: '0.25rem' }}>
                  <span style={{ fontWeight: 600 }}>Balance:</span>
                  <span style={{ fontWeight: 600 }}>{parseFloat(selectedPurchase.balance_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Supplier</h2>
              <button className="close-btn" onClick={() => setIsSupplierModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveSupplier} style={{ padding: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Company Name *</label>
                <input type="text" className="form-control" required value={newSupplier.company_name} onChange={e => setNewSupplier({...newSupplier, company_name: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Contact Person</label>
                <input type="text" className="form-control" value={newSupplier.contact_person} onChange={e => setNewSupplier({...newSupplier, contact_person: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Phone Number</label>
                <input type="text" className="form-control" value={newSupplier.phone_number} onChange={e => setNewSupplier({...newSupplier, phone_number: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Address</label>
                <textarea className="form-control" rows="3" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsSupplierModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}