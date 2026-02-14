import React, { useState } from 'react';

/**
 * BusinessDetailsStep - Vendor onboarding step for business information
 * UI cloned from BusinessInformationPanel for consistency
 */
function BusinessDetailsStep({ formData, onInputChange }) {
  const [logoPreview, setLogoPreview] = useState(formData.profileLogo || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Compress image to reduce size and prevent "request entity too large" error
  const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSizeKB = 500;
      const fileSizeKB = file.size / 1024;
      
      setUploadingLogo(true);
      try {
        let imageData;
        if (fileSizeKB > maxSizeKB) {
          imageData = await compressImage(file, 400, 400, 0.7);
        } else {
          imageData = await compressImage(file, 600, 600, 0.85);
        }
        setLogoPreview(imageData);
        onInputChange('profileLogo', imageData);
      } catch (error) {
        console.error('Error processing image:', error);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result);
          onInputChange('profileLogo', reader.result);
        };
        reader.readAsDataURL(file);
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  return (
    <div className="business-details-step">
      {/* Business Logo Section - matching BusinessInformationPanel */}
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
        Business Logo
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ 
          width: '120px', 
          height: '120px', 
          borderRadius: '50%', 
          overflow: 'hidden', 
          border: '3px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {logoPreview ? (
            <img 
              src={logoPreview} 
              alt="Business Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <i className="fas fa-building" style={{ fontSize: '3rem', color: '#9ca3af' }}></i>
          )}
        </div>
        <div>
          <button 
            type="button"
            className="btn btn-outline"
            onClick={() => document.getElementById('logo-upload-input-onboarding').click()}
            disabled={uploadingLogo}
            style={{ 
              marginBottom: '0.5rem',
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <i className="fas fa-upload"></i> {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
          </button>
          <input
            type="file"
            id="logo-upload-input-onboarding"
            accept="image/*"
            onChange={handleLogoUpload}
            style={{ display: 'none' }}
          />
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
            JPG, PNG or SVG. Max size 5MB.
          </p>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '2rem 0' }} />

      {/* Form rows matching BusinessInformationPanel layout */}
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
            Business Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => onInputChange('businessName', e.target.value)}
            placeholder="e.g., Elegant Events Catering"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
            required
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
            Display Name (for public listing)
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => onInputChange('displayName', e.target.value)}
            placeholder="How you want to appear to clients"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>

      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
            Price Range
          </label>
          <select
            value={formData.priceRange}
            onChange={(e) => onInputChange('priceRange', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.95rem',
              background: 'white'
            }}
          >
            <option value="">Select price range</option>
            <option value="$">$ - Budget Friendly</option>
            <option value="$$">$$ - Moderate</option>
            <option value="$$$">$$$ - Premium</option>
            <option value="$$$$">$$$$ - Luxury</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
            Years in Business
          </label>
          <input
            type="number"
            value={formData.yearsInBusiness}
            onChange={(e) => onInputChange('yearsInBusiness', e.target.value)}
            min="0"
            placeholder="e.g., 5"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
          Business Description <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <textarea
          value={formData.businessDescription}
          onChange={(e) => onInputChange('businessDescription', e.target.value)}
          rows="6"
          placeholder="Tell clients about your business, what makes you unique, and what they can expect..."
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '0.95rem',
            resize: 'vertical'
          }}
          required
        />
      </div>
    </div>
  );
}

export default BusinessDetailsStep;
