const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Starting server for FINAL VERIFICATION...');
const server = spawn('node', ['backend/server.js'], {
  stdio: 'pipe',
  cwd: __dirname
});

let serverOutput = '';
server.stdout.on('data', (data) => {
  const msg = data.toString();
  serverOutput += msg;
  console.log(`[SERVER] ${msg}`);
});
server.stderr.on('data', (data) => console.error(`[SERVER ERR] ${data.toString()}`));

const runTests = async () => {
  try {
    console.log('\n🧪 STEP 1: Forgot Password (trigger token)...');
    const forgotData = JSON.stringify({ email: 'joe@example.com' });
    const forgotRes = await request('POST', '/api/auth/forgotpassword', forgotData);
    console.log('Forgot Status:', forgotRes.status);
    
    // Use a small delay to ensure logs are flushed
    await new Promise(r => setTimeout(r, 2000));

    // Extract token from server logs
    // Look for reset-password.html?token=...
    const tokenMatch = serverOutput.match(/reset-password\.html\?token=([a-f0-9]+)/);
    if (!tokenMatch) {
      console.error('❌ Failed to find reset token in logs!');
      // print full log to help debug
      console.log('--- FULL SERVER LOG ---');
      console.log(serverOutput);
      console.log('-----------------------');
      server.kill();
      process.exit(1);
    }
    const token = tokenMatch[1];
    console.log('✅ Token extracted:', token);

    console.log('\n🧪 STEP 2: Reset Password (using PUT)...');
    const resetData = JSON.stringify({ password: 'finalpassword456' });
    const resetRes = await request('PUT', `/api/auth/resetpassword/${token}`, resetData);
    console.log('Reset Status:', resetRes.status);
    console.log('Reset Body:', resetRes.body);

    if (resetRes.status === 200 && JSON.parse(resetRes.body).success) {
      console.log('\n🌟 CONGRATULATIONS! RESET PASSWORD IS FULLY VERIFIED!');
    } else {
      console.error('\n❌ RESET PASSWORD VERIFICATION FAILED!');
    }

  } catch (err) {
    console.error('VERIFICATION CRASHED:', err);
  } finally {
    server.kill();
    process.exit(0);
  }
};

const request = (method, path, data) => {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Content-Length': data ? data.length : 0
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (data) req.write(data);
    req.end();
  });
};

// Wait for server to start
setTimeout(runTests, 8000);
