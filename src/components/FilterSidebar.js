import React, { useState } from 'react';

function FilterSidebar({ filters, onFilterChange, collapsed }) {
  const [priceLevel, setPriceLevel] = useState(filters.priceLevel || '');
  const [minRating, setMinRating] = useState(filters.minRating || '');

  const handlePriceLevelChange = (value) => {
    setPriceLevel(value);
    onFilterChange({ ...filters, priceLevel: value });
  };

  const handleRatingChange = (value) => {
    setMinRating(value);
    onFilterChange({ ...filters, minRating: value });
  };

  const resetPrice = () => {
    setPriceLevel('');
    onFilterChange({ ...filters, priceLevel: '' });
  };

  const resetRating = () => {
    setMinRating('');
    onFilterChange({ ...filters, minRating: '' });
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{ display: collapsed ? 'none' : 'block' }}>
      <div className="filter-section">
        <h3 className="filter-title">
          Price Range
          <span className="filter-reset" onClick={resetPrice}>Reset</span>
        </h3>
        <select
          className="form-control"
          id="price-level-filter"
          value={priceLevel}
          onChange={(e) => handlePriceLevelChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            backgroundColor: 'white'
          }}
        >
          <option value="">All Price Ranges</option>
          <option value="$">$ - Inexpensive</option>
          <option value="$$">$$ - Moderate</option>
          <option value="$$$">$$$ - Expensive</option>
          <option value="$$$$">$$$$ - Luxury</option>
        </select>
      </div>

      <div className="filter-section">
        <h3 className="filter-title">
          Minimum Rating
          <span className="filter-reset" onClick={resetRating}>Reset</span>
        </h3>
        <select
          className="form-control"
          id="rating-filter"
          value={minRating}
          onChange={(e) => handleRatingChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            backgroundColor: 'white'
          }}
        >
          <option value="">All Ratings</option>
          <option value="4">★★★★ 4+ Stars</option>
          <option value="3">★★★ 3+ Stars</option>
          <option value="2">★★ 2+ Stars</option>
          <option value="1">★ 1+ Star</option>
        </select>
      </div>

    </aside>
  );
}

export default FilterSidebar;
