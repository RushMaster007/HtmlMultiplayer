//#region serverini

const environment = require("./environments/environment");
const express = require("express");
const http = require("http");
const { start } = require("repl");
const { Server } = require("socket.io");
const app = express();

//Socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
  pingInterval: environment.pingInterval,
  pingTimeout: environment.pingTimeout,
});

app.use(express.static(environment.frontendFolder));

server.listen(environment.port, () => {
  console.log("Listen on Port: " + environment.port);
  console.log("localhost:" + environment.port);
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + environment.frontendFolder);
});

//#endregion serverini

//#region requires

const Player = require(environment.modelFolder + "Player.js");
const Projectile = require(environment.modelFolder + "projectile.js");

//#endregion requires

//#region vars

const backEndPlayers = {};
const backEndProjectiles = {};
const backEndStaticObjects = {};

let staticObjectsId = 0;
let projectileId = 0;

//#endregion vars

/// Game-Cicle
setInterval(() => {
  updateProjectiles();
  io.emit("updatePlayers", backEndPlayers);
  io.emit("updateProjectiles", backEndProjectiles);
}, 15);

/// Fire-Interval //TODO REPLACE
setInterval(() => {
  for (const id in backEndPlayers) {
    try {
      backEndPlayers[id].canFire = true;
    } catch (error) {
      console.error(error);
    }
  }
}, 150);

//#region methods

//Check if new User connects
io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("login", (userName) => {
    createUser(socket.id, userName);
    initCanvas(socket);
  });

  //socket for single client io for all
  io.emit("updatePlayers", backEndPlayers);

  socket.on("fire", ({ angle }) => {
    // console.log(backEndPlayers[socket.id].canFire)
    try {
      if (backEndPlayers[socket.id].canFire == false) return;
      backEndPlayers[socket.id].canFire = false;
      const x = backEndPlayers[socket.id].x;
      const y = backEndPlayers[socket.id].y;

      projectileId++;

      const velocity = {
        x: Math.cos(angle) * 15,
        y: Math.sin(angle) * 15,
      };

      backEndProjectiles[projectileId] = {
        x,
        y,
        velocity,
        playerId: socket.id,
      };
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(reason);
    delete backEndPlayers[socket.id];
    io.emit("updatePlayers", backEndPlayers);
  });

  //Authorative server movement
  socket.on("PlayerInput", ({ sequenceNumber, KeyInputMap }) => {
    if (!backEndPlayers[socket.id]) return;
    backEndPlayers[socket.id].sequenceNumber = sequenceNumber;
    //TODO has to be called by the gameCycle
    const SPEED = 5;
    let PLAYERX = 0,
      PLAYERY = 0;
    if (KeyInputMap.E68) {
      PLAYERX += 1;
    }
    if (KeyInputMap.E65) {
      PLAYERX -= 1;
    }
    if (KeyInputMap.E87) {
      PLAYERY -= 1;
    }
    if (KeyInputMap.E83) {
      PLAYERY += 1;
    }

    //Move
    // if(collosionDetection(backEndPlayers[socket.id].x + (PLAYERX * SPEED)), backEndPlayers[socket.id].y += PLAYERY * SPEED){
    if (
      isInGameArea(
        backEndPlayers[socket.id].x + PLAYERX * SPEED,
        backEndPlayers[socket.id].y + PLAYERY * SPEED
      )
    ) {
      backEndPlayers[socket.id].x += PLAYERX * SPEED;
      backEndPlayers[socket.id].y += PLAYERY * SPEED;
    }
    // }
  });
});

function initCanvas(socket) {
  socket.on("initCanvas", ({ width, height, devicePixelRatio }) => {
    backEndPlayers[socket.id].canvas = {
      width,
      height,
    };

    // backEndPlayers[socket.id].radius = devicePixelRatio * PLAYERRADIUS //Set player heiht

    //TODO may has to be moved after lvl implimentation
    socket.emit("initStaticObjects", backEndStaticObjects);
  });
}

function isInGameArea(GOTOX, GOTOY) {
  if (GOTOX < 10 || GOTOX > 1700 || GOTOY < 10 || GOTOY > 900) return false;
  return true;
}

function updateProjectiles() {
  for (const id in backEndProjectiles) {
    if (!backEndProjectiles) continue;
    updateProjectilePosition(id);
    hitdetection(id);
  }
}

function updateProjectilePosition(id) {
  backEndProjectiles[id].x += backEndProjectiles[id].velocity.x;
  backEndProjectiles[id].y += backEndProjectiles[id].velocity.y;

  //TODO: has to be deleted, if it leafes the Arena, or hits not if it lefts the screen
  const PROJECTILERADIUS = 5;
  if (
    backEndProjectiles[id].x - PROJECTILERADIUS >=
      backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.width ||
    backEndProjectiles[id].x + PROJECTILERADIUS <= 0 ||
    backEndProjectiles[id].y - PROJECTILERADIUS >=
      backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.height ||
    backEndProjectiles[id].y + PROJECTILERADIUS <= 0
  ) {
    if (backEndProjectiles[id]) delete backEndProjectiles[id];
  }
}

function hitdetection(id) {
  for (const playerId in backEndPlayers) {
    const backEndPlayer = backEndPlayers[playerId];
    const DISTANCE = Math.hypot(
      backEndProjectiles[id]?.x - backEndPlayer?.x,
      backEndProjectiles[id]?.y - backEndPlayer?.y
    );

    //TODO: backEndProjectiles[id].radius has to be added
    if (
      DISTANCE < 5 + backEndPlayer.radius &&
      backEndProjectiles[id].playerId !== playerId
    ) {
      delete backEndProjectiles[id];
      playerDied(playerId);
      break;
    }
  }
}

function createUser(socketid, userName) {
  backEndPlayers[socketid] = {
    x: 1500 * Math.random() + 100,
    y: 700 * Math.random() + 100,
    color: `hsl(${360 * Math.random()}, 100%, 50%)`,
    sequenceNumber: 0, //set to check all inputs not handled so far
    canFire: false,
    userName: userName.slice(0, 20),
    radius: 10,
  };
}

function playerDied(playerId) {
  const BACKENDPLAYERNAME = backEndPlayers[playerId].userName;
  delete backEndPlayers[playerId];
}

function respawnUser() {
  setTimeout(() => {
    createUser(playerId, BACKENDPLAYERNAME);
    console.log(backEndPlayers[playerId].userName + "respawned");
  }, 1000);
}

///Builds all the static objects for the level
function buildMapObjects() {
  // createStatcObject({x:100,y:100,width:100,height:100,color:'white',class:'Tank'})
}

///Creates an static object
function createStatcObject(object) {
  staticObjectsId++;
  backEndStaticObjects[staticObjectsId] = object; //Object.create(Tank, {x:1,y:1,width:1,height:1,color:'green'})
}

///TODO Checks if someting collides with a static object
function collosionDetection(GOTOX, GOTOY) {
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

//#endregion methods

//#region startup

startServer();

///Initial function to start the server after everything is setup
function startServer() {
  console.log("Server Loaded");
  buildMapObjects();
}

//#endregion startup
