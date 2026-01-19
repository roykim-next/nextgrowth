import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_NAME = "users.db"

def init_db():
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)
        
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Create Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT 0,
            is_approved BOOLEAN DEFAULT 0
        )
    ''')
    
    # Create Admin Account
    admin_email = "henry@nextsecurities.com"
    # For demo, default password is 'admin123'
    admin_pass = generate_password_hash("admin123", method='pbkdf2:sha256')
    
    cursor.execute('INSERT OR IGNORE INTO users (email, password, is_admin, is_approved) VALUES (?, ?, 1, 1)', 
                   (admin_email, admin_pass))
    
    conn.commit()
    conn.close()
    print("Database initialized with admin account.")

if __name__ == "__main__":
    init_db()
