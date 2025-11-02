const API = 'http://localhost:5002/api';

document.getElementById('tracking-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tracking-id').value;
    const res = await fetch(`${API}/track/${id}`);
    const result = document.getElementById('tracking-result');
    if (res.ok) {
        const data = await res.json();
        result.innerHTML = `
            <div class="card">
                <h3>Tracking ID: ${data.tracking_id}</h3>
                <p><strong>Status:</strong> <span class="badge badge-${data.status.replace(/_/g,'-')}">${data.status.replace(/_/g,' ').toUpperCase()}</span></p>
                ${data.sender_name ? `<p><strong>From:</strong> ${data.sender_name}</p>` : ''}
                ${data.recipient_name ? `<p><strong>To:</strong> ${data.recipient_name}${data.recipient_address ? ' - ' + data.recipient_address : ''}</p>` : ''}
                <h4 class="mt-2">Tracking History</h4>
                <div class="timeline">
                    ${data.history && data.history.length > 0 ? data.history.map(h => `
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div class="timeline-status">${h.status.replace(/_/g,' ').toUpperCase()}</div>
                                ${h.location ? `<div><strong>Location:</strong> ${h.location}</div>` : ''}
                                ${h.notes ? `<div>${h.notes}</div>` : ''}
                                <div class="timeline-time">${new Date(h.timestamp).toLocaleString()}</div>
                            </div>
                        </div>
                    `).join('') : '<p>No tracking history available yet.</p>'}
                </div>
            </div>
        `;
    } else {
        result.innerHTML = '<div class="alert alert-danger">Tracking ID not found</div>';
    }
});