class WebSockets {
	users = [];
	connection(client) {
		// On client disconnect
		client.on("disconnect", () => {
			this.users = this.users.filter((user) => user.socketId !== client.id);
			console.log('disconnect');
			console.log(this.users);
		});

		// Map identity of user to socket id
		client.on("identity", (userId) => {
			this.users.push({
				socketId: client.id,
				userId: userId,
			});
			console.log('identity');
			console.log(this.users);
		});

		// Subscribe to chat
		client.on("subscribe", (chat, otherUserId = "") => {
			this.subscribeOtherUser(chat, otherUserId);
			client.join(chat);
			console.log('subscribe');
			console.log(this.users);
		});

		// Unsubscribe from chat
		client.on("unsubscribe", (chat) => {
			client.leave(chat);
			console.log('unsubscribe');
			console.log(this.users);
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