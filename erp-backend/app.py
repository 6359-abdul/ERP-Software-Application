from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging

# Load environment
load_dotenv()

# Detect environment
IS_RENDER = os.getenv('RENDER') is not None

# Configure logging
if IS_RENDER:
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
else:
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)

# Import extensions
from extensions import db

# Import blueprints (keep all your existing imports)
from routes.auth_routes import bp as auth_bp
from routes.student_routes import bp as student_bp
from routes.fee_master_routes import bp as fee_master_bp
from routes.fee_transaction_routes import bp as fee_transaction_bp
from routes.attendance_routes import bp as attendance_bp
from routes.report_routes import bp as report_bp
from routes.org_routes import bp as org_bp
from routes.academic_routes import bp as academic_bp
from routes.test_type_routes import test_type_bp
from routes.class_test_routes import class_test_bp
from routes.class_test_subject_routes import class_test_subject_bp
from routes.student_test_routes import student_test_bp
from routes.grade_scale_routes import grade_scale_bp
from routes.student_marks_routes import student_marks_bp
from routes.report_card_routes import report_bp as report_card_bp
from routes.test_attendance_routes import test_attendance_bp

def create_app():
    app = Flask(__name__)
    
    # -----------------------------
    # CONFIGURATION
    # -----------------------------
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    
    # Database configuration
    if IS_RENDER:
        # Render PostgreSQL
        database_url = os.environ.get('DATABASE_URL')
        if database_url and database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url
        logger.info(f"Using Render PostgreSQL database")
    else:
        # Local MySQL
        DB_USER = os.getenv("DB_USER", "root")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "")
        DB_HOST = os.getenv("DB_HOST", "localhost")
        DB_PORT = os.getenv("DB_PORT", "3306")
        DB_NAME = os.getenv("DB_NAME", "erp_school")
        
        app.config["SQLALCHEMY_DATABASE_URI"] = (
            f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )
        logger.info(f"Using local MySQL database: {DB_HOST}:{DB_PORT}/{DB_NAME}")
    
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    # -----------------------------
    # CORS CONFIGURATION FOR VERCEL
    # -----------------------------
    if IS_RENDER:
        # Get allowed origins from environment variable
        allowed_origins_str = os.environ.get('ALLOWED_ORIGINS', '')
        if allowed_origins_str:
            allowed_origins = [origin.strip() for origin in allowed_origins_str.split(',')]
        else:
            # Fallback to FRONTEND_URL
            frontend_url = os.environ.get('FRONTEND_URL', '')
            allowed_origins = [frontend_url] if frontend_url else []
        
        logger.info(f"Allowed CORS origins: {allowed_origins}")
        
        CORS(app, resources={
            r"/api/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
                "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
                "expose_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True,
                "max_age": 600
            }
        })
    else:
        # Development - allow all origins
        CORS(app)
        logger.info("Development mode: CORS allows all origins")
    
    # -----------------------------
    # INITIALIZE EXTENSIONS
    # -----------------------------
    db.init_app(app)
    
    # -----------------------------
    # REGISTER BLUEPRINTS
    # -----------------------------
    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(fee_master_bp)
    app.register_blueprint(fee_transaction_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(org_bp)
    app.register_blueprint(academic_bp)
    app.register_blueprint(test_type_bp, url_prefix="/api/test-types")
    app.register_blueprint(class_test_bp, url_prefix="/api/class-tests")
    app.register_blueprint(class_test_subject_bp)
    app.register_blueprint(student_test_bp, url_prefix="/api")
    app.register_blueprint(grade_scale_bp)
    app.register_blueprint(student_marks_bp)
    app.register_blueprint(report_card_bp)
    app.register_blueprint(test_attendance_bp)
    
    # -----------------------------
    # DATABASE INITIALIZATION
    # -----------------------------
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables initialized/verified")
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
    
    # -----------------------------
    # HEALTH CHECK (REQUIRED FOR RENDER)
    # -----------------------------
    @app.route('/api/health')
    def health_check():
        try:
            # Test database connection
            db.session.execute('SELECT 1')
            db_status = 'connected'
        except Exception as e:
            db_status = f'error: {str(e)}'
        
        return jsonify({
            "status": "healthy",
            "service": "school-erp-backend",
            "environment": "production" if IS_RENDER else "development",
            "database": db_status,
            "frontend_url": os.environ.get('FRONTEND_URL', 'Not set'),
            "timestamp": os.getenv('RENDER_TIMESTAMP', 'N/A')
        }), 200
    
    # -----------------------------
    # CORS PREFLIGHT HANDLER
    # -----------------------------
    @app.route('/api/<path:path>', methods=['OPTIONS'])
    def handle_options(path):
        return '', 200
    
    # -----------------------------
    # ENVIRONMENT INFO
    # -----------------------------
    @app.route('/api/env')
    def env_info():
        return jsonify({
            "backend": "render" if IS_RENDER else "local",
            "frontend": os.environ.get('FRONTEND_URL', 'Not set'),
            "allowed_origins": os.environ.get('ALLOWED_ORIGINS', 'Not set'),
            "database": "postgresql" if IS_RENDER else "mysql"
        }), 200
    
    # -----------------------------
    # SERVE UPLOADS
    # -----------------------------
    @app.route('/uploads/<path:filename>')
    def serve_uploads(filename):
        if '..' in filename or filename.startswith('/'):
            return jsonify({"error": "Invalid file path"}), 400
        
        uploads_dir = os.path.join(app.root_path, 'uploads')
        return send_from_directory(uploads_dir, filename)
    
    # -----------------------------
    # ROOT ENDPOINT
    # -----------------------------
    @app.route('/')
    def root():
        return jsonify({
            "message": "School ERP System Backend API",
            "version": "1.0.0",
            "environment": "production" if IS_RENDER else "development",
            "frontend": os.environ.get('FRONTEND_URL', 'Not configured'),
            "endpoints": {
                "health": "/api/health",
                "environment": "/api/env",
                "auth": "/api/auth/*",
                "students": "/api/students/*",
                "uploads": "/uploads/*"
            },
            "documentation": "https://github.com/your-repo/docs"
        })
    
    # -----------------------------
    # NOT FOUND HANDLER
    # -----------------------------
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Not Found",
            "message": "The requested endpoint does not exist",
            "endpoints": {
                "api": "/api/*",
                "health": "/api/health"
            }
        }), 404
    
    # -----------------------------
    # ERROR HANDLER
    # -----------------------------
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({
            "error": "Internal Server Error",
            "message": "Something went wrong on our end"
        }), 500
    
    logger.info(f"Application initialized in {'production' if IS_RENDER else 'development'} mode")
    return app

# Create app instance
app = create_app()

# -----------------------------
# LOCAL DEVELOPMENT RUNNER
# -----------------------------
if __name__ == "__main__":
    if not IS_RENDER:
        port = int(os.getenv("PORT", 5000))
        debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
        logger.info(f"Starting development server on http://localhost:{port}")
        app.run(host="0.0.0.0", port=port, debug=debug)
    else:
        logger.info("Production mode - using WSGI server")