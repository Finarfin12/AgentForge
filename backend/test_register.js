async function test() {
  try {
    const r = await fetch('http://localhost:3002/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dev', email: 'dev@test.com', password: 'developer123', displayName: 'Dev' }),
    });
    console.log('Status:', r.status);
    const text = await r.text();
    console.log('Response:', text.substring(0, 200));
  } catch(e) {
    console.log('Error:', e.message);
  }
}
test();
