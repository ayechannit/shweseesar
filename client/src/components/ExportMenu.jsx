import React, { useState, useEffect, useRef } from 'react';
import { Download, ChevronDown } from 'lucide-react';

// Export button with "Summary" / "Details" options.
// onExport(mode) is called with 'summary' or 'items'.
export default function ExportMenu({ onExport, style }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const run = async (mode) => {
    setOpen(false);
    setBusy(true);
    try {
      await onExport(mode);
    } catch (err) {
      console.error(err);
      alert('Export failed');
    } finally {
      setBusy(false);
    }
  };

  const itemStyle = {
    display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 0.9rem',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: '#334155'
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn btn-outline"
        style={{ backgroundColor: 'white', ...style }}
        onClick={() => setOpen(o => !o)}
        disabled={busy}
      >
        <Download size={16} /> {busy ? 'Exporting...' : 'Export CSV'} <ChevronDown size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 50, minWidth: '220px',
          background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)', overflow: 'hidden'
        }}>
          <button type="button" style={itemStyle} onClick={() => run('summary')}>
            <div style={{ fontWeight: 600 }}>Summary</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>One row per voucher</div>
          </button>
          <button type="button" style={{ ...itemStyle, borderTop: '1px solid #f1f5f9' }} onClick={() => run('items')}>
            <div style={{ fontWeight: 600 }}>Details</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>One row per item</div>
          </button>
        </div>
      )}
    </div>
  );
}
