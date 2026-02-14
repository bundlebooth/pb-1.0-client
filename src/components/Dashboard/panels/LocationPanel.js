import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../../../config';
import { showBanner } from '../../../utils/banners';
import { getProfileLocation } from '../../../utils/locationUtils';

const loadGoogleMapsAPI = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps && window.google.maps.places) {
      resolve();
      return;
    }
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    const apiKey = GOOGLE_MAPS_API_KEY || 'AIzaSyCPhhp2rAt1VTrIzjgagJXZPZ_nc7K_BVo';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&libraries=places';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed'));
    document.head.appendChild(script);
  });
};

function LocationPanel({ onBack }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ city: '', province: '', country: 'Canada', latitude: null, longitude: null });
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => { loadUserLocation(); }, [currentUser]);

  useEffect(() => {
    loadGoogleMapsAPI().then(() => {
      if (addressInputRef.current && !autocompleteRef.current) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, { types: ['(cities)'], componentRestrictions: { country: 'ca' } });
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (!place || !place.address_components) return;
          const comps = place.address_components;
          const pick = (type) => { const c = comps.find(x => x.types.includes(type)); return c ? c.long_name : ''; };
          const loc = place.geometry ? place.geometry.location : null;
          setFormData({ city: pick('locality') || pick('administrative_area_level_3') || '', province: pick('administrative_area_level_1') || '', country: pick('country') || 'Canada', latitude: loc ? loc.lat() : null, longitude: loc ? loc.lng() : null });
        });
      }
    }).catch(console.error);
  }, [loading]);

  const loadUserLocation = async () => {
    if (!currentUser) { setLoading(false); return; }
    try {
      const res = await fetch(API_BASE_URL + '/users/me', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
      if (res.ok) { const d = await res.json(); setFormData({ city: d.city || '', province: d.province || d.state || '', country: d.country || 'Canada', latitude: d.latitude, longitude: d.longitude }); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentUser || !formData.province) { showBanner('Please select a location', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(API_BASE_URL + '/users/' + currentUser.id + '/location', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ city: formData.city, state: formData.province, country: formData.country, latitude: formData.latitude || 0, longitude: formData.longitude || 0 }) });
      if (res.ok) { showBanner('Location saved!', 'success'); onBack(); } else { const d = await res.json(); showBanner(d.message || 'Failed', 'error'); }
    } catch (e) { showBanner('Failed to save', 'error'); }
    setSaving(false);
  };

  if (loading) return (<div><button className="btn btn-outline back-to-menu-btn" onClick={onBack}><i className="fas fa-arrow-left"></i> Back</button><div className="dashboard-card"><div style={{textAlign:'center',padding:'3rem'}}><div className="spinner"></div></div></div></div>);

  return (
    <div>
      <button className="btn btn-outline back-to-menu-btn" style={{marginBottom:'1rem'}} onClick={onBack}><i className="fas fa-arrow-left"></i> Back to Settings</button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title">Location and Tax Settings</h2>
        <p style={{color:'var(--text-light)',marginBottom:'1.5rem'}}>Set your location for accurate tax calculation.</p>
        <hr style={{border:'none',borderTop:'1px solid #e5e7eb',margin:'1.5rem 0'}} />
        <div style={{background:'#ebf8ff',border:'1px solid #90cdf4',borderRadius:'8px',padding:'1rem',marginBottom:'1.5rem'}}>
          <strong style={{color:'#2b6cb0'}}>Why do we need your location?</strong>
          <p style={{color:'#4a5568',margin:'0.5rem 0 0',fontSize:'0.9rem'}}>Your province determines the applicable sales tax for payments.</p>
        </div>
        <div className="form-group" style={{marginBottom:'1.5rem'}}>
          <label style={{display:'block',marginBottom:'0.5rem',fontWeight:500}}>Search Your City *</label>
          <input ref={addressInputRef} type="text" placeholder="" defaultValue={formData.city ? formData.city + ', ' + formData.province : ''} style={{width:'100%',padding:'0.875rem 1rem',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'1rem'}} />
        </div>
        {formData.province && (<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'8px',padding:'1rem',marginBottom:'1.5rem'}}><strong style={{color:'#166534'}}>Location: {getProfileLocation(formData)}</strong></div>)}
        <div style={{display:'flex',gap:'1rem',marginTop:'2rem'}}>
          <button onClick={onBack} className="btn btn-outline" style={{flex:1}}>Cancel</button>
          <button onClick={handleSave} disabled={saving||!formData.province} className="btn btn-primary" style={{flex:1}}>{saving ? 'Saving...' : 'Save Location'}</button>
        </div>
      </div>
    </div>
  );
}

export default LocationPanel;
