import React, { useState, useEffect, useRef } from 'react';
import { Save, Image as ImageIcon, CheckCircle } from 'lucide-react';

import apiRequest from '../../utils/api';
import { API_BASE } from '../../config';

// Helper to convert database margin values (like '10px', '5mm', '0.5in') to numerical inches
const parseToInches = (value) => {
  if (!value) return '0.25'; // Default to 0.25 inches if empty
  
  const numeric = parseFloat(value);
  if (isNaN(numeric)) return '0.25';
  
  if (value.toLowerCase().endsWith('px')) {
    return (numeric / 96).toFixed(2); // 1 inch = 96px
  }
  if (value.toLowerCase().endsWith('mm')) {
    return (numeric / 25.4).toFixed(2); // 1 inch = 25.4mm
  }
  if (value.toLowerCase().endsWith('in')) {
    return numeric.toString();
  }
  
  // If no known unit, assume it's already in inches
  return numeric.toString();
};

// Helper to format numerical inches to CSS string for saving
const formatToInchesCSS = (value) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) return '0.25in';
  return `${numeric}in`;
};

export default function VoucherSettings() {
  const [formData, setFormData] = useState({
    marginTop: '0.25',
    marginRight: '0.25',
    marginBottom: '0.25',
    marginLeft: '0.25',
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
      const res = await apiRequest('/settings/voucher');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          marginTop: parseToInches(data.margin_top || '10px'),
          marginRight: parseToInches(data.margin_right || '10px'),
          marginBottom: parseToInches(data.margin_bottom || '10px'),
          marginLeft: parseToInches(data.margin_left || '10px'),
          width: data.width || '100%',
          height: data.height || 'auto',
          address: data.address || '',
          description: data.description || ''
        });
        if (data.icon_path) {
          try {
            const signedUrlRes = await apiRequest(`/files/signed-url?key=${data.icon_path}`);
            if (signedUrlRes.ok) {
              const { url } = await signedUrlRes.json();
              setCurrentIcon(url);
            } else {
              setCurrentIcon(`${API_BASE.replace('/api', '')}/uploads/${data.icon_path}`);
            }
          } catch (err) {
            setCurrentIcon(`${API_BASE.replace('/api', '')}/uploads/${data.icon_path}`);
          }
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
    submitData.append('margin_top', formatToInchesCSS(formData.marginTop));
    submitData.append('margin_right', formatToInchesCSS(formData.marginRight));
    submitData.append('margin_bottom', formatToInchesCSS(formData.marginBottom));
    submitData.append('margin_left', formatToInchesCSS(formData.marginLeft));
    submitData.append('width', formData.width);
    submitData.append('height', formData.height);
    submitData.append('address', formData.address);
    submitData.append('description', formData.description);

    if (selectedFile) {
      submitData.append('icon', selectedFile);
    }

    try {
      const res = await apiRequest('/settings/voucher', {
        method: 'PUT',
        body: submitData
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg('Settings updated successfully!');
        if (data.icon_path) {
          try {
            const signedUrlRes = await apiRequest(`/files/signed-url?key=${data.icon_path}`);
            if (signedUrlRes.ok) {
              const { url } = await signedUrlRes.json();
              setCurrentIcon(url);
            } else {
              setCurrentIcon(`${API_BASE.replace('/api', '')}/uploads/${data.icon_path}`);
            }
          } catch (err) {
            setCurrentIcon(`${API_BASE.replace('/api', '')}/uploads/${data.icon_path}`);
          }
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
              <h3 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem', fontSize: '1.125rem' }}>Print Margins (Inches)</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>Enter print margins in inches (e.g., 0.5 or 1.0). The system will automatically convert and apply these to your print layout.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.875rem' }}>Top Margin (in)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    name="marginTop" 
                    value={formData.marginTop} 
                    onChange={handleInputChange} 
                    className="form-control" 
                    placeholder="e.g., 0.5" 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.875rem' }}>Right Margin (in)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    name="marginRight" 
                    value={formData.marginRight} 
                    onChange={handleInputChange} 
                    className="form-control" 
                    placeholder="e.g., 0.5" 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.875rem' }}>Bottom Margin (in)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    name="marginBottom" 
                    value={formData.marginBottom} 
                    onChange={handleInputChange} 
                    className="form-control" 
                    placeholder="e.g., 0.5" 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.875rem' }}>Left Margin (in)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    name="marginLeft" 
                    value={formData.marginLeft} 
                    onChange={handleInputChange} 
                    className="form-control" 
                    placeholder="e.g., 0.5" 
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
