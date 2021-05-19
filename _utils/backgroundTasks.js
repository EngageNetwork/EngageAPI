const db = require('_helpers/db');
const mongoose = require('mongoose');

module.exports = {
	recheckSessionComplete,
	recalculateTSeconds,
	recalculateOverallTContentRating,
    recalculateTContentRating,
    recalculateTBehaviourRating,
    recalculateSBehaviourRating
}

async function recheckSessionComplete(id) {
	const session = await getSession(id);
	
	if (!!session.studentBehaviourRatingByTutor) {
		if (!!session.tutorBehaviourRatingByStudent) {
			if (!!session.tutorContentRatingByStudent) {
				// Mark session as complete
				session.complete = true;
				await session.save();
			}
		}
	}
}

async function recalculateTSeconds(id) {
	const account = await db.Account.findById(id);

	const slates = await db.Slate.find({
		account: { $eq: id },
		sessionDuration: { $exists: true }
	});
	
	var totalSeconds = 0;

	slates.forEach(function (item) {
		totalSeconds += item.sessionDuration;
	})

	account.totalDuration = totalSeconds;
	await account.save();
}

async function recalculateOverallTContentRating(id) {
	const session = await getSession(id);
	const account = await db.Account.findById(session.account);

	var total = 0;
	var values = 0;

	if (!!account.contentRatings.mathContentRating) {
		total += account.contentRatings.mathContentRating;
		values += 1;
	}
	if (!!account.contentRatings.scienceContentRating) {
		total += account.contentRatings.scienceContentRating;
		values += 1;
	}
	if (!!account.contentRatings.socialStudiesContentRating) {
		total += account.contentRatings.socialStudiesContentRating;
		values += 1;
	}
	if (!!account.contentRatings.languageArtsContentRating) {
		total += account.contentRatings.languageArtsContentRating;
		values += 1;
	}
	if (!!account.contentRatings.foreignLanguageAcquisitionContentRating) {
		total += account.contentRatings.foreignLanguageAcquisitionContentRating;
		values += 1;
	}

	const avgRating = total / values;

	account.contentRatings.overallContentRating = avgRating;
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
			account.contentRatings.mathContentRating = avgRating;
			break;
		case 'Science':
			account.contentRatings.scienceContentRating = avgRating;
			break;
		case 'Social Studies':
			account.contentRatings.socialStudiesContentRating = avgRating;
			break;
		case 'Language Arts':
			account.contentRatings.languageArtsContentRating = avgRating;
			break;
		case 'Foreign Language Acquisition':
			account.contentRatings.foreignLanguageAcquisitionContentRating = avgRating;
			break;
	}

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