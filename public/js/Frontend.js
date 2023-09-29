const socket = io()

//Create a Playing-area
const canvas = document.getElementById("MainCanvas");
const ctx = canvas.getContext("2d");

//Set Window dimensions
const devicePixelRatio = window.devicePixelRatio || 1
canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio

const frontEndPlayers = {}//All players known to the client

const frontEndPlayer = frontEndPlayers[socket.id];

KeyInputMap ={E68: false,E65: false,E87: false,E83: false,};

//Gets called on join of a new player
socket.on('updatePlayers', (backEndPlayers) => {
    process()
    for( const id in backEndPlayers){
        const backendPlayer = backEndPlayers[id]

        //adds player if client doesn't know it
        if(!frontEndPlayers[id]){
            frontEndPlayers[id] = new Player({
                  x:backendPlayer.x
                , y:backendPlayer.y
                , radius:10
                , color: backendPlayer.color
                , username:('User: '+id)
                , sequenceNumber: backendPlayer.sequenceNumber
            })
        }
        else {
            if (id === socket.id){  //Own Player
                // console.log(sequenceNumber+ '       ' + frontEndPlayers[id].sequenceNumber)
                frontEndPlayers[id].x = backEndPlayers[id].x
                frontEndPlayers[id].y = backEndPlayers[id].y
                frontEndPlayers[id].sequenceNumber = backEndPlayers[id].sequenceNumber

                //Server reconciliation
                //Handle leftover inputs of the player
                const lastBackendInputIndex = playerInputs.findIndex(input =>{
                    return backEndPlayers[id].sequenceNumber === input.sequenceNumber
                })

                if(lastBackendInputIndex >= 0)
                    playerInputs.splice(0, lastBackendInputIndex + 1)

                playerInputs.forEach(input => {
                    clientSidePrediction(input.KeyInputMap)
                })
                // console.log(frontEndPlayers[id].x+ '   ' + frontEndPlayers[id].y)     

            }
            else{   //Other players
                // frontEndPlayers[id].x = backEndPlayers[id].x
                // frontEndPlayers[id].y = backEndPlayers[id].y           
                // console.log(frontEndPlayers[id].x+ '   ' + frontEndPlayers[id].y) 

                // interpolate position with gsap 
                gsap.to(frontEndPlayers[id], {
                    x:backEndPlayers[id].x ,
                    y:backEndPlayers[id].y ,
                    duration: 0.015, //Tickrate des Servers
                    ease: 'linear' //acceleration/deceleration
                })
            }
        }
    }

    for( const id in frontEndPlayers){
        // deletes player if the server doesn't know it
        if(!backEndPlayers[id]){  
            delete frontEndPlayers[id]
        }
    }
    
    // updatePlayerPositions(backEndPlayers);
    animate()
})

function animate(){
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for(const id in frontEndPlayers){
        const frontEndPlayer = frontEndPlayers[id]

        frontEndPlayer.draw()
    }
}

// function updatePlayerPositions(backEndPlayers){
//     for(const id in backEndPlayers){
//         frontEndPlayers[socket.id].x = backEndPlayers[id].x
//         frontEndPlayers[id].y = backEndPlayers[id].y
//     } 
// }

//Gets the pressed Keys
onkeydown = onkeyup = function(e){
    // if(!frontEndPlayer[socket.id]) return
    e = e || event; // to deal with IE
    KeyInputMap['E'+ e.keyCode] = e.type == 'keydown';
}

setInterval(() =>{
    // process()
}, 1000) //UpdateIntervall

//All the Inputs tracked, to be worked on
const playerInputs = []
let sequenceNumber = 0
function process(){
    sequenceNumber++
    playerInputs.push({sequenceNumber, KeyInputMap})
    socket.emit('PlayerInput', {sequenceNumber, KeyInputMap} )
    clientSidePrediction(KeyInputMap)
}

function clientSidePrediction(keyInputs){
    const speed = 5;
        if(keyInputs.E68){frontEndPlayers[socket.id].x+=1*speed}
        if(keyInputs.E65){frontEndPlayers[socket.id].x-=1*speed}
        if(keyInputs.E87){frontEndPlayers[socket.id].y-=1*speed}
        if(keyInputs.E83){frontEndPlayers[socket.id].y+=1*speed}
        animate()
}