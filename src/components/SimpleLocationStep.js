import React from 'react';

function SimpleLocationStep({ formData, setFormData }) {
  
  // Listen for messages from iframe
  React.useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'LOCATION_UPDATE') {
        setFormData(prev => ({
          ...prev,
          ...event.data.data
        }));
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setFormData]);

  return (
    <div className="location-step">
      <iframe
        src="/google-maps-test.html"
        style={{
          width: '100%',
          height: '700px',
          border: 'none',
          borderRadius: '8px',
          backgroundColor: 'white'
        }}
        title="Google Maps Location Form"
      />
    </div>
  );
}

export default SimpleLocationStep;
