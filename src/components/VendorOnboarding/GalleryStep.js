import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config';
import { showBanner } from '../../utils/helpers';
import { DeleteButton } from '../common/UIComponents';
import { ConfirmationModal } from '../UniversalModal';

/**
 * GalleryStep - Vendor onboarding step for gallery photos
 * UI cloned from GalleryMediaPanel for consistency
 */
function GalleryStep({ formData, setFormData, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState({ url: '', caption: '', isPrimary: false });
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const MIN_PHOTOS = 5;

  useEffect(() => {
    if (currentUser?.vendorProfileId) {
      loadPhotos();
    } else {
      setLoading(false);
    }
  }, [currentUser?.vendorProfileId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/images`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const images = Array.isArray(data) ? data : [];
        const mappedPhotos = images.map(img => ({
          id: img.id || img.ImageID,
          url: img.url || img.ImageURL,
          caption: img.caption || img.Caption,
          isPrimary: img.isPrimary || img.IsPrimary
        }));
        setPhotos(mappedPhotos);
        setFormData(prev => ({
          ...prev,
          photoURLs: mappedPhotos.map(p => p.url)
        }));
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, slotIndex = null) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (!currentUser?.vendorProfileId) {
      showBanner('Please complete your profile first before uploading photos.', 'warning');
      return;
    }

    try {
      setUploading(true);
      
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

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
        
        const saveResponse = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/images/url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            url: uploadData.imageUrl,
            isPrimary: slotIndex === 0 && photos.length === 0
          })
        });

        if (!saveResponse.ok) {
          throw new Error('Failed to save image');
        }
      }
      
      showBanner('Photo uploaded successfully!', 'success');
      loadPhotos();
    } catch (error) {
      console.error('Error uploading:', error);
      showBanner('Failed to upload photo', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (photoId, e) => {
    e.stopPropagation();
    setPhotoToDelete(photoId);
    setShowDeleteModal(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    setShowDeleteModal(false);
    
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/images/${photoToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        showBanner('Photo deleted!', 'success');
        loadPhotos();
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      showBanner('Failed to delete photo', 'error');
    } finally {
      setPhotoToDelete(null);
    }
  };

  const handleAddPhotoByUrl = async () => {
    if (!urlInput.url.trim()) {
      showBanner('Please enter a URL', 'error');
      return;
    }

    if (!currentUser?.vendorProfileId) {
      showBanner('Please complete your profile first', 'warning');
      return;
    }

    try {
      setUploading(true);
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/images/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url: urlInput.url.trim(),
          caption: urlInput.caption.trim(),
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
    } finally {
      setUploading(false);
    }
  };

  // Drag handlers for reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
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

    const newPhotos = [...photos];
    const [draggedPhoto] = newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(dropIndex, 0, draggedPhoto);
    setPhotos(newPhotos);
    setDragOverIndex(null);
    setDraggedIndex(null);

    // Save new order
    try {
      const orderData = newPhotos.map((photo, idx) => ({
        imageId: photo.id,
        displayOrder: idx + 1
      }));
      
      const response = await fetch(`${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/images/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ images: orderData })
      });
      
      if (response.ok) {
        showBanner('Photos reordered!', 'success');
      }
      
      setFormData(prev => ({
        ...prev,
        photoURLs: newPhotos.map(p => p.url)
      }));
    } catch (error) {
      console.error('Error saving order:', error);
      loadPhotos();
    }
  };

  if (loading) {
    return (
      <div className="step-loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="gallery-step">
      {/* Business Photos Section - Airbnb Style (matching GalleryMediaPanel) */}
      <div style={{ marginBottom: '3rem' }}>
        {/* Header with title and Add More button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#222', margin: 0 }}>
            Your Photos
          </h3>
          {photos.length > 0 && (
            <button 
              onClick={() => document.getElementById('gallery-photo-upload-input').click()}
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
        
        {/* Photo count requirement */}
        <p style={{ 
          fontSize: '0.9rem', 
          color: photos.length >= MIN_PHOTOS ? '#16a34a' : '#717171',
          marginBottom: '0.5rem'
        }}>
          {photos.length >= MIN_PHOTOS 
            ? `${photos.length} photos uploaded` 
            : `At least ${MIN_PHOTOS} photos required — ${photos.length}/${MIN_PHOTOS} uploaded`}
        </p>
        
        {/* Rearrange hint */}
        {photos.length > 1 && (
          <p style={{ color: '#717171', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Rearrange by dragging.
          </p>
        )}
        
        {/* Photo Grid - 3 column Airbnb style with drag to rearrange */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '8px', 
          marginBottom: '1.5rem' 
        }} id="vendor-photos-onboarding">
          {photos.length === 0 ? (
            <div 
              onClick={() => document.getElementById('gallery-photo-upload-input').click()}
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
                    onClick={(e) => handleDeletePhoto(photo.id, e)}
                    className="photo-delete-btn"
                    style={{ 
                      position: 'absolute',
                      top: '8px', 
                      right: '8px', 
                      opacity: 0,
                      background: 'rgba(255,255,255,0.95)'
                    }}
                    title="Remove"
                  />
                </div>
              ))}
              {/* Add more card at the end - dashed border style */}
              <div 
                onClick={() => document.getElementById('gallery-photo-upload-input').click()}
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
          #vendor-photos-onboarding > div:hover .photo-delete-btn {
            opacity: 1 !important;
          }
        `}</style>
        
        <input
          type="file"
          id="gallery-photo-upload-input"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        
        {/* Add by URL section */}
        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="image-url-input-onboarding">Add Image by URL</label>
            <input
              type="url"
              id="image-url-input-onboarding"
              placeholder="https://..."
              value={urlInput.url}
              onChange={(e) => setUrlInput({ ...urlInput, url: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="image-caption-input-onboarding">Caption (optional)</label>
            <input
              type="text"
              id="image-caption-input-onboarding"
              value={urlInput.caption}
              onChange={(e) => setUrlInput({ ...urlInput, caption: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <div className="form-group" style={{ margin: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="checkbox"
                id="image-primary-checkbox-onboarding"
                checked={urlInput.isPrimary}
                onChange={(e) => setUrlInput({ ...urlInput, isPrimary: e.target.checked })}
              />
              {' '}Primary
            </label>
            <button 
              className="btn btn-primary" 
              type="button" 
              onClick={handleAddPhotoByUrl}
              disabled={uploading || !urlInput.url.trim()}
              style={{
                padding: '0.75rem 1.25rem',
                background: '#222',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                cursor: uploading || !urlInput.url.trim() ? 'not-allowed' : 'pointer',
                opacity: uploading || !urlInput.url.trim() ? 0.6 : 1
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Delete Photo Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setPhotoToDelete(null); }}
        title="Delete Photo"
        message="Are you sure you want to delete this photo?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeletePhoto}
        variant="danger"
      />
    </div>
  );
}

export default GalleryStep;
