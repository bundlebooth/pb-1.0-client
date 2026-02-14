import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '../context/LocalizationContext';
import { useTranslation } from '../hooks/useTranslation';
import LanguageCurrencyModal from './LanguageCurrencyModal';

function Footer() {
  const navigate = useNavigate();
  const { getCurrentLanguage, getCurrentCurrency } = useLocalization();
  const { t } = useTranslation();
  const [showLocalizationModal, setShowLocalizationModal] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('language');

  const currentLanguage = getCurrentLanguage();
  const currentCurrency = getCurrentCurrency();

  const openLanguageModal = () => {
    setModalInitialTab('language');
    setShowLocalizationModal(true);
  };

  const openCurrencyModal = () => {
    setModalInitialTab('currency');
    setShowLocalizationModal(true);
  };

  const handleCategoryClick = (category) => {
    window.scrollTo(0, 0);
    navigate(`/explore?category=${category}`);
  };

  const handleNavigate = (path) => {
    window.scrollTo(0, 0);
    navigate(path);
  };

  return (
    <footer className="vv-footer" aria-label="Site footer">
      <div className="vv-wrap">
        <div className="vv-brand">
          <div className="vv-logo" onClick={() => handleNavigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={{ height: '80px', width: 'auto' }} />
          </div>
          <div className="vv-tagline">{t('footer.getTheApp')}</div>
          <div className="vv-badges">
            <a className="vv-badge" href="#" onClick={(e) => e.preventDefault()} aria-label="Get it on Google Play">
              <i className="fab fa-google-play"></i>
              <span>Google Play</span>
            </a>
            <a className="vv-badge" href="#" onClick={(e) => e.preventDefault()} aria-label="Download on the App Store">
              <i className="fab fa-apple"></i>
              <span>App Store</span>
            </a>
          </div>
          <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{t('footer.allRightsReserved')}</div>
        </div>

        <div className="vv-col">
          <h4>{t('footer.company')}</h4>
          <ul className="vv-links">
            <li><a href="/" onClick={(e) => { e.preventDefault(); handleNavigate('/'); }}>{t('nav.home')}</a></li>
            <li><a href="/explore" onClick={(e) => { e.preventDefault(); handleNavigate('/explore'); }}>{t('footer.browseVendors')}</a></li>
            <li><a href="/become-a-vendor" onClick={(e) => { e.preventDefault(); handleNavigate('/become-a-vendor'); }}>{t('footer.becomeVendor')}</a></li>
            <li><a href="/help-centre" onClick={(e) => { e.preventDefault(); handleNavigate('/help-centre'); }}>{t('footer.helpCentre')}</a></li>
            <li><a href="/blog" onClick={(e) => { e.preventDefault(); handleNavigate('/blog'); }}>{t('nav.blog')}</a></li>
            <li><a href="/privacy-policy" onClick={(e) => { e.preventDefault(); handleNavigate('/privacy-policy'); }}>{t('footer.privacyPolicy')}</a></li>
            <li><a href="/terms-of-service" onClick={(e) => { e.preventDefault(); handleNavigate('/terms-of-service'); }}>{t('footer.termsOfService')}</a></li>
          </ul>
        </div>

        <div className="vv-col">
          <h4>{t('footer.vendors')}</h4>
          <ul className="vv-links">
            <li><a href="#" onClick={(e) => { e.preventDefault(); handleCategoryClick('venue'); }}>{t('categories.venue')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); handleCategoryClick('photo'); }}>{t('categories.photo')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); handleCategoryClick('video'); }}>Videography</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); handleCategoryClick('music'); }}>{t('categories.music')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); handleCategoryClick('dj'); }}>DJ</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); handleCategoryClick('catering'); }}>{t('categories.catering')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); handleCategoryClick('decorations'); }}>{t('categories.decor')}</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); handleCategoryClick('planners'); }}>{t('categories.planner')}</a></li>
          </ul>
        </div>

        <div className="vv-col">
          <h4>{t('footer.connectWithUs')}</h4>
          <div className="vv-social">
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="X"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Pinterest"><i className="fab fa-pinterest-p"></i></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Instagram"><i className="fab fa-instagram"></i></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="TikTok"><i className="fab fa-tiktok"></i></a>
          </div>
          <div className="vv-cta">
            <a href="/become-a-vendor" onClick={(e) => { e.preventDefault(); handleNavigate('/become-a-vendor'); }}>{t('footer.advertiseWithUs')}</a>
          </div>
        </div>
      </div>

      {/* Language & Currency Controls - Airbnb style */}
      <div className="vv-footer-bottom">
        <div className="vv-footer-bottom-content">
          <div className="vv-footer-legal">
            <span>© 2025 Planbeau, Inc.</span>
            <span className="vv-footer-dot">·</span>
            <a href="/privacy-policy" onClick={(e) => { e.preventDefault(); handleNavigate('/privacy-policy'); }}>Privacy</a>
            <span className="vv-footer-dot">·</span>
            <a href="/terms-of-service" onClick={(e) => { e.preventDefault(); handleNavigate('/terms-of-service'); }}>Terms</a>
          </div>
          <div className="vv-footer-locale">
            <button className="vv-locale-btn" onClick={openLanguageModal} aria-label="Choose language">
              <i className="fas fa-globe"></i>
              <span>{currentLanguage.name} ({currentLanguage.region})</span>
            </button>
            <button className="vv-locale-btn" onClick={openCurrencyModal} aria-label="Choose currency">
              <span className="vv-currency-symbol">{currentCurrency.symbol}</span>
              <span>{currentCurrency.code}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Language & Currency Modal */}
      <LanguageCurrencyModal
        isOpen={showLocalizationModal}
        onClose={() => setShowLocalizationModal(false)}
        initialTab={modalInitialTab}
      />
    </footer>
  );
}

export default Footer;
