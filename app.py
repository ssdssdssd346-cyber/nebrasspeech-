import os
from flask import Flask, render_template
from database import db
from auth import auth_bp

app = Flask(__name__, static_folder="static", static_url_path="/")

# قاعدة البيانات من Railway
database_url = os.environ.get("MYSQL_URL", "")
if database_url.startswith("mysql://"):
    database_url = database_url.replace("mysql://", "mysql+pymysql://", 1)

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
