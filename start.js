// start.js - Initialize the unified server
require('dotenv').config();
const app = require('./server.js');

const PORT = process.env.PORT;

// Start server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Open in your browser: http://localhost:${PORT}`);
});

// Handle server errors
app.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.\nExiting...`);
        process.exit(1);
    } else {
        console.error(err);
        process.exit(1);
    }
}); 