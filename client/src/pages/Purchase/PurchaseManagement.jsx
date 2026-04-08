import React, { useState, useEffect } from 'react';
import { Truck, Plus, Eye, X, AlertTriangle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function PurchaseManagement() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isEntryOpen, setIsEntryOpen] = useState(false);
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
  const [stockItems, setStockItems] = useState([]);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);
  
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
    fetchPurchases();
    fetchSuppliers();
    fetchStockItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/purchases?page=${page}&limit=10`);
      const data = await res.json();
      setPurchases(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE}/master-data/suppliers?limit=100`);
      const data = await res.json();
      setSuppliers(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStockItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/stock/items?limit=1000&category_id=1`);
      const data = await res.json();
      setStockItems(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const viewPurchase = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/purchases/${id}`);
      const data = await res.json();
      setSelectedPurchase(data);
      setIsViewOpen(true);
    } catch (err) {
      console.error(err);
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

  const handleQuantityChange = (qty) => {
    const q = parseInt(qty) || 0;
    setCurrentItem({
      ...currentItem,
      quantity: q,
      subtotal: q * currentItem.purchase_price
    });
  };

  const handlePurchasePriceChange = (price) => {
    const p = parseFloat(price) || 0;
    setCurrentItem({
      ...currentItem,
      purchase_price: p,
      subtotal: currentItem.quantity * p
    });
  };

  const addItemToPurchase = () => {
    if (!currentItem.item_id || currentItem.quantity <= 0 || currentItem.purchase_price < 0) {
      alert("Please fill item details correctly.");
      return;
    }
    const itemData = stockItems.find(i => String(i.id) === String(currentItem.item_id));
    setItems([...items, { ...currentItem, item_name: itemData?.name, unit: itemData?.unit }]);
    
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
  };

  const removeItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  const balanceAmount = totalAmount - paidAmount;

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/master-data/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (!supplierId || items.length === 0) {
      alert("Please select a supplier and add at least one item.");
      return;
    }

    const payload = {
      supplier_id: supplierId,
      items: items,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      balance_amount: balanceAmount,
      payment_method: paymentMethod,
      notes: notes
    };

    try {
      const res = await fetch(`${API_BASE}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsEntryOpen(false);
        fetchPurchases();
        // Reset form
        setSupplierId('');
        setItems([]);
        setPaidAmount(0);
        setNotes('');
      } else {
        alert("Failed to save purchase");
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
          <button className="btn btn-primary" onClick={() => setIsEntryOpen(true)}>
            <Plus size={16} /> New Purchase Invoice
          </button>
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
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No purchases found.</td>
                  </tr>
                ) : (
                  purchases.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td><strong>{p.invoice_number}</strong></td>
                      <td>{p.supplier_name}</td>
                      <td>{parseFloat(p.total_amount).toLocaleString()}</td>
                      <td>{parseFloat(p.paid_amount).toLocaleString()}</td>
                      <td style={{ color: parseFloat(p.balance_amount) > 0 ? '#ef4444' : 'inherit' }}>
                        {parseFloat(p.balance_amount).toLocaleString()}
                      </td>
                      <td><span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{p.payment_method}</span></td>
                      <td>
                        <div className="actions" style={{ justifyContent: 'center' }}>
                          <button className="btn btn-outline" onClick={() => viewPurchase(p.id)} style={{ padding: '0.25rem 0.5rem', color: '#2563eb' }}>
                            <Eye size={14} /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
          <div className="modal" style={{ maxWidth: '900px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title">New Purchase Entry</h2>
              <button className="close-btn" onClick={() => setIsEntryOpen(false)}><X size={24} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
              
              {/* Left Side: Items & Details */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Supplier</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select className="form-control" value={supplierId} onChange={e => setSupplierId(e.target.value)} required style={{ flex: 1 }}>
                        <option value="">-- Select Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                      </select>
                      <button type="button" className="btn btn-outline" onClick={() => setIsSupplierModalOpen(true)} title="Add New Supplier" style={{ padding: '0 0.75rem' }}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <input type="text" className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional details..." />
                  </div>
                </div>

                <div className="card" style={{ padding: '1rem', marginBottom: '1rem', background: '#f8fafc', boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>Add Item</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Item</label>
                      <select className="form-control" value={currentItem.item_id} onChange={e => handleItemSelect(e.target.value)}>
                        <option value="">Select Item...</option>
                        {stockItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Batch No. (Optional)</label>
                      <input type="text" className="form-control" value={currentItem.batch_number} onChange={e => setCurrentItem({...currentItem, batch_number: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Expiry Date</label>
                      <input type="date" className="form-control" value={currentItem.expiry_date} onChange={e => setCurrentItem({...currentItem, expiry_date: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Quantity</label>
                      <input type="number" min="1" className="form-control" value={currentItem.quantity} onChange={e => handleQuantityChange(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Purchase Price</label>
                      <input type="number" step="0.01" className="form-control" value={currentItem.purchase_price} onChange={e => handlePurchasePriceChange(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Subtotal</label>
                      <input type="text" className="form-control" value={currentItem.subtotal.toFixed(2)} readOnly style={{ background: '#e2e8f0' }} />
                    </div>
                    <button type="button" className="btn btn-primary" onClick={addItemToPurchase}>Add</button>
                  </div>
                </div>

                <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
                  <table style={{ margin: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                      <tr>
                        <th>Item</th>
                        <th>Batch</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1rem' }}>No items added</td></tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.item_name}</td>
                            <td>{item.batch_number || '-'}</td>
                            <td>{item.quantity}</td>
                            <td>{item.purchase_price}</td>
                            <td>{item.subtotal}</td>
                            <td>
                              <button type="button" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => removeItem(idx)}><X size={16} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side: Summary & Payment */}
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1e293b' }}>Summary</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>
                  <span>Total Amount:</span>
                  <span>{totalAmount.toLocaleString()}</span>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '1rem 0' }} />

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-control" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>Credit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Paid Amount</label>
                  <input type="number" className="form-control" style={{ fontSize: '1.25rem', fontWeight: 600, padding: '0.75rem' }} value={paidAmount} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '1.125rem', fontWeight: 600, color: balanceAmount > 0 ? '#ef4444' : '#10b981' }}>
                  <span>Balance Due:</span>
                  <span>{balanceAmount.toLocaleString()}</span>
                </div>

                <div style={{ marginTop: '2rem' }}>
                  <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }} onClick={handleSubmit}>
                    Save Purchase Entry
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
                      <td>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}</td>
                      <td>{item.quantity}</td>
                      <td>{parseFloat(item.purchase_price).toLocaleString()}</td>
                      <td>{parseFloat(item.subtotal).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', width: '300px', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Total Amount:</span>
                  <span style={{ fontWeight: 600 }}>{parseFloat(selectedPurchase.total_amount).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', width: '300px', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Paid ({selectedPurchase.payment_method}):</span>
                  <span style={{ fontWeight: 600 }}>{parseFloat(selectedPurchase.paid_amount).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', width: '300px', justifyContent: 'space-between', fontSize: '1.125rem', color: parseFloat(selectedPurchase.balance_amount) > 0 ? '#ef4444' : 'inherit' }}>
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