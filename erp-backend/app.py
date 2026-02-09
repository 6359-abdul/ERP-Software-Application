from flask import Flask, request, jsonify, send_from_directory # Force Reload
from flask_cors import CORS
from dotenv import load_dotenv
import os

# -----------------------------
# EXTENSIONS
# -----------------------------
from extensions import db

# -----------------------------
# BLUEPRINTS
# -----------------------------
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

 


# -----------------------------
# LOAD ENV
# -----------------------------
# Load .env from the same directory as app.py
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, ".env"))


def create_app():
    app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")

    # -----------------------------
    # CONFIG
    # -----------------------------
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT")
    DB_NAME = os.getenv("DB_NAME")

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # -----------------------------
    # INIT EXTENSIONS
    # -----------------------------
    # Allow specific origins with credentials
    CORS(app, resources={
        r"/*": {
            "origins": [
                r"https://.*\.vercel\.app",
                "http://localhost:5173",
                "http://localhost:3000",
                "http://43.205.112.158",
            
            ],
            "supports_credentials": True,
            "allow_headers": ["Content-Type", "Authorization", "X-Branch", "X-Location", "X-Academic-Year", "X-Requested-With"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        }
    })
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
    # SERVE UPLOADS
    # -----------------------------
    @app.route('/uploads/<path:filename>')
    def serve_uploads(filename):
        return send_from_directory(os.path.join(app.root_path, 'uploads'), filename)

    # -----------------------------
    # FAVICON FIX
    # -----------------------------
    @app.route('/favicon.ico')
    def favicon():
        return '', 204

    # -----------------------------
    # SERVE FRONTEND (PRODUCTION)
    # -----------------------------
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path):
        if path.startswith("api/"):
            return jsonify({"error": "Not Found"}), 404

        file_path = os.path.join(app.static_folder, path)
        if path and os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")

    return app


if __name__ == "__main__":
    app = create_app()

    # 🔴 RUN ONCE IF TABLES NOT CREATED (DEV ONLY)
    # from extensions import db
    # with app.app_context():
    #     db.create_all()

    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
