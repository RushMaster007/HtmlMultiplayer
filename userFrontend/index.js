const field = {
  height: 900,
  width: 1700,
};

//#region vars

const frontEndPlayers = {}; //All players known to the client

const frontEndProjectiles = {};

const frontEndStaticObjects = {};

var KeyInputMap = { E68: false, E65: false, E87: false, E83: false };

const socket = io();

//Create a Playing-area
/**
 * @type {HTMLCanvasElement}
 */
const canvas = document.getElementById("MainCanvas");
/**
 * @type {CanvasRenderingContext2D}
 */
const ctx = canvas.getContext("2d");

//Set Window dimensions
const scale = window.devicePixelRatio;
canvas.width = field.width * scale;
canvas.height = field.height * scale;

const frontEndPlayer = frontEndPlayers[socket.id];

//All the Inputs tracked, to be worked on
const playerInputs = [];

let sequenceNumber = 0;

let userName = "";

let isDead = false;

//#endregion vars

//#region init

socket.on("connect", () => {
  socket.emit("initCanvas", {
    width: field.width,
    height: field.height,
    scale,
    userName,
  });
});

//#endregion init

//#region player

//Update players-function
socket.on("updatePlayers", (backEndPlayers) => {
  transmitPlayerInputs();

  handleBackendPlayers(backEndPlayers);

  //TODO
  clientSidePrediction(KeyInputMap);

  drawMovableObjects();
});

///Transmitts keyinputs to the server
function transmitPlayerInputs() {
  sequenceNumber++;
  playerInputs.push({ sequenceNumber, KeyInputMap });
  socket.emit("PlayerInput", { sequenceNumber, KeyInputMap });
}

/// Creates new players, and moves existing ones
function handleBackendPlayers(backEndPlayers) {
  for (const id in backEndPlayers) {
    const BACKENDPLAYER = backEndPlayers[id];
    //adds unknown players
    if (!frontEndPlayers[id]) {
      addFrontEndPlayer(id, BACKENDPLAYER);
    }
    //Known players
    else {
      moveFrontEndPlayer(id, BACKENDPLAYER, backEndPlayers);
    }
  }
  deleteFrontEndPlayers(backEndPlayers);
}

///Adds an new frontEndPlayer basend on the backEndPlayer
function addFrontEndPlayer(id, BACKENDPLAYER) {
  frontEndPlayers[id] = new Player({
    x: BACKENDPLAYER.x,
    y: BACKENDPLAYER.y,
    radius: 10,
    color: BACKENDPLAYER.color,
    username: "User: " + id,
    sequenceNumber: BACKENDPLAYER.sequenceNumber,
  });
}

///Moves all the known player
function moveFrontEndPlayer(id, BACKENDPLAYER, backEndPlayers) {
  //Sets target for the sliding-animation as go to position
  frontEndPlayers[id].target = {
    x: BACKENDPLAYER.x,
    y: BACKENDPLAYER.y,
  };

  //This user
  if (id === socket.id) {
    //Handle the client player
    // frontEndPlayers[id].sequenceNumber = backEndPlayers[id].sequenceNumber

    //Server reconciliation: Handle leftover inputs of the player
    const lastBackendInputIndex = playerInputs.findIndex((input) => {
      return backEndPlayers[id].sequenceNumber === input.sequenceNumber;
    });

    //TODO
    if (lastBackendInputIndex >= 0)
      playerInputs.splice(0, lastBackendInputIndex + 1);
    playerInputs.forEach((input) => {
      //Predict all the 'so far' unhandled movenemts on the clientside
      clientSidePrediction(input.KeyInputMap);
    });
  }
}

/// delete not existing players
function deleteFrontEndPlayers(backEndPlayers) {
  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
      delete frontEndPlayers[id];
      if (id == socket.id) {
        clientDied();
      }
    }
  }
}

function clientDied() {
  isDead = true;
}

///Calculates new position the own player should be on
function clientSidePrediction(keyInputs) {
  const speed = 5;
  if (keyInputs.E68) {
    frontEndPlayers[socket.id].target.x += 1 * speed;
  }
  if (keyInputs.E65) {
    frontEndPlayers[socket.id].target.x -= 1 * speed;
  }
  if (keyInputs.E87) {
    frontEndPlayers[socket.id].target.y -= 1 * speed;
  }
  if (keyInputs.E83) {
    frontEndPlayers[socket.id].target.y += 1 * speed;
  }
}

//#endregion player

//#region projectiles

//Update projectiles-functiuon
socket.on("updateProjectiles", (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id];
    if (!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        radius: 5,
        color: frontEndPlayers[backEndProjectile.playerId]?.color,
        velocity: backEndProjectile.velocity,
      });
    } else {
      frontEndProjectiles[id].x += backEndProjectiles[id].velocity.x;
      frontEndProjectiles[id].y += backEndProjectiles[id].velocity.y;
    }
  }

  // deletes projectile if the server doesn't know it
  for (const id in frontEndProjectiles) {
    if (!backEndProjectiles[id]) {
      delete frontEndProjectiles[id];
    }
  }
});

//#endregion projectiles

//#region staticObjects

socket.on("initStaticObjects", (backEndStaticObjects) => {
  for (const id in backEndStaticObjects) {
    const backEndStaticObject = backEndStaticObjects[id];
    if (backEndStaticObject.class == "Tank") {
      frontEndStaticObjects[id] = new Tank({
        x: backEndStaticObject.x,
        y: backEndStaticObject.y,
        width: backEndStaticObject.width,
        height: backEndStaticObject.height,
        color: backEndStaticObject.color,
      });

      console.log(frontEndStaticObjects[id]);
    }
  }
});

function drawStaticObjects() {
  for (const id in frontEndStaticObjects) {
    frontEndStaticObjects[id].draw();
  }
}

//#endregion staticObjects

//#region animation

///Draws the entire screen for the user
function drawMovableObjects() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#333";
  ctx.fillRect(0, 0, field.width, field.height);
  drawPlayers();
  drawProjectiles();
  drawStaticObjects();
  if (isDead) {
    ctx.fillStyle = "#FFFFFFAA";
    ctx.fillRect(0, 0, field.width, field.height);
  }
}

///Draws all frontEndPlayers
function drawPlayers() {
  for (const id in frontEndPlayers) {
    //Players
    const frontEndPlayer = frontEndPlayers[id];

    if (frontEndPlayer.target) {
      //Linear interpolation
      frontEndPlayers[id].x +=
        (frontEndPlayers[id].target.x - frontEndPlayers[id].x) * 0.5;
      frontEndPlayers[id].y +=
        (frontEndPlayers[id].target.y - frontEndPlayers[id].y) * 0.5;
    }
    frontEndPlayer.draw();
  }
}

///Draws all frontEndProjectiles
function drawProjectiles() {
  for (const id in frontEndProjectiles) {
    //Projectiles
    const frontEndProjectile = frontEndProjectiles[id];
    frontEndProjectile.draw();
  }
}

//#endregion animation

//#region keymapping

//Gets the pressed Keys
onkeydown = onkeyup = function (e) {
  // if(!frontEndPlayer[socket.id]) return
  e = e || event; // to deal with IE
  KeyInputMap["E" + e.keyCode] = e.type == "keydown";
};
//#endregion keymapping
