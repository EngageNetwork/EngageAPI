const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
	email: { type: String, unique: true, required: true },
	passwordHash: { type: String, required: true },
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	role: { type: String, required: true },
	approved: Date,
	approvedSubjects: {
		math: Boolean,
		science: Boolean,
		socialStudies: Boolean,
		languageArts: Boolean,
		foreignLanguageAcquisition: Boolean
	},
	transcript: {
		math: String,
		science: String,
		socialStudies: String,
		languageArts: String,
		foreignLanguageAcquisition: String
	},
	behaviourRating: Number,
	contentRatings: {
		overallContentRating: Number,
		mathContentRating: Number,
		scienceContentRating: Number,
		socialStudiesContentRating: Number,
		languageArtsContentRating: Number,
		foreignLanguageAcquisitionContentRating: Number
	},
	verificationToken: String,
	verified: Date,
	resetToken: {
		token: String,
		expires: Date
	},
	passwordReset: Date
}, {
	timestamps: true
});

schema.virtual('isVerified').get(function() {
	return !!(this.verified || this.passwordReset);
});

schema.set('toJSON', {
	virtuals: true,
	versionKey: false,
	transform: function (doc, ret) {
		// Remove these props when object is serialized
		delete ret._id;
		delete ret.passwordHash;
	}
});

module.exports = mongoose.model('Account', schema);