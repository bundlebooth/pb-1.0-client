import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import { API_BASE_URL } from '../config';

function HelpCentreArticlePage() {
  const { articleSlug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  useEffect(() => {
    const loadArticle = async () => {
      if (!articleSlug) return;
      
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/public/help-centre/articles/${articleSlug}`);
        if (response.ok) {
          const data = await response.json();
          setArticle(data.article);
          setRelatedArticles(data.relatedArticles || []);
        } else {
          navigate('/help-centre');
        }
      } catch (error) {
        console.error('Error loading article:', error);
        navigate('/help-centre');
      } finally {
        setLoading(false);
      }
    };
    
    loadArticle();
  }, [articleSlug, navigate]);

  const submitFeedback = async (helpful) => {
    if (feedbackGiven || !article) return;
    
    try {
      await fetch(`${API_BASE_URL}/public/help-centre/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'article', id: article.ArticleID, helpful })
      });
      setFeedbackGiven(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  if (loading) {
    return (
      <PageLayout variant="fullWidth" pageClassName="help-centre-article-page">
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner"></div>
        </div>
      </PageLayout>
    );
  }

  if (!article) {
    return (
      <PageLayout variant="fullWidth" pageClassName="help-centre-article-page">
        <Header />
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-file-alt" style={{ fontSize: '4rem', color: '#d1d5db', marginBottom: '1rem' }}></i>
            <h2 style={{ color: '#1f2937', marginBottom: '0.5rem' }}>Article not found</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>The article you're looking for doesn't exist or has been removed.</p>
            <Link to="/help-centre" style={{ color: '#5B68F4', fontWeight: '500' }}>← Back to Help Centre</Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="fullWidth" pageClassName="help-centre-article-page">
      <Header />
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #5B68F4 0%, #8B5CF6 100%)',
          padding: '2rem 1.5rem'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Link to="/help-centre" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <i className="fas fa-arrow-left"></i> Help Centre
            </Link>
            {article.CategoryName && (
              <div style={{ marginBottom: '0.5rem' }}>
                <Link to={`/help-centre/category/${article.CategorySlug}`} style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  {article.CategoryName}
                </Link>
              </div>
            )}
            <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.75rem' }}>
              {article.Title}
            </h1>
            {article.Summary && (
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', lineHeight: '1.6' }}>
                {article.Summary}
              </p>
            )}
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
              {article.Author && <span><i className="fas fa-user" style={{ marginRight: '0.5rem' }}></i>{article.Author}</span>}
              {article.PublishedAt && <span><i className="fas fa-calendar" style={{ marginRight: '0.5rem' }}></i>{new Date(article.PublishedAt).toLocaleDateString()}</span>}
              {article.ViewCount > 0 && <span><i className="fas fa-eye" style={{ marginRight: '0.5rem' }}></i>{article.ViewCount} views</span>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          {/* Article Content */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
            <div 
              className="article-content"
              style={{ color: '#374151', lineHeight: '1.8', fontSize: '1rem' }}
              dangerouslySetInnerHTML={{ __html: article.Content }}
            />
          </div>

          {/* Feedback Section */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', marginBottom: '2rem', textAlign: 'center' }}>
            {feedbackGiven ? (
              <div>
                <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '2rem', marginBottom: '0.75rem' }}></i>
                <p style={{ color: '#1f2937', fontWeight: '500' }}>Thank you for your feedback!</p>
              </div>
            ) : (
              <>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Was this article helpful?</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button 
                    onClick={() => submitFeedback(true)}
                    style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.75rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151', fontSize: '0.95rem', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; }}
                  >
                    <i className="fas fa-thumbs-up"></i> Yes, it helped
                  </button>
                  <button 
                    onClick={() => submitFeedback(false)}
                    style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.75rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151', fontSize: '0.95rem', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; }}
                  >
                    <i className="fas fa-thumbs-down"></i> No, I need more help
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#1f2937', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Related Articles</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {relatedArticles.map(related => (
                  <Link 
                    key={related.ArticleID}
                    to={`/help-centre/article/${related.Slug}`}
                    style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e5e7eb', textDecoration: 'none', display: 'block', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <h4 style={{ color: '#5B68F4', fontWeight: '500', marginBottom: '0.5rem' }}>{related.Title}</h4>
                    {related.Summary && <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.5' }}>{related.Summary.substring(0, 120)}...</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back Link */}
          <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <Link to="/help-centre" style={{ color: '#5B68F4', textDecoration: 'none', fontWeight: '500' }}>
              <i className="fas fa-arrow-left" style={{ marginRight: '0.5rem' }}></i> Back to Help Centre
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .article-content h2 { font-size: 1.5rem; font-weight: 600; color: #1f2937; margin: 1.5rem 0 1rem; }
        .article-content h3 { font-size: 1.25rem; font-weight: 600; color: #1f2937; margin: 1.25rem 0 0.75rem; }
        .article-content p { margin-bottom: 1rem; }
        .article-content ul, .article-content ol { margin-bottom: 1rem; padding-left: 1.5rem; }
        .article-content li { margin-bottom: 0.5rem; }
        .article-content strong { font-weight: 600; color: #1f2937; }
        .article-content a { color: #5B68F4; text-decoration: underline; }
      `}</style>
    </PageLayout>
  );
}

export default HelpCentreArticlePage;
