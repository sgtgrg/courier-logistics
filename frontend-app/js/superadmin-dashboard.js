const API = 'http://localhost:5002/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'superadmin') window.location.href = '../pages/superadmin-login.html';

document.getElementById('user-name').textContent = user.full_name;

function showSection(section) {
    document.querySelectorAll('.main-content > div').forEach(d => d.style.display = 'none');
    document.getElementById(`${section}-section`).style.display = 'block';
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    event.target.classList.add('active');
    if (section === 'overview') loadStats();
    if (section === 'users') loadUsers();
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

async function loadUsers() {
    try {
        const res = await fetch(`${API}/users`, {headers: {'Authorization': `Bearer ${token}`}});
        if (res.ok) {
            const users = await res.json();
            console.log('Loaded users:', users); // Debug log
            const list = document.getElementById('users-list');
            
            if (!list) {
                console.error('users-list element not found!');
                return;
            }
            
            // Separate users by role for better organization
            const admins = users.filter(u => u.role === 'admin');
            const customers = users.filter(u => u.role === 'customer');
            const superadmins = users.filter(u => u.role === 'superadmin');
            
            console.log(`Superadmins: ${superadmins.length}, Admins: ${admins.length}, Customers: ${customers.length}`);
            
            list.innerHTML = `
                <div class="mb-3">
                    <h3>Super Administrators (${superadmins.length})</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${superadmins.map(u => `
                                <tr>
                                    <td>${u.full_name}</td>
                                    <td>${u.email}</td>
                                    <td>${u.phone || 'N/A'}</td>
                                    <td><span class="badge badge-active">Active</span></td>
                                    <td><em>Protected Account</em></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="mb-3">
                    <h3>Administrators (${admins.length})</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${admins.length > 0 ? admins.map(u => `
                                <tr>
                                    <td>${u.full_name}</td>
                                    <td>${u.email}</td>
                                    <td>${u.phone || 'N/A'}</td>
                                    <td><span class="badge ${u.is_active ? 'badge-active' : 'badge-inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" onclick="toggleUser(${u.id})" title="Toggle status">
                                            ${u.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button class="btn btn-primary btn-sm" onclick="editUser(${u.id})" title="Edit user">
                                            Edit
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id}, 'admin')" title="Delete admin">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align:center;">No administrators yet. Create one using the "Create Admin" menu.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <div class="mb-3">
                    <h3>Customers (${customers.length})</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customers.length > 0 ? customers.map(u => `
                                <tr>
                                    <td>${u.full_name}</td>
                                    <td>${u.email}</td>
                                    <td>${u.phone || 'N/A'}</td>
                                    <td><span class="badge ${u.is_active ? 'badge-active' : 'badge-inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" onclick="toggleUser(${u.id})" title="Toggle status">
                                            ${u.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button class="btn btn-primary btn-sm" onclick="editUser(${u.id})" title="Edit user">
                                            Edit
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id}, 'customer')" title="Delete customer">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align:center;">No customers yet.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;
            
            console.log('User tables rendered successfully');
        } else {
            console.error('Failed to load users:', res.status, res.statusText);
            alert('Failed to load users');
        }
    } catch (error) {
        console.error('Error in loadUsers:', error);
        alert('Error loading users: ' + error.message);
    }
}

async function toggleUser(id) {
    if (!confirm('Are you sure?')) return;
    const res = await fetch(`${API}/users/${id}/toggle`, {
        method: 'PUT',
        headers: {'Authorization': `Bearer ${token}`}
    });
    if (res.ok) {
        alert('User status updated');
        loadUsers();
    }
}

async function editUser(id) {
    // Fetch fresh user data
    const res = await fetch(`${API}/users`, {headers: {'Authorization': `Bearer ${token}`}});
    if (!res.ok) {
        alert('Failed to load user data');
        return;
    }
    
    const users = await res.json();
    const user = users.find(u => u.id === id);
    
    if (!user) {
        alert('User not found');
        return;
    }
    
    const newName = prompt('Enter new full name:', user.full_name);
    if (!newName || newName === user.full_name) return;
    
    const newPhone = prompt('Enter new phone:', user.phone || '');
    if (newPhone === null) return;
    
    const updateRes = await fetch(`${API}/users/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            full_name: newName,
            phone: newPhone
        })
    });
    
    if (updateRes.ok) {
        alert('User updated successfully');
        loadUsers();
    } else {
        alert('Failed to update user');
    }
}

async function deleteUser(id, role) {
    // Fetch fresh user data
    const res = await fetch(`${API}/users`, {headers: {'Authorization': `Bearer ${token}`}});
    if (!res.ok) {
        alert('Failed to load user data');
        return;
    }
    
    const users = await res.json();
    const user = users.find(u => u.id === id);
    
    if (!user) {
        alert('User not found');
        return;
    }
    
    if (!confirm(`Are you sure you want to DELETE this ${role}?\n\nName: ${user.full_name}\nEmail: ${user.email}\n\nThis action cannot be undone and will remove all associated data.`)) return;
    
    const deleteRes = await fetch(`${API}/users/${id}`, {
        method: 'DELETE',
        headers: {'Authorization': `Bearer ${token}`}
    });
    
    if (deleteRes.ok) {
        alert(`${role.charAt(0).toUpperCase() + role.slice(1)} "${user.full_name}" deleted successfully`);
        loadUsers();
    } else {
        const err = await deleteRes.json();
        alert(err.error || `Failed to delete ${role}`);
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

async function deleteShipment(id) {
    if (!confirm('Delete this shipment?')) return;
    const res = await fetch(`${API}/shipments/${id}`, {
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


document.getElementById('create-admin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        full_name: document.getElementById('admin-name').value,
        email: document.getElementById('admin-email').value,
        phone: document.getElementById('admin-phone').value,
        password: document.getElementById('admin-password').value
    };
    const res = await fetch(`${API}/register/admin`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify(data)
    });
    if (res.ok) {
        alert('Admin account created successfully');
        e.target.reset();
        showSection('users');
    } else {
        const err = await res.json();
        alert(err.error || 'Failed to create admin');
    }
});

loadStats();