import React, { useState, useEffect } from 'react';
import { Package, Search, Download, Printer, Filter } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function StockBalanceReport() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStockItems();
  }, []);

  const fetchStockItems = async () => {
    setLoading(true);
    try {
      // Fetching with a high limit to get a comprehensive report
      const res = await fetch(`${API_BASE}/stock/items?limit=5000`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch stock balance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const isPharmacy = (item.category_name || '').toLowerCase() === 'pharmacy';
    const matchesSearch = 
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.item_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return isPharmacy && matchesSearch;
  });

  const totalValuation = filteredItems.reduce((sum, item) => {
    return sum + (parseInt(item.total_quantity || 0) * parseFloat(item.default_purchase_price || 0));
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modern-dashboard" style={{ padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      <div className="flex justify-between items-center mb-8 no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Stock Balance Report</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Current inventory levels and valuation across all items.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
          
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', backgroundColor: 'white', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
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
                filteredItems.map((item, idx) => {
                  const qty = parseInt(item.total_quantity) || 0;
                  const minLvl = parseInt(item.min_stock_level) || 0;
                  const cost = parseFloat(item.default_purchase_price) || 0;
                  const val = qty * cost;
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

      <style dangerouslySetInnerHTML={{ __html: `
        .modern-dashboard * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; }
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
