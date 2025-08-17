import { ParticleSystem } from 'particles';

class Player {
    constructor(x, y, game) {
        this.game = game;
        this.image = game.assets.freddie;
        this.width = 80;
        this.height = 50;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.speed = 350; // Adjusted for new movement logic
        this.turnSpeed = 5; // Will be used for interpolation
        this.dashCooldown = 0;
        this.dashDuration = 0;
        this.health = 100;
        this.pearls = 0;

        // For swim animation
        this.swimCycle = 0;
    }

    update(input, deltaTime) {
        // Cooldowns
        if (this.dashCooldown > 0) this.dashCooldown -= deltaTime;
        if (this.dashDuration > 0) this.dashDuration -= deltaTime;

        // Set target on click/touch
        if (input.mouse.clicked) {
            this.targetX = input.mouse.x + this.game.camera.x;
            this.targetY = input.mouse.y + this.game.camera.y;
        }

        // Dash logic
        if (input.keys.includes(' ') && this.dashCooldown <= 0) {
            this.dashDuration = 0.15;
            this.dashCooldown = 1.0;
            this.game.playSound('dash');
            this.game.particleSystem.createExplosion(this.x, this.y, 'bubble', 20, 0.5, 300);
        }

        const currentSpeed = this.dashDuration > 0 ? this.speed * 3 : this.speed;

        // --- New Movement Logic ---
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        let desiredVx = 0;
        let desiredVy = 0;

        if (distance > 5) { // Stop if very close to the target
            desiredVx = (dx / distance) * currentSpeed;
            desiredVy = (dy / distance) * currentSpeed;
        }

        // Smoothly interpolate velocity towards the desired velocity
        const lerpFactor = this.turnSpeed * deltaTime;
        this.vx += (desiredVx - this.vx) * lerpFactor;
        this.vy += (desiredVy - this.vy) * lerpFactor;
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Update angle to match velocity
        if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
            this.angle = Math.atan2(this.vy, this.vx);
        }

        // Update swim animation cycle based on speed
        const currentVelocity = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.swimCycle += (currentVelocity / 100) * deltaTime;
        
        // Boundaries
        const worldBounds = this.game.world.bounds;
        this.x = Math.max(this.width/2, Math.min(this.x, worldBounds.width - this.width/2));
        this.y = Math.max(this.height/2, Math.min(this.y, worldBounds.height - this.height/2));

        // Emit bubble particles when moving
        if (currentVelocity > 20 && Math.random() > 0.5) {
             const backX = this.x - Math.cos(this.angle) * this.width/2;
             const backY = this.y - Math.sin(this.angle) * this.width/2;
             this.game.particleSystem.createParticle(backX, backY, 'bubble', 0.2, 0.5);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Determine flip based on horizontal velocity. The base image faces right.
        const isFlipped = this.vx < 0;
        if (isFlipped) {
            ctx.scale(-1, 1);
        }

        // Rotate to match the angle of movement.
        // The angle is calculated from velocity, so it's always correct relative to the world.
        // The scale(-1, 1) will correctly mirror the rotation.
        ctx.rotate(this.angle);

        // --- Swim Animation ---
        const swimBend = Math.sin(this.swimCycle * 20) * 0.1; // Amount of bend
        
        // Apply the bend. This should be applied after rotation and flip.
        ctx.scale(1 + swimBend, 1 - swimBend);

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