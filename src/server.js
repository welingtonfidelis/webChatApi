require('dotenv/config');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {cors: { origins:'*' }});
const cors = require('cors');
const port = 3001;
const connectedUsers = {}
const activeRooms = {}

app.use(cors());

io.on('connection', (client) => {
    client.emit('receiveListOnlineUsers', connectedUsers);
    client.emit('receiveListRooms', activeRooms);

    const { user } = client.handshake.query;
    const newUser = { user, socketId: client.id, message: [] }
    connectedUsers[client.id] = newUser;

    client.broadcast.emit('newOnlineUser', newUser);
    
    client.on('sendMessage', data => {
        const { receiver, message } = data;
        io.to(receiver).emit("receiveMessage", { message, sender: client.id });
    });

    client.on('sendMessageToRoom', data => {
        const { room, message } = data;

        client.to(room).emit(
            "receiveMessageFromRoom", 
            { room, message: {...message, socketId: client.id} }
        );
    });

    client.on('joinRoom', data => {
        const { room, user } = data;

        activeRooms[room].connectedUsers[client.id] = true;
        activeRooms[room].total += 1;

        client.join(room);
        io.emit('newUserInRoom', { room, user });
    });

    client.on('newRoom', data => {
        const newRoom = { message: [], connectedUsers: {}, total: 0 }
        activeRooms[data.room] = newRoom;
        io.emit('receiveNewRoom', { [data.room]: newRoom });
    });

    client.on('disconnect', data => {
        delete connectedUsers[client.id]

        client.broadcast.emit('removeOnlineUser', client.id);

        for(const room of Object.entries(activeRooms)) {
            const [ key, value ] = room;
            const { connectedUsers } = value;
            if(connectedUsers[client.id]) {
                delete activeRooms[key].connectedUsers[client.id];
                activeRooms[key].total -= 1;

                if(activeRooms[key].total <= 0) {
                    delete activeRooms[key]
                    io.emit('removeRoom', { room: key });
                }
                else io.emit('removeUserRoom', { room: key });
            }
        }
    });
});

//roteamento
app.get('/test', (_, res) => {
    res.json({ ok: true });
});

server.listen(process.env.PORT || port, function () {
    console.log(`🚀 Server running in ${port}\n`);
});