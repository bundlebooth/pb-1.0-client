import React, { useRef, useEffect, useCallback } from 'react';
import { 
  LayoutGrid, 
  School, 
  Camera, 
  Video,
  Music, 
  Headphones,
  Utensils, 
  PartyPopper, 
  Star, 
  Ribbon, 
  Scissors, 
  Cake, 
  Car, 
  ClipboardList, 
  ShoppingBag, 
  Mail 
} from 'lucide-react';

// Category definitions - IDs match DB directly
const categories = [
  { key: 'all', icon: <LayoutGrid size={16} />, label: 'All', color: '#6366f1' },
  { key: 'venue', icon: <School size={16} />, label: 'Venues', color: '#a855f7' },
  { key: 'photo', icon: <Camera size={16} />, label: 'Photography', color: '#06b6d4' },
  { key: 'video', icon: <Video size={16} />, label: 'Videography', color: '#0891b2' },
  { key: 'music', icon: <Music size={16} />, label: 'Music', color: '#10b981' },
  { key: 'dj', icon: <Headphones size={16} />, label: 'DJ', color: '#059669' },
  { key: 'catering', icon: <Utensils size={16} />, label: 'Catering', color: '#f59e0b' },
  { key: 'entertainment', icon: <PartyPopper size={16} />, label: 'Entertainment', color: '#ef4444' },
  { key: 'experiences', icon: <Star size={16} />, label: 'Experiences', color: '#f97316' },
  { key: 'decorations', icon: <Ribbon size={16} />, label: 'Decorations', color: '#ec4899' },
  { key: 'beauty', icon: <Scissors size={16} />, label: 'Beauty', color: '#be185d' },
  { key: 'cake', icon: <Cake size={16} />, label: 'Cake', color: '#a855f7' },
  { key: 'transportation', icon: <Car size={16} />, label: 'Transportation', color: '#3b82f6' },
  { key: 'planners', icon: <ClipboardList size={16} />, label: 'Planners', color: '#64748b' },
  { key: 'fashion', icon: <ShoppingBag size={16} />, label: 'Fashion', color: '#7c3aed' },
  { key: 'stationery', icon: <Mail size={16} />, label: 'Stationery', color: '#8b5cf6' }
];

function CategoriesNav({ activeCategory, onCategoryChange, loading = false }) {
  const scrollRef = useRef(null);

  // Scroll active category into view on mount
  useEffect(() => {
    if (scrollRef.current && activeCategory) {
      const activeBtn = scrollRef.current.querySelector(`[data-category="${activeCategory}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeCategory]);

  return (
    <div className="inline-categories-nav">
      <div className="page-wrapper" style={{ width: '100%' }}>
      <div className="inline-categories-scroll" ref={scrollRef}>
        {loading ? (
          // Skeleton loading state
          Array.from({ length: 10 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="skeleton"
              style={{
                width: '80px',
                height: '32px',
                borderRadius: '100px',
                backgroundColor: '#e5e7eb',
                flexShrink: 0
              }}
            />
          ))
        ) : (
          categories.map((cat) => (
            <button
              key={cat.key}
              data-category={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.875rem',
                borderRadius: '100px',
                border: activeCategory === cat.key ? `2px solid ${cat.color}` : '1px solid #e5e7eb',
                background: activeCategory === cat.key ? `${cat.color}10` : 'white',
                color: activeCategory === cat.key ? cat.color : '#374151',
                fontSize: '0.8125rem',
                fontWeight: activeCategory === cat.key ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <span style={{ color: activeCategory === cat.key ? cat.color : '#9ca3af', display: 'flex' }}>
                {cat.icon}
              </span>
              {cat.label}
            </button>
          ))
        )}
      </div>
      </div>
    </div>
  );
}

export default CategoriesNav;
