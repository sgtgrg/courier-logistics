const API = 'http://localhost:5002/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'customer') window.location.href = '../pages/customer-login.html';

document.getElementById('user-name').textContent = user.full_name;

function showSection(section) {
    document.querySelectorAll('.main-content > div').forEach(d => d.style.display = 'none');
    document.getElementById(`${section}-section`).style.display = 'block';
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    event.target.classList.add('active');
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
        document.getElementById('total-shipments').textContent = data.total_shipments;
        document.getElementById('delivered-count').textContent = data.delivered;
    }
}

async function loadShipments() {
    const res = await fetch(`${API}/shipments`, {headers: {'Authorization': `Bearer ${token}`}});
    if (res.ok) {
        const ships = await res.json();
        const list = document.getElementById('shipments-list');
        if (ships.length === 0) {
            list.innerHTML = '<p>No shipments found</p>';
        } else {
            list.innerHTML = ships.map(s => `
                <div class="card">
                    <h3>${s.tracking_id}</h3>
                    <span class="badge badge-${s.status.replace(/_/g,'-')}">${s.status.replace(/_/g,' ').toUpperCase()}</span>
                    <p><strong>From:</strong> ${s.sender_name} <strong>To:</strong> ${s.recipient_name}</p>
                    <p><strong>Amount:</strong> $${(s.amount_paid || 0).toFixed(2)} | <strong>Created:</strong> ${new Date(s.created_at).toLocaleDateString()}</p>
                    <button class="btn btn-primary" onclick="viewHistory('${s.tracking_id}', ${s.id})">View History</button>
                </div>
            `).join('');
        }
    }
}

document.getElementById('shipment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        sender_name: document.getElementById('sender-name').value,
        sender_phone: document.getElementById('sender-phone').value,
        sender_address: document.getElementById('sender-address').value,
        recipient_name: document.getElementById('recipient-name').value,
        recipient_phone: document.getElementById('recipient-phone').value,
        recipient_address: document.getElementById('recipient-address').value,
        package_weight: parseFloat(document.getElementById('package-weight').value),
        package_description: document.getElementById('package-description').value,
        payment_method: document.getElementById('payment-method').value,
        amount_paid: parseFloat(document.getElementById('amount-paid').value)
    };
    const res = await fetch(`${API}/shipments`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify(data)
    });
    if (res.ok) {
        const result = await res.json();
        alert(`Shipment created! Tracking ID: ${result.tracking_id}`);
        e.target.reset();
        showSection('shipments');
    } else {
        alert('Failed to create shipment');
    }
});

loadStats();


async function viewHistory(trackingId, shipmentId) {
    // Display a simple modal-like alert with history; in a real app hook to modal UI
    const res = await fetch(`${API}/shipments/` + shipmentId + '/history', {
        headers: {'Authorization': `Bearer ${token}`}
    });
    if (res.ok) {
        const history = await res.json();
        const lines = history.map(h => `${h.timestamp} - ${h.status}${h.location ? ' @ ' + h.location : ''}${h.notes ? ' - ' + h.notes : ''}`).join('\n');
        alert(`Tracking ID: ${trackingId}\n\nHistory:\n` + lines);
    } else {
        alert('Failed to load history');
    }
}
