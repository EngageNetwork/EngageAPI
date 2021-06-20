const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize')
const Role = require('_helpers/role');
const slateService = require('./slate.service');
const videoConferenceService = require('./videoconference.service');

// Routes
// Main Slate API Routes
router.post('/create', authorize([Role.Admin, Role.Tutor]), createListingSchema, createListing);
router.post('/register/:id', authorize([Role.Admin, Role.Student]), register);
router.post('/cancel/:id', authorize([Role.Admin, Role.Student]), cancel);
router.get('/', authorize(Role.Admin), getAllAdmin);
router.get('/slate/:id', authorize(Role.Admin), getSlateByIdAdmin);
router.get('/listings', authorize([Role.Admin, Role.Student]), getAllListings);
router.get('/mylistings', authorize([Role.Admin, Role.Tutor]), getMyListings);
router.get('/myfinishedlistings', authorize([Role.Admin, Role.Tutor]), getMyFinishedListings);
router.get('/listing/:id', authorize([Role.Admin, Role.Tutor]), getListingById);
router.get('/mysessions', authorize([Role.Admin, Role.Student]), getMySessions);
router.get('/myfinishedsessions', authorize([Role.Admin, Role.Student]), getMyFinishedSessions);
router.get('/session/:id', authorize([Role.Admin, Role.Student]), getSessionById);
router.put('/update/:id', authorize([Role.Admin, Role.Tutor]), updateSchema, update);
router.put('/markcomplete/:id', authorize([Role.Admin, Role.Tutor, Role.Student]), markComplete);
router.put('/rating/content/:id', authorize([Role.Admin, Role.Student]), submitContentRatingSchema, submitContentRating);
router.put('/rating/behaviour/:id', authorize([Role.Admin, Role.Tutor, Role.Student]), submitBehaviourRatingSchema, submitBehaviourRating);
router.delete('/delete/:id', authorize([Role.Admin, Role.Tutor]), _delete);

// Video Conferencing API Routes
router.post('/video/initiate/:id', authorize(), initiateVideoChat);
router.get('/video/token/:id', authorize(), getVideoToken);

module.exports = router;

// API Functions
// Main Slate API
function createListingSchema(req, res, next) {
	const schema = Joi.object({
		subject: Joi.string().required(),
		details: Joi.string().allow(null),
		startDateTime: Joi.string().required(),
		endDateTime: Joi.string().required()
	});
	validateRequest(req, next, schema);
}

function createListing(req, res, next) {
	const account = req.user.id;
	const subject = req.body.subject;
	const details = req.body.details;
	const startDateTime = new Date(req.body.startDateTime).toISOString();
	const endDateTime = new Date(req.body.endDateTime).toISOString();
	
	slateService.createListing({ account, subject, details, startDateTime, endDateTime })
	.then(() => res.json({ message: 'Listing created successfully' }))
	.catch(next);
}

function register(req, res, next) {
	const account = req.user.id;
	
	slateService.register(account, req.params.id, req.get('origin'))
	.then(() => res.json({ message: 'Successfully registered for tutor' }))
	.catch(next);
}

function cancel(req, res, next) {
	const account = req.user.id;
	
	slateService.cancel(account, req.params.id)
	.then(() => res.json({ message: 'Successfully cancelled tutor registration' }))
	.catch(next);
}

function getAllAdmin(req, res, next) {
	
	slateService.getAllAdmin()
	.then(listings => res.json(listings))
	.catch(next);
}

function getSlateByIdAdmin(req, res, next) {
	
	slateService.getSlateByIdAdmin(req.params.id)
	.then(slate => slate ? res.json(slate) : res.sendStatus(404))
	.catch(next);
}

function getAllListings(req, res, next) {
	
	slateService.getAllListings()
	.then(listings => res.json(listings))
	.catch(next);
}

function getMyListings(req, res, next) {
	const account = req.user.id;
	
	slateService.getMyListings(account)
	.then(listings => res.json(listings))
	.catch(next);
}

function getMyFinishedListings(req, res, next) {
	const account = req.user.id;
	
	slateService.getMyFinishedListings(account)
	.then(listings => res.json(listings))
	.catch(next);
}
function getListingById(req, res, next) {
	
	slateService.getListingById(req.params.id)
	.then(listing => listing ? res.json(listing) : res.sendStatus(404))
	.catch(next);
}

function getMySessions(req, res, next) {
	const account = req.user.id;
	
	slateService.getMySessions(account)
	.then(sessions => res.json(sessions))
	.catch(next);
}

function getMyFinishedSessions(req, res, next) {
	const account = req.user.id;
	
	slateService.getMyFinishedSessions(account)
	.then(sessions => res.json(sessions))
	.catch(next);
}

function getSessionById(req, res, next) {
	
	slateService.getSessionById(req.params.id)
	.then(session => session ? res.json(session) : res.sendStatus(404))
	.catch(next)
}

function updateSchema(req, res, next) {
	const schema = Joi.object({
		subject: Joi.string().required(),
		details: Joi.string().allow(null),
		startDateTime: Joi.string().required(),
		endDateTime: Joi.string().required()
	});
	validateRequest(req, next, schema);
	
}

function update(req, res, next) {
	const account = req.user;
	const id = req.params.id;
	const subject = req.body.subject;
	const details = req.body.details;
	const startDateTime = new Date(req.body.startDateTime).toISOString();
	const endDateTime = new Date(req.body.endDateTime).toISOString();
	
	slateService.update(account, id, { subject, details, startDateTime, endDateTime })
	.then(listing => res.json(listing))
	.catch(next);
}

function markComplete(req, res, next) {
	const account = req.user;
	const id = req.params.id;

	slateService.markComplete(account, id)
	.then(() => res.json({ message: 'Marked as complete successfully' }))
	.catch(next);
}

function submitContentRatingSchema(req, res, next) {
	const schema = Joi.object({
		contentRating: Joi.number().required()
	});
	validateRequest(req, next, schema);
}

function submitContentRating(req, res, next) {
	const account = req.user;
	const id = req.params.id;
	const contentRating = req.body.contentRating;
	
	slateService.submitContentRating(account, id, contentRating)
	.then(() => res.json({ message: 'Content rating submitted successfully' }))
	.catch(next);
}

function submitBehaviourRatingSchema(req, res, next) {
	const schema = Joi.object({
		behaviourRating: Joi.number().required()
	});
	validateRequest(req, next, schema);
}

function submitBehaviourRating(req, res, next) {
	const account = req.user;
	const id = req.params.id;
	const behaviourRating = req.body.behaviourRating;
	
	slateService.submitBehaviourRating(account, id, behaviourRating)
	.then(() => res.json({ message: 'Behaviour rating submitted successfully' }))
	.catch(next);
}

function _delete(req, res, next) {
	const account = req.user;

	slateService.delete(account, req.params.id)
	.then(() => res.json({ message: 'Listing removed successfully' }))
	.catch(next);
}

// Video Conferencing API
// API Functions
function initiateVideoChat(req, res, next) {
	const account = req.user;
    const sessionId = req.params.id;

	videoConferenceService.initiateVideoChat(account, sessionId)
	.then(videoChat => res.status(200).json(videoChat))
	.catch(next);
}

function getVideoToken(req, res, next) {
	const accountId = req.user.id;
	const sessionId = req.params.id;

	videoConferenceService.getToken(accountId, sessionId)
	.then(accessDetails => res.status(200).json(accessDetails))
	.catch(next);
}