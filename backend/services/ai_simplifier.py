"""
AI Simplifier Service

Handles AI text simplification with truncation and API integration.
Truncates content to 2000 words before sending to AI API to prevent token limit errors.

Note: Free-tier APIs (Hugging Face, OpenRouter) may experience
cold-start delays of 10-30 seconds on the first request.
Subsequent requests are typically faster (1-3 seconds).
"""

import os
from typing import Dict, Tuple, Optional
import re
import requests
import time


class AISimplifierService:
    """Handles AI text simplification"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the AI simplifier service.
        
        Args:
            api_key: API key for AI service. If None, loads from environment variable.
        """
        # Load API key from parameter or environment
        if api_key:
            self.api_key = api_key
        else:
            self.api_key = os.getenv('AI_API_KEY')
        
        self.max_words = 2000
        
        # API configuration - defaults to OpenRouter
        self.api_provider = os.getenv('AI_API_PROVIDER', 'openrouter')  # 'openrouter' or 'huggingface'
        self.api_timeout = 60  # 60 seconds to handle cold starts
        
        # OpenRouter configuration
        self.openrouter_url = "https://openrouter.ai/api/v1/chat/completions"
        self.openrouter_model = os.getenv('OPENROUTER_MODEL', 'meta-llama/llama-3.1-8b-instruct:free')
        
        # Hugging Face configuration
        self.huggingface_url = "https://api-inference.huggingface.co/models/"
        self.huggingface_model = os.getenv('HUGGINGFACE_MODEL', 'facebook/bart-large-cnn')
    
    def _truncate_text(self, text: str, max_words: int = None) -> Tuple[str, bool]:
        """
        Truncates text to word limit while preserving paragraph boundaries.
        
        When text has multiple paragraphs and the first paragraph exceeds the 
        word limit, it is included anyway to maintain readability and avoid 
        mid-paragraph truncation. For single-paragraph text, standard word 
        truncation is applied.
        
        Args:
            text: The text to truncate
            max_words: Maximum word count (defaults to self.max_words)
            
        Returns:
            Tuple of (truncated_text, was_truncated)
        """
        if max_words is None:
            max_words = self.max_words
        
        if not text or not isinstance(text, str):
            return ('', False)
        
        # Split text into words using whitespace
        words = text.split()
        
        # Check if truncation is needed
        if len(words) <= max_words:
            return (text, False)
        
        # Find paragraph boundaries to preserve readability
        # Split original text into paragraphs
        paragraphs = re.split(r'\n\s*\n', text)
        
        # If there's only one paragraph, use word-based truncation
        if len(paragraphs) == 1:
            truncated_words = words[:max_words]
            truncated_text = ' '.join(truncated_words)
            return (truncated_text, True)
        
        # Build text paragraph by paragraph until we exceed word limit
        result_paragraphs = []
        word_count = 0
        
        for i, paragraph in enumerate(paragraphs):
            paragraph_words = paragraph.split()
            paragraph_word_count = len(paragraph_words)
            
            # Special case: if this is the first paragraph and it exceeds the limit,
            # include it anyway to avoid mid-paragraph truncation (only for multi-paragraph text)
            if i == 0 and paragraph_word_count > max_words:
                return (paragraph, True)
            
            # If adding this paragraph would exceed limit, stop at previous paragraph
            if word_count + paragraph_word_count > max_words:
                break
            
            result_paragraphs.append(paragraph)
            word_count += paragraph_word_count
        
        # If we found at least one complete paragraph, use that
        if result_paragraphs and word_count > 0:
            return ('\n\n'.join(result_paragraphs), True)
        
        # Edge case: no paragraphs fit (shouldn't happen with first paragraph handling above)
        # Fall back to word-truncated text
        truncated_words = words[:max_words]
        truncated_text = ' '.join(truncated_words)
        return (truncated_text, True)
    
    def _build_prompt(self, text: str, profile: str = 'medium') -> str:
        """
        Creates simplification prompt for AI API based on focus profile.
        
        Args:
            text: The text to simplify
            profile: Focus profile ('light', 'medium', 'aggressive')
            
        Returns:
            Formatted prompt string
        """
        # Base instruction
        base_instruction = "You are a text simplification assistant helping people with ADHD and autism."
        
        # Profile-specific instructions
        if profile == 'light':
            # Light profile: Minimal simplification
            specific_instruction = """
Rewrite the following text with minimal changes:
- Keep most of the original structure
- Simplify only complex sentences
- Use clear, straightforward language
- Preserve important details and nuance
"""
        elif profile == 'aggressive':
            # Aggressive profile: Maximum simplification
            specific_instruction = """
Rewrite the following text with maximum simplification:
- Break everything into very short bullet points (5-10 words each)
- Use only the simplest words possible
- Number all sequential steps
- Remove all unnecessary details and examples
- Focus only on the core message
- Keep it extremely concise
"""
        else:
            # Medium profile (default): Balanced simplification
            specific_instruction = """
Rewrite the following text to make it easier to understand:
- Break paragraphs into short bullet points
- Use simple, plain language
- Number any sequential steps or instructions
- Keep sentences short and clear
- Remove unnecessary details
"""
        
        prompt = f"""{base_instruction}

{specific_instruction}

Original text:
{text}

Simplified version:"""
        
        return prompt

    def _call_api(self, prompt: str, profile: str = 'medium') -> Dict[str, any]:
        """
        Calls AI API (OpenRouter or Hugging Face) for text simplification.
        
        Args:
            prompt: The formatted prompt to send to the API
            profile: Focus profile for adjusting API parameters
            
        Returns:
            Dictionary with:
                - 'success': bool
                - 'text': str (simplified text if successful)
                - 'error': str (error message if failed)
                - 'error_type': str ('missing_key', 'invalid_key', 'rate_limit', 'timeout', 'api_error')
                - 'cold_start': bool (whether this might be a cold start delay)
        """
        # Check if API key exists
        if not self.api_key:
            return {
                'success': False,
                'text': '',
                'error': 'No API key provided. Please enter your own API key to use AI simplification.',
                'error_type': 'missing_key',
                'cold_start': False
            }
        
        try:
            if self.api_provider == 'openrouter':
                return self._call_openrouter(prompt, profile)
            elif self.api_provider == 'huggingface':
                return self._call_huggingface(prompt, profile)
            else:
                return {
                    'success': False,
                    'text': '',
                    'error': f'Unknown API provider: {self.api_provider}',
                    'error_type': 'api_error',
                    'cold_start': False
                }
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'text': '',
                'error': 'AI service timeout. This may be a cold-start delay (10-30s). Please try again.',
                'error_type': 'timeout',
                'cold_start': True
            }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'text': '',
                'error': f'Network error: {str(e)}',
                'error_type': 'api_error',
                'cold_start': False
            }
        except Exception as e:
            return {
                'success': False,
                'text': '',
                'error': f'Unexpected error: {str(e)}',
                'error_type': 'api_error',
                'cold_start': False
            }
    
    def _call_openrouter(self, prompt: str, profile: str = 'medium') -> Dict[str, any]:
        """
        Calls OpenRouter API for text simplification.
        
        Args:
            prompt: The formatted prompt to send
            profile: Focus profile for adjusting parameters
            
        Returns:
            Dictionary with success status, text, and error information
        """
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/focus-mode-accessibility-tool',
            'X-Title': 'Focus Mode Accessibility Tool'
        }
        
        # Adjust max_tokens based on profile
        max_tokens_map = {
            'light': 2500,      # More tokens for detailed output
            'medium': 2000,     # Balanced
            'aggressive': 1500  # Fewer tokens for concise output
        }
        max_tokens = max_tokens_map.get(profile, 2000)
        
        payload = {
            'model': self.openrouter_model,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'temperature': 0.7,
            'max_tokens': max_tokens
        }
        
        start_time = time.time()
        response = requests.post(
            self.openrouter_url,
            headers=headers,
            json=payload,
            timeout=self.api_timeout
        )
        elapsed_time = time.time() - start_time
        
        # Check for authentication errors
        if response.status_code == 401:
            return {
                'success': False,
                'text': '',
                'error': 'Invalid API key. Please check your API key and try again.',
                'error_type': 'invalid_key',
                'cold_start': False
            }
        
        # Check for rate limiting
        if response.status_code == 429:
            return {
                'success': False,
                'text': '',
                'error': 'API rate limit reached. Please wait a few minutes and try again.',
                'error_type': 'rate_limit',
                'cold_start': False
            }
        
        # Check for other errors
        if response.status_code != 200:
            return {
                'success': False,
                'text': '',
                'error': f'API error: {response.status_code} - {response.text}',
                'error_type': 'api_error',
                'cold_start': False
            }
        
        # Parse response
        try:
            data = response.json()
            simplified_text = data['choices'][0]['message']['content'].strip()
            
            # Detect potential cold start (long response time)
            cold_start = elapsed_time > 10
            
            return {
                'success': True,
                'text': simplified_text,
                'error': '',
                'error_type': '',
                'cold_start': cold_start
            }
        except (KeyError, IndexError, ValueError) as e:
            return {
                'success': False,
                'text': '',
                'error': f'Failed to parse API response: {str(e)}',
                'error_type': 'api_error',
                'cold_start': False
            }
    
    def _call_huggingface(self, prompt: str, profile: str = 'medium') -> Dict[str, any]:
        """
        Calls Hugging Face Inference API for text simplification.
        
        Args:
            prompt: The formatted prompt to send
            profile: Focus profile for adjusting parameters
            
        Returns:
            Dictionary with success status, text, and error information
        """
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        # For Hugging Face, we need to extract just the text to simplify
        # The prompt format is different
        text_start = prompt.find("Original text:\n") + len("Original text:\n")
        text_end = prompt.find("\n\nSimplified version:")
        text_to_simplify = prompt[text_start:text_end].strip()
        
        # Adjust parameters based on profile
        max_length_map = {
            'light': 600,       # More length for detailed output
            'medium': 500,      # Balanced
            'aggressive': 300   # Shorter for concise output
        }
        max_length = max_length_map.get(profile, 500)
        
        payload = {
            'inputs': text_to_simplify,
            'parameters': {
                'max_length': max_length,
                'min_length': 50,
                'do_sample': False
            }
        }
        
        url = f"{self.huggingface_url}{self.huggingface_model}"
        
        start_time = time.time()
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=self.api_timeout
        )
        elapsed_time = time.time() - start_time
        
        # Check for authentication errors
        if response.status_code == 401:
            return {
                'success': False,
                'text': '',
                'error': 'Invalid API key. Please check your API key and try again.',
                'error_type': 'invalid_key',
                'cold_start': False
            }
        
        # Check for rate limiting
        if response.status_code == 429:
            return {
                'success': False,
                'text': '',
                'error': 'API rate limit reached. Please wait a few minutes and try again.',
                'error_type': 'rate_limit',
                'cold_start': False
            }
        
        # Check for model loading (503 with estimated_time)
        if response.status_code == 503:
            try:
                error_data = response.json()
                if 'estimated_time' in error_data:
                    return {
                        'success': False,
                        'text': '',
                        'error': f'Model is loading (cold start). Estimated wait: {error_data["estimated_time"]}s. Please try again.',
                        'error_type': 'timeout',
                        'cold_start': True
                    }
            except:
                pass
            
            return {
                'success': False,
                'text': '',
                'error': 'Service temporarily unavailable. This may be a cold-start delay. Please try again.',
                'error_type': 'timeout',
                'cold_start': True
            }
        
        # Check for other errors
        if response.status_code != 200:
            return {
                'success': False,
                'text': '',
                'error': f'API error: {response.status_code} - {response.text}',
                'error_type': 'api_error',
                'cold_start': False
            }
        
        # Parse response
        try:
            data = response.json()
            
            # Hugging Face returns different formats depending on the model
            if isinstance(data, list) and len(data) > 0:
                if isinstance(data[0], dict) and 'summary_text' in data[0]:
                    simplified_text = data[0]['summary_text'].strip()
                elif isinstance(data[0], dict) and 'generated_text' in data[0]:
                    simplified_text = data[0]['generated_text'].strip()
                else:
                    simplified_text = str(data[0]).strip()
            else:
                simplified_text = str(data).strip()
            
            # Detect potential cold start (long response time)
            cold_start = elapsed_time > 10
            
            return {
                'success': True,
                'text': simplified_text,
                'error': '',
                'error_type': '',
                'cold_start': cold_start
            }
        except (KeyError, IndexError, ValueError) as e:
            return {
                'success': False,
                'text': '',
                'error': f'Failed to parse API response: {str(e)}',
                'error_type': 'api_error',
                'cold_start': False
            }
    
    def simplify_text(self, text: str, profile: str = 'medium') -> Dict[str, any]:
        """
        Truncates and simplifies text using AI API with focus profile.
        
        Args:
            text: The text to simplify
            profile: Focus profile ('light', 'medium', 'aggressive')
            
        Returns:
            Dictionary with:
                - 'simplified': str (simplified text)
                - 'truncated': bool (whether text was truncated)
                - 'success': bool (whether simplification succeeded)
                - 'error': str (error message if failed)
                - 'error_type': str (type of error if failed)
                - 'cold_start': bool (whether cold start delay occurred)
        """
        # Adjust max_words based on profile
        max_words_map = {
            'light': 2000,      # Standard truncation
            'medium': 2000,     # Standard truncation
            'aggressive': 1500  # More aggressive truncation
        }
        max_words = max_words_map.get(profile, 2000)
        
        # Truncate text if needed
        truncated_text, was_truncated = self._truncate_text(text, max_words)
        
        # Build prompt with profile
        prompt = self._build_prompt(truncated_text, profile)
        
        # Call API with profile
        api_result = self._call_api(prompt, profile)
        
        # Return combined result
        return {
            'simplified': api_result.get('text', ''),
            'truncated': was_truncated,
            'success': api_result.get('success', False),
            'error': api_result.get('error', ''),
            'error_type': api_result.get('error_type', ''),
            'cold_start': api_result.get('cold_start', False)
        }
