import React, { useState, useEffect } from 'react';
import { 
  Search, Save, ChevronLeft, FlaskConical, 
  DollarSign, Percent, Info, RefreshCw, Filter,
  ArrowRight, CheckCircle, AlertCircle, X, Layout
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function LabTestPricing() {
  const [laboratories, setLaboratories] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [testPrices, setTestPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  useEffect(() => { fetchLaboratories(); }, []);

  useEffect(() => {
    if (selectedLabId) fetchTestPricing(selectedLabId);
    else setTestPrices([]);
  }, [selectedLabId]);

  const fetchLaboratories = async () => {
    try {
      const res = await fetch(`${API_BASE}/master-data/laboratories?limit=100`);
      const result = await res.json();
      setLaboratories(result.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchTestPricing = async (labId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/laboratories/${labId}/test-pricing`);
      const data = await res.json();
      setTestPrices(data || []);
    } catch (err) {
      console.error(err);
      showNotification('Error fetching data', 'error');
    } finally { setLoading(false); }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSavePrice = async (item) => {
    try {
      const res = await fetch(`${API_BASE}/laboratories/${selectedLabId}/test-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.item_id,
          purchase_price: item.purchase_price,
          commission_percentage: item.commission_percentage
        })
      });
      if (res.ok) showNotification(`Agreement Updated: ${item.name}`);
    } catch (err) { showNotification('Save failed', 'error'); }
  };

  const updateLocalValue = (itemId, field, value) => {
    setTestPrices(prev => prev.map(tp => 
      tp.item_id === itemId ? { ...tp, [field]: value } : tp
    ));
  };

  const filteredTests = testPrices.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLabName = laboratories.find(l => String(l.id) === String(selectedLabId))?.name;

  return (
    <div className="lab-pricing-wrapper">
      {/* Header Area */}
      <div className="pricing-header-modern">
        <div>
          <h1>Laboratory Pricing Setup</h1>
          <p>Configure custom cost agreements for your laboratory partners.</p>
        </div>
      </div>

      {/* Lab Selector Bar */}
      <div className="selector-card-modern">
        <div className="selector-grid">
          <div className="input-modern-group">
            <label>Laboratory Partner</label>
            <div className="select-wrapper">
              <FlaskConical size={18} className="select-icon" />
              <select value={selectedLabId} onChange={e => setSelectedLabId(e.target.value)}>
                <option value="">Select a partner lab...</option>
                {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="input-modern-group">
            <label>Search Investigations</label>
            <div className="search-wrapper">
              <Search size={18} className="search-icon" />
              <input 
                type="text" placeholder="Filter by test name or code..." 
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                disabled={!selectedLabId}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {!selectedLabId ? (
        <div className="empty-state-modern">
          <div className="empty-icon-circle"><FlaskConical size={40} /></div>
          <h3>Select a Lab to Begin</h3>
          <p>Choose a laboratory partner above to manage specific test costs and commission agreements.</p>
        </div>
      ) : (
        <div className="pricing-content-modern">
          <div className="content-header-stats">
            <div className="active-lab-pill">
               <span className="dot online"></span>
               <span>Editing: <strong>{selectedLabName}</strong></span>
            </div>
            <span className="results-count">{filteredTests.length} tests found</span>
          </div>

          <div className="pricing-table-container">
            <table className="modern-pricing-table">
              <thead>
                <tr>
                  <th>Investigation Test</th>
                  <th>Clinic Cost (MMK)</th>
                  <th>Comm %</th>
                  <th className="hide-mobile">Lab Payout</th>
                  <th style={{ textAlign: 'right' }}>Update</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center-padding">Analyzing agreement data...</td></tr>
                ) : filteredTests.length === 0 ? (
                  <tr><td colSpan="5" className="text-center-padding">No investigations found matching your search.</td></tr>
                ) : filteredTests.map(test => {
                  const payout = parseFloat(test.purchase_price) - (parseFloat(test.purchase_price) * (parseFloat(test.commission_percentage) / 100));
                  return (
                    <tr key={test.item_id}>
                      <td className="test-info-cell">
                        <span className="test-name">{test.name}</span>
                        <span className="test-code">{test.item_code}</span>
                      </td>
                      <td className="input-cell">
                        <div className="table-input-wrapper">
                           <input 
                             type="number" value={test.purchase_price}
                             onChange={e => updateLocalValue(test.item_id, 'purchase_price', e.target.value)}
                           />
                        </div>
                      </td>
                      <td className="input-cell">
                        <div className="table-input-wrapper pct">
                           <input 
                             type="number" value={test.commission_percentage}
                             onChange={e => updateLocalValue(test.item_id, 'commission_percentage', e.target.value)}
                           />
                           <span className="pct-sign">%</span>
                        </div>
                      </td>
                      <td className="hide-mobile">
                         <div className="payout-amount">
                           {Math.round(payout).toLocaleString()} <small>MMK</small>
                         </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-action-save" onClick={() => handleSavePrice(test)}>
                          <Save size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Responsive Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .lab-pricing-wrapper { font-family: 'Inter', system-ui, sans-serif; animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .pricing-header-modern h1 { font-size: 2rem; fontWeight: 900; color: #0f172a; margin: 0; letter-spacing: -0.04em; }
        .pricing-header-modern p { color: #64748b; margin: 0.25rem 0 2rem; font-size: 1rem; }

        .selector-card-modern {
          background: white;
          padding: 2rem;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.03);
          margin-bottom: 2rem;
        }

        .selector-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; align-items: flex-end; }
        
        .input-modern-group label { display: block; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
        
        .select-wrapper, .search-wrapper { position: relative; }
        .select-icon, .search-icon { position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        
        .selector-grid select, .selector-grid input {
          width: 100%;
          height: 52px;
          padding: 0 1.5rem 0 3.5rem;
          border-radius: 16px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          font-weight: 600;
          color: #1e293b;
          outline: none;
          transition: all 0.2s;
          font-size: 0.95rem;
          appearance: none;
        }
        
        .selector-grid select:focus, .selector-grid input:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.05); }

        .empty-state-modern { padding: 6rem 2rem; text-align: center; background: #f8fafc; border-radius: 32px; border: 2px dashed #e2e8f0; }
        .empty-icon-circle { width: 80px; height: 80px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .empty-state-modern h3 { color: #1e293b; font-weight: 700; margin-bottom: 0.5rem; }
        .empty-state-modern p { color: #64748b; max-width: 400px; margin: 0 auto; font-size: 0.95rem; line-height: 1.6; }

        .content-header-stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding: 0 0.5rem; }
        .active-lab-pill { display: flex; align-items: center; gap: 0.6rem; background: white; padding: 0.5rem 1.25rem; border-radius: 100px; border: 1px solid #e2e8f0; font-size: 0.875rem; font-weight: 600; color: #475569; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
        .results-count { font-size: 0.85rem; font-weight: 700; color: #94a3b8; }

        .pricing-table-container { background: white; border-radius: 28px; border: 1px solid #f1f5f9; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.03); overflow: hidden; }
        
        .modern-pricing-table { width: 100%; border-collapse: collapse; }
        .modern-pricing-table th { text-align: left; padding: 1.25rem 1.5rem; background: #fcfcfd; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; border-bottom: 1.5px solid #f1f5f9; }
        .modern-pricing-table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f8fafc; }
        .modern-pricing-table tr:hover td { background: #fafafa; }

        .test-info-cell { display: flex; flex-direction: column; gap: 0.25rem; }
        .test-name { font-weight: 800; color: #1e293b; font-size: 1rem; }
        .test-code { font-size: 0.75rem; color: #94a3b8; font-weight: 700; }

        .table-input-wrapper { position: relative; }
        .table-input-wrapper input { width: 100%; height: 44px; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 0 1rem; font-weight: 800; color: #0f172a; outline: none; transition: all 0.2s; background: #fcfcfd; font-size: 1rem; }
        .table-input-wrapper input:focus { border-color: #3b82f6; background: white; }
        .table-input-wrapper.pct input { padding-right: 2.25rem; color: #3b82f6; }
        .pct-sign { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); font-weight: 800; color: #94a3b8; pointer-events: none; }

        .payout-amount { font-size: 1.15rem; font-weight: 900; color: #10b981; letter-spacing: -0.02em; }
        .payout-amount small { font-size: 0.7rem; font-weight: 600; }

        .btn-action-save { background: #2563eb; color: white; border: none; padding: 0.75rem; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
        .btn-action-save:hover { transform: scale(1.1); background: #1d4ed8; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4); }

        .text-center-padding { padding: 5rem; text-align: center; color: #94a3b8; font-weight: 600; }

        @media (max-width: 768px) {
          .selector-grid { grid-template-columns: 1fr; gap: 1.25rem; }
          .hide-mobile { display: none; }
          .pricing-table-container { border-radius: 20px; }
          .modern-pricing-table th, .modern-pricing-table td { padding: 1rem; }
          .test-name { font-size: 0.9rem; }
        }

        .notification-toast { position: fixed; bottom: 2rem; right: 2rem; background: #1e293b; color: white; padding: 1.125rem 2rem; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); z-index: 10000; animation: slideUp 0.3s ease-out; font-weight: 700; display: flex; align-items: center; gap: 0.75rem; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}} />

      {/* Notification Toast */}
      {notification && (
        <div className="notification-toast" style={{ background: notification.type === 'error' ? '#ef4444' : '#1e293b' }}>
           {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} className="text-blue-400" />}
           {notification.message}
        </div>
      )}
    </div>
  );
}
