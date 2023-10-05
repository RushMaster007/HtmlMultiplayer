class Player{
    constructor({ x, y, radius, color, username, sequenceNumber}) {
        this.x = x
        this.y = y
        this.radius = radius
        this.color = color
        this.username = username
        this.sequenceNumber = sequenceNumber
    }

    draw(){
        ctx.font = '12px sans-serif'
        ctx.fillStyle = 'white'
        ctx.fillText(this.username, this.x-10, this.y+20)
        ctx.save()

        // ctx.shadowColor = this.color
        // ctx.shadowBlur = 20

        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius * window.devicePixelRatio, Math.PI * 2, false)
        ctx.fillStyle = this.color
        ctx.fill()
        ctx.restore()
    }
}