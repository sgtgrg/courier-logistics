# Courier Logistics Management System

## Complete Separated Backend & Frontend Architecture

### Project Structure

```
courier-system/
├── backend/
│   ├── app.py              # Flask REST API
│   └── requirements.txt    # Python dependencies
└── frontend/
    ├── index.html          # Landing page
    ├── css/
    │   └── style.css       # Professional styling
    ├── js/
    │   ├── main.js
    │   ├── customer.js
    │   ├── admin.js
    │   ├── superadmin.js
    │   ├── customer-dashboard.js
    │   ├── admin-dashboard.js
    │   └── superadmin-dashboard.js
    ├── pages/
    │   ├── customer-login.html
    │   ├── admin-login.html
    │   └── superadmin-login.html
    └── dashboards/
        ├── customer-dashboard.html
        ├── admin-dashboard.html
        └── superadmin-dashboard.html
```

## Quick Start

### 1. Start Backend (Terminal 1)

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Mac/Linux
# venv\Scripts\activate        # Windows
pip install -r requirements.txt
python app.py
```

Backend runs on: http://localhost:5002

### 2. Start Frontend (Terminal 2)

```bash
cd frontend
python -m http.server 3003
```

Frontend runs on: http://localhost:3003

### 3. Access the Application

Open browser: http://localhost:3003

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | superadmin@courier.com | superadmin123 |
| **Admin** | admin@courier.com | admin123 |
| **Customer** | customer@test.com | test123 |

## Features

### Customer Portal
- Self-registration
- Create shipments
- Track packages in real-time
- View shipment history
- QR code generation
- Dashboard with statistics

### Admin Portal
- View all shipments
- Update package status at checkpoints
- Add location and notes
- Dashboard with system-wide statistics
- Cannot access user management

### Super Admin Portal
- All admin features
- Create new admin accounts
- View all users
- Activate/deactivate user accounts
- Complete system control

## User Registration Flow

**Customers**: Can register themselves via the Customer Login page

**Admins**: Created ONLY by Super Admin
1. Login as Super Admin
2. Navigate to "Create Admin" section
3. Fill in admin details
4. New admin can now login via Admin Portal

**Super Admin**: Pre-configured (cannot be created through UI)

## API Endpoints

### Public Endpoints
- `POST /api/register/customer` - Customer registration
- `POST /api/login` - Login for all roles
- `GET /api/track/<tracking_id>` - Public tracking
- `GET /api/qr/<tracking_id>` - Generate QR code

### Authenticated Endpoints
- `POST /api/shipments` - Create shipment
- `GET /api/shipments` - Get shipments
- `GET /api/stats` - Get statistics
- `PUT /api/shipments/<id>/status` - Update status (Admin only)

### Super Admin Only
- `POST /api/register/admin` - Create admin account
- `GET /api/users` - Get all users
- `PUT /api/users/<id>/toggle` - Activate/deactivate user

## Technology Stack

### Backend
- Python 3.11+
- Flask 2.3.3
- SQLAlchemy (ORM)
- SQLite (Database)
- PyJWT (Authentication)
- Flask-CORS (API Access)

### Frontend
- HTML5
- CSS3 (Modern Professional Design)
- Vanilla JavaScript (ES6+)

## Key Features

- **Separated Architecture**: Backend and frontend completely independent
- **Role-Based Access Control**: Three-tier system (Customer → Admin → Super Admin)
- **JWT Authentication**: Secure token-based auth
- **Secure**: Password hashing, input validation

## Troubleshooting

**Backend won't start**
```bash
pip install -r requirements.txt --upgrade
```

**Frontend blank page**
```bash
# Make sure you're in the frontend folder
cd frontend
python -m http.server 3003
```

**Login doesn't work**
- Check backend terminal for initialization messages
- Database should create default users automatically

**CORS errors**
- Backend has CORS enabled
- Ensure backend is running on port 5002

## Security Features

- Password hashing with Werkzeug
- JWT token authentication
- Role-based access control
- Protected API endpoints
- Input validation
- XSS protection

## Development

To modify the system:

1. **Backend changes**: Edit `backend/app.py`
2. **Frontend styling**: Edit `frontend/css/style.css`
3. **Frontend logic**: Edit files in `frontend/js/`
4. **Add pages**: Create in `frontend/pages/` or `frontend/dashboards/`

## Production Deployment

Before deploying to production:

1. Change SECRET_KEY in app.py
2. Switch to PostgreSQL
3. Enable HTTPS/SSL
4. Set up proper logging
5. Configure backups
6. Add rate limiting
7. Enable email notifications

## License

This project is for educational and commercial use.
