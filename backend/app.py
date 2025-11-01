from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import datetime, io, secrets, jwt

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///courier.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


CORS(app, resources={r"/*": {"origins": "*"}}, expose_headers="Authorization")
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    role = db.Column(db.String(20), default='customer')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    shipments = db.relationship('Shipment', backref='customer', lazy=True)

class Shipment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tracking_id = db.Column(db.String(20), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sender_name = db.Column(db.String(100), nullable=False)
    sender_phone = db.Column(db.String(20), nullable=False)
    sender_address = db.Column(db.Text, nullable=False)
    recipient_name = db.Column(db.String(100), nullable=False)
    recipient_phone = db.Column(db.String(20), nullable=False)
    recipient_address = db.Column(db.Text, nullable=False)
    package_weight = db.Column(db.Float, nullable=False)
    package_description = db.Column(db.Text)
    payment_method = db.Column(db.String(20), nullable=False)
    amount_paid = db.Column(db.Float, nullable=False, default=0.0)
    status = db.Column(db.String(50), default='payment_received')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    history = db.relationship('TrackingEvent', backref='shipment', lazy=True, cascade="all, delete-orphan")

class TrackingEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shipment_id = db.Column(db.Integer, db.ForeignKey('shipment.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(200))
    notes = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

def generate_tracking_id():
    import random, string
    while True:
        tid = 'TRK' + ''.join(random.choices(string.digits, k=10))
        if not Shipment.query.filter_by(tracking_id=tid).first():
            return tid

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split()
            if len(parts) == 2 and parts[0] == 'Bearer':
                token = parts[1]
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user or not current_user.is_active:
                return jsonify({'error': 'Invalid user'}), 401
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def role_required(roles):
    def inner(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            if current_user.role not in roles:
                return jsonify({'error': 'Forbidden'}), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return inner

@app.route('/api/register/customer', methods=['POST'])
def register_customer():
    data = request.get_json()
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    user = User(
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        full_name=data['full_name'],
        phone=data.get('phone', ''),
        role='customer'
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Customer registered'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }, app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'full_name': user.full_name
        }
    })

@app.route('/api/register/admin', methods=['POST'])
@token_required
@role_required(['superadmin'])
def create_admin(current_user):
    data = request.get_json()
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email exists'}), 400
    admin = User(email=data['email'],
                 password_hash=generate_password_hash(data['password']),
                 full_name=data['full_name'],
                 phone=data.get('phone',''),
                 role='admin')
    db.session.add(admin)
    db.session.commit()
    return jsonify({'message': 'Admin created'})

@app.route('/api/users', methods=['GET'])
@token_required
@role_required(['superadmin'])
def list_users(current_user):
    users = User.query.all()
    return jsonify([{
        'id': u.id, 'email': u.email, 'role': u.role,
        'full_name': u.full_name, 'phone': u.phone, 'is_active': u.is_active
    } for u in users])

@app.route('/api/users/<int:uid>', methods=['PUT'])
@token_required
@role_required(['superadmin'])
def update_user(current_user, uid):
    u = User.query.get_or_404(uid)
    data = request.get_json()
    u.full_name = data.get('full_name', u.full_name)
    u.phone = data.get('phone', u.phone)
    if 'role' in data:
        u.role = data['role']
    u.is_active = data.get('is_active', u.is_active)
    db.session.commit()
    return jsonify({'message': 'User updated'})

@app.route('/api/users/<int:uid>/toggle', methods=['PUT'])
@token_required
@role_required(['superadmin'])
def toggle_user_status(current_user, uid):
    u = User.query.get_or_404(uid)
    u.is_active = not u.is_active
    db.session.commit()
    return jsonify({'message': 'User status toggled', 'is_active': u.is_active})

@app.route('/api/users/<int:uid>', methods=['DELETE'])
@token_required
@role_required(['superadmin'])
def delete_user(current_user, uid):
    if uid == current_user.id:
        return jsonify({'error': 'Cannot delete yourself'}), 400
    u = User.query.get_or_404(uid)
    db.session.delete(u)
    db.session.commit()
    return jsonify({'message': 'User deleted'})

@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    if current_user.role in ['admin', 'superadmin']:
        return jsonify({
            "total_shipments": Shipment.query.count(),
            "delivered": Shipment.query.filter_by(status='delivered').count(),
            "in_transit": Shipment.query.filter_by(status='in_transit').count(),
            "customers": User.query.filter_by(role='customer').count(),
            "total_customers": User.query.filter_by(role='customer').count()
        })
    else:
        # Customer stats - only their own shipments
        return jsonify({
            "total_shipments": Shipment.query.filter_by(customer_id=current_user.id).count(),
            "delivered": Shipment.query.filter_by(customer_id=current_user.id, status='delivered').count()
        })

@app.route('/api/shipments', methods=['POST'])
@token_required
@role_required(['admin','superadmin'])
def create_shipment(current_user):
    data = request.get_json()
    customer = None
    if 'customer_email' in data:
        customer = User.query.filter_by(email=data['customer_email']).first()
    elif 'customer_id' in data:
        customer = User.query.get(data['customer_id'])
    if not customer or customer.role != 'customer':
        return jsonify({'error': 'Invalid customer'}), 400
    tid = generate_tracking_id()
    ship = Shipment(
        tracking_id=tid,
        customer_id=customer.id,
        sender_name=data['sender_name'],
        sender_phone=data['sender_phone'],
        sender_address=data['sender_address'],
        recipient_name=data['recipient_name'],
        recipient_phone=data['recipient_phone'],
        recipient_address=data['recipient_address'],
        package_weight=float(data['package_weight']),
        package_description=data.get('package_description', ''),
        payment_method=data['payment_method'],
        amount_paid=float(data['amount_paid']),
        status=data.get('status', 'payment_received')
    )
    db.session.add(ship)
    first = TrackingEvent(shipment=ship, status=ship.status, location='Store', notes='Shipment created')
    db.session.add(first)
    db.session.commit()
    return jsonify({'tracking_id': tid, 'message': 'Shipment created'}), 201

@app.route('/api/shipments', methods=['GET'])
@token_required
def list_shipments(current_user):
    if current_user.role in ['admin','superadmin']:
        ships = Shipment.query.order_by(Shipment.created_at.desc()).all()
    else:
        ships = Shipment.query.filter_by(customer_id=current_user.id).order_by(Shipment.created_at.desc()).all()
    return jsonify([{
        'id': s.id, 'tracking_id': s.tracking_id, 'status': s.status,
        'customer_id': s.customer_id, 'sender_name': s.sender_name,
        'recipient_name': s.recipient_name,
        'package_weight': s.package_weight,
        'payment_method': s.payment_method,
        'amount_paid': s.amount_paid,
        'created_at': s.created_at.isoformat(),
        'recipient_address': s.recipient_address
    } for s in ships])

@app.route('/api/shipments/<int:sid>', methods=['PUT'])
@token_required
@role_required(['admin','superadmin'])
def edit_shipment(current_user, sid):
    data = request.get_json()
    s = Shipment.query.get_or_404(sid)
    for field in ['sender_name','sender_phone','sender_address','recipient_name','recipient_phone','recipient_address','package_weight','package_description','payment_method','amount_paid']:
        if field in data:
            setattr(s, field, data[field])
    if 'customer_email' in data:
        cust = User.query.filter_by(email=data['customer_email']).first()
        if not cust or cust.role != 'customer':
            return jsonify({'error': 'Customer invalid'}), 400
        s.customer_id = cust.id
    db.session.commit()
    return jsonify({'message': 'Shipment updated'})

@app.route('/api/shipments/<int:sid>', methods=['DELETE'])
@token_required
@role_required(['admin','superadmin'])
def delete_shipment(current_user, sid):
    s = Shipment.query.get_or_404(sid)
    db.session.delete(s)
    db.session.commit()
    return jsonify({'message': 'Shipment deleted'})

@app.route('/api/shipments/<int:sid>/status', methods=['PUT'])
@token_required
@role_required(['admin','superadmin'])
def update_status(current_user, sid):
    data = request.get_json()
    s = Shipment.query.get_or_404(sid)
    s.status = data['status']
    ev = TrackingEvent(shipment_id=sid, status=data['status'], location=data.get('location',''), notes=data.get('notes',''))
    db.session.add(ev)
    db.session.commit()
    return jsonify({'message': 'Status updated'})

@app.route('/api/shipments/<int:sid>/history', methods=['GET'])
@token_required
def get_history(current_user, sid):
    s = Shipment.query.get_or_404(sid)
    if current_user.role == 'customer' and s.customer_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    hist = TrackingEvent.query.filter_by(shipment_id=sid).order_by(TrackingEvent.timestamp).all()
    return jsonify([{
        'status': h.status, 'location': h.location,
        'notes': h.notes, 'timestamp': h.timestamp.isoformat()
    } for h in hist])

@app.route('/api/track/<tracking_id>', methods=['GET'])
def track_public(tracking_id):
    s = Shipment.query.filter_by(tracking_id=tracking_id).first()
    if not s:
        return jsonify({'error': 'Not found'}), 404
    hist = TrackingEvent.query.filter_by(shipment_id=s.id).order_by(TrackingEvent.timestamp).all()
    return jsonify({
        'tracking_id': s.tracking_id,
        'status': s.status,
        'sender_name': s.sender_name,
        'recipient_name': s.recipient_name,
        'recipient_address': s.recipient_address,
        'history': [{
            'status': h.status, 'location': h.location,
            'notes': h.notes, 'timestamp': h.timestamp.isoformat()
        } for h in hist]
    })

def seed():
    if not User.query.filter_by(role='superadmin').first():
        db.session.add(User(
            email='superadmin@courier.com',
            password_hash=generate_password_hash('superadmin123'),
            full_name='Super Administrator',
            phone='0000000000',
            role='superadmin'
        ))
    if not User.query.filter_by(email='admin@courier.com').first():
        db.session.add(User(
            email='admin@courier.com',
            password_hash=generate_password_hash('admin123'),
            full_name='Admin User',
            phone='1111111111',
            role='admin'
        ))
    if not User.query.filter_by(email='customer@test.com').first():
        db.session.add(User(
            email='customer@test.com',
            password_hash=generate_password_hash('test123'),
            full_name='Test Customer',
            phone='2222222222',
            role='customer'
        ))
    db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed()
    print("Backend running at http://localhost:5002")
    app.run(debug=True, host='0.0.0.0', port=5002)