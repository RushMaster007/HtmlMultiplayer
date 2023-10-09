addEventListener("click", (event) => {
  const playerPosition = {
    x: frontEndPlayers[socket.id].x,
    y: frontEndPlayers[socket.id].y,
  };

  const angle = Math.atan2(
    event.clientY * window.devicePixelRatio - playerPosition.y,
    event.clientX * window.devicePixelRatio - playerPosition.x
  );

  socket.emit("fire", { angle });
});
