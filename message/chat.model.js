const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
	userIds: [Schema.Types.ObjectId],
	chatInitiator: String
}, {
	timestamps: true
});

module.exports = mongoose.model('Chat', schema);