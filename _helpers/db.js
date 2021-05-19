const mongoose = require('mongoose');
const connectionOptions = { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false };

mongoose.connect(process.env.MONGODB_URI, connectionOptions).then(() => {
	console.log('Connected database: ' + mongoose.connection._connectionString);
}, error => {
	console.log('Database failed to connect: ' + error);
});

mongoose.Promise = global.Promise;

module.exports = {
	Account: require('accounts/account.model'),
	RefreshToken: require('accounts/refresh-token.model'),
	Slate: require('slate/slate.model'),
	Chat: require('message/chat.model'),
	Message: require('message/message.model'),
	isValidId
};

function isValidId(id) {
	return mongoose.Types.ObjectId.isValid(id);
}