const backgroundTasks = require('../_utils/backgroundTasks');
const sendEmail = require('_helpers/send-email');
const db = require('_helpers/db');
const mongoose = require('mongoose');
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
	markComplete,
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
	const session = await getSession(id);
	
	// Final check to ensure no one else is already registered
	if (!!session.registered) throw 'Session already taken';
	
	// Register user to listing
	session.registered = account;
	session.registerDate = Date.now();
	await session.save();
}

async function cancel(account, id) {
	const session = await getSession(id);

	if (session.registered.toString() !== account) throw 'Unauthorized';

	session.registered = undefined;
	session.registerDate = undefined;
	await session.save();
}

async function getAllAdmin() {
	const aggregate = await db.Slate.aggregate([
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
		{ $unwind: {
			'path': '$accountDetails',
			'preserveNullAndEmptyArrays': true
		} },
		// Run lookup on Accounts collection and retrieve user info for registered (student)
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { registered: '$registered' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$registered'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'registeredDetails'
			}
		},
		{ $unwind: {
			'path': '$registeredDetails',
			'preserveNullAndEmptyArrays': true
		} }
	]);
	return aggregate;
}

async function getSlateByIdAdmin(id) {
	// Validate supplied ID
	if (!db.isValidId(id)) throw 'Slate not found';
	const slate = await db.Slate.findById(id);
	if (!slate) throw 'Slate not found';

	// Convert ID to ObjectID
	var id = mongoose.Types.ObjectId(id);

	// Aggregate Data and Return
	const aggregate = await db.Slate.aggregate([
		{ $match: { _id: { $eq: id } } },
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
		{ $unwind: {
			'path': '$accountDetails',
			'preserveNullAndEmptyArrays': true
		} },
		// Run lookup on Accounts collection and retrieve user info for registered (student)
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { registered: '$registered' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$registered'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'registeredDetails'
			}
		},
		{ $unwind: {
			'path': '$registeredDetails',
			'preserveNullAndEmptyArrays': true
		} }
	]);
	return aggregate[0];
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
		{ $unwind: {
			'path': '$accountDetails',
			'preserveNullAndEmptyArrays': true
		} }
	]);
	return aggregate;
}

async function getMyListings(account) {
	var account = mongoose.Types.ObjectId(account);

	const aggregate = await db.Slate.aggregate([
		{ $match: { account: { $eq: account } } },
		{ $match: { deleted: { $ne: true } } },
		// Run lookup on Accounts collection and retrieve user info for registered (student)
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { registered: '$registered' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$registered'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'registeredDetails'
			}
		},
		{ $unwind: {
			'path': '$registeredDetails',
			'preserveNullAndEmptyArrays': true
		} }
	]);
	return aggregate;
}

async function getListingById(id) {
	// Validate Supplied ID
	await getListing(id);

	// Convert ID to ObjectID
	var id = mongoose.Types.ObjectId(id);

	// Aggregate Data and Return	
	const aggregate = await db.Slate.aggregate([
		{ $match: { _id: { $eq: id } } },
		// Run lookup on Accounts collection and retrieve user info for registered (student)
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { registered: '$registered' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$registered'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'registeredDetails'
			}
		},
		{ $unwind: {
			'path': '$registeredDetails',
			'preserveNullAndEmptyArrays': true
		} }
	]);
	return aggregate[0];
}

async function getMySessions(account) {
	var account = mongoose.Types.ObjectId(account);

	const aggregate = await db.Slate.aggregate([
		{ $match: { registered: { $eq: account } } },
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
		{ $unwind: {
			'path': '$accountDetails',
			'preserveNullAndEmptyArrays': true
		} }
	]);
	return aggregate;
}

async function getSessionById(id) {
	// Validate Supplied ID
	await getSession(id);
	
	// Convert ID to ObjectID
	var id = mongoose.Types.ObjectId(id);

	// Aggregate Data and Return
	const aggregate = await db.Slate.aggregate([
		{ $match: { _id: { $eq: id } } },
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
		{ $unwind: {
			'path': '$accountDetails',
			'preserveNullAndEmptyArrays': true
		} }
	]);
	return aggregate[0];
}

async function update(account, id, params) {
	const listing = await getListing(id);
	
	// Users can update their listings and admins can update any listing
	if (listing.account.toString() !== account.id && account.role !== Role.Admin) throw 'Unauthorized';
	
	// Copy details to listing and save
	Object.assign(listing, params);
	listing.updated = Date.now();
	await listing.save();
	
	return basicListingDetails(listing);
}

async function markComplete(account, id) {
	const session = await getSession(id);

	// Verify submission came from session tutor or registered student
	if (session.account.toString() !== account.id && session.registered.toString() !== account.id) throw 'Unauthorized';

	// Branch based on if submission is from tutor or student
	// From Tutor
	if (session.account.toString() === account.id) {
		// If not marked as complete, mark as complete
		if (!session.markedCompletedTutor) {
			session.markedCompletedTutor = true;
			await session.save();
		}
		// If marked as complete, unmark as complete
		else if (!!session.markedCompletedTutor) {
			session.markedCompletedTutor = undefined;
			await session.save();
		}
	}
	// From Student
	if (session.registered.toString() === account.id) {
		// If not marked as complete, mark as complete
		if (!session.markedCompletedStudent) {
			session.markedCompletedStudent = true;
			await session.save();
		}
		// If marked as complete, unmark as complete
		else if (!!session.markedCompletedStudent) {
			session.markedCompletedStudent = undefined;
			await session.save();
		}
	}
}

async function submitContentRating(account, id, contentRating) {
	const session = await getSession(id);

	// Verify submission came from registered student
	if (session.registered.toString() !== account.id) throw 'Unauthorized';

	// Save content rating to database
	session.tutorContentRatingByStudent = contentRating;
	await session.save();

	// Recalculate Content Rating
	await backgroundTasks.recalculateTContentRating(id);

	// Recalculate Overall Rating
	await backgroundTasks.recalculateOverallTContentRating(id);
}

async function submitBehaviourRating(account, id, behaviourRating) {
	const session = await getSession(id);

	// Verify submission came from listing tutor or registered student
	if (session.account.toString() !== account.id && session.registered.toString() !== account.id) throw 'Unauthorized';

	// Branch based on if submission is from tutor or student
	// From Tutor
	if (session.account.toString() === account.id) {
		// Save Behaviour Rating
		session.studentBehaviourRatingByTutor = behaviourRating;
		await session.save();

		// Recalculate Behaviour Rating
		await backgroundTasks.recalculateSBehaviourRating(id);
	}
	// From Student
	if (session.registered.toString() === account.id) {
		// Save Behaviour Rating
		session.tutorBehaviourRatingByStudent = behaviourRating;
		await session.save();

		// Recalculate Behaviour Rating
		await backgroundTasks.recalculateTBehaviourRating(id);
	}
}

async function _delete(account, id) {
	const listing = await getListing(id);
	
	// Users can delete their listings and admins can delete any listing
	if (listing.account.toString() !== account.id && account.role !== Role.Admin) throw 'Unauthorized';
	
	// Ensure no one is registered
	if (!!listing.registered) throw 'Unable to delete: Student registered'

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

async function getSession(id) {
	if (!db.isValidId(id)) throw 'Session not found';
	const session = await db.Slate.findById(id);
	if (!session) throw 'Session not found';
	return session;
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