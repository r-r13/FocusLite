Demo URLs Documentation

This document describes the pre-vetted demo URLs included in the Focus Mode Accessibility Tool.

Overview

The demo URL selector provides users with reliable, tested URLs that work well with the content extraction system. These URLs have been carefully selected and tested to ensure:

Static HTML content (not JavaScript-heavy)

Reliable extraction (good title and content)

Publicly accessible (no paywall or login required)

Fast loading

Stable URLs (unlikely to change)

Vetted Demo URLs
1. HTTPBin - Moby Dick Excerpt

URL: https://httpbin.org/html

Description: Simple HTML page with literary content from Herman Melville's Moby-Dick

Details:

Title: "Herman Melville - Moby-Dick"

Word Count: ~601 words

Content Type: Classic literature excerpt

Page Type: Static HTML

Suitable For: Testing basic content extraction with classic literature

Why it works well:

Simple, clean HTML structure

No JavaScript required

Reliable and fast

Maintained by HTTPBin (stable service)

2. NPR Text-Only News

URL: https://text.npr.org

Description: Text-only version of NPR news (current headlines)

Details:

Title: "NPR : National Public Radio"

Word Count: ~234 words (varies with current news)

Content Type: Current news headlines

Page Type: Static HTML

Suitable For: Testing with real news content in a simple format

Why it works well:

Text-only format designed for accessibility

No JavaScript required

Updates regularly with current news

Maintained by NPR (reliable source)

Note: Content changes daily as news updates, so word count and specific content will vary.

3. Pride and Prejudice (Project Gutenberg)

URL: https://www.gutenberg.org/files/1342/1342-h/1342-h.htm

Description: Classic novel by Jane Austen from Project Gutenberg

Details:

Title: "Pride and Prejudice | Project Gutenberg"

Word Count: ~1812 words

Content Type: Classic literature (full novel)

Page Type: Static HTML

Suitable For: Testing with longer literary content

Why it works well:

Public domain content (no copyright issues)

Simple HTML structure

Long-form content (good for testing truncation)

Maintained by Project Gutenberg (stable, reliable)

Testing Results

All demo URLs have been tested through the full pipeline:

Implementation
Frontend (HTML)

The demo URL selector is implemented in frontend/index.html:

<div id="demo-urls" class="demo-section">
    <label for="demo-selector">Or try a demo URL:</label>
    <select id="demo-selector" aria-label="Select a demo URL">
        <option value="">Select a demo...</option>
        <option value="https://httpbin.org/html">HTTPBin - Moby Dick Excerpt</option>
        <option value="https://text.npr.org">NPR Text-Only News</option>
        <option value="https://www.gutenberg.org/files/1342/1342-h/1342-h.htm">Pride and Prejudice (Project Gutenberg)</option>
    </select>
</div>
Frontend (JavaScript)

The demo URL functionality is implemented in frontend/app.js in the URLInputComponent class:

// Bind demo URL selector
this.demoSelector.addEventListener('change', (e) => {
    const demoURL = e.target.value;
    if (demoURL) {
        this.populateDemoURL(demoURL);
    }
});

When a user selects a demo URL:

The URL is populated into the main URL input field.

Any existing errors are cleared.

The demo selector is reset to the default option.

The user can then click "Simplify" to process the URL.

Maintenance
Periodic Testing

Demo URLs should be tested periodically to ensure they remain accessible and functional:

# Run the vetting test
python backend/tests/test_vetted_demo_urls.py
Adding New Demo URLs

To add new demo URLs:

Add the candidate URL to backend/tests/test_demo_url_vetting.py.

Run the vetting script to test it:

python backend/tests/test_demo_url_vetting.py

If suitable, add it to backend/tests/vetted_demo_urls.py.

Update frontend/index.html with the new option.

Run the full test suite to verify:

python backend/tests/test_vetted_demo_urls.py
Criteria for Demo URLs

A good demo URL should:

✓ Be publicly accessible (no login/paywall)

✓ Use static HTML (not JavaScript-heavy)

✓ Have meaningful content (at least 100 words)

✓ Have a clear title

✓ Load quickly (< 5 seconds)

✓ Be from a stable, reliable source

✓ Be appropriate for all audiences

Related Files

frontend/index.html - Demo URL selector UI

frontend/app.js - Demo URL functionality (URLInputComponent)

backend/tests/vetted_demo_urls.py - List of vetted demo URLs

backend/tests/test_vetted_demo_urls.py - Test suite for demo URLs

backend/tests/test_demo_url_vetting.py - Vetting script for new candidates