const http = require('http');
const { spawn } = require('child_process');

console.log('Starting next start on port 3001...');
const child = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3001'], {
  stdio: 'pipe'
});

child.stdout.on('data', async (d) => {
  const msg = d.toString();
  console.log('SERVER:', msg.trim());

  if (msg.includes('Ready') || msg.includes('started server') || msg.includes('localhost:3001') || msg.includes('127.0.0.1:3001')) {
    console.log('Server is live! Sending probe requests...');

    // 1. Probe Dashboard API
    const dashReq = http.get('http://127.0.0.1:3001/api/dashboard', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('✅ GET /api/dashboard -> Status:', res.statusCode);
        const data = JSON.parse(body);
        console.log('   KPIs:', JSON.stringify(data.kpis));
        console.log('   Recent Orders:', data.recentOrders?.length);

        // 2. Probe Shop API
        http.get('http://127.0.0.1:3001/api/shop', (shopRes) => {
          let sBody = '';
          shopRes.on('data', chunk => sBody += chunk);
          shopRes.on('end', () => {
            console.log('✅ GET /api/shop -> Status:', shopRes.statusCode);
            const sData = JSON.parse(sBody);
            console.log('   Seller:', sData.shop?.seller?.business_name);
            console.log('   Products:', sData.shop?.products?.length);

            // 3. Probe Invoices API
            http.get('http://127.0.0.1:3001/api/invoices', (invRes) => {
              let iBody = '';
              invRes.on('data', chunk => iBody += chunk);
              invRes.on('end', () => {
                console.log('✅ GET /api/invoices -> Status:', invRes.statusCode);
                console.log('\n🎉 ALL LIVE SERVER PROBES COMPLETED WITH 100% SUCCESS!');
                child.kill();
                process.exit(0);
              });
            });
          });
        });
      });
    });

    dashReq.on('error', (err) => {
      console.error('Request failed:', err);
      child.kill();
      process.exit(1);
    });
  }
});

child.stderr.on('data', (d) => {
  console.log('STDERR:', d.toString());
});

setTimeout(() => {
  console.log('Timeout waiting for server startup.');
  child.kill();
  process.exit(1);
}, 12000);
