async function test() {
    try {
        const baseURL = 'http://localhost:5200/api';

        const timestamp = Date.now();
        const username = 'testuser' + timestamp;
        const email = `test${timestamp}@example.com`;
        const password = 'password123';

        console.log('1. Registering user...');
        const regRes = await fetch(`${baseURL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const regData = await regRes.json();
        console.log('Register status:', regRes.status);

        console.log('2. Logging in...');
        const logRes = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const logData = await logRes.json();
        const token = logData.token;

        console.log('3. Fetching user profile...');
        const profRes = await fetch(`${baseURL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profData = await profRes.json();
        console.log('Profile status:', profRes.status, profData);

    } catch (error) {
        console.error('Test script error:', error);
    }
}

test();
