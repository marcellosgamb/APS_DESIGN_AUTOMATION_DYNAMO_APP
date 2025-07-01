const initializeServer = require('./server');
const http = require('http');
const { Server } = require('socket.io');
const { PORT } = require('./src/config');

// Initialize Socket.IO first
const io = new Server();

// Create the Express app by passing the io instance
const app = initializeServer(io);

// Create HTTP server with the app
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
io.attach(server);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    // Pass the socket id to the client
    socket.emit('socketId', socket.id);
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Open in your browser: http://localhost:${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.\nExiting...`);
        process.exit(1);
    } else {
        console.error(err);
        process.exit(1);
    }
}); 