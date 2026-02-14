// Skeleton loading HTML generators

export function getStatsSkeletonHTML() {
  return `
    <div class="skeleton-stats-wrapper">
      <div class="skeleton-kpi-grid">
        ${[1, 2, 3, 4].map(() => `
          <div class="skeleton-stat-card">
            <div class="skeleton skeleton-stat-icon"></div>
            <div class="skeleton-stat-content">
              <div class="skeleton skeleton-stat-value"></div>
              <div class="skeleton skeleton-stat-label"></div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="skeleton-calendar-tile">
        <div class="skeleton skeleton-cal-header"></div>
        <div class="skeleton skeleton-cal-day"></div>
        <div class="skeleton skeleton-cal-date"></div>
      </div>
    </div>
  `;
}

export function getBookingsSkeletonHTML(count = 3) {
  return `
    ${Array(count).fill(0).map(() => `
      <div class="skeleton-booking-card">
        <div class="skeleton skeleton-booking-date"></div>
        <div class="skeleton skeleton-booking-title"></div>
        <div class="skeleton skeleton-booking-detail"></div>
        <div class="skeleton skeleton-booking-detail"></div>
        <div class="skeleton skeleton-booking-detail"></div>
        <div class="skeleton-booking-actions">
          <div class="skeleton skeleton-action-button"></div>
          <div class="skeleton skeleton-action-button"></div>
        </div>
      </div>
    `).join('')}
  `;
}

export function getMessagesSkeletonHTML(count = 5) {
  return `
    ${Array(count).fill(0).map(() => `
      <div class="skeleton-message-item">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton-message-content">
          <div class="skeleton skeleton-message-name"></div>
          <div class="skeleton skeleton-message-text"></div>
        </div>
        <div class="skeleton skeleton-message-date"></div>
      </div>
    `).join('')}
  `;
}

export function getVendorCardSkeletonHTML(count = 4) {
  return Array(count).fill(0).map(() => `
    <div class="skeleton-card-simple">
      <div class="skeleton-img-simple"></div>
      <div class="skeleton-text-simple skeleton-text-lg"></div>
      <div class="skeleton-text-simple skeleton-text-md"></div>
      <div class="skeleton-text-simple skeleton-text-sm"></div>
    </div>
  `).join('');
}

export function getMapSkeletonHTML() {
  return `
    <div class="skeleton-map-simple">
      <div class="skeleton-map-spinner-simple"></div>
    </div>
  `;
}
