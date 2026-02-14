import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

/**
 * ScrollToTop Component
 * Scrolls to top of page on route change and tracks page views in Google Analytics
 */
function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Track page view in Google Analytics
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}

export default ScrollToTop;
