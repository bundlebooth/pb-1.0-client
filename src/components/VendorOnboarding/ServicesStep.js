import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import UniversalModal from '../UniversalModal';
import { ServiceCard, PackageCard, PackageServiceTabs, PackageServiceList } from '../PackageServiceCard';

function ServicesStep({ formData, setFormData }) {
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
  // Tabs and Packages state
  const [activeTab, setActiveTab] = useState('services');
  const [packages, setPackages] = useState(formData.packages || []);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageServiceSearch, setPackageServiceSearch] = useState('');
  const [uploadingPackageImage, setUploadingPackageImage] = useState(false);

  useEffect(() => {
    loadServices();
  }, [formData.primaryCategory, JSON.stringify(formData.additionalCategories)]);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (showModal || showEditModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showModal, showEditModal]);

  // Category IDs now match database directly - no mapping needed
  // Only use primaryCategory - selectedSubcategories are subcategories within the primary, not separate categories
  const loadServices = async () => {
    try {
      setLoading(true);
      const allCategories = [formData.primaryCategory].filter(Boolean);
      
      console.log('ServicesStep - Loading services for categories:', allCategories);
      console.log('ServicesStep - formData.primaryCategory:', formData.primaryCategory);
      
      if (allCategories.length === 0) {
        console.warn('ServicesStep - No categories selected yet');
        setAvailableServices([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/vendors/predefined-services`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      console.log('ServicesStep - API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const servicesByCategory = data.servicesByCategory || {};
        
        console.log('ServicesStep - Categories from API:', Object.keys(servicesByCategory));
        console.log('ServicesStep - Total services from API:', data.totalServices);
        
        const filteredServices = [];
        const addedServiceIds = new Set();
        
        // Categories match DB directly - no mapping needed
        allCategories.forEach(category => {
          console.log('ServicesStep - Looking for category:', category, 'Found:', !!servicesByCategory[category]);
          if (servicesByCategory[category]) {
            servicesByCategory[category].forEach(service => {
              if (!addedServiceIds.has(service.id)) {
                addedServiceIds.add(service.id);
                filteredServices.push({ ...service, category });
              }
            });
          }
        });
        
        console.log('ServicesStep - Filtered services count:', filteredServices.length);
        setAvailableServices(filteredServices);
      } else {
        console.error('ServicesStep - API error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service) => {
    const isAlreadySelected = formData.selectedServices.some(s => s.serviceId === service.id);
    
    if (!isAlreadySelected) {
      const newService = {
        serviceId: service.id,
        serviceName: service.name,
        category: service.category,
        pricingModel: 'hourly',
        baseRate: '',
        baseDuration: '2',
        overtimeRate: '',
        description: ''
      };
      
      setFormData(prev => ({
        ...prev,
        selectedServices: [...prev.selectedServices, newService]
      }));
      
      setEditingServiceId(service.id);
    }
    setShowModal(false);
    setSearchQuery('');
  };

  const handleRemoveService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.filter(s => s.serviceId !== serviceId)
    }));
    if (editingServiceId === serviceId) {
      setEditingServiceId(null);
    }
  };

  const handleServiceUpdate = (serviceId, field, value) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.map(s =>
        s.serviceId === serviceId ? { ...s, [field]: value } : s
      )
    }));
  };

  const handleEditService = (service) => {
    setEditingService({ ...service });
    setShowEditModal(true);
  };

  const handleSaveEditedService = () => {
    if (editingService) {
      setFormData(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.map(s =>
          s.serviceId === editingService.serviceId ? editingService : s
        )
      }));
      setShowEditModal(false);
      setEditingService(null);
    }
  };

  const handleEditModalUpdate = (field, value) => {
    setEditingService(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Package handlers
  const handleAddPackage = () => {
    setEditingPackage({ 
      name: '', 
      description: '', 
      price: '', 
      salePrice: '',
      priceType: 'fixed_price',
      baseRate: '',
      overtimeRate: '',
      fixedPrice: '',
      pricePerPerson: '',
      minAttendees: '',
      maxAttendees: '',
      includedServices: [],
      imageURL: '',
      finePrint: '',
      duration: ''
    });
    setPackageServiceSearch('');
    setShowPackageModal(true);
  };

  const handleEditPackage = (pkg, index) => {
    setEditingPackage({ 
      ...pkg, 
      _index: index,
      salePrice: pkg.salePrice || '',
      imageURL: pkg.imageURL || '',
      finePrint: pkg.finePrint || '',
      duration: pkg.duration || ''
    });
    setPackageServiceSearch('');
    setShowPackageModal(true);
  };

  const handlePackageImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingPackageImage(true);
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await fetch(`${API_BASE_URL}/vendors/service-image/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formDataUpload
      });

      if (response.ok) {
        const data = await response.json();
        setEditingPackage(prev => ({ ...prev, imageURL: data.imageUrl }));
      }
    } catch (error) {
      console.error('Error uploading package image:', error);
    } finally {
      setUploadingPackageImage(false);
    }
  };

  const handleSavePackage = () => {
    if (!editingPackage?.name) return;
    
    let priceValue = 0;
    const priceType = editingPackage.priceType || 'fixed_price';
    
    if (priceType === 'time_based') {
      if (!editingPackage.baseRate) return;
      priceValue = parseFloat(editingPackage.baseRate);
    } else if (priceType === 'per_attendee') {
      if (!editingPackage.pricePerPerson) return;
      priceValue = parseFloat(editingPackage.pricePerPerson);
    } else {
      if (!editingPackage.fixedPrice && !editingPackage.price) return;
      priceValue = parseFloat(editingPackage.fixedPrice || editingPackage.price);
    }
    
    const packageData = { 
      ...editingPackage, 
      id: editingPackage.id || Date.now(), 
      price: priceValue,
      salePrice: editingPackage.salePrice ? parseFloat(editingPackage.salePrice) : null,
      baseRate: editingPackage.baseRate ? parseFloat(editingPackage.baseRate) : null,
      overtimeRate: editingPackage.overtimeRate ? parseFloat(editingPackage.overtimeRate) : null,
      fixedPrice: editingPackage.fixedPrice ? parseFloat(editingPackage.fixedPrice) : null,
      pricePerPerson: editingPackage.pricePerPerson ? parseFloat(editingPackage.pricePerPerson) : null,
      minAttendees: editingPackage.minAttendees ? parseInt(editingPackage.minAttendees) : null,
      maxAttendees: editingPackage.maxAttendees ? parseInt(editingPackage.maxAttendees) : null,
      durationMinutes: editingPackage.duration ? Math.round(parseFloat(editingPackage.duration) * 60) : null
    };
    delete packageData._index;
    
    let updatedPackages;
    if (editingPackage._index !== undefined) {
      updatedPackages = [...packages];
      updatedPackages[editingPackage._index] = packageData;
    } else {
      updatedPackages = [...packages, packageData];
    }
    
    setPackages(updatedPackages);
    setFormData(prev => ({ ...prev, packages: updatedPackages }));
    setShowPackageModal(false);
    setEditingPackage(null);
  };

  const handleDeletePackage = (index) => {
    const updatedPackages = packages.filter((_, i) => i !== index);
    setPackages(updatedPackages);
    setFormData(prev => ({ ...prev, packages: updatedPackages }));
  };

  const toggleServiceInPackage = (serviceId) => {
    setEditingPackage(prev => ({
      ...prev,
      includedServices: prev.includedServices.includes(serviceId)
        ? prev.includedServices.filter(id => id !== serviceId)
        : [...prev.includedServices, serviceId]
    }));
  };

  const filteredServices = availableServices.filter(service => 
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !formData.selectedServices.some(s => s.serviceId === service.id)
  );

  if (loading) {
    return (
      <div className="step-loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="services-step">
      {/* Intro Section */}
      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <i className="fas fa-concierge-bell" style={{ color: '#5086E8', fontSize: '1rem' }}></i>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
            Services & Packages
          </h3>
        </div>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>
          Add individual services or create packages to offer clients. Set your pricing and describe what's included.
        </p>
      </div>

      {/* Tabs */}
      <PackageServiceTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        packagesCount={packages.length}
        servicesCount={formData.selectedServices.length}
      />

      {/* Services Tab */}
      {activeTab === 'services' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h5 style={{ margin: 0, color: '#222', fontWeight: 600, fontSize: '1.25rem' }}>Your Services</h5>
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '10px 20px',
                background: '#222',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <i className="fas fa-plus"></i> Add Service
            </button>
          </div>

      {/* Selected Services List */}
      <PackageServiceList>
        {formData.selectedServices.map((service, index) => (
          <ServiceCard
            key={`service-${service.serviceId}-${index}`}
            service={service}
            showActions={true}
            onEdit={() => handleEditService(service)}
            onDelete={() => handleRemoveService(service.serviceId)}
          />
        ))}
      </PackageServiceList>

      {/* Service Selection Modal */}
      <UniversalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Service"
        size="medium"
        showFooter={false}
      >
        <div className="um-form-group" style={{ marginBottom: '16px' }}>
          <input
            type="text"
            className="um-form-input"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="service-modal-list">
          {filteredServices.length === 0 ? (
            <div className="no-results">
              {searchQuery ? 'No services found matching your search.' : 'All available services have been added.'}
            </div>
          ) : (
            filteredServices.map(service => (
              <div
                key={service.id}
                className="service-modal-item"
                onClick={() => handleServiceSelect(service)}
              >
                <span className="service-modal-name">{service.name}</span>
                <span className="service-modal-category">{service.category}</span>
              </div>
            ))
          )}
        </div>
      </UniversalModal>

        </>
      )}

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div>
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}><i className="fas fa-info-circle" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>Create packages to bundle services together at a special price.</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h5 style={{ margin: 0, color: '#222', fontWeight: 600, fontSize: '1.25rem' }}>Your Packages</h5>
            <button type="button" onClick={handleAddPackage} style={{ padding: '10px 20px', background: '#222', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fas fa-plus"></i> Create Package
            </button>
          </div>

          <PackageServiceList>
            {packages.map((pkg, index) => {
              const rawIncluded = pkg.includedServices || pkg.IncludedServices || [];
              const mappedIncludedServices = rawIncluded.map(item => {
                if (typeof item === 'object' && item !== null) {
                  return { name: item.name || item.ServiceName || item.serviceName, serviceName: item.name || item.ServiceName || item.serviceName };
                }
                const svc = formData.selectedServices.find(s => s.serviceId === item);
                return svc ? { name: svc.serviceName, serviceName: svc.serviceName } : null;
              }).filter(Boolean);
              
              return (
                <PackageCard
                  key={pkg.id || index}
                  pkg={{
                    ...pkg,
                    PackageName: pkg.name,
                    Price: pkg.price,
                    SalePrice: pkg.salePrice,
                    PriceType: pkg.priceType,
                    ImageURL: pkg.imageURL,
                    DurationMinutes: pkg.duration ? parseFloat(pkg.duration) * 60 : null,
                    IncludedServices: mappedIncludedServices
                  }}
                  showActions={true}
                  onEdit={() => handleEditPackage(pkg, index)}
                  onDelete={() => handleDeletePackage(index)}
                />
              );
            })}
          </PackageServiceList>
        </div>
      )}

      {/* Package Modal */}
      <UniversalModal
        isOpen={showPackageModal}
        onClose={() => setShowPackageModal(false)}
        title={editingPackage?._index !== undefined ? 'Edit Package' : 'Create Package'}
        size="large"
        primaryAction={{ label: editingPackage?._index !== undefined ? 'Update Package' : 'Save Package', onClick: handleSavePackage }}
        secondaryAction={{ label: 'Cancel', onClick: () => setShowPackageModal(false) }}
      >
        <div>
              {/* Package Image */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Package Image
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{
                    width: '120px',
                    height: '90px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb'
                  }}>
                    {editingPackage?.imageURL ? (
                      <img src={editingPackage.imageURL} alt="Package" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-image" style={{ fontSize: '2rem', color: '#d1d5db' }}></i>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePackageImageUpload}
                      style={{ display: 'none' }}
                      id="become-vendor-package-image-upload"
                    />
                    <label
                      htmlFor="become-vendor-package-image-upload"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#f3f4f6',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}
                    >
                      {uploadingPackageImage ? 'Uploading...' : 'Upload Image'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Package Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Package Name *
                </label>
                <input
                  type="text"
                  value={editingPackage?.name || ''}
                  onChange={(e) => setEditingPackage(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Friday / Sunday Wedding"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Description
                </label>
                <textarea
                  value={editingPackage?.description || ''}
                  onChange={(e) => setEditingPackage(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what's included in this package..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Pricing Model */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Pricing Model *
                </label>
                <select
                  value={editingPackage?.priceType || 'time_based'}
                  onChange={(e) => setEditingPackage(prev => ({ ...prev, priceType: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="time_based">Time-based (Hourly)</option>
                  <option value="fixed_price">Fixed Price</option>
                  <option value="per_attendee">Per Attendee</option>
                </select>
              </div>

              {/* Dynamic Pricing Fields based on Price Type */}
              {editingPackage?.priceType === 'time_based' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Duration (hours) *
                    </label>
                    <input
                      type="number"
                      value={editingPackage?.duration || ''}
                      onChange={(e) => setEditingPackage(prev => ({ ...prev, duration: e.target.value }))}
                      min="0.5"
                      step="0.5"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Base Rate ($) *
                    </label>
                    <input
                      type="number"
                      value={editingPackage?.baseRate || ''}
                      onChange={(e) => setEditingPackage(prev => ({ ...prev, baseRate: e.target.value }))}
                      min="0"
                      step="0.01"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Overtime ($/hr)
                    </label>
                    <input
                      type="number"
                      value={editingPackage?.overtimeRate || ''}
                      onChange={(e) => setEditingPackage(prev => ({ ...prev, overtimeRate: e.target.value }))}
                      min="0"
                      step="0.01"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                </div>
              )}

              {editingPackage?.priceType === 'fixed_price' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Fixed Price ($) *
                    </label>
                    <input
                      type="number"
                      value={editingPackage?.fixedPrice || editingPackage?.price || ''}
                      onChange={(e) => setEditingPackage(prev => ({ ...prev, fixedPrice: e.target.value, price: e.target.value }))}
                      min="0"
                      step="0.01"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={editingPackage?.duration || ''}
                      onChange={(e) => setEditingPackage(prev => ({ ...prev, duration: e.target.value }))}
                      min="0.5"
                      step="0.5"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                </div>
              )}

              {editingPackage?.priceType === 'per_attendee' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Price/Person ($) *
                      </label>
                      <input
                        type="number"
                        value={editingPackage?.pricePerPerson || editingPackage?.price || ''}
                        onChange={(e) => setEditingPackage(prev => ({ ...prev, pricePerPerson: e.target.value, price: e.target.value }))}
                        min="0"
                        step="0.01"
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Min Attendees
                      </label>
                      <input
                        type="number"
                        value={editingPackage?.minAttendees || ''}
                        onChange={(e) => setEditingPackage(prev => ({ ...prev, minAttendees: e.target.value }))}
                        min="1"
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Max Attendees
                      </label>
                      <input
                        type="number"
                        value={editingPackage?.maxAttendees || ''}
                        onChange={(e) => setEditingPackage(prev => ({ ...prev, maxAttendees: e.target.value }))}
                        min="1"
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={editingPackage?.duration || ''}
                      onChange={(e) => setEditingPackage(prev => ({ ...prev, duration: e.target.value }))}
                      min="0.5"
                      step="0.5"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                </>
              )}

              {/* Sale Price - Only for non-hourly pricing models */}
              {editingPackage?.priceType !== 'time_based' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Sale Price ($)
                  </label>
                  <input
                    type="number"
                    value={editingPackage?.salePrice || ''}
                    onChange={(e) => setEditingPackage(prev => ({ ...prev, salePrice: e.target.value }))}
                    placeholder="Leave empty if no sale"
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                  />
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    If set, this price will be shown with the regular price crossed out.
                  </p>
                </div>
              )}

              {/* Included Services */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Included Services
                </label>
                <input
                  type="text"
                  value={packageServiceSearch}
                  onChange={(e) => setPackageServiceSearch(e.target.value)}
                  placeholder="Search services to add..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                />
                
                {/* Selected Services Tags */}
                {editingPackage?.includedServices?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '12px' }}>
                    {editingPackage.includedServices.map((serviceId, idx) => {
                      const svc = formData.selectedServices.find(s => s.serviceId === serviceId);
                      if (!svc) return null;
                      return (
                        <span 
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#f3f4f6',
                            color: '#222',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          {svc.serviceName}
                          <button
                            onClick={() => toggleServiceInPackage(serviceId)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                          >
                            <i className="fas fa-times" style={{ fontSize: '0.7rem', color: '#6b7280' }}></i>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Available Services List */}
                {formData.selectedServices.length > 0 && (
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fafafa' }}>
                    {formData.selectedServices
                      .filter(svc => 
                        packageServiceSearch === '' ||
                        svc.serviceName.toLowerCase().includes(packageServiceSearch.toLowerCase())
                      )
                      .map((svc, idx) => {
                        const isSelected = editingPackage?.includedServices?.includes(svc.serviceId);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleServiceInPackage(svc.serviceId)}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #e5e7eb',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: isSelected ? '#eff6ff' : 'white',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#f9fafb'; }}
                            onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'white'; }}
                          >
                            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>{svc.serviceName}</span>
                            {isSelected && <i className="fas fa-check-circle" style={{ color: '#16a34a', fontSize: '1rem' }}></i>}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Fine Print */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Fine Print / Terms
                </label>
                <textarea
                  value={editingPackage?.finePrint || ''}
                  onChange={(e) => setEditingPackage(prev => ({ ...prev, finePrint: e.target.value }))}
                  placeholder="e.g., Available on Friday or Sunday. Not available on long weekends."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
        </div>
      </UniversalModal>

      {/* Edit Service Modal */}
      <UniversalModal
        isOpen={showEditModal && editingService}
        onClose={() => setShowEditModal(false)}
        title="Edit Service"
        size="large"
        primaryAction={{ label: 'Save Changes', onClick: handleSaveEditedService }}
        secondaryAction={{ label: 'Cancel', onClick: () => setShowEditModal(false) }}
      >
        {editingService && (
          <div>
              {/* Pricing Model */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Pricing Model *
                </label>
                <select
                  value={editingService.pricingModel || 'time_based'}
                  onChange={(e) => handleEditModalUpdate('pricingModel', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="time_based">Time-based (Hourly)</option>
                  <option value="fixed_price">Fixed Price</option>
                  <option value="per_attendee">Per Attendee</option>
                </select>
              </div>

              {/* Time-based (Hourly) Fields */}
              {editingService.pricingModel === 'time_based' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Duration (hours) *
                    </label>
                    <input
                      type="number"
                      value={editingService.baseDuration || ''}
                      onChange={(e) => handleEditModalUpdate('baseDuration', e.target.value)}
                      min="0.5"
                      step="0.5"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Base Rate ($) *
                    </label>
                    <input
                      type="number"
                      value={editingService.baseRate || ''}
                      onChange={(e) => handleEditModalUpdate('baseRate', e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Overtime ($/hr)
                    </label>
                    <input
                      type="number"
                      value={editingService.overtimeRate || ''}
                      onChange={(e) => handleEditModalUpdate('overtimeRate', e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                </div>
              )}

              {/* Fixed Price Fields */}
              {editingService.pricingModel === 'fixed_price' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Fixed Price ($) *
                    </label>
                    <input
                      type="number"
                      value={editingService.fixedPrice || ''}
                      onChange={(e) => handleEditModalUpdate('fixedPrice', e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={editingService.baseDuration || ''}
                      onChange={(e) => handleEditModalUpdate('baseDuration', e.target.value)}
                      min="0.5"
                      step="0.5"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                </div>
              )}

              {/* Per Attendee Fields */}
              {editingService.pricingModel === 'per_attendee' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Price/Person ($) *
                      </label>
                      <input
                        type="number"
                        value={editingService.pricePerPerson || ''}
                        onChange={(e) => handleEditModalUpdate('pricePerPerson', e.target.value)}
                        min="0"
                        step="0.01"
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Min Attendees
                      </label>
                      <input
                        type="number"
                        value={editingService.minimumAttendees || ''}
                        onChange={(e) => handleEditModalUpdate('minimumAttendees', e.target.value)}
                        min="1"
                        step="1"
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Max Attendees
                      </label>
                      <input
                        type="number"
                        value={editingService.maximumAttendees || ''}
                        onChange={(e) => handleEditModalUpdate('maximumAttendees', e.target.value)}
                        min="1"
                        step="1"
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={editingService.baseDuration || ''}
                      onChange={(e) => handleEditModalUpdate('baseDuration', e.target.value)}
                      min="0.5"
                      step="0.5"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                </>
              )}

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Description
                </label>
                <textarea
                  value={editingService.description || ''}
                  onChange={(e) => handleEditModalUpdate('description', e.target.value)}
                  rows="3"
                  placeholder="Describe what's included in this service..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Sale Price Section - only for non-hourly pricing models */}
              {editingService.pricingModel !== 'time_based' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Sale Price ($)
                  </label>
                  <input
                    type="number"
                    value={editingService.salePrice || ''}
                    onChange={(e) => handleEditModalUpdate('salePrice', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Leave empty if no sale"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    If set, this price will be shown with the regular price crossed out.
                  </p>
                </div>
              )}

              {/* Gallery Images - At bottom */}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Gallery Images <span style={{ fontWeight: 400, textTransform: 'none' }}>(Click to view)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  {(editingService.galleryImages || []).map((url, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        position: 'relative', 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '8px', 
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <img src={url} alt={`Gallery ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleEditModalUpdate('galleryImages', (editingService.galleryImages || []).filter((_, i) => i !== idx));
                        }}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px'
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                  {/* Add more images button */}
                  <label 
                    htmlFor="service-gallery-images-upload-become-vendor"
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      border: '2px dashed #d1d5db',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: '#fafafa',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className="fas fa-plus" style={{ color: '#9ca3af', fontSize: '1.2rem', marginBottom: '4px' }}></i>
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>Add</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      if (!files.length) return;
                      for (const file of files) {
                        try {
                          const uploadFormData = new FormData();
                          uploadFormData.append('image', file);
                          const response = await fetch(`${API_BASE_URL}/vendors/service-image/upload`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                            body: uploadFormData
                          });
                          if (response.ok) {
                            const data = await response.json();
                            handleEditModalUpdate('galleryImages', [...(editingService.galleryImages || []), data.imageUrl]);
                          }
                        } catch (error) {
                          console.error('Error uploading gallery image:', error);
                        }
                      }
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                    id="service-gallery-images-upload-become-vendor"
                  />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                  Upload multiple images to showcase your service. Clients can browse through these images.
                </p>
              </div>
          </div>
        )}
      </UniversalModal>
    </div>
  );
}

export default ServicesStep;
