import os
from flask import Flask, render_template
from database import db
from auth import auth_bp

app = Flask(__name__, static_folder="static", static_url_path="/")

# بناء الـ URL من المتغيرات المنفردة
MYSQL_HOST = os.environ.get("MYSQLHOST", "localhost")
MYSQL_PORT = os.environ.get("MYSQLPORT", "3306")
MYSQL_USER = os.environ.get("MYSQLUSER", "root")
MYSQL_PASSWORD = os.environ.get("MYSQLPASSWORD", "")
MYSQL_DATABASE = os.environ.get("MYSQLDATABASE", "railway")

database_url = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-key")

db.init_app(app)

# ينشئ الجداول تلقائياً
with app.app_context():
    db.create_all()

app.register_blueprint(auth_bp)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/register")
def register_page():
    return render_template("register.html")

@app.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")

@app.route("/upload")
def upload_page():
    return render_template("upload.html")

@app.route("/sessions")
def sessions_page():
    return render_template("sessions.html")

@app.route("/live")
def live_page():
    return render_template("live.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
