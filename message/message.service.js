const sendEmail = require('_helpers/send-email');
const db = require('_helpers/db');
const mongoose = require('mongoose');

module.exports = {
	initiateChat,
	getChatsByUserId,
	getChatById,
	createPostInChat,
	getConversationByChatId,
	getRecentChat,
	markMessageRead
}

// Chat Model Functions
async function initiateChat(userIds, chatInitiator) {
	// Check if messaging self
	userIds = userIds.filter(userId => userId !== chatInitiator);

	// Verify userIds is not empty
	if (!userIds.length) throw 'Other user cannot be empty/be yourself';

	// Verify that specified users exist
	for (const userId of userIds) {
		const user = await db.Account.findById(userId);
		if (!user) throw 'One of the specified users does not exist';
	}

	const availableChat = await db.Chat.findOne({
		userIds: {
			$size: userIds.length,
			$all: [...userIds]
		}
	});
	
	if (availableChat) {
		const { id } = availableChat;
		return { id };
	}

	const newChat = new db.Chat({ chatInitiator, userIds });
	await newChat.save();
	
	const { id } = newChat;
	return { id };
}

async function getChatsByUserId(id) {
	const chats = await db.Chat.find({ userIds: { $all: [id] } });
	return chats;
}

async function getChatById(chatId) {
	const chat = await db.Chat.findOne({ _id: chatId });
	return chat;
}

// Message Model Functions
async function createPostInChat (chatId, message, postedByUser) {
	const post = new db.Message({ chatId, message, postedByUser, readByRecipients: { readByUserId: postedByUser } });
	await post.save();

	const aggregate = await db.Message.aggregate([
		// Get Post
		{ $match: { _id: post._id } },
		// Run lookup on Accounts collection and retrive user info matching parameters
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { postedByUser: '$postedByUser' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$postedByUser'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'postedByUser'
			}
		},
		{ $unwind: '$postedByUser' },
		// Run lookup on Chats collection and retrive chat info matching parameters
		{
			$lookup: {
				from: 'chats',
				localField: 'chatId',
				foreignField: '_id',
				as: 'chatInfo'
			}
		},
		{ $unwind: '$chatInfo' },
		{ $unwind: '$chatInfo.userIds' },
		// Run lookup on Accounts collection and retrive user info matching parameters
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { userIds: '$chatInfo.userIds' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$userIds'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'chatInfo.userProfile'
			}
		},
		{ $unwind: '$chatInfo.userProfile' },
		// Get group data
		{
			$group: {
				_id: '$chatInfo._id',
				postId: { $last: '$_id' },
				chatId: { $last: '$chatInfo._id' },
				message: { $last: '$message' },
				postedByUser: { $last: '$postedByUser' },
				readByRecipients: { $last: '$readByRecipients' },
				chatInfo: { $addToSet: '$chatInfo.userProfile' },
				createdAt: { $last: '$createdAt' },
				updatedAt: { $last: '$updatedAt' },
			}
		}
	]);
	return aggregate[0];
}

async function getConversationByChatId (chatId, options = {}) {
	var chatId = mongoose.Types.ObjectId(chatId);

	const aggregate = await db.Message.aggregate([
		{ $match: { chatId } },
		{ $sort: { createdAt: 1 } },
		// Run lookup on Accounts collection and retrieve user info matching parameters
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { postedByUser: '$postedByUser' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$postedByUser'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'postedByUser'
			}
		},
		{ $unwind: "$postedByUser" },
		// Apply Pagination
		// { $skip: options.page * options.limit },
		// { $limit: options.limit },
		// { $sort: { createdAt: 1 } },
	]);
	// console.log(aggregate);
	return aggregate;
}

async function getRecentChat (chatIds, options, currentOnlineUserId) {
	const aggregate = await db.Message.aggregate([
		{ $match: { chatId: { $in: chatIds } } },
		{
			$group: {
				_id: '$chatId',
				messageId: { $last: '$_id' },
				chatId: { $last: '$chatId' },
				message: { $last: '$message' },
				postedByUser: { $last: '$postedByUser' },
				createdAt: { $last: '$createdAt' },
				readByRecipients: { $last: '$readByRecipients' },
			}
		},
		{ $sort: { createdAt: -1 } },
		// Run lookup on Accounts collection and retrive user info matching parameters
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { postedByUser: '$postedByUser' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$postedByUser'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'postedByUser'
			}
		},
		{ $unwind: "$postedByUser" },
		// Run lookup on Chats collection and retrive chat info matching parameters
		{
			$lookup: {
				from: 'chats',
				localField: '_id',
				foreignField: '_id',
				as: 'chatInfo',
			}
		},
		{ $unwind: "$chatInfo" },
		{ $unwind: "$chatInfo.userIds" },
		// Run lookup on Accounts collection and retrive user info matching parameters
		{
			$lookup: {
				from: 'accounts',
				// Filter out unnecessary data fields
				let: { userIds: '$chatInfo.userIds' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$userIds'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'chatInfo.userProfile'
			}
		},
		{ $unwind: "$readByRecipients" },
		// Run lookup on Accounts collection and retrive user info matching parameters
		{
			$lookup: {
				from: 'accounts',
				let: { readByUserId: '$readByRecipients.readByUserId' },
				pipeline: [
					{ $match: { $expr: { $eq: ['$_id', '$$readByUserId'] } } },
					{ $project: { _id: 1, firstName: 1, lastName: 1, role: 1 } }
				],
				as: 'readByRecipients.readByUser',
			}
		},
		{
			$group: {
				_id: '$chatInfo._id',
				messageId: { $last: '$messageId' },
				chatId: { $last: '$chatId' },
				message: { $last: '$message' },
				postedByUser: { $last: '$postedByUser' },
				readByRecipients: { $addToSet: '$readByRecipients' },
				chatInfo: { $addToSet: '$chatInfo.userProfile' },
				createdAt: { $last: '$createdAt' },
			},
		},
		// Apply Pagination
		// { $skip: options.page * options.limit },
		// { $limit: options.limit }
	]);
	return aggregate;
}

async function markMessageRead (chatId, currentOnlineUserId ) {
	return db.Message.updateMany(
		{
			chatId,
			'readByRecipients.readByUserId': { $ne: currentUserOnlineId }
		},
		{
			$addToSet: {
				readByRecipients: { readByUserId: currentUserOnlineId }
			}
		},
		{
			multi: true
		}
		);
	}
	