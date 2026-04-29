import React, { useState, useEffect, useRef } from 'react';
import { Save, Image as ImageIcon, CheckCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function VoucherSettings() {
  const [formData, setFormData] = useState({
    marginTop: '10px',
    marginRight: '10px',
    marginBottom: '10px',
    marginLeft: '10px',
    width: '100%',
    height: 'auto',
    address: 'Shwe See Sar Clinic, Yangon',
    description: 'Thank you for your visit.'
  });
  const [currentIcon, setCurrentIcon] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/voucher`);
      if (res.ok) {
        const data = await res.json();
        setFormData({
          marginTop: data.margin_top || '10px',
          marginRight: data.margin_right || '10px',
          marginBottom: data.margin_bottom || '10px',
          marginLeft: data.margin_left || '10px',
          width: data.width || '100%',
          height: data.height || 'auto',
          address: data.address || '',
          description: data.description || ''
        });
        if (data.icon_path) {
          setCurrentIcon(`${API_BASE.replace('/api', '')}/uploads/${data.icon_path}`);
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    const submitData = new FormData();
    submitData.append('margin_top', formData.marginTop);
    submitData.append('margin_right', formData.marginRight);
    submitData.append('margin_bottom', formData.marginBottom);
    submitData.append('margin_left', formData.marginLeft);
    submitData.append('width', formData.width);
    submitData.append('height', formData.height);
    submitData.append('address', formData.address);
    submitData.append('description', formData.description);

    if (selectedFile) {
      submitData.append('icon', selectedFile);
    }

    try {
      const res = await fetch(`${API_BASE}/settings/voucher`, {
        method: 'PUT',
        body: submitData
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg('Settings updated successfully!');
        if (data.icon_path) {
          setCurrentIcon(`${API_BASE.replace('/api', '')}/uploads/${data.icon_path}`);
        }
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        alert('Failed to update settings');
      }
    } catch (err) {
      console.error('Error saving settings', err);
      alert('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Voucher Print Settings</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Configure the appearance and details of the printed vouchers.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', display: 'block' }}>
        <div style={{ padding: '2rem' }}>
          {successMsg && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#ecfdf5', color: '#047857', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #a7f3d0', fontWeight: 500 }}>
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Clinic Logo (Icon)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <div 
                  style={{ 
                    width: '96px', height: '96px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                    backgroundImage: 'linear-gradient(45deg, #f8fafc 25%, transparent 25%), linear-gradient(-45deg, #f8fafc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8fafc 75%), linear-gradient(-45deg, transparent 75%, #f8fafc 75%)', 
                    backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' 
                  }}
                >
                  {previewUrl || currentIcon ? (
                    <img src={previewUrl || currentIcon} alt="Clinic Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <ImageIcon size={32} color="#cbd5e1" />
                  )}
                </div>
                <div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current.click()}
                    className="btn btn-outline"
                    style={{ marginBottom: '0.5rem' }}
                  >
                    Choose Image
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Recommended: Square image, max 1MB. (PNG or JPG)</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Print Width</label>
                <input 
                  type="text" 
                  name="width" 
                  value={formData.width} 
                  onChange={handleInputChange} 
                  className="form-control" 
                  placeholder="e.g., 100%, 80mm, 300px" 
                />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>CSS value (e.g., '100%', '80mm' for thermal printers).</p>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Print Height</label>
                <input 
                  type="text" 
                  name="height" 
                  value={formData.height} 
                  onChange={handleInputChange} 
                  className="form-control" 
                  placeholder="e.g., auto, 100vh" 
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '1rem', fontSize: '1.125rem' }}>Print Margins</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.875rem' }}>Top Margin</label>
                  <input 
                    type="text" 
                    name="marginTop" 
                    value={formData.marginTop} 
                    onChange={handleInputChange} 
                    className="form-control" 
                    placeholder="e.g., 10px" 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.875rem' }}>Right Margin</label>
                  <input 
                    type="text" 
                    name="marginRight" 
                    value={formData.marginRight} 
                    onChange={handleInputChange} 
                    className="form-control" 
                    placeholder="e.g., 10px" 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.875rem' }}>Bottom Margin</label>
                  <input 
                    type="text" 
                    name="marginBottom" 
                    value={formData.marginBottom} 
                    onChange={handleInputChange} 
                    className="form-control" 
                    placeholder="e.g., 10px" 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.875rem' }}>Left Margin</label>
                  <input 
                    type="text" 
                    name="marginLeft" 
                    value={formData.marginLeft} 
                    onChange={handleInputChange} 
                    className="form-control" 
                    placeholder="e.g., 10px" 
                  />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '1rem', fontSize: '1.125rem' }}>Receipt Content</h3>
              
              <div className="form-group">
                <label className="form-label">Clinic Address / Header Info</label>
                <textarea 
                  name="address" 
                  value={formData.address} 
                  onChange={handleInputChange} 
                  rows="3"
                  className="form-control" 
                  placeholder="Enter clinic address, phone numbers, etc."
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Footer Description / Thanks Note</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  rows="2"
                  className="form-control" 
                  placeholder="e.g., Thank you for your visit. Get well soon!"
                ></textarea>
              </div>
            </div>

            <div className="form-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : <><Save size={18} /> Save Settings</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
