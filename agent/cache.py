"""
agent/cache.py — Lightweight disk-based cache for chain reads and Groq LLM calls.

Uses `diskcache` (SQLite + file system) — no Redis server required.
Cache lives at agent/.cache/ and persists between runs.

Usage:
    from cache import chain_cache, groq_cache, cached

    # Short TTL for chain state (positions change every block)
    @cached(chain_cache, ttl=30, key="get_all_positions")
    def expensive_chain_read():
        ...

    # Longer TTL for LLM calls (OFAC news doesn't change every 30s)
    @cached(groq_cache, ttl=300, key="ofac_search_latest")
    def ofac_search():
        ...
"""
import functools
import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Any, Callable, Optional

log = logging.getLogger(__name__)

# ── Cache directories ─────────────────────────────────────────────────────────

_CACHE_ROOT = Path(__file__).parent / ".cache"

try:
    import importlib
    diskcache = importlib.import_module("diskcache")

    # Chain reads: small TTL — positions change with every block
    chain_cache = diskcache.Cache(
        str(_CACHE_ROOT / "chain"),
        size_limit=50 * 1024 * 1024,   # 50 MB max
        disk_min_file_size=0,
    )

    # Groq / LLM calls: longer TTL — OFAC news and LLM analysis are slower-changing
    groq_cache = diskcache.Cache(
        str(_CACHE_ROOT / "groq"),
        size_limit=25 * 1024 * 1024,   # 25 MB max
        disk_min_file_size=0,
    )

    _CACHE_AVAILABLE = True
    log.debug("diskcache initialized at %s", _CACHE_ROOT)

except (ImportError, ModuleNotFoundError):
    # Graceful fallback: diskcache not installed → use a plain dict (in-memory, non-persistent)
    log.warning("diskcache not installed — using in-memory fallback. Run: pip install diskcache")

    class _MemCache:
        """Minimal in-memory dict cache that mimics the diskcache API we use."""
        def __init__(self):
            self._store: dict = {}

        def get(self, key: str, default=None):
            entry = self._store.get(key)
            if entry is None:
                return default
            import time
            if entry["expires"] and time.time() > entry["expires"]:
                del self._store[key]
                return default
            return entry["value"]

        def set(self, key: str, value: Any, expire: Optional[int] = None):
            import time
            self._store[key] = {
                "value": value,
                "expires": (time.time() + expire) if expire else None,
            }

        def clear(self):
            self._store.clear()

        def close(self):
            pass

    chain_cache = _MemCache()    # type: ignore[assignment]
    groq_cache  = _MemCache()    # type: ignore[assignment]
    _CACHE_AVAILABLE = False


# ── Cache decorator ───────────────────────────────────────────────────────────

def cached(cache, ttl: int, key: str):
    """
    Decorator that caches the return value of a zero-arg callable.

    Args:
        cache:  diskcache.Cache or _MemCache instance
        ttl:    seconds until the cached value expires
        key:    explicit cache key string (must be unique per function)

    Only caches successful (non-error) results — if the function raises
    or returns a dict with "error", the result is NOT cached.
    """
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            # Build a deterministic cache key including any arguments
            if args or kwargs:
                arg_hash = hashlib.md5(
                    json.dumps([str(a) for a in args] + sorted(f"{k}={v}" for k, v in kwargs.items()))
                    .encode()
                ).hexdigest()[:8]
                cache_key = f"{key}:{arg_hash}"
            else:
                cache_key = key

            cached_val = cache.get(cache_key)
            if cached_val is not None:
                log.debug("cache HIT  %s", cache_key)
                return cached_val

            log.debug("cache MISS %s", cache_key)
            result = fn(*args, **kwargs)

            # Don't cache error results
            try:
                parsed = json.loads(result) if isinstance(result, str) else result
                if isinstance(parsed, dict) and "error" in parsed:
                    log.debug("cache SKIP (error result) %s", cache_key)
                    return result
            except Exception:
                pass

            cache.set(cache_key, result, expire=ttl)
            return result
        return wrapper
    return decorator


# ── Manual helpers ────────────────────────────────────────────────────────────

def invalidate_chain_cache():
    """Call this after a state-changing transaction (e.g. triggerViolation)."""
    chain_cache.clear()
    log.info("chain cache cleared")


def cache_stats() -> dict:
    """Return stats for logging/monitoring."""
    stats: dict = {"available": _CACHE_AVAILABLE}
    if _CACHE_AVAILABLE:
        try:
            stats["chain_size"] = len(chain_cache)   # type: ignore[arg-type]
            stats["groq_size"]  = len(groq_cache)    # type: ignore[arg-type]
        except Exception:
            pass
    return stats
