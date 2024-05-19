require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const Sentry = require('./libs/sentry');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));
app.use(express.json());
app.use('/socket.io', express.static(path.join(__dirname, 'node_modules/socket.io/client-dist')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});

const routes = require('./routes');
app.use('/api/v1', routes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Middleware untuk menyimpan io di req
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Store io instance in app.locals
// app.locals.io = io;
app.set ('io', io);

// Error handling
app.use(Sentry.Handlers.errorHandler());
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Handle 404
app.use((req, res, next) => {
    res.status(404).json({
        status: false,
        message: `Are you lost? ${req.method} ${req.url} is not registered!`,
        data: null
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on *: ${PORT}`);
});


module.exports = { app };