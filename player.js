import { ParticleSystem } from 'particles';

class Player {
    constructor(x, y, game) {
        this.game = game;
        this.image = game.assets.freddie;
        this.width = 80;
        this.height = 50;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.speed = 400;
        this.turnSpeed = 5;
        this.friction = 0.95;
        this.dashCooldown = 0;
        this.dashDuration = 0;
        this.health = 100;
        this.pearls = 0;
    }

    update(input, deltaTime) {
        // Cooldowns
        if (this.dashCooldown > 0) this.dashCooldown -= deltaTime;
        if (this.dashDuration > 0) this.dashDuration -= deltaTime;

        // Dash logic
        if ((input.keys.includes(' ') || input.mouse.down) && this.dashCooldown <= 0) {
            this.dashDuration = 0.15;
            this.dashCooldown = 1.0;
            this.game.playSound('dash');
            this.game.particleSystem.createExplosion(this.x, this.y, 'bubble', 20, 0.5, 300);
        }

        const currentSpeed = this.dashDuration > 0 ? this.speed * 3 : this.speed;

        // Movement based on target
        let targetX = input.mouse.x + this.game.camera.x;
        let targetY = input.mouse.y + this.game.camera.y;

        let dx = targetX - this.x;
        let dy = targetY - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let targetAngle = Math.atan2(dy, dx);

        // Smooth turning
        let angleDiff = targetAngle - this.angle;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;

        this.angle += angleDiff * this.turnSpeed * deltaTime;
        
        if (distance > this.width / 4) {
            this.vx += Math.cos(this.angle) * currentSpeed * deltaTime;
            this.vy += Math.sin(this.angle) * currentSpeed * deltaTime;
        }

        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Boundaries
        const worldBounds = this.game.world.bounds;
        this.x = Math.max(this.width/2, Math.min(this.x, worldBounds.width - this.width/2));
        this.y = Math.max(this.height/2, Math.min(this.y, worldBounds.height - this.height/2));

        // Emit bubble particles
        if (Math.random() > 0.8) {
             this.game.particleSystem.createParticle(this.x - Math.cos(this.angle)*20, this.y - Math.sin(this.angle)*20, 'bubble', 0.2);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Flip image if moving left
        if(Math.cos(this.angle) < 0) {
            ctx.scale(1, -1);
        }

        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.game.playSound('bump');
        if (this.health < 0) this.health = 0;
        // Simple respawn for now
        if (this.health === 0) {
            this.x = this.game.width / 2;
            this.y = this.game.height / 2;
            this.health = 100;
        }
    }
}

export default Player;

