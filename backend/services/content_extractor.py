"""
Content Extractor Service

Extracts main content from HTML, removing clutter like ads, navigation, sidebars, and footers.
Works best with static HTML pages. JavaScript-heavy or dynamically rendered pages may fail.
"""

from bs4 import BeautifulSoup
from typing import Dict, Optional
import re


class ContentExtractorService:
    """Extracts main content from HTML
    
    Note: Extraction works best with static HTML pages. JavaScript-heavy
    or dynamically rendered pages may fail or return minimal content.
    Paywalled or login-required pages will also fail extraction.
    """
    
    def __init__(self):
        """Initialize the content extractor service."""
        # Common clutter element identifiers
        self.clutter_tags = [
            'nav', 'header', 'footer', 'aside', 'script', 'style', 
            'noscript', 'iframe', 'form'
        ]
        
        self.clutter_classes = [
            'advertisement', 'ad', 'ads', 'sidebar', 'side-bar',
            'navigation', 'nav', 'menu', 'header', 'footer',
            'comment', 'comments', 'social', 'share', 'sharing',
            'related', 'recommended', 'popup', 'modal', 'banner'
        ]
        
        self.clutter_ids = [
            'sidebar', 'header', 'footer', 'nav', 'navigation',
            'comments', 'advertisement', 'ad', 'social'
        ]
    
    def extract_main_content(self, html: str) -> Dict[str, any]:
        """
        Uses BeautifulSoup to extract article content.
        
        Args:
            html: Raw HTML content
            
        Returns:
            Dictionary with:
                - title (str): Page title
                - text (str): Extracted main content
                - success (bool): Whether extraction was successful
                - error (str | None): Error message if failed
                - page_type (str | None): Type of page ('static', 'dynamic', 'empty', 'paywall')
        """
        if not html or not isinstance(html, str):
            return {
                'title': '',
                'text': '',
                'success': False,
                'error': 'No HTML content provided',
                'page_type': 'empty'
            }
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Extract title
            title = self._extract_title(soup)
            
            # Remove clutter elements
            cleaned_soup = self._remove_clutter(soup)
            
            # Extract main article text
            article_text = self._extract_article_text(cleaned_soup)
            
            # Check if content is minimal or empty
            if not article_text or len(article_text.strip()) < 100:
                # Detect if page is JavaScript-heavy
                if self._detect_dynamic_content(html):
                    return {
                        'title': title,
                        'text': '',
                        'success': False,
                        'error': 'Could not extract content. This page uses dynamic JavaScript rendering. Try a static article page instead.',
                        'page_type': 'dynamic'
                    }
                
                # Check for paywall indicators
                if self._detect_paywall(html, soup):
                    return {
                        'title': title,
                        'text': '',
                        'success': False,
                        'error': 'This page appears to be behind a paywall or requires login.',
                        'page_type': 'paywall'
                    }
                
                return {
                    'title': title,
                    'text': '',
                    'success': False,
                    'error': 'Could not extract meaningful content from this page.',
                    'page_type': 'empty'
                }
            
            return {
                'title': title,
                'text': article_text,
                'success': True,
                'error': None,
                'page_type': 'static'
            }
        
        except Exception as e:
            return {
                'title': '',
                'text': '',
                'success': False,
                'error': f'Content extraction failed: {str(e)}',
                'page_type': None
            }
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """
        Extract page title from HTML.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            Page title or empty string
        """
        # Try <title> tag first
        title_tag = soup.find('title')
        if title_tag and title_tag.string:
            return title_tag.string.strip()
        
        # Try <h1> as fallback
        h1_tag = soup.find('h1')
        if h1_tag:
            return h1_tag.get_text().strip()
        
        return ''
    
    def _remove_clutter(self, soup: BeautifulSoup) -> BeautifulSoup:
        """
        Removes ads, nav, sidebars, footers from HTML.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            Cleaned BeautifulSoup object
        """
        # Remove clutter by tag name (but keep main content tags)
        for tag_name in self.clutter_tags:
            for tag in soup.find_all(tag_name):
                tag.decompose()
        
        # Remove elements by class name (but be careful with Wikipedia and main content)
        for element in soup.find_all(class_=True):
            try:
                classes = element.get('class', [])
                if isinstance(classes, str):
                    classes = [classes]
                
                # Skip Wikipedia-specific content classes and main content
                protected_classes = ['mw-content', 'mw-parser-output', 'mw-body', 'mw-body-content', 'content', 'main', 'article']
                if any(protected_cls in ' '.join(classes).lower() for protected_cls in protected_classes):
                    continue
                
                # Check if any class matches clutter patterns
                for cls in classes:
                    cls_lower = cls.lower()
                    if any(clutter in cls_lower for clutter in self.clutter_classes):
                        element.decompose()
                        break
            except (AttributeError, TypeError):
                # Skip elements that can't be processed
                continue
        
        # Remove elements by id (but preserve main content IDs)
        for element in soup.find_all(id=True):
            try:
                element_id = element.get('id')
                if element_id:
                    element_id_lower = element_id.lower()
                    
                    # Skip Wikipedia main content IDs and other main content
                    protected_ids = ['mw-content-text', 'bodycontent', 'mw-content', 'content', 'main', 'article']
                    if any(protected_id in element_id_lower for protected_id in protected_ids):
                        continue
                    
                    if any(clutter in element_id_lower for clutter in self.clutter_ids):
                        element.decompose()
            except (AttributeError, TypeError):
                # Skip elements that can't be processed
                continue
        
        # Remove elements with common ad-related attributes
        try:
            for element in soup.find_all(attrs={'role': 'complementary'}):
                element.decompose()
        except (AttributeError, TypeError):
            pass
        
        try:
            for element in soup.find_all(attrs={'aria-label': re.compile(r'advertisement|sidebar', re.I)}):
                element.decompose()
        except (AttributeError, TypeError):
            pass
        
        return soup
    
    def _extract_article_text(self, soup: BeautifulSoup) -> str:
        """
        Identifies and extracts main article text.
        
        Args:
            soup: Cleaned BeautifulSoup object
            
        Returns:
            Extracted article text
        """
        # Strategy 0: Wikipedia-specific extraction
        # Wikipedia uses specific IDs and classes for content
        wikipedia_content = soup.find('div', id='mw-content-text')
        if not wikipedia_content:
            wikipedia_content = soup.find('div', id='bodyContent')
        
        if wikipedia_content:
            # Make a copy to avoid modifying original
            wiki_copy = BeautifulSoup(str(wikipedia_content), 'html.parser')
            
            # Remove unwanted Wikipedia elements
            for unwanted_class in ['reflist', 'navbox', 'infobox', 'metadata', 'ambox', 'mbox', 'catlinks']:
                for elem in wiki_copy.find_all(class_=re.compile(unwanted_class, re.I)):
                    elem.decompose()
            
            # Remove edit sections
            for elem in wiki_copy.find_all(class_='mw-editsection'):
                elem.decompose()
            
            # Remove navigation boxes
            for elem in wiki_copy.find_all('table', class_=re.compile(r'navbox|infobox', re.I)):
                elem.decompose()
            
            # Extract all paragraphs
            paragraphs = wiki_copy.find_all('p')
            if paragraphs:
                text = '\n\n'.join([p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20])
                if len(text.strip()) > 200:
                    return text
        
        # Strategy 1: Look for <article> tag
        article = soup.find('article')
        if article:
            text = self._extract_text_from_element(article)
            if len(text.strip()) > 100:
                return text
        
        # Strategy 2: Look for main content containers
        main_containers = [
            soup.find('main'),
            soup.find(class_=re.compile(r'(article|content|post|entry|main)', re.I)),
            soup.find(id=re.compile(r'(article|content|post|entry|main|bodyContent)', re.I)),
            soup.find('div', class_=re.compile(r'story|text', re.I))
        ]
        
        for container in main_containers:
            if container:
                text = self._extract_text_from_element(container)
                if len(text.strip()) > 100:  # Ensure meaningful content
                    return text
        
        # Strategy 3: Find paragraphs (common in articles)
        paragraphs = soup.find_all('p')
        if len(paragraphs) > 3:  # If there are multiple paragraphs, likely an article
            paragraph_text = '\n\n'.join([p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 50])
            if len(paragraph_text.strip()) > 200:
                return paragraph_text
        
        # Strategy 4: Find the largest text block
        all_divs = soup.find_all(['div', 'section'])
        largest_text = ''
        
        for div in all_divs:
            text = self._extract_text_from_element(div)
            if len(text) > len(largest_text):
                largest_text = text
        
        if len(largest_text.strip()) > 100:
            return largest_text
        
        # Strategy 5: Fallback to body text
        body = soup.find('body')
        if body:
            return self._extract_text_from_element(body)
        
        # Last resort: all text
        return soup.get_text(separator='\n', strip=True)
    
    def _extract_text_from_element(self, element) -> str:
        """
        Extract clean text from a BeautifulSoup element.
        
        Args:
            element: BeautifulSoup element
            
        Returns:
            Cleaned text with preserved structure
        """
        # Get text with line breaks preserved
        text = element.get_text(separator='\n', strip=True)
        
        # Clean up excessive whitespace
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Join with double newlines for paragraph separation
        return '\n\n'.join(lines)
    
    def _detect_dynamic_content(self, html: str) -> bool:
        """
        Heuristic detection of JS-heavy pages (minimal static content).
        
        Args:
            html: Raw HTML content
            
        Returns:
            True if page appears to be JavaScript-heavy
        """
        # Count script tags vs content
        script_count = html.count('<script')
        
        # Look for common SPA frameworks
        spa_indicators = [
            'react', 'vue', 'angular', 'ng-app', 'data-reactroot',
            '__NEXT_DATA__', '__nuxt', 'ember-application'
        ]
        
        has_spa_framework = any(indicator in html.lower() for indicator in spa_indicators)
        
        # Check if there's minimal static content
        soup = BeautifulSoup(html, 'html.parser')
        body = soup.find('body')
        
        if body:
            # Remove script and style tags for text analysis
            for tag in body.find_all(['script', 'style']):
                tag.decompose()
            
            body_text = body.get_text(strip=True)
            
            # If body has very little text and many scripts, likely dynamic
            if len(body_text) < 500 and script_count > 5:
                return True
            
            # If SPA framework detected and minimal content
            if has_spa_framework and len(body_text) < 1000:
                return True
        
        return False
    
    def _detect_paywall(self, html: str, soup: BeautifulSoup) -> bool:
        """
        Detect paywall or login-required pages.
        
        Args:
            html: Raw HTML content
            soup: BeautifulSoup object
            
        Returns:
            True if page appears to be paywalled
        """
        paywall_indicators = [
            'paywall', 'subscribe', 'subscription', 'premium',
            'login-required', 'sign-in', 'register-wall'
        ]
        
        html_lower = html.lower()
        
        # Check for paywall keywords in classes and IDs
        for element in soup.find_all(class_=True):
            classes = element.get('class', [])
            if isinstance(classes, str):
                classes = [classes]
            
            for cls in classes:
                if any(indicator in cls.lower() for indicator in paywall_indicators):
                    return True
        
        # Check for paywall keywords in text
        if any(indicator in html_lower for indicator in ['subscribe to continue', 'login to read', 'premium content']):
            return True
        
        return False
