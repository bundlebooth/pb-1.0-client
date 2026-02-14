import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../config';
import './HelpCentrePage.css';

function HelpCentrePage() {
  const { categorySlug, articleId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  // FAQ Categories matching Giggster style (Image 2)
  const faqCategories = [
    { name: 'Most Frequently Asked', slug: 'Getting Started', icon: 'fa-star' },
    { name: 'General', slug: 'general', icon: 'fa-file-alt' },
    { name: 'Help with Booking', slug: 'Booking', icon: 'fa-calendar-check' },
    { name: 'For Vendors', slug: 'Vendors', icon: 'fa-briefcase' },
    { name: 'For Clients', slug: 'Clients', icon: 'fa-users' },
    { name: 'Payments & Billing', slug: 'Payments', icon: 'fa-credit-card' },
    { name: 'Trust & Safety', slug: 'Trust & Safety', icon: 'fa-shield-alt' },
    { name: 'Account & Profile', slug: 'Account', icon: 'fa-user-circle' },
    { name: 'Reviews & Ratings', slug: 'Reviews', icon: 'fa-star' },
    { name: 'Cancellations & Refunds', slug: 'Cancellations', icon: 'fa-undo' },
    { name: 'Messages & Communication', slug: 'Messages', icon: 'fa-comments' },
    { name: 'Technical Support', slug: 'Technical', icon: 'fa-cog' }
  ];

  // Load FAQs
  const loadFaqs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/public/faqs`);
      const data = await response.json();
      setFaqs(data.faqs || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      setFaqs([]);
    }
  }, []);

  // Search FAQs
  const handleSearch = useCallback((term) => {
    if (!term || term.length < 2) {
      setShowSearchResults(false);
      return;
    }
    const filtered = faqs.filter(faq => 
      faq.Question.toLowerCase().includes(term.toLowerCase()) ||
      faq.Answer.toLowerCase().includes(term.toLowerCase())
    );
    setSearchResults(filtered);
    setShowSearchResults(true);
  }, [faqs]);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, handleSearch]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadFaqs();
      setLoading(false);
    };
    loadData();
  }, [loadFaqs]);

  // Track view when article is opened
  const trackView = async (faqId) => {
    try {
      await fetch(`${API_BASE_URL}/public/faqs/${faqId}/view`, { method: 'POST' });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleArticleClick = (faq) => {
    setSelectedArticle(faq);
    setFeedbackGiven({});
    trackView(faq.FAQID);
    navigate(`/help-centre/category/${faq.Category}/article/${faq.FAQID}`, { replace: false });
  };

  const handleCategoryClick = (category) => {
    setSelectedArticle(null);
    navigate(`/help-centre/category/${encodeURIComponent(category.slug)}`);
  };

  const handleBackToCategories = () => {
    setSelectedArticle(null);
    navigate('/help-centre');
  };

  const handleBackToCategory = () => {
    setSelectedArticle(null);
    if (categorySlug) {
      navigate(`/help-centre/category/${categorySlug}`);
    } else {
      navigate('/help-centre');
    }
  };

  // Submit emoji feedback: 'sad', 'neutral', 'happy'
  const submitFeedback = async (faqId, rating) => {
    if (feedbackGiven[faqId]) return;
    try {
      await fetch(`${API_BASE_URL}/public/faqs/${faqId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });
      setFeedbackGiven(prev => ({ ...prev, [faqId]: rating }));
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const cat = faq.Category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  // Get current category info
  const currentCategory = categorySlug ? faqCategories.find(c => c.slug === categorySlug || c.slug === decodeURIComponent(categorySlug)) : null;
  const filteredFaqs = categorySlug 
    ? faqs.filter(faq => faq.Category === categorySlug || faq.Category === decodeURIComponent(categorySlug))
    : faqs;

  // Check if viewing article from URL
  useEffect(() => {
    if (articleId && faqs.length > 0) {
      const article = faqs.find(f => f.FAQID === parseInt(articleId));
      if (article) {
        setSelectedArticle(article);
        trackView(article.FAQID);
      }
    }
  }, [articleId, faqs]);

  // Article Detail View
  if (selectedArticle) {
    return (
      <PageLayout variant="fullWidth" pageClassName="help-centre-page">
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
          {/* Breadcrumb Navigation */}
          <div style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem 0', backgroundColor: '#f9fafb' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={handleBackToCategories} 
                style={{ background: 'none', border: 'none', color: 'var(--primary, #4F86E8)', cursor: 'pointer', fontSize: '0.9rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <i className="fas fa-home" style={{ fontSize: '0.8rem' }}></i> Help Centre
              </button>
              <span style={{ color: '#9ca3af' }}>›</span>
              <button 
                onClick={handleBackToCategory} 
                style={{ background: 'none', border: 'none', color: 'var(--primary, #4F86E8)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}
              >
                {currentCategory?.name || selectedArticle.Category}
              </button>
              <span style={{ color: '#9ca3af' }}>›</span>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{selectedArticle.Question?.substring(0, 50)}{selectedArticle.Question?.length > 50 ? '...' : ''}</span>
            </div>
          </div>

          {/* Article Content */}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
            <h1 style={{ color: '#111', fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem', lineHeight: '1.3' }}>
              {selectedArticle.Question}
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', color: '#6b7280', fontSize: '0.9rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary, #4F86E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: '600' }}>PB</div>
              <div>
                <div style={{ color: '#111', fontWeight: '500' }}>Planbeau Team</div>
                <div style={{ fontSize: '0.8rem' }}>Updated recently</div>
              </div>
            </div>

            {/* Article Body */}
            <div className="help-centre-article-body" dangerouslySetInnerHTML={{ __html: selectedArticle.Answer }} />

            {/* Emoji Feedback Section */}
            <div className="help-centre-feedback">
              <p className="help-centre-feedback-question">Did this answer your question?</p>
              {feedbackGiven[selectedArticle.FAQID] ? (
                <div className="help-centre-feedback-thanks">
                  <i className="fas fa-check-circle"></i> Thank you for your feedback!
                </div>
              ) : (
                <div className="help-centre-feedback-emojis">
                  <button 
                    className="help-centre-feedback-emoji" 
                    onClick={() => submitFeedback(selectedArticle.FAQID, 'sad')}
                    title="No, this didn't help"
                  >
                    😞
                  </button>
                  <button 
                    className="help-centre-feedback-emoji" 
                    onClick={() => submitFeedback(selectedArticle.FAQID, 'neutral')}
                    title="Somewhat helpful"
                  >
                    😐
                  </button>
                  <button 
                    className="help-centre-feedback-emoji" 
                    onClick={() => submitFeedback(selectedArticle.FAQID, 'happy')}
                    title="Yes, this helped!"
                  >
                    😀
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </PageLayout>
    );
  }

  // Category Detail View - list of articles
  if (categorySlug) {
    return (
      <PageLayout variant="fullWidth" pageClassName="help-centre-page">
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
          {/* Breadcrumb Navigation */}
          <div style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem 0', backgroundColor: '#f9fafb' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={handleBackToCategories} 
                style={{ background: 'none', border: 'none', color: 'var(--primary, #4F86E8)', cursor: 'pointer', fontSize: '0.9rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <i className="fas fa-home" style={{ fontSize: '0.8rem' }}></i> Help Centre
              </button>
              <span style={{ color: '#9ca3af' }}>›</span>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{currentCategory?.name || decodeURIComponent(categorySlug)}</span>
            </div>
          </div>

          {/* Category Header */}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1.5rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '56px', height: '56px', background: 'var(--primary, #4F86E8)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fas ${currentCategory?.icon || 'fa-folder'}`} style={{ color: '#fff', fontSize: '1.5rem' }}></i>
              </div>
              <div>
                <h1 style={{ color: '#111', fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>{currentCategory?.name || decodeURIComponent(categorySlug)}</h1>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>{filteredFaqs.length} articles in this collection</p>
              </div>
            </div>
          </div>

          {/* Articles List */}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 3rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner"></div>
              </div>
            ) : filteredFaqs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                No articles found in this category.
              </div>
            ) : (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff' }}>
                {filteredFaqs.map((faq, index) => (
                  <div 
                    key={faq.FAQID} 
                    onClick={() => handleArticleClick(faq)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '1rem 1.25rem', 
                      borderBottom: index < filteredFaqs.length - 1 ? '1px solid #e5e7eb' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <span style={{ color: 'var(--primary, #4F86E8)', fontSize: '0.95rem', fontWeight: '500' }}>{faq.Question}</span>
                    <i className="fas fa-chevron-right" style={{ color: '#d1d5db', fontSize: '0.75rem' }}></i>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </PageLayout>
    );
  }

  // Main Help Centre View - category list
  return (
    <PageLayout variant="fullWidth" pageClassName="help-centre-page">
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
        {/* Hero Section */}
        <div style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <h1 style={{ color: '#111', fontSize: '2rem', fontWeight: '700', marginBottom: '0.75rem' }}>How can we help you?</h1>
          <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '2rem' }}>Search our knowledge base or browse categories below</p>
          
          {/* Search Bar */}
          <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
            <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
              <input
                type="text"
                placeholder="Search for help articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '1.25rem 1.25rem 1.25rem 3.5rem', border: 'none', borderRadius: '12px', fontSize: '1rem', outline: 'none' }}
              />
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxHeight: '400px', overflow: 'auto', zIndex: 100, textAlign: 'left' }}>
                {searchResults.map(faq => (
                  <div 
                    key={faq.FAQID} 
                    onClick={() => { handleArticleClick(faq); setShowSearchResults(false); setSearchTerm(''); }}
                    style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <div style={{ color: '#111', fontWeight: '500', marginBottom: '0.25rem' }}>{faq.Question}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{faq.Category}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categories List */}
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1.5rem 3rem' }}>
          <h2 style={{ color: '#111', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Browse by Category</h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {faqCategories.filter(cat => groupedFaqs[cat.slug]?.length > 0).map(category => (
                <div 
                  key={category.slug}
                  onClick={() => handleCategoryClick(category)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '1.25rem', 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '12px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{ width: '48px', height: '48px', background: 'var(--primary, #4F86E8)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fas ${category.icon}`} style={{ color: '#fff', fontSize: '1.1rem' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--primary, #4F86E8)', fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{category.name}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{groupedFaqs[category.slug]?.length || 0} articles</div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ color: '#d1d5db', fontSize: '0.85rem' }}></i>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div style={{ backgroundColor: '#f9fafb', padding: '3rem 1.5rem', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
          <h2 style={{ color: '#111', fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.75rem' }}>Still need help?</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Our support team is here to assist you</p>
          <a href="mailto:support@planbeau.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary, #4F86E8)', color: '#fff', padding: '0.875rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '500' }}>
            <i className="fas fa-envelope"></i> Contact Support
          </a>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </PageLayout>
  );
}

export default HelpCentrePage;
