// Frontend JavaScript for Focus Mode Accessibility Tool

/**
 * Configuration
 * Backend API configuration
 */
const CONFIG = {
    // Backend API base URL
    // Change this if backend is running on a different host/port
    API_BASE_URL: 'http://localhost:5000',
    
    // API endpoints
    ENDPOINTS: {
        SIMPLIFY: '/api/simplify'
    }
};

/**
 * SessionState
 * Manages session state for original and simplified content
 */
class SessionState {
    constructor() {
        this.state = {
            currentURL: null,
            originalContent: null,
            simplifiedContent: null,
            title: null,
            currentView: 'original',
            truncated: false,
            error: null,
            coldStartWarning: false,
            pageType: null
        };
    }
    
    /**
     * Stores original and simplified content in session state
     * @param {Object} data - Content data from backend
     * @param {string} data.original_text - Original extracted content
     * @param {string} data.simplified_text - AI-simplified content
     * @param {string} data.title - Article title
     * @param {boolean} data.truncated - Whether content was truncated
     * @param {boolean} data.cold_start_warning - Whether cold start warning should be shown
     * @param {string} url - The URL that was processed
     */
    storeContent(data, url) {
        this.state.currentURL = url;
        this.state.originalContent = data.original_text || null;
        this.state.simplifiedContent = data.simplified_text || null;
        this.state.title = data.title || null;
        this.state.truncated = data.truncated || false;
        this.state.coldStartWarning = data.cold_start_warning || false;
        this.state.pageType = data.page_type || null;
        this.state.error = null;
        this.state.currentView = 'original';
    }
    
    /**
     * Clears all session state data
     * Called when a new URL is submitted
     */
    clearSession() {
        this.state = {
            currentURL: null,
            originalContent: null,
            simplifiedContent: null,
            title: null,
            currentView: 'original',
            truncated: false,
            error: null,
            coldStartWarning: false,
            pageType: null
        };
    }
    
    /**
     * Gets the current state
     * @returns {Object} - Current session state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Gets original content
     * @returns {string|null} - Original content or null
     */
    getOriginalContent() {
        return this.state.originalContent;
    }
    
    /**
     * Gets simplified content
     * @returns {string|null} - Simplified content or null
     */
    getSimplifiedContent() {
        return this.state.simplifiedContent;
    }
    
    /**
     * Gets current view mode
     * @returns {string} - 'original' or 'focus'
     */
    getCurrentView() {
        return this.state.currentView;
    }
    
    /**
     * Sets current view mode
     * @param {string} view - 'original' or 'focus'
     */
    setCurrentView(view) {
        if (view === 'original' || view === 'focus') {
            this.state.currentView = view;
        }
    }
    
    /**
     * Checks if content is available
     * @returns {boolean} - True if both original and simplified content exist
     */
    hasContent() {
        return this.state.originalContent !== null && this.state.simplifiedContent !== null;
    }
    
    /**
     * Gets the title
     * @returns {string|null} - Article title or null
     */
    getTitle() {
        return this.state.title;
    }
    
    /**
     * Checks if content was truncated
     * @returns {boolean} - True if content was truncated
     */
    isTruncated() {
        return this.state.truncated;
    }
    
    /**
     * Sets error state
     * @param {string} error - Error message
     */
    setError(error) {
        this.state.error = error;
    }
    
    /**
     * Gets error message
     * @returns {string|null} - Error message or null
     */
    getError() {
        return this.state.error;
    }
}

/**
 * APIKeyInputComponent
 * Handles API key input, validation, and storage
 */
class APIKeyInputComponent {
    constructor() {
        this.apiKeySection = document.getElementById('api-key-section');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.sessionStorageKey = 'focus_mode_api_key';
        
        this.init();
    }
    
    init() {
        // Check if API key exists on initialization
        if (this.hasAPIKey()) {
            // Hide the API key section if key exists
            this.apiKeySection.style.display = 'none';
        }
        
        // Listen for API key input changes
        if (this.apiKeyInput) {
            this.apiKeyInput.addEventListener('input', (e) => {
                const key = e.target.value.trim();
                if (key) {
                    this.storeAPIKey(key);
                }
            });
        }
    }
    
    /**
     * Checks if API key exists in session storage or input field
     * @returns {boolean} - True if API key exists
     */
    hasAPIKey() {
        // Check session storage first
        const storedKey = sessionStorage.getItem(this.sessionStorageKey);
        if (storedKey && storedKey.trim() !== '') {
            return true;
        }
        
        // Check input field
        if (this.apiKeyInput && this.apiKeyInput.value.trim() !== '') {
            return true;
        }
        
        return false;
    }
    
    /**
     * Shows the API key input form
     */
    promptForAPIKey() {
        if (this.apiKeySection) {
            this.apiKeySection.style.display = 'block';
            // Focus on the input field for better UX
            if (this.apiKeyInput) {
                this.apiKeyInput.focus();
            }
        }
    }
    
    /**
     * Stores API key in session storage
     * @param {string} key - The API key to store
     */
    storeAPIKey(key) {
        if (key && key.trim() !== '') {
            sessionStorage.setItem(this.sessionStorageKey, key.trim());
        }
    }
    
    /**
     * Retrieves API key from session storage or input field
     * @returns {string|null} - The API key or null if not found
     */
    getAPIKey() {
        // Check session storage first
        const storedKey = sessionStorage.getItem(this.sessionStorageKey);
        if (storedKey && storedKey.trim() !== '') {
            return storedKey.trim();
        }
        
        // Check input field
        if (this.apiKeyInput && this.apiKeyInput.value.trim() !== '') {
            return this.apiKeyInput.value.trim();
        }
        
        return null;
    }
    
    /**
     * Includes API key in backend request body
     * @param {Object} requestBody - The request body object to modify
     * @returns {Object} - The modified request body with API key if available
     */
    sendAPIKeyToBackend(requestBody) {
        const apiKey = this.getAPIKey();
        if (apiKey) {
            requestBody.api_key = apiKey;
        }
        return requestBody;
    }
    
    /**
     * Clears API key from session storage
     */
    clearAPIKey() {
        sessionStorage.removeItem(this.sessionStorageKey);
        if (this.apiKeyInput) {
            this.apiKeyInput.value = '';
        }
    }
}

/**
 * FocusProfileComponent
 * Manages focus profile selection and persistence
 */
class FocusProfileComponent {
    constructor() {
        this.profileSelector = document.getElementById('focus-profile-selector');
        this.storageKey = 'focus_mode_profile';
        
        // Profile configurations - controls simplification behavior only
        this.profiles = {
            light: {
                maxWords: 2000,
                promptModifier: 'light'
            },
            medium: {
                maxWords: 2000,
                promptModifier: 'medium'
            },
            aggressive: {
                maxWords: 1500,
                promptModifier: 'aggressive'
            }
        };
        
        this.init();
    }
    
    init() {
        // Load saved profile from localStorage
        const savedProfile = this.loadProfile();
        if (savedProfile && this.profiles[savedProfile]) {
            this.profileSelector.value = savedProfile;
        }
        
        // Listen for profile changes
        this.profileSelector.addEventListener('change', (e) => {
            const newProfile = e.target.value;
            this.saveProfile(newProfile);
            this.handleProfileChange(newProfile);
        });
    }
    
    /**
     * Gets the current selected profile
     * @returns {string} - Profile name ('light', 'medium', 'aggressive')
     */
    getCurrentProfile() {
        return this.profileSelector.value || 'medium';
    }
    
    /**
     * Gets the profile configuration
     * @param {string} profileName - Profile name
     * @returns {Object} - Profile configuration
     */
    getProfileConfig(profileName = null) {
        const profile = profileName || this.getCurrentProfile();
        return this.profiles[profile] || this.profiles.medium;
    }
    
    /**
     * Saves profile to localStorage
     * @param {string} profile - Profile name to save
     */
    saveProfile(profile) {
        try {
            localStorage.setItem(this.storageKey, profile);
        } catch (error) {
            console.warn('Failed to save profile to localStorage:', error);
        }
    }
    
    /**
     * Loads profile from localStorage
     * @returns {string|null} - Saved profile name or null
     */
    loadProfile() {
        try {
            return localStorage.getItem(this.storageKey);
        } catch (error) {
            console.warn('Failed to load profile from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Handles profile change event
     * Re-runs simplification if content is already loaded
     * Does NOT refetch or re-extract content
     * @param {string} newProfile - New profile name
     */
    handleProfileChange(newProfile) {
        console.log(`Profile changed to: ${newProfile}`);
        
        // Check if we have content loaded
        if (window.sessionState && window.sessionState.hasContent()) {
            const currentURL = window.sessionState.getState().currentURL;
            
            if (currentURL) {
                // Show loading indicator
                if (window.errorDisplay) {
                    window.errorDisplay.showLoading(false);
                }
                
                // Re-run simplification with new profile
                // This reuses existing extracted content from session
                if (window.urlInputComponent) {
                    window.urlInputComponent.submitURL(currentURL);
                }
            }
        }
    }
}

/**
 * URLInputComponent
 * Handles URL input, validation, and submission
 */
class URLInputComponent {
    constructor() {
        this.urlForm = document.getElementById('url-form');
        this.urlInput = document.getElementById('url-input');
        this.submitBtn = document.getElementById('submit-btn');
        this.demoSelector = document.getElementById('demo-selector');
        
        this.init();
    }
    
    init() {
        // Bind form submission
        this.urlForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const url = this.urlInput.value.trim();
            if (this.validateURL(url)) {
                this.submitURL(url);
            }
        });
        
        // Bind demo URL selector
        this.demoSelector.addEventListener('change', (e) => {
            const demoURL = e.target.value;
            if (demoURL) {
                this.populateDemoURL(demoURL);
            }
        });
    }
    
    /**
     * Validates URL format
     * @param {string} url - The URL to validate
     * @returns {boolean} - True if URL is valid HTTP/HTTPS format
     */
    validateURL(url) {
        // Check if URL is empty
        if (!url) {
            if (window.errorDisplay) {
                window.errorDisplay.showError('invalid_url', 'Please enter a URL');
            }
            return false;
        }
        
        // Check if URL starts with http:// or https://
        const urlPattern = /^https?:\/\/.+/i;
        if (!urlPattern.test(url)) {
            if (window.errorDisplay) {
                window.errorDisplay.showError('invalid_url');
            }
            return false;
        }
        
        // Try to create a URL object to validate format
        try {
            new URL(url);
            if (window.errorDisplay) {
                window.errorDisplay.hideError();
            }
            return true;
        } catch (error) {
            if (window.errorDisplay) {
                window.errorDisplay.showError('invalid_url', 'Please enter a valid URL format');
            }
            return false;
        }
    }
    
    /**
     * Sends POST request to backend for content processing
     * @param {string} url - The URL to process
     * @returns {Promise<void>}
     */
    async submitURL(url) {
        try {
            // Clear previous session data when new URL is submitted
            if (window.sessionState) {
                window.sessionState.clearSession();
            }
            
            // Disable submit button during processing
            this.submitBtn.disabled = true;
            this.submitBtn.textContent = 'Processing...';
            
            // Show loading indicator with cold-start warning for first request
            const isFirstRequest = !sessionStorage.getItem('has_made_request');
            if (window.errorDisplay) {
                window.errorDisplay.showLoading(isFirstRequest);
            }
            
            // Prepare request body
            const requestBody = { url };
            
            // Include focus profile if available
            if (window.focusProfileComponent) {
                requestBody.profile = window.focusProfileComponent.getCurrentProfile();
            }
            
            // Use APIKeyInputComponent to include API key if available
            if (window.apiKeyComponent) {
                window.apiKeyComponent.sendAPIKeyToBackend(requestBody);
            }
            
            // Send POST request to backend
            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.SIMPLIFY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            // Mark that we've made a request
            sessionStorage.setItem('has_made_request', 'true');
            
            // Hide loading indicator
            if (window.errorDisplay) {
                window.errorDisplay.hideLoading();
            }
            
            // Handle response
            if (data.success) {
                this.handleSuccess(data, url);
            } else {
                this.handleError(data);
            }
            
        } catch (error) {
            if (window.errorDisplay) {
                window.errorDisplay.hideLoading();
                window.errorDisplay.showError('network_error', `Network error: ${error.message}. Please check your connection and try again.`);
            }
        } finally {
            // Re-enable submit button
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Simplify';
        }
    }
    
    /**
     * Populates URL input field with demo URL
     * @param {string} demoURL - The demo URL to populate
     */
    populateDemoURL(demoURL) {
        this.urlInput.value = demoURL;
        if (window.errorDisplay) {
            window.errorDisplay.hideError();
        }
        // Reset demo selector
        this.demoSelector.value = '';
    }
    
    /**
     * Handles successful API response
     * @param {Object} data - Response data from backend
     * @param {string} url - The URL that was processed
     */
    handleSuccess(data, url) {
        // Store content in session state
        if (window.sessionState) {
            window.sessionState.storeContent(data, url);
        }
        
        // Show truncation notice if content was truncated
        if (data.truncated && window.errorDisplay) {
            window.errorDisplay.showTruncationNotice(true);
        }
        
        // Log success for debugging
        console.log('Content processed successfully:', data);
        
        // Dispatch custom event for other components to handle
        const event = new CustomEvent('contentProcessed', { detail: data });
        document.dispatchEvent(event);
    }
    
    /**
     * Handles error response from API
     * Uses ErrorDisplayComponent for comprehensive error handling
     * @param {Object} data - Error data from backend
     */
    handleError(data) {
        const errorType = data.error_type || 'unknown';
        const errorMsg = data.error || 'An unknown error occurred';
        
        // Map backend error types to ErrorDisplayComponent error types
        let displayErrorType = errorType;
        
        // Handle specific error type mappings
        if (errorType === 'fetch_error') {
            displayErrorType = 'fetch_failed';
        } else if (errorType === 'extraction_error') {
            // Check for specific extraction error subtypes
            if (data.page_type === 'dynamic') {
                displayErrorType = 'extraction_dynamic';
            } else if (data.page_type === 'paywall') {
                displayErrorType = 'extraction_paywall';
            } else if (data.page_type === 'empty') {
                displayErrorType = 'extraction_empty';
            } else {
                displayErrorType = 'extraction_failed';
            }
        } else if (errorType === 'ai_error') {
            displayErrorType = 'ai_error';
        } else if (errorType === 'missing_api_key') {
            displayErrorType = 'ai_no_key';
        } else if (errorType === 'invalid_api_key') {
            displayErrorType = 'ai_invalid_key';
        } else if (errorType === 'rate_limit') {
            displayErrorType = 'ai_rate_limit';
        }
        
        // Use ErrorDisplayComponent to show error with guidance
        if (window.errorDisplay) {
            window.errorDisplay.showError(displayErrorType, errorMsg);
        }
    }
}

/**
 * LayoutTransformer
 * Applies rule-based CSS transformations for focus mode
 */
class LayoutTransformer {
    constructor() {
        this.focusModeClass = 'focus-mode-active';
    }
    
    /**
     * Applies focus mode accessibility CSS transformations
     * @param {HTMLElement} element - The element to apply transformations to
     */
    applyFocusMode(element) {
        if (!element) {
            console.error('LayoutTransformer: No element provided to applyFocusMode');
            return;
        }
        
        // Add focus mode class to trigger CSS transformations
        element.classList.add(this.focusModeClass);
        
        // Apply inline styles for accessibility transformations
        // These complement the CSS class for maximum compatibility
        
        //Large font sizes (18-22px)
        element.style.fontSize = '20px';
        
        //Increased line spacing (1.6-2.0)
        element.style.lineHeight = '1.8';
        
        //High-contrast colors (WCAG AA compliant)
        // Black text on white background provides 21:1 contrast ratio (exceeds WCAG AAA)
        element.style.color = '#000000';
        element.style.backgroundColor = '#FFFFFF';
        
        //Center content and remove non-essential elements
        element.style.maxWidth = '800px';
        element.style.margin = '0 auto';
        element.style.padding = '40px';
        
        // Additional accessibility enhancements
        element.style.textAlign = 'left';
        
        // Apply transformations to child paragraphs
        const paragraphs = element.querySelectorAll('p');
        paragraphs.forEach(p => {
            p.style.marginBottom = '1.5rem';
            p.style.fontSize = '20px';
            p.style.lineHeight = '1.8';
        });
        
        // Apply transformations to headings
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(h => {
            h.style.marginTop = '2rem';
            h.style.marginBottom = '1rem';
            h.style.lineHeight = '1.6';
        });
        
        // Apply transformations to lists
        const lists = element.querySelectorAll('ul, ol');
        lists.forEach(list => {
            list.style.marginLeft = '2rem';
            list.style.marginBottom = '1.5rem';
        });
        
        const listItems = element.querySelectorAll('li');
        listItems.forEach(li => {
            li.style.marginBottom = '0.75rem';
            li.style.fontSize = '20px';
            li.style.lineHeight = '1.8';
        });
        
        console.log('LayoutTransformer: Focus mode applied');
    }
    
    /**
     * Removes focus mode styling and restores original appearance
     * @param {HTMLElement} element - The element to remove transformations from
     */
    removeFocusMode(element) {
        if (!element) {
            console.error('LayoutTransformer: No element provided to removeFocusMode');
            return;
        }
        
        // Remove focus mode class
        element.classList.remove(this.focusModeClass);
        
        // Remove inline styles to restore original styling
        element.style.fontSize = '';
        element.style.lineHeight = '';
        element.style.color = '';
        element.style.backgroundColor = '';
        element.style.maxWidth = '';
        element.style.margin = '';
        element.style.padding = '';
        element.style.textAlign = '';
        
        // Remove transformations from child elements
        const allElements = element.querySelectorAll('*');
        allElements.forEach(el => {
            el.style.marginBottom = '';
            el.style.fontSize = '';
            el.style.lineHeight = '';
            el.style.marginTop = '';
            el.style.marginLeft = '';
        });
        
        console.log('LayoutTransformer: Focus mode removed');
    }
    
    /**
     * Returns CSS rules for focus mode as a string
     * @returns {string} - CSS rules for focus mode
     */
    getAccessibilityCSS() {
        return `
            .${this.focusModeClass} {
                /* Large font sizes (18-22px) */
                font-size: 20px;
                
                /* Increased line spacing (1.6-2.0) */
                line-height: 1.8;
                
                /* High-contrast colors (WCAG AA compliant) */
                color: #000000;
                background-color: #FFFFFF;
                
                /* Center content and remove non-essential elements */
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
                text-align: left;
            }
            
            .${this.focusModeClass} p {
                margin-bottom: 1.5rem;
                font-size: 20px;
                line-height: 1.8;
            }
            
            .${this.focusModeClass} h1,
            .${this.focusModeClass} h2,
            .${this.focusModeClass} h3,
            .${this.focusModeClass} h4,
            .${this.focusModeClass} h5,
            .${this.focusModeClass} h6 {
                margin-top: 2rem;
                margin-bottom: 1rem;
                line-height: 1.6;
            }
            
            .${this.focusModeClass} ul,
            .${this.focusModeClass} ol {
                margin-left: 2rem;
                margin-bottom: 1.5rem;
            }
            
            .${this.focusModeClass} li {
                margin-bottom: 0.75rem;
                font-size: 20px;
                line-height: 1.8;
            }
        `;
    }
}

/**
 * ErrorDisplayComponent
 * Handles error message display with specific guidance based on error type
 */
class ErrorDisplayComponent {
    constructor() {
        this.errorSection = document.getElementById('error-section');
        this.errorMessage = document.getElementById('error-message');
        this.loadingSection = document.getElementById('loading-section');
        this.coldStartWarning = document.getElementById('cold-start-warning');
        
        // Error message templates based on error types
        this.errorMessages = {
            fetch_failed: 'Unable to fetch the webpage. Please check the URL and try again.',
            fetch_timeout: 'The webpage took too long to respond. Please try again or use a different URL.',
            fetch_unreachable: 'The server is unreachable. Please check your internet connection and try again.',
            extraction_failed: 'Could not extract content. This page may be JavaScript-heavy or behind a paywall.',
            extraction_dynamic: 'This page uses dynamic JavaScript rendering. Try a static article page instead.',
            extraction_paywall: 'This page appears to be behind a paywall or requires login.',
            extraction_empty: 'No content could be extracted from this page. Please try a different URL.',
            ai_no_key: 'Please provide your own API key to use AI simplification. You can enter it in the form above or add it to your .env file.',
            ai_invalid_key: 'The provided API key is invalid. Please check your API key and try again.',
            ai_rate_limit: 'API rate limit reached. Please wait a few minutes and try again.',
            ai_timeout: 'AI service is taking longer than expected. Please wait or try again.',
            ai_error: 'AI simplification failed. Displaying original content instead.',
            network_error: 'Network error occurred. Please check your internet connection and try again.',
            invalid_url: 'Please enter a valid URL starting with http:// or https://',
            unknown: 'An unexpected error occurred. Please try again.'
        };
    }
    
    /**
     * Displays error message based on error type

     * @param {string} errorType - Type of error (fetch_error, extraction_error, ai_error, etc.)
     * @param {string} customMessage - Optional custom error message
     */
    showError(errorType, customMessage = null) {
        // Hide loading indicator if visible
        this.hideLoading();
        
        // Get appropriate error message
        const message = customMessage || this.errorMessages[errorType] || this.errorMessages.unknown;
        
        // Display error message
        if (this.errorSection && this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorSection.style.display = 'block';
            
            // Add specific guidance based on error type
            this.addErrorGuidance(errorType);
        }
        
        // Handle specific error types
        this.handleSpecificError(errorType);
        
        console.error(`ErrorDisplayComponent: ${errorType} - ${message}`);
    }
    
    /**
     * Adds specific guidance for different error types
     * @param {string} errorType - Type of error
     */
    addErrorGuidance(errorType) {
        // Create or get guidance element
        let guidanceElement = document.getElementById('error-guidance');
        if (!guidanceElement) {
            guidanceElement = document.createElement('div');
            guidanceElement.id = 'error-guidance';
            guidanceElement.className = 'error-guidance';
            this.errorSection.appendChild(guidanceElement);
        }
        
        // Clear previous guidance
        guidanceElement.innerHTML = '';
        
        // Add specific guidance based on error type
        let guidance = '';
        
        switch (errorType) {
            case 'fetch_failed':
            case 'fetch_timeout':
            case 'fetch_unreachable':
            case 'network_error':
                guidance = `
                    <p><strong>Troubleshooting tips:</strong></p>
                    <ul>
                        <li>Check that the URL is correct and accessible</li>
                        <li>Verify your internet connection is working</li>
                        <li>Try a different webpage or one of our demo URLs</li>
                        <li>Some websites may block automated access</li>
                    </ul>
                `;
                break;
                
            case 'extraction_dynamic':
                guidance = `
                    <p><strong>Why this happened:</strong></p>
                    <p>This page uses JavaScript to load content dynamically. Our tool works best with static HTML pages.</p>
                    <p><strong>What to try:</strong></p>
                    <ul>
                        <li>Try a news article or blog post instead</li>
                        <li>Use one of our pre-vetted demo URLs</li>
                        <li>Look for pages with visible text content when JavaScript is disabled</li>
                    </ul>
                `;
                break;
                
            case 'extraction_paywall':
                guidance = `
                    <p><strong>Why this happened:</strong></p>
                    <p>This page requires a subscription or login to view the full content.</p>
                    <p><strong>What to try:</strong></p>
                    <ul>
                        <li>Try a freely accessible article</li>
                        <li>Use one of our demo URLs</li>
                        <li>Look for the same content on a different website</li>
                    </ul>
                `;
                break;
                
            case 'ai_no_key':
                guidance = `
                    <p><strong>How to get an API key:</strong></p>
                    <ul>
                        <li>Visit <a href="https://openrouter.ai/" target="_blank" rel="noopener">OpenRouter</a> for fast, reliable AI</li>
                        <li>Or try <a href="https://huggingface.co/" target="_blank" rel="noopener">Hugging Face</a> for free tier access</li>
                        <li>Enter your API key in the form above</li>
                    </ul>
                `;
                break;
                
            case 'ai_invalid_key':
                guidance = `
                    <p><strong>API Key Issues:</strong></p>
                    <ul>
                        <li>Make sure you copied the entire API key</li>
                        <li>Check that the key hasn't expired</li>
                        <li>Verify you're using the correct key for the service</li>
                    </ul>
                `;
                break;
                
            case 'ai_rate_limit':
                guidance = `
                    <p><strong>Rate Limit Information:</strong></p>
                    <p>You've made too many requests in a short time. Free tier APIs have usage limits.</p>
                    <ul>
                        <li>Wait 5-10 minutes before trying again</li>
                        <li>Consider upgrading to a paid API tier for higher limits</li>
                    </ul>
                `;
                break;
        }
        
        if (guidance) {
            guidanceElement.innerHTML = guidance;
            guidanceElement.style.display = 'block';
        } else {
            guidanceElement.style.display = 'none';
        }
    }
    
    /**
     * Handles specific error type actions
     * @param {string} errorType - Type of error
     */
    handleSpecificError(errorType) {
        // Prompt for API key if missing
        if (errorType === 'ai_no_key' || errorType === 'ai_invalid_key') {
            if (window.apiKeyComponent) {
                window.apiKeyComponent.promptForAPIKey();
            }
        }
    }
    
    /**
     * Hides error message
     */
    hideError() {
        if (this.errorSection) {
            this.errorSection.style.display = 'none';
        }
        if (this.errorMessage) {
            this.errorMessage.textContent = '';
        }
        
        // Clear guidance
        const guidanceElement = document.getElementById('error-guidance');
        if (guidanceElement) {
            guidanceElement.style.display = 'none';
            guidanceElement.innerHTML = '';
        }
    }
    
    /**
     * Displays cold-start warning for first AI requests
     */
    showColdStartWarning() {
        if (this.coldStartWarning) {
            this.coldStartWarning.style.display = 'block';
        }
    }
    
    /**
     * Hides cold-start warning
     */
    hideColdStartWarning() {
        if (this.coldStartWarning) {
            this.coldStartWarning.style.display = 'none';
        }
    }
    
    /**
     * Shows loading indicator with optional cold-start warning
     * @param {boolean} showColdStart - Whether to show cold-start warning
     */
    showLoading(showColdStart = false) {
        if (this.loadingSection) {
            this.loadingSection.style.display = 'block';
        }
        
        if (showColdStart) {
            this.showColdStartWarning();
        } else {
            this.hideColdStartWarning();
        }
        
        // Hide any existing errors
        this.hideError();
    }
    
    /**
     * Hides loading indicator
     */
    hideLoading() {
        if (this.loadingSection) {
            this.loadingSection.style.display = 'none';
        }
        this.hideColdStartWarning();
    }
    
    /**
     * Displays truncation notification
     * @param {boolean} show - Whether to show the notification
     */
    showTruncationNotice(show = true) {
        const truncationNotice = document.getElementById('truncation-notice');
        if (truncationNotice) {
            truncationNotice.style.display = show ? 'block' : 'none';
        }
    }
    
    /**
     * Displays AI failure with graceful degradation
     * Shows original content with notification about simplification failure
     * @param {string} errorMessage - Specific error message
     */
    showAIFailureWithDegradation(errorMessage) {
        // Show error notification
        this.showError('ai_error', errorMessage);
        
        // The ViewToggleComponent will handle displaying original content
        // This is graceful degradation - user still gets the extracted content
    }
}

/**
 * ViewToggleComponent
 * Manages switching between Original and Focus views
 */
class ViewToggleComponent {
    constructor() {
        this.toggleBtn = document.getElementById('toggle-view');
        this.contentSection = document.getElementById('content-section');
        this.contentTitle = document.getElementById('content-title');
        this.contentDisplay = document.getElementById('content-display');
        this.truncationNotice = document.getElementById('truncation-notice');
        
        // Initialize LayoutTransformer
        this.layoutTransformer = new LayoutTransformer();
        
        this.init();
    }
    
    init() {
        // Bind toggle button click
        this.toggleBtn.addEventListener('click', () => {
            this.toggleView();
        });
        
        // Listen for content processed event
        document.addEventListener('contentProcessed', (e) => {
            this.handleContentProcessed(e.detail);
        });
    }
    
    /**
     * Toggles between original and focus views
     * Uses cached content from SessionState without re-fetching
     */
    toggleView() {
        if (!window.sessionState || !window.sessionState.hasContent()) {
            console.warn('No content available to toggle');
            return;
        }
        
        const currentView = window.sessionState.getCurrentView();
        
        // Switch view
        if (currentView === 'original') {
            window.sessionState.setCurrentView('focus');
            this.renderFocus();
        } else {
            window.sessionState.setCurrentView('original');
            this.renderOriginal();
        }
        
        // Update toggle button state and text
        this.updateToggleButton();
    }
    
    /**
     * Renders original extracted content without transformations
     */
    renderOriginal() {
        if (!window.sessionState) {
            console.error('SessionState not initialized');
            return;
        }
        
        const originalContent = window.sessionState.getOriginalContent();
        const title = window.sessionState.getTitle();
        
        if (!originalContent) {
            console.warn('No original content available');
            return;
        }
        
        // Display title
        if (title) {
            this.contentTitle.textContent = title;
        }
        
        // Display original content without AI simplification or layout transformations
        this.contentDisplay.innerHTML = this.formatContent(originalContent);
        
        // Remove focus mode transformations using LayoutTransformer
        this.layoutTransformer.removeFocusMode(this.contentSection);
        
        // Show content section
        this.contentSection.style.display = 'block';
        
        // Hide truncation notice in original view
        this.truncationNotice.style.display = 'none';
    }
    
    /**
     * Renders AI-simplified content with focus mode transformations
     */
    renderFocus() {
        if (!window.sessionState) {
            console.error('SessionState not initialized');
            return;
        }
        
        const simplifiedContent = window.sessionState.getSimplifiedContent();
        const title = window.sessionState.getTitle();
        const isTruncated = window.sessionState.isTruncated();
        
        if (!simplifiedContent) {
            console.warn('No simplified content available');
            return;
        }
        
        // Display title
        if (title) {
            this.contentTitle.textContent = title;
        }
        
        // Display simplified content
        this.contentDisplay.innerHTML = this.formatContent(simplifiedContent);
        
        // Apply focus mode transformations using LayoutTransformer
        this.layoutTransformer.applyFocusMode(this.contentSection);
        
        // Show content section
        this.contentSection.style.display = 'block';
        
        // Show truncation notice if content was truncated
        if (isTruncated) {
            this.truncationNotice.style.display = 'block';
        } else {
            this.truncationNotice.style.display = 'none';
        }
    }
    
    /**
     * Formats content for display (converts newlines to paragraphs)
     * @param {string} content - Raw content text
     * @returns {string} - HTML formatted content
     */
    formatContent(content) {
        if (!content) return '';
        
        // Split by double newlines to create paragraphs
        const paragraphs = content.split(/\n\n+/);
        
        // Wrap each paragraph in <p> tags
        const formatted = paragraphs
            .map(para => {
                // Trim whitespace
                const trimmed = para.trim();
                if (!trimmed) return '';
                
                // Replace single newlines with <br> within paragraphs
                const withBreaks = trimmed.replace(/\n/g, '<br>');
                
                return `<p>${withBreaks}</p>`;
            })
            .filter(para => para !== '')
            .join('');
        
        return formatted;
    }
    
    /**
     * Updates toggle button text and aria-pressed state
     */
    updateToggleButton() {
        if (!window.sessionState) return;
        
        const currentView = window.sessionState.getCurrentView();
        
        if (currentView === 'focus') {
            this.toggleBtn.textContent = 'Switch to Original View';
            this.toggleBtn.setAttribute('aria-pressed', 'true');
        } else {
            this.toggleBtn.textContent = 'Switch to Focus Mode';
            this.toggleBtn.setAttribute('aria-pressed', 'false');
        }
    }
    
    /**
     * Handles content processed event
     * @param {Object} data - Content data from backend
     */
    handleContentProcessed(data) {
        // Enable toggle button
        this.toggleBtn.disabled = false;
        
        // Render original view by default
        this.renderOriginal();
        
        // Update toggle button
        this.updateToggleButton();
    }
}

/**
 * TTSComponent
 * Handles Text-to-Speech read-aloud functionality with sentence highlighting
 * Uses Web Speech API: SpeechSynthesisUtterance and speechSynthesis.speak()
 */
class TTSComponent {
    constructor() {
        // DOM elements
        this.playBtn = document.getElementById('tts-play');
        this.pauseBtn = document.getElementById('tts-pause');
        this.stopBtn = document.getElementById('tts-stop');
        this.ttsControls = document.getElementById('tts-controls');
        this.contentDisplay = document.getElementById('content-display');
        
        // Web Speech API
        this.synth = window.speechSynthesis;
        this.utterance = null;
        
        // State tracking
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentSentenceIndex = 0;
        
        // Sentence data
        this.sentences = [];
        this.sentenceElements = [];
        
        this.init();
    }
    
    init() {
        // Check if Speech API is available
        if (!this.synth) {
            console.warn('Speech Synthesis API not available');
            return;
        }
        
        // Bind button events
        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => this.play());
        }
        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', () => this.pause());
        }
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stop());
        }
        
        // Listen for content processed event
        document.addEventListener('contentProcessed', () => {
            this.handleNewContent();
        });
    }
    
    /**
     * Handles new content being loaded
     * Shows TTS controls if content is available
     */
    handleNewContent() {
        // Cancel any ongoing speech when new content arrives
        if (this.isSpeaking) {
            this.stop();
        }
        
        // Check if content is available
        const hasContent = this.contentDisplay && 
                          this.contentDisplay.textContent && 
                          this.contentDisplay.textContent.trim().length > 0;
        
        if (hasContent) {
            this.ttsControls.style.display = 'block';
            this.playBtn.disabled = false;
        } else {
            this.ttsControls.style.display = 'none';
            this.playBtn.disabled = true;
        }
    }
    
    /**
     * Play button handler - starts from beginning or resumes
     */
    play() {
        if (!this.contentDisplay) return;
        
        // Prevent multiple clicks from stacking utterances
        if (this.isSpeaking && !this.isPaused) {
            return;
        }
        
        // If paused, resume
        if (this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
            this.updateButtonStates();
            return;
        }
        
        // Get text content
        const text = this.contentDisplay.textContent || this.contentDisplay.innerText;
        
        // Handle empty text
        if (!text || text.trim() === '') {
            console.warn('No text to read');
            this.playBtn.disabled = true;
            return;
        }
        
        // Split into sentences once
        this.sentences = this.splitIntoSentences(text);
        
        if (this.sentences.length === 0) {
            console.warn('No sentences found');
            return;
        }
        
        // Prepare content for highlighting
        this.prepareHighlighting();
        
        // Start from beginning
        this.currentSentenceIndex = 0;
        this.isSpeaking = true;
        this.isPaused = false;
        
        // Create utterance with full text
        this.utterance = new SpeechSynthesisUtterance(text);
        this.utterance.rate = 0.9;
        this.utterance.pitch = 1.0;
        this.utterance.volume = 1.0;
        
        // Use onboundary to track sentence progress
        this.utterance.onboundary = (event) => {
            // Update highlight based on character position
            this.updateHighlightByPosition(event.charIndex);
        };
        
        // Handle end of speech
        this.utterance.onend = () => {
            this.stop();
        };
        
        // Handle errors
        this.utterance.onerror = (event) => {
            console.error('Speech error:', event);
            this.stop();
        };
        
        // Speak using Web Speech API
        this.synth.speak(this.utterance);
        
        // Highlight first sentence
        this.highlightSentence(0);
        
        this.updateButtonStates();
    }
    
    /**
     * Pause button handler
     */
    pause() {
        if (this.isSpeaking && !this.isPaused) {
            this.synth.pause();
            this.isPaused = true;
            this.updateButtonStates();
        }
    }
    
    /**
     * Stop button handler - cancels speech and resets index
     */
    stop() {
        // Cancel speech
        this.synth.cancel();
        
        // Remove all highlights
        this.clearAllHighlights();
        
        // Restore original content
        this.restoreContent();
        
        // Reset state cleanly
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentSentenceIndex = 0;
        this.utterance = null;
        
        this.updateButtonStates();
    }
    
    /**
     * Splits text into sentences
     * @param {string} text - Text to split
     * @returns {Array<string>} - Array of sentences
     */
    splitIntoSentences(text) {
        // Simple sentence splitting by punctuation
        const sentenceRegex = /[^.!?]+[.!?]+/g;
        const matches = text.match(sentenceRegex) || [];
        return matches.map(s => s.trim()).filter(s => s.length > 0);
    }
    
    /**
     * Prepares content for sentence highlighting
     * Wraps each sentence in a span with a class
     */
    prepareHighlighting() {
        if (!this.contentDisplay) return;
        
        // Store original HTML
        this.originalHTML = this.contentDisplay.innerHTML;
        
        // Get text content
        const text = this.contentDisplay.textContent || this.contentDisplay.innerText;
        
        // Build new HTML with sentence spans
        let html = '';
        let lastIndex = 0;
        
        this.sentenceElements = [];
        
        this.sentences.forEach((sentence, index) => {
            const sentenceIndex = text.indexOf(sentence, lastIndex);
            
            if (sentenceIndex !== -1) {
                // Add text before sentence (if any)
                if (sentenceIndex > lastIndex) {
                    html += this.escapeHtml(text.substring(lastIndex, sentenceIndex));
                }
                
                // Add sentence wrapped in span
                const spanId = `tts-s-${index}`;
                html += `<span id="${spanId}" class="tts-sentence">${this.escapeHtml(sentence)}</span>`;
                
                lastIndex = sentenceIndex + sentence.length;
            }
        });
        
        // Add remaining text
        if (lastIndex < text.length) {
            html += this.escapeHtml(text.substring(lastIndex));
        }
        
        // Update DOM
        this.contentDisplay.innerHTML = html;
        
        // Store element references
        this.sentences.forEach((_, index) => {
            const el = document.getElementById(`tts-s-${index}`);
            if (el) {
                this.sentenceElements.push(el);
            }
        });
    }
    
    /**
     * Escapes HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Updates highlight based on character position from onboundary event
     * @param {number} charIndex - Current character index in speech
     */
    updateHighlightByPosition(charIndex) {
        // Calculate which sentence we're in based on character position
        const text = this.contentDisplay.textContent || this.contentDisplay.innerText;
        let currentPos = 0;
        
        for (let i = 0; i < this.sentences.length; i++) {
            const sentenceStart = text.indexOf(this.sentences[i], currentPos);
            const sentenceEnd = sentenceStart + this.sentences[i].length;
            
            if (charIndex >= sentenceStart && charIndex < sentenceEnd) {
                // We're in this sentence
                if (i !== this.currentSentenceIndex) {
                    // Remove old highlight
                    this.unhighlightSentence(this.currentSentenceIndex);
                    
                    // Add new highlight
                    this.currentSentenceIndex = i;
                    this.highlightSentence(i);
                }
                break;
            }
            
            currentPos = sentenceEnd;
        }
    }
    
    /**
     * Highlights a sentence by adding CSS class
     * @param {number} index - Sentence index to highlight
     */
    highlightSentence(index) {
        if (index >= 0 && index < this.sentenceElements.length) {
            const el = this.sentenceElements[index];
            if (el) {
                el.classList.add('tts-highlight');
                // Scroll to highlighted sentence
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
    
    /**
     * Removes highlight from a sentence
     * @param {number} index - Sentence index to unhighlight
     */
    unhighlightSentence(index) {
        if (index >= 0 && index < this.sentenceElements.length) {
            const el = this.sentenceElements[index];
            if (el) {
                el.classList.remove('tts-highlight');
            }
        }
    }
    
    /**
     * Clears all highlights
     */
    clearAllHighlights() {
        this.sentenceElements.forEach(el => {
            if (el) {
                el.classList.remove('tts-highlight');
            }
        });
    }
    
    /**
     * Restores original content HTML
     */
    restoreContent() {
        if (this.originalHTML && this.contentDisplay) {
            this.contentDisplay.innerHTML = this.originalHTML;
        }
        this.sentenceElements = [];
    }
    
    /**
     * Updates button states based on current state
     */
    updateButtonStates() {
        if (!this.playBtn || !this.pauseBtn || !this.stopBtn) return;
        
        if (this.isSpeaking) {
            if (this.isPaused) {
                // Paused state
                this.playBtn.textContent = '▶️ Resume';
                this.playBtn.disabled = false;
                this.pauseBtn.disabled = true;
                this.stopBtn.disabled = false;
            } else {
                // Speaking state
                this.playBtn.textContent = '▶️ Play';
                this.playBtn.disabled = true;
                this.pauseBtn.disabled = false;
                this.stopBtn.disabled = false;
            }
        } else {
            // Stopped state
            this.playBtn.textContent = '▶️ Play';
            this.playBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.stopBtn.disabled = true;
        }
    }
}

// Initialize components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Focus Mode Accessibility Tool loaded');
    
    // Initialize SessionState first
    window.sessionState = new SessionState();
    
    // Initialize ErrorDisplayComponent
    window.errorDisplay = new ErrorDisplayComponent();
    
    // Initialize APIKeyInputComponent
    window.apiKeyComponent = new APIKeyInputComponent();
    
    // Initialize FocusProfileComponent
    window.focusProfileComponent = new FocusProfileComponent();
    
    // Initialize URLInputComponent
    window.urlInputComponent = new URLInputComponent();
    
    // Initialize ViewToggleComponent
    window.viewToggleComponent = new ViewToggleComponent();
    
    // Initialize TTSComponent
    window.ttsComponent = new TTSComponent();
});
