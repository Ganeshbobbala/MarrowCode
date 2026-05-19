from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import review
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("marroecode-api")

app = FastAPI(
    title="MarroeCode API",
    description="A full-stack AI-powered application that performs static analysis and ML-based code reviews.",
    version="1.0.0"
)

# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"Method: {request.method} Path: {request.url.path} Status: {response.status_code} Duration: {duration:.2f}s")
    return response

# CORS configured for localhost React/Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Serve static files from the React dist folder
frontend_dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

app.include_router(review.router, prefix="/api")

# Mount assets directory for styles/scripts if it exists
assets_path = os.path.join(frontend_dist_path, "assets")
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
else:
    logger.warning(f"Static assets directory not found at {assets_path}. Skipping mount.")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # If the path starts with api/, we should have let the router handle it
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail=f"API route not found: /{full_path}")
    
    # Check if file exists in dist (for icons, favicon, etc)
    file_path = os.path.join(frontend_dist_path, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
        
    # Return index.html for all other routes to support client-side routing
    index_path = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {"message": "MarroeCode API is running. Frontend build not detected."}

if __name__ == "__main__":
    import uvicorn
    # Default to 127.0.0.1 for local dev to avoid IPv6 issues on some Windows setups
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
