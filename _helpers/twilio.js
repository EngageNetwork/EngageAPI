const twilio = require('twilio');

function getTwilioClient() {
	if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_API_KEY || !process.env.TWILIO_API_SECRET) {
		throw new Error('Unable to initialize Twilio client');
	}
	
	return new twilio(process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET, { accountSid: process.env.TWILIO_ACCOUNT_SID });
}

exports.twilioClient = getTwilioClient();