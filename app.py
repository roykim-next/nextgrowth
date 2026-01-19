from flask import Flask, render_template, request, redirect, url_for, session, flash
from supabase import create_client, Client
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "super_secret_key_for_demo_only")

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("WARNING: Supabase credentials not found in environment variables.")
    supabase = None
else:
    supabase: Client = create_client(url, key)

@app.route('/')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if not supabase:
        return render_template('login.html', error="Database not configured")
    
    try:
        response = supabase.table('users').select("*").eq('id', session['user_id']).execute()
        
        if not response.data:
            session.clear()
            return redirect(url_for('login'))
            
        user = response.data[0]
        
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
        
        if not supabase:
            flash('Database not configured', 'error')
            return render_template('login.html')
        
        try:
            response = supabase.table('users').select("*").eq('email', email).execute()
            
            if response.data:
                user = response.data[0]
                if check_password_hash(user['password'], password):
                    session['user_id'] = user['id']
                    session['email'] = user['email']
                    session['is_admin'] = user['is_admin']
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
        hashed_pw = generate_password_hash(password)
        
        if not supabase:
            flash('Database not configured', 'error')
            return render_template('signup.html')
        
        try:
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
    
    if not supabase:
        flash("Database not configured", "error")
        return redirect(url_for('dashboard'))
        
    try:
        # Get pending users
        pending = supabase.table('users').select("*").eq('is_approved', False).execute()
        # Get approved users (excluding admin)
        approved = supabase.table('users').select("*").eq('is_approved', True).eq('is_admin', False).execute()
        
        return render_template('admin.html', pending_users=pending.data, approved_users=approved.data)
    except Exception as e:
        flash(f"Error loading admin panel: {e}", "error")
        return redirect(url_for('dashboard'))

@app.route('/approve/<user_id>')
def approve_user(user_id):
    if 'user_id' not in session or not session.get('is_admin'):
        return redirect(url_for('dashboard'))
    
    if not supabase:
        flash("Database not configured", "error")
        return redirect(url_for('admin_panel'))
    
    try:
        supabase.table('users').update({"is_approved": True}).eq('id', user_id).execute()
        flash('User approved.', 'success')
    except Exception as e:
        flash(f"Error approving user: {e}", "error")
        
    return redirect(url_for('admin_panel'))

@app.route('/reject/<user_id>')
def reject_user(user_id):
    if 'user_id' not in session or not session.get('is_admin'):
        return redirect(url_for('dashboard'))
    
    if not supabase:
        flash("Database not configured", "error")
        return redirect(url_for('admin_panel'))
        
    try:
        supabase.table('users').delete().eq('id', user_id).execute()
        flash('User rejected/deleted.', 'success')
    except Exception as e:
        flash(f"Error rejecting user: {e}", "error")
    
    return redirect(url_for('admin_panel'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8085, debug=True)
