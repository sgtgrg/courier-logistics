const API = 'http://localhost:5002/api';

document.getElementById('superadmin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;
    const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password})
    });
    if (res.ok) {
        const data = await res.json();
        if (data.user.role === 'superadmin') {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '../dashboards/superadmin-dashboard.html';
        } else {
            alert('Super Admin access required');
        }
    } else {
        const err = await res.json();
        alert(err.error || 'Login failed');
    }
});
