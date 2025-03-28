import mysql.connector
from flask import Flask, render_template, session, redirect, request, flash, jsonify, url_for
# from flask_mysqldb import MySQL

app = Flask(__name__)
app.secret_key = "ssr"

conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="12345",
        database="ssr"
    )

# Configure MySQL
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = '12345'  # Change to your MySQL password
app.config['MYSQL_DB'] = 'ssr'

# # Database Connection Function
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="12345",
        database="ssr"
    )

# Home Page
@app.route('/')
def home():
    user_logged_in = session.get('user_logged_in', False)
    return render_template('Home_screen.html', user_logged_in=user_logged_in)

# Fetch Company Names for Consignee Dropdown
def get_companies():
    cur = get_db_connection()
    cur.execute("SELECT cust_name FROM kycdetails")
    companies = [row[0] for row in cur.fetchall()]
    cur.close()
    return companies

@app.route("/api/companies", methods=["GET"])
def fetch_companies():
    return jsonify({"companies": get_companies()})

# Sign Up Page
@app.route('/sign_up')
def sign_up():
    return render_template('sign_up.html')

@app.route('/signupdetails', methods=['POST'])
def signupdetails():
    name = request.form["name"]
    email = request.form["email"]
    password = request.form["password"]
    mob_number = request.form["mob_number"]

    cur = get_db_connection()
    cur.execute("SELECT email FROM user WHERE email=%s", (email,))
    value = cur.fetchone()

    if not value:
        cur.execute("INSERT INTO user (name, email, mobile_no, pass_word) VALUES (%s, %s, %s, %s)",
                    (name, email, mob_number, password))
        mysql.connection.commit()  # Commit changes
        cur.close()
        return redirect('/Log_in')
    else:
        flash("Email is already registered! Enter a new email.", "error")
        return redirect('/sign_up')

# Login Functionality
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

    if data:
        email_db, password_db = data
        if password_db == password:
            session["email"] = email
            session["user_logged_in"] = True
            return redirect('/')
    
    session["user_logged_in"] = False
    flash("Invalid username or password", "error")
    return redirect('/Log_in')

# Logout
@app.route('/Logout')
def Logout():
    session.clear()
    return redirect('/')

# Fetch Company Names for Dropdown on KYC Page
@app.route('/kycwebpage')
def kycwebpage():
    return render_template('Kyc_webpage.html')

# Booking Page
@app.route("/bookingwebpage", methods=['GET', 'POST'])
def bookingwebpage():
    if request.method == 'POST':
        # Handle form submission
        return "Form submitted successfully!"
    return render_template("Booking_details.html")

# API for Handling KYC Details
@app.route('/kycdetails', methods=['POST'])
def kycdetails():
    customer_name = request.form["customer_name"]
    type_of_customer = request.form["type_of_customer"]
    customer_status = request.form["customer_status"]
    year_of_establishment = request.form["year_of_establishment"]
    pan_number = request.form["pan_number"]
    aadhar_number = request.form["aadhar_number"]
    date = request.form["date"]

    cur = get_db_connection()
    cur.execute("""
        INSERT INTO kycdetails (cust_name, type_of_customer, status_of_customer, year_of_establishment, pan_number, aadhar_number, kyc_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (customer_name, type_of_customer, customer_status, year_of_establishment, pan_number, aadhar_number, date))
    
    mysql.connection.commit()  # Commit changes
    cur.close()
    return redirect('/')

# Booking List
# @app.route("/bookinglist")
# def bookinglist():
#     cur = get_db_connection()
#     cur.execute("SELECT * FROM `booking`")
#     res = cur.fetchall()
#     cur.close()
#     return render_template("bookinglist.html", booking=res)

@app.route("/bookinglist")
def bookinglist():
    conn = mysql.connector.connect(
        # Lathika
        # host="localhost",
        # user="root",
        # password="sl0110*",
        # database="ssr"

        # mahalakshmi Mysql setup
        host="localhost",
        user="root",
        password="12345",
        database="DB"

    )
    cursor = conn.cursor(dictionary=True)  # Enables access by column name
    cursor.execute("SELECT * FROM booking")
    res = cursor.fetchall()
    cursor.close()
    conn.close()  # Close the connection to prevent memory leaks
    return render_template("bookinglist.html", booking=res)

# Add New Booking
@app.route("/Booking_details", methods=['GET', 'POST'])
def Booking_details():
    if request.method == 'POST':
        nomination_date = request.form['nomination_date']
        consignee_details = request.form['consignee_details']
        shipper_details = request.form['shipper_details']
        hbl_no = request.form['hbl_no']
        mbl_no = request.form['mbl_no']
        pol = request.form['pol']
        pod = request.form['pod']
        container_size = request.form['container_size']
        agent_details = request.form['agent_details']
        shipping_line = request.form['shipping_line']
        buy_rate = request.form['buy_rate']
        sell_rate = request.form['sell_rate']
        etd = request.form['etd']
        eta = request.form['eta']
        swb = request.form['swb']
        igm_filed = request.form['igm_filed']
        cha = request.form['cha']

        cur = get_db_connection()
        sql = """INSERT INTO booking (nomination_date, consignee_details, shipper_details, hbl_no, mbl_no, pol, pod, 
                 container_size, agent_details, shipping_line, buy_rate, sell_rate, etd, eta, swb, igm_filed, cha)
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
        cur.execute(sql, (nomination_date, consignee_details, shipper_details, hbl_no, mbl_no, pol, pod,
                          container_size, agent_details, shipping_line, buy_rate, sell_rate, etd, eta, swb, igm_filed, cha))
        mysql.connection.commit()
        cur.close()
        return redirect(url_for("bookinglist"))

    return render_template("Booking_details.html")

# Update Booking
@app.route("/editUser/<int:id>", methods=["GET", "POST"])
def editUser(id):
    conn = get_db_connection()  # Get database connection
    cur = conn.cursor(dictionary=True)  # Create a cursor

    if request.method == "POST":
        updated_data = tuple(request.form[key] for key in [
            "nomination_date", "consignee_details", "shipper_details", "hbl_no", "mbl_no", "pol", "pod",
            "container_size", "agent_details", "shipping_line", "buy_rate", "sell_rate", "etd", "eta",
            "swb", "igm_filed", "cha"
        ]) + (id,)

        cur.execute("""
            UPDATE booking SET nomination_date=%s, consignee_details=%s, shipper_details=%s,
            hbl_no=%s, mbl_no=%s, pol=%s, pod=%s, container_size=%s, agent_details=%s, 
            shipping_line=%s, buy_rate=%s, sell_rate=%s, etd=%s, eta=%s, swb=%s, igm_filed=%s, cha=%s 
            WHERE job_number=%s
        """, updated_data)
        conn.commit()
        cur.close()
        flash("Booking details updated successfully!", "success")
        return redirect(url_for("bookinglist"))

    cur.execute("SELECT * FROM booking WHERE job_number = %s", (id,))
    booking = cur.fetchone()
    cur.close()
    return render_template("editUser.html", booking=booking)

# Delete Booking
@app.route("/deleteUser/<int:id>")
def deleteUser(id):
    conn = get_db_connection()  # Get database connection
    cur = conn.cursor() # Create a cursor
    cur.execute("DELETE FROM booking WHERE job_number=%s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    flash("Booking details deleted successfully!", "success")
    return redirect(url_for("bookinglist"))

if __name__ == '__main__':
    app.run(debug=True)


