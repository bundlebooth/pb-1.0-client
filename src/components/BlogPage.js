import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { formatDateFormal } from '../utils/helpers';
import { PageLayout, ContentWrapper } from './PageWrapper';
import Header from './Header';
import Footer from './Footer';
import UnifiedSidebar from './UnifiedSidebar';
import './BlogPage.css';

const BlogPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { currentUser } = useAuth();
  const [featuredBlogs, setFeaturedBlogs] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const carouselRef = useRef(null);

  useEffect(() => {
    if (slug) {
      // If slug is provided, show single blog post
      return;
    }
    fetchFeaturedBlogs();
    fetchCategories();
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      fetchBlogs();
    }
  }, [selectedCategory, page, slug]);

  // Auto-advance carousel
  useEffect(() => {
    if (featuredBlogs.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % featuredBlogs.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredBlogs.length]);

  const fetchFeaturedBlogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/public/blogs/featured`);
      if (response.ok) {
        const data = await response.json();
        setFeaturedBlogs(data.blogs || []);
      }
    } catch (error) {
      console.error('Error fetching featured blogs:', error);
    }
  };

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/public/blogs?page=${page}&limit=9`;
      if (selectedCategory) {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setBlogs(data.blogs || []);
        setTotalPages(Math.ceil((data.total || 0) / 9));
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/public/blog-categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const formatDate = formatDateFormal;

  const handleSlideChange = (direction) => {
    if (direction === 'prev') {
      setCurrentSlide(prev => (prev - 1 + featuredBlogs.length) % featuredBlogs.length);
    } else {
      setCurrentSlide(prev => (prev + 1) % featuredBlogs.length);
    }
  };

  const handleBlogClick = (blogSlug) => {
    navigate(`/blog/${blogSlug}`);
  };

  // If viewing single blog post
  if (slug) {
    return <SingleBlogPost slug={slug} navigate={navigate} />;
  }

  return (
    <PageLayout variant="fullWidth" pageClassName="blog-page">
      {/* Standard Header */}
      <Header 
        onSearch={() => {}} 
        onProfileClick={() => setSidebarOpen(true)}
        onWishlistClick={() => {}}
        onChatClick={() => {}}
        onNotificationsClick={() => {}}
      />
      
      {/* Blog Category Navigation - Below Header */}
      <div className="blog-category-nav">
        <ContentWrapper variant="standard">
          <div className="blog-category-nav-inner">
            <span className="blog-badge">Blog</span>
            <nav className="blog-nav">
              <button
                className={`nav-link ${!selectedCategory ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory('');
                  setPage(1);
                }}
              >
                All Posts
              </button>
              {categories.slice(0, 6).map((cat, index) => (
                <button
                  key={index}
                  className={`nav-link ${selectedCategory === (cat.Category || cat) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat.Category || cat);
                    setPage(1);
                  }}
                >
                  {cat.Category || cat}
                </button>
              ))}
            </nav>
          </div>
        </ContentWrapper>
      </div>

      {/* Hero Section */}
      <section className="blog-hero">
        <div className="hero-content">
          <h1>Planbeau Blog</h1>
          <p>Find inspiration for any event imaginable</p>
        </div>

        {/* Featured Carousel */}
        {featuredBlogs.length > 0 && (
          <div className="featured-carousel" ref={carouselRef}>
            <button 
              className="carousel-nav prev" 
              onClick={() => handleSlideChange('prev')}
              aria-label="Previous slide"
            >
              <i className="fas fa-chevron-left"></i>
            </button>

            <div className="carousel-container">
              {featuredBlogs.map((blog, index) => (
                <div
                  key={blog.BlogID}
                  className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
                  style={{ transform: `translateX(${(index - currentSlide) * 100}%)` }}
                >
                  <div className="slide-image">
                    <img 
                      src={blog.FeaturedImageURL || '/images/blog-placeholder.jpg'} 
                      alt={blog.Title}
                    />
                  </div>
                  <div className="slide-content">
                    <span className="slide-category">{blog.Category}</span>
                    <span className="slide-date">{formatDate(blog.PublishedAt)}</span>
                    <h2>{blog.Title}</h2>
                    <p>{blog.Excerpt}</p>
                    <button 
                      className="read-more-btn"
                      onClick={() => handleBlogClick(blog.Slug)}
                    >
                      Read more
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              className="carousel-nav next" 
              onClick={() => handleSlideChange('next')}
              aria-label="Next slide"
            >
              <i className="fas fa-chevron-right"></i>
            </button>

            {/* Carousel Dots */}
            <div className="carousel-dots">
              {featuredBlogs.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Category Filter Pills */}
      <section className="category-filter">
        <button
          className={`filter-pill ${!selectedCategory ? 'active' : ''}`}
          onClick={() => { setSelectedCategory(''); setPage(1); }}
        >
          All Posts
        </button>
        {categories.map((cat, index) => (
          <button
            key={index}
            className={`filter-pill ${selectedCategory === (cat.Category || cat) ? 'active' : ''}`}
            onClick={() => { setSelectedCategory(cat.Category || cat); setPage(1); }}
          >
            {cat.Category || cat}
            {cat.PostCount && <span className="count">({cat.PostCount})</span>}
          </button>
        ))}
      </section>

      {/* Blog Grid */}
      <section className="blog-grid-section">
        <h2 className="section-title">
          {selectedCategory ? `${selectedCategory} Articles` : 'The latest from the blog'}
        </h2>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading articles...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-newspaper"></i>
            <h3>No articles found</h3>
            <p>Check back soon for new content!</p>
          </div>
        ) : (
          <>
            <div className="blog-grid">
              {blogs.map(blog => (
                <article 
                  key={blog.BlogID} 
                  className="blog-card"
                  onClick={() => handleBlogClick(blog.Slug)}
                >
                  <div className="card-image">
                    <img 
                      src={blog.FeaturedImageURL || '/images/blog-placeholder.jpg'} 
                      alt={blog.Title}
                    />
                    <span className="card-category">{blog.Category}</span>
                  </div>
                  <div className="card-content">
                    <h3>{blog.Title}</h3>
                    <p>{blog.Excerpt}</p>
                    <div className="card-meta">
                      <span className="author">
                        {blog.AuthorImageURL && (
                          <img src={blog.AuthorImageURL} alt={blog.Author} />
                        )}
                        {blog.Author}
                      </span>
                      <span className="date">{formatDate(blog.PublishedAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <i className="fas fa-chevron-left"></i> Previous
                </button>
                <span className="page-info">Page {page} of {totalPages}</span>
                <button
                  className="page-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <Footer />
      
      {/* User Sidebar */}
      <UnifiedSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
    </PageLayout>
  );
};

// Single Blog Post Component
const SingleBlogPost = ({ slug, navigate }) => {
  const { currentUser } = useAuth();
  const [blog, setBlog] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchBlog();
  }, [slug]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/public/blogs/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setBlog(data.blog);
        setRelatedPosts(data.relatedPosts || []);
      } else {
        navigate('/blog');
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = formatDateFormal;

  if (loading) {
    return (
      <div className="blog-page single-post">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading article...</p>
        </div>
      </div>
    );
  }

  if (!blog) {
    return null;
  }

  return (
    <PageLayout variant="fullWidth" pageClassName="blog-page single-post">
      {/* Standard Header */}
      <Header 
        onSearch={() => {}} 
        onProfileClick={() => setSidebarOpen(true)}
        onWishlistClick={() => {}}
        onChatClick={() => {}}
        onNotificationsClick={() => {}}
      />
      
      {/* Back to Blog Navigation */}
      <div className="blog-category-nav">
        <ContentWrapper variant="standard">
          <div className="blog-category-nav-inner">
            <button className="back-btn" onClick={() => navigate('/blog')}>
              <i className="fas fa-arrow-left"></i> Back to Blog
            </button>
            <span className="blog-badge">Blog</span>
          </div>
        </ContentWrapper>
      </div>

      {/* Article */}
      <article className="blog-article">
        <div className="article-header">
          <span className="article-category">{blog.Category}</span>
          <h1>{blog.Title}</h1>
          <div className="article-meta">
            <div className="author-info">
              {blog.AuthorImageURL && (
                <img src={blog.AuthorImageURL} alt={blog.Author} className="author-avatar" />
              )}
              <span className="author-name">{blog.Author}</span>
            </div>
            <span className="publish-date">{formatDate(blog.PublishedAt)}</span>
            {blog.ViewCount > 0 && (
              <span className="view-count">
                <i className="fas fa-eye"></i> {blog.ViewCount} views
              </span>
            )}
          </div>
        </div>

        {blog.FeaturedImageURL && (
          <div className="article-featured-image">
            <img src={blog.FeaturedImageURL} alt={blog.Title} />
          </div>
        )}

        <div 
          className="article-content"
          dangerouslySetInnerHTML={{ __html: blog.Content }}
        />

        {blog.Tags && (
          <div className="article-tags">
            {blog.Tags.split(',').map((tag, index) => (
              <span key={index} className="tag">#{tag.trim()}</span>
            ))}
          </div>
        )}

        {/* Share Buttons */}
        <div className="share-section">
          <span>Share this article:</span>
          <div className="share-buttons">
            <button 
              className="share-btn facebook"
              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
            >
              <i className="fab fa-facebook-f"></i>
            </button>
            <button 
              className="share-btn twitter"
              onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(blog.Title)}`, '_blank')}
            >
              <i className="fab fa-twitter"></i>
            </button>
            <button 
              className="share-btn linkedin"
              onClick={() => window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(blog.Title)}`, '_blank')}
            >
              <i className="fab fa-linkedin-in"></i>
            </button>
            <button 
              className="share-btn copy"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                // Show a brief toast notification instead of alert
                const toast = document.createElement('div');
                toast.textContent = 'Link copied to clipboard!';
                toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
              }}
            >
              <i className="fas fa-link"></i>
            </button>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="related-posts">
          <h2>Related Articles</h2>
          <div className="related-grid">
            {relatedPosts.map(post => (
              <article 
                key={post.BlogID} 
                className="blog-card"
                onClick={() => navigate(`/blog/${post.Slug}`)}
              >
                <div className="card-image">
                  <img 
                    src={post.FeaturedImageURL || '/images/blog-placeholder.jpg'} 
                    alt={post.Title}
                  />
                </div>
                <div className="card-content">
                  <h3>{post.Title}</h3>
                  <p>{post.Excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer />
      
      {/* User Sidebar */}
      <UnifiedSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
    </PageLayout>
  );
};

export default BlogPage;
