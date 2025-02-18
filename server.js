import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname,join } from 'path';
import { create } from 'domain';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.static(join(__dirname,'dist')));

app.get('*',(req,res)=>{
    res.sendFile(join(__dirname,'dist','index.html'));
});

const server= createServer(app);
const io = new Server(server,{
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const connectedUsers = new Set();

io.on('connection',(socket)=>{
    console.log('New user connected');
    connectedUsers.add(socket.id);
})

io.emit('userCount',connectedUsers.size);

socket.on('draw',(data)=>{
    socket.broadcast.emit('draw',data);
});

socket.on('cursorMove',(data) => {
    socket.broadcast.emit('cursorMove',{
        ...data,userId:socket.id
    });
});

socket.on('disconnect',()=>{
    console.log('User disconnected',socket.id);
    connectedUsers.delete(socket.id);
    io.emit('userCount',connectedUsers.size);
    io.emit('userDisconnect',socket.id);
})
