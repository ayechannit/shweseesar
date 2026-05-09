import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { masterDataConfig } from '../../config/masterDataConfig';
import apiRequest from '../../utils/api';

export default function MasterDataPage({ type }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const config = masterDataConfig[type];

  const fetchData = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/master-data/${config.table}?page=${page}&limit=${itemsPerPage}`);
      const result = await res.json();
      
      // Handle the new paginated response structure
      setData(result.data || []);
      setTotalPages(result.totalPages || 1);
      setTotalItems(result.total || 0);
    } catch (error) {
      console.error('Failed to fetch data', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchData(1);
    setFormData({});
  }, [type]);

  const handleOpenModal = (record = null) => {
    setEditingRecord(record);
    if (record) {
      const editData = { ...record };
      if (type === 'patients' && editData.date_of_birth) {
        const dob = new Date(editData.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        editData.age = age;
        editData.date_of_birth = editData.date_of_birth.split('T')[0];
      }
      setFormData(editData);
    } else {
      let initialData = {};
      if (type === 'patients') {
        const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        initialData.patient_code = `PT-${datePart}-${randomPart}`;
      }
      setFormData(initialData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setFormData({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      if (type === 'patients') {
        if (name === 'age' && value) {
          const today = new Date();
          const birthYear = today.getFullYear() - parseInt(value, 10);
          const dob = new Date(birthYear, today.getMonth(), today.getDate());
          const mm = String(dob.getMonth() + 1).padStart(2, '0');
          const dd = String(dob.getDate()).padStart(2, '0');
          updated.date_of_birth = `${dob.getFullYear()}-${mm}-${dd}`;
        } else if (name === 'date_of_birth' && value) {
          const dob = new Date(value);
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
          }
          updated.age = age;
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editingRecord ? 'PUT' : 'POST';
      const endpoint = editingRecord 
        ? `/master-data/${config.table}/${editingRecord.id}`
        : `/master-data/${config.table}`;

      const payload = { ...formData };
      config.fields.forEach(field => {
        if (field.transient) {
          delete payload[field.name];
        }
      });

      const res = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        handleCloseModal();
        fetchData(currentPage);
      } else {
        console.error('Failed to save record');
      }
    } catch (error) {
      console.error('Error saving record', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await apiRequest(`/master-data/${config.table}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // If it was the last item on the page, go to previous page
        if (data.length === 1 && currentPage > 1) {
          const prevPage = currentPage - 1;
          setCurrentPage(prevPage);
          fetchData(prevPage);
        } else {
          fetchData(currentPage);
        }
      } else {
        console.error('Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record', error);
    }
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    fetchData(pageNumber);
  };

  const tableFields = config.fields.filter(field => !field.hideInTable);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{config.title}</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Add New
        </button>
      </div>

      <div className="card">
        <div className="table-responsive">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    {tableFields.map(field => (
                      <th key={field.name}>{field.label}</th>
                    ))}
                    <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={tableFields.length + 1} style={{ textAlign: 'center', padding: '2rem' }}>
                        No active records found.
                      </td>
                    </tr>
                  ) : (
                    data.map(row => (
                      <tr key={row.id}>
                        {tableFields.map(field => (
                          <td key={field.name}>
                            {field.type === 'date' && row[field.name] 
                              ? new Date(row[field.name]).toLocaleDateString()
                              : row[field.name] || '-'}
                          </td>
                        ))}
                        <td>
                          <div className="actions">
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => handleOpenModal(row)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => handleDelete(row.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {totalItems > itemsPerPage && (
                <div className="pagination-container">
                  <div className="page-summary">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                  </div>
                  <div className="pagination-controls">
                    <button 
                      className="btn btn-outline" 
                      onClick={() => paginate(currentPage - 1)} 
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <span className="page-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => paginate(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingRecord ? 'Edit' : 'Add'} {config.title.slice(0, -1)}
              </h2>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {config.fields.map(field => (
                <div className="form-group" key={field.name}>
                  <label className="form-label">{field.label}</label>
                  {field.readonly ? (
                    <input
                      type={field.type}
                      name={field.name}
                      className="form-control"
                      disabled
                      placeholder="Auto-generated"
                      value={formData[field.name] || ''}
                    />
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      className="form-control"
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                    />
                  )}
                </div>
              ))}
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}