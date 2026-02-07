from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache

# Database
db = SQLAlchemy()

# Rate limiter (no app yet; init in app.create_app)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[]  # define per-route limits with @limiter.limit
)

# Cache (init in app.create_app)
cache = Cache()