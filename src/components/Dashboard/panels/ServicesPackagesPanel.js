import React, { useState, useEffect } from 'react';
import { showBanner } from '../../../utils/helpers';
import { apiGet, apiPost, apiPut, apiDelete, apiPostFormData } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';
import SkeletonLoader from '../../SkeletonLoader';
import { ServiceCard, PackageCard, PackageServiceTabs, PackageServiceEmpty, PackageServiceList } from '../../PackageServiceCard';
import UniversalModal, { ConfirmationModal } from '../../UniversalModal';

function ServicesPackagesPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('packages'); // 'packages' or 'services'
  const [services, setServices] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingService, setEditingService] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Package state
  const [packages, setPackages] = useState([]);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [showDeletePackageModal, setShowDeletePackageModal] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState(null);
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    includedServices: [],
    price: '',
    salePrice: '',
    priceType: 'fixed_price',
    durationMinutes: '',
    imageURL: '',
    galleryImages: [], // Array of image URLs for gallery
    finePrint: '',
    isActive: true,
    baseRate: '',
    overtimeRate: '',
    fixedPrice: '',
    pricePerPerson: '',
    minAttendees: '',
    maxAttendees: ''
  });
  const [packageServiceSearch, setPackageServiceSearch] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);

  // Clear state when vendorProfileId changes
  useEffect(() => {
    setServices([]);
    setPackages([]);
    setAvailableServices([]);
    setSelectedCount(0);
    setShowServicePicker(false);
    setSearchQuery('');
    setEditingService(null);
    setEditForm({});
    setShowPackageModal(false);
    setEditingPackage(null);
  }, [vendorProfileId]);

  useEffect(() => {
    if (vendorProfileId) {
      loadServices();
      loadPackages();
    } else {
      setLoading(false);
    }
  }, [vendorProfileId]);

  // Load packages
  const loadPackages = async () => {
    try {
      const response = await apiGet(`/vendors/${vendorProfileId}/packages`);
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages || []);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  // Package management functions
  const handleCreatePackage = () => {
    // Check if there are services to include in package
    if (services.length === 0) {
      showBanner('Please create individual services first before creating a package', 'warning');
      setActiveTab('services');
      return;
    }
    setEditingPackage(null);
    setPackageForm({
      name: '',
      description: '',
      includedServices: [],
      price: '',
      salePrice: '',
      priceType: 'fixed_price',
      durationMinutes: '',
      imageURL: '',
      galleryImages: [],
      finePrint: '',
      isActive: true,
      baseRate: '',
      overtimeRate: '',
      fixedPrice: '',
      pricePerPerson: '',
      minAttendees: '',
      maxAttendees: ''
    });
    setShowPackageModal(true);
  };

  const handleEditPackage = (pkg) => {
    console.log('Editing package:', pkg); // Debug log
    setEditingPackage(pkg);
    // Parse gallery images from JSON string if needed
    let parsedGalleryImages = [];
    if (pkg.GalleryImages || pkg.galleryImages) {
      const rawGallery = pkg.GalleryImages || pkg.galleryImages;
      if (typeof rawGallery === 'string') {
        try { parsedGalleryImages = JSON.parse(rawGallery); } catch (e) { parsedGalleryImages = []; }
      } else if (Array.isArray(rawGallery)) {
        parsedGalleryImages = rawGallery;
      }
    }
    setPackageForm({
      name: pkg.PackageName || pkg.name || '',
      description: pkg.Description || pkg.description || '',
      includedServices: pkg.IncludedServices || pkg.includedServices || [],
      price: pkg.Price || pkg.price || '',
      salePrice: pkg.SalePrice || pkg.salePrice || '',
      priceType: pkg.PriceType || pkg.priceType || 'time_based',
      durationMinutes: pkg.DurationMinutes || pkg.durationMinutes || '',
      imageURL: pkg.ImageURL || pkg.imageURL || '',
      galleryImages: parsedGalleryImages,
      finePrint: pkg.FinePrint || pkg.finePrint || '',
      isActive: pkg.IsActive !== false,
      // Pricing model specific fields
      baseRate: pkg.BaseRate ?? pkg.baseRate ?? '',
      overtimeRate: pkg.OvertimeRate ?? pkg.overtimeRate ?? '',
      fixedPrice: pkg.FixedPrice ?? pkg.fixedPrice ?? '',
      pricePerPerson: pkg.PricePerPerson ?? pkg.pricePerPerson ?? '',
      minAttendees: pkg.MinAttendees ?? pkg.minAttendees ?? '',
      maxAttendees: pkg.MaxAttendees ?? pkg.maxAttendees ?? ''
    });
    setShowPackageModal(true);
  };

  const handleSavePackage = async () => {
    if (!packageForm.name.trim()) {
      showBanner('Package name is required', 'error');
      return;
    }
    
    // Validate price based on pricing model
    let priceValue = 0;
    if (packageForm.priceType === 'time_based') {
      if (!packageForm.baseRate) {
        showBanner('Base rate is required for hourly pricing', 'error');
        return;
      }
      priceValue = parseFloat(packageForm.baseRate);
    } else if (packageForm.priceType === 'per_attendee') {
      if (!packageForm.pricePerPerson) {
        showBanner('Price per person is required', 'error');
        return;
      }
      priceValue = parseFloat(packageForm.pricePerPerson);
    } else {
      // fixed_price
      if (!packageForm.fixedPrice && !packageForm.price) {
        showBanner('Package price is required', 'error');
        return;
      }
      priceValue = parseFloat(packageForm.fixedPrice || packageForm.price);
    }

    try {
      const payload = {
        packageId: editingPackage?.PackageID || editingPackage?.id || null,
        name: packageForm.name.trim(),
        description: packageForm.description,
        includedServices: packageForm.includedServices,
        price: priceValue,
        salePrice: packageForm.salePrice ? parseFloat(packageForm.salePrice) : null,
        priceType: packageForm.priceType,
        durationMinutes: packageForm.durationMinutes ? parseInt(packageForm.durationMinutes) : null,
        imageURL: packageForm.imageURL,
        galleryImages: packageForm.galleryImages || [],
        finePrint: packageForm.finePrint,
        isActive: packageForm.isActive,
        baseRate: packageForm.baseRate ? parseFloat(packageForm.baseRate) : null,
        overtimeRate: packageForm.overtimeRate ? parseFloat(packageForm.overtimeRate) : null,
        fixedPrice: packageForm.fixedPrice ? parseFloat(packageForm.fixedPrice) : null,
        pricePerPerson: packageForm.pricePerPerson ? parseFloat(packageForm.pricePerPerson) : null,
        minAttendees: packageForm.minAttendees ? parseInt(packageForm.minAttendees) : null,
        maxAttendees: packageForm.maxAttendees ? parseInt(packageForm.maxAttendees) : null
      };

      const response = await apiPost(`/vendors/${vendorProfileId}/packages`, payload);

      if (response.ok) {
        showBanner(editingPackage ? 'Package updated successfully!' : 'Package created successfully!', 'success');
        
        // Close modal and clear editing state
        setShowPackageModal(false);
        setEditingPackage(null);
        
        // Reload packages to get fresh data with proper IDs
        await loadPackages();
      } else {
        const data = await response.json();
        showBanner(data.message || 'Failed to save package', 'error');
      }
    } catch (error) {
      console.error('Error saving package:', error);
      showBanner('Failed to save package', 'error');
    }
  };

  const handleDeletePackage = (packageId) => {
    setPackageToDelete(packageId);
    setShowDeletePackageModal(true);
  };

  const confirmDeletePackage = async () => {
    if (!packageToDelete) return;
    setShowDeletePackageModal(false);

    try {
      const response = await apiDelete(`/vendors/${vendorProfileId}/packages/${packageToDelete}`);

      if (response.ok) {
        showBanner('Package deleted successfully!', 'success');
        loadPackages();
      } else {
        showBanner('Failed to delete package', 'error');
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      showBanner('Failed to delete package', 'error');
    } finally {
      setPackageToDelete(null);
    }
  };

  const handlePackageImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/vendors/service-image/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setPackageForm({ ...packageForm, imageURL: data.imageUrl });
        showBanner('Image uploaded successfully!', 'success');
      } else {
        showBanner('Failed to upload image', 'error');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showBanner('Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle multiple gallery image uploads
  const handleGalleryImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    try {
      setUploadingImage(true);
      const uploadedUrls = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${API_BASE_URL}/vendors/service-image/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          uploadedUrls.push(data.imageUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setPackageForm(prev => ({
          ...prev,
          galleryImages: [...(prev.galleryImages || []), ...uploadedUrls]
        }));
        showBanner(`${uploadedUrls.length} image(s) uploaded successfully!`, 'success');
      }
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      showBanner('Failed to upload some images', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Remove image from gallery
  const handleRemoveGalleryImage = (index) => {
    setPackageForm(prev => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index)
    }));
  };

  // Open gallery modal to view images
  const openGalleryView = (images, startIndex = 0) => {
    setGalleryImages(images);
    setSelectedGalleryIndex(startIndex);
    setShowGalleryModal(true);
  };

  const toggleServiceInPackage = (service) => {
    const serviceId = service.id || service.PredefinedServiceID;
    const isIncluded = packageForm.includedServices.some(s => (s.id || s.PredefinedServiceID) === serviceId);
    
    if (isIncluded) {
      setPackageForm({
        ...packageForm,
        includedServices: packageForm.includedServices.filter(s => (s.id || s.PredefinedServiceID) !== serviceId)
      });
    } else {
      setPackageForm({
        ...packageForm,
        includedServices: [...packageForm.includedServices, { id: serviceId, name: service.name || service.ServiceName }]
      });
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      
      // First, fetch vendor's selected categories
      let vendorCategories = [];
      try {
        const categoriesResponse = await apiGet(`/vendors/${vendorProfileId}/categories`);
        if (categoriesResponse.ok) {
          const catData = await categoriesResponse.json();
          vendorCategories = (catData.categories || []).map(c => c.CategoryName || c.name || c);
        }
      } catch (e) {
        console.error('Error loading vendor categories:', e);
      }
      
      // Fetch available predefined services (all categories)
      const servicesResponse = await apiGet('/vendors/predefined-services');
      
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        const servicesByCategory = servicesData.servicesByCategory || {};
        
        // Flatten services - filter by vendor's categories if they have any selected
        const allServices = [];
        Object.keys(servicesByCategory).forEach(category => {
          // If vendor has categories, only include services from those categories
          if (vendorCategories.length === 0 || vendorCategories.some(vc => 
            vc.toLowerCase() === category.toLowerCase() ||
            category.toLowerCase().includes(vc.toLowerCase()) ||
            vc.toLowerCase().includes(category.toLowerCase())
          )) {
            (servicesByCategory[category] || []).forEach(service => {
              allServices.push({ ...service, category });
            });
          }
        });
        
        setAvailableServices(allServices);
        
        // Fetch vendor's selected services
        const vendorServicesResponse = await apiGet(`/vendors/${vendorProfileId}/selected-services`);
        
        if (vendorServicesResponse.ok) {
          const vendorData = await vendorServicesResponse.json();
          const selectedServices = vendorData.selectedServices || [];
          
          // Map selected services to full service objects with saved pricing data
          const mappedServices = selectedServices.map(s => {
            const match = allServices.find(a => String(a.id) === String(s.PredefinedServiceID));
            if (match) {
              // Normalize pricing model from backend (fixed_based -> fixed_price or per_attendee)
              let normalizedPricingModel = s.PricingModel || 'time_based';
              if (s.PricingModel === 'fixed_based') {
                if (s.FixedPricingType === 'per_attendee') {
                  normalizedPricingModel = 'per_attendee';
                } else {
                  normalizedPricingModel = 'fixed_price';
                }
              }
              
              return {
                ...match,
                vendorPrice: s.VendorPrice,
                vendorDuration: s.VendorDurationMinutes || s.BaseDurationMinutes,
                vendorDescription: s.VendorDescription,
                imageURL: s.ImageURL,
                // Pull saved pricing data from database
                pricingModel: normalizedPricingModel,
                baseRate: s.BaseRate !== null && s.BaseRate !== undefined ? s.BaseRate : null,
                overtimeRatePerHour: s.OvertimeRatePerHour !== null && s.OvertimeRatePerHour !== undefined ? s.OvertimeRatePerHour : null,
                fixedPrice: s.FixedPrice !== null && s.FixedPrice !== undefined ? s.FixedPrice : null,
                pricePerPerson: s.PricePerPerson !== null && s.PricePerPerson !== undefined ? s.PricePerPerson : null,
                minimumAttendees: s.MinimumAttendees !== null && s.MinimumAttendees !== undefined ? s.MinimumAttendees : null,
                maximumAttendees: s.MaximumAttendees !== null && s.MaximumAttendees !== undefined ? s.MaximumAttendees : null,
                minimumBookingFee: s.MinimumBookingFee !== null && s.MinimumBookingFee !== undefined ? s.MinimumBookingFee : null,
                salePrice: s.SalePrice !== null && s.SalePrice !== undefined ? s.SalePrice : null
              };
            }
            return null;
          }).filter(Boolean);
          
          setServices(mappedServices);
          setSelectedCount(mappedServices.length);
        }
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = (service) => {
    const newService = {
      ...service,
      vendorDuration: service.defaultDuration || 60,
      vendorPrice: 0,
      vendorDescription: '',
      pricingModel: 'time_based',
      baseRate: null,
      overtimeRatePerHour: null,
      fixedPrice: null,
      pricePerPerson: null,
      minimumAttendees: null,
      maximumAttendees: null,
      salePrice: null
    };
    setServices([...services, newService]);
    setSelectedCount(selectedCount + 1);
    setShowServicePicker(false);
    setSearchQuery('');
    
    // Immediately open edit modal so user can configure the service
    handleEditService(newService);
  };

  const handleEditService = (service) => {
    console.log('Editing service:', service); // Debug log
    // Pre-fill form with saved data from database - check all possible property name variations
    const formData = {
      pricingModel: service.pricingModel || service.PricingModel || 'time_based',
      vendorDuration: service.vendorDuration || service.VendorDurationMinutes || service.BaseDurationMinutes || service.defaultDuration || 60,
      baseRate: service.baseRate ?? service.BaseRate ?? '',
      salePrice: service.salePrice ?? service.SalePrice ?? '',
      overtimeRatePerHour: service.overtimeRatePerHour ?? service.OvertimeRatePerHour ?? '',
      fixedPrice: service.fixedPrice ?? service.FixedPrice ?? '',
      pricePerPerson: service.pricePerPerson ?? service.PricePerPerson ?? '',
      minimumAttendees: service.minimumAttendees ?? service.MinimumAttendees ?? '',
      maximumAttendees: service.maximumAttendees ?? service.MaximumAttendees ?? '',
      minimumBookingFee: service.minimumBookingFee ?? service.MinimumBookingFee ?? '',
      vendorDescription: service.vendorDescription || service.VendorDescription || service.Description || '',
      imageURL: service.imageURL || service.ImageURL || '',
      galleryImages: (() => {
        const raw = service.galleryImages || service.GalleryImages;
        if (!raw) return [];
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch (e) { return []; }
        }
        return Array.isArray(raw) ? raw : [];
      })()
    };
    console.log('Setting editForm:', formData); // Debug log
    setEditForm(formData);
    setEditingService(service);
  };

  // Handle service image upload
  const handleServiceImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiPostFormData('/vendors/service-image/upload', formData);

      if (response.ok) {
        const data = await response.json();
        setEditForm({ ...editForm, imageURL: data.imageUrl });
        showBanner('Image uploaded successfully!', 'success');
      } else {
        showBanner('Failed to upload image', 'error');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showBanner('Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEdit = async () => {
    // Check if this service exists in the database (has been saved before)
    const isExistingService = editingService.VendorSelectedServiceID || editingService.vendorPrice !== undefined;
    const predefinedServiceId = editingService.id;
    
    try {
      // Build payload - same structure for both new and existing services
      const payload = {
        predefinedServiceId: predefinedServiceId,
        pricingModel: editForm.pricingModel,
        baseDurationMinutes: parseInt(editForm.vendorDuration) || 60,
        baseRate: editForm.baseRate ? parseFloat(editForm.baseRate) : null,
        overtimeRatePerHour: editForm.overtimeRatePerHour ? parseFloat(editForm.overtimeRatePerHour) : null,
        fixedPrice: editForm.fixedPrice ? parseFloat(editForm.fixedPrice) : null,
        perPersonPrice: editForm.pricePerPerson ? parseFloat(editForm.pricePerPerson) : null,
        minimumAttendees: editForm.minimumAttendees ? parseInt(editForm.minimumAttendees) : null,
        maximumAttendees: editForm.maximumAttendees ? parseInt(editForm.maximumAttendees) : null,
        description: editForm.vendorDescription || '',
        imageURL: editForm.imageURL || null,
        salePrice: editForm.salePrice ? parseFloat(editForm.salePrice) : null
      };

      // Use PATCH for existing, or PATCH for new (the endpoint handles both via upsert)
      const response = await apiPut(`/vendors/${vendorProfileId}/services/${predefinedServiceId}`, payload);

      if (response.ok) {
        showBanner(isExistingService ? 'Service updated successfully!' : 'Service added successfully!', 'success');
        
        // Close modal and clear editing state
        setEditingService(null);
        setEditForm({});
        
        // Reload services to get fresh data with proper IDs (like packages do)
        await loadServices();
      } else {
        const data = await response.json().catch(() => ({}));
        showBanner(data.message || 'Failed to save service', 'error');
      }
    } catch (error) {
      console.error('Error saving service:', error);
      showBanner('Failed to save service', 'error');
    }
  };

  const handleRemoveService = (serviceId) => {
    setServices(services.filter(s => s.id !== serviceId));
    setSelectedCount(selectedCount - 1);
  };

  const handleSaveServices = async () => {
    try {
      // Derive service categories from current selection
      const serviceCategories = Array.from(new Set(services.map(s => s.category).filter(Boolean)))
        .map((name, i) => ({ name, description: null, displayOrder: i }));
      
      const payload = {
        vendorProfileId: vendorProfileId,
        serviceCategories,
        selectedPredefinedServices: services.map(s => ({
          predefinedServiceId: s.id,
          name: s.name,
          description: s.vendorDescription || s.description || '',
          durationMinutes: parseInt(s.vendorDuration) || s.defaultDuration || 60,
          imageURL: s.imageURL || null,
          pricingModel: s.pricingModel || 'time_based',
          baseDurationMinutes: parseInt(s.vendorDuration) || s.defaultDuration || 60,
          baseRate: (s.baseRate !== null && s.baseRate !== undefined && s.baseRate !== '') ? parseFloat(s.baseRate) : null,
          overtimeRatePerHour: (s.overtimeRatePerHour !== null && s.overtimeRatePerHour !== undefined && s.overtimeRatePerHour !== '') ? parseFloat(s.overtimeRatePerHour) : null,
          minimumBookingFee: (s.minimumBookingFee !== null && s.minimumBookingFee !== undefined && s.minimumBookingFee !== '') ? parseFloat(s.minimumBookingFee) : null,
          fixedPricingType: s.pricingModel === 'per_attendee' ? 'per_attendee' : (s.pricingModel === 'fixed_price' ? 'fixed_price' : null),
          fixedPrice: (s.fixedPrice !== null && s.fixedPrice !== undefined && s.fixedPrice !== '') ? parseFloat(s.fixedPrice) : null,
          pricePerPerson: (s.pricePerPerson !== null && s.pricePerPerson !== undefined && s.pricePerPerson !== '') ? parseFloat(s.pricePerPerson) : null,
          minimumAttendees: (s.minimumAttendees !== null && s.minimumAttendees !== undefined && s.minimumAttendees !== '') ? parseInt(s.minimumAttendees) : null,
          maximumAttendees: (s.maximumAttendees !== null && s.maximumAttendees !== undefined && s.maximumAttendees !== '') ? parseInt(s.maximumAttendees) : null,
          price: s.vendorPrice || s.fixedPrice || 0,
          salePrice: (s.salePrice !== null && s.salePrice !== undefined && s.salePrice !== '') ? parseFloat(s.salePrice) : null,
          originalPrice: (s.originalPrice !== null && s.originalPrice !== undefined && s.originalPrice !== '') ? parseFloat(s.originalPrice) : null
        })),
        services: services.map(s => ({
          name: s.name,
          description: s.vendorDescription || s.description || '',
          imageURL: s.imageURL || null,
          pricingModel: s.pricingModel || 'time_based',
          salePrice: (s.salePrice !== null && s.salePrice !== undefined && s.salePrice !== '') ? parseFloat(s.salePrice) : null,
          originalPrice: (s.originalPrice !== null && s.originalPrice !== undefined && s.originalPrice !== '') ? parseFloat(s.originalPrice) : null,
          baseDurationMinutes: parseInt(s.vendorDuration) || s.defaultDuration || 60,
          baseRate: (s.baseRate !== null && s.baseRate !== undefined && s.baseRate !== '') ? parseFloat(s.baseRate) : null,
          overtimeRatePerHour: (s.overtimeRatePerHour !== null && s.overtimeRatePerHour !== undefined && s.overtimeRatePerHour !== '') ? parseFloat(s.overtimeRatePerHour) : null,
          minimumBookingFee: (s.minimumBookingFee !== null && s.minimumBookingFee !== undefined && s.minimumBookingFee !== '') ? parseFloat(s.minimumBookingFee) : null,
          fixedPricingType: s.pricingModel === 'per_attendee' ? 'per_attendee' : (s.pricingModel === 'fixed_price' ? 'fixed_price' : null),
          fixedPrice: (s.fixedPrice !== null && s.fixedPrice !== undefined && s.fixedPrice !== '') ? parseFloat(s.fixedPrice) : null,
          pricePerPerson: (s.pricePerPerson !== null && s.pricePerPerson !== undefined && s.pricePerPerson !== '') ? parseFloat(s.pricePerPerson) : null,
          minimumAttendees: (s.minimumAttendees !== null && s.minimumAttendees !== undefined && s.minimumAttendees !== '') ? parseInt(s.minimumAttendees) : null,
          maximumAttendees: (s.maximumAttendees !== null && s.maximumAttendees !== undefined && s.maximumAttendees !== '') ? parseInt(s.maximumAttendees) : null,
          durationMinutes: parseInt(s.vendorDuration) || s.defaultDuration || 60,
          linkedPredefinedServiceId: s.id,
          categoryName: s.category || null
        }))
      };
      
      const response = await apiPost('/vendors/setup/step3-services', payload);
      
      if (response.ok) {
        showBanner('Services saved successfully!', 'success');
        await loadServices();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save services');
      }
    } catch (error) {
      console.error('Error saving services:', error);
      showBanner('Failed to save services: ' + error.message, 'error');
    }
  };

  const filteredServices = availableServices.filter(s => {
    // Check if service is already selected - compare all possible ID formats
    const serviceId = String(s.id || s.PredefinedServiceID);
    const isAlreadySelected = services.some(selected => {
      const selectedId = String(selected.id || selected.PredefinedServiceID);
      return selectedId === serviceId;
    });
    
    // Filter by search query
    const matchesSearch = searchQuery === '' ||
      (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return !isAlreadySelected && matchesSearch;
  });



  // Filter services for package modal - only show vendor's individual services (not predefined)
  const filteredPackageServices = services
    .filter(s => 
      packageServiceSearch === '' ||
      (s.name || s.ServiceName || '').toLowerCase().includes(packageServiceSearch.toLowerCase())
    );

  return (
    <div>
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-briefcase"></i>
          </span>
          Packages & Services
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Create packages to bundle multiple services together with special pricing, or add individual services.
        </p>

        {/* Tab Navigation */}
        <PackageServiceTabs 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          packagesCount={packages.length}
          servicesCount={selectedCount}
        />
        
        {/* Loading State */}
        {loading && (
          <SkeletonLoader variant="service-card" count={3} />
        )}

        {/* Packages Tab Content - Airbnb-style Horizontal Cards */}
        {activeTab === 'packages' && !loading && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h5 style={{ margin: 0, color: '#222', fontWeight: 600, fontSize: '1.25rem' }}>Your Packages</h5>
              <button
                onClick={handleCreatePackage}
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
                <i className="fas fa-plus"></i> Create Package
              </button>
            </div>

            {/* Package List - Using Universal PackageCard Component */}
            <PackageServiceList>
              {packages.map((pkg, index) => (
                <PackageCard
                  key={pkg.PackageID || index}
                  pkg={pkg}
                  showActions={true}
                  onEdit={() => handleEditPackage(pkg)}
                  onDelete={() => handleDeletePackage(pkg.PackageID)}
                />
              ))}
              
            </PackageServiceList>

            {/* Save Button for Packages */}
            <div style={{ marginTop: '2rem' }}>
              <button className="btn btn-primary" onClick={() => showBanner('Packages saved!', 'success')}>
                Save
              </button>
            </div>
          </div>
        )}

        {/* Services Container - Airbnb-style Horizontal Cards */}
        {activeTab === 'services' && !loading && (
        <div id="vendor-settings-services-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h5 style={{ margin: 0, color: '#222', fontWeight: 600, fontSize: '1.25rem' }}>Your Services</h5>
            <button
              onClick={() => setShowServicePicker(true)}
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

          <PackageServiceList>
            {services.map((service, index) => (
              <ServiceCard
                key={`service-${service.id}-${index}`}
                service={service}
                showActions={true}
                onEdit={() => handleEditService(service)}
                onDelete={() => handleRemoveService(service.id)}
              />
            ))}
            
          </PackageServiceList>

          <div style={{ marginTop: '2rem' }}>
            <button className="btn btn-primary" id="vendor-settings-save-services" onClick={handleSaveServices}>
              Save
            </button>
          </div>
        </div>
        )}

        {/* Service Picker Modal */}
        {showServicePicker && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000
            }}
            onClick={() => setShowServicePicker(false)}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '12px',
                maxWidth: '400px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Add Service</h3>
                  <button
                    onClick={() => setShowServicePicker(false)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#111827'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280'; }}
                  >
                    ×
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  autoFocus
                />
              </div>
              <div style={{ overflowY: 'auto', padding: '8px' }}>
                {filteredServices.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
                    {searchQuery ? 'No services found' : 'All services have been added'}
                  </div>
                ) : (
                  filteredServices.map(service => (
                    <div
                      key={service.id}
                      onClick={() => handleAddService(service)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontWeight: 500 }}>{service.name}</span>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        background: '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        {service.category}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Service Modal */}
        <UniversalModal
          isOpen={!!editingService}
          onClose={() => setEditingService(null)}
          title={editingService?.name || 'Edit Service'}
          size="large"
          primaryAction={{ label: 'Save Changes', onClick: handleSaveEdit }}
          secondaryAction={{ label: 'Cancel', onClick: () => setEditingService(null) }}
        >
          {editingService && (
            <div>
                {/* Pricing Model */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Pricing Model *
                  </label>
                  <select
                    value={editForm.pricingModel}
                    onChange={(e) => setEditForm({ ...editForm, pricingModel: e.target.value })}
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

                {/* Time-based Fields */}
                {editForm.pricingModel === 'time_based' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Duration (hours) *
                      </label>
                      <input
                        type="number"
                        value={editForm.vendorDuration ? (editForm.vendorDuration / 60).toFixed(1) : ''}
                        onChange={(e) => setEditForm({ ...editForm, vendorDuration: e.target.value ? Math.round(parseFloat(e.target.value) * 60) : '' })}
                        min="0.5"
                        step="0.5"
                        required
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Base Rate ($) *
                      </label>
                      <input
                        type="number"
                        value={editForm.baseRate}
                        onChange={(e) => setEditForm({ ...editForm, baseRate: e.target.value })}
                        min="0"
                        step="0.01"
                        required
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Overtime ($/hr)
                      </label>
                      <input
                        type="number"
                        value={editForm.overtimeRatePerHour}
                        onChange={(e) => setEditForm({ ...editForm, overtimeRatePerHour: e.target.value })}
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Fixed Price Fields */}
                {editForm.pricingModel === 'fixed_price' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Fixed Price ($) *
                      </label>
                      <input
                        type="number"
                        value={editForm.fixedPrice}
                        onChange={(e) => setEditForm({ ...editForm, fixedPrice: e.target.value })}
                        min="0"
                        step="0.01"
                        required
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Duration (hours)
                      </label>
                      <input
                        type="number"
                        value={editForm.vendorDuration ? (editForm.vendorDuration / 60).toFixed(1) : ''}
                        onChange={(e) => setEditForm({ ...editForm, vendorDuration: e.target.value ? Math.round(parseFloat(e.target.value) * 60) : '' })}
                        min="0.5"
                        step="0.5"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Per Attendee Fields */}
                {editForm.pricingModel === 'per_attendee' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Price/Person ($) *
                        </label>
                        <input
                          type="number"
                          value={editForm.pricePerPerson}
                          onChange={(e) => setEditForm({ ...editForm, pricePerPerson: e.target.value })}
                          min="0"
                          step="0.01"
                          required
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Min Attendees
                        </label>
                        <input
                          type="number"
                          value={editForm.minimumAttendees}
                          onChange={(e) => setEditForm({ ...editForm, minimumAttendees: e.target.value })}
                          min="1"
                          step="1"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Max Attendees
                        </label>
                        <input
                          type="number"
                          value={editForm.maximumAttendees}
                          onChange={(e) => setEditForm({ ...editForm, maximumAttendees: e.target.value })}
                          min="1"
                          step="1"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Duration (hours)
                      </label>
                      <input
                        type="number"
                        value={editForm.vendorDuration ? (editForm.vendorDuration / 60).toFixed(1) : ''}
                        onChange={(e) => setEditForm({ ...editForm, vendorDuration: e.target.value ? Math.round(parseFloat(e.target.value) * 60) : '' })}
                        min="0.5"
                        step="0.5"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
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
                    value={editForm.vendorDescription}
                    onChange={(e) => setEditForm({ ...editForm, vendorDescription: e.target.value })}
                    placeholder="Add any specific details about how you provide this service..."
                    rows="3"
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

                {/* Sale Price Section - show for all non-time_based pricing models */}
                {editForm.pricingModel && editForm.pricingModel !== 'time_based' && (
                  <div style={{ marginBottom: '16px', padding: '16px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#92400e', marginBottom: '8px', textTransform: 'uppercase' }}>
                      <i className="fas fa-tag" style={{ marginRight: '6px' }}></i>
                      Sale Price ($) - Optional Promotion
                    </label>
                    <input
                      type="number"
                      value={editForm.salePrice || ''}
                      onChange={(e) => setEditForm({ ...editForm, salePrice: e.target.value })}
                      min="0"
                      step="0.01"
                      placeholder="Enter sale price (optional)"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #fcd34d',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                    />
                    <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#92400e' }}>
                      Set a sale price lower than the regular price to show the discounted price with strikethrough.
                    </p>
                  </div>
                )}

                {/* Gallery Images - At bottom */}
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Gallery Images <span style={{ fontWeight: 400, textTransform: 'none' }}>(Click to view)</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    {(editForm.galleryImages || []).map((url, idx) => (
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
                        onClick={() => openGalleryView(editForm.galleryImages, idx)}
                      >
                        <img src={url} alt={`Gallery ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditForm({ ...editForm, galleryImages: editForm.galleryImages.filter((_, i) => i !== idx) });
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
                      htmlFor="service-gallery-images-upload"
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
                            const formData = new FormData();
                            formData.append('image', file);
                            const response = await fetch(`${API_BASE_URL}/vendors/service-image/upload`, {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                              body: formData
                            });
                            if (response.ok) {
                              const data = await response.json();
                              setEditForm(prev => ({ ...prev, galleryImages: [...(prev.galleryImages || []), data.imageUrl] }));
                            }
                          } catch (error) {
                            console.error('Error uploading gallery image:', error);
                          }
                        }
                        e.target.value = '';
                      }}
                      style={{ display: 'none' }}
                      id="service-gallery-images-upload"
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                    Upload multiple images to showcase your service. Clients can browse through these images.
                  </p>
                </div>
            </div>
          )}
        </UniversalModal>

        {/* Package Modal */}
        <UniversalModal
          isOpen={showPackageModal}
          onClose={() => setShowPackageModal(false)}
          title={editingPackage ? 'Edit Package' : 'Create Package'}
          size="large"
          primaryAction={{ label: editingPackage ? 'Update Package' : 'Create Package', onClick: handleSavePackage }}
          secondaryAction={{ label: 'Cancel', onClick: () => setShowPackageModal(false) }}
        >
          <div>
                {/* Package Name */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Package Name *
                  </label>
                  <input
                    type="text"
                    value={packageForm.name}
                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
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

                {/* Pricing Model - First */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Pricing Model *
                  </label>
                  <select
                    value={packageForm.priceType}
                    onChange={(e) => setPackageForm({ ...packageForm, priceType: e.target.value })}
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
                {packageForm.priceType === 'time_based' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Duration (hours) *
                      </label>
                      <input
                        type="number"
                        value={packageForm.durationMinutes ? (packageForm.durationMinutes / 60).toFixed(1) : ''}
                        onChange={(e) => setPackageForm({ ...packageForm, durationMinutes: e.target.value ? Math.round(parseFloat(e.target.value) * 60) : '' })}
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
                        value={packageForm.baseRate || ''}
                        onChange={(e) => setPackageForm({ ...packageForm, baseRate: e.target.value })}
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
                        value={packageForm.overtimeRate || ''}
                        onChange={(e) => setPackageForm({ ...packageForm, overtimeRate: e.target.value })}
                        min="0"
                        step="0.01"
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                )}

                {packageForm.priceType === 'fixed_price' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Fixed Price ($) *
                      </label>
                      <input
                        type="number"
                        value={packageForm.fixedPrice || ''}
                        onChange={(e) => setPackageForm({ ...packageForm, fixedPrice: e.target.value })}
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
                        value={packageForm.durationMinutes ? (packageForm.durationMinutes / 60).toFixed(1) : ''}
                        onChange={(e) => setPackageForm({ ...packageForm, durationMinutes: e.target.value ? Math.round(parseFloat(e.target.value) * 60) : '' })}
                        min="0.5"
                        step="0.5"
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                )}

                {packageForm.priceType === 'per_attendee' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Price/Person ($) *
                        </label>
                        <input
                          type="number"
                          value={packageForm.pricePerPerson || ''}
                          onChange={(e) => setPackageForm({ ...packageForm, pricePerPerson: e.target.value })}
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
                          value={packageForm.minAttendees || ''}
                          onChange={(e) => setPackageForm({ ...packageForm, minAttendees: e.target.value })}
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
                          value={packageForm.maxAttendees || ''}
                          onChange={(e) => setPackageForm({ ...packageForm, maxAttendees: e.target.value })}
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
                        value={packageForm.durationMinutes ? (packageForm.durationMinutes / 60).toFixed(1) : ''}
                        onChange={(e) => setPackageForm({ ...packageForm, durationMinutes: e.target.value ? Math.round(parseFloat(e.target.value) * 60) : '' })}
                        min="0.5"
                        step="0.5"
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                      />
                    </div>
                  </>
                )}

                {/* Description - After pricing fields */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Description
                  </label>
                  <textarea
                    value={packageForm.description}
                    onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
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

                {/* Sale Price - Only for non-hourly pricing models */}
                {packageForm.priceType !== 'time_based' && (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Sale Price ($)
                      </label>
                      <input
                        type="number"
                        value={packageForm.salePrice}
                        onChange={(e) => setPackageForm({ ...packageForm, salePrice: e.target.value })}
                        placeholder="Leave empty if no sale"
                        min="0"
                        step="0.01"
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
                  </>
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
                  
                  {/* Selected Services */}
                  {packageForm.includedServices.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '12px' }}>
                      {packageForm.includedServices.map((svc, idx) => (
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
                          {svc.name}
                          <button
                            onClick={() => toggleServiceInPackage(svc)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                          >
                            <i className="fas fa-times" style={{ fontSize: '0.7rem', color: '#6b7280' }}></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Available Services List */}
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fafafa' }}>
                    {filteredPackageServices.slice(0, 10).map((service, idx) => {
                      const serviceId = service.id || service.PredefinedServiceID;
                      const isSelected = packageForm.includedServices.some(s => (s.id || s.PredefinedServiceID) === serviceId);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleServiceInPackage(service)}
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
                          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#222' }}>{service.name || service.ServiceName}</span>
                          {isSelected && <i className="fas fa-check-circle" style={{ color: '#3b82f6', fontSize: '1rem' }}></i>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gallery Images - Multiple uploads - At bottom */}
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Gallery Images <span style={{ fontWeight: 400, textTransform: 'none' }}>(Click to view)</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    {(packageForm.galleryImages || []).map((url, idx) => (
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
                        onClick={() => openGalleryView(packageForm.galleryImages, idx)}
                      >
                        <img src={url} alt={`Gallery ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveGalleryImage(idx); }}
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
                      htmlFor="gallery-images-upload"
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
                      onChange={handleGalleryImageUpload}
                      style={{ display: 'none' }}
                      id="gallery-images-upload"
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                    Upload multiple images to showcase your package. Clients can browse through these images.
                  </p>
                </div>
          </div>
        </UniversalModal>

        {/* Delete Package Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeletePackageModal}
          onClose={() => { setShowDeletePackageModal(false); setPackageToDelete(null); }}
          title="Delete Package"
          message="Are you sure you want to delete this package?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDeletePackage}
          variant="danger"
        />

        {/* Gallery Lightbox Modal */}
        {showGalleryModal && galleryImages.length > 0 && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              zIndex: 10001,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setShowGalleryModal(false)}
          >
            {/* Close button */}
            <button
              onClick={() => setShowGalleryModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="fas fa-times"></i>
            </button>

            {/* Main image */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={galleryImages[selectedGalleryIndex]}
                alt={`Gallery image ${selectedGalleryIndex + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            </div>

            {/* Navigation arrows */}
            {galleryImages.length > 1 && (
              <>
                {selectedGalleryIndex > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedGalleryIndex(prev => prev - 1); }}
                    style={{
                      position: 'absolute',
                      left: '20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: 'white',
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                )}
                {selectedGalleryIndex < galleryImages.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedGalleryIndex(prev => prev + 1); }}
                    style={{
                      position: 'absolute',
                      right: '20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: 'white',
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                )}
              </>
            )}

            {/* Thumbnail dots */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '20px'
              }}
            >
              {galleryImages.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedGalleryIndex(idx)}
                  style={{
                    width: idx === selectedGalleryIndex ? '12px' : '8px',
                    height: idx === selectedGalleryIndex ? '12px' : '8px',
                    borderRadius: '50%',
                    background: idx === selectedGalleryIndex ? 'white' : 'rgba(255,255,255,0.4)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>

            {/* Image counter */}
            <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '12px', fontSize: '14px' }}>
              {selectedGalleryIndex + 1} / {galleryImages.length}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ServicesPackagesPanel;
