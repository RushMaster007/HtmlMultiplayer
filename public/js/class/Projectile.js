class Projectile{
    constructor({x, y, radius, color = 'white', velocity}){
        this.x = x
        this.y = y
        this.radius = radius
        this.color = color
        this.velocity = velocity
        this.bounces = 2

    }

    draw(){
        ctx.save()
        ctx.beginPath()
        ctx.arc(this.x,this.y,this.radius, 0, Math.PI * 2, false)
        ctx.fillStyle = this.color
        ctx.fill()
        ctx.restore()
    }

    update(){
        this.draw()
        this.x += this.velocity.x
        this.y += this.velocity.y
    }
}