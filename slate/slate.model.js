const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: 'Account' },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    registered: { type: Schema.Types.ObjectId, ref: 'Registered' },
    registerDate: Date,
    task: String,
    details: String,
    completed: Boolean,
    deleted: Boolean,
    deleteDate: Date
});


module.exports = mongoose.model('Slate', schema)