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
	details: String,
	startDateTime: Date,
	endDateTime: Date,
	registered: { type: Schema.Types.ObjectId, ref: 'Registered' },
	registerDate: Date,
	markedCompletedTutor: Boolean,
	markedCompletedStudent: Boolean,
	sessionDuration: Number,
	tutorContentRatingByStudent: Number,
	tutorBehaviourRatingByStudent: Number,
	studentBehaviourRatingByTutor: Number,
	complete: Boolean,
	deleted: Boolean,
	deleteDate: Date,
	latestVideoConferenceRoom: videoConferenceRoomSchema,
	videoConferenceRooms: [videoConferenceRoomSchema]
}, {
	timestamps: true
});

module.exports = mongoose.model('Slate', schema)