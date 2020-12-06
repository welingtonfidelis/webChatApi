require('dotenv/config');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {cors: { origins:'*' }});
const cors = require('cors');
const port = 3001;
const connectedUsers = {}

app.use(cors());
io.on('connection', (client) => {
    client.emit('receiveListOnlineUsers', connectedUsers);

    const { user } = client.handshake.query;
    const newUser = { user, socketId: client.id, message: [] }
    connectedUsers[client.id] = newUser;

    client.broadcast.emit('newOnlineUser', newUser);
    
    client.on('sendMessage', data => {
        const { receiver, message } = data;
        io.to(receiver).emit("receiveMessage", { message, sender: client.id });
    });

    client.on('disconnect', data => {
        delete connectedUsers[client.id]

        client.broadcast.emit('removeOnlineUser', client.id);
    });
});

//roteamento
app.get('/test', (_, res) => {
    res.json({ ok: true });
});

server.listen(process.env.PORT || port, function () {
    console.log(`🚀 Server running in ${port}\n`);
});