document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('message');
    msg.className = 'msg';
    msg.textContent = 'Creating account...';

    const userName = document.getElementById('userName').value;
    const emailId = document.getElementById('emailId').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName, emailId, password })
        });
        const data = await res.json();

        if (data.success) {
            msg.className = 'msg success';
            msg.textContent = 'Registration successful! Redirecting...';
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 800);
        } else {
            msg.className = 'msg error';
            msg.textContent = data.message || 'Registration failed';
        }
    } catch (err) {
        msg.className = 'msg error';
        msg.textContent = 'Network error occurred.';
    }
});
