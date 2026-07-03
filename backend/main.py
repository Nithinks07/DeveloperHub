from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.auth import limiter, router as auth_router
from app.api.organizations import router as organizations_router
from app.api.repositories import router as repositories_router
from app.api.projects import router as projects_router
from app.api.tasks import router as tasks_router
from app.api.issues import router as issues_router
from app.api.pull_requests import router as pull_requests_router

app = FastAPI(title="DeveloperHub API")

# ---------------------------------------------------------------------------
# Rate-limiting (slowapi)
# ---------------------------------------------------------------------------
# 1. Attach the shared Limiter instance as app.state.limiter so that slowapi
#    can resolve it from inside route decorators.
# 2. Register the 429 exception handler so rate-limit violations return a
#    well-formed JSON response instead of a 500.
# 3. Add SlowAPIMiddleware to intercept requests before they reach the routes.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(organizations_router)
app.include_router(repositories_router)
app.include_router(projects_router)
app.include_router(tasks_router)
app.include_router(issues_router)
app.include_router(pull_requests_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
