fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'swathi1811@gmail.com', password: 'password123' })
})
.then(res => res.json())
.then(data => console.log('Response:', JSON.stringify(data, null, 2)))
.catch(err => console.error('Fetch error:', err));
