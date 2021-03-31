const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize')
const Role = require('_helpers/role');
const slateService = require('./slate.service');

// Routes
router.post('/create', authorize(), createListingSchema, createListing);
router.post('/register/:id', authorize(), register);
router.post('/cancel/:id', authorize(), cancel);
router.get('/', authorize(Role.Admin), getAllAdmin);
router.get('/slate/:id', authorize(Role.Admin), getSlateByIdAdmin);
router.get('/listings', authorize(Role.Admin, Role.Student), getAllListings);
router.get('/mylistings', authorize(Role.Admin, Role.Tutor), getMyListings);
router.get('/listing/:id', authorize(Role.Admin, Role.Tutor), getListingById);
router.get('/mysessions', authorize(Role.Admin, Role.Student), getMySessions);
router.get('/session/:id', authorize(Role.Admin, Role.Student), getSessionById);
router.put('/update/:id', authorize(), updateSchema, update);
router.put('/rating/content/:id', authorize(Role.Admin, Role.Student), submitContentRatingSchema, submitContentRating);
router.put('/rating/behaviour/:id', authorize(), submitBehaviourRatingSchema, submitBehaviourRating);
router.delete('/delete/:id', authorize(), _delete);

module.exports = router;

// API Functions
function createListingSchema(req, res, next) {
	const schema = Joi.object({
		subject: Joi.string().required(),
		startDateTime: Joi.string().required(),
		endDateTime: Joi.string().required()
	});
	validateRequest(req, next, schema);
}

function createListing(req, res, next) {
	const account = req.user.id;
	const subject = req.body.subject;
	const startDateTime = new Date(req.body.startDateTime).toISOString();
	const endDateTime = new Date(req.body.endDateTime).toISOString();
	
	slateService.createListing({ account, subject, startDateTime, endDateTime })
	.then(() => res.json({ message: 'Listing created successfully' }))
	.catch(next);
}

function register(req, res, next) {
	const account = req.user.id;
	
	slateService.register(account, req.params.id)
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
	.then(listing => listing ? res.json(listing) : res.sendStatus(404))
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

function getSessionById(req, res, next) {
	
	slateService.getSessionById(req.params.id)
	.then(session => session ? res.json(session) : res.sendStatus(404))
	.catch(next)
}

function updateSchema(req, res, next) {
	const schema = Joi.object({
		subject: Joi.string().required(),
		startDateTime: Joi.string().required(),
		endDateTime: Joi.string().required()
	});
	validateRequest(req, next, schema);
	
}

function update(req, res, next) {
	const account = req.user;
	const id = req.params.id;
	const subject = req.body.subject;
	const startDateTime = new Date(req.body.startDateTime).toISOString();
	const endDateTime = new Date(req.body.endDateTime).toISOString();
	
	slateService.update(account, id, { subject, startDateTime, endDateTime })
	.then(listing => res.json(listing))
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
	const tutorContentRatingByStudent = req.body.contentRating;
	
	slateService.submitContentRating(account, id, { tutorContentRatingByStudent })
	.then(() => res.json({ message: 'Content rating submitted successfully' }))
	.catch(next);

	slateService.recalculateTContentRating(id);
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