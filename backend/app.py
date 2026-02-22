from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
from services.content_fetcher import ContentFetcherService
from services.content_extractor import ContentExtractorService
from services.ai_simplifier import AISimplifierService

load_dotenv()

app = Flask(__name__)

# Enable CORS for frontend-backend communication
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:*", "http://127.0.0.1:*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Configure secure server-side logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Error messages mapping
ERROR_MESSAGES = {
    'fetch_error': 'Unable to fetch the webpage. Please check the URL and try again.',
    'timeout': 'Request timed out. The server took too long to respond.',
    'connection_error': 'Connection failed. Unable to reach the server. Please check your internet connection.',
    'http_error': 'The server returned an error response. The page may not be accessible.',
    'invalid_url': 'Please enter a valid URL starting with http:// or https://',
    'extraction_error': 'Could not extract content. This page may be JavaScript-heavy or behind a paywall.',
    'extraction_dynamic': 'This page uses dynamic JavaScript rendering. Try a static article page instead.',
    'extraction_paywall': 'This page appears to be behind a paywall or requires login.',
    'extraction_empty': 'Could not extract meaningful content from this page.',
    'missing_key': 'Please provide your own API key to use AI simplification. You can enter it in the form below or add it to your .env file.',
    'invalid_key': 'Invalid API key. Please check your API key and try again.',
    'rate_limit': 'API rate limit reached. Please wait a few minutes and try again.',
    'timeout_ai': 'AI service is taking longer than expected. This may be a cold-start delay (10-30s). Please wait...',
    'ai_error': 'AI simplification failed. Displaying original content instead.',
    'invalid_request': 'Invalid request. Please provide a valid URL.',
    'server_error': 'An unexpected server error occurred. Please try again later.'
}

@app.route('/', methods=['GET'])
def index():
    """Root endpoint - API information"""
    return jsonify({
        'name': 'Focus Mode Accessibility Tool API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'health': '/health',
            'simplify': '/api/simplify (POST)'
        },
        'description': 'Backend API for transforming cluttered webpages into simplified, distraction-free views',
        'frontend': 'Open frontend/index.html to use the application'
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the API is running"""
    return jsonify({
        'status': 'healthy',
        'message': 'Focus Mode Accessibility Tool API is running'
    }), 200

@app.route('/api/simplify', methods=['POST'])
def simplify_content():
    """
    POST /api/simplify endpoint
    
    Orchestrates: fetch → extract → truncate → simplify
    
    Request body:
        {
            "url": "https://example.com/article",
            "api_key": "optional-user-provided-key"
        }
    
    Response:
        Success:
        {
            "success": true,
            "original_text": "Full extracted content...",
            "simplified_text": "• Simplified bullet points...",
            "title": "Article Title",
            "truncated": false,
            "cold_start_warning": true
        }
        
        Error:
        {
            "success": false,
            "error": "Error message",
            "error_type": "fetch_error|extraction_error|ai_error|missing_api_key"
        }
    """
    client_ip = request.remote_addr
    
    try:
        # Parse request body
        data = request.get_json(silent=True)
        
        if not data:
            logger.warning(f"Invalid request from {client_ip}: No JSON body provided")
            return jsonify({
                'success': False,
                'error': ERROR_MESSAGES['invalid_request'],
                'error_type': 'invalid_request'
            }), 400
        
        url = data.get('url')
        user_api_key = data.get('api_key')
        profile = data.get('profile', 'medium')  # Default to medium profile
        
        # Validate profile
        valid_profiles = ['light', 'medium', 'aggressive']
        if profile not in valid_profiles:
            profile = 'medium'
        
        # Validate URL
        if not url:
            logger.warning(f"Invalid request from {client_ip}: No URL provided")
            return jsonify({
                'success': False,
                'error': ERROR_MESSAGES['invalid_request'],
                'error_type': 'invalid_request'
            }), 400
        
        logger.info(f"Processing request from {client_ip} for URL: {url[:100]}")  # Truncate URL for logging
        
        # Step 1: Fetch content
        fetcher = ContentFetcherService()
        fetch_result = fetcher.fetch_content(url)
        
        if not fetch_result['success']:
            error_type = fetch_result.get('error_type', 'fetch_error')
            error_message = fetch_result.get('error', ERROR_MESSAGES.get(error_type, ERROR_MESSAGES['fetch_error']))
            
            # Secure logging: log error without sensitive data
            logger.error(
                f"Fetch failed for URL from {client_ip}: {error_type}",
                extra={
                    'error_type': error_type,
                    'client_ip': client_ip,
                    'used_fallback': fetch_result.get('used_fallback', False)
                }
            )
            
            return jsonify({
                'success': False,
                'error': error_message,
                'error_type': error_type
            }), 400
        
        logger.info(f"Successfully fetched content from {client_ip} (fallback: {fetch_result.get('used_fallback', False)})")
        
        # Step 2: Extract main content
        extractor = ContentExtractorService()
        extract_result = extractor.extract_main_content(fetch_result['content'])
        
        if not extract_result['success']:
            page_type = extract_result.get('page_type', 'unknown')
            error_message = extract_result.get('error', ERROR_MESSAGES['extraction_error'])
            
            # Secure logging: log error without content
            logger.error(
                f"Extraction failed for URL from {client_ip}: page_type={page_type}",
                extra={
                    'error_type': 'extraction_error',
                    'page_type': page_type,
                    'client_ip': client_ip
                }
            )
            
            return jsonify({
                'success': False,
                'error': error_message,
                'error_type': 'extraction_error',
                'page_type': page_type
            }), 400
        
        original_text = extract_result['text']
        title = extract_result['title']
        
        logger.info(f"Successfully extracted content from {client_ip} (title: {title[:50] if title else 'N/A'})")
        
        # Step 3: Simplify with AI (truncate happens inside simplify_text)
        # Use user-provided API key if available, otherwise use environment variable
        simplifier = AISimplifierService(api_key=user_api_key)
        simplify_result = simplifier.simplify_text(original_text, profile)
        
        if not simplify_result['success']:
            error_type = simplify_result.get('error_type', 'ai_error')
            error_message = simplify_result.get('error', ERROR_MESSAGES.get(error_type, ERROR_MESSAGES['ai_error']))
            
            # Secure logging: log error without API key or content
            logger.error(
                f"AI simplification failed for request from {client_ip}: {error_type}",
                extra={
                    'error_type': error_type,
                    'client_ip': client_ip,
                    'cold_start': simplify_result.get('cold_start', False)
                }
            )
            
            # For AI errors, return original content with error notification
            if error_type == 'missing_key':
                # No API key - return error without original content
                return jsonify({
                    'success': False,
                    'error': error_message,
                    'error_type': error_type
                }), 400
            else:
                # Other AI errors - gracefully degrade by returning original content
                logger.info(f"Gracefully degrading to original content for {client_ip}")
                return jsonify({
                    'success': True,
                    'original_text': original_text,
                    'simplified_text': original_text,  # Fallback to original
                    'title': title,
                    'truncated': False,
                    'cold_start_warning': simplify_result.get('cold_start', False),
                    'ai_error': error_message,  # Include error notification
                    'error_type': error_type
                }), 200
        
        logger.info(
            f"Successfully simplified content for {client_ip} (truncated: {simplify_result['truncated']}, cold_start: {simplify_result.get('cold_start', False)})"
        )
        
        # Step 4: Return successful response
        return jsonify({
            'success': True,
            'original_text': original_text,
            'simplified_text': simplify_result['simplified'],
            'title': title,
            'truncated': simplify_result['truncated'],
            'cold_start_warning': simplify_result.get('cold_start', False)
        }), 200
    
    except Exception as e:
        # Catch-all for unexpected errors
        # Secure logging: log full error server-side, return generic message to client
        logger.exception(
            f"Unexpected server error for request from {client_ip}",
            extra={
                'error_type': 'server_error',
                'client_ip': client_ip
            }
        )
        
        return jsonify({
            'success': False,
            'error': ERROR_MESSAGES['server_error'],
            'error_type': 'server_error'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
