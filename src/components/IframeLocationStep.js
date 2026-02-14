import React, { useEffect } from 'react';

function IframeLocationStep({ formData, setFormData }) {
  
  useEffect(() => {
    // Listen for messages from the iframe
    const handleMessage = (event) => {
      if (event.data.type === 'LOCATION_DATA') {
        setFormData(prev => ({
          ...prev,
          ...event.data.data
        }));
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setFormData]);

  return (
    <div className="location-step">
      <iframe
        src="/location-form.html"
        style={{
          width: '100%',
          height: '600px',
          border: 'none',
          borderRadius: '8px'
        }}
        title="Location Form"
      />
    </div>
  );
}

export default IframeLocationStep;
