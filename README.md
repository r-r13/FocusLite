# Focus Mode Accessibility Tool
## Project Description
The Focus Mode Accessibility Tool is a web-based application designed to simplify text for people with ADHD and autism. It provides customizable focus profiles (light, medium, aggressive) and uses AI to simplify complex texts into more digestible formats. 

## Features
- **Text Simplification**: Simplifies articles, documents, and web pages for better readability.
- **Focus Profiles**: Choose between light, medium, or aggressive simplification.
- **Content Extraction**: Extracts relevant content from web pages (e.g., news articles, Wikipedia pages).
- **Text-to-Speech (TTS)**: Option to read simplified text aloud with sentence highlighting (optional feature).
- **Accessible Interface**: Fully accessible with ARIA labels, keyboard navigation, and high contrast mode.

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Python (FastAPI)
- **AI Model**: HuggingFace, OpenRouter API for text simplification
- **Libraries**: BeautifulSoup for content extraction

## Setup

### Backend Setup

1. Create a Python virtual environment:
```bash
cd backend
python -m venv venv
```

2. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file from the example:
```bash
copy .env.example .env
```

5. Add your API key to the `.env` file:
```
API_KEY=your_actual_api_key_here
```

6. Run the backend server:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Open `frontend/index.html` in a web browser, or serve it using a local server:
```bash
cd frontend
python -m http.server 8000
```

2. Access the application at `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

Returns the API status.

## License

GNU General Public License v3.0