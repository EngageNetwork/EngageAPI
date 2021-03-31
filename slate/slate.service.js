const sendEmail = require('_helpers/send-email');
const db = require('_helpers/db');
const Role = require('_helpers/role');

module.exports = {
	createListing,
	register,
	cancel,
	getAllAdmin,
	getSlateByIdAdmin,
	getAllListings,
	getMyListings,
	getListingById,
	getMySessions,
	getSessionById,
	update,
	recalculateTContentRating,
	submitContentRating,
	submitBehaviourRating,
	delete: _delete
}

async function createListing(params) {
	// Create listing object
	const listing = new db.Slate(params);
	
	// Set Time for Creation and Update to Now
	listing.created = Date.now();
	listing.updated = Date.now();
	
	// Save listing to database
	await listing.save();
}

async function register(account, id) {
	if (!db.isValidId(id)) throw 'Position not found';
	const position = await db.Slate.findById(id);
	if (!position) throw 'Position not found';
	
	// Final check to ensure no one else is already registered
	if (!!position.registered) throw 'Position already filled';
	
	// Register user to listing
	position.registered = account;
	position.registerDate = Date.now();
	await position.save();
}

async function cancel(account, id) {
	if (!db.isValidId(id)) throw 'Position not found';
	const position = await db.Slate.findById(id);
	if (!position) throw 'Position not found';
	if (position.registered.toString() !== account) throw 'Unauthorized';
	
	position.registered = undefined;
	position.registerDate = undefined;
	await position.save();
}

async function getAllAdmin() {
	const listings = await db.Slate.find();
	return listings.map(x => allListingDetails(x));
}

async function getSlateByIdAdmin(id) {
	if (!db.isValidId(id)) throw 'Listing not found';
	const listing = await db.Slate.findById(id);
	if (!listing) throw 'Listing not found';
	return allListingDetails(listing);
}

async function getAllListings() {
	const aggregate = await db.Slate.aggregate([
		{ $match: { registered: { $eq: undefined } } },
		{ $match: { deleted: { $ne: true } } },
		// Run lookup on Accounts collection and retrieve user info for account (tutor)
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { account: '$account' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$account'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'accountDetails'
			}
		},
		{ $unwind: "$accountDetails" }
	]);
	return aggregate;
}

async function getMyListings(account) {
	const listings = await db.Slate.find({
		account,
		deleted: { $ne: true }
	});
	return listings.map(x => basicListingDetails(x));
}

async function getListingById(id) {
	if (!db.isValidId(id)) throw 'Listing not found';
	const listing = await db.Slate.findById(id);
	if (!listing) throw 'Listing not found';
	return basicListingDetails(listing);
}

async function getMySessions(account) {
	const sessions = await db.Slate.find({
		registered: account,
		deleted: { $ne: true }
	});
	return sessions.map(x => basicListingDetails(x));
}

async function getSessionById(id) {
	if (!db.isValidId(id)) throw 'Session not found';
	const session = await db.Slate.findById(id);
	if (!session) throw 'Session not found';
	return basicListingDetails(session);
}

async function update(account, id, params) {
	if (!db.isValidId(id)) throw 'Listing not found';
	const listing = await getListing(id);
	if (!listing) throw 'Listing not found';
	
	// Users can update their listings and admins can update any listing
	if (listing.account.toString() !== account.id && account.role !== Role.Admin) throw 'Unauthorized';
	
	// Copy details to listing and save
	Object.assign(listing, params);
	listing.updated = Date.now();
	await listing.save();
	
	return basicListingDetails(listing);
}

async function recalculateTContentRating(id) {
	if (!db.isValidId(id)) throw 'Session not found';
	const session = await getListing(id);
	if (!session) throw 'Session not found';
	
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

async function submitContentRating(account, id, params) {
	if (!db.isValidId(id)) throw 'Session not found';
	const session = await getListing(id);
	if (!session) throw 'Session not found';

	// Verify submission came from registered student
	// if (session.registered.toString() !== account.id) throw 'Unauthorized';

	// Save content rating to database
	Object.assign(session, params);
	await session.save();
}

async function submitBehaviourRating(account, id, behaviourRating) {
	if (!db.isValidId(id)) throw 'Session not found';
	const session = await getListing(id);
	if (!session) throw 'Session not found';

	// Verify submission came from listing tutor or registered student
	if (session.account.toString() !== account.id && session.registered.toString() !== account.id) throw 'Unauthorized';

	// Branch based on if submission is from tutor or student
	// From Tutor
	if (session.account.toString() === account.id) {
		studentBehaviourRatingByTutor = behaviourRating;
		params = { studentBehaviourRatingByTutor };
		Object.assign(session, params);
		await session.save();
	}
	// From Student
	if (session.registered.toString() === account.id) {
		tutorBehaviourRatingByStudent = behaviourRating;
		params = { tutorBehaviourRatingByStudent };
		Object.assign(session, params);
		await session.save();
	}
}

async function _delete(account, id) {
	if (!db.isValidId(id)) throw 'Listing not found';
	const listing = await db.Slate.findById(id);
	if (!listing) throw 'Listing not found';
	
	// Users can delete their listings and admins can delete any listing
	if (listing.account.toString() !== account.id && account.role !== Role.Admin) throw 'Unauthorized';
	
	listing.deleted = true;
	listing.deleteDate = Date.now();
	await listing.save();
}


// Assistance Functions
async function getListing(id) {
	if (!db.isValidId(id)) throw 'Listing not found';
	const listing = await db.Slate.findById(id);
	if (!listing) throw 'Listing not found';
	return listing;
}

async function aggregateAllAvailable() {
	const aggregate = await db.Slate.aggregate([
		{ $match: { registered: { $eq: undefined } } },
		{ $match: { deleted: { $ne: true } } },
		// Run lookup on Accounts collection and retrieve user info for account (tutor)
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { account: '$account' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$account'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'accountDetails'
			}
		},
		{ $unwind: "$accountDetails" }
	]);
	return aggregate;
}

function basicListingDetails(listing) {
	const { id, account, created, subject, startDateTime, endDateTime, registered, markedCompletedStudent, markedCompletedTutor } = listing;
	return { id, account, created, subject, startDateTime, endDateTime, registered, markedCompletedStudent, markedCompletedTutor };
}

function allListingDetails(listing) {
	const { id, account, created, updated, subject, startDateTime, endDateTime, registered, registerDate, markedCompletedStudent, markedCompletedTutor, deleted, deleteDate } = listing;
	return { id, account, created, updated, subject, startDateTime, endDateTime, registered, registerDate, markedCompletedStudent, markedCompletedTutor, deleted, deleteDate };
}

async function sendListingConfirmationEmail(email, origin, id) {
	let message;
	if (origin) {
		message = `<p>View the listing page <a href="${origin}/tutor/listings/${id}">here</a>.</p>`
	}
	
	await sendEmail({
		to: email,
		subject: 'Engage Network - Listing Created',
		html: `<h4>Listing Created</h4>
		${message}`
	})
}

async function sendSessionConfirmationEmail(email, origin, id) {
	let message;
	if (origin) {
		message = `<p>View the session details <a href="${origin}/student/sessions/${id}">here</a>.</p>`
	}
	
	await sendEmail({
		to: email,
		subject: 'Engage Network - Registered for Session',
		html: `<h4>Registered for Session</h4>
		${message}`
	})
}