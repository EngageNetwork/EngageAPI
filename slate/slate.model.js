const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: 'Account' },
    created: Date,
    updated: Date,
    date: Date,
    subject: String,
    startTime: Date,
    endTime: Date,
    registered: { type: Schema.Types.ObjectId, ref: 'Registered' },
    registerDate: Date,
    markedCompletedStudent: Boolean,
    markedCompletedTutor: Boolean,
    deleted: Boolean,
    deleteDate: Date
});

module.exports = mongoose.model('Slate', schema)