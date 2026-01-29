
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache

db = SQLAlchemy()

# Limiter: we initialize with no app here; app.py will call limiter.init_app(app)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[]  # no global default; use @limiter.limit on specific routes if needed
)

# Cache: same pattern; app.py configures CACHE_TYPE and init_app
cache = Cache()

