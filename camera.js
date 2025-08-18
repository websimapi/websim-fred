class Camera {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
    }

    update(target) {
        this.x += (target.x - this.x - this.game.width / 2) * 0.08;
        this.y += (target.y - this.y - this.game.height / 2) * 0.08;
    }
}

export default Camera;

