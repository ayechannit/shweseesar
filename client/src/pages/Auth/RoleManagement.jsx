import React, { useState, useEffect } from 'react';
import apiRequest from '../../utils/api';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';

const AVAILABLE_PERMISSIONS = [
  // Main Menu
  { id: 'access_dashboard', label: 'Main Menu: Access Dashboard' },
  { id: 'access_reception', label: 'Main Menu: Access Reception' },
  { id: 'access_billing', label: 'Main Menu: Access Billing' },
  { id: 'access_referral_payouts', label: 'Main Menu: Access Referral Payouts' },
  { id: 'access_clinic_referrals', label: 'Main Menu: Access Clinic Referrals' },
  
  // Operations
  { id: 'access_inventory', label: 'Operations: Access Inventory' },
  { id: 'access_purchases', label: 'Operations: Access Purchases' },
  { id: 'access_price_list', label: 'Operations: Access Price List' },
  { id: 'access_gp_packages', label: 'Operations: Access GP Packages' },
  { id: 'access_laboratory', label: 'Operations: Access Laboratory' },
  { id: 'access_lab_pricing', label: 'Operations: Access Lab Pricing Setup' },

  // Analysis
  { id: 'access_tca_dashboard', label: 'Analysis: Access TCA Dashboard' },
  { id: 'access_reports_center', label: 'Analysis: Access Reports Center' },
  { id: 'access_revenue_dashboard', label: 'Analysis: Access Revenue Dashboard' },
  { id: 'access_referral_dashboard', label: 'Analysis: Access Referral Dashboard' },
  { id: 'access_ext_referral_dashboard', label: 'Analysis: Access Ext. Referral Dashboard' },
  { id: 'access_lab_dashboard', label: 'Analysis: Access Lab Dashboard' },
  { id: 'access_inventory_dashboard', label: 'Analysis: Access Inventory Dashboard' },
  { id: 'access_stock_balance_report', label: 'Analysis: Access Stock Balance Report' },
  { id: 'access_purchase_dashboard', label: 'Analysis: Access Purchase Dashboard' },
  { id: 'access_lab_payouts', label: 'Analysis: Access Lab Payouts' },

  // System Administration
  { id: 'manage_users', label: 'Admin: Manage Users & Roles' },

  // Master Data
  { id: 'access_master_patients', label: 'Master Data: Access Patients' },
  { id: 'access_master_physicians', label: 'Master Data: Access Physicians' },
  { id: 'access_master_mo', label: 'Master Data: Access Medical Officers' },
  { id: 'access_master_nurses', label: 'Master Data: Access Nurses' },
  { id: 'access_master_suppliers', label: 'Master Data: Access Suppliers' },
  { id: 'access_master_referrers', label: 'Master Data: Access Referred Persons' },
  { id: 'access_master_laboratories', label: 'Master Data: Access Laboratories' },
  { id: 'access_master_refer_clinics', label: 'Master Data: Access Refer Clinics' },
  { id: 'access_voucher_settings', label: 'Master Data: Access Voucher Settings' },
];

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/auth/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      } else {
        setError('Failed to fetch roles data');
      }
    } catch (err) {
      setError('An error occurred while fetching roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || []
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permissions: []
      });
    }
    setShowModal(true);
  };

  const handlePermissionToggle = (permId) => {
    setFormData(prev => {
      const perms = new Set(prev.permissions);
      if (perms.has(permId)) {
        perms.delete(permId);
      } else {
        perms.add(permId);
      }
      return { ...prev, permissions: Array.from(perms) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingRole ? `/auth/roles/${editingRole.id}` : '/auth/roles';
      const method = editingRole ? 'PUT' : 'POST';
      
      const res = await apiRequest(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowModal(false);
        fetchRoles();
      } else {
        const data = await res.json();
        alert(data.error || 'Operation failed');
      }
    } catch (err) {
      alert('An error occurred while saving the role');
    }
  };

  const handleDelete = async (id) => {
    if (id === 1) {
      alert("The core Admin role cannot be deleted.");
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this role? This cannot be undone.")) return;

    try {
      const res = await apiRequest(`/auth/roles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchRoles();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete role');
      }
    } catch (err) {
      alert('An error occurred while deleting');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading roles...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Role & Permission Management</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add New Role
        </button>
      </div>

      {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem', marginBottom: '1rem', borderRadius: '0.25rem' }}>{error}</div>}

      <div className="card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Description</th>
                <th>Permissions Count</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td><strong>{role.name}</strong> {role.id === 1 && <span className="status-badge" style={{ backgroundColor: '#dcfce7', color: '#166534', marginLeft: '0.5rem' }}>System Default</span>}</td>
                  <td>{role.description || '-'}</td>
                  <td>
                    <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                      {role.permissions ? role.permissions.length : 0} assigned
                    </span>
                  </td>
                  <td>
                    <div className="actions" style={{ justifyContent: 'center' }}>
                      <button
                        onClick={() => handleOpenModal(role)}
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem', opacity: role.id === 1 ? 0.5 : 1 }}
                        disabled={role.id === 1}
                        title={role.id === 1 ? "System Admin role cannot be edited" : "Edit Role"}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.5rem', opacity: role.id === 1 ? 0.5 : 1 }}
                        disabled={role.id === 1}
                        title={role.id === 1 ? "System Admin role cannot be deleted" : "Delete Role"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingRole ? 'Edit Role' : 'Add New Role'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }} autoComplete="off">
              <div className="form-group mb-4">
                <label className="form-label">Role Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g. Receptionist"
                />
              </div>
              
              <div className="form-group mb-4">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this role do?"
                />
              </div>

              <div className="form-group mb-6">
                <label className="form-label">
                  Assign Permissions
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', backgroundColor: '#f8fafc' }}>
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm.id)}
                        onChange={() => handlePermissionToggle(perm.id)}
                        style={{ width: '1.25rem', height: '1.25rem', accentColor: '#2563eb' }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#334155' }}>
                        {perm.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}