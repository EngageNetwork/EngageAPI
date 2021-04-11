// IMPORTANT
require('dotenv').config();

// Required Modules and Components
require('rootpath')();
const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').Server(app);
global.io = require('socket.io')(http);
const twilio = require('twilio');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const errorHandler = require('_middleware/error-handler');
const WebSockets = require('_utils/websockets')

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// Allow CORS requests from any origin with proper credentials
app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));

// API Routes
app.use('/accounts', require('./accounts/accounts.controller'));
app.use('/slate', require('./slate/slate.controller'));
app.use('/message', require('./message/message.controller'));

// Swagger API Documentation Routes
app.use('/api-docs', require('_helpers/swagger'));

// Global Backend Error Handler
app.use(errorHandler);

// Initialize Socket Connection
global.io.on('connection', (socket) => WebSockets.connection(socket));

// Server Initialization
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;
app.listen(port, () => {
	console.log('Server listening on port ' + port);
});
