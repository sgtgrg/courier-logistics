const API = 'http://localhost:5002/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || !['admin','superadmin'].includes(user.role)) window.location.href = '../pages/admin-login.html';

document.getElementById('user-name').textContent = user.full_name;

function showSection(section) {
    document.querySelectorAll('.main-content > div').forEach(d => d.style.display = 'none');
    document.getElementById(`${section}-section`).style.display = 'block';
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    event.target.classList.add('active');
    if (section === 'overview') loadStats();
    if (section === 'shipments') loadShipments();
}

function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}

async function loadStats() {
    const res = await fetch(`${API}/stats`, {headers: {'Authorization': `Bearer ${token}`}});
    if (res.ok) {
        const data = await res.json();
        document.getElementById('total').textContent = data.total_shipments;
        document.getElementById('delivered').textContent = data.delivered;
        document.getElementById('transit').textContent = data.in_transit;
        document.getElementById('customers').textContent = data.total_customers;
    }
}

async function loadShipments() {
    const res = await fetch(`${API}/shipments`, {headers: {'Authorization': `Bearer ${token}`}});
    if (res.ok) {
        const ships = await res.json();
        document.getElementById('shipments-list').innerHTML = ships.map(s => `
            <div class="card">
                <h3>${s.tracking_id}</h3>
                <span class="badge badge-${s.status.replace(/_/g,'-')}">${s.status.replace(/_/g,' ').toUpperCase()}</span>
                <p><strong>From:</strong> ${s.sender_name} <strong>To:</strong> ${s.recipient_name}</p>
                <p><strong>Destination:</strong> ${s.recipient_address}</p>
                <p><strong>Weight:</strong> ${s.package_weight}kg | <strong>Payment:</strong> $${(s.amount_paid || 0).toFixed(2)} (${s.payment_method})</p>
                <button class="btn btn-primary" onclick="openUpdateModal(${s.id}, '${s.status}')">Update Status</button>
                <button class="btn btn-danger" onclick="deleteShipment(${s.id})">Delete</button>
            </div>
        `).join('');
    }
}

function openUpdateModal(id, status) {
    document.getElementById('update-id').value = id;
    document.getElementById('update-status').value = status;
    document.getElementById('update-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('update-modal').classList.remove('active');
}

document.getElementById('update-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('update-id').value;
    const data = {
        status: document.getElementById('update-status').value,
        location: document.getElementById('update-location').value,
        notes: document.getElementById('update-notes').value
    };
    const res = await fetch(`${API}/shipments/${id}/status`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify(data)
    });
    if (res.ok) {
        alert('Status updated successfully');
        closeModal();
        loadShipments();
    } else {
        alert('Update failed');
    }
});

loadStats();


document.getElementById('create-form-admin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const data = {
        customer_email: document.getElementById('customer-email').value,
        sender_name: document.getElementById('sender-name').value,
        sender_phone: document.getElementById('sender-phone').value,
        sender_address: document.getElementById('sender-address').value,
        recipient_name: document.getElementById('recipient-name').value,
        recipient_phone: document.getElementById('recipient-phone').value,
        recipient_address: document.getElementById('recipient-address').value,
        package_weight: parseFloat(document.getElementById('package-weight').value),
        package_description: document.getElementById('package-description').value,
        payment_method: document.getElementById('payment-method').value,
        amount_paid: parseFloat(document.getElementById('amount-paid').value),
        status: document.getElementById('initial-status').value
    };
    const res = await fetch(`${API}/shipments`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify(data)
    });
    if (res.ok) {
        const result = await res.json();
        alert(`Shipment created. Tracking ID: ${result.tracking_id}`);
        e.target.reset();
        showSection('shipments');
    } else {
        const err = await res.json();
        alert(err.error || 'Create failed');
    }
});

async function deleteShipment(id) {
    const token = localStorage.getItem('token');
    if (!confirm('Delete this shipment?')) return;
    const res = await fetch(`${API}/shipments/` + id, {
        method: 'DELETE',
        headers: {'Authorization': `Bearer ${token}`}
    });
    if (res.ok) {
        loadShipments();
    } else {
        const err = await res.json();
        alert(err.error || 'Delete failed');
    }
}
