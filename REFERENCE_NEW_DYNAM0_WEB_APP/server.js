const express = require('express');
const path = require('path');
const morgan = require('morgan');

// Import modular routes
const tokenRouter = require('./src/routes/token');
const nicknameRouter = require('./src/routes/nickname');
const appbundleRouter = require('./src/routes/appbundle');
const activityRouter = require('./src/routes/activity');
const workitemRouter = require('./src/routes/workitem');
const accountRouter = require('./src/routes/account');
const bucketRouter = require('./src/routes/bucket');
const uploadRouter = require('./src/routes/upload');
const viewerRouter = require('./src/routes/viewer');
const authRouter = require('./src/routes/auth');

function initializeServer(io) {
    const app = express();

    app.set('io', io);

    app.use(morgan('[:date[iso]] :method :url'));
    app.use(express.json());
    app.use(express.urlencoded({
        extended: false
    }));
    app.use(express.static(path.join(__dirname, 'public')));
    
    // Wire up the new routes
    app.use('/api/aps/token', tokenRouter);
    app.use('/api/aps/nickname', nicknameRouter);
    app.use('/api/aps/appbundle', appbundleRouter);
    app.use('/api/aps/activity', activityRouter);
    app.use('/api/aps/workitem', workitemRouter);
    app.use('/api/aps/account', accountRouter);
    app.use('/api/aps/bucket', bucketRouter);
    app.use('/api/aps/upload', uploadRouter);
    app.use('/api/models', viewerRouter);
    app.use('/api/auth', authRouter);

    // Error handling
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(err.status || 500).json({
            message: err.message,
            error: err
        });
    });

    return app;
}

module.exports = initializeServer;