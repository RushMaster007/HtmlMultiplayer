class Tank extends StaticObject {
  constructor({ x, y, width, height, color }) {
    super({ x, y, width, height, color });
  }

  settype() {
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
