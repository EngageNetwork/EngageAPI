const db = require('_helpers/db');
const mongoose = require('mongoose');
const { twilioClient } = require('_helpers/twilio');
const twilio = require('twilio');

const TwilioAccessToken = twilio.jwt.AccessToken;
const VideoGrant = TwilioAccessToken.VideoGrant;

module.exports = {
	initiateVideoChat,
	closeVideoChat,
	getToken
}

async function initiateVideoChat(account, sessionId) {
	// Verify session id and get session
	if (!db.isValidId(sessionId)) throw 'Session not found';
	const session = await db.Slate.findById(sessionId);
	if (!session) throw 'Session not found';

	// Verify user is part of session
	if (session.account.toString() !== account.id && session.registered.toString() !== account.id) throw 'Unauthorized';

	// If entry already exists in db for latest room, get most up-to-date details and overwrite outdated details
	if (!!session.latestVideoConferenceRoom) {
		const roomDetails = await twilioClient.video.rooms(session.latestVideoConferenceRoom.sid).fetch();
		const { sid, status, dateCreated, dateUpdated, duration, url, links } = roomDetails;
		session.latestVideoConferenceRoom = { sid, status, dateCreated, dateUpdated, duration, url, links } // Only the latest room details need to be up to date, since the older entries are purely to keep a log

		// Check if session is in-progress, otherwise, generate new room
		if (session.latestVideoConferenceRoom.status == 'in-progress') {
			return session;
		}
	}

	// Call the Twilio video API to create the new room
	const room = await twilioClient.video.rooms.create({
		type: 'go'
	});

	// Save video conference room details to session
	const { sid, status, dateCreated, dateUpdated, duration, url, links } = room;
	const newRoomDetails = { sid, status, dateCreated, dateUpdated, duration, url, links };

	session.latestVideoConferenceRoom = newRoomDetails;
	
	//// ADD LOGIC TO SAVE PAST ROOMS HERE ////

	await session.save();

	// Return session details (including vc room details)
	return session;
}

async function closeVideoChat(sessionId) {
	// Verify session id and get session
	if (!db.isValidId(sessionId)) throw 'Session not found';
	const session = await db.Slate.findById(sessionId);
	if (!session) throw 'Session not found';

	// Get room details
	const roomDetails = session.latestVideoConferenceRoom;

	// Set status of room to 'completed'
	const room = await twilioClient.video.rooms(roomDetails.sid).update({ status: 'completed' });

	// Update entry in db
	session.latestVideoConferenceRoom.status = room.status;
	await session.save();

	// Return session details (including updated vc room details)
	return session;
}

async function getToken(accountId, sessionId) {
	// Verify session id and get session
	if (!db.isValidId(sessionId)) throw 'Session not found';
	const session = await db.Slate.findById(sessionId);
	if (!session) throw 'Session not found';

	// Get room details
	const roomDetails = session.latestVideoConferenceRoom;

	// Create access token
	const token = new TwilioAccessToken(
		process.env.TWILIO_ACCOUNT_SID,
		process.env.TWILIO_API_KEY,
		process.env.TWILIO_API_SECRET,
		{ ttl: 7200 } // Maximum session of 2 hours
	);

	// Link token with user identity
	token.identity = accountId;

	// Grant token access to Twilio video conference
	const grant = new VideoGrant({ room: roomDetails.sid });
	token.addGrant(grant);

	// Serialize token to JWT and return
	return {
		sid: roomDetails.sid,
		token: token.toJwt()
	}
}