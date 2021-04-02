const db = require('_helpers/db');
const mongoose = require('mongoose');

module.exports = {
	recalculateOverallTContentRating,
    recalculateTContentRating,
    recalculateTBehaviourRating,
    recalculateSBehaviourRating
}

async function recalculateOverallTContentRating(id) {
	const session = await getSession(id);
	const account = await db.Account.findById(session.account);

	var total = 0;
	var values = 0;

	if (!!account.mathContentRating) {
		total += account.mathContentRating;
		values += 1;
	}
	if (!!account.scienceContentRating) {
		total += account.scienceContentRating;
		values += 1;
	}
	if (!!account.socialStudiesContentRating) {
		total += account.socialStudiesContentRating;
		values += 1;
	}
	if (!!account.languageArtsContentRating) {
		total += account.languageArtsContentRating;
		values += 1;
	}
	if (!!account.foreignLanguageAcquisitionContentRating) {
		total += account.foreignLanguageAcquisitionContentRating;
		values += 1;
	}

	const avgRating = total / values;

	Object.assign(account, { overallContentRating: avgRating });
	await account.save();
}

async function recalculateTContentRating(id) {
	const session = await getSession(id);
	const account = await db.Account.findById(session.account);

	const slates = await db.Slate.find({
		account: { $eq: session.account },
		subject: session.subject,
		tutorContentRatingByStudent: { $exists: true }
	});

	var total = 0;
	var values = 0;

	slates.forEach(function (item) {
		total += item.tutorContentRatingByStudent;
		values += 1;
	})

	const avgRating = total / values;

	switch(session.subject) {
		case 'Math':
			params = { mathContentRating: avgRating };
			break;
		case 'Science':
			params = { scienceContentRating: avgRating };
			break;
		case 'Social Studies':
			params = { socialStudiesContentRating: avgRating };
			break;
		case 'Language Arts':
			params = { languageArtsContentRating: avgRating };
			break;
		case 'Foreign Language Acquisition':
			params = { foreignLanguageAcquisitionContentRating: avgRating };
			break;
	}

	Object.assign(account, params);
	await account.save();
}

async function recalculateTBehaviourRating(id) {
	const session = await getSession(id);
	const account = await db.Account.findById(session.account);

	const slates = await db.Slate.find({
		account: { $eq: session.account },
		tutorBehaviourRatingByStudent: { $exists: true }
	});

	var total = 0;
	var values = 0;

	slates.forEach(function (item) {
		total += item.tutorBehaviourRatingByStudent;
		values += 1;
	})

	const avgRating = total / values;

	Object.assign(account, { behaviourRating: avgRating });
	await account.save();
}

async function recalculateSBehaviourRating(id) {
	const session = await getSession(id);
	const account = await db.Account.findById(session.registered);

	const slates = await db.Slate.find({
		registered: { $eq: session.registered },
		studentBehaviourRatingByTutor: { $exists: true }
	});

	var total = 0;
	var values = 0;

	slates.forEach(function (item) {
		total += item.studentBehaviourRatingByTutor;
		values += 1;
	})

	const avgRating = total / values;

	Object.assign(account, { behaviourRating: avgRating });
	await account.save();
}

// Assistance Functions
async function getSession(id) {
	if (!db.isValidId(id)) throw 'Session not found';
	const session = await db.Slate.findById(id);
	if (!session) throw 'Session not found';
	return session;
}