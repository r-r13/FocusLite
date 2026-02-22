"""
Content Fetcher Service

Handles webpage fetching with timeout and error handling for network failures.
Implements server-side fetch as the primary mechanism.
"""

import requests
from typing import Dict, Optional


class ContentFetcherService:
    """Handles webpage fetching with fallback mechanisms"""
    
    def __init__(self, timeout: int = 10):
        """
        Initialize the content fetcher service.
        
        Args:
            timeout: Request timeout in seconds (default: 10)
        """
        self.timeout = timeout
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    def fetch_content(self, url: str) -> Dict[str, any]:
        """
        Attempts server-side fetch, falls back to CORS proxy if needed.
        
        Args:
            url: The URL to fetch
            
        Returns:
            Dictionary with:
                - success (bool): Whether fetch was successful
                - content (str): HTML content if successful
                - error (str | None): Error message if failed
                - error_type (str | None): Type of error ('fetch_error', 'timeout', 'invalid_url')
                - used_fallback (bool): Whether CORS proxy fallback was used
        """
        # Validate URL format
        if not self._is_valid_url(url):
            return {
                'success': False,
                'content': None,
                'error': 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.',
                'error_type': 'invalid_url',
                'used_fallback': False
            }
        
        try:
            # Attempt server-side fetch
            content = self._fetch_server_side(url)
            return {
                'success': True,
                'content': content,
                'error': None,
                'error_type': None,
                'used_fallback': False
            }
        
        except requests.exceptions.Timeout:
            # Try CORS proxy fallback on timeout
            return self._try_fallback(url, 'timeout', f'Request timed out after {self.timeout} seconds.')
        
        except requests.exceptions.ConnectionError as e:
            # Try CORS proxy fallback on connection error
            return self._try_fallback(url, 'connection_error', 'Connection failed: Unable to reach the server.')
        
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response else 'unknown'
            # Try CORS proxy fallback on HTTP error
            return self._try_fallback(url, 'http_error', f'HTTP error {status_code}: The server returned an error response.')
        
        except requests.exceptions.RequestException as e:
            # Try CORS proxy fallback on other request errors
            return self._try_fallback(url, 'request_error', f'Failed to fetch content: {str(e)}')
        
        except Exception as e:
            return {
                'success': False,
                'content': None,
                'error': f'Unexpected error: {str(e)}',
                'error_type': 'fetch_error',
                'used_fallback': False
            }
    
    def _try_fallback(self, url: str, original_error_type: str, original_error_msg: str) -> Dict[str, any]:
        """
        Attempt CORS proxy fallback when server-side fetch fails.
        
        Args:
            url: The URL to fetch
            original_error_type: The type of error from server-side fetch
            original_error_msg: The error message from server-side fetch
            
        Returns:
            Dictionary with fetch result
        """
        try:
            content = self._fetch_cors_proxy(url)
            return {
                'success': True,
                'content': content,
                'error': None,
                'error_type': None,
                'used_fallback': True
            }
        except Exception as fallback_error:
            # Both methods failed, return original error
            return {
                'success': False,
                'content': None,
                'error': f'{original_error_msg} Fallback also failed.',
                'error_type': 'fetch_error',
                'used_fallback': False
            }
    
    def _fetch_server_side(self, url: str) -> str:
        """
        Primary fetch using requests library.
        
        Args:
            url: The URL to fetch
            
        Returns:
            HTML content as string
            
        Raises:
            requests.exceptions.RequestException: For any request-related errors
        """
        response = requests.get(
            url,
            headers=self.headers,
            timeout=self.timeout,
            allow_redirects=True
        )
        response.raise_for_status()
        return response.text
    
    def _fetch_cors_proxy(self, url: str) -> str:
        """
        Fallback fetch using allorigins.win CORS proxy.
        
        Args:
            url: The URL to fetch
            
        Returns:
            HTML content as string
            
        Raises:
            Exception: For any fetch-related errors
        """
        # Use allorigins.win as CORS proxy
        proxy_url = f'https://api.allorigins.win/raw?url={requests.utils.quote(url)}'
        
        response = requests.get(
            proxy_url,
            timeout=self.timeout * 2,  # Allow more time for proxy
            allow_redirects=True
        )
        response.raise_for_status()
        return response.text
    
    def _is_valid_url(self, url: str) -> bool:
        """
        Validate URL format.
        
        Args:
            url: The URL to validate
            
        Returns:
            True if URL is valid HTTP/HTTPS format
        """
        if not url or not isinstance(url, str):
            return False
        
        url = url.strip()
        return url.startswith('http://') or url.startswith('https://')
