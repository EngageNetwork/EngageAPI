const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const accountService = require('../accounts/account.service');
const messageService = require('./message.service');

// Routes
router.post('/initiate', authorize(), initiateChat);
router.post('/:id/message', authorize(), postMsgSchema, postMsg);
router.get('/', authorize(), getRecentChat);
router.get('/:id', authorize(), getConversationByChatId);
router.put('/:id/mark-read', authorize(), markReadByChatId)
router.delete('/chat/:id', authorize(), deleteChatById);
router.delete('/message/:id', authorize(), deleteMsgById);

module.exports = router;

// API Functions
function initiateChat(req, res, next) {
	const chatInitiator = req.user.id;
	const userIds = req.body.userIds;
	messageService.initiateChat(userIds, chatInitiator)
	.then(chat => res.status(200).json(chat))
	.catch(next);
}

function postMsgSchema(req, res, next) {
	const schema = Joi.object({
		msgPayload: Joi.string().required()
	});
	validateRequest(req, next, schema);
}

function postMsg(req, res, next) {
	const account = req.user.id;
	const chatId = req.params.id;
	const msgPayload = req.body.msgPayload;
	messageService.createPostInChat(chatId, msgPayload, account)
	.then(post => {
		res.status(200).json(post);
		global.io.sockets.in(chatId).emit('new message', { message: post });
	})
	.catch(next);
}

function getRecentChat(req, res, next) {
	const currentLoggedUser = req.user.id;
	const options = {
		page: parseInt(req.query.page) || 0,
		limit: parseInt(req.query.limit) || 10
	};
	messageService.getChatsByUserId(currentLoggedUser)
	.then(chats => {
		const chatIds = chats.map(chat => chat._id);
		
		messageService.getRecentChat(chatIds, options, currentLoggedUser)
		.then(recentChat => res.status(200).json({ chat: recentChat }))
		.catch(next);
	})
	.catch(next);
}

function getConversationByChatId(req, res, next) {
	const chatId = req.params.id;
	
	messageService.getChatById(chatId)
	.then(chat => {
		if (!chat) {
			return res.status(400).json({ message: 'No chat exists with the specified id' });
		}
		
		const options = {
			page: parseInt(req.query.page) || 0,
			limit: parseInt(req.query.limit) || 10
		}

		messageService.getConversationByChatId(chatId, options)
		.then(conversation => {
			accountService.getUsersByIds(chat.userIds)
			.then(users => {
				return res.status(200).json({ conversation, users });
			})
			.catch(next);
		})
		.catch(next);
	})
	.catch(next);
}

function markReadByChatId(req, res, next) {
	
}

function deleteChatById(req, res, next) {
	
}

function deleteMsgById(req, res, next) {
	
}