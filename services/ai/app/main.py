from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.providers import ProviderNotConfiguredError
from app.routers import decks, embeddings, health, match, profile


def create_app() -> FastAPI:
    app = FastAPI(
        title="Mulaqat AI",
        description="Matching, personality profiling, embeddings, RAG deck generation, evals.",
        version="0.1.0",
    )

    app.include_router(health.router)
    app.include_router(embeddings.router)
    app.include_router(decks.router)
    app.include_router(profile.router)
    app.include_router(match.router)

    @app.exception_handler(ProviderNotConfiguredError)
    async def provider_not_configured(
        _request: Request, exc: ProviderNotConfiguredError
    ) -> JSONResponse:
        # Clear 503, never a crash — the stack must boot with no models set (§4).
        return JSONResponse(status_code=503, content={"error": exc.detail})

    return app


app = create_app()
