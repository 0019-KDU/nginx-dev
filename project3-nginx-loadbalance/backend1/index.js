const express = require('express');
const app = express();
const port = 3001;

// Middleware to log all incoming requests
app.use((req, res, next) => {
  const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
  console.log(`[Backend1] ${new Date().toISOString()} - ${req.method} ${req.url} from ${ip}`);
  next();
});

app.get('/api/', (req, res) => {
  res.send('Response from Backend Server 1');
});

app.get('/api/info', (req, res) => {
  res.json({
    server: 'Backend 1',
    port: port,
    uptime: process.uptime().toFixed(1) + 's',
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend Server 1 running at http://0.0.0.0:${port}`);
});
