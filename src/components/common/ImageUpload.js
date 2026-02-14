import React, { useRef, useState } from 'react';
import { API_BASE_URL } from '../../config';

/**
 * Centralized Image Upload Component
 * Used across all components for consistent upload experience
 * 
 * Props:
 * - onUpload: (files) => void - Called when files are selected
 * - onCloudinaryUpload: (urls) => void - Called after Cloudinary upload completes
 * - files: Array - Current files/URLs to display
 * - onRemove: (index) => void - Called when a file is removed
 * - multiple: boolean - Allow multiple files (default: true)
 * - accept: string - Accepted file types (default: 'image/*')
 * - maxSize: number - Max file size in MB (default: 10)
 * - maxFiles: number - Max number of files (default: 5)
 * - label: string - Label text (default: 'Screenshots')
 * - hint: string - Hint text below label
 * - showPreviews: boolean - Show image previews (default: true)
 * - uploadToCloudinary: boolean - Auto-upload to Cloudinary (default: false)
 * - disabled: boolean - Disable the upload
 * - compact: boolean - Use compact layout
 */
const ImageUpload = ({
  onUpload,
  onCloudinaryUpload,
  files = [],
  onRemove,
  multiple = true,
  accept = 'image/*',
  maxSize = 10,
  maxFiles = 5,
  label = 'Screenshots',
  hint = 'optional',
  showPreviews = true,
  uploadToCloudinary = false,
  disabled = false,
  compact = false
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (selectedFiles) => {
    setError(null);
    const validFiles = [];

    for (const file of selectedFiles) {
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        setError(`File "${file.name}" exceeds ${maxSize}MB limit`);
        continue;
      }

      // Validate file count
      if (files.length + validFiles.length >= maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        break;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // If uploading to Cloudinary
    if (uploadToCloudinary && onCloudinaryUpload) {
      setUploading(true);
      try {
        const uploadedUrls = [];
        for (const file of validFiles) {
          const formData = new FormData();
          formData.append('image', file);

          const response = await fetch(`${API_BASE_URL}/vendors/service-image/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            uploadedUrls.push({
              url: data.imageUrl,
              name: file.name,
              type: file.type
            });
          }
        }
        onCloudinaryUpload(uploadedUrls);
      } catch (err) {
        setError('Failed to upload images');
        console.error('Upload error:', err);
      } finally {
        setUploading(false);
      }
    } else if (onUpload) {
      onUpload(validFiles);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;

    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => 
      accept === 'image/*' ? f.type.startsWith('image/') : true
    );
    handleFileSelect(droppedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !uploading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled && !uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileSelect(selectedFiles);
    e.target.value = '';
  };

  const getFilePreview = (file) => {
    if (typeof file === 'string') return file;
    if (file.url) return file.url;
    if (file instanceof File && file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const getFileName = (file) => {
    if (typeof file === 'string') {
      const parts = file.split('/');
      return parts[parts.length - 1].substring(0, 20) + '...';
    }
    return file.name || 'Image';
  };

  const getFileSize = (file) => {
    if (file instanceof File) {
      return `${(file.size / 1024).toFixed(1)} KB`;
    }
    return '';
  };

  return (
    <div className="image-upload-container">
      {label && (
        <label style={{ 
          display: 'block', 
          fontSize: '14px', 
          fontWeight: 500, 
          marginBottom: '8px', 
          color: '#222' 
        }}>
          {label} {hint && <span style={{ fontWeight: 400, color: '#6b7280' }}>({hint})</span>}
        </label>
      )}

      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${isDragging ? 'var(--primary, #166534)' : '#d1d5db'}`,
          borderRadius: '12px',
          padding: compact ? '16px' : '24px 16px',
          textAlign: 'center',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          background: isDragging ? '#f0fdf4' : '#f9fafb',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          style={{ display: 'none' }}
          onChange={handleInputChange}
          disabled={disabled || uploading}
        />

        {uploading ? (
          <>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              margin: '0 auto 12px',
              border: '3px solid #e5e7eb',
              borderTopColor: 'var(--primary, #166534)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
              Uploading...
            </div>
          </>
        ) : (
          <>
            <i className="fas fa-image" style={{ 
              fontSize: compact ? '2rem' : '2.5rem', 
              color: '#9ca3af', 
              marginBottom: '12px',
              display: 'block'
            }}></i>
            <div style={{ fontSize: '14px', color: '#374151', fontWeight: 500, marginBottom: '4px' }}>
              {compact ? 'Add images' : 'Click to add images or drag and drop'}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              PNG, JPG, GIF up to {maxSize}MB
            </div>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ 
          color: '#dc2626', 
          fontSize: '13px', 
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {/* File Previews */}
      {showPreviews && files.length > 0 && (
        <div style={{ 
          marginTop: '12px', 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '10px'
        }}>
          {files.map((file, idx) => {
            const preview = getFilePreview(file);
            const isImage = preview && (typeof file === 'string' || file.type?.startsWith('image/') || file.url);

            return (
              <div 
                key={idx} 
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb'
                }}
              >
                {isImage ? (
                  <img
                    src={preview}
                    alt={getFileName(file)}
                    style={{
                      width: '100%',
                      height: '80px',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f3f4f6'
                  }}>
                    <i className="fas fa-file" style={{ fontSize: '24px', color: '#9ca3af' }}></i>
                  </div>
                )}

                {/* File info overlay */}
                <div style={{
                  padding: '6px 8px',
                  background: 'white',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#374151',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {getFileName(file)}
                  </div>
                  {getFileSize(file) && (
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                      {getFileSize(file)}
                    </div>
                  )}
                </div>

                {/* Remove button */}
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(idx);
                    }}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ImageUpload;
