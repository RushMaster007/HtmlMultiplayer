const express = require('express')
const app = express()
// const { Socket } = require('engine.io')

//Socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, {pingInterval: 2000, pingTimeout: 5000})

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) =>{
    res.sendFile(__dirname + '/public/html/index.html')
})

const backEndPlayers = {}

//Check if new User connects 
io.on('connection', (socket) =>{
    console.log('a user connected')
    backEndPlayers[socket.id] = {
        x: 500 * Math.random() ,
        y: 500 * Math.random() ,
        color: `hsl(${360 * Math.random()}, 100%, 50%)` ,
        sequenceNumber: 0//set to check all inputs not handled so far
    }
    //socket for single client io for all
    io.emit('updatePlayers', backEndPlayers)

    socket.on('disconnect', (reason) => {
        console.log(reason)
        delete backEndPlayers[socket.id]
        io.emit('updatePlayers', backEndPlayers)
    })

    //Authorative server movement
    socket.on('PlayerInput', ({sequenceNumber, KeyInputMap}) =>{
        backEndPlayers[socket.id].sequenceNumber = sequenceNumber
        // console.log(sequenceNumber+ '       ' + backEndPlayers[socket.id].sequenceNumber)
        //TODO has to be called by the gameCycle
        const speed = 5;
        if(KeyInputMap.E68){backEndPlayers[socket.id].x+=1*speed}
        if(KeyInputMap.E65){backEndPlayers[socket.id].x-=1*speed}
        if(KeyInputMap.E87){backEndPlayers[socket.id].y-=1*speed}
        if(KeyInputMap.E83){backEndPlayers[socket.id].y+=1*speed}
        // backEndPlayers
    })

    console.log(backEndPlayers)    
})

setInterval(() =>{
    process()
}, 15) //UpdateIntervall

function process(){
    io.emit('updatePlayers', backEndPlayers)
    // console.log(backEndPlayers) 
}

server.listen(port, () => {
    console.log('Listen on Port: ' + port)
})

console.log('Server Loaded')