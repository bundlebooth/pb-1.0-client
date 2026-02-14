import React, { useState } from 'react';
import { useLocalization } from '../../../context/LocalizationContext';

function LanguageCurrencyPanel({ onBack, embedded = false }) {
  const {
    language,
    currency,
    autoTranslate,
    distanceUnit,
    setLanguage,
    setCurrency,
    setAutoTranslate,
    setDistanceUnit,
    supportedLanguages,
    supportedCurrencies,
    supportedDistanceUnits,
    getCurrentLanguage,
    getCurrentCurrency,
  } = useLocalization();

  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [selectedDistanceUnit, setSelectedDistanceUnit] = useState(distanceUnit);
  const [translateEnabled, setTranslateEnabled] = useState(autoTranslate);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setLanguage(selectedLanguage);
    setCurrency(selectedCurrency);
    setDistanceUnit(selectedDistanceUnit);
    setAutoTranslate(translateEnabled);
    
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 300);
  };

  const hasChanges = 
    selectedLanguage !== language || 
    selectedCurrency !== currency || 
    selectedDistanceUnit !== distanceUnit ||
    translateEnabled !== autoTranslate;

  return (
    <div>
      {!embedded && (
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Settings
        </button>
      )}
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-language"></i>
          </span>
          Language & Currency
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Choose your preferred language, currency, and distance units.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

      {/* Auto-translate Section */}
      <div style={{
        background: '#f9fafb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827', marginBottom: '4px' }}>
              <i className="fas fa-language" style={{ marginRight: '8px', opacity: 0.7 }}></i>
              Auto-translate
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              Automatically translate descriptions and reviews to your language.
            </div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '28px' }}>
            <input
              type="checkbox"
              checked={translateEnabled}
              onChange={(e) => setTranslateEnabled(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: translateEnabled ? '#5086E8' : '#d1d5db',
              transition: '0.3s',
              borderRadius: '28px'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '22px',
                width: '22px',
                left: translateEnabled ? '23px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                transition: '0.3s',
                borderRadius: '50%',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
              }}></span>
            </span>
          </label>
        </div>
      </div>

      {/* Language Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
          Language
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
          {supportedLanguages.map((lang) => (
            <button
              key={`${lang.code}-${lang.region}`}
              onClick={() => setSelectedLanguage(lang.code)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '14px 16px',
                border: selectedLanguage === lang.code ? '2px solid #5086E8' : '1px solid #e5e7eb',
                borderRadius: '10px',
                background: selectedLanguage === lang.code ? '#fafafa' : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827', marginBottom: '2px' }}>
                {lang.name}
              </span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {lang.region}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Currency Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
          Currency
        </h3>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
          Currently only Canadian Dollar (CAD) is available. More currencies coming soon.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
          {supportedCurrencies.map((curr) => {
            const isDisabled = curr.code !== 'CAD';
            return (
              <button
                key={curr.code}
                onClick={() => !isDisabled && setSelectedCurrency(curr.code)}
                disabled={isDisabled}
                title={isDisabled ? 'Coming soon - Currently only CAD is available' : ''}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '14px 16px',
                  border: selectedCurrency === curr.code ? '2px solid #5086E8' : '1px solid #e5e7eb',
                  borderRadius: '10px',
                  background: isDisabled ? '#f3f4f6' : (selectedCurrency === curr.code ? '#fafafa' : 'white'),
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  opacity: isDisabled ? 0.6 : 1,
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 500, color: isDisabled ? '#9ca3af' : '#111827', marginBottom: '2px' }}>
                  {curr.name}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {curr.code} – {curr.symbol}
                </span>
                {isDisabled && (
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#9ca3af', 
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>Coming soon</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Distance Unit Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
          Distance Unit
        </h3>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
          Currently only Kilometers is available for Canada. Miles coming soon.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
          {supportedDistanceUnits.map((unit) => {
            const isDisabled = unit.code !== 'km';
            return (
              <button
                key={unit.code}
                onClick={() => !isDisabled && setSelectedDistanceUnit(unit.code)}
                disabled={isDisabled}
                title={isDisabled ? 'Coming soon - Currently only Kilometers is available' : ''}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '14px 16px',
                  border: selectedDistanceUnit === unit.code ? '2px solid #5086E8' : '1px solid #e5e7eb',
                  borderRadius: '10px',
                  background: isDisabled ? '#f3f4f6' : (selectedDistanceUnit === unit.code ? '#fafafa' : 'white'),
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  opacity: isDisabled ? 0.6 : 1,
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 500, color: isDisabled ? '#9ca3af' : '#111827', marginBottom: '2px' }}>
                  {unit.name}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {unit.abbreviation}
                </span>
                {isDisabled && (
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#9ca3af', 
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>Coming soon</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '2rem' }}>
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
      </div>
    </div>
  );
}

export default LanguageCurrencyPanel;
