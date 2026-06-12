async function run() {
  try {
    // 1. Login to get token
    const loginRes = await fetch('https://design-vallet-api-5bv0.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@designvallet.com', password: 'user123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Token successfully retrieved.');

    // 2. Initiate order for image_id: 1
    const orderRes = await fetch('https://design-vallet-api-5bv0.onrender.com/api/payments/order', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ image_id: 27 })
    });
    const orderData = await orderRes.json();
    console.log('Order Data returned by Render:');
    console.log(JSON.stringify(orderData, null, 2));
  } catch (e) {
    console.error('Test failed:', e);
  }
}

run();
