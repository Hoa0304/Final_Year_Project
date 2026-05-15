
async function getAdminToken() {
  try {
    const response = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@HMall.com',
        password: 'admin123'
      })
    });
    const data = await response.json();
    if (data.token) {
      console.log('JWT_TOKEN:', data.token);
    } else {
      console.error('Error:', data);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getAdminToken();

