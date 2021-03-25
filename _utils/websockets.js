class WebSockets {
	users = [];
	connection(client) {
		// On client disconnect
		client.on("disconnect", () => {
			this.users = this.users.filter((user) => user.socketId !== client.id);
		});

		// Map identity of user to socket id
		client.on("identity", (userId) => {
			this.users.push({
				socketId: client.id,
				userId: userId,
			});
		});

		// Subscribe to chat
		client.on("subscribe", (chat, otherUserId = "") => {
			this.subscribeOtherUser(chat, otherUserId);
			client.join(chat);
		});

		// Unsubscribe from chat
		client.on("unsubscribe", (chat) => {
			client.leave(chat);
		});
	}
	
	subscribeOtherUser(chat, otherUserId) {
		const userSockets = this.users.filter((user) => user.userId === otherUserId);
		userSockets.map((userInfo) => {
			const socketConn = global.io.sockets.connected(userInfo.socketId);
			if (socketConn) {
				socketConn.join(chat);
			}
		});
	}
}