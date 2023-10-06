require('./public/js/class/Player.js')

//#region vars

//#region serverini

const express = require('express')
const { stat } = require('fs')
const app = express()

//Socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, {pingInterval: 2000, pingTimeout: 5000})

const port = 3001

//#endregion serverini

//object lists
const backEndPlayers = {}
const backEndProjectiles = {}
const backEndStaticObjects = {}

let staticObjectsId = 0
let projectileId = 0

//#endregion vars


///GameCicle
setInterval(() =>{    
    updateProjectiles()
    io.emit('updatePlayers', backEndPlayers)
}, 15) 

//Fire interval
setInterval(() =>{
    for( const id in backEndPlayers){
        try {            
            backEndPlayers[id].canFire = true
        } catch (error) {
            console.error(error)
        }
    }
}, 150)


//#region serverIni

app.use(express.static('public'))

server.listen(port, () => {
    console.log('Listen on Port: ' + port)
})

app.get('/', (req, res) =>{
    res.sendFile(__dirname + '/public/html/index.html')
})

//#endregion serverIni


//#region userIni

//Check if new User connects 
io.on('connection', (socket) =>{
    console.log('a user connected')
    

    socket.on('login', (username) => {
        createUser(socket.id, username)
        initCanvas(socket)
    })

    //socket for single client io for all
    io.emit('updatePlayers', backEndPlayers)

    

    socket.on('fire', ({angle}) =>{
        // console.log(backEndPlayers[socket.id].canFire)
        try {
            if(backEndPlayers[socket.id].canFire == false)
            return
            backEndPlayers[socket.id].canFire = false
            const x = backEndPlayers[socket.id].x  
            const y = backEndPlayers[socket.id].y  

            projectileId++;

            const velocity = {

                x: Math.cos(angle) * 15 ,
                y: Math.sin(angle) * 15
            }

            backEndProjectiles[projectileId] = {
                x,
                y,
                velocity,
                playerId: socket.id,
                bounces: 1
            }  
        } catch (error) {
           console.error(error) 
        }
        
    })

    socket.on('disconnect', (reason) => {
        console.log(reason)
        delete backEndPlayers[socket.id]
        io.emit('updatePlayers', backEndPlayers)
    })

    //Authorative server movement
    socket.on('PlayerInput', ({sequenceNumber, KeyInputMap}) =>{
        if (!backEndPlayers[socket.id])
            return
        backEndPlayers[socket.id].sequenceNumber = sequenceNumber
        //TODO has to be called by the gameCycle
        const SPEED = 5
        let PLAYERX = 0,PLAYERY = 0
        if(KeyInputMap.E68){PLAYERX += 1}
        if(KeyInputMap.E65){PLAYERX -= 1}
        if(KeyInputMap.E87){PLAYERY -= 1}
        if(KeyInputMap.E83){PLAYERY += 1}

        //Move
        // if(collosionDetection(backEndPlayers[socket.id].x + (PLAYERX * SPEED)), backEndPlayers[socket.id].y += PLAYERY * SPEED){
            if(isPositionValid(backEndPlayers[socket.id].x + PLAYERX * SPEED,backEndPlayers[socket.id].y + PLAYERY * SPEED)){
                backEndPlayers[socket.id].x += PLAYERX * SPEED 
                backEndPlayers[socket.id].y += PLAYERY * SPEED
            }
        // }
    })
})

function createUser(socketid, username){
    test = new Player()
    backEndPlayers[socketid] = {
        x: 1500 * Math.random() +100,
        y: 700 * Math.random() +100,
        color: `hsl(${360 * Math.random()}, 100%, 50%)` ,
        sequenceNumber: 0,//set to check all inputs not handled so far
        canFire: false,
        userName: username.slice(0,20),
        radius: 10
    }
}

function initCanvas(socket){
    socket.on('initCanvas', ({width, height, devicePixelRatio}) =>{
        backEndPlayers[socket.id].canvas ={
            width,
            height
        }
        
        // backEndPlayers[socket.id].radius = devicePixelRatio * PLAYERRADIUS //Set player heiht


        //TODO may has to be moved after lvl implimentation
        socket.emit('initStaticObjects', backEndStaticObjects)
    })
}

function isPositionValid(GOTOX,GOTOY){
    //TODO get dinamic valid position
    if(GOTOX < 10 || GOTOX >1700 || GOTOY < 10 || GOTOY > 900)
        return false
    return true
}

//#endregion userIni


//#region projectiles

///updates all the projectiles
function updateProjectiles(){
    for( const id in backEndProjectiles){
        if (!backEndProjectiles)
            continue
        updateProjectilePosition(id)
        hitdetection(id)
    }
    io.emit('updateProjectiles', backEndProjectiles)  
}

function updateProjectilePosition(id){
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y
    const PROJECTILERADIUS = 5
    // console.log(backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.width) // height
    if(backEndProjectiles[id].x -PROJECTILERADIUS >= 1700 ||
        backEndProjectiles[id].x + PROJECTILERADIUS <= 0 ){
            if(backEndProjectiles[id].bounces > 0){
                backEndProjectiles[id].velocity.x = -backEndProjectiles[id].velocity.x;
                backEndProjectiles[id].bounces--;
            }
            else {
                delete backEndProjectiles[id];
                console.log('bounce')
            }
        }
    else if(backEndProjectiles[id].y -PROJECTILERADIUS >= 900 ||
        backEndProjectiles[id].y + PROJECTILERADIUS <= 0){
        if(backEndProjectiles[id].bounces > 0){
            backEndProjectiles[id].velocity.y = -backEndProjectiles[id].velocity.y;
            backEndProjectiles[id].bounces--;
        }
        else {
            delete backEndProjectiles[id];
        }
    }
}

function hitdetection(id){
    for (const playerId in backEndPlayers){
        const backEndPlayer = backEndPlayers[playerId]
        // console.log(backEndProjectiles[id].x)
        const DISTANCE = Math.hypot(
                                backEndProjectiles[id]?.x - backEndPlayer?.x, 
                                backEndProjectiles[id]?.y - backEndPlayer?.y)
        
        //TODO: backEndProjectiles[id].radius has to be added 
        // console.log(backEndProjectiles[id].playerId + ' '+backEndPlayer.radius)
        if (DISTANCE <  5 + backEndPlayer.radius && 
            backEndProjectiles[id].playerId !== playerId){
            delete backEndProjectiles[id]
            playerDied(playerId)
            // socket[playerId].emit('died','test')
            // console.log(DISTANCE)
            break
        }
    }
}

//#endregion projectiles


//#region players

function playerDied(playerId){   
    const BACKENDPLAYERNAME = backEndPlayers[playerId].userName
    delete backEndPlayers[playerId]
    setTimeout(() =>{
        createUser(playerId, BACKENDPLAYERNAME)    
        console.log('respawn')    
    }, 1000)
}

//#endregion players


//#region staticBody

///Builds all the static objects for the level
function buildMapObjects(){
    // createStatcObject({x:100,y:100,width:100,height:100,color:'white',class:'Tank'})
}

///Creates an static object
function createStatcObject(object){
    staticObjectsId++;
    backEndStaticObjects[staticObjectsId] = object//Object.create(Tank, {x:1,y:1,width:1,height:1,color:'green'})
    // backEndStaticObjects[staticObjectsId] = new 
}

///TODO Checks if someting collides with a static object
function collosionDetection(GOTOX,GOTOY){
    // for (const playerId in backEndPlayers){
    //     const backEndPlayer = backEndPlayers[playerId]
    //     // console.log(backEndProjectiles[id].x)
    //     const DISTANCE = Math.hypot(
    //                             backEndProjectiles[id]?.x - backEndPlayer?.x, 
    //                             backEndProjectiles[id]?.y - backEndPlayer?.y)
        
    //     //TODO: backEndProjectiles[id].radius has to be added 
    //     if (DISTANCE <  5 + backEndPlayer.radius && 
    //         backEndProjectiles[id].playerId !== playerId){
    //         delete backEndProjectiles[id]
    //         delete backEndPlayers[playerId]
    //         console.log(DISTANCE)
    //         break
    //     }
    // }
    // return ture
}

//#endregion staticBody


//#region ini

console.log('Server Loaded')

buildMapObjects()

//#endregion ini