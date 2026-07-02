import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Save, X, User, Package, Monitor, UserPlus, Calculator, Receipt, CreditCard, ChevronRight, AlertCircle, Calendar } from 'lucide-react';
import AddPatientModal from '../../components/Modals/AddPatientModal';
import { API_BASE } from '../../config';
import apiRequest from '../../utils/api';

export default function VoucherEntry({ editVoucherId, onSave, onCancel }) {
  // --- Master Data ---
  const [patients, setPatients] = useState([]);
  const [physicians, setPhysicians] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [gpPackages, setGpPackages] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [referredPersons, setReferredPersons] = useState([]);

  // --- Search & UI ---
  const [patientSearch, setPatientSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [showItemResults, setShowItemResults] = useState(false);

  // --- Form State ---
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPhysicianId, setSelectedPhysicianId] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [tcaDate, setTcaDate] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // --- Add Patient Modal State ---
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);

  const handleNewPatientSave = (addedPatient) => {
    setPatients(prev => [addedPatient, ...prev]);
    setSelectedPatient(addedPatient);
  };

  // --- Totals ---
  const subtotal = selectedItems.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
  const netTotal = subtotal - parseFloat(discount || 0);

  // Recalculate referral amounts when netTotal changes
  useEffect(() => {
    if (referrals.length > 0) {
      setReferrals(prevRefs => prevRefs.map(ref => ({
        ...ref,
        amount: Math.round((netTotal * (parseFloat(ref.percentage) || 0)) / 100)
      })));
    }
  }, [netTotal]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (editVoucherId) {
      fetchVoucherToEdit();
    }
  }, [editVoucherId]);

  const formatDateLocal = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchVoucherToEdit = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/billing/vouchers/${editVoucherId}`);
      if (res && res.ok) {
        const v = await res.json();
        setSelectedPatient({
          id: v.patient_id,
          name: v.patient_name,
          patient_code: v.patient_code,
          phone_number: v.patient_phone
        });
        setSelectedPhysicianId(v.physician_id || '');
        const mappedItems = v.items.map(i => {
          const unitPrice = parseFloat(i.unit_price) || 0;
          return {
            item_type: i.item_type,
            item_id: i.item_id,
            name: i.name,
            quantity: i.quantity,
            unit_price: unitPrice,
            original_price: unitPrice > 0 ? unitPrice : 0,
            is_foc: unitPrice === 0,
            subtotal: parseFloat(i.subtotal) || 0,
            laboratory_id: i.laboratory_id || null,
            is_lab: i.item_type === 'INVESTIGATION'
          };
        });
        setSelectedItems(mappedItems);
        const mappedReferrals = v.referrals.map(r => ({
          referred_person_id: r.referred_person_id,
          percentage: parseFloat(r.percentage) || 0,
          amount: parseFloat(r.amount) || 0,
          referral_type: r.referral_type || 'Physician'
        }));
        setReferrals(mappedReferrals);
        setDiscount(parseFloat(v.discount_amount) || 0);
        setPaymentMethod(v.payment_method || 'Cash');
        setNotes(v.notes || '');
        setTcaDate(v.tca_date ? v.tca_date.substring(0, 10) : '');
        setVoucherDate(v.created_at ? formatDateLocal(v.created_at) : new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('Failed to load voucher for edit:', err);
      alert('Failed to load voucher details for editing');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [pRes, dRes, sRes, gRes, lRes, rRes] = await Promise.all([
        apiRequest('/master-data/patients?limit=1000'),
        apiRequest('/master-data/physicians?limit=200'),
        apiRequest('/stock/items?limit=1000'),
        apiRequest('/gp-packages?limit=100'),
        apiRequest('/master-data/laboratories?limit=100'),
        apiRequest('/master-data/referred_persons?limit=200')
      ]);
      
      const pData = await pRes.json();
      const dData = await dRes.json();
      const sData = await sRes.json();
      const gData = await gRes.json();
      const lData = await lRes.json();
      const rData = await rRes.json();

      const fetchedStockItems = sData.data || [];
      const fetchedGpPackages = gData.data || [];

      setPatients(pData.data || []);
      setPhysicians(dData.data || []);
      setStockItems(fetchedStockItems);
      setGpPackages(fetchedGpPackages);
      setLaboratories(lData.data || []);
      setReferredPersons(rData.data || []);

      // If we are editing, resolve the original_prices for selected items that are 0 (which means they were FOC)
      setSelectedItems(prevItems => {
        if (!prevItems || prevItems.length === 0) return prevItems;
        return prevItems.map(item => {
          let original_price = item.original_price;
          if (original_price === undefined || original_price === 0) {
            if (item.item_type === 'PACKAGE') {
              const pkg = fetchedGpPackages.find(p => p.id === item.item_id);
              if (pkg) original_price = parseFloat(pkg.price) || 0;
            } else {
              const sItem = fetchedStockItems.find(si => si.id === item.item_id);
              if (sItem) original_price = parseFloat(sItem.default_sale_price) || 0;
            }
          }
          return {
            ...item,
            original_price: original_price || item.unit_price || 0
          };
        });
      });
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  // --- Handlers ---
  const handleAddItem = (item, type) => {
    const isPackage = type === 'PACKAGE';
    const name = item.name || item.item_name;
    const price = isPackage ? item.price : (item.default_sale_price || 0);
    const itemId = item.id;
    
    // Check if it's an investigation based on category name or subcategory name
    const categoryName = (item.category_name || '').toLowerCase();
    const subcatName = (item.subcategory_name || '').toLowerCase();
    const isLab = !isPackage && (
      categoryName.includes('lab') || categoryName.includes('test') || categoryName.includes('investigation') ||
      subcatName.includes('lab') || subcatName.includes('test') || subcatName.includes('investigation')
    );
    
    const determinedType = isPackage ? 'PACKAGE' : (isLab ? 'INVESTIGATION' : 'PHARMACY');

    // Check if the item is already in the list
    const existingItemIndex = selectedItems.findIndex(i => 
      i.item_id === itemId && i.item_type === determinedType
    );

    if (existingItemIndex >= 0) {
      // Item exists, increment quantity
      const updatedItems = [...selectedItems];
      const existingItem = updatedItems[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;
      
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        subtotal: newQuantity * existingItem.unit_price
      };
      setSelectedItems(updatedItems);
    } else {
      // Item is new, add it
      const newItem = {
        item_type: determinedType,
        item_id: itemId,
        name: name,
        quantity: 1,
        unit_price: parseFloat(price) || 0,
        original_price: parseFloat(price) || 0,
        is_foc: false,
        subtotal: parseFloat(price) || 0,
        laboratory_id: null,
        is_lab: isLab // Helper for UI
      };
      setSelectedItems([...selectedItems, newItem]);
    }

    setItemSearch('');
    setShowItemResults(false);
  };

  const removeItem = (index) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    setSelectedItems(newItems);
  };

  const handleFocToggle = (index, checked) => {
    const newItems = [...selectedItems];
    newItems[index].is_foc = checked;
    newItems[index].unit_price = checked ? 0 : (newItems[index].original_price || 0);
    newItems[index].subtotal = (parseFloat(newItems[index].quantity) || 0) * (parseFloat(newItems[index].unit_price) || 0);
    setSelectedItems(newItems);
  };

  const updateItem = async (index, field, value) => {
    const newItems = [...selectedItems];
    newItems[index][field] = value;
    
    // Logic for Lab-Specific Pricing
    if (field === 'laboratory_id' && value && newItems[index].item_type === 'INVESTIGATION') {
      try {
        const res = await apiRequest(`/laboratories/${value}/test-pricing`);
        if (res && res.ok) {
          const pricingData = await res.json();
          // Find the specific pricing for this item
          const specific = pricingData.find(p => String(p.item_id) === String(newItems[index].item_id));
          if (specific) {
             newItems[index].lab_cost_price = specific.purchase_price;
             newItems[index].lab_commission_pct = specific.commission_percentage;
          }
        }
      } catch (err) {
        console.error('Failed to fetch specific lab pricing:', err);
      }
    }

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].subtotal = (parseFloat(newItems[index].quantity) || 0) * (parseFloat(newItems[index].unit_price) || 0);
    }
    setSelectedItems(newItems);
  };

  const addReferral = () => {
    setReferrals([...referrals, { referred_person_id: '', percentage: 0, amount: 0, referral_type: 'Physician' }]);
  };

  const removeReferral = (index) => {
    const newRefs = [...referrals];
    newRefs.splice(index, 1);
    setReferrals(newRefs);
  };

  const updateReferral = (index, field, value) => {
    const newRefs = [...referrals];
    newRefs[index][field] = value;
    
    // Auto-populate percentage if person is selected
    if (field === 'referred_person_id' && value) {
      const person = referredPersons.find(p => String(p.id) === String(value));
      if (person) {
        newRefs[index].percentage = person.referral_percentage || 0;
        newRefs[index].amount = Math.round((netTotal * (parseFloat(newRefs[index].percentage) || 0)) / 100);
      }
    }

    if (field === 'percentage') {
       newRefs[index].amount = Math.round((netTotal * (parseFloat(value) || 0)) / 100);
    }
    if (field === 'amount') {
       newRefs[index].percentage = netTotal > 0 ? (parseFloat(value) * 100) / netTotal : 0;
    }

    setReferrals(newRefs);
  };

  const handleKeyDown = (e) => {
    // Prevent Enter key from submitting the form when inside an input field
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return alert('Please select a patient');
    if (selectedItems.length === 0) return alert('Please add at least one item');

    // Check for missing laboratories in investigations
    const missingLab = selectedItems.find(i => i.item_type === 'INVESTIGATION' && !i.laboratory_id);
    if (missingLab) {
      alert(`Please select a laboratory for "${missingLab.name}".`);
      return;
    }

    setLoading(true);
    try {
      const url = editVoucherId ? `/billing/vouchers/${editVoucherId}` : '/billing/vouchers';
      const method = editVoucherId ? 'PUT' : 'POST';
      const res = await apiRequest(url, {
        method,
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          physician_id: selectedPhysicianId || null,
          items: selectedItems,
          referrals,
          total_amount: subtotal,
          discount_amount: parseFloat(discount) || 0,
          net_amount: netTotal,
          payment_method: paymentMethod,
          notes,
          tca_date: tcaDate,
          created_at: voucherDate
        })
      });

      if (res && res.ok) {
        const data = await res.json();
        onSave(data.id);
      } else if (res) {
        const err = await res.json();
        alert(err.error || `Failed to ${editVoucherId ? 'update' : 'create'} voucher`);
      }
    } catch (err) {
      alert('Server error');
    } finally {
      setLoading(false);
    }
  };

  // --- Filtered Results ---
  const filteredPatients = patients.filter(p => 
    (p.name && p.name.toLowerCase().includes(patientSearch.toLowerCase())) || 
    (p.patient_code && p.patient_code.toLowerCase().includes(patientSearch.toLowerCase()))
  ).slice(0, 10);

  const filteredItems = [
    ...stockItems.filter(i => {
      const name = i.name || i.item_name || '';
      const code = i.item_code || '';
      const cat = i.category_name || '';
      const sub = i.subcategory_name || '';
      const search = itemSearch.toLowerCase();
      return name.toLowerCase().includes(search) || 
             code.toLowerCase().includes(search) || 
             cat.toLowerCase().includes(search) || 
             sub.toLowerCase().includes(search);
    }).map(i => ({ ...i, type: 'ITEM', display_name: i.name || i.item_name })),
    ...gpPackages.filter(p => 
      p.name && p.name.toLowerCase().includes(itemSearch.toLowerCase())
    ).map(p => ({ ...p, type: 'PACKAGE', display_name: p.name }))
  ].slice(0, 10);

  return (
    <div className="voucher-entry" style={{ animation: 'slideIn 0.3s ease-out' }}>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '12px', color: '#2563eb' }}>
            <Receipt size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{editVoucherId ? 'Edit Voucher' : 'Create Voucher'}</h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Transaction processing and inventory deduction</p>
          </div>
        </div>
        <button className="btn btn-outline" style={{ padding: '0.75rem 1.25rem' }} onClick={onCancel}>
          <X size={20} /> Cancel
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Patient & Items */}
        <div className="flex flex-col gap-6">
          
          {/* Selection Cards: Physician & Patient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Physician Selection Card */}
            <div className="card shadow-sm" style={{ padding: '1.5rem', border: '1px solid #e2e8f0' }}>
               <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={18} className="text-purple-600" /> Physician (Doctor)
               </h3>
               <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Select Doctor</label>
                  <select 
                    className="form-control"
                    style={{ height: '48px', borderRadius: '8px' }}
                    value={selectedPhysicianId}
                    onChange={(e) => setSelectedPhysicianId(e.target.value)}
                  >
                    <option value="">-- Select Physician (Optional) --</option>
                    {physicians.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>
               </div>
            </div>

            {/* Patient Selection Card */}
            <div className="card shadow-sm" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', overflow: 'visible' }}>
               <div className="flex justify-between items-center mb-5">
                 <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={18} className="text-blue-600" /> Patient Information
                 </h3>
                 <button 
                  type="button"
                  className="btn btn-outline" 
                  style={{ padding: '4px 10px', fontSize: '12px', borderStyle: 'dashed' }}
                  onClick={() => setIsAddPatientModalOpen(true)}
                 >
                   <UserPlus size={14} style={{ marginRight: '4px' }} /> Register New
                 </button>
               </div>
               
               <div style={{ position: 'relative' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient Search</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type="text" className="form-control" placeholder="Search by name, code, or phone..."
                      style={{ paddingLeft: '44px', height: '42px', borderRadius: '8px', fontSize: '1rem' }}
                      value={selectedPatient ? `${selectedPatient.name} [${selectedPatient.patient_code}]` : patientSearch}
                      onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatient(null); setShowPatientResults(true); }}
                      onFocus={() => setShowPatientResults(true)}
                    />
                    {selectedPatient && (
                      <button type="button" onClick={() => setSelectedPatient(null)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                        <X size={20} />
                      </button>
                    )}
                  </div>
                  
                  {showPatientResults && patientSearch && !selectedPatient && (
                    <div className="search-dropdown shadow-lg" style={{ position: 'absolute', width: '100%', zIndex: 999, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', marginTop: '8px', overflow: 'hidden' }}>
                      {filteredPatients.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No patients matching "{patientSearch}"</div>
                      ) : filteredPatients.map(p => (
                        <div key={p.id} className="p-4 hover:bg-blue-50 cursor-pointer transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }} onClick={() => { setSelectedPatient(p); setShowPatientResults(false); }}>
                          <div className="flex justify-between items-center">
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{p.patient_code} • {p.phone_number}</div>
                            </div>
                            <ChevronRight size={16} className="text-slate-300" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="card shadow-sm" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', overflow: 'visible' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} className="text-blue-600" /> Items & Services
              </h3>
              <div style={{ position: 'relative', width: '350px' }}>
                <Plus size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#2563eb' }} />
                <input 
                  type="text" className="form-control" placeholder="Add pharmacy, test, or package..."
                  style={{ paddingLeft: '38px', height: '40px', borderRadius: '8px' }}
                  value={itemSearch}
                  onChange={(e) => { setItemSearch(e.target.value); setShowItemResults(true); }}
                  onFocus={() => setShowItemResults(true)}
                />
                {showItemResults && itemSearch && (
                  <div className="search-dropdown shadow-lg" style={{ position: 'absolute', width: '100%', zIndex: 999, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '8px', overflow: 'hidden' }}>
                    {filteredItems.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No items found</div>
                    ) : filteredItems.map((item, idx) => (
                      <div key={idx} className="p-3 hover:bg-blue-50 cursor-pointer transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }} onClick={() => handleAddItem(item, item.type)}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                              {item.name || item.item_name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              <span style={{ textTransform: 'uppercase', fontWeight: 700, color: '#3b82f6' }}>{item.type === 'PACKAGE' ? 'Package' : item.category_name}</span>
                              {item.item_code && ` • ${item.item_code}`}
                            </div>
                          </div>
                          <div style={{ fontWeight: 800, color: '#059669' }}>
                            {parseFloat(item.type === 'PACKAGE' ? item.price : item.default_sale_price).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="table-responsive" style={{ border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden' }}>
              <table className="table" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Description</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', width: '100px' }}>Qty</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', width: '140px' }}>Unit Price</th>
                    <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', width: '140px' }}>Subtotal</th>
                    <th style={{ padding: '1rem', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                         <Package size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                         <p>No items added. Use the search bar above to build the voucher.</p>
                      </td>
                    </tr>
                  ) : selectedItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.name}</div>
                        <div style={{ fontSize: '0.7rem', display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <span className="status-badge status-scheduled" style={{ padding: '1px 6px', fontSize: '10px' }}>{item.item_type}</span>
                        </div>
                        {item.item_type === 'INVESTIGATION' && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: item.laboratory_id ? '#94a3b8' : '#ef4444', textTransform: 'uppercase', marginBottom: '4px' }}>
                              Send to Laboratory: {!item.laboratory_id && <span style={{ color: '#ef4444' }}>(REQUIRED)</span>}
                            </div>
                            <select 
                              className="form-control" 
                              style={{ 
                                height: '32px', 
                                padding: '0 0.5rem', 
                                fontSize: '0.75rem', 
                                border: item.laboratory_id ? '1px dashed #cbd5e1' : '2px solid #fca5a5',
                                backgroundColor: item.laboratory_id ? 'white' : '#fff1f2'
                              }}
                              value={item.laboratory_id || ''}
                              onChange={(e) => updateItem(idx, 'laboratory_id', e.target.value)}
                            >
                              <option value="">-- Choose Lab --</option>
                              {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
                            </select>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <input 
                          type="number" className="form-control text-center" style={{ height: '40px', fontWeight: 700 }}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                        />
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <input 
                          type="number" className="form-control" style={{ height: '40px', fontWeight: 600, backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                          value={item.unit_price}
                          readOnly
                          onWheel={(e) => e.target.blur()}
                        />
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input 
                            type="checkbox" 
                            id={`foc-${idx}`}
                            checked={!!item.is_foc} 
                            onChange={(e) => handleFocToggle(idx, e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <label htmlFor={`foc-${idx}`} style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>FOC</label>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>
                        {item.subtotal.toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <button type="button" className="btn-icon text-red-500 hover:bg-red-50" onClick={() => removeItem(idx)}><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Referrals & Totals */}
        <div className="flex flex-col gap-6">
          
          {/* Referrals Redesign */}
          <div className="card shadow-sm" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                <UserPlus size={20} className="text-blue-600" /> Referrals
              </h3>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ padding: '6px 12px', fontSize: '0.875rem', fontWeight: 600, borderStyle: 'dashed', borderColor: '#cbd5e1', color: '#475569', borderRadius: '8px', backgroundColor: 'white' }} 
                onClick={addReferral}
              >
                <Plus size={16} style={{ marginRight: '4px' }} /> Add Referral
              </button>
            </div>
            
            {referrals.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', backgroundColor: 'white', border: '1px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
                <UserPlus size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No referrals assigned to this voucher.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {referrals.map((ref, idx) => (
                  <div key={idx} style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <button 
                      type="button" 
                      onClick={() => removeReferral(idx)} 
                      style={{ position: 'absolute', right: '12px', top: '12px', color: '#cbd5e1', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }} 
                      className="hover:bg-red-50 hover:text-red-500"
                      title="Remove Referral"
                    >
                      <X size={16} />
                    </button>
                    
                    <div className="form-group mb-4">
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Referred By</label>
                      <select 
                        className="form-control" required 
                        style={{ width: '100%', height: '42px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}
                        value={ref.referred_person_id}
                        onChange={(e) => updateReferral(idx, 'referred_person_id', e.target.value)}
                      >
                        <option value="">-- Select Person --</option>
                        {referredPersons.map(rp => <option key={rp.id} value={rp.id}>{rp.name}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Rate (%)</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="number" className="form-control" 
                            style={{ height: '38px', paddingRight: '28px', fontWeight: 700, fontSize: '0.95rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            value={ref.percentage}
                            onChange={(e) => updateReferral(idx, 'percentage', e.target.value)}
                          />
                          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>%</span>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Amount (MMK)</label>
                        <input 
                          type="number" className="form-control" 
                          style={{ height: '38px', fontWeight: 800, fontSize: '1.05rem', color: '#059669', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                          value={ref.amount}
                          onChange={(e) => updateReferral(idx, 'amount', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Summary */}
          <div className="card shadow-lg" style={{ padding: '1.75rem', border: '1px solid #2563eb', borderTopWidth: '4px', backgroundColor: 'white' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Calculator size={18} className="text-blue-600" /> Summary
            </h3>
            
            <div className="flex flex-col gap-4 mb-6" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem' }}>
              <div className="flex justify-between items-center">
                <span style={{ color: '#64748b' }}>Gross Amount</span>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: '#64748b' }}>Total Discount</span>
                <div style={{ width: '150px' }}>
                   <input 
                    type="number" className="form-control" style={{ height: '36px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    onWheel={(e) => e.target.blur()}
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
               <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Net Payable Amount</div>
               <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#2563eb', letterSpacing: '-0.02em' }}>
                 {netTotal.toLocaleString()} <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>MMK</span>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  Voucher Date {editVoucherId && <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>(Locked)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    className="form-control" 
                    style={{ height: '42px', borderRadius: '8px', paddingLeft: '36px', backgroundColor: editVoucherId ? '#f1f5f9' : 'white', cursor: editVoucherId ? 'not-allowed' : 'default' }}
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    disabled={!!editVoucherId}
                  />
                  <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  TCA Date (To Come Again)
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    className="form-control" 
                    style={{ height: '42px', borderRadius: '8px', paddingLeft: '36px' }}
                    value={tcaDate}
                    onChange={(e) => setTcaDate(e.target.value)}
                  />
                  <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>Notes</label>
                <textarea 
                  className="form-control" 
                  style={{ borderRadius: '8px', minHeight: '80px', padding: '10px', fontSize: '0.9rem' }}
                  placeholder="Optional details or instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group mb-6">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem' }}>Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {['Cash', 'KBZ Pay', 'Wave Pay', 'CB Pay'].map(method => (
                  <button 
                    key={method}
                    type="button"
                    className={`btn ${paymentMethod === method ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {paymentMethod === method && <CreditCard size={14} />}
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full shadow-md" style={{ height: '60px', fontSize: '1.25rem', fontWeight: 800, borderRadius: '12px' }} disabled={loading}>
               {loading ? 'Processing...' : 'Complete Voucher'}
            </button>
          </div>
          
          {selectedItems.some(i => i.item_type === 'INVESTIGATION' && !i.laboratory_id) && (
            <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', color: '#9a3412', fontSize: '0.8rem' }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <p style={{ margin: 0 }}>Please ensure all <strong>Investigations</strong> have a Laboratory assigned before finishing.</p>
            </div>
          )}

        </div>
        </div>
        </form>

        <style dangerouslySetInnerHTML={{ __html: `        @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .search-dropdown { max-height: 400px; overflow-y: auto; }
        .w-full { width: 100%; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-8 { margin-bottom: 2rem; }
        .shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
        .shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
      `}} />

      <AddPatientModal 
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        onSave={handleNewPatientSave}
        apiBase={API_BASE}
      />
    </div>
  );
}