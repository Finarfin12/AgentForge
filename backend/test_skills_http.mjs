const login = await fetch('http://localhost:3002/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({identifier: 'admin', password: 'admin123'}),
});
const { token } = await login.json();

const res = await fetch('http://localhost:3002/skills', {
  headers: {Authorization: `Bearer ${token}`},
});
console.log('Status:', res.status);
const text = await res.text();
console.log('Body:', text.substring(0, 500));
