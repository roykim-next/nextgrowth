from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import os
import sys
import json
import traceback
import socket
# Set default socket timeout to 30 seconds
socket.setdefaulttimeout(30)

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "super_secret_key_for_demo_only")

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
IS_VERCEL = os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV")
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)

print(f"USE_SUPABASE: {USE_SUPABASE}, IS_VERCEL: {IS_VERCEL}", flush=True)

# SQLite setup for local development only
DB_NAME = None
if not USE_SUPABASE and not IS_VERCEL:
    DB_NAME = "users.db"
    print("Using SQLite for local development", flush=True)

# Configure retry strategy for requests
retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["HEAD", "GET", "OPTIONS", "POST", "PATCH", "DELETE"]
)
adapter = HTTPAdapter(max_retries=retry_strategy)
http = requests.Session()
http.mount("https://", adapter)
http.mount("http://", adapter)

def supabase_request(method, table, params=None, data=None, filters=None):
    """Make a direct HTTP request to Supabase PostgREST API using requests with retries."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    
    # Build query parameters
    query_params = {}
    if filters:
        query_params.update(filters)
    # If raw params string is provided, we need to handle it manually or parse it
    # For simplicity, we'll try to keep params as dict in future refactoring, 
    # but for compatibility with previous code, let's handle string params.
    # Note: requests params argument expects a dict or bytes.
    # We will append string params to URL if necessary.
    
    full_url = url
    if params:
        full_url += "?" + params
    elif filters:
        # Convert filters to query string if provided as dict
        filter_parts = [f"{k}={v}" for k, v in filters.items()]
        if filter_parts:
            full_url += "?" + "&".join(filter_parts)
            
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    
    if method == "GET":
        headers["Accept"] = "application/json"
    elif method in ("POST", "PATCH", "DELETE"):
        headers["Prefer"] = "return=representation"
    
    try:
        response = http.request(method, full_url, json=data, headers=headers, timeout=10)
        response.raise_for_status()
        if response.text:
            return response.json()
        return []
    except requests.exceptions.RequestException as e:
        print(f"Supabase Request Error: {e}", flush=True)
        # Log response text if available for debugging
        if hasattr(e, 'response') and e.response:
            print(f"Response Content: {e.response.text}", flush=True)
        raise Exception(f"Supabase connection error: {str(e)}")


def get_db():
    if USE_SUPABASE:
        return None
    if IS_VERCEL:
        raise RuntimeError("Database not available on Vercel without Supabase")
    import sqlite3
    conn = sqlite3.connect(DB_NAME, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn

def verify_password(stored_password, input_password):
    try:
        if check_password_hash(stored_password, input_password):
            return True
    except Exception:
        pass
    return stored_password == input_password

def is_user_admin(user):
    if "is_admin" in user:
        return bool(user["is_admin"])
    if "role" in user:
        return user["role"] == "admin"
    return False

def is_user_approved(user):
    if "is_approved" in user:
        return bool(user["is_approved"])
    if "status" in user:
        return user["status"] == "active"
    return False

@app.route("/debug-env")
def debug_env():
    return jsonify({
        "SUPABASE_URL_present": bool(SUPABASE_URL),
        "SUPABASE_KEY_present": bool(SUPABASE_KEY),
        "VERCEL_present": bool(os.environ.get("VERCEL")),
        "VERCEL_ENV": os.environ.get("VERCEL_ENV", "not set"),
        "USE_SUPABASE": USE_SUPABASE,
        "IS_VERCEL": bool(IS_VERCEL),
        "python_version": sys.version,
        "method": "requests (with socket timeout=30)",
    })

@app.route("/debug-test-query")
def debug_test_query():
    try:
        if not USE_SUPABASE:
            return jsonify({"error": "Supabase not configured"})
        # Using raw params string for compatibility with existing structure
        result = supabase_request("GET", "users", params="select=email&limit=1")
        return jsonify({
            "success": True,
            "method": "requests",
            "data_count": len(result) if result else 0,
            "first_email": result[0]["email"] if result else None
        })
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()})

@app.route("/")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("login"))
    try:
        if USE_SUPABASE:
            users = supabase_request("GET", "users", params=f"select=*&id=eq.{session['user_id']}")
            if not users:
                session.clear()
                return redirect(url_for("login"))
            user = users[0]
        else:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],))
            user_row = cursor.fetchone()
            conn.close()
            if not user_row:
                session.clear()
                return redirect(url_for("login"))
            user = dict(user_row)
        if is_user_approved(user):
            return render_template("dashboard.html", user=user)
        else:
            return render_template("pending.html")
    except Exception as e:
        print(f"Dashboard error: {e}", flush=True)
        traceback.print_exc()
        return render_template("login.html", error="Database connection error")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        print(f"LOGIN: email={email}, USE_SUPABASE={USE_SUPABASE}", flush=True)
        try:
            if USE_SUPABASE:
                print("LOGIN: Querying Supabase via requests...", flush=True)
                from urllib.parse import quote
                users = supabase_request("GET", "users", params=f"select=*&email=eq.{quote(email)}")
                print(f"LOGIN: Got {len(users) if users else 0} results", flush=True)
                user = users[0] if users else None
            else:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
                user_row = cursor.fetchone()
                conn.close()
                user = dict(user_row) if user_row else None
            if user:
                if verify_password(user["password"], password):
                    session["user_id"] = user["id"]
                    session["email"] = user["email"]
                    session["is_admin"] = is_user_admin(user)
                    return redirect(url_for("dashboard"))
                else:
                    flash("Invalid email or password", "error")
            else:
                flash("Invalid email or password", "error")
        except Exception as e:
            print(f"LOGIN ERROR: {e}", flush=True)
            traceback.print_exc()
            flash(f"Login error: {str(e)}", "error")
    return render_template("login.html")

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        hashed_pw = generate_password_hash(password, method="pbkdf2:sha256")
        try:
            auto_approve = email.endswith("@nextsecurities.com")
            if USE_SUPABASE:
                from urllib.parse import quote
                existing = supabase_request("GET", "users", params=f"select=email&email=eq.{quote(email)}")
                if existing:
                    flash("Email already registered.", "error")
                    return render_template("signup.html")
                status = "active" if auto_approve else "pending"
                supabase_request("POST", "users", data={"email": email, "password": hashed_pw, "role": "user", "status": status})
            else:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("SELECT email FROM users WHERE email = ?", (email,))
                if cursor.fetchone():
                    conn.close()
                    flash("Email already registered.", "error")
                    return render_template("signup.html")
                cursor.execute("INSERT INTO users (email, password, is_admin, is_approved) VALUES (?, ?, ?, ?)", (email, hashed_pw, False, auto_approve))
                conn.commit()
                conn.close()
            if auto_approve:
                flash("Account created! You can now log in.", "success")
            else:
                flash("Account created! Please wait for admin approval.", "success")
            return redirect(url_for("login"))
        except Exception as e:
            print(f"SIGNUP ERROR: {e}", flush=True)
            traceback.print_exc()
            flash(f"Signup error: {str(e)}", "error")
    return render_template("signup.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/admin")
def admin_panel():
    if "user_id" not in session or not session.get("is_admin"):
        return redirect(url_for("dashboard"))
    try:
        if USE_SUPABASE:
            pending_users = supabase_request("GET", "users", params="select=*&status=eq.pending")
            approved_users = supabase_request("GET", "users", params="select=*&status=eq.active&role=neq.admin")
        else:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE is_approved = ?", (False,))
            pending_users = [dict(row) for row in cursor.fetchall()]
            cursor.execute("SELECT * FROM users WHERE is_approved = ? AND is_admin = ?", (True, False))
            approved_users = [dict(row) for row in cursor.fetchall()]
            conn.close()
        return render_template("admin.html", pending_users=pending_users, approved_users=approved_users)
    except Exception as e:
        flash(f"Error loading admin panel: {e}", "error")
        return redirect(url_for("dashboard"))

@app.route("/approve/<user_id>")
def approve_user(user_id):
    if "user_id" not in session or not session.get("is_admin"):
        return redirect(url_for("dashboard"))
    try:
        if USE_SUPABASE:
            supabase_request("PATCH", "users", params=f"id=eq.{user_id}", data={"status": "active"})
        else:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET is_approved = ? WHERE id = ?", (True, user_id))
            conn.commit()
            conn.close()
        flash("User approved.", "success")
    except Exception as e:
        flash(f"Error approving user: {e}", "error")
    return redirect(url_for("admin_panel"))

@app.route("/reject/<user_id>")
def reject_user(user_id):
    if "user_id" not in session or not session.get("is_admin"):
        return redirect(url_for("dashboard"))
    try:
        if USE_SUPABASE:
            supabase_request("DELETE", "users", params=f"id=eq.{user_id}")
        else:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            conn.close()
        flash("User rejected/deleted.", "success")
    except Exception as e:
        flash(f"Error rejecting user: {e}", "error")
    return redirect(url_for("admin_panel"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8085, debug=True)
