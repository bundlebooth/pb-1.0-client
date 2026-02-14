import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import { showBanner } from '../../../utils/helpers';
import { encodeUserId } from '../../../utils/hashIds';
import { getProfileLocation } from '../../../utils/locationUtils';
import UniversalModal from '../../UniversalModal';
import './ProfileEditPanel.css';

/**
 * ProfileEditPanel - Planbeau profile editing component
 * Clean, visual layout for editing user profile
 */
const ProfileEditPanel = ({ onClose, onSave, embedded = false }) => {
  const { currentUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [interestOptions, setInterestOptions] = useState([]);
  const [interestsLoading, setInterestsLoading] = useState(true);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLanguagesModal, setShowLanguagesModal] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [originalData, setOriginalData] = useState(null);
  const [originalInterests, setOriginalInterests] = useState([]);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    bio: '',
    occupation: '',
    city: '',
    state: '',
    country: '',
    languages: '',
    generation: '',
    education: '',
    currentPassion: '',
    furryFriends: '',
    freeTimeActivity: '',
    interestingTidbit: '',
    hiddenTalent: '',
    lifeMotto: '',
    dreamDestination: '',
    phone: ''
  });
  
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentUser?.id) {
      loadProfile();
    }
    loadInterestOptions();
    loadLanguages();
  }, [currentUser?.id]);

  // Handle profile picture upload
  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showBanner('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showBanner('Image must be less than 5MB', 'error');
      return;
    }

    try {
      setUploadingPhoto(true);
      const formDataUpload = new FormData();
      formDataUpload.append('profilePicture', file);

      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataUpload
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh user data to get new profile picture
        if (refreshUser) {
          await refreshUser();
        }
        showBanner('Profile picture updated!', 'success');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showBanner('Failed to upload profile picture', 'error');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Initialize Google Places Autocomplete when location modal opens
  useEffect(() => {
    if (showLocationModal && inputRef.current && window.google?.maps?.places) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['(cities)']
      });
      
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (place.address_components) {
          let city = '', state = '', country = '';
          place.address_components.forEach(component => {
            if (component.types.includes('locality')) city = component.long_name;
            if (component.types.includes('administrative_area_level_1')) state = component.short_name;
            if (component.types.includes('country')) country = component.long_name;
          });
          setFormData(prev => ({ ...prev, city, state, country }));
          setLocationSearch(place.formatted_address || `${city}, ${state}, ${country}`);
        }
      });
    }
    
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [showLocationModal]);

  const loadProfile = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/user-profile`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const user = data.user || {};
        const profile = data.profile || {};
        
        const loadedFormData = {
          firstName: user.FirstName || '',
          lastName: user.LastName || '',
          displayName: profile.DisplayName || '',
          bio: profile.Bio || '',
          occupation: profile.Occupation || '',
          city: profile.City || '',
          state: profile.State || '',
          country: profile.Country || '',
          languages: profile.Languages || '',
          generation: profile.Generation || '',
          education: profile.Education || '',
          currentPassion: profile.CurrentPassion || '',
          furryFriends: profile.FurryFriends || '',
          freeTimeActivity: profile.FreeTimeActivity || '',
          interestingTidbit: profile.InterestingTidbit || '',
          hiddenTalent: profile.HiddenTalent || '',
          lifeMotto: profile.LifeMotto || '',
          dreamDestination: profile.DreamDestination || '',
          phone: user.Phone || ''
        };
        setFormData(loadedFormData);
        
        setSelectedInterests(data.interests || []);
        setOriginalInterests(data.interests || []);
        setOriginalData(loadedFormData);
        
        // Parse languages from comma-separated string
        if (profile.Languages) {
          setSelectedLanguages(profile.Languages.split(',').map(l => l.trim()).filter(Boolean));
        }
        
        // Set location search display using centralized utility
        const locationDisplay = getProfileLocation(profile);
        if (locationDisplay) {
          setLocationSearch(locationDisplay);
        }
        
        // Update AuthContext with fresh profile picture if available
        const profilePic = profile.ProfileImageURL || user.ProfileImageURL;
        if (profilePic && refreshUser) {
          // Trigger a refresh to update the profile picture in AuthContext
          refreshUser();
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLanguages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/languages`);
      if (response.ok) {
        const data = await response.json();
        console.log('Languages API response:', data);
        setAvailableLanguages(data.languages || []);
      } else {
        console.error('Languages API error:', response.status);
      }
    } catch (error) {
      console.error('Error loading languages:', error);
    }
  };

  const loadInterestOptions = async () => {
    setInterestsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/interest-options`);
      if (response.ok) {
        const data = await response.json();
        console.log('Interest options API response:', data);
        setInterestOptions(data.grouped || {});
      } else {
        console.error('Interest options API error:', response.status);
      }
    } catch (error) {
      console.error('Error loading interest options:', error);
    } finally {
      setInterestsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (interest, category) => {
    setSelectedInterests(prev => {
      const exists = prev.find(i => (i.Interest || i.interest || i) === interest);
      if (exists) {
        return prev.filter(i => (i.Interest || i.interest || i) !== interest);
      } else {
        return [...prev, { interest, category }];
      }
    });
  };

  const toggleLanguage = (langName) => {
    setSelectedLanguages(prev => {
      if (prev.includes(langName)) {
        return prev.filter(l => l !== langName);
      } else {
        return [...prev, langName];
      }
    });
  };

  const saveLanguages = () => {
    setFormData(prev => ({ ...prev, languages: selectedLanguages.join(', ') }));
    setShowLanguagesModal(false);
  };

  const saveLocation = () => {
    setShowLocationModal(false);
  };

  const viewProfile = () => {
    window.open(`/profile/${encodeUserId(currentUser?.id)}`, '_blank');
  };

  // Check if there are changes
  const hasChanges = originalData ? (
    JSON.stringify(formData) !== JSON.stringify(originalData) ||
    JSON.stringify(selectedInterests.map(i => i.Interest || i.interest || i).sort()) !== 
    JSON.stringify(originalInterests.map(i => i.Interest || i.interest || i).sort())
  ) : false;

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const profileResponse = await fetch(`${API_BASE_URL}/users/${currentUser.id}/user-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!profileResponse.ok) throw new Error('Failed to save profile');
      
      const interestsResponse = await fetch(`${API_BASE_URL}/users/${currentUser.id}/interests`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ interests: selectedInterests })
      });
      
      if (!interestsResponse.ok) throw new Error('Failed to save interests');
      
      showBanner('Profile updated successfully!', 'success');
      setOriginalData({ ...formData });
      setOriginalInterests([...selectedInterests]);
      if (refreshUser) refreshUser();
      if (onSave) onSave();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      showBanner('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Profile field definitions - Planbeau style
  const profileFields = [
    { id: 'city', icon: 'map-marker-alt', label: 'Location', placeholder: 'e.g. Toronto, ON, Canada', modal: 'location' },
    { id: 'dreamDestination', icon: 'plane', label: 'Dream destination', placeholder: 'e.g. Bali, Indonesia' },
    { id: 'occupation', icon: 'briefcase', label: 'Occupation', placeholder: 'e.g. Software Engineer' },
    { id: 'furryFriends', icon: 'paw', label: 'Furry friends', placeholder: 'e.g. Golden Retriever named Max' },
    { id: 'education', icon: 'graduation-cap', label: 'Education', placeholder: 'e.g. University of Toronto' },
    { id: 'hiddenTalent', icon: 'pencil-alt', label: 'Hidden talent', placeholder: 'e.g. Can solve a Rubik\'s cube in under a minute' },
    { id: 'freeTimeActivity', icon: 'clock', label: 'Free time activity', placeholder: 'e.g. Hiking and photography' },
    { id: 'interestingTidbit', icon: 'lightbulb', label: 'Interesting tidbit', placeholder: 'e.g. I\'ve visited 30 countries' },
    { id: 'lifeMotto', icon: 'book', label: 'Life motto', placeholder: 'e.g. Live life to the fullest' },
    { id: 'currentPassion', icon: 'heart', label: 'Current passion', placeholder: 'e.g. Learning to play piano' },
    { id: 'generation', icon: 'birthday-cake', label: 'Generation', placeholder: 'e.g. 90s kid' },
    { id: 'languages', icon: 'language', label: 'Languages', placeholder: 'e.g. English, French', modal: 'languages' },
  ];

  const getFieldValue = (field) => {
    if (field.id === 'city') {
      return locationSearch || '';
    }
    if (field.id === 'languages') {
      return selectedLanguages.length > 0 ? selectedLanguages.join(', ') : '';
    }
    const actualField = field.field || field.id;
    return formData[actualField] || '';
  };

  const handleFieldClick = (field) => {
    if (field.modal === 'location') {
      setShowLocationModal(true);
    } else if (field.modal === 'languages') {
      setShowLanguagesModal(true);
    } else {
      setEditingField(field.id);
    }
  };

  const setFieldValue = (field, value) => {
    const actualField = field.field || field.id;
    handleChange(actualField, value);
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onClose}>
          <i className="fas fa-arrow-left"></i> Back to Settings
        </button>
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: 'var(--text-light)' }}>Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!embedded && (
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onClose}>
          <i className="fas fa-arrow-left"></i> Back to Settings
        </button>
      )}
      
      {/* Main Layout - Avatar on left, content on right */}
      <div style={{ display: 'flex', gap: '3rem', alignItems: 'flex-start' }}>
        {/* Left Column - Avatar */}
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              backgroundColor: '#4F86E8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {currentUser?.profileImageURL || currentUser?.profilePicture ? (
                <img 
                  src={currentUser.profileImageURL || currentUser.profilePicture} 
                  alt={formData.firstName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '4rem', fontWeight: 600, color: 'white' }}>
                  {(formData.firstName || currentUser?.firstName || 'U').charAt(0).toUpperCase()}
                </span>
              )}
              {uploadingPhoto && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}>
                  <div className="spinner" style={{ width: '24px', height: '24px', borderColor: 'white', borderTopColor: 'transparent' }}></div>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleProfilePictureUpload}
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              style={{
                marginTop: '0.75rem',
                background: 'none',
                border: 'none',
                color: '#111827',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: '0.75rem auto 0'
              }}
            >
              <i className="fas fa-camera"></i>
              {uploadingPhoto ? 'Uploading...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Right Column - Profile Content */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>My profile</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '2rem' }}>
            The information you share will be used across Planbeau to help other guests and hosts get to know you. <a href="#" onClick={(e) => { e.preventDefault(); viewProfile(); }} style={{ color: '#111827', fontWeight: 500 }}>Learn more</a>
          </p>

          {/* Profile Fields - Two Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0', borderTop: '1px solid #e5e7eb' }}>
            {profileFields.map((field, index) => {
              const value = getFieldValue(field);
              const hasModal = field.modal === 'location' || field.modal === 'languages';
              const isRightColumn = index % 2 === 1;
              
              return (
                <div 
                  key={field.id}
                  style={{
                    padding: '1rem 0',
                    borderBottom: '1px solid #e5e7eb',
                    borderRight: !isRightColumn ? '1px solid #e5e7eb' : 'none',
                    paddingRight: !isRightColumn ? '1.5rem' : 0,
                    paddingLeft: isRightColumn ? '1.5rem' : 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onClick={() => hasModal ? handleFieldClick(field) : document.getElementById(`field-${field.id}`)?.focus()}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <i className={`fas fa-${field.icon}`} style={{ color: '#6b7280', width: '20px', fontSize: '0.9rem' }}></i>
                    <div style={{ flex: 1 }}>
                      {hasModal ? (
                        <span style={{ color: value ? '#111827' : '#6b7280', fontSize: '0.95rem' }}>
                          {value || field.label}
                        </span>
                      ) : (
                        <input
                          id={`field-${field.id}`}
                          type="text"
                          value={value}
                          onChange={(e) => setFieldValue(field, e.target.value)}
                          placeholder={field.label}
                          style={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.95rem',
                            color: value ? '#111827' : '#6b7280',
                            background: 'transparent',
                            padding: 0
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ color: '#9ca3af', fontSize: '0.75rem' }}></i>
                </div>
              );
            })}
          </div>

          {/* About Me Section */}
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>About me</h2>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Write something fun and punchy."
                maxLength={500}
                rows={3}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.95rem',
                  resize: 'none',
                  fontFamily: 'inherit',
                  color: formData.bio ? '#111827' : '#6b7280'
                }}
              />
              <button
                type="button"
                onClick={() => document.querySelector('textarea')?.focus()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#111827',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  marginTop: '0.5rem'
                }}
              >
                Add intro
              </button>
            </div>
          </div>

          {/* Interests Section */}
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>What you're into</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Find common ground with other guests and hosts by adding interests to your profile.
            </p>
            
            {interestsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
              </div>
            ) : Object.keys(interestOptions).length === 0 ? (
              <p style={{ color: '#9ca3af' }}>No interests available</p>
            ) : (
              Object.entries(interestOptions).map(([category, interests]) => (
                <div key={category} style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500, fontSize: '0.9rem', color: '#374151' }}>
                    {category}
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {interests.map(opt => {
                      const isSelected = selectedInterests.some(
                        i => (i.Interest || i.interest || i) === opt.Interest
                      );
                      return (
                        <button
                          key={opt.InterestOptionID}
                          type="button"
                          onClick={() => toggleInterest(opt.Interest, category)}
                          style={{
                            padding: '8px 16px',
                            border: isSelected ? '1px solid #4F86E8' : '1px solid #d1d5db',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? '#EBF2FF' : 'white',
                            color: isSelected ? '#4F86E8' : '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected && <i className="fas fa-times" style={{ fontSize: '0.7rem' }}></i>}
                          {opt.Interest}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
        <button 
          type="button"
          onClick={handleSave} 
          disabled={!hasChanges || saving}
          style={{ 
            backgroundColor: (!hasChanges || saving) ? '#9ca3af' : '#3d3d3d', 
            border: 'none', 
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '14px',
            cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="airbnb-modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="airbnb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="airbnb-modal-header">
              <h2>Where do you live?</h2>
              <button className="airbnb-modal-close" onClick={() => setShowLocationModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="airbnb-modal-content">
              <div className="location-input-wrapper">
                <i className="fas fa-search"></i>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search for a city..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="location-search-input"
                />
              </div>
              {formData.city && (
                <div className="location-preview">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{getProfileLocation(formData)}</span>
                </div>
              )}
            </div>
            <div className="airbnb-modal-footer">
              <button className="airbnb-modal-done" onClick={saveLocation}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Languages Modal */}
      {showLanguagesModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowLanguagesModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Languages you speak</h2>
              <button 
                onClick={() => setShowLanguagesModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#6b7280' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {availableLanguages.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center' }}>Loading languages...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {availableLanguages.map(lang => {
                    const isSelected = selectedLanguages.includes(lang.Name);
                    return (
                      <button
                        key={lang.LanguageID}
                        type="button"
                        onClick={() => toggleLanguage(lang.Name)}
                        style={{
                          padding: '0.75rem 1rem',
                          border: isSelected ? '2px solid #111827' : '1px solid #d1d5db',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? '#f3f4f6' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 500, color: '#111827' }}>{lang.Name}</span>
                          {lang.NativeName && lang.NativeName !== lang.Name && (
                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280' }}>{lang.NativeName}</span>
                          )}
                        </div>
                        {isSelected && <i className="fas fa-check" style={{ color: '#111827' }}></i>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ padding: '1.25rem', borderTop: '1px solid #e5e7eb' }}>
              <button 
                onClick={saveLanguages}
                style={{
                  width: '100%',
                  backgroundColor: '#111827',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileEditPanel;
