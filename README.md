# 📚 Meddy Stationery – Assignment Cover Page & Customer Management System

A user-friendly web application built with Django to help stationery businesses manage their printing services, customer data, and assignment cover page generation for student customers.

> **Perfect for:** Print shops, stationery businesses, and copy centers located near educational institutions that serve students with assignment printing and cover page services.

---

## 🎯 What is Meddy Stationery?

Meddy Stationery is a complete management system for your printing and stationery business that helps you:

- 📄 **Generate Assignment Cover Pages** - Quickly create professional cover pages for student customers
- 👨‍🎓 **Customer Database** - Store customer (student) information for repeat business
- 📖 **Course & Program Catalog** - Keep a library of courses and programs your customers attend
- 👨‍🏫 **Facilitator Directory** - Maintain a database of teachers/facilitators for accurate cover pages
- 📦 **Stationery Inventory** - Track your printing supplies, paper stock, and materials
- 📊 **Business Dashboard** - View daily statistics, revenue, and popular services
- 💼 **Order History** - Track all cover pages generated and services provided

---

## 💡 How It Works

Your stationery business is located near an educational institution (like TPSC - Tanzania Public Service College). When students come to your shop to print their assignments:

1. **Student provides their details** - Name, registration number, program, course, facilitator
2. **You enter the information** - Add or select existing data from your database
3. **Generate cover page** - System creates a professional cover page instantly
4. **Print and deliver** - Print the cover page along with their assignment
5. **Data saved** - Customer information is stored for faster service next time

**Business Benefits:**
- ⚡ Faster service - Repeat customers don't need to provide details again
- 📈 Track popular courses and programs
- 💰 Monitor daily cover pages generated (potential revenue tracking)
- 🎯 Better customer service with saved preferences
- 📊 Business insights from your dashboard

---

## ✨ Key Features

✅ Fast cover page generation for student customers  
✅ Customer database for repeat business efficiency  
✅ Real-time business dashboard with daily metrics  
✅ Excel export for business reports and records  
✅ Course and program library (TPSC, universities, etc.)  
✅ Facilitator directory for accurate cover pages  
✅ Inventory tracking for paper, ink, and supplies  
✅ Group and individual assignment support  
✅ Professional cover page templates  
✅ Quick search for returning customers  

---

## 🛠️ Technology Stack

This project is built with:

- **Python 3.10+** - Programming language
- **Django 6.0** - Web framework (handles the backend)
- **SQLite** - Database (can be upgraded to PostgreSQL/MySQL)
- **HTML/CSS/JavaScript** - Frontend interface
- **Bootstrap/Custom CSS** - Styling and responsive design

**Key Libraries:**
- `openpyxl` - For Excel file handling
- `whitenoise` - For serving static files efficiently
- `python-dateutil` - For date/time handling

---

## 📁 Project Structure

Here's how the project is organized:

```
meddy/
├── manage.py                    # Django's command-line utility
├── meddy/                       # Main project settings
│   ├── settings.py             # Configuration (database, apps, etc.)
│   ├── urls.py                 # URL routing
│   └── wsgi.py                 # Deployment configuration
├── apps/                        # Application modules
│   ├── courses/                # Course catalog management
│   ├── dashboard/              # Business dashboard & analytics
│   ├── facilitators/           # Facilitator/teacher directory
│   ├── programs/               # Academic program catalog
│   ├── stationery/             # Inventory management
│   └── students/               # Customer (student) management
├── static/                      # CSS, JavaScript, images
├── templates/                   # HTML templates
├── meddy_stationery.sqlite3    # Database file
└── requirements.txt             # List of dependencies
```

**What each folder does:**
- `apps/` - Contains separate modules for different business functions (customers, services, inventory)
- `static/` - Stores CSS files, JavaScript, and images for your business interface
- `templates/` - Contains HTML files that define how your service pages look
- `meddy_stationery.sqlite3` - Your business database where customer data and records are stored

---

## 🚀 Getting Started (Step-by-Step)

### Prerequisites

Before you begin, make sure you have:
- **Python 3.10 or higher** installed ([Download here](https://www.python.org/downloads/))
- **pip** (Python package manager - comes with Python)
- A **code editor** like VS Code (optional but recommended)

### Step 1: Download the Project

Download or clone this repository to your computer:

```bash
git clone <repository-url>
cd meddy
```

### Step 2: Create a Virtual Environment

A virtual environment keeps your project dependencies isolated. Think of it as a separate workspace for this project.

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On Windows (Command Prompt):**
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

✅ You'll know it worked when you see `(venv)` at the start of your command line.

### Step 3: Install Dependencies

Install all the required packages:

```bash
pip install -r requirements.txt
```

This will download and install Django and all other necessary libraries.

### Step 4: Set Up the Database

Run these commands to create your database tables:

```bash
python manage.py migrate
```

**What this does:** Creates all the necessary database tables for courses, students, facilitators, etc.

### Step 5: Create an Admin Account

Create a superuser account to access the admin panel:

```bash
python manage.py createsuperuser
```

You'll be asked to enter:
- Username (e.g., `admin`)
- Email address (optional)
- Password (type carefully - it won't show on screen)

### Step 6: Run the Development Server

Start the web server:

```bash
python manage.py runserver
```

✅ **Success!** You should see output like:
```
Starting development server at http://127.0.0.1:8000/
```

### Step 7: Access the Application

Open your web browser and go to:

- **Main site:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Admin panel:** [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

Log in to the admin panel with the username and password you created in Step 5.

---

## 📖 How to Use Your Stationery System

### Setting Up Your Business Data

1. **Log into Admin Panel** - Go to `/admin/` and log in with your credentials
2. **Add Programs** - Add programs like "Bachelor in Records & Archives" that your customers attend
3. **Add Courses** - Add courses like "Business Communication Practices" 
4. **Add Facilitators** - Add teachers/facilitators like "Sir Mwailunga, O. M."
5. **Add Customers** - When students visit, add their information to your customer database

### Daily Business Operations

**When a customer arrives for cover page service:**

1. **Search for existing customer** - Check if they've visited before using their name or registration number
2. **Add new customer (if first time)** - Enter their name, registration number, program
3. **Select their course and facilitator** - Choose from your database
4. **Choose assignment type** - Individual or Group assignment
5. **Generate cover page** - Click generate to create the professional cover page
6. **Print and charge** - Print the cover page and complete the transaction
7. **Next customer** - Their data is now saved for future visits!

### Viewing Your Business Dashboard

Visit the dashboard at `/dashboard/` to see:
- Total customers served
- Cover pages generated today/this week/this month
- Most popular programs and courses
- Revenue tracking (if enabled)
- Inventory levels for paper and supplies
- Recent transactions

### Managing Your Inventory

1. Go to "Stationery" section in admin
2. Add items like A4 paper, ink cartridges, binding materials
3. Update stock levels when you restock
4. Track usage and reorder when low

---

## 🧪 Running Tests

To make sure everything works correctly, run the test suite:

```bash
python manage.py test
```

This will check that all features are working as expected.

---

## 🔧 Common Issues & Solutions

### Issue: "python is not recognized"
**Solution:** Python is not installed or not in your PATH. [Download Python](https://www.python.org/downloads/) and make sure to check "Add Python to PATH" during installation.

### Issue: "Access Denied" when activating virtual environment
**Solution:** On Windows, run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "Port 8000 is already in use"
**Solution:** Either:
- Stop the other application using port 8000, or
- Run on a different port: `python manage.py runserver 8080`

### Issue: Database errors after pulling updates
**Solution:** Run migrations again:
```bash
python manage.py migrate
```

---

## 📚 Additional Resources

**New to Django?** Check out these resources:
- [Django Official Tutorial](https://docs.djangoproject.com/en/stable/intro/tutorial01/)
- [Django Girls Tutorial](https://tutorial.djangogirls.org/)
- [Python for Beginners](https://www.python.org/about/gettingstarted/)

**Need help?**
- Check the [Django Documentation](https://docs.djangoproject.com/)
- Search for answers on [Stack Overflow](https://stackoverflow.com/questions/tagged/django)

---

## 🤝 Contributing

Found a bug or want to add a feature? Contributions are welcome!

1. Fork the repository
2. Create a new branch: `git checkout -b feature-name`
3. Make your changes
4. Test your changes: `python manage.py test`
5. Commit: `git commit -m "Add feature description"`
6. Push: `git push origin feature-name`
7. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 Developer

Developed by **Fidon_developer**  
Contact: +255 713 529 019

---

## 🎓 About This Project

Meddy Stationery System was created to help print shops and stationery businesses that serve educational institutions in Tanzania. It streamlines the process of creating professional assignment cover pages for student customers while maintaining a customer database for efficient repeat business.

**Key Use Case:** A stationery shop near TPSC (Tanzania Public Service College) where students come to print their assignments. Instead of manually creating cover pages or typing details each time, the system:
- Stores customer information securely
- Generates professional cover pages instantly
- Tracks business metrics and popular services
- Manages inventory for printing supplies

**Built with ❤️ for stationery business owners and entrepreneurs.**