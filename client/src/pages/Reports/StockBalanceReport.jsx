import React, { useState, useEffect } from 'react';
import { Package, Search, Download, Printer, Filter, Calendar, ArrowRight, History, BarChart3 } from 'lucide-react';

import apiRequest from '../../utils/api';

export default function StockBalanceReport() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Pharmacy');

  // New Tab States: 'balance', 'movement', or 'analytics'
  const [activeTab, setActiveTab] = useState('balance'); 
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Movement filters inside Tab 2
  const [movementSearchCode, setMovementSearchCode] = useState('');
  const [movementSearchName, setMovementSearchName] = useState('');

  useEffect(() => {
    fetchStockItems();
  }, []);

  useEffect(() => {
    if (activeTab === 'movement' || activeTab === 'analytics') {
      fetchHistoryData();
    }
  }, [activeTab, startDate, endDate]);

  const fetchStockItems = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/reports/stock-balance');
      if (res.ok) {
        const data = await res.json();
        setItems(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch stock balance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiRequest(`/reports/stock?start_date=${startDate}&end_date=${endDate}`);
      if (res.ok) {
        const result = await res.json();
        setHistoryData(result);
      }
    } catch (err) {
      console.error('Failed to fetch stock history data:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.item_code || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || (item.category_name || '').toLowerCase() === filterCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  const totalValuation = filteredItems.reduce((sum, item) => {
    return sum + parseFloat(item.total_value || 0);
  }, 0);

  // Client-side filtering of stock movement list
  const filteredMovement = (historyData?.stockMovement || []).filter(m => {
    const matchesCode = !movementSearchCode || (m.item_code || '').toLowerCase().includes(movementSearchCode.toLowerCase());
    const matchesName = !movementSearchName || (m.item_name || '').toLowerCase().includes(movementSearchName.toLowerCase());
    return matchesCode && matchesName;
  });

  const categories = ['all', ...new Set(items.map(i => i.category_name))].filter(Boolean);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modern-dashboard" style={{ padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Title & Filters Row */}
      <div className="flex justify-between items-center mb-6 no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Stock & Inventory Reports</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Real-time stock balance, valuation, and transaction history tracker.</p>
        </div>
        
        {/* Dynamic Filters depending on activeTab */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {activeTab === 'balance' && (
            <>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>

              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="Search items..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1', outline: 'none', width: '250px' }}
                />
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </>
          )}

          {activeTab === 'movement' && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Date Range Picker */}
              <div className="date-picker-modern" style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <Calendar size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  style={{ border: 'none', outline: 'none', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                />
                <ArrowRight size={14} color="#94a3b8" style={{ margin: '0 8px' }} />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  style={{ border: 'none', outline: 'none', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
                />
              </div>

              {/* Stock Code Filter */}
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="Filter Stock Code..." 
                  value={movementSearchCode}
                  onChange={(e) => setMovementSearchCode(e.target.value)}
                  style={{ padding: '0.55rem 1rem 0.55rem 2.25rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1', outline: 'none', width: '180px', fontSize: '0.85rem' }}
                />
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              {/* Stock Name Filter */}
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="Filter Stock Name..." 
                  value={movementSearchName}
                  onChange={(e) => setMovementSearchName(e.target.value)}
                  style={{ padding: '0.55rem 1rem 0.55rem 2.25rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1', outline: 'none', width: '180px', fontSize: '0.85rem' }}
                />
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="date-picker-modern" style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <Calendar size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                style={{ border: 'none', outline: 'none', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
              />
              <ArrowRight size={14} color="#94a3b8" style={{ margin: '0 8px' }} />
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                style={{ border: 'none', outline: 'none', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}
              />
            </div>
          )}
          
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', backgroundColor: 'white', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-nav no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <button 
          onClick={() => setActiveTab('balance')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.6rem 1.25rem', 
            borderRadius: '9999px', 
            border: '1px solid transparent', 
            backgroundColor: activeTab === 'balance' ? '#ecfdf5' : '#f8fafc', 
            color: activeTab === 'balance' ? '#10b981' : '#64748b', 
            fontWeight: 700, 
            fontSize: '0.9rem', 
            cursor: 'pointer', 
            transition: 'all 0.2s' 
          }}
        >
          <Package size={18} />
          <span>Stock Balance</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('movement')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.6rem 1.25rem', 
            borderRadius: '9999px', 
            border: '1px solid transparent', 
            backgroundColor: activeTab === 'movement' ? '#eff6ff' : '#f8fafc', 
            color: activeTab === 'movement' ? '#3b82f6' : '#64748b', 
            fontWeight: 700, 
            fontSize: '0.9rem', 
            cursor: 'pointer', 
            transition: 'all 0.2s' 
          }}
        >
          <History size={18} />
          <span>Stock Movement History</span>
        </button>

        <button 
          onClick={() => setActiveTab('analytics')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.6rem 1.25rem', 
            borderRadius: '9999px', 
            border: '1px solid transparent', 
            backgroundColor: activeTab === 'analytics' ? '#fef3c7' : '#f8fafc', 
            color: activeTab === 'analytics' ? '#d97706' : '#64748b', 
            fontWeight: 700, 
            fontSize: '0.9rem', 
            cursor: 'pointer', 
            transition: 'all 0.2s' 
          }}
        >
          <BarChart3 size={18} />
          <span>Inventory Analytics</span>
        </button>
      </div>

      {/* Render Active Tab Content */}
      {activeTab === 'balance' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Items Listed</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>{filteredItems.length}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Asset Valuation</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', marginTop: '0.5rem' }}>
                {totalValuation.toLocaleString()} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>MMK</span>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock Alerts</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706', marginTop: '0.5rem' }}>
                {filteredItems.filter(i => parseInt(i.total_quantity) <= parseInt(i.min_stock_level)).length}
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Code</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Name</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Balance Qty</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Avg. Cost</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Loading inventory data...</td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>No items found.</td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const qty = parseInt(item.total_quantity) || 0;
                      const minLvl = parseInt(item.min_stock_level) || 0;
                      const cost = parseFloat(item.avg_cost) || 0;
                      const val = parseFloat(item.total_value) || 0;
                      const isLow = qty <= minLvl;

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isLow ? '#fffbeb' : 'white', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: 500, fontSize: '0.875rem' }}>{item.item_code}</td>
                          <td style={{ padding: '1rem 1.5rem', color: '#0f172a', fontWeight: 700, fontSize: '0.9rem' }}>
                            {item.name}
                            {isLow && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', padding: '0.1rem 0.4rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '4px', fontWeight: 800 }}>LOW</span>}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.875rem' }}>{item.category_name || '-'}</td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 800, color: isLow ? '#d97706' : '#1e293b', fontSize: '1rem' }}>
                            {qty} <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{item.unit}</span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.875rem' }}>{cost.toLocaleString()}</td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '0.9rem' }}>{val.toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Stock Movement History */}
      {activeTab === 'movement' && (
        historyLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' }}>
            <div className="pulse-loader animate-pulse" style={{ width: '40px', height: '40px', backgroundColor: '#3b82f6', borderRadius: '50%', marginBottom: '1rem' }}></div>
            <p style={{ color: '#64748b', fontWeight: 600 }}>Loading stock transactions...</p>
          </div>
        ) : historyData ? (
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Stock Movement History Log</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', margin: 0 }}>List of all in-and-out warehouse stock transactions for the selected dates.</p>
            </div>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Timestamp</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Stock Code</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Item Name</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'center' }}>Type</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovement.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: '#64748b' }}>{new Date(m.date).toLocaleString()}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>{m.item_code || '-'}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{m.item_name}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '9999px', 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          backgroundColor: m.type === 'IN' ? '#ecfdf5' : m.type === 'OUT' ? '#fef2f2' : '#eff6ff',
                          color: m.type === 'IN' ? '#059669' : m.type === 'OUT' ? '#dc2626' : '#2563eb'
                        }}>{m.type}</span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', textAlign: 'center', fontWeight: 700, color: m.quantity < 0 ? '#dc2626' : '#059669' }}>{m.quantity}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: '#475569' }}>{m.reason}</td>
                    </tr>
                  ))}
                  {filteredMovement.length === 0 && (
                    <tr><td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>No stock movements found matching filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>Failed to load stock movement.</div>
        )
      )}

      {/* Tab 3: Inventory Analytics */}
      {activeTab === 'analytics' && (
        historyLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' }}>
            <div className="pulse-loader animate-pulse" style={{ width: '40px', height: '40px', backgroundColor: '#3b82f6', borderRadius: '50%', marginBottom: '1rem' }}></div>
            <p style={{ color: '#64748b', fontWeight: 600 }}>Analyzing inventory analytics...</p>
          </div>
        ) : historyData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asset Valuation</span>
                <div style={{ color: 'white', fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>
                  {historyData.valuation?.toLocaleString()} <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)' }}>MMK</span>
                </div>
              </div>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock Items</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626', marginTop: '0.5rem' }}>{historyData.lowStock?.length}</div>
              </div>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expiring Soon Batches</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706', marginTop: '0.5rem' }}>{historyData.expiringSoon?.length}</div>
              </div>
            </div>

            {/* Addition Breakdown & Profit Margins */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Stock Addition Breakdown</h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', margin: 0 }}>Breakdown of how items entered the inventory in this period.</p>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Source</th>
                      <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'center' }}>Qty Added</th>
                      <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Value Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.additionBreakdown?.map((b, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{b.source}</td>
                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>{parseInt(b.total_qty).toLocaleString()}</td>
                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{parseFloat(b.total_value).toLocaleString()} MMK</td>
                      </tr>
                    ))}
                    {(!historyData.additionBreakdown || historyData.additionBreakdown.length === 0) && (
                      <tr><td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>No additions in this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Profit Margins Analysis (Top 20 Items)</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Item</th>
                      <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Sale Price</th>
                      <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Margin Amt</th>
                      <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.itemProfitability?.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{p.name}</td>
                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', textAlign: 'right', color: '#475569' }}>{parseFloat(p.s_price).toLocaleString()}</td>
                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{parseFloat(p.margin_amt).toLocaleString()}</td>
                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{p.margin_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: 600 }}>Failed to load analytics dashboard.</div>
        )
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .modern-dashboard * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; }
        @keyframes pulse { 
          0% { transform: scale(0.8); opacity: 0.5; } 
          50% { transform: scale(1); opacity: 1; } 
          100% { transform: scale(0.8); opacity: 0.5; } 
        }
        @media print {
          body { background: white; }
          .modern-dashboard { padding: 0 !important; background: white !important; }
          .no-print { display: none !important; }
          table { border: 1px solid #e2e8f0; }
          th { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
          tr:nth-child(even) { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
        }
      `}} />
    </div>
  );
}