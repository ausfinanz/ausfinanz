/**
 * AusFinanz v2 - Main JavaScript
 * Features:
 * - Scroll animations
 * - Analytics tracking (localStorage)
 * - Utility functions
 */

const AusFinanz = {
    /**
     * Google Analytics Tracking ID
     */
    GA_TRACKING_ID: 'G-Q5PFM8TSB5',

    /**
     * Dynamically load Google Analytics script
     * Respects CCM19 cookie consent - only loads GA after user consent
     */
    loadGoogleAnalytics() {
        // Prevent multiple loading
        if (window.gaLoaded) {
            this.trackPageViewGA();
            return;
        }

        // Returns true ONLY when CCM19 is loaded AND analytics consent is given.
        // Returns false when CCM19 is not yet available or consent is not given.
        // FIX: previously returned true when ccm19 was undefined, loading GA before consent.
        const checkConsentAndLoad = () => {
            if (typeof ccm19 === 'undefined') {
                // CCM19 not loaded yet — do NOT load GA
                return false;
            }

            // Get consent status from CCM19
            const consent = ccm19.getConsent ? ccm19.getConsent() : ccm19.hasConsent;

            let hasAnalyticsConsent = false;

            // Try different CCM19 API methods
            if (typeof consent === 'function') {
                hasAnalyticsConsent = consent('analytics') || consent('statistic') || consent('statistics');
            } else if (typeof consent === 'object' && consent !== null) {
                hasAnalyticsConsent = consent.analytics || consent.statistics || consent.statistic || false;
            }

            if (!hasAnalyticsConsent) {
                console.log('Waiting for CCM19 analytics consent...');
                return false;
            }

            return true;
        };

        // Consent already given (e.g. returning visitor), load GA immediately
        if (checkConsentAndLoad()) {
            this.loadGAInternal();
            return;
        }

        // Otherwise: wait for CCM19 to load and for user consent
        const waitForConsent = () => {
            if (checkConsentAndLoad()) {
                clearInterval(consentCheckInterval);
                if (typeof ccm19 !== 'undefined' && ccm19.off) {
                    ccm19.off('consentChanged', waitForConsent);
                }
                this.loadGAInternal();
            }
        };

        // Listen for CCM19 consent changes
        if (typeof ccm19 !== 'undefined' && ccm19.on) {
            ccm19.on('consentChanged', waitForConsent);
        }

        // Polling fallback: covers both CCM19 not yet loaded and consent not yet given
        const consentCheckInterval = setInterval(waitForConsent, 1000);
    },

    /**
     * Internal function to load GA script (called after consent verified)
     */
    loadGAInternal() {
        if (window.gaLoaded) return;
        window.gaLoaded = true;

        // Create and inject the gtag script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + this.GA_TRACKING_ID;

        // Track page view after script loads
        script.onload = () => {
            console.log('Google Analytics loaded:', this.GA_TRACKING_ID);
            this.trackPageViewGA();
            this.trackEventsToGA();
        };

        script.onerror = () => {
            console.error('Failed to load Google Analytics');
            window.gaLoaded = false; // Allow retry
        };

        document.head.appendChild(script);

        // Initialize gtag (fallback in case onload doesn't fire)
        window.dataLayer = window.dataLayer || [];
        function gtag() {
            dataLayer.push(arguments);
        }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', this.GA_TRACKING_ID);
    },

    /**
     * Initialize all functionality
     */
    init() {
        try {
            this.loadGoogleAnalytics();
            this.initScrollAnimations();
            this.initAnalytics();
            this.initClickTracking();
            this.trackPageVisit();
            this.initScrollToTop();
            this.initFAQ();
            this.initProfileReset();
            this.initAnalyticsStatus();
        } catch (e) {
            console.error('AusFinanz initialization error:', e);
            // Try to initialize FAQ separately if it failed during general init
            if (!document.querySelector('.faq-item.active')) {
                try { this.initFAQ(); } catch (faqError) { console.error('FAQ fallback init error:', faqError); }
            }
        }
    },

    /**
     * Initialize scroll-to-top button
     */
    initScrollToTop() {
        const scrollBtn = document.querySelector('.scroll-to-top');
        if (!scrollBtn) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    },

    /**
     * Initialize scroll-based animations
     */
    initScrollAnimations() {
        const animatedElements = document.querySelectorAll('[data-animate]');

        if (!animatedElements.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(el => observer.observe(el));
    },

    /**
     * Initialize analytics storage
     */
    initAnalytics() {
        // Get or create analytics data
        let analytics = this.getAnalyticsData();

        // Ensure structure exists
        if (!analytics.visits) analytics.visits = [];
        if (!analytics.clicks) analytics.clicks = {};
        if (!analytics.forms) analytics.forms = [];
        if (!analytics.paths) analytics.paths = [];
        if (!analytics.events) analytics.events = [];

        this.saveAnalyticsData(analytics);
    },

    /**
     * Initialize Google Analytics integration
     */
    initGoogleAnalytics() {
        // Check if gtag is available (Google Analytics script loaded)
        if (typeof gtag === 'undefined') {
            console.warn('Google Analytics not loaded yet');
            return;
        }

        // Track initial page view
        this.trackPageViewGA();

        // Track events to Google Analytics
        this.trackEventsToGA();
    },

    /**
     * Track page view in Google Analytics
     */
    trackPageViewGA() {
        if (typeof gtag === 'undefined') return;

        // GA4 proper page view tracking
        gtag('config', this.GA_TRACKING_ID, {
            page_title: document.title,
            page_location: window.location.href,
            page_path: window.location.pathname
        });
    },

    /**
     * Track custom events to Google Analytics
     */
    trackEventGA(eventName, data = {}) {
        if (typeof gtag === 'undefined') return;

        gtag('event', eventName, {
            event_category: data.category || 'User Interaction',
            event_label: data.label || '',
            value: data.value || 1,
            ...data
        });
    },

    /**
     * Sync existing events to Google Analytics
     */
    trackEventsToGA() {
        const analytics = this.getAnalyticsData();
        const events = analytics.events || [];

        events.forEach(event => {
            this.trackEventGA(event.name, {
                ...event.data,
                timestamp: event.timestamp,
                page: event.page
            });
        });
    },

    /**
     * Get analytics data from localStorage
     */
    getAnalyticsData() {
        const defaultData = { visits: [], clicks: {}, forms: [], paths: [], events: [] };
        try {
            const data = localStorage.getItem('ausfinanz_analytics');
            if (!data) return defaultData;
            const parsed = JSON.parse(data);
            if (!parsed || typeof parsed !== 'object') return defaultData;

            // Merge with default to ensure all keys exist
            return { ...defaultData, ...parsed };
        } catch (e) {
            console.error('Error reading analytics:', e);
            return defaultData;
        }
    },

    /**
     * Save analytics data to localStorage
     */
    saveAnalyticsData(data) {
        try {
            localStorage.setItem('ausfinanz_analytics', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving analytics:', e);
        }
    },

    /**
     * Track page visit
     */
    trackPageVisit() {
        const analytics = this.getAnalyticsData();

        // Generate or get session ID
        let sessionId = sessionStorage.getItem('ausfinanz_session');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('ausfinanz_session', sessionId);
        }

        // Add visit
        analytics.visits.push({
            timestamp: Date.now(),
            page: window.location.pathname,
            sessionId: sessionId,
            referrer: document.referrer || 'direct',
            lang: window.AusFinanzTranslations?.getCurrentLang() || 'RU'
        });

        // Track user path
        const currentPath = analytics.paths.find(p => p.sessionId === sessionId);
        if (currentPath) {
            currentPath.pages.push({
                page: window.location.pathname,
                timestamp: Date.now()
            });
        } else {
            analytics.paths.push({
                sessionId: sessionId,
                startTime: Date.now(),
                pages: [{
                    page: window.location.pathname,
                    timestamp: Date.now()
                }]
            });
        }

        // Limit stored data (keep last 1000 visits)
        if (analytics.visits.length > 1000) {
            analytics.visits = analytics.visits.slice(-1000);
        }
        if (analytics.paths.length > 100) {
            analytics.paths = analytics.paths.slice(-100);
        }

        this.saveAnalyticsData(analytics);
    },

    /**
     * Initialize click tracking on buttons
     */
    initClickTracking() {
        // Track all buttons and links with data-track attribute
        document.querySelectorAll('[data-track], .btn').forEach(el => {
            el.addEventListener('click', () => {
                const trackId = el.getAttribute('data-track') ||
                    el.textContent.trim().substring(0, 50);
                this.trackClick(trackId);
            });
        });
    },

    /**
     * Track button click
     */
    trackClick(buttonId) {
        const analytics = this.getAnalyticsData();

        if (!analytics.clicks[buttonId]) {
            analytics.clicks[buttonId] = 0;
        }
        analytics.clicks[buttonId]++;

        this.saveAnalyticsData(analytics);

        // Also track in Google Analytics
        this.trackEventGA('button_click', {
            button_id: buttonId,
            category: 'Navigation',
            label: buttonId
        });
    },

    /**
     * Track custom event
     */
    trackEvent(eventName, data = {}) {
        const analytics = this.getAnalyticsData();

        if (!analytics.events) analytics.events = [];

        analytics.events.push({
            name: eventName,
            data: data,
            timestamp: Date.now(),
            page: window.location.pathname
        });

        // Limit events
        if (analytics.events.length > 500) {
            analytics.events = analytics.events.slice(-500);
        }

        this.saveAnalyticsData(analytics);
    },

    /**
     * Get statistics summary for admin panel
     */
    getStatsSummary() {
        const analytics = this.getAnalyticsData();
        const today = new Date().toDateString();

        // Calculate unique visitors (by session)
        const uniqueSessions = new Set(analytics.visits?.map(v => v.sessionId) || []);

        // Today's visits
        const todayVisits = (analytics.visits || []).filter(v =>
            new Date(v.timestamp).toDateString() === today
        );

        // Most clicked buttons
        const topClicks = Object.entries(analytics.clicks || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return {
            totalVisits: analytics.visits?.length || 0,
            uniqueVisitors: uniqueSessions.size,
            todayVisits: todayVisits.length,
            topClicks: topClicks,
            forms: analytics.forms?.length || 0,
            paths: analytics.paths || []
        };
    },

    /**
     * Reset all analytics data
     */
    resetAnalytics() {
        localStorage.removeItem('ausfinanz_analytics');
        this.initAnalytics();
    },

    /**
     * Copy text to clipboard
     */
    copyToClipboard(text) {
        if (!navigator.clipboard) {
            // Fallback for older browsers or non-secure contexts
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";  // Avoid scrolling to bottom
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                this.showToast(window.t ? window.t('notification_copied') : 'Copied!');
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            this.showToast(window.t ? window.t('notification_copied') : 'Copied!');
        });
    },

    /**
     * Show toast notification
     */
    showToast(message) {
        // Find container
        const container = document.querySelector('.messenger-nick');
        if (!container) return;

        // Remove existing toast if any
        const existingToast = container.querySelector('.toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        container.appendChild(toast);

        // Remove after animation (2s)
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.remove();
            }
        }, 2000);
    },

    /**
     * Initialize FAQ Accordion
     */
    initFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        if (!faqItems.length) return;

        faqItems.forEach(item => {
            const question = item.querySelector('.faq-item__question');
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');

                // Close all other items (Auto-close)
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });

                // Toggle current item
                item.classList.toggle('active');

                // Track click
                this.trackClick('faq_' + (item.querySelector('[data-i18n]')?.getAttribute('data-i18n') || 'item'));
            });
        });
    },

    /**
     * Initialize profile photo reset functionality
     */
    initProfileReset() {
        const photos = document.querySelectorAll('.profile__photo');
        photos.forEach(photo => {
            photo.style.cursor = 'pointer';
            photo.addEventListener('click', () => {
                // Clear storage
                localStorage.removeItem('ausfinanz_lang');
                localStorage.removeItem('ausfinanz_analytics');
                sessionStorage.removeItem('ausfinanz_session');
                localStorage.removeItem('ausfinanz_submissions'); // Also clear form submissions limit

                // Redirect to home page
                const path = window.location.pathname;
                if (path.includes('/booking/') || path.includes('/checklists/') || path.includes('/admin/') || path.includes('/law/')) {
                    window.location.href = '../../index.html';
                } else if (path.includes('/html/')) {
                    window.location.href = '../index.html';
                } else {
                    window.location.href = 'index.html';
                }
            });
        });
    },

    /**
     * Initialize analytics status indicator
     */
    initAnalyticsStatus() {
        // Wait for EnhancedAnalytics to be available
        const checkAnalytics = () => {
            if (typeof window.EnhancedAnalytics !== 'undefined') {
                this.setupAnalyticsStatus();
            } else {
                setTimeout(checkAnalytics, 100);
            }
        };
        checkAnalytics();
    },

    /**
     * Setup analytics status indicator
     */
    setupAnalyticsStatus() {
        const statusEl = document.getElementById('analytics-status');
        const iconEl = document.getElementById('analytics-icon');
        const textEl = document.getElementById('analytics-text');
        const closeEl = document.getElementById('analytics-close');

        if (!statusEl || !iconEl || !textEl || !closeEl) return;

        // Close button functionality
        closeEl.addEventListener('click', () => {
            statusEl.classList.remove('show');
        });

        // Listen for analytics status changes
        const updateStatus = () => {
            const status = window.EnhancedAnalytics.getStatus();
            
            // Determine status type
            let statusType = 'loading';
            let statusText = 'Analytics loading...';
            let statusIcon = '📊';

            if (status.isBlocked) {
                statusType = 'blocked';
                statusText = 'Analytics blocked by ad blocker';
                statusIcon = '🚫';
            } else if (!status.isConsentGiven) {
                statusType = 'disabled';
                statusText = 'Analytics disabled (no consent)';
                statusIcon = '✋';
            } else if (status.isGAInitialized) {
                statusType = 'success';
                statusText = 'Analytics active';
                statusIcon = '✅';
            }

            // Update UI
            iconEl.textContent = statusIcon;
            textEl.textContent = statusText;
            statusEl.className = `analytics-status ${statusType}`;
            statusEl.classList.add('show');

            // Auto-hide after 5 seconds for success, keep visible for blocked/disabled
            if (statusType === 'success') {
                setTimeout(() => {
                    if (statusEl.classList.contains('success')) {
                        statusEl.classList.remove('show');
                    }
                }, 5000);
            }
        };

        // Initial status update
        updateStatus();

        // Listen for status changes (polling every 2 seconds)
        setInterval(updateStatus, 2000);

        // Listen for consent changes if CCM19 is available
        if (typeof ccm19 !== 'undefined') {
            ccm19.on('consentChanged', updateStatus);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AusFinanz.init());
} else {
    AusFinanz.init();
}

// Export
window.AusFinanzAnalytics = AusFinanz;
