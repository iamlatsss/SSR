import mysql.connector
from flask import Flask, render_template, session, redirect, request, flash, jsonify, url_for

app = Flask(__name__)
app.secret_key = "ssr"

# Database Connection Function
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="sl0110*",
        database="ssr"
    )

# Home Page
@app.route('/')
def home():
    user_logged_in = session.get('user_logged_in', False)
    return render_template('Home_screen.html', user_logged_in=user_logged_in)

# API: Fetch Company Names for Consignee Dropdown
def get_companies():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT cust_name FROM kycdetails")
    companies = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return companies

@app.route("/api/companies", methods=["GET"])
def fetch_companies():
    return jsonify({"companies": get_companies()})

# Sign Up
@app.route('/sign_up')
def sign_up():
    return render_template('sign_up.html')

@app.route('/signupdetails', methods=['POST'])
def signupdetails():
    name = request.form["name"]
    email = request.form["email"]
    password = request.form["password"]
    mob_number = request.form["mob_number"]

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT email FROM user WHERE email=%s", (email,))
    value = cur.fetchone()

    if not value:
        cur.execute("INSERT INTO user (name, email, mobile_no, pass_word) VALUES (%s, %s, %s, %s)",
                    (name, email, mob_number, password))
        conn.commit()
        cur.close()
        conn.close()
        return redirect('/Log_in')
    else:
        flash("Email is already registered! Enter a new email.", "error")
        cur.close()
        conn.close()
        return redirect('/sign_up')

# Login
@app.route('/Log_in')
def Log_in():
    return render_template('Log_in.html')

@app.route('/Logindetails', methods=['POST'])
def Logindetails():
    email = request.form["email"]
    password = request.form["password"]

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT email, pass_word FROM user WHERE email=%s", (email,))
    data = cur.fetchone()

    if data and data[1] == password:
        session["email"] = email
        session["user_logged_in"] = True
        cur.close()
        conn.close()
        return redirect('/')

    session["user_logged_in"] = False
    flash("Invalid username or password", "error")
    cur.close()
    conn.close()
    return redirect('/Log_in')

# Logout
@app.route('/Logout')
def Logout():
    session.clear()
    return redirect('/')

# KYC Page
@app.route('/kycwebpage')
def kycwebpage():
    return render_template('Kyc_webpage.html')

@app.route('/kycdetails', methods=['POST'])
def kycdetails():
    customer_name = request.form["customer_name"]
    type_of_customer = request.form["type_of_customer"]
    customer_status = request.form["customer_status"]
    year_of_establishment = request.form["year_of_establishment"]
    pan_number = request.form["pan_number"]
    aadhar_number = request.form["aadhar_number"]
    date = request.form["date"]

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO kycdetails (cust_name, type_of_customer, status_of_customer, year_of_establishment, pan_number, aadhar_number, kyc_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (customer_name, type_of_customer, customer_status, year_of_establishment, pan_number, aadhar_number, date))
    conn.commit()
    cur.close()
    conn.close()
    return redirect('/')

# Booking Page
@app.route("/bookingwebpage", methods=['GET', 'POST'])
def bookingwebpage():
    if request.method == 'POST':
        return "Form submitted successfully!"
    return render_template("Booking_details.html")

# Booking List
@app.route("/bookinglist")
def bookinglist():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM booking")
    res = cursor.fetchall()
    cursor.close()
    conn.close()
    return render_template("bookinglist.html", booking=res)

# Add New Booking
@app.route("/Booking_details", methods=['GET', 'POST'])
def Booking_details():
    if request.method == 'POST':
        fields = ["nomination_date", "consignee_details", "shipper_details", "hbl_no", "mbl_no",
                  "pol", "pod", "container_size", "agent_details", "shipping_line", "buy_rate",
                  "sell_rate", "etd", "eta", "swb", "igm_filed", "cha", "description_box"]
        values = [request.form[field] for field in fields]

        conn = get_db_connection()
        cur = conn.cursor()
        sql = f"""INSERT INTO booking ({', '.join(fields)}) VALUES ({', '.join(['%s'] * len(fields))})"""
        cur.execute(sql, tuple(values))
        conn.commit()
        cur.close()
        conn.close()
        return redirect(url_for("bookinglist"))
    return render_template("Booking_details.html")

# Edit Booking
@app.route("/editUser/<int:id>", methods=["GET", "POST"])
def editUser(id):
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    if request.method == "POST":
        updated_data = tuple(request.form[key] for key in [
            "nomination_date", "consignee_details", "shipper_details", "hbl_no", "mbl_no", "pol", "pod",
            "container_size", "agent_details", "shipping_line", "buy_rate", "sell_rate", "etd", "eta",
            "swb", "igm_filed", "cha", "description_box"
        ]) + (id,)
        cur.execute("""
            UPDATE booking SET nomination_date=%s, consignee_details=%s, shipper_details=%s,
            hbl_no=%s, mbl_no=%s, pol=%s, pod=%s, container_size=%s, agent_details=%s, 
            shipping_line=%s, buy_rate=%s, sell_rate=%s, etd=%s, eta=%s, swb=%s, igm_filed=%s, cha=%s, description_box=%s
            WHERE job_number=%s
        """, updated_data)
        conn.commit()
        cur.close()
        conn.close()
        flash("Booking details updated successfully!", "success")
        return redirect(url_for("bookinglist"))

    cur.execute("SELECT * FROM booking WHERE job_number = %s", (id,))
    booking = cur.fetchone()
    cur.close()
    conn.close()
    return render_template("editUser.html", booking=booking)

# Delete Booking
@app.route("/deleteUser/<int:id>")
def deleteUser(id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM booking WHERE job_number=%s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    flash("Booking details deleted successfully!", "success")
    return redirect(url_for("bookinglist"))

# Booking Status
@app.route('/bookingstatus', methods=['GET', 'POST'])
def bookingstatus():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    if request.method == 'POST':
        job_number = request.form['job_number']
        new_status = request.form['status']
        cur.execute("UPDATE booking SET status = %s WHERE job_number = %s", (new_status, job_number))
        conn.commit()

    cur.execute("SELECT * FROM booking")
    bookings = cur.fetchall()
    cur.close()
    conn.close()
    return render_template('bookingstatus.html', booking=bookings)

# Run App
if __name__ == '__main__':
    app.run(debug=True)
