// Banner notification system - matches index_mobile-script.js exactly

export function showBanner(message, variant = 'info', title) {
    try {
        const normalizedVariant = (variant === 'notice') ? 'info' : variant;
    } catch {}

    // Check for existing banner and remove with smooth animation
    let hasExisting = false;
    try {
        const existing = document.getElementById('app-banner');
        if (existing) {
            hasExisting = true;
            existing.classList.add('app-banner--removing');
            setTimeout(() => existing.remove(), 300);
        }
    } catch {}

    // Function to create and show the new banner
    const createAndShowBanner = () => {
        const banner = document.createElement('div');
        banner.id = 'app-banner';
        const normalizedVariant = (variant === 'notice') ? 'info' : variant;
        banner.className = `app-banner app-banner--${normalizedVariant}`;
        const safeMsg = (typeof message === 'string') ? message : (message && message.message) || String(message);
        const heading = title || (normalizedVariant === 'error' ? 'Error' : (normalizedVariant === 'success' ? 'Success' : 'Notice'));
        banner.setAttribute('role', 'alert');
        banner.setAttribute('aria-live', 'assertive');
        banner.innerHTML = `
            <span class="app-banner__icon" aria-hidden="true">${getBannerIcon(normalizedVariant)}</span>
            <span class="app-banner__label">${heading}:</span>
            <div style="flex:1;">${safeMsg}</div>
            <button class="app-banner__close" aria-label="Close">&times;</button>
        `;
        
        // Smooth removal function
        const removeBanner = () => {
            banner.classList.add('app-banner--removing');
            setTimeout(() => {
                if (banner.parentElement) {
                    banner.remove();
                }
            }, 300);
        };
        
        banner.querySelector('.app-banner__close').addEventListener('click', removeBanner);
        document.body.appendChild(banner);

        // Auto-dismiss after 5 seconds with smooth animation
        setTimeout(() => { 
            if (banner.parentElement) {
                removeBanner();
            }
        }, 5000);
    };

    // If there was an existing banner, wait for its removal animation to complete
    if (hasExisting) {
        setTimeout(createAndShowBanner, 320);
    } else {
        createAndShowBanner();
    }
}

function getBannerIcon(variant) {
    if (variant === 'success') {
        // Clean checkmark circle
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
    }
    if (variant === 'error') {
        // Clean X circle
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
    }
    if (variant === 'favorite') {
        // Clean heart
        return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    }
    // Clean info circle
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
}

export function detectBannerVariant(msg) {
    try {
        const t = String((typeof msg === 'string') ? msg : (msg && msg.message) || msg).toLowerCase();
        if (t.includes('error') || t.includes('failed') || t.includes('unable') || t.includes('cannot')) return 'error';
        if (
            t.includes('success') || t.includes('saved') || t.includes('welcome') || t.includes('processed') ||
            t.includes('approved') || t.includes('accepted') || t.includes('confirmed') || t.includes('completed') || t.includes('paid')
        ) return 'success';
        if (t.includes('declined') || t.includes('cancelled') || t.includes('canceled') || t.includes('notice') || t.includes('reminder') || t.includes('pending')) return 'notice';
        return 'info';
    } catch { return 'info'; }
}

export function showSuccess(message) {
    showBanner(message, 'success');
}

export function showError(message) {
    showBanner(message, 'error');
}

export function showInfo(message) {
    showBanner(message, 'info');
}
