const { any } = require('joi');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const videoConferenceRoomSchema = new Schema({
	_id: false,
	sid: String,
	status: String, 
	dateCreated: Date,
	dateUpdated: Date,
	url: String,
	links: {
		recordings: String,
		participants: String,
		recording_rules: String
	}
});

const schema = new Schema({
	account: { type: Schema.Types.ObjectId, ref: 'Account' },
	subject: String,
	startDateTime: Date,
	endDateTime: Date,
	registered: { type: Schema.Types.ObjectId, ref: 'Registered' },
	registerDate: Date,
	markedCompletedTutor: Boolean,
	markedCompletedStudent: Boolean,
	tutorContentRatingByStudent: Number,
	tutorBehaviourRatingByStudent: Number,
	studentBehaviourRatingByTutor: Number,
	deleted: Boolean,
	deleteDate: Date,
	videoConferenceRoom: videoConferenceRoomSchema
}, {
	timestamps: true
});

module.exports = mongoose.model('Slate', schema)