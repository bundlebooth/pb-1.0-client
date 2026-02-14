import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../../config';
import { showBanner } from '../../../utils/helpers';
import { FormRow, ToggleSwitch, MultiSelectTags, SelectDropdown, ChipButton, SectionHeader } from '../../common/FormFields';

// Category ID to display name - IDs match DB directly, no mapping needed
const CATEGORY_ID_TO_NAME = {
  'venue': 'Venues',
  'photo': 'Photography',
  'video': 'Videography',
  'music': 'Music',
  'dj': 'DJ',
  'catering': 'Catering',
  'entertainment': 'Entertainment',
  'experiences': 'Experiences',
  'decorations': 'Decorations',
  'beauty': 'Beauty',
  'cake': 'Cake',
  'transportation': 'Transportation',
  'planners': 'Planners',
  'fashion': 'Fashion',
  'stationery': 'Stationery'
};

// Reverse mapping: display name to category ID
const CATEGORY_NAME_TO_ID = {
  'Venues': 'venue',
  'Photography': 'photo',
  'Videography': 'video',
  'Music': 'music',
  'DJ': 'dj',
  'Catering': 'catering',
  'Entertainment': 'entertainment',
  'Experiences': 'experiences',
  'Decorations': 'decorations',
  'Beauty': 'beauty',
  'Cake': 'cake',
  'Transportation': 'transportation',
  'Planners': 'planners',
  'Fashion': 'fashion',
  'Stationery': 'stationery'
};

// Map vendor category IDs to feature category names
const CATEGORY_TO_FEATURE_MAP = {
  'venue': ['Venue Features'],
  'photo': ['Photography & Video'],
  'video': ['Photography & Video'],
  'music': ['Music & Entertainment'],
  'dj': ['Music & Entertainment'],
  'catering': ['Catering & Bar'],
  'entertainment': ['Music & Entertainment', 'Experience Services'],
  'experiences': ['Experience Services'],
  'decorations': ['Floral & Decor'],
  'beauty': ['Beauty & Fashion Services'],
  'cake': ['Cake & Desserts'],
  'transportation': ['Transportation'],
  'planners': ['Event Planning', 'Event Services'],
  'fashion': ['Fashion & Attire', 'Beauty & Fashion Services'],
  'stationery': ['Stationery & Paper Goods']
};

function CategoryServicesPanel({ onBack, vendorProfileId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Category state
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  
  // Subcategories state
  const [subcategoriesOptions, setSubcategoriesOptions] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  
  // Features state
  const [featureCategories, setFeatureCategories] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  
  // Category Questions state
  const [categoryQuestions, setCategoryQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Event Types state
  const [eventTypes, setEventTypes] = useState([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState([]);

  // Category change warning modal state
  const [showCategoryWarning, setShowCategoryWarning] = useState(false);
  const [pendingCategoryChange, setPendingCategoryChange] = useState(null);
  const [originalCategory, setOriginalCategory] = useState('');

  // Cultures state
  const [cultures, setCultures] = useState([]);
  const [selectedCultures, setSelectedCultures] = useState([]);

  const loadCategories = async () => {
    try {
      // Use hardcoded categories matching the app
      const categoriesList = [
        { id: 'venue', name: 'Venues' },
        { id: 'photo', name: 'Photo/Video' },
        { id: 'music', name: 'Music/DJ' },
        { id: 'catering', name: 'Catering' },
        { id: 'entertainment', name: 'Entertainment' },
        { id: 'decorations', name: 'Decorations' },
        { id: 'beauty', name: 'Beauty' },
        { id: 'cake', name: 'Cake' },
        { id: 'transportation', name: 'Transportation' },
        { id: 'planners', name: 'Planners' },
        { id: 'fashion', name: 'Fashion' },
        { id: 'stationery', name: 'Stationery' }
      ];
      setCategories(categoriesList);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadEventTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/lookup/event-types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEventTypes(data.eventTypes || []);
      }
    } catch (error) {
      console.error('Error loading event types:', error);
    }
  };

  const loadCultures = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/lookup/cultures`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCultures(data.cultures || []);
      }
    } catch (error) {
      console.error('Error loading cultures:', error);
    }
  };

  // Map category names to IDs
  const loadSubcategories = async (categoryName) => {
    const catName = categoryName || selectedCategoryName;
    if (!catName) return;
    
    try {
      setLoadingSubcategories(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/lookup/subcategories?category=${encodeURIComponent(catName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSubcategoriesOptions(data.subcategories || []);
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
    } finally {
      setLoadingSubcategories(false);
    }
  };

  const loadFeatures = async (categoryName) => {
    const catName = categoryName || selectedCategoryName;
    if (!catName) return;
    
    try {
      setLoadingFeatures(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/features/all-grouped`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Filter categories based on vendor's category using multiple approaches
        const applicableFeatureCategories = CATEGORY_TO_FEATURE_MAP[catName] || [];
        
        // Get the category ID from the category name for matching
        const catId = CATEGORY_NAME_TO_ID[catName] || catName.toLowerCase();
        
        const filteredCategories = (data.categories || []).filter(cat => {
          // Check by CATEGORY_TO_FEATURE_MAP
          const matchesByMap = applicableFeatureCategories.includes(cat.categoryName);
          // Check by ApplicableVendorCategories field from API
          const matchesByApplicable = cat.applicableVendorCategories === catId;
          return matchesByMap || matchesByApplicable;
        });
        
        // Filter out categories with no features
        const categoriesWithFeatures = filteredCategories.filter(cat => 
          cat.features && cat.features.length > 0 && cat.features[0]?.featureId
        );
        
        setFeatureCategories(categoriesWithFeatures);
      }
      
      // Load selected features
      const featuresResponse = await fetch(`${API_BASE_URL}/vendors/features/vendor/${vendorProfileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (featuresResponse.ok) {
        const featuresData = await featuresResponse.json();
        const features = featuresData.features || featuresData.selectedFeatures || [];
        // Extract just the feature IDs if we got full objects
        const featureIds = features.map(f => typeof f === 'object' ? (f.FeatureID || f.featureId) : f);
        setSelectedFeatures(featureIds);
      }
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const loadCategoryQuestions = async (categoryName) => {
    const catName = categoryName || selectedCategoryName;
    if (!catName) return;
    
    try {
      setLoadingQuestions(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/category-questions/${encodeURIComponent(catName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategoryQuestions(data.questions || []);
        
        // Load vendor's answers
        const answersResponse = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/category-answers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (answersResponse.ok) {
          const answersData = await answersResponse.json();
          const answersMap = {};
          (answersData.answers || []).forEach(a => {
            answersMap[a.QuestionID] = a.Answer;
          });
          setQuestionAnswers(answersMap);
        }
      }
    } catch (error) {
      console.error('Error loading category questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleCategoryChange = (e) => {
    const catId = e.target.value;
    setSelectedCategory(catId);
    // Use the CATEGORY_ID_TO_NAME mapping to get the proper name
    const categoryName = CATEGORY_ID_TO_NAME[catId] || '';
    setSelectedCategoryName(categoryName);
    // Clear selections for the new category
    setSelectedSubcategories([]);
    setSelectedFeatures([]);
    // Directly load data for the new category
    if (categoryName) {
      loadSubcategories(categoryName);
      loadFeatures(categoryName);
      loadCategoryQuestions(categoryName);
    }
  };

  // Initial load effect - runs once when component mounts
  useEffect(() => {
    let isCancelled = false;
    
    const initializePanel = async () => {
      loadCategories();
      loadEventTypes();
      loadCultures();
      
      // Load vendor data and get the category name
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (isCancelled) return;
        
        if (response.ok) {
          const data = await response.json();
          const vendorData = data.data || data;
          
          // Load primary category
          const cats = vendorData.categories || [];
          const primary = cats.find(c => c.IsPrimary) || cats[0];
          let categoryName = '';
          if (primary) {
            // The category from DB might be stored as ID (e.g., "photo") or name (e.g., "Photo/Video")
            // We need to normalize it to the proper name for API calls
            const rawCategory = primary.Category || '';
            categoryName = CATEGORY_ID_TO_NAME[rawCategory] || rawCategory;
            const categoryId = CATEGORY_NAME_TO_ID[categoryName] || rawCategory.toLowerCase();
            setSelectedCategory(categoryId);
            setSelectedCategoryName(categoryName);
            setOriginalCategory(categoryId); // Store original for comparison
          }
          
          // Load selected subcategories
          const subs = vendorData.subcategories || [];
          setSelectedSubcategories(subs.map(s => s.SubcategoryID));
          
          // Load event types
          const events = vendorData.eventTypes || [];
          setSelectedEventTypes(events.map(e => e.EventTypeID));
          
          // Load cultures
          const cults = vendorData.cultures || [];
          setSelectedCultures(cults.map(c => c.CultureID));
          
          // Load category-specific data after setting state
          if (categoryName && !isCancelled) {
            await Promise.all([
              loadSubcategories(categoryName),
              loadFeatures(categoryName),
              loadCategoryQuestions(categoryName)
            ]);
          }
        }
      } catch (error) {
        console.error('Error loading vendor data:', error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    
    initializePanel();
    
    return () => {
      isCancelled = true;
    };
  }, [vendorProfileId]);

  const toggleSubcategory = (subId) => {
    setSelectedSubcategories(prev => 
      prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]
    );
  };

  const toggleFeature = (featureId) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId) ? prev.filter(id => id !== featureId) : [...prev, featureId]
    );
  };

  const toggleEventType = (eventTypeId) => {
    setSelectedEventTypes(prev => 
      prev.includes(eventTypeId) ? prev.filter(id => id !== eventTypeId) : [...prev, eventTypeId]
    );
  };

  const toggleCulture = (cultureId) => {
    setSelectedCultures(prev => 
      prev.includes(cultureId) ? prev.filter(id => id !== cultureId) : [...prev, cultureId]
    );
  };

  const handleQuestionAnswer = (questionId, answer) => {
    setQuestionAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Save category and subcategories
      await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/categories`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          primaryCategoryId: selectedCategory,
          primaryCategory: selectedCategoryName,
          subcategoryIds: selectedSubcategories
        })
      });
      
      // Save features
      await fetch(`${API_BASE_URL}/vendors/features/vendor/${vendorProfileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ featureIds: selectedFeatures })
      });
      
      // Save category question answers
      const answersArray = Object.entries(questionAnswers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer
      }));
      
      if (answersArray.length > 0) {
        await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/category-answers`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ answers: answersArray })
        });
      }

      // Save event types
      await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/event-types`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ eventTypeIds: selectedEventTypes })
      });

      // Save cultures
      await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/cultures`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cultureIds: selectedCultures })
      });
      
      showBanner('Category & services saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving:', error);
      showBanner('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
        </button>
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.1rem' }}>
            <i className="fas fa-tags"></i>
          </span>
          Category & Services
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Define your service category, specializations, features, and answer category-specific questions
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

        {/* Category Change Warning Modal */}
        {showCategoryWarning && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ color: '#d97706', fontSize: '1.25rem' }}></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>
                  Change Primary Category?
                </h3>
              </div>
              
              <p style={{ color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                Changing your primary category will clear the following category-specific data:
              </p>
              
              <ul style={{ 
                margin: '0 0 1.5rem 0', 
                padding: '0 0 0 1.25rem',
                color: '#6b7280',
                fontSize: '0.875rem',
                lineHeight: 1.8
              }}>
                <li><strong>Subcategories</strong> - Your selected service specializations</li>
                <li><strong>Features & Amenities</strong> - Category-specific features you offer</li>
                <li><strong>Category Questions</strong> - Answers to category-specific questions</li>
                <li><strong>Services & Packages</strong> - May need to be updated for the new category</li>
              </ul>
              
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                  This action cannot be undone. You will need to re-enter this information for the new category.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowCategoryWarning(false);
                    setPendingCategoryChange(null);
                  }}
                  className="btn btn-outline"
                  style={{ padding: '0.625rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (pendingCategoryChange) {
                      const { catId, catName } = pendingCategoryChange;
                      setSelectedCategory(catId);
                      setSelectedCategoryName(catName);
                      setSelectedSubcategories([]);
                      setSelectedFeatures([]);
                      setCategoryQuestions([]);
                      setQuestionAnswers({});
                      // Load new category data
                      loadSubcategories(catName);
                      loadFeatures(catName);
                      loadCategoryQuestions(catName);
                    }
                    setShowCategoryWarning(false);
                    setPendingCategoryChange(null);
                  }}
                  className="btn"
                  style={{ 
                    padding: '0.625rem 1.25rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  Yes, Change Category
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Primary Category */}
        <FormRow 
          label="Primary Category" 
          description="Select your main service category"
          required
        >
          <SelectDropdown
            options={categories.map(cat => cat.CategoryName || cat.name)}
            value={CATEGORY_ID_TO_NAME[selectedCategory] || ''}
            onChange={(val) => {
              const catId = CATEGORY_NAME_TO_ID[val] || val.toLowerCase();
              
              // If there's an original category and it's different, show warning
              if (originalCategory && originalCategory !== catId) {
                setPendingCategoryChange({ catId, catName: val });
                setShowCategoryWarning(true);
              } else {
                // First time selection or same category - no warning needed
                setSelectedCategory(catId);
                setSelectedCategoryName(val);
                if (!originalCategory) {
                  setOriginalCategory(catId);
                }
                // Load category data
                loadSubcategories(val);
                loadFeatures(val);
                loadCategoryQuestions(val);
              }
            }}
            placeholder="Select category"
          />
        </FormRow>

        {/* Subcategories */}
        {selectedCategory && subcategoriesOptions.length > 0 && (
          <FormRow 
            label={`Subcategories${selectedSubcategories.length > 0 ? ` (${selectedSubcategories.length} selected)` : ''}`}
            description="Select the specific services you offer"
          >
            {loadingSubcategories ? (
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto', width: '24px', height: '24px' }}></div>
              </div>
            ) : (
              <MultiSelectTags
                options={subcategoriesOptions.map(sub => sub.SubcategoryName)}
                selectedValues={subcategoriesOptions
                  .filter(sub => selectedSubcategories.includes(sub.SubcategoryID))
                  .map(sub => sub.SubcategoryName)}
                onChange={(names) => {
                  const ids = subcategoriesOptions
                    .filter(sub => names.includes(sub.SubcategoryName))
                    .map(sub => sub.SubcategoryID);
                  setSelectedSubcategories(ids);
                }}
                placeholder="Select subcategories..."
              />
            )}
          </FormRow>
        )}

        {/* Event Types */}
        {eventTypes.length > 0 && (
          <FormRow 
            label={`Event Types${selectedEventTypes.length > 0 ? ` (${selectedEventTypes.length} selected)` : ''}`}
            description="Select the types of events you serve"
          >
            <MultiSelectTags
              options={eventTypes.map(et => et.EventTypeName)}
              selectedValues={eventTypes
                .filter(et => selectedEventTypes.includes(et.EventTypeID))
                .map(et => et.EventTypeName)}
              onChange={(names) => {
                const ids = eventTypes
                  .filter(et => names.includes(et.EventTypeName))
                  .map(et => et.EventTypeID);
                setSelectedEventTypes(ids);
              }}
              placeholder="Select event types..."
            />
          </FormRow>
        )}

        {/* Cultures */}
        {cultures.length > 0 && (
          <FormRow 
            label={`Cultures Served${selectedCultures.length > 0 ? ` (${selectedCultures.length} selected)` : ''}`}
            description="Select the cultural backgrounds you specialize in"
          >
            <MultiSelectTags
              options={cultures.map(c => c.CultureName)}
              selectedValues={cultures
                .filter(c => selectedCultures.includes(c.CultureID))
                .map(c => c.CultureName)}
              onChange={(names) => {
                const ids = cultures
                  .filter(c => names.includes(c.CultureName))
                  .map(c => c.CultureID);
                setSelectedCultures(ids);
              }}
              placeholder="Select cultures..."
            />
          </FormRow>
        )}

        {/* Features & Amenities - keeping pill buttons but in FormRow layout */}
        {selectedCategory && (
          <FormRow 
            label={`Features & Amenities${selectedFeatures.length > 0 ? ` (${selectedFeatures.length} selected)` : ''}`}
            description="Select the amenities and capabilities you offer"
          >
            {loadingFeatures ? (
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto', width: '24px', height: '24px' }}></div>
              </div>
            ) : featureCategories.length === 0 ? (
              <p style={{ color: 'var(--text-light)', fontStyle: 'italic', margin: 0 }}>
                No features available for {selectedCategoryName} category.
              </p>
            ) : (
              <div>
                {featureCategories.map(cat => (
                  <div key={cat.categoryName} style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                      {cat.categoryName}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {cat.features.map(feature => {
                        const featureId = feature.FeatureID || feature.featureId;
                        const featureName = feature.FeatureName || feature.featureName;
                        return (
                          <ChipButton
                            key={featureId}
                            selected={selectedFeatures.includes(featureId)}
                            onClick={() => toggleFeature(featureId)}
                          >
                            {featureName}
                          </ChipButton>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormRow>
        )}

        {/* Category Questions */}
        {selectedCategory && categoryQuestions.length > 0 && (
          <div style={{ marginBottom: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <SectionHeader 
              title="Category Questions" 
              description="Answer these questions to help clients understand your services better"
            />
            {loadingQuestions ? (
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto', width: '24px', height: '24px' }}></div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {categoryQuestions.map(q => {
                  const answer = questionAnswers[q.QuestionID] || '';
                  const selectedOptions = answer ? answer.split(',').map(s => s.trim()).filter(Boolean) : [];
                  const options = q.Options ? q.Options.split(',').map(o => o.trim()) : [];
                  
                  return (
                    <FormRow
                      key={q.QuestionID}
                      label={q.QuestionText}
                      description={q.Description}
                      required={q.IsRequired}
                    >
                      {/* Boolean/Toggle Question */}
                      {(q.QuestionType === 'boolean' || q.QuestionType === 'YesNo') ? (
                        <ToggleSwitch
                          checked={answer === 'Yes' || answer === 'true' || answer === true}
                          onChange={(checked) => handleQuestionAnswer(q.QuestionID, checked ? 'Yes' : 'No')}
                        />
                      ) : (q.QuestionType === 'MultiSelect' || q.QuestionType === 'multiselect') && options.length > 0 ? (
                        /* Multi-Select with Tags */
                        <MultiSelectTags
                          options={options}
                          selectedValues={selectedOptions}
                          onChange={(values) => handleQuestionAnswer(q.QuestionID, values.join(','))}
                          placeholder="Select options..."
                        />
                      ) : (q.QuestionType === 'Select' || q.QuestionType === 'select') && options.length > 0 ? (
                        <SelectDropdown
                          options={options}
                          value={answer}
                          onChange={(val) => handleQuestionAnswer(q.QuestionID, val)}
                          placeholder="Select an option"
                        />
                      ) : q.QuestionType === 'Number' ? (
                        <input
                          type="number"
                          value={answer}
                          onChange={(e) => handleQuestionAnswer(q.QuestionID, e.target.value)}
                          placeholder="Enter a number"
                          style={{
                            width: '100%',
                            maxWidth: '200px',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '0.95rem'
                          }}
                        />
                      ) : q.QuestionType === 'textarea' ? (
                        <textarea
                          value={answer}
                          onChange={(e) => handleQuestionAnswer(q.QuestionID, e.target.value)}
                          placeholder="Enter your answer..."
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '0.95rem',
                            resize: 'vertical'
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={answer}
                          onChange={(e) => handleQuestionAnswer(q.QuestionID, e.target.value)}
                          placeholder="Enter your answer..."
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '0.95rem'
                          }}
                        />
                      )}
                    </FormRow>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !selectedCategory}
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default CategoryServicesPanel;
