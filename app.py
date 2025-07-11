# import mysql.connector , os
# from flask import Flask, render_template, session, redirect, request, flash, jsonify, url_for
# from dotenv import load_dotenv

# load_dotenv()

# app = Flask(__name__)
# app.secret_key = os.environ.get("SECRET_KEY", "default-secret-key")


# # Database Connection Function
# def get_db_connection():
#     return mysql.connector.connect(
#         host=os.environ.get("DB_HOST"),
#         port=int(os.environ.get("DB_PORT", 3306)),  # Include this!
#         user=os.environ.get("DB_USER"),
#         password=os.environ.get("DB_PASSWORD"),
#         database=os.environ.get("DB_NAME")
#     )

# # Home Page
# @app.route('/')
# def home():
#     user_logged_in = session.get('user_logged_in', False)
#     return render_template('Home_screen.html', user_logged_in=user_logged_in)

# # API: Fetch Company Names for Consignee Dropdown
# def get_companies():
#     conn = get_db_connection()
#     cur = conn.cursor()
#     cur.execute("SELECT cust_name FROM kycdetails")
#     companies = [row[0] for row in cur.fetchall()]
#     cur.close()
#     conn.close()
#     return companies

# @app.route("/api/companies", methods=["GET"])
# def fetch_companies():
#     return jsonify({"companies": get_companies()})

# # Sign Up
# @app.route('/sign_up')
# def sign_up():
#     return render_template('sign_up.html')

# @app.route('/signupdetails', methods=['POST'])
# def signupdetails():
#     name = request.form["name"]
#     email = request.form["email"]
#     password = request.form["password"]
#     mob_number = request.form["mob_number"]

#     conn = get_db_connection()
#     cur = conn.cursor()
#     cur.execute("SELECT email FROM user WHERE email=%s", (email,))
#     value = cur.fetchone()

#     if not value:
#         cur.execute("INSERT INTO user (name, email, mobile_no, pass_word) VALUES (%s, %s, %s, %s)",
#                     (name, email, mob_number, password))
#         conn.commit()
#         cur.close()
#         conn.close()
#         return redirect('/Log_in')
#     else:
#         flash("Email is already registered! Enter a new email.", "error")
#         cur.close()
#         conn.close()
#         return redirect('/sign_up')

# # Login
# @app.route('/Log_in')
# def Log_in():
#     return render_template('Log_in.html')

# @app.route('/Logindetails', methods=['POST'])
# def Logindetails():
#     email = request.form["email"]
#     password = request.form["password"]

#     conn = get_db_connection()
#     cur = conn.cursor()
#     cur.execute("SELECT email, pass_word FROM user WHERE email=%s", (email,))
#     data = cur.fetchone()

#     if data and data[1] == password:
#         session["email"] = email
#         session["user_logged_in"] = True
#         cur.close()
#         conn.close()
#         return redirect('/')

#     session["user_logged_in"] = False
#     flash("Invalid username or password", "error")
#     cur.close()
#     conn.close()
#     return redirect('/Log_in')

# # Logout
# @app.route('/Logout')
# def Logout():
#     session.clear()
#     return redirect('/')

# # KYC Page
# @app.route('/kycwebpage')
# def kycwebpage():
#     return render_template('Kyc_webpage.html')

# @app.route('/kycdetails', methods=['POST'])
# def kycdetails():
#     customer_name = request.form["customer_name"]
#     type_of_customer = request.form["type_of_customer"]
#     customer_status = request.form["customer_status"]
#     year_of_establishment = request.form["year_of_establishment"]
#     pan_number = request.form["pan_number"]
#     aadhar_number = request.form["aadhar_number"]
#     date = request.form["date"]

#     conn = get_db_connection()
#     cur = conn.cursor()
#     cur.execute("""
#         INSERT INTO kycdetails (cust_name, type_of_customer, status_of_customer, year_of_establishment, pan_number, aadhar_number, kyc_date)
#         VALUES (%s, %s, %s, %s, %s, %s, %s)
#     """, (customer_name, type_of_customer, customer_status, year_of_establishment, pan_number, aadhar_number, date))
#     conn.commit()
#     cur.close()
#     conn.close()
#     return redirect('/')

# # Booking Page
# @app.route("/bookingwebpage", methods=['GET', 'POST'])
# def bookingwebpage():
#     if request.method == 'POST':
#         return "Form submitted successfully!"
#     return render_template("Booking_details.html")

# # Booking List
# @app.route("/bookinglist")
# def bookinglist():
#     conn = get_db_connection()
#     cursor = conn.cursor(dictionary=True)
#     cursor.execute("SELECT * FROM booking")
#     res = cursor.fetchall()
#     cursor.close()
#     conn.close()
#     return render_template("bookinglist.html", booking=res)

# # Add New Booking
# @app.route("/Booking_details", methods=['GET', 'POST'])
# def Booking_details():
#     if request.method == 'POST':
#         fields = ["nomination_date", "consignee_details", "shipper_details", "hbl_no", "mbl_no",
#                   "pol", "pod", "container_size", "agent_details", "shipping_line", "buy_rate",
#                   "sell_rate", "etd", "eta", "swb", "igm_filed", "cha", "description_box"]
#         values = [request.form[field] for field in fields]

#         conn = get_db_connection()
#         cur = conn.cursor()
#         sql = f"""INSERT INTO booking ({', '.join(fields)}) VALUES ({', '.join(['%s'] * len(fields))})"""
#         cur.execute(sql, tuple(values))
#         conn.commit()
#         cur.close()
#         conn.close()
#         return redirect(url_for("bookinglist"))
#     return render_template("Booking_details.html")

# # Edit Booking
# @app.route("/editUser/<int:id>", methods=["GET", "POST"])
# def editUser(id):
#     conn = get_db_connection()
#     cur = conn.cursor(dictionary=True)

#     if request.method == "POST":
#         updated_data = tuple(request.form[key] for key in [
#             "nomination_date", "consignee_details", "shipper_details", "hbl_no", "mbl_no", "pol", "pod",
#             "container_size", "agent_details", "shipping_line", "buy_rate", "sell_rate", "etd", "eta",
#             "swb", "igm_filed", "cha", "description_box"
#         ]) + (id,)
#         cur.execute("""
#             UPDATE booking SET nomination_date=%s, consignee_details=%s, shipper_details=%s,
#             hbl_no=%s, mbl_no=%s, pol=%s, pod=%s, container_size=%s, agent_details=%s, 
#             shipping_line=%s, buy_rate=%s, sell_rate=%s, etd=%s, eta=%s, swb=%s, igm_filed=%s, cha=%s, description_box=%s
#             WHERE job_number=%s
#         """, updated_data)
#         conn.commit()
#         cur.close()
#         conn.close()
#         flash("Booking details updated successfully!", "success")
#         return redirect(url_for("bookinglist"))

#     cur.execute("SELECT * FROM booking WHERE job_number = %s", (id,))
#     booking = cur.fetchone()
#     cur.close()
#     conn.close()
#     return render_template("editUser.html", booking=booking)

# # Delete Booking
# @app.route("/deleteUser/<int:id>")
# def deleteUser(id):
#     conn = get_db_connection()
#     cur = conn.cursor()
#     cur.execute("DELETE FROM booking WHERE job_number=%s", (id,))
#     conn.commit()
#     cur.close()
#     conn.close()
#     flash("Booking details deleted successfully!", "success")
#     return redirect(url_for("bookinglist"))

# # Booking Status
# @app.route('/bookingstatus', methods=['GET', 'POST'])
# def bookingstatus():
#     conn = get_db_connection()
#     cur = conn.cursor(dictionary=True)

#     if request.method == 'POST':
#         job_number = request.form['job_number']
#         new_status = request.form['status']
#         cur.execute("UPDATE booking SET status = %s WHERE job_number = %s", (new_status, job_number))
#         conn.commit()

#     cur.execute("SELECT * FROM booking")
#     bookings = cur.fetchall()
#     cur.close()
#     conn.close()
#     return render_template('bookingstatus.html', booking=bookings)

# # Run App
# if __name__ == '__main__':
#     app.run(debug=True)


# changes made by maha
import os
from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "default-secret-key")

#Database Connection Function
def get_db_connection():
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST"),
        port=int(os.environ.get("DB_PORT", 3306)),  # Include this!
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
        database=os.environ.get("DB_NAME")
    )

mysql = MySQL(app)
print("DB_USER:", os.environ.get("DB_USER"))
print("DB_PASSWORD:", os.environ.get("DB_PASSWORD"))
# ---------- Authentication Routes ----------

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
        return redirect(url_for('log_in'))

    return render_template('sign_up.html')

@app.route('/Log_in', methods=['GET', 'POST'])
def log_in():
    if request.method == 'POST':
        email = request.form['email']
        password_input = request.form['password']

        cur = mysql.connection.cursor()
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

    return render_template('log_in.html')

@app.route('/profile')
def profile():
    if not session.get('user_logged_in'):
        flash('Please log in to view your profile.', 'warning')
        return redirect(url_for('log_in'))

    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", [session['email']])
    user = cur.fetchone()
    cur.close()

    if not user:
        flash("User not found.", "danger")
        return redirect(url_for('log_in'))

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
        return redirect(url_for('log_in'))

    cur = mysql.connection.cursor()

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

# ---------- KYC ----------

@app.route('/kycwebpage')
def kyc_webpage():
    if not session.get('user_logged_in'):
        flash("Please login first", "danger")
        return redirect(url_for('log_in'))
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
        return redirect(url_for('log_in'))
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

# ---------- Other Pages ----------

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
