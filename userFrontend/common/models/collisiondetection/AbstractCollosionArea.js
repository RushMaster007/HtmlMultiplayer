class AbstractCollosionArea {
  constructor({ x, y }) {
    if (this.constructor == StaticObject)
      throw ErrorHandler.Error_AbstractClass;
    this.x = x;
    this.y = y;
  }

  settype() {
    throw new Error("Method 'settype()' must be implemented.");
  }

  DrawCollisionShape() {
    ctx.beginPath();
    ctx.fillStyle = this.color;
    this.settype();
    ctx.restore();
  }

  getCollisionShape() {
    throw new Error("Method 'getCollisionShape()' must be implemented.");
  }
}
