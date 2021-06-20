const backgroundTasks = require('_utils/backgroundTasks.js');
const videoConferenceService = require('./videoconference.service');
const sendEmail = require('_helpers/send-email');
const db = require('_helpers/db');
const mongoose = require('mongoose');
const Role = require('_helpers/role');

const { twilioClient } = require('_helpers/twilio');

module.exports = {
	createListing,
	register,
	cancel,
	getAllAdmin,
	getSlateByIdAdmin,
	getAllListings,
	getMyListings,
	getMyFinishedListings,
	getListingById,
	getMySessions,
	getMyFinishedSessions,
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
	
	// Save listing to database
	await listing.save();
}

async function register(account, id, origin) {
	const session = await getSession(id);
	
	// Final check to ensure no one else is already registered
	if (!!session.registered) throw 'Session already taken';
	
	// Register user to listing
	session.registered = account;
	session.registerDate = Date.now();
	await session.save();

	// Send notification email
	sendStudentSessionRegistrationEmail(origin, session);
	sendTutorListingFilledEmail(origin, session)
}

async function cancel(account, id) {
	const session = await getSession(id);

	if (session.registered.toString() !== account) throw 'Unauthorized';

	// Verify session hasn't already happened
	if (!!session.latestVideoConferenceRoom?.sid) throw 'Unable to cancel: Previous video session detected'

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
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, contentRatings: 1, behaviourRating: 1 } }
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
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, behaviourRating: 1 } }
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
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, contentRatings: 1, behaviourRating: 1 } }
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
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, behaviourRating: 1 } }
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
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, contentRatings: 1, behaviourRating: 1 } }
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
		{ $match: { complete: { $ne: true } } },
		{ $sort: { registered: -1, startDateTime: 1 } },
		// Run lookup on Accounts collection and retrieve user info for registered (student)
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { registered: '$registered' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$registered'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, behaviourRating: 1 } }
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

async function getMyFinishedListings(account) {
	var account = mongoose.Types.ObjectId(account);

	const aggregate = await db.Slate.aggregate([
		{ $match: { account: { $eq: account } } },
		{ $match: { deleted: { $ne: true } } },
		{ $match: { complete: { $eq: true } } },
		{ $sort: { registered: -1, startDateTime: 1 } },
		// Run lookup on Accounts collection and retrieve user info for registered (student)
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { registered: '$registered' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$registered'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, behaviourRating: 1 } }
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
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, behaviourRating: 1 } }
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
		{ $match: { complete: {$ne: true } } },
		{ $sort: { startDateTime:  1 } },
		// Run lookup on Accounts collection and retrieve user info for account (tutor)
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { account: '$account' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$account'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, contentRatings: 1, behaviourRating: 1 } }
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

async function getMyFinishedSessions(account) {
	var account = mongoose.Types.ObjectId(account);

	const aggregate = await db.Slate.aggregate([
		{ $match: { registered: { $eq: account } } },
		{ $match: { deleted: { $ne: true } } },
		{ $match: { complete: { $eq: true } } },
		{ $sort: { startDateTime:  1 } },
		// Run lookup on Accounts collection and retrieve user info for account (tutor)
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { account: '$account' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$account'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, contentRatings: 1, behaviourRating: 1 } }
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
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1, contentRatings: 1, behaviourRating: 1 } }
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
	
	// Ensure no one is registered
	if (!!listing.registered) throw 'Unable to update: Student registered'

	// Copy details to listing and save
	Object.assign(listing, params);
	await listing.save();
	
	return basicListingDetails(listing);
}

async function markComplete(account, id) {
	const session = await getSession(id);

	// Verify that video session exists
	if (!session.latestVideoConferenceRoom.sid) throw 'Unable to complete: No video session detected'
	
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

	// If both have marked as complete
	if (!!session.markedCompletedTutor && !!session.markedCompletedStudent) {
		// Update details of the latest room
		const latestRoomDetails = await twilioClient.video.rooms(session.latestVideoConferenceRoom.sid).fetch();
		const { sid, status, dateCreated, dateUpdated, duration, url, links } = latestRoomDetails;
		session.latestVideoConferenceRoom = { sid, status, dateCreated, dateUpdated, duration, url, links }

		// Close video conference room if not already closed
		if (session.latestVideoConferenceRoom.status == 'in-progress') {
			videoConferenceService.closeVideoChat(id);
		}

		// Save the duration of the call !!!!(May require update to include duration of historical calls)
		session.sessionDuration = duration;
		await session.save();

		// Recalculate tutor hours
		backgroundTasks.recalculateTSeconds(account.id);
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

	// Check whether all ratings have been submitted
	await backgroundTasks.recheckSessionComplete(id);
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

		// Check whether all ratings have been submitted
		await backgroundTasks.recheckSessionComplete(id);
	}
	// From Student
	if (session.registered.toString() === account.id) {
		// Save Behaviour Rating
		session.tutorBehaviourRatingByStudent = behaviourRating;
		await session.save();

		// Recalculate Behaviour Rating
		await backgroundTasks.recalculateTBehaviourRating(id);

		// Check whether all ratings have been submitted
		await backgroundTasks.recheckSessionComplete(id);
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
	const { id, account, createdAt, updatedAt, subject, startDateTime, endDateTime, registered, markedCompletedStudent, markedCompletedTutor } = listing;
	return { id, account, createdAt, updatedAt, subject, startDateTime, endDateTime, registered, markedCompletedStudent, markedCompletedTutor };
}

async function sendTutorListingFilledEmail(origin, listing) {
	const tutorAccount = await db.Account.findById(listing.account);
	const studentAccount = await db.Account.findById(listing.registered);

	await sendEmail({
		to: tutorAccount.email,
		subject: 'Engage Network - Listing Filled',
		html: `
		<p>Hello ${tutorAccount.firstName} ${tutorAccount.lastName},</p>
		<p>You are receiving this email as a notification that ${studentAccount.firstName} ${studentAccount.lastName} has registered for your tutoring session from ${listing.startDateTime} to ${listing.endDateTime}. You can view the details <a href="${origin}/tutor/listings/details/${listing._id}">here</a>. Thank you for volunteering your time with us.</p>
		<p>Your student should contact you using the private message system at least 1 hour before your lesson. Use this information to structure your lesson as you see fit. If this is your first lesson, we recommend that you take a look at the tutor resource package before you begin.</p>
		<p>Thank you and have a great lesson,</p>
		<p>Engage Network Team</p>
		<br>
		<p>[Automated] Please do not respond to this email as it is not monitored. Questions, comments, or concerns may be directed to <a href="mailto:support@engageapp.net">support@engageapp.net</a>.</p>
		`
	})
}

async function sendStudentSessionRegistrationEmail(origin, session) {
	const tutorAccount = await db.Account.findById(session.account);
	const studentAccount = await db.Account.findById(session.registered);
	
	await sendEmail({
		to: studentAccount.email,
		subject: 'Engage Network - Session Registration Confirmation',
		html: `
		<p>Hello ${studentAccount.firstName} ${studentAccount.lastName},</p>
		<p>Thank you for signing up for a session with the Engage Network. You are receiving this email as a reminder that you recently registered for a tutoring session from ${session.startDateTime} to ${session.endDateTime} with ${tutorAccount.firstName} ${tutorAccount.lastName}. You can view the details <a href="${origin}/student/sessions/registered/details/${session._id}">here</a>.</p>
		<p>Please contact your tutor, if you have not done so already, using the private message system, and give a brief overview of what you want your tutor to cover for this particular session at least 1 hour before your lesson.</p>
		<p>Thank you and enjoy your lesson,</p>
		<p>Engage Network Team</p>
		<br>
		<p>[Automated] Please do not respond to this email as it is not monitored. Questions, comments, or concerns may be directed to <a href="mailto:support@engageapp.net">support@engageapp.net</a>.</p>
		`
	})
}