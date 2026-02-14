import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showBanner } from '../utils/helpers';
import { 
  Camera, Users, Music, Utensils, PartyPopper, Star, Ribbon, Scissors, Cake, Car, ClipboardList, ShoppingBag,
  Edit3, UserCheck, MessageCircle, Calendar, CreditCard, DollarSign, Shield, Award, MapPin, Clock, Image, Share2,
  TrendingUp
} from 'lucide-react';
import { PageLayout } from '../components/PageWrapper';
import Footer from '../components/Footer';
import MessagingWidget from '../components/MessagingWidget';
import ProfileModal from '../components/ProfileModal';
import './BecomeVendorLanding.css';

const BecomeVendorLanding = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingVendorRedirect, setPendingVendorRedirect] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll animation observer for class-based animations
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));

    return () => {
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  // Intersection Observer for state-based scroll animations (feature sections)
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.vendor-feature-section').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const handleGetStarted = () => {
    if (currentUser) {
      // Any logged-in user can proceed to setup
      // BecomeVendorPage will redirect approved vendors to dashboard
      navigate('/become-a-vendor/setup');
    } else {
      // Not logged in, show the login/signup modal
      sessionStorage.setItem('pendingVendorRedirect', 'true');
      setPendingVendorRedirect(true);
      setShowLoginModal(true);
    }
  };

  // Check for pending redirect on mount (in case page refreshed after login)
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingVendorRedirect');
    if (pending === 'true' && currentUser) {
      sessionStorage.removeItem('pendingVendorRedirect');
      // Any logged-in user can proceed - BecomeVendorPage handles approved vendor redirect
      navigate('/become-a-vendor/setup');
    }
  }, [currentUser, navigate]);

  // Navigate to setup after successful login/signup
  useEffect(() => {
    if (currentUser && pendingVendorRedirect) {
      sessionStorage.removeItem('pendingVendorRedirect');
      setPendingVendorRedirect(false);
      setShowLoginModal(false);
      // Any logged-in user can proceed - BecomeVendorPage handles approved vendor redirect
      navigate('/become-a-vendor/setup');
    }
  }, [currentUser, pendingVendorRedirect, navigate]);

  // Vendor categories matching the app
  const vendorCategories = [
    { icon: <Camera size={24} />, name: 'Photography & Video', color: '#06b6d4' },
    { icon: <Music size={24} />, name: 'Music & DJs', color: '#10b981' },
    { icon: <Utensils size={24} />, name: 'Catering', color: '#f59e0b' },
    { icon: <PartyPopper size={24} />, name: 'Entertainment', color: '#ef4444' },
    { icon: <Star size={24} />, name: 'Experiences', color: '#f97316' },
    { icon: <Ribbon size={24} />, name: 'Decorations', color: '#ec4899' },
    { icon: <Scissors size={24} />, name: 'Beauty & Makeup', color: '#be185d' },
    { icon: <Cake size={24} />, name: 'Cakes & Desserts', color: '#8b5cf6' },
    { icon: <Car size={24} />, name: 'Transportation', color: '#3b82f6' },
    { icon: <ClipboardList size={24} />, name: 'Event Planners', color: '#6366f1' },
    { icon: <ShoppingBag size={24} />, name: 'Fashion & Rentals', color: '#a855f7' }
  ];

  // Platform features for vendors
  const platformFeatures = [
    {
      icon: <Edit3 size={28} strokeWidth={1.5} />,
      title: 'Easy Profile Setup',
      description: 'Create your professional vendor profile in minutes. Add your services, pricing, photos, and business details with our step-by-step wizard.'
    },
    {
      icon: <MapPin size={28} strokeWidth={1.5} />,
      title: 'Location-Based Discovery',
      description: 'Get discovered by clients in your service areas. Set multiple locations and let our smart search connect you with nearby event planners.'
    },
    {
      icon: <Calendar size={28} strokeWidth={1.5} />,
      title: 'Booking Management',
      description: 'Manage all your bookings in one place. Accept requests, set availability, and coordinate event details directly through the platform.'
    },
    {
      icon: <MessageCircle size={28} strokeWidth={1.5} />,
      title: 'Direct Messaging',
      description: 'Communicate with clients securely through our built-in messaging system. Discuss requirements, share quotes, and finalize details.'
    },
    {
      icon: <CreditCard size={28} strokeWidth={1.5} />,
      title: 'Secure Payments',
      description: 'Accept payments through Stripe integration. Get paid directly to your bank account with transparent fee structures.'
    },
    {
      icon: <Image size={28} strokeWidth={1.5} />,
      title: 'Portfolio Showcase',
      description: 'Upload unlimited photos to showcase your best work. Let your portfolio speak for itself and attract more clients.'
    }
  ];

  // How it works steps
  const howItWorks = [
    {
      step: 1,
      title: 'Create Your Vendor Profile',
      subtitle: 'Set up your business on Planbeau for free',
      description: 'Sign up and complete your vendor profile. Add your business name, select your service categories, upload photos of your work, and set your pricing.',
      features: ['Choose from 13+ vendor categories', 'Add unlimited portfolio photos', 'Set your service areas', 'Define your business hours']
    },
    {
      step: 2,
      title: 'Get Discovered by Clients',
      subtitle: 'Appear in search results across Canada',
      description: 'Once approved, your profile becomes visible to thousands of event planners searching for vendors like you. Our smart filters help the right clients find you.',
      features: ['Location-based search visibility', 'Category and filter matching', 'Premium badge options', 'Google Reviews integration']
    },
    {
      step: 3,
      title: 'Receive & Manage Bookings',
      subtitle: 'Connect with clients and grow your business',
      description: 'Receive booking requests directly through the platform. Chat with clients, send quotes, and manage your calendar all in one place.',
      features: ['In-app messaging system', 'Booking request management', 'Secure payment processing', 'Review and rating system']
    }
  ];

  return (
    <PageLayout variant="fullWidth" pageClassName="become-vendor-landing">
      {/* Header */}
      <header className={`vendor-landing-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="vendor-landing-header-content">
          <div className="vendor-landing-logo" onClick={() => navigate('/')}>
            <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" className="header-logo-img" />
          </div>
          <nav className="vendor-landing-nav">
            <a href="/explore" className="nav-link">Browse Vendors</a>
            <button className="nav-btn primary-btn" onClick={handleGetStarted}>
              Become a Vendor
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section - Half Width Image with Overlay Text */}
      <section className="vendor-hero-split">
        <div className="vendor-hero-text animate-on-scroll fade-up">
          <span className="hero-label">Join Planbeau Today</span>
          <h1>Grow Your Event Business with Planbeau</h1>
          <p className="hero-subtitle">
            Connect with thousands of event planners looking for vendors like you. 
            Create your free profile and start receiving booking requests today.
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">13+</span>
              <span className="stat-label">Vendor Categories</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">15+</span>
              <span className="stat-label">Cities in Canada</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">Free</span>
              <span className="stat-label">To Get Started</span>
            </div>
          </div>
          <button className="hero-cta-btn" onClick={handleGetStarted}>
            Create Your Vendor Profile
          </button>
        </div>
        <div className="vendor-hero-image animate-on-scroll fade-left">
          <img 
            src="/images/planbeau-platform-assets/landing/vendor-hero.jpg" 
            alt="Successful vendor"
          />
        </div>
      </section>

      {/* Vendor Categories Section - Simple Inline List */}
      <section className="vendor-categories-section animate-on-scroll fade-up">
        <div className="section-container">
          <h2>Join 13+ Vendor Categories</h2>
          <p className="section-subtitle">
            <strong>Photography</strong> • <strong>Music & DJs</strong> • <strong>Catering</strong> • <strong>Venues</strong> • <strong>Entertainment</strong> • <strong>Decorations</strong> • <strong>Beauty</strong> • <strong>Cakes</strong> • <strong>Transportation</strong> • <strong>Event Planners</strong> • <strong>Fashion</strong> • <strong>Experiences</strong> • <strong>Stationery</strong>
          </p>
        </div>
      </section>

      {/* Why Planbeau Section - Image 2 Style with Overlapping Card */}
      <section className="why-vendor-section">
        <div className="section-container">
          <div className="why-vendor-content">
            <div className="why-vendor-card animate-on-scroll fade-up">
              <h2>Why Vendors Choose Planbeau</h2>
              <div className="why-item">
                <div className="why-icon"><Shield size={24} /></div>
                <div className="why-text">
                  <h3>Verified Clients</h3>
                  <p>All clients on Planbeau are <span className="highlight">verified</span> before they can book. Focus on what you do best while we handle the vetting.</p>
                </div>
              </div>
              <div className="why-item">
                <div className="why-icon"><DollarSign size={24} /></div>
                <div className="why-text">
                  <h3>Transparent Pricing</h3>
                  <p>Set your own <span className="highlight">rates and packages</span>. No hidden fees, no surprises. You're in <span className="highlight">complete control</span>.</p>
                </div>
              </div>
              <div className="why-item">
                <div className="why-icon"><Award size={24} /></div>
                <div className="why-text">
                  <h3>Build Your Reputation</h3>
                  <p>Collect <span className="highlight">reviews</span> from happy clients. Import your <span className="highlight">Google Reviews</span> to showcase your track record.</p>
                </div>
              </div>
            </div>
            <div className="why-vendor-image animate-on-scroll fade-left">
              <img 
                src="/images/planbeau-platform-assets/landing/venue-feature.jpg" 
                alt="Event venue"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Animated Feature Showcase - Modern Alternating Sections */}
      <section className="vendor-features-showcase">
        {/* Section Header */}
        <div className="section-container">
          <div className="features-header animate-on-scroll fade-up">
            <h2>Everything You Need to Succeed</h2>
            <p>Powerful tools to manage and grow your event business</p>
          </div>
        </div>

        {/* Feature 1: Easy Profile Setup */}
        <div 
          id="vendor-feature-profile" 
          className={`vendor-feature-section ${visibleSections.has('vendor-feature-profile') ? 'visible' : ''}`}
        >
          <div className="vendor-feature-content">
            <div className="vendor-feature-text">
              <div className="vendor-feature-badge">
                <Edit3 size={16} />
                <span>Quick Setup</span>
              </div>
              <h3>Create your professional profile in minutes</h3>
              <p>Our step-by-step wizard guides you through everything. Add your services, set your pricing, upload stunning photos, and showcase what makes you unique.</p>
              <ul className="vendor-feature-list">
                <li><UserCheck size={18} /> Guided profile builder</li>
                <li><UserCheck size={18} /> Service & pricing setup</li>
                <li><UserCheck size={18} /> Portfolio gallery</li>
                <li><UserCheck size={18} /> Business hours & availability</li>
              </ul>
            </div>
            <div className="vendor-feature-visual">
              <div className="profile-mockup">
                <div className="mockup-header">
                  <div className="mockup-avatar"></div>
                  <div className="mockup-info">
                    <div className="mockup-name"></div>
                    <div className="mockup-category"></div>
                  </div>
                </div>
                <div className="mockup-gallery">
                  <div className="mockup-img"></div>
                  <div className="mockup-img"></div>
                  <div className="mockup-img"></div>
                </div>
                <div className="mockup-stats">
                  <div className="mockup-stat"><Star size={14} /> 4.9</div>
                  <div className="mockup-stat"><MapPin size={14} /> Toronto</div>
                </div>
              </div>
              <div className="floating-badge floating-badge-1">
                <UserCheck size={16} />
                <span>Profile Complete!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Get Discovered */}
        <div 
          id="vendor-feature-discovery" 
          className={`vendor-feature-section vendor-feature-reverse ${visibleSections.has('vendor-feature-discovery') ? 'visible' : ''}`}
        >
          <div className="vendor-feature-content">
            <div className="vendor-feature-text">
              <div className="vendor-feature-badge vendor-badge-green">
                <MapPin size={16} />
                <span>Get Found</span>
              </div>
              <h3>Get discovered by clients in your area</h3>
              <p>Set your service areas and let our smart search connect you with event planners nearby. Appear in relevant searches and attract clients who are ready to book.</p>
              <div className="discovery-stats">
                <div className="discovery-stat">
                  <span className="stat-big">15+</span>
                  <span className="stat-desc">Cities across Canada</span>
                </div>
                <div className="discovery-stat">
                  <span className="stat-big">10K+</span>
                  <span className="stat-desc">Monthly searches</span>
                </div>
              </div>
            </div>
            <div className="vendor-feature-visual">
              <div className="map-visual">
                <div className="map-bg"></div>
                <div className="map-pin map-pin-1"><MapPin size={20} /></div>
                <div className="map-pin map-pin-2"><MapPin size={20} /></div>
                <div className="map-pin map-pin-3"><MapPin size={20} /></div>
                <div className="map-radius"></div>
              </div>
              <div className="floating-badge floating-badge-2">
                <TrendingUp size={16} />
                <span>+45% visibility</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: Booking Management */}
        <div 
          id="vendor-feature-bookings" 
          className={`vendor-feature-section ${visibleSections.has('vendor-feature-bookings') ? 'visible' : ''}`}
        >
          <div className="vendor-feature-content">
            <div className="vendor-feature-text">
              <div className="vendor-feature-badge vendor-badge-purple">
                <Calendar size={16} />
                <span>Manage Bookings</span>
              </div>
              <h3>All your bookings in one place</h3>
              <p>Accept requests, manage your calendar, and coordinate event details directly through the platform. Never miss a booking opportunity again.</p>
              <div className="booking-features">
                <div className="booking-feature">
                  <div className="bf-icon"><Calendar size={20} /></div>
                  <div>
                    <strong>Calendar Sync</strong>
                    <span>Manage availability</span>
                  </div>
                </div>
                <div className="booking-feature">
                  <div className="bf-icon"><Clock size={20} /></div>
                  <div>
                    <strong>Quick Responses</strong>
                    <span>Reply in seconds</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="vendor-feature-visual">
              <div className="booking-card-stack">
                <div className="booking-card bc-1">
                  <div className="bc-header">New Booking Request</div>
                  <div className="bc-event">Wedding Photography</div>
                  <div className="bc-date"><Calendar size={14} /> June 15, 2024</div>
                  <div className="bc-actions">
                    <button className="bc-accept">Accept</button>
                    <button className="bc-decline">Decline</button>
                  </div>
                </div>
                <div className="booking-card bc-2"></div>
                <div className="booking-card bc-3"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 4: Messaging & Payments */}
        <div 
          id="vendor-feature-payments" 
          className={`vendor-feature-section vendor-feature-reverse ${visibleSections.has('vendor-feature-payments') ? 'visible' : ''}`}
        >
          <div className="vendor-feature-content">
            <div className="vendor-feature-text">
              <div className="vendor-feature-badge vendor-badge-blue">
                <CreditCard size={16} />
                <span>Get Paid</span>
              </div>
              <h3>Secure payments & direct messaging</h3>
              <p>Chat with clients through our secure messaging system. Accept payments via Stripe with transparent fees and get paid directly to your bank account.</p>
              <div className="payment-highlights">
                <div className="payment-highlight">
                  <Shield size={20} />
                  <span>Secure Stripe Integration</span>
                </div>
                <div className="payment-highlight">
                  <MessageCircle size={20} />
                  <span>Built-in Messaging</span>
                </div>
                <div className="payment-highlight">
                  <DollarSign size={20} />
                  <span>Transparent Pricing</span>
                </div>
              </div>
            </div>
            <div className="vendor-feature-visual">
              <div className="chat-payment-visual">
                <div className="chat-bubble chat-bubble-client">
                  <span>Hi! I'd love to book you for my wedding in June.</span>
                </div>
                <div className="chat-bubble chat-bubble-vendor">
                  <span>I'd be happy to help! Let me send you a quote.</span>
                </div>
                <div className="payment-notification">
                  <CreditCard size={18} />
                  <div>
                    <strong>Payment Received</strong>
                    <span>$1,500.00 - Wedding Package</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 5: Portfolio & Reviews */}
        <div 
          id="vendor-feature-portfolio" 
          className={`vendor-feature-section ${visibleSections.has('vendor-feature-portfolio') ? 'visible' : ''}`}
        >
          <div className="vendor-feature-content">
            <div className="vendor-feature-text">
              <div className="vendor-feature-badge vendor-badge-orange">
                <Image size={16} />
                <span>Showcase Work</span>
              </div>
              <h3>Let your work speak for itself</h3>
              <p>Upload unlimited photos to showcase your best work. Import your Google Reviews to build trust and attract more premium clients.</p>
              <div className="portfolio-stats">
                <div className="portfolio-stat">
                  <Image size={24} />
                  <div>
                    <strong>Unlimited Photos</strong>
                    <span>High-quality gallery</span>
                  </div>
                </div>
                <div className="portfolio-stat">
                  <Star size={24} />
                  <div>
                    <strong>Google Reviews</strong>
                    <span>Import & display</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="vendor-feature-visual">
              <div className="portfolio-grid-visual">
                <img src="/images/planbeau-platform-assets/landing/slide-photography.jpg" alt="Portfolio 1" className="pg-img pg-img-1" />
                <img src="/images/planbeau-platform-assets/landing/slide-catering.jpg" alt="Portfolio 2" className="pg-img pg-img-2" />
                <img src="/images/planbeau-platform-assets/landing/slide-events.jpg" alt="Portfolio 3" className="pg-img pg-img-3" />
                <div className="review-float">
                  <div className="rf-stars">
                    <Star size={12} fill="#fbbf24" />
                    <Star size={12} fill="#fbbf24" />
                    <Star size={12} fill="#fbbf24" />
                    <Star size={12} fill="#fbbf24" />
                    <Star size={12} fill="#fbbf24" />
                  </div>
                  <span>"Amazing work!"</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <h2 className="animate-on-scroll fade-up">How to Become a Vendor in 3 Easy Steps</h2>
          
          {howItWorks.map((step, index) => (
            <div key={index} className={`how-step animate-on-scroll fade-up`}>
              <div className="step-content">
                <div className="step-number">{step.step}</div>
                <div className="step-details">
                  <h3>{step.title}</h3>
                  <p className="step-subtitle">{step.subtitle}</p>
                  <p className="step-description">{step.description}</p>
                  <ul className="step-features">
                    {step.features.map((feature, fIndex) => (
                      <li key={fIndex}><UserCheck size={16} /> {feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Success Stats Section */}
      <section className="vendor-stats-section animate-on-scroll fade-up">
        <div className="section-container">
          <h2>Join a Growing Community of Successful Vendors</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">500+</span>
              <span className="stat-label">Active Vendors</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Monthly Searches</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">95%</span>
              <span className="stat-label">Vendor Satisfaction</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24hr</span>
              <span className="stat-label">Avg. Response Time</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="testimonial-section animate-on-scroll fade-up">
        <div className="section-container">
          <div className="testimonial-content">
            <div className="testimonial-image">
              <img 
                src="/images/planbeau-platform-assets/landing/slide-photography.jpg" 
                alt="Happy vendor"
              />
            </div>
            <div className="testimonial-text">
              <span className="testimonial-label">Vendor Success Story</span>
              <blockquote>
                "Since joining Planbeau, I've doubled my bookings. The platform makes it so easy to showcase my work and connect with clients who are actually ready to book."
              </blockquote>
              <div className="testimonial-author">
                <span className="author-name">Marcus Chen</span>
                <span className="author-title">Wedding Photographer, Toronto</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid Section */}
      <section className="vendor-benefits-section animate-on-scroll fade-up">
        <div className="section-container">
          <h2>Why Vendors Love Planbeau</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon"><TrendingUp size={28} /></div>
              <h3>Increase Your Visibility</h3>
              <p>Get discovered by thousands of event planners actively searching for vendors like you.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><Clock size={28} /></div>
              <h3>Save Time on Admin</h3>
              <p>Manage bookings, messages, and payments all in one place. Less admin, more creativity.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><Shield size={28} /></div>
              <h3>Secure Payments</h3>
              <p>Get paid on time, every time. Our secure payment system protects both you and your clients.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><Star size={28} /></div>
              <h3>Build Your Reputation</h3>
              <p>Collect verified reviews that help you stand out and attract more premium clients.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="vendor-cta-section animate-on-scroll fade-up">
        <div className="section-container">
          <h2>Ready to Grow Your Business?</h2>
          <p>Join hundreds of vendors already thriving on Planbeau</p>
          <button className="cta-btn-large" onClick={handleGetStarted}>
            Create Your Free Vendor Profile
          </button>
          <span className="cta-note">No credit card required • Free to get started</span>
        </div>
      </section>

      <Footer />
      <MessagingWidget />

      {/* Login/Signup Modal - shown when user clicks Get Started without being logged in */}
      <ProfileModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        defaultView="login"
        defaultAccountType="vendor"
        hideAccountTypeSelector={true}
      />
    </PageLayout>
  );
};

export default BecomeVendorLanding;
