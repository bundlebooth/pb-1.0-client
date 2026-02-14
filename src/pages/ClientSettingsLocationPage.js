import React from 'react';
import Header from '../components/Header';
import { PageLayout } from '../components/PageWrapper';
import LocationPanel from '../components/Dashboard/panels/LocationPanel';
import { useNavigate } from 'react-router-dom';
import './ClientPage.css';

function ClientSettingsLocationPage() {
  const navigate = useNavigate();
  
  return (
    <PageLayout variant="fullWidth" pageClassName="client-page client-settings-page">
      <Header />
      <LocationPanel onBack={() => navigate('/client/settings')} />
    </PageLayout>
  );
}

export default ClientSettingsLocationPage;
