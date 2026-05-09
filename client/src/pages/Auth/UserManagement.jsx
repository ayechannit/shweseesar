import React, { useState, useEffect } from 'react';
import apiRequest from '../../utils/api';
import { UserPlus, X, Edit2, ShieldAlert } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        apiRequest('/users'),
        apiRequest('/auth/roles')
      ]);
      
      if (usersRes.ok && rolesRes.ok) {
        const usersData = await usersRes.json();
        const rolesData = await rolesRes.json();
        setUsers(usersData);
        setRoles(rolesData);
      } else {
        setError('Failed to fetch user data');
      }
    } catch (err) {
      setError('An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        username: user.username,
        email: user.email || '',
        password: '', // Don't show existing password
        role_id: user.role_id,
        is_active: user.is_active
      });
    } else {
      setSelectedUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        role_id: roles.length > 0 ? roles[0].id : '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedUser ? `/users/${selectedUser.id}` : '/auth/register';
      const method = selectedUser ? 'PUT' : 'POST';
      
      const res = await apiRequest(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Operation failed');
      }
    } catch (err) {
      alert('An error occurred');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary"
        >
          <UserPlus size={16} style={{ marginRight: '0.5rem' }} /> Add New User
        </button>
      </div>

      {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem', marginBottom: '1rem', borderRadius: '0.25rem' }}>{error}</div>}

      <div className="card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.username}</strong></td>
                  <td>{user.email || '-'}</td>
                  <td>{user.role_name}</td>
                  <td>
                    <span className="status-badge" style={{ backgroundColor: user.is_active ? '#dcfce7' : '#fee2e2', color: user.is_active ? '#166534' : '#991b1b' }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td>
                    <div className="actions" style={{ justifyContent: 'center' }}>
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <Edit2 size={16} />
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
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedUser ? 'Edit User' : 'Add User'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }} autoComplete="off">
              <div className="form-group mb-4">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  autoComplete="new-username"
                />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  autoComplete="email"
                />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">
                  {selectedUser ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  className="form-control"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!selectedUser}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Role</label>
                <select
                  className="form-control"
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group mb-6" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '1.25rem', height: '1.25rem' }}
                />
                <label htmlFor="is_active" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Active Account
                </label>
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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;