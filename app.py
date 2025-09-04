import os
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import MySQLdb.cursors
from datetime import datetime
from functools import wraps
import pymysql

# Load .env variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "default-secret-key")

# MySQL Configuration
app.config['MYSQL_HOST'] = os.environ.get("DB_HOST", "localhost")
app.config['MYSQL_PORT'] = int(os.environ.get("DB_PORT", 3306))
app.config['MYSQL_USER'] = os.environ.get("DB_USER", "root")
app.config['MYSQL_PASSWORD'] = os.environ.get("DB_PASSWORD", "")
app.config['MYSQL_DB'] = os.environ.get("DB_NAME", "ssr")

mysql = MySQL(app)

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get('user_logged_in'):
            flash("Please login first", "danger")
            return redirect(url_for('Log_in'))
        return f(*args, **kwargs)
    return wrapper

def role_required(*roles):
    def wrapper(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not session.get('user_logged_in'):
                flash("Please login first", "danger")
                return redirect(url_for('Log_in'))
            if session.get('role') not in roles:
                flash("You do not have permission to access this page.", "danger")
                return redirect(url_for('home'))
            return f(*args, **kwargs)
        return decorated_function
    return wrapper

# Route: Home page
@app.route('/')
def home():
    return render_template('index.html')

# Route: Sign up page
@app.route('/sign_up', methods=['GET', 'POST'])
def sign_up():
    allowed_code = "MY_SECRET_INVITE"
    if request.method == 'POST':
        invite_code = request.form.get('invite_code')
        if invite_code != allowed_code:
            flash("Invalid invite code", "danger")
            return redirect(url_for('sign_up'))
        # Implement actual signup logic here, with form values 
        # (Not required per request – leaving blank so you can extend)

    return render_template('sign_up.html')

# Route: Log In
@app.route('/Log_in', methods=['GET', 'POST'])
def Log_in():
    if request.method == 'POST':
        email = request.form['email']
        password_input = request.form['password']

        cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cur.execute("SELECT * FROM users WHERE email = %s", [email])
        user = cur.fetchone()

        if user:
            if check_password_hash(user['password_hash'], password_input):
                session['user_logged_in'] = True
                session['user_id'] = user['id']
                session['email'] = user['email']
                session['role'] = user['role']
                cur.close()
                flash('Login successful!', 'success')
                return redirect(url_for('profile'))
            else:
                cur.close()
                flash('Invalid password.', 'danger')
                return redirect(url_for('Log_in'))
        else:
            # Auto-create user (for demo; remove in production)
            hashed_pw = generate_password_hash(password_input)
            cur.execute("INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s)", 
                        (email, hashed_pw, 'user'))
            mysql.connection.commit()
            cur.close()
            flash('Account created! Please log in again.', 'success')
            return redirect(url_for('Log_in'))

    return render_template('Log_in.html')

# Route: Logout
@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out successfully.', 'info')
    return redirect(url_for('home'))

# Route: Profile page
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

# Route: Complete profile page
@app.route('/complete_profile', methods=['GET', 'POST'])
def complete_profile():
    if not session.get('user_logged_in'):
        flash('Please log in to complete your profile.', 'warning')
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

# Route: Submit KYC
@app.route('/submit_kyc', methods=['POST'])
def submit_kyc():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))

    data = request.form
    cur = mysql.connection.cursor()
    cur.execute("""
        INSERT INTO kyc_details (
            date, branch, customer_name, customer_address, customer_type, customer_status, year_of_establishment,
            pan_number, name_of_director, aadhar_number, branch_offices,
            office_address, gst_state, gstin, remarks
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        data['date'], data['branch'], data['name'], data['address'], data['customer_type'],
        data['status'], data['year'], data['pan'], data['director'],
        data['aadhar'], data['branch_office'], data['office_address'], data['state'],
        data['gstin'], data['remarks']
    ))
    mysql.connection.commit()
    cur.close()

    flash("KYC submitted successfully!", "success")
    return redirect(url_for('kyc_webpage'))

# Route: KYC webpage
@app.route('/kycwebpage')
def kyc_webpage():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))
    return render_template('kyc.html')

# Route: Quotation page
@app.route('/quotationwebpage')
def quotation_page():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))
    return render_template('quotation.html')

# Route: Submit quotation
@app.route('/quotation_submit', methods=['POST'])
def quotation_submit():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))

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

# Route: Booking webpage
@app.route('/bookingwebpage')
def booking_page():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))
    return render_template('booking_details.html')

# Route: Invoice page, Admin only
@app.route('/invoice')
@login_required
@role_required('Admin')
def invoice_page():
    return render_template('invoice.html')

# Route: Pre-Alert page
@app.route('/prealert')
def prealert_page():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))
    return render_template('prealert.html')

# Route: BL details page
@app.route('/bldetails')
def bl_details_page():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))
    return render_template('bl_details.html')

# Route: Add booking (POST) and show booking form (GET)
@app.route("/bookingwebpage", methods=['GET', 'POST'])
@login_required
def bookingwebpage():
    if request.method == 'POST':
        fields = [
            "nomination_date", "consignee_details", "shipper_details", "hbl_no", "mbl_no",
            "pol", "pod", "container_size", "job_number", "agent_details", "shipping_line",
            "buy_rate", "sell_rate", "etd", "eta", "swb", "igm_filed", "cha", "description_box"
        ]
        values = [request.form.get(field) for field in fields]

        cur = mysql.connection.cursor()
        sql = f"INSERT INTO booking ({', '.join(fields)}) VALUES ({', '.join(['%s'] * len(fields))})"
        cur.execute(sql, values)
        mysql.connection.commit()
        cur.close()

        flash("Booking submitted successfully!", "success")
        return redirect(url_for("bookinglist"))
    return render_template("Booking_details.html")

@app.route('/get-last-job-number')
def get_last_job_number():
    cur = mysql.connection.cursor()
    cur.execute("SELECT MAX(job_number) FROM booking")
    result = cur.fetchone()
    cur.close()
    last_job_number = result[0] if result[0] is not None else 0
    return {"lastJobNumber": last_job_number}

@app.route('/api/companies')
def api_companies():
    cur = mysql.connection.cursor()
    cur.execute("SELECT DISTINCT customer_name FROM kyc_details")
    rows = cur.fetchall()
    cur.close()
    companies = [row[0] for row in rows]
    return jsonify({"companies": companies})

# Route: Booking List page (Admin, Staff only)
@app.route('/bookinglist')
@login_required
@role_required('Admin', 'Staff')
def bookinglist():
    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cur.execute("SELECT * FROM booking")
    res = cur.fetchall()
    cur.close()
    return render_template("bookinglist.html", booking=res)

# Route: Edit booking
@app.route("/edit_booking/<int:id>", methods=["GET", "POST"])
@login_required
def edit_booking(id):
    if request.method == "POST":
        form = request.form
        cur = mysql.connection.cursor()

        cur.execute("""
            UPDATE booking SET
                nomination_date=%s,
                consignee_details=%s,
                shipper_details=%s,
                hbl_no=%s,
                mbl_no=%s,
                pol=%s,
                pod=%s,
                container_size=%s,
                agent_details=%s,
                shipping_line=%s,
                buy_rate=%s,
                sell_rate=%s,
                etd=%s,
                eta=%s,
                swb=%s,
                igm_filed=%s,
                cha=%s,
                description_box=%s
            WHERE job_number=%s
        """, (
            form['nomination_date'], form['consignee_details'], form['shipper_details'], form['hbl_no'],
            form['mbl_no'], form['pol'], form['pod'], form['container_size'], form['agent_details'],
            form['shipping_line'], form['buy_rate'], form['sell_rate'], form['etd'], form['eta'],
            form['swb'], form['igm_filed'], form['cha'], form['description_box'], id
        ))
        mysql.connection.commit()
        cur.close()
        flash("Booking updated successfully!", "success")
        return redirect(url_for("bookinglist"))

    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cur.execute("SELECT * FROM booking WHERE job_number = %s", (id,))
    bookings = cur.fetchone()
    cur.close()

    if not bookings:
        flash("Booking not found.", "danger")
        return redirect(url_for("bookinglist"))

    return render_template("editUser.html", booking=bookings)

# Route: Delete booking
@app.route("/delete_booking/<int:id>", methods=["GET"])
@login_required
def delete_booking(id):
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM booking WHERE job_number = %s", (id,))
    mysql.connection.commit()
    cur.close()
    flash("Booking deleted successfully!", "success")
    return redirect(url_for("bookinglist"))

# Route: Booking Status page
@app.route('/bookingstatus', methods=['GET', 'POST'])
def bookingstatus():
    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    if request.method == 'POST':
        job_number = request.form['job_number']
        new_status = request.form['status']
        cur.execute("UPDATE booking SET status = %s WHERE job_number = %s", (new_status, job_number))
        mysql.connection.commit()
        flash("Status updated successfully!", "success")

    cur.execute("SELECT * FROM booking")
    bookings = cur.fetchall()
    cur.close()
    return render_template('bookingstatus.html', booking=bookings)

# Route: Delivery Order page
@app.route("/delivery_order/<int:job_number>")
def delivery_order(job_number):
    try:
        cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cur.execute("SELECT * FROM booking WHERE job_number = %s", (job_number,))
        booking = cur.fetchone()
        cur.close()

        if booking:
            return render_template("delivery_order.html", booking=booking)
        else:
            flash("Booking not found.", "danger")
            return redirect(url_for("bookinglist"))
    except Exception as e:
        flash(f"Error: {str(e)}", "danger")
        return redirect(url_for("bookinglist"))

# Route: Freight Certificate page
@app.route("/freight_certificate/<int:job_number>")
def freight_certificate(job_number):
    try:
        cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cur.execute("SELECT * FROM booking WHERE job_number = %s", (job_number,))
        booking = cur.fetchone()
        cur.close()

        if booking:
            return render_template("fc.html", booking=booking)
        else:
            flash("Booking not found.", "danger")
            return redirect(url_for("bookinglist"))
    except Exception as e:
        flash(f"Error: {str(e)}", "danger")
        return redirect(url_for("bookinglist"))

if __name__ == '__main__':
    app.run(debug=True)