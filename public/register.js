document.getElementById('register-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    console.log('Form submitted'); // Add this line to check if the form is being submitted
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();
    if (response.ok) {
        alert('Registration successful! Please login.');
        window.location.href = '/login';
    } else {
        alert(data.message);
    }
});