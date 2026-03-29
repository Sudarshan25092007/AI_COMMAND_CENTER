# FastAPI Backend

This is a minimal FastAPI backend project.

## Requirements

Requires Python 3.11+.

## Setup & Running

1. **Install dependencies:**
   Navigate into the `backend` directory and run:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server:**
   Start the FastAPI app using Uvicorn:
   ```bash
   uvicorn main:app --reload
   ```

The server will start on `http://127.0.0.1:8000`.

## Endpoints

*   `GET /health`: Health check endpoint returning `{"status": "ok"}`.
