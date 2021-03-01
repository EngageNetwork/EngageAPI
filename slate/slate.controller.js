const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize')
const Role = require('_helpers/role');
const slateService = require('./slate.service');

// Routes
router.post('/create', authorize(), createListing);
router.post('/register/:id', authorize(), register);
router.post('/cancel/:id', authorize(), cancel);
router.get('/', authorize(Role.Admin), getAll);
router.get('/listings', authorize(Role.Admin, Role.Student), getAllListings);
router.get('/mylistings', authorize(Role.Admin, Role.Tutor), getMyListings);
router.get('/listing/:id', authorize(Role.Admin, Role.Tutor), getListingById);
router.get('/mypositions', authorize(Role.Admin, Role.Student), getMyPositions);
router.get('/position/:id', authorize(Role.Admin, Role.Student), getPositionById);
router.put('/update/:id', authorize(), update);
router.delete('/delete/:id', authorize(), _delete);

module.exports = router;

// API Functions
function createListing(req, res, next) {
    const account = req.user.id;
    const { task, details } = req.body;
    slateService.createListing({ account, task, details })
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

function getAll(req, res, next) {
    slateService.getAll()
        .then(listings => res.json(listings))
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

function getListings(req, res, next) {
    slateService.getListings()
        .then(listings => res.json(listings))
        .catch(next);
}

function getMyPositions(req, res, next) {
    const account = req.user.id;
    slateService.getMyPositions(account)
        .then(positions => res.json(positions))
        .catch(next);
}

function getPositionById(req, res, next) {
    slateService.getPositionById(req.params.id)
        .then(position => position ? res.json(position) : res.sendStatus(404))
        .catch(next)
}

function update(req, res, next) {
    const account = req.user;
    const id = req.params.id;
    slateService.update(account, id, req.body)
        .then(listing => res.json(listing))
        .catch(next);
}

function _delete(req, res, next) {
    const account = req.user;
    slateService.delete(account, req.params.id)
        .then(() => res.json({ message: 'Listing removed successfully' }))
        .catch(next);
}