import os
from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import MySQLdb.cursors

# Load .env variables
load_dotenv()

# Flask App Setup
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "default-secret-key")

# MySQL Configuration
app.config['MYSQL_HOST'] = os.environ.get("DB_HOST")
app.config['MYSQL_PORT'] = int(os.environ.get("DB_PORT", 3306))
app.config['MYSQL_USER'] = os.environ.get("DB_USER")
app.config['MYSQL_PASSWORD'] = os.environ.get("DB_PASSWORD")
app.config['MYSQL_DB'] = os.environ.get("DB_NAME")

# Initialize MySQL
mysql = MySQL(app)

# ---------- Routes ----------

@app.route('/')
def home():
    return render_template('index.html', name=session.get('name'))

@app.route('/sign_up', methods=['GET', 'POST'])
def sign_up():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = generate_password_hash(request.form['password'])

        cur = mysql.connection.cursor()
        cur.execute("INSERT INTO users (name, email, password) VALUES (%s, %s, %s)", (name, email, password))
        mysql.connection.commit()
        cur.close()

        flash('Signup successful. Please login.', 'success')
        return redirect(url_for('Log_in'))

    return render_template('sign_up.html')

@app.route('/Log_in', methods=['GET', 'POST'])
def Log_in():
    if request.method == 'POST':
        email = request.form['email']
        password_input = request.form['password']

        cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cur.execute("SELECT * FROM users WHERE email = %s", [email])
        user = cur.fetchone()
        cur.close()

        if user and check_password_hash(user['password'], password_input):
            session['user_logged_in'] = True
            session['user_id'] = user['id']
            session['name'] = user['name']
            session['email'] = user['email']

            if not user.get('mobile') or not user.get('address'):
                flash('Please complete your profile.', 'warning')
                return redirect(url_for('complete_profile'))

            flash('Login successful!', 'success')
            return redirect(url_for('profile'))
        else:
            flash('Invalid email or password.', 'danger')

    return render_template('Log_in.html')

@app.route('/profile')
def profile():
    if not session.get('user_logged_in'):
        flash('Please log in to view your profile.', 'warning')
        return redirect(url_for('Log_in'))

    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cur.execute("SELECT * FROM users WHERE email = %s", [session['email']])
    user = cur.fetchone()
    cur.close()

    if not user:
        flash("User not found.", "danger")
        return redirect(url_for('Log_in'))

    return render_template('profile.html', user=user)

@app.route('/Logout')
def logout():
    session.clear()
    flash('Logged out successfully.', 'info')
    return redirect(url_for('home'))

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form['email']

        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users WHERE email = %s", [email])
        user = cur.fetchone()
        cur.close()

        if user:
            flash("Reset link has been sent to your email (simulated).", "success")
        else:
            flash("Email not registered.", "danger")

    return render_template('forgot_password.html')

@app.route('/complete_profile', methods=['GET', 'POST'])
def complete_profile():
    if not session.get('user_logged_in'):
        return redirect(url_for('Log_in'))

    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)

    if request.method == 'POST':
        mobile = request.form['mobile']
        address = request.form['address']
        city = request.form['city']
        state = request.form['state']
        country = request.form['country']
        pincode = request.form['pincode']

        cur.execute("""
            UPDATE users 
            SET mobile=%s, address=%s, city=%s, state=%s, country=%s, pincode=%s 
            WHERE email=%s
        """, (mobile, address, city, state, country, pincode, session['email']))
        mysql.connection.commit()
        cur.close()

        flash('Profile completed successfully.', 'success')
        return redirect(url_for('profile'))

    cur.execute("SELECT * FROM users WHERE email = %s", [session['email']])
    user_data = cur.fetchone()
    cur.close()

    return render_template('complete_profile.html', user=user_data)

# ---------- KYC Form ----------

@app.route('/kycwebpage')
def kyc_webpage():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))
    return render_template('kyc.html')

@app.route('/kycdetails', methods=['POST'])
def kycdetails():
    data = request.form
    cur = mysql.connection.cursor()
    cur.execute("""
        INSERT INTO kyc_details (
            date, branch, customer_name, customer_address, customer_state, customer_pincode, customer_mob, customer_website,
            type_of_customer, customer_status, year_of_establishment,
            name_of_director, director_address, director_email,
            pan_number, aadhar_number, branch_offices, branch_address,
            office_address, gst_state, gstin, remarks
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        data['date'], data['branch'], data['customer_name'], data['customer_address'], data['customer_state'],
        data['customer_pincode'], data['customer_mob'], data['customer_website'], data['type_of_customer'],
        data['customer_status'], data['year_of_establishment'], data['name_of_director'], data['director_address'],
        data['director_email'], data['pan_number'], data['aadhar_number'], data['branch_offices'],
        data['branch_address'], data['office_address'], data['gst_state'], data['gstin'], data['remarks']
    ))
    mysql.connection.commit()
    cur.close()

    flash("KYC submitted successfully!", "success")
    return redirect(url_for('kyc_webpage'))

# ---------- Quotation ----------

@app.route('/quotationwebpage')
def quotation_page():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))
    return render_template('quotation.html')

@app.route('/quotation_submit', methods=['POST'])
def quotation_submit():
    data = request.form
    cur = mysql.connection.cursor()
    cur.execute("""
        INSERT INTO quotations (
            email, pol, pod, container_size, shipper_details, consignee_details, terms, validity
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        data['email'], data['pol'], data['pod'], data['containerSize'],
        data['shipperDetails'], data['consigneeDetails'], data['terms'], data['validity']
    ))
    mysql.connection.commit()
    cur.close()

    flash("Quotation submitted successfully!", "success")
    return redirect(url_for('quotation_page'))

# ---------- Static Pages ----------

@app.route('/bookingwebpage')
def booking_page():
    return render_template('booking.html')

@app.route('/invoice')
def invoice_page():
    return render_template('invoice.html')

@app.route('/prealert')
def prealert_page():
    return render_template('prealert.html')

@app.route('/bldetails')
def bl_details_page():
    return render_template('bl_details.html')

# ---------- Run ----------
if __name__ == '__main__':
    app.run(debug=True)
