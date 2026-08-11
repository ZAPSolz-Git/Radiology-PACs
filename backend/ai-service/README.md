# AI Study Integrity Service

Modular Python microservice for pixel-level quality validation of medical imaging.

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the service:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

## Modular Components
- **Blur Detector**: Analyzes edge sharpness using Laplacian Variance.
- **Contrast Analyzer**: Analyzes Hounsfield Units (HU) to detect enhancement phase errors.

## Integration
This service receives tasks from the Node.js backend and reports results back via webhooks.
