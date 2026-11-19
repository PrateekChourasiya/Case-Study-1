document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('message');
    msg.className = 'msg';
    msg.textContent = 'Logging in...';

    const emailId = document.getElementById('emailId').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailId, password })
        });
        const data = await res.json();

        if (data.success) {
            msg.className = 'msg success';
            msg.textContent = 'Login successful! Redirecting...';
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 800);
        } else {
            msg.className = 'msg error';
            msg.textContent = data.message || 'Login failed';
        }
    } catch (err) {
        msg.className = 'msg error';
        msg.textContent = 'Network error occurred.';
    }
});
