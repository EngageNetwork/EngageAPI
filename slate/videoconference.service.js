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

	// If room already exists, return existing room details
	if (!!session.videoConferenceRoom) {
		return session;
	}

	// Call the Twilio video API to create the new room.
	const room = await twilioClient.video.rooms.create({
		type: 'go'
	});

	// Save video conference room details to session
	const { sid, status, dateCreated, dateUpdated, url, links } = room;
	session.videoConferenceRoom = { sid, status, dateCreated, dateUpdated, url, links }
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
	const roomDetails = session.videoConferenceRoom;

	// Set status of room to 'completed'
	const room = await twilioClient.video.rooms(roomDetails.sid).update({ status: 'completed' });
	console.log(room);

	// Update entry in db
	session.videoConferenceRoom.status = room.status
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
	const roomDetails = session.videoConferenceRoom;

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