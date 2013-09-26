 
var	socketio    = require('socket.io'),
	io,
	guestNumber = 1,
	nickNames   = {},
	namesUsed    = [],
	currentRoom = {};

exports.listen = function(server) {
	io = socketio.listen(server); 													// Start the Socket.io server, allowing it to piggyback on the existing HTTP server
	io.set('log level', 1);
	io.sockets.on('connection', function(socket) {									// Define how each user connection will be handled
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed); 	// Assign user a guest name when they connect
		joinRoom(socket, 'Lobby');													// Place user in the "Lobby" room when they connect

		handleMessageBroadcasting(socket, nickNames); 								// Handle user messages, name change attempts, and room creation/changes.
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);

		socket.on('rooms', function() { 												// Provide user with a list of occupied rooms on request.
			socket.emit('rooms', io.sockets.manager.rooms);
		});

		handleClientDisconnection(socket, nickNames, namesUsed); 					// Define "cleanup" logic for when a user disconnects
	});
};


// guest name assignment
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	var name = 'Guest' + guestNumber;
	nickNames[socket.id] = name;
	socket.emit('nameResult', {
		success: true,
		name: name
	});
	namesUsed.push(name);
	return guestNumber + 1;
}

// join romms
function joinRoom(socket, room) {
	socket.join(room);
	currentRoom[socket.id] = room;
	socket.emit('joinResult', {room: room});
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + ' has joined ' + room + '.'
	});

	var usersInRoom = io.sockets.clients(room);
	if (usersInRoom.length > 1) {
		var usersInRoomSummary = 'users currently in ' + room + ": ";
		for (var index in usersInRoom) {
		var userSocketId = usersInRoom[index].id;
		if (userSocketId != socket.id) {
		if (index > 0) {
			usersInRoomSummary += ', ';
		}
			usersInRoomSummary += nickNames[userSocketId];
		}
		}
		usersInRoomSummary += '.';
		socket.emit('message', {text: usersInRoomSummary});
	}
}

// name change requests
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
	socket.on('nameAttempt', function(name) {
		if (name.indexOf('Guest') == 0) {
			socket.emit('nameResult', {
				success: false,
				message: 'Names cannot begin with "Guest".'
			});
		} else {
			if (namesUsed.indexOf(name) == -1) {
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];

				socket.emit('nameResult', {
					success: true,
					name: name
				});

				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' is now known as ' + name + '.'
				});
			} else {
				socket.emit('nameResult', {
					success: false,
					message: 'That name is already in use.'
				});
			}
		}
	});
}

// chat messages
function handleMessageBroadcasting(socket) {
	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	});
}

// room creation
function handleRoomJoining(socket) {
	socket.on('join', function(room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

// user disconnection
function handleClientDisconnection(socket) {
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}