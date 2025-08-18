class Camera {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
    }

    update(target) {
        let targetX = target.x - this.game.width / 2;
        let targetY = target.y - this.game.height / 2;
        
        const worldBounds = this.game.world.bounds;

        // Clamp camera to world bounds
        targetX = Math.max(0, Math.min(targetX, worldBounds.width - this.game.width));
        targetY = Math.max(0, Math.min(targetY, worldBounds.height - this.game.height));

        // Smoothly follow the target
        this.x += (targetX - this.x) * 0.08;
        this.y += (targetY - this.y) * 0.08;
    }
}

export default Camera;

