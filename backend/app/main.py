from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router
from .api.auth_routes import router as auth_router
from .api.drawer_routes import router as drawer_router
from .api.ai_routes import router as ai_router
from .api.admin_routes import router as admin_router
from .api.store_routes import router as store_router

app = FastAPI(
    title="Daiso 3D Drawer Fitter API",
    description="비공식 다이소 서랍 정리 3D 피터 백엔드 API (상품 목록, 치수 파서, 2D/3D 패킹 최적화 엔진, 서버리스/클라우드 호환 REST API)",
    version="0.3.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(router)
app.include_router(auth_router, prefix="/api")
app.include_router(drawer_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(store_router, prefix="/api")
app.include_router(ai_router)

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
