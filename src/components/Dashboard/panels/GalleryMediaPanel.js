import React, { useState, useEffect, useRef } from 'react';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPost, apiPut, apiDelete, apiPostFormData } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';
import { DeleteButton } from '../../common/UIComponents';
import { ConfirmationModal } from '../../UniversalModal';

function GalleryMediaPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState({ url: '', caption: '', isPrimary: false });
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [albumForm, setAlbumForm] = useState({ name: '', description: '', coverImageURL: '', isPublic: true });
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [showDeleteAlbumModal, setShowDeleteAlbumModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [albumToDelete, setAlbumToDelete] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (vendorProfileId) {
      loadPhotos();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      
      // Load images
      const photosResponse = await apiGet(`/vendors/${vendorProfileId}/images`);
      if (photosResponse.ok) {
        const photosData = await photosResponse.json();
        const images = Array.isArray(photosData) ? photosData : [];
        setPhotos(images.map(img => ({
          id: img.id || img.ImageID,
          url: img.url || img.ImageURL,
          caption: img.caption || img.Caption,
          isPrimary: img.isPrimary || img.IsPrimary
        })));
      } else {
        console.error('Failed to load images:', photosResponse.status);
      }
      
      // Load albums
      const albumsResponse = await apiGet(`/vendor/${vendorProfileId}/portfolio/albums`);
      if (albumsResponse.ok) {
        const albumsData = await albumsResponse.json();
        const albums = albumsData.albums || [];
        setAlbums(albums.map(album => ({
          id: album.AlbumID,
          name: album.AlbumName,
          description: album.AlbumDescription,
          coverImageURL: album.CoverImageURL,
          photoCount: album.ImageCount || 0
        })));
      } else {
        console.error('Failed to load albums:', albumsResponse.status);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      
      // Upload files one at a time using service-image/upload endpoint (WORKING endpoint)
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        // Use the WORKING service-image/upload endpoint, then save URL to vendor images
        const uploadResponse = await fetch(`${API_BASE_URL}/vendors/service-image/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formDataUpload
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }
        
        const uploadData = await uploadResponse.json();
        
        // Now save the uploaded image URL to vendor images
        const saveResponse = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/images/url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ url: uploadData.imageUrl })
        });

        if (!saveResponse.ok) {
          throw new Error('Failed to save image');
        }
      }
      
      showBanner('Photos uploaded successfully!', 'success');
      loadPhotos();
    } catch (error) {
      console.error('Error uploading:', error);
      showBanner('Failed to upload photos', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (photoId) => {
    setPhotoToDelete(photoId);
    setShowDeletePhotoModal(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    setShowDeletePhotoModal(false);

    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/images/${photoToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        showBanner('Photo deleted successfully!', 'success');
        loadPhotos();
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      showBanner('Failed to delete photo', 'error');
    } finally {
      setPhotoToDelete(null);
    }
  };

  const handleSetPrimary = async (photoId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/images/${photoId}/set-primary`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        showBanner('Primary photo updated!', 'success');
        loadPhotos();
      }
    } catch (error) {
      console.error('Error setting primary:', error);
      showBanner('Failed to set primary photo', 'error');
    }
  };

  const handleCreateAlbum = () => {
    setEditingAlbum(null);
    setAlbumForm({ name: '', description: '', coverImageURL: '', isPublic: true });
    setShowAlbumModal(true);
  };

  const handleEditAlbum = (album) => {
    setEditingAlbum(album);
    setAlbumForm({
      name: album.name,
      description: album.description || '',
      coverImageURL: album.coverImageURL || '',
      isPublic: true
    });
    setShowAlbumModal(true);
  };

  const handleSaveAlbum = async () => {
    if (!albumForm.name.trim()) {
      showBanner('Please enter an album name', 'error');
      return;
    }

    try {
      const albumData = {
        albumId: editingAlbum ? editingAlbum.id : null,
        albumName: albumForm.name.trim(),
        albumDescription: albumForm.description.trim(),
        coverImageURL: albumForm.coverImageURL.trim() || null,
        isPublic: albumForm.isPublic
      };

      const response = await fetch(`${API_BASE_URL}/vendor/${vendorProfileId}/portfolio/albums/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(albumData)
      });

      if (response.ok) {
        showBanner(`Album ${editingAlbum ? 'updated' : 'created'} successfully!`, 'success');
        setShowAlbumModal(false);
        loadPhotos();
      } else {
        throw new Error('Failed to save album');
      }
    } catch (error) {
      console.error('Error saving album:', error);
      showBanner('Failed to save album', 'error');
    }
  };

  const handleDeleteAlbum = (albumId) => {
    setAlbumToDelete(albumId);
    setShowDeleteAlbumModal(true);
  };

  const confirmDeleteAlbum = async () => {
    if (!albumToDelete) return;
    setShowDeleteAlbumModal(false);

    try {
      const response = await fetch(`${API_BASE_URL}/vendor/${vendorProfileId}/portfolio/albums/${albumToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        showBanner('Album deleted successfully!', 'success');
        loadPhotos();
      } else {
        throw new Error('Failed to delete album');
      }
    } catch (error) {
      console.error('Error deleting album:', error);
      showBanner('Failed to delete album', 'error');
    } finally {
      setAlbumToDelete(null);
    }
  };

  const handleAddPhotoByUrl = async () => {
    if (!urlInput.url) {
      showBanner('Please enter a URL', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/images/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url: urlInput.url,
          caption: urlInput.caption,
          isPrimary: urlInput.isPrimary
        })
      });

      if (response.ok) {
        showBanner('Photo added successfully!', 'success');
        setUrlInput({ url: '', caption: '', isPrimary: false });
        loadPhotos();
      } else {
        throw new Error('Failed to add photo');
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      showBanner('Failed to add photo', 'error');
    }
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    // Reorder photos locally
    const newPhotos = [...photos];
    const [draggedPhoto] = newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(dropIndex, 0, draggedPhoto);
    setPhotos(newPhotos);
    setDragOverIndex(null);
    setDraggedIndex(null);

    // Save new order to backend immediately
    try {
      const orderData = newPhotos.map((photo, idx) => ({
        imageId: photo.id,
        displayOrder: idx + 1
      }));
      
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/images/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ images: orderData })
      });
      
      if (response.ok) {
        showBanner('Photos reordered!', 'success');
      } else {
        showBanner('Failed to save order', 'error');
        loadPhotos(); // Reload original order
      }
    } catch (error) {
      console.error('Error saving order:', error);
      showBanner('Failed to save order', 'error');
      loadPhotos();
    }
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
        </button>
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-images"></i>
          </span>
          Gallery & Media
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Manage your business photos and organize them into themed albums
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
        
        {/* Business Photos Section - Airbnb Style */}
        <div style={{ marginBottom: '3rem' }}>
          {/* Header with title and Add More button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#222', margin: 0 }}>
              {photos.length > 0 ? 'Your listing looks great!' : 'Add photos to your listing'}
            </h3>
            {photos.length > 0 && (
              <button 
                onClick={() => document.getElementById('photo-upload-input').click()}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#222',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Add more
              </button>
            )}
          </div>
          
          {/* Rearrange hint */}
          {photos.length > 1 && (
            <p style={{ color: '#717171', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Rearrange by dragging.
            </p>
          )}
          
          {/* Photo Grid - Airbnb style with drag to rearrange */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '8px', 
            marginBottom: '1.5rem' 
          }} id="vendor-photos">
            {photos.length === 0 ? (
              <div 
                onClick={() => document.getElementById('photo-upload-input').click()}
                style={{
                  gridColumn: 'span 3',
                  aspectRatio: '16/9',
                  border: '1px dashed #b0b0b0',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: '#fafafa',
                  transition: 'border-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#222'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#b0b0b0'}
              >
                <i className="fas fa-image" style={{ fontSize: '2rem', color: '#717171', marginBottom: '12px' }}></i>
                <span style={{ fontWeight: 500, color: '#222' }}>Add photos</span>
                <span style={{ fontSize: '0.85rem', color: '#717171', marginTop: '4px' }}>Click to upload</span>
              </div>
            ) : (
              <>
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'grab',
                      border: dragOverIndex === index ? '2px solid #222' : '1px solid #e5e7eb',
                      opacity: draggedIndex === index ? 0.5 : 1,
                      transition: 'border-color 0.2s, opacity 0.2s'
                    }}
                  >
                    <img
                      src={photo.url}
                      alt={`Gallery ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                    />
                    {/* Cover badge */}
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: 'white',
                        color: '#222',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        Cover
                      </div>
                    )}
                    {/* Delete button - top right */}
                    <DeleteButton
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="photo-delete-btn"
                      style={{ 
                        position: 'absolute',
                        top: '8px', 
                        right: '8px', 
                        opacity: 0,
                        background: 'rgba(255,255,255,0.95)'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                      title="Remove"
                    />
                  </div>
                ))}
                {/* Add more card at the end - dashed border style */}
                <div 
                  onClick={() => document.getElementById('photo-upload-input').click()}
                  style={{
                    aspectRatio: '1',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: 'white',
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#222'; e.currentTarget.style.background = '#fafafa'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = 'white'; }}
                >
                  <i className="fas fa-plus" style={{ fontSize: '1.25rem', color: '#222', marginBottom: '4px' }}></i>
                  <span style={{ fontSize: '0.8rem', color: '#222', fontWeight: 500 }}>Add photo</span>
                </div>
              </>
            )}
          </div>
          
          {/* Show delete buttons on hover - CSS */}
          <style>{`
            .gallery-photo-card:hover .photo-delete-btn,
            #vendor-photos > div:hover .photo-delete-btn {
              opacity: 1 !important;
            }
          `}</style>
          <input
            type="file"
            id="photo-upload-input"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="image-url-input">Add Image by URL</label>
              <input
                type="url"
                id="image-url-input"
                placeholder="https://..."
                value={urlInput.url}
                onChange={(e) => setUrlInput({ ...urlInput, url: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="image-caption-input">Caption (optional)</label>
              <input
                type="text"
                id="image-caption-input"
                value={urlInput.caption}
                onChange={(e) => setUrlInput({ ...urlInput, caption: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label>
                <input
                  type="checkbox"
                  id="image-primary-checkbox"
                  checked={urlInput.isPrimary}
                  onChange={(e) => setUrlInput({ ...urlInput, isPrimary: e.target.checked })}
                />
                {' '}Primary
              </label>
              <button className="btn btn-primary" type="button" id="add-photo-url-btn" onClick={handleAddPhotoByUrl}>
                Add
              </button>
            </div>
          </div>
        </div>
        
        {/* Photo Albums Section - Clean Airbnb Style */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '2rem', marginTop: '2rem' }}>
          {/* Header with title and Add More button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#222', margin: 0 }}>
              {albums.length > 0 ? 'Your albums' : 'Create your first album'}
            </h3>
            {albums.length > 0 && (
              <button 
                onClick={() => handleCreateAlbum()}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#222',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Add more
              </button>
            )}
          </div>
          
          {/* Rearrange hint */}
          {albums.length > 1 && (
            <p style={{ color: '#717171', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Drag to rearrange albums.
            </p>
          )}
          
          {/* Albums Grid - Clean style like photos */}
          <div id="portfolio-albums-list" style={{ marginBottom: '1.5rem' }}>
            {albums.length === 0 ? (
              <div 
                onClick={() => handleCreateAlbum()}
                style={{
                  aspectRatio: '16/9',
                  border: '1px dashed #b0b0b0',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: '#fafafa',
                  transition: 'border-color 0.2s',
                  maxWidth: '400px'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#222'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#b0b0b0'}
              >
                <span style={{ fontWeight: 500, color: '#222', marginBottom: '4px' }}>Create album</span>
                <span style={{ fontSize: '0.85rem', color: '#717171' }}>Organize your photos into collections</span>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '8px'
              }}>
                {albums.map((album, index) => (
                  <div 
                    key={album.id} 
                    style={{ 
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    {/* Album Cover */}
                    {album.coverImageURL ? (
                      <img 
                        src={album.coverImageURL} 
                        alt={album.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ color: '#9ca3af', fontSize: '2rem' }}>📁</span>
                      </div>
                    )}
                    
                    {/* Photo count badge */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '8px', 
                      right: '8px', 
                      background: 'rgba(0,0,0,0.6)', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      color: 'white', 
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {album.photoCount || 0} photos
                    </div>
                    
                    {/* Album name overlay */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '8px',
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      color: 'white'
                    }}>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{album.name}</div>
                    </div>
                    
                    {/* Action buttons - appear on hover */}
                    <div 
                      className="album-actions"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        display: 'flex',
                        gap: '4px',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditAlbum(album); }}
                        style={{
                          padding: '6px 10px',
                          background: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#222',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id); }}
                        style={{
                          padding: '6px 10px',
                          background: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#dc2626',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add more album card */}
                <div 
                  onClick={() => handleCreateAlbum()}
                  style={{
                    aspectRatio: '1',
                    border: '1px dashed #b0b0b0',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: '#fafafa',
                    transition: 'border-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = '#222'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#b0b0b0'}
                >
                  <span style={{ fontSize: '0.85rem', color: '#222', fontWeight: 500 }}>Add more</span>
                </div>
              </div>
            )}
          </div>
          
          {/* CSS for hover effects */}
          <style>{`
            #portfolio-albums-list > div > div:hover .album-actions {
              opacity: 1 !important;
            }
          `}</style>
        </div>

        {/* Album Edit/Create Modal - Larger with Image Upload */}
        {showAlbumModal && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '1rem'
            }}
            onClick={() => setShowAlbumModal(false)}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '12px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#222' }}>
                  {editingAlbum ? 'Edit Album' : 'Create Album'}
                </h3>
                <button
                  onClick={() => setShowAlbumModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
                {/* Album Details Section */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px', color: '#222' }}>Album Name *</label>
                    <input
                      type="text"
                      value={albumForm.name}
                      onChange={(e) => setAlbumForm({ ...albumForm, name: e.target.value })}
                      placeholder="e.g., Weddings 2024"
                      required
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px', color: '#222' }}>Description</label>
                    <textarea
                      value={albumForm.description}
                      onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                      placeholder="Brief description of this album"
                      rows="3"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <input
                      type="checkbox"
                      id="album-public"
                      checked={albumForm.isPublic}
                      onChange={(e) => setAlbumForm({ ...albumForm, isPublic: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#5e72e4' }}
                    />
                    <label htmlFor="album-public" style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>Make album public (visible to clients)</label>
                  </div>
                </div>

                {/* Cover Image Section */}
                <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px', color: '#222' }}>Cover Image</label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    {/* Cover Preview */}
                    <div style={{ 
                      width: '120px', 
                      height: '120px', 
                      borderRadius: '8px', 
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      background: '#f9fafb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {albumForm.coverImageURL ? (
                        <img 
                          src={albumForm.coverImageURL} 
                          alt="Cover preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <i className="fas fa-image" style={{ fontSize: '2rem', color: '#d1d5db' }}></i>
                      )}
                    </div>
                    {/* URL Input */}
                    <div style={{ flex: 1 }}>
                      <input
                        type="url"
                        value={albumForm.coverImageURL}
                        onChange={(e) => setAlbumForm({ ...albumForm, coverImageURL: e.target.value })}
                        placeholder="Paste image URL..."
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '8px' }}
                      />
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                        Paste a URL to an image, or select from your uploaded photos
                      </p>
                    </div>
                  </div>
                </div>

                {/* Album Photos Section - Only show when editing */}
                {editingAlbum && (
                  <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#222' }}>Album Photos</label>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{editingAlbum.photoCount || 0} photos</span>
                    </div>
                    <div style={{ 
                      border: '2px dashed #d1d5db', 
                      borderRadius: '8px', 
                      padding: '24px', 
                      textAlign: 'center',
                      background: '#fafafa',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      showBanner('Photo upload for albums coming soon!', 'info');
                    }}
                    >
                      <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', color: '#222', marginBottom: '8px' }}></i>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 500, color: '#222' }}>Add photos to this album</p>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>Click to upload or drag and drop</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSaveAlbum}
                  style={{
                    padding: '10px 24px',
                    background: '#222',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {editingAlbum ? 'Save Changes' : 'Create Album'}
                </button>
              </div>
            </div>
          </div>
        )}


      </div>

      {/* Delete Photo Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeletePhotoModal}
        onClose={() => { setShowDeletePhotoModal(false); setPhotoToDelete(null); }}
        title="Delete Photo"
        message="Are you sure you want to delete this photo?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeletePhoto}
        variant="danger"
      />

      {/* Delete Album Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteAlbumModal}
        onClose={() => { setShowDeleteAlbumModal(false); setAlbumToDelete(null); }}
        title="Delete Album"
        message="Are you sure you want to delete this album? All images in this album will also be deleted. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteAlbum}
        variant="danger"
      />
    </div>
  );
}

export default GalleryMediaPanel;
