class Particle {
    constructor(x, y, game, image, life = 1, size = 10, vx = 0, vy = 0) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.image = game.assets[image];
        this.life = life;
        this.initialLife = life;
        this.size = size;
        this.vx = vx;
        this.vy = vy;
        this.gravity = -20;
        this.alpha = 1;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.vy += this.gravity * deltaTime;
        this.alpha = this.life / this.initialLife;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.drawImage(this.image, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

export class ParticleSystem {
    constructor(game) {
        this.game = game;
        this.particles = [];
    }

    createParticle(x, y, image, sizeVariance = 0, life=1) {
        const size = Math.random() * 10 + 5;
        const lifeSpan = Math.random() * 0.5 + life;
        const vx = (Math.random() - 0.5) * 10;
        const vy = (Math.random() - 0.5) * 10;
        this.particles.push(new Particle(x, y, this.game, image, lifeSpan, size, vx, vy));
    }
    
    createExplosion(x, y, image, count = 10, life=1, speed = 100) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * speed;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            const size = Math.random() * 15 + 5;
            const lifeSpan = Math.random() * 0.5 + life;
            this.particles.push(new Particle(x, y, this.game, image, lifeSpan, size, vx, vy));
        }
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}

