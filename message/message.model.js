const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const readReceiptSchema = new Schema({
	_id: false,
	readByUserId: { type: Schema.Types.ObjectId, ref: 'ReadByUserId' },
	readAt: { type: Date, default: Date.now() }
});

const schema = new Schema({
	chatId: { type: Schema.Types.ObjectId, ref: 'ChatId' },
	message: mongoose.Schema.Types.Mixed,
	postedByUser: { type: Schema.Types.ObjectId, ref: 'PostedByUser' },
	readByRecipients: [readReceiptSchema]
}, {
	timestamps: true
});

module.exports = mongoose.model('Message', schema);