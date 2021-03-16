const util = require('util');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const maxSize = 2 * 1024 * 1024; // Max 2Mb File Size

let storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, __basedir + '/assets/static/uploads/');
	},
	filename: (req, file, cb) => {
		var uuid = uuidv4();
		console.log(uuid);
		cb(null, uuid);
	},
});

let uploadFile = multer({
	storage: storage,
	limits: { fileSize: maxSize },
}).single('file');

let uploadFileMiddleware = util.promisify(uploadFile);

module.exports = uploadFileMiddleware;