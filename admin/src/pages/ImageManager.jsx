import React, { useEffect, useState } from 'react';

export default function ImageManager({ fetchWithAuth, BACKEND_URL }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Border');
  const [price, setPrice] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  async function loadImages() {
    try {
      const data = await fetchWithAuth('/images');
      setImages(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadImages();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!title || !price || !selectedFile) {
      alert('Please fill out all required fields and select an image file.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('price', price);
      formData.append('image', selectedFile);

      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BACKEND_URL}/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image.');
      }

      alert('Image uploaded and processed successfully!');
      // Reset Form
      setTitle('');
      setDescription('');
      setPrice('');
      setSelectedFile(null);
      
      // Reload list
      loadImages();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this image from the marketplace catalog?')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BACKEND_URL}/images/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete image');
      
      alert(data.message);
      loadImages();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Image Catalog Manager</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Add new creative designs or delete current marketplace listings.</p>
      </div>

      {/* Grid: Upload Form & Current Inventory List */}
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Upload Form Card */}
        <div className="glass-card" style={{ padding: '24px', flex: 1, minWidth: '320px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>🖼️ Upload Original Work</h3>
          <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Title *</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Neon Cyberpunk Streets" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Description</label>
              <textarea 
                className="input-field" 
                rows="3" 
                placeholder="Add visual descriptions..." 
                value={description} 
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Category *</label>
                <select 
                  className="input-field" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="Border">Border</option>
                  <option value="Pallu">Pallu</option>
                  <option value="Butta">Butta</option>
                  <option value="Broket">Broket</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Price (INR) *</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="e.g. 499" 
                  value={price} 
                  onChange={e => setPrice(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Raw High-Res Image File *</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                style={{
                  display: 'block',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  marginTop: '8px'
                }}
                required 
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ marginTop: '10px' }}
              disabled={uploading}
            >
              {uploading ? 'Processing & Uploading...' : 'Publish Image'}
            </button>
          </form>
        </div>

        {/* Current Catalog Listings */}
        <div className="glass-card" style={{ padding: '24px', flex: 2, minWidth: '450px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Catalog Inventory</h3>
          {loading ? (
            <div>Loading Marketplace catalog...</div>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Thumbnail</th>
                    <th>Details</th>
                    <th>Price</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {images.map((img) => (
                    <tr key={img.id}>
                      <td>
                        <img 
                          src={img.preview_url} 
                          alt={img.title} 
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid var(--glass-border)'
                          }} 
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{img.title}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>{img.category}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>₹{parseFloat(img.price).toFixed(2)}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(img.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {images.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No images uploaded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
