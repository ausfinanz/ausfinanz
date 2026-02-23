/*
 * Translations - Dynamic Loader
 */

// Initialize global storage if not already there
window.AusFinanzTranslationsData = window.AusFinanzTranslationsData || {};

// Reference to translations data
const translations = window.AusFinanzTranslationsData;

// Current language (default: RU)
let currentLang = localStorage.getItem('ausfinanz_lang') || 'RU';

// List of supported languages
const SUPPORTED_LANGUAGES = ['RU', 'UA', 'RO', 'TR', 'KZ', 'PL', 'BG'];

// Calculate base path from the script's own location
const currentScript = document.currentScript || (function () {
  const scripts = document.getElementsByTagName('script');
  return scripts[scripts.length - 1];
})();
const scriptDir = currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);

/**
 * Load language file dynamically
 * @param {string} lang - Language code
 * @returns {Promise}
 */
function loadLanguage(lang) {
  const langCode = lang.toUpperCase();

  // If already loaded, return resolved promise
  if (translations[langCode]) {
    return Promise.resolve();
  }

  // If not supported, fallback to RU
  if (!SUPPORTED_LANGUAGES.includes(langCode)) {
    console.warn(`Language ${langCode} not supported, falling back to RU`);
    return loadLanguage('RU');
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${scriptDir}translations/${langCode.toLowerCase()}.js`;
    script.async = true;

    script.onload = () => {
      if (translations[langCode]) {
        resolve();
      } else {
        reject(new Error(`Language data for ${langCode} not found in file`));
      }
    };

    script.onerror = () => {
      reject(new Error(`Failed to load translation file for ${langCode}`));
    };

    document.head.appendChild(script);
  });
}

/**
 * Get translation text by key
 * @param {string} key - Translation key
 * @returns {string} Translated text
 */
function t(key) {
  // Try current language first, fallback to Russian if loaded, or original key
  return translations[currentLang]?.[key] || translations.RU?.[key] || key;
}

/**
 * Set language and update all translations
 * @param {string} lang - Language code
 */
async function setLanguage(lang) {
  const langCode = lang.toUpperCase();

  try {
    // Show loading state if needed (optional)
    document.body.classList.add('lang-loading');

    await loadLanguage(langCode);

    currentLang = langCode;
    localStorage.setItem('ausfinanz_lang', langCode);

    // Set HTML lang attribute for CSS targeting
    document.documentElement.setAttribute('lang', langCode.toLowerCase());

    updateAllTranslations();
    updateLangButtons();

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('ausfinanz_lang_changed', { detail: { lang: langCode } }));

  } catch (error) {
    console.error('Failed to set language:', error);
    // If it's not RU and we failed, try falling back to RU
    if (langCode !== 'RU') {
      setLanguage('RU');
    }
  } finally {
    document.body.classList.remove('lang-loading');
  }
}

/**
 * Update all elements with data-i18n attribute
 */
function updateAllTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);

    if (text.includes('\n')) {
      el.innerHTML = text.split('\n').map((line, idx) =>
        `<span class="i18n-line i18n-line--${idx + 1}">${line}</span>`
      ).join('<br>');
    } else {
      el.textContent = text;
    }
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });

  // Update select options
  document.querySelectorAll('[data-i18n-options]').forEach(select => {
    const options = select.querySelectorAll('option[data-i18n]');
    options.forEach(option => {
      const key = option.getAttribute('data-i18n');
      option.textContent = t(key);
    });
  });

  // Update document title if on subpage
  const pageTitleEl = document.querySelector('[data-page-title]');
  if (pageTitleEl) {
    document.title = pageTitleEl.textContent + ' | AusFinanz';
  }

  // Update form errors if any are visible
  document.querySelectorAll('.form__group').forEach(group => {
    const input = group.querySelector('input, textarea, select');
    const errorEl = group.querySelector('.form__error');
    if (input && errorEl && errorEl.style.display === 'block') {
      // Re-validate to update message in current language
      if (window.AusFinanzEmailSender) {
        window.AusFinanzEmailSender.validateField(input);
      }
    }
  });
}

/**
 * Update language switcher button states
 */
function updateLangButtons() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-lang')?.toUpperCase() === currentLang) {
      btn.classList.add('active');
    }
  });
}

/**
 * Initialize language system
 */
async function initTranslations() {
  // Add click handlers to language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = btn.getAttribute('data-lang');
      setLanguage(lang);
    });
  });

  // Load and set initial language
  await setLanguage(currentLang);
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTranslations);
} else {
  initTranslations();
}

// Export for use in other scripts
window.t = t;
window.AusFinanzTranslations = {
  t,
  setLanguage,
  getCurrentLang: () => currentLang,
  getLanguages: () => SUPPORTED_LANGUAGES,
  loadLanguage // Exported in case other scripts need to preload
};
