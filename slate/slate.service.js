const sendEmail = require('_helpers/send-email');
const db = require('_helpers/db');
const bodyParser = require('body-parser');
const Role = require('_helpers/role');

module.exports = {
    createListing,
    register,
    cancel,
    getAll,
    getAllListings,
    getMyListings,
    getListingById,
    getMyPositions,
    getPositionById,
    update,
    delete: _delete
}

async function createListing(params) {
    // Create listing object
    const listing = new db.Slate(params);

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

async function getAll() {
    const listings = await db.Slate.find();
    return listings.map(x => allListingDetails(x));
}

async function getAllListings() {
    const listings = await db.Slate.find({
        registered: { $eq: undefined },
        deleted: { $ne: true }
    });
    return listings.map(x => basicListingDetails(x));
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

async function getMyPositions(account) {
    const positions = await db.Slate.find({
        registered: account,
        deleted: { $ne: true }
    });
    return positions.map(x => basicListingDetails(x));
}

async function getPositionById(id) {
    if (!db.isValidId(id)) throw 'Position not found';
    const position = await db.Slate.findById(id);
    if (!position) throw 'Position not found';
    return basicListingDetails(position);
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

function basicListingDetails(listing) {
    const { id, account, created, task, registered, details, completed } = listing;
    return { id, account, created, task, registered, details, completed };
}

function allListingDetails(listing) {
    const { id, account, created, updated, registered, registerDate, task, details, completed, deleted, deleteDate } = listing;
    return { id, account, created, updated, registered, registerDate, task, details, completed, deleted, deleteDate };
}

async function sendListingConfirmationEmail(email, origin, id) {
    let message;
    if (origin) {
        message = `<p>View the listing page <a href="${origin}/user/listings/${id}">here</a>.</p>`
    }

    await sendEmail({
        to: email,
        subject: 'Engage Network - Listing Created',
        html: `<h4>Listing Created</h4>
               ${message}`
    })
}

async function sendPositionConfirmationEmail(email, origin, id) {
    let message;
    if (origin) {
        message = `<p>View the position page <a href="${origin}/volunteer/positions/${id}">here</a>.</p>`
    }

    await sendEmail({
        to: email,
        subject: 'Engage Network - Registered for Position',
        html: `<h4>Registered for Position</h4>
               ${message}`
    })
}