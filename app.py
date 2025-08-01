import os
from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import MySQLdb.cursors
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from functools import wraps
import pymysql

# Load .env variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "default-secret-key")

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get('user_logged_in'):
            flash("Please login first", "danger")
            return redirect(url_for('log_in'))
        return f(*args, **kwargs)
    return wrapper

# MySQL Configuration
app.config['MYSQL_HOST'] = os.environ.get("DB_HOST")
app.config['MYSQL_PORT'] = int(os.environ.get("DB_PORT", 3306))
app.config['MYSQL_USER'] = os.environ.get("DB_USER")
app.config['MYSQL_PASSWORD'] = os.environ.get("DB_PASSWORD")
app.config['MYSQL_DB'] = os.environ.get("DB_NAME")

# Database connection
def get_db_connection():
    return pymysql.connect(
        host='localhost',
        user='root',
        password='sl0110*',
        db='ssr',
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/api/customers', methods=['GET'])
def get_customers():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT Name of the Customer FROM kyc")  
    customers = cursor.fetchall()
    conn.close()
    return jsonify(customers)


mysql = MySQL(app)

# ---------- Routes ----------

@app.route('/')
def home():
    return render_template('index.html')

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


@app.route('/logout')  # lowercase
def logout():
    session.clear()
    flash('Logged out successfully.', 'info')
    return redirect(url_for('home'))


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


@app.route('/kycwebpage')
def kyc_webpage():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))

    return render_template('kyc.html')


@app.route('/quotationwebpage')
def quotation_page():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))

    return render_template('quotation.html')

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


@app.route('/bookingwebpage')
def booking_page():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))

    return render_template('booking_details.html')


@app.route('/invoice')
def invoice_page():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))

    return render_template('invoice.html')


@app.route('/prealert')
def prealert_page():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))
    return render_template('prealert.html')

@app.route('/bldetails')
def bl_details_page():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('Log_in'))

    return render_template('bl_details.html')

# ---------- Booking Page ----------
@app.route("/bookingwebpage", methods=['GET', 'POST'])
@login_required
def bookingwebpage():
    if request.method == 'POST':
        fields = ["nomination_date", "consignee_details", "shipper_details", "hbl_no", "mbl_no",
                  "pol", "pod", "container_size", "job_number", "agent_details", "shipping_line",
                  "buy_rate", "sell_rate", "etd", "eta", "swb", "igm_filed", "cha", "description_box"]
        values = [request.form.get(field) for field in fields]

        cur = mysql.connection.cursor()
        sql = f"INSERT INTO booking ({', '.join(fields)}) VALUES ({', '.join(['%s'] * len(fields))})"
        cur.execute(sql, values)
        mysql.connection.commit()
        cur.close()

        flash("Booking submitted successfully!", "success")
        return redirect(url_for("bookinglist"))

    return render_template("Booking_details.html")

# ---------- Booking List ----------
@app.route("/bookinglist")
@login_required
def bookinglist():
    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cur.execute("SELECT * FROM booking")
    res = cur.fetchall()
    cur.close()
    return render_template("bookinglist.html", booking=res)


@app.route("/edit_booking/<int:id>", methods=["GET", "POST"])
@login_required
def edit_booking(id):
    if request.method == "POST":
        form = request.form
        cur = mysql.connection.cursor()  # No need for DictCursor here; you're just updating

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

    # GET request: fetch existing booking
    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)  # ✅ FIXED: use DictCursor here
    cur.execute("SELECT * FROM booking WHERE job_number = %s", (id,))
    bookings = cur.fetchone()
    cur.close()

    if not bookings:
        flash("Booking not found.", "danger")
        return redirect(url_for("bookinglist"))

    return render_template("editUser.html", booking=bookings)

# ---------- Delete Booking ----------
@app.route("/delete_booking/<int:id>", methods=["GET"])
@login_required
def delete_booking(id):
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM booking WHERE job_number = %s", (id,))
    mysql.connection.commit()
    cur.close()
    flash("Booking deleted successfully!", "success")
    return redirect(url_for("bookinglist"))

# Booking Status Page
@app.route('/bookingstatus', methods=['GET', 'POST'])
def bookingstatus():
    cur = mysql.connection.cursor(MySQLdb.cursors.DictCursor)  # Use dictionary cursor

    if request.method == 'POST':
        # Get job number and status from form
        job_number = request.form['job_number']
        new_status = request.form['status']

        # Update booking status
        cur.execute("UPDATE booking SET status = %s WHERE job_number = %s", (new_status, job_number))
        mysql.connection.commit()
        flash("Status updated successfully!", "success")

    # Fetch all booking data
    cur.execute("SELECT * FROM booking")
    bookings = cur.fetchall()

    cur.close()

    return render_template('bookingstatus.html', booking=bookings)

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
