const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
	from: { type: Schema.Types.ObjectId, ref: 'From' },
	to: { type: Schema.Types.ObjectId, ref: 'To' },
	message: String,
	date: Date
})

const schema = new Schema({
	account1: { type: Schema.Types.ObjectId, ref: 'Account1' },
	account2: { type: Schema.Types.ObjectId, ref: 'Account2' },
	messages: messageSchema,
	created: Date
});

module.exports = mongoose.model('Messages', schema);