import uvicorn
from views.model_api_routes import app

if __name__ == "__main__":
    uvicorn.run(
        "views.model_api_routes:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 