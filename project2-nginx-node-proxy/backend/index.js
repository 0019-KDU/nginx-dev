const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const port = 3000;

app.use(cors());
app.use(express.json());

// ── REST routes ───────────────────────────────────
app.get('/api/hello', (req, res) => {
  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
  console.log(`Received request from IP: ${ip}`);
  res.json({ message: 'Hello from Node.js backend via NGINX proxy!' });
});

app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    server: 'Node.js + Express',
    uptime: process.uptime().toFixed(1) + 's',
    memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB',
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/random', (_req, res) => {
  const messages = [
    'Hello from Node.js backend via NGINX proxy!',
    'Nginx is proxying this response.',
    'Static files served by Nginx, API by Node.',
    'Socket.io WebSocket is also active!',
  ];
  res.json({ message: messages[Math.floor(Math.random() * messages.length)] });
});

// ── WebSocket (Socket.io) ─────────────────────────
const io = new Server(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log(`WebSocket client connected: ${socket.id}`);
  socket.emit('server_message', 'WebSocket Connected!');

  socket.on('client_message', (data) => {
    console.log(`Message from client: ${data}`);
    socket.emit('server_message', `Echo: ${data}`);
  });

  socket.on('disconnect', () => {
    console.log(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Broadcast current time every 5 seconds
setInterval(() => {
  io.emit('server_time', { time: new Date().toLocaleTimeString() });
}, 5000);

// ── Start ─────────────────────────────────────────
server.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening at http://0.0.0.0:${port}`);
});
