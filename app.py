from flask import Flask, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
import os
import sqlite3
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "super_secret_key_for_demo_only")

# Use Supabase for Vercel, SQLite for local
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
USE_SUPABASE = url and key

if USE_SUPABASE:
    from supabase import create_client, Client
    supabase: Client = create_client(url, key)
    print("Using Supabase for database")
else:
    supabase = None
    DB_NAME = "users.db"
    print("Using SQLite for database")

def get_db():
    """Get SQLite database connection"""
    if USE_SUPABASE:
        return None
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    try:
        if USE_SUPABASE:
            response = supabase.table('users').select("*").eq('id', session['user_id']).execute()
            if not response.data:
                session.clear()
                return redirect(url_for('login'))
            user = response.data[0]
        else:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],))
            user_row = cursor.fetchone()
            conn.close()
            
            if not user_row:
                session.clear()
                return redirect(url_for('login'))
            user = dict(user_row)
        
        if user['is_approved']:
            return render_template('dashboard.html', user=user)
        else:
            return render_template('pending.html')
            
    except Exception as e:
        print(f"Error fetching user: {e}")
        return render_template('login.html', error="Database connection error")

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        
        try:
            if USE_SUPABASE:
                response = supabase.table('users').select("*").eq('email', email).execute()
                if response.data:
                    user = response.data[0]
                else:
                    user = None
            else:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
                user_row = cursor.fetchone()
                conn.close()
                user = dict(user_row) if user_row else None
            
            if user:
                if check_password_hash(user['password'], password):
                    session['user_id'] = user['id']
                    session['email'] = user['email']
                    session['is_admin'] = bool(user['is_admin'])
                    return redirect(url_for('dashboard'))
                else:
                    flash('Invalid email or password', 'error')
            else:
                flash('Invalid email or password', 'error')
                 
        except Exception as e:
            flash(f'Login error: {str(e)}', 'error')
            
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        hashed_pw = generate_password_hash(password, method='pbkdf2:sha256')
        
        try:
            if USE_SUPABASE:
                # Check if email exists
                check = supabase.table('users').select("email").eq('email', email).execute()
                if check.data:
                    flash('Email already registered.', 'error')
                    return render_template('signup.html')

                # Insert new user
                data = {
                    "email": email, 
                    "password": hashed_pw,
                    "is_admin": False,
                    "is_approved": False
                }
                supabase.table('users').insert(data).execute()
            else:
                conn = get_db()
                cursor = conn.cursor()
                
                # Check if email exists
                cursor.execute('SELECT email FROM users WHERE email = ?', (email,))
                if cursor.fetchone():
                    conn.close()
                    flash('Email already registered.', 'error')
                    return render_template('signup.html')

                # Insert new user
                cursor.execute('INSERT INTO users (email, password, is_admin, is_approved) VALUES (?, ?, ?, ?)',
                             (email, hashed_pw, False, False))
                conn.commit()
                conn.close()
            
            flash('Account created! Please wait for admin approval.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash(f'Signup error: {str(e)}', 'error')
            
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/admin')
def admin_panel():
    if 'user_id' not in session or not session.get('is_admin'):
        return redirect(url_for('dashboard'))
        
    try:
        if USE_SUPABASE:
            # Get pending users
            pending = supabase.table('users').select("*").eq('is_approved', False).execute()
            # Get approved users (excluding admin)
            approved = supabase.table('users').select("*").eq('is_approved', True).eq('is_admin', False).execute()
            pending_users = pending.data
            approved_users = approved.data
        else:
            conn = get_db()
            cursor = conn.cursor()
            
            # Get pending users
            cursor.execute('SELECT * FROM users WHERE is_approved = ?', (False,))
            pending_rows = cursor.fetchall()
            pending_users = [dict(row) for row in pending_rows]
            
            # Get approved users (excluding admin)
            cursor.execute('SELECT * FROM users WHERE is_approved = ? AND is_admin = ?', (True, False))
            approved_rows = cursor.fetchall()
            approved_users = [dict(row) for row in approved_rows]
            
            conn.close()
        
        return render_template('admin.html', pending_users=pending_users, approved_users=approved_users)
    except Exception as e:
        flash(f"Error loading admin panel: {e}", "error")
        return redirect(url_for('dashboard'))

@app.route('/approve/<user_id>')
def approve_user(user_id):
    if 'user_id' not in session or not session.get('is_admin'):
        return redirect(url_for('dashboard'))
    
    try:
        if USE_SUPABASE:
            supabase.table('users').update({"is_approved": True}).eq('id', user_id).execute()
        else:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET is_approved = ? WHERE id = ?', (True, user_id))
            conn.commit()
            conn.close()
        flash('User approved.', 'success')
    except Exception as e:
        flash(f"Error approving user: {e}", "error")
        
    return redirect(url_for('admin_panel'))

@app.route('/reject/<user_id>')
def reject_user(user_id):
    if 'user_id' not in session or not session.get('is_admin'):
        return redirect(url_for('dashboard'))
        
    try:
        if USE_SUPABASE:
            supabase.table('users').delete().eq('id', user_id).execute()
        else:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
            conn.commit()
            conn.close()
        flash('User rejected/deleted.', 'success')
    except Exception as e:
        flash(f"Error rejecting user: {e}", "error")
    
    return redirect(url_for('admin_panel'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8085, debug=True)
