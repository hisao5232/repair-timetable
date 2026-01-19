from flask import Flask, render_template, request, redirect, url_for, session, flash
import os

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "default-secret")

# ログイン情報を取得
ADMIN_USER = os.getenv("ADMIN_USER", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
USER_NAME = os.getenv("USER_NAME")
USER_PASSWORD = os.getenv("USER_PASSWORD")

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # 管理者または一般ユーザーの照合
        if (username == ADMIN_USER and password == ADMIN_PASSWORD) or \
           (username == USER_NAME and password == USER_PASSWORD):
            session['user'] = username
            session['is_admin'] = (username == ADMIN_USER)
            return redirect(url_for('index'))
        else:
            flash('ユーザー名またはパスワードが違います')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/')
def index():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', user=session['user'], is_admin=session['is_admin'])

@app.route('/history')
def history():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('history.html', user=session['user'], is_admin=session['is_admin'])

@app.route('/analysis')
def analysis():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('analysis.html', user=session['user'])
        
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
