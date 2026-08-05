from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
import os
from datetime import datetime
from zoneinfo import ZoneInfo

# Database
db = SQLAlchemy()

# Rate limiter (no app yet; init in app.create_app)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per hour"]  # broad safety net; stricter limits still belong on sensitive routes
)

# Cache (init in app.create_app)
cache = Cache()

def get_now():
    """Get current datetime in Indian Standard Time (Asia/Kolkata) for database storage."""
    tz_name = os.environ.get("APP_TIMEZONE", "Asia/Kolkata").strip("'\"")
    return datetime.now(ZoneInfo(tz_name))


def get_today():
    """Get current date in the configured APP_TIMEZONE."""
    return get_now().date()

def to_local_time(dt):
    """Convert a datetime (usually from DB) to the configured local timezone."""
    if dt is None:
        return None
    tz_name = os.environ.get("APP_TIMEZONE", "Asia/Kolkata").strip("'\"")
    tz = ZoneInfo(tz_name)
    if dt.tzinfo is None:
        # If DB returns unaware datetime, we assume it's stored in local time (Asia/Kolkata)
        dt = dt.replace(tzinfo=tz)
    return dt.astimezone(tz)
