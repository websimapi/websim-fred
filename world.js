import { NPC, Crab } from 'npc';

class World {
    constructor(game) {
        this.game = game;
        this.bounds = { width: 3000, height: 2000 };
        this.collectibles = [];
        this.npcs = [];
        this.hazards = [];
        this.scenery = [];
        this.generate();
    }

    generate() {
        // Generate pearls
        for (let i = 0; i < 50; i++) {
            this.collectibles.push({
                x: Math.random() * this.bounds.width,
                y: Math.random() * this.bounds.height,
                type: 'pearl',
                image: this.game.assets.pearl,
                width: 30,
                height: 30,
                collected: false
            });
        }
        
        // Generate hazards (jellyfish)
         for (let i = 0; i < 15; i++) {
            this.hazards.push({
                x: Math.random() * this.bounds.width,
                y: Math.random() * this.bounds.height,
                startY: Math.random() * this.bounds.height,
                type: 'jellyfish',
                image: this.game.assets.jellyfish,
                width: 60,
                height: 90,
                damage: 10,
                bobSpeed: Math.random() * 0.5 + 0.2,
                bobRange: Math.random() * 50 + 20,
            });
        }

        // Generate Scenery
        for (let i = 0; i < 30; i++) {
            this.scenery.push({
                x: Math.random() * this.bounds.width,
                y: this.bounds.height - (Math.random() * 50 + 40), // On the seabed
                image: Math.random() > 0.5 ? this.game.assets.coral : this.game.assets.seaweed,
                width: Math.random() * 50 + 50,
                height: Math.random() * 80 + 80,
                parallax: 0.45 // Slightly faster than mid background
            });
        }
        // Sort scenery by y-position to create depth
        this.scenery.sort((a, b) => a.y - b.y);

        // Add NPCs
        this.npcs.push(new Crab(800, this.bounds.height - 100, this.game));
    }

    update(deltaTime, player) {
        // Collision with collectibles
        this.collectibles.forEach(item => {
            if (!item.collected) {
                const dx = player.x - item.x;
                const dy = player.y - item.y;
                if (Math.sqrt(dx * dx + dy * dy) < (player.width/2 + item.width/2)) {
                    item.collected = true;
                    player.pearls++;
                    this.game.playSound('collect', 1.5);
                    this.game.particleSystem.createExplosion(item.x, item.y, 'sparkle', 15);
                }
            }
        });
        
        // Update hazards
        this.hazards.forEach(hazard => {
            if (hazard.type === 'jellyfish') {
                hazard.y = hazard.startY + Math.sin(Date.now() * 0.001 * hazard.bobSpeed) * hazard.bobRange;
                const dx = player.x - hazard.x;
                const dy = player.y - hazard.y;
                if (Math.sqrt(dx * dx + dy * dy) < (player.width / 3 + hazard.width / 3)) {
                    if(!player.isInvincible) {
                         player.takeDamage(hazard.damage);
                         // simple knockback
                         let angle = Math.atan2(dy, dx);
                         player.vx += Math.cos(angle) * 10;
                         player.vy += Math.sin(angle) * 10;
                    }
                }
            }
        });

        // Update NPCs
        this.npcs.forEach(npc => npc.update(deltaTime, player));
    }

    draw(ctx, camera) {
        // Parallax background
        const bgFar = this.game.assets.backgroundFar;
        const bgMid = this.game.assets.backgroundMid;
        const bgNear = this.game.assets.backgroundNear;

        const parallaxFactorFar = 0.1;
        const parallaxFactorMid = 0.3;
        const parallaxFactorNear = 0.6;
        
        this.drawParallaxLayer(ctx, bgFar, camera, parallaxFactorFar, true);
        this.drawParallaxLayer(ctx, bgMid, camera, parallaxFactorMid, true);
        
        // Draw scenery
        this.scenery.forEach(item => {
            // Basic culling
            const screenX = item.x - camera.x;
            if (screenX + item.width > 0 && screenX < this.game.width) {
                 ctx.drawImage(item.image, item.x - item.width / 2, item.y - item.height, item.width, item.height);
            }
        });
        
        // Draw collectibles
        this.collectibles.forEach(item => {
            if (!item.collected) {
                ctx.drawImage(item.image, item.x - item.width / 2, item.y - item.height / 2, item.width, item.height);
            }
        });
        
        // Draw hazards
        this.hazards.forEach(hazard => {
             ctx.drawImage(hazard.image, hazard.x - hazard.width / 2, hazard.y - hazard.height / 2, hazard.width, hazard.height);
        });

        // Draw NPCs
        this.npcs.forEach(npc => npc.draw(ctx));

        // Foreground
        this.drawParallaxLayer(ctx, bgNear, camera, parallaxFactorNear);

    }

    drawParallaxLayer(ctx, image, camera, parallaxFactor, tile = false) {
        if (!image || !image.width || !image.height) return;

        if (tile) {
            const pattern = ctx.createPattern(image, 'repeat');
            ctx.save();
            ctx.translate(camera.x * parallaxFactor, camera.y * parallaxFactor);
            ctx.fillStyle = pattern;
            // The drawn rectangle's coordinates are relative to the translated origin,
            // so they need to be offset by the negative camera position to cover the screen.
            ctx.fillRect(-camera.x * parallaxFactor, -camera.y * parallaxFactor, this.game.width, this.game.height);
            ctx.restore();
        } else {
            const canvas = this.game.canvas;
            const imgAspectRatio = image.width / image.height;
            const canvasAspectRatio = canvas.width / canvas.height;

            let drawWidth, drawHeight;

            if (imgAspectRatio > canvasAspectRatio) {
                // Image is wider than canvas, so height is the constraining dimension
                drawHeight = canvas.height;
                drawWidth = drawHeight * imgAspectRatio;
            } else {
                // Image is taller or same aspect ratio, so width is the constraining dimension
                drawWidth = canvas.width;
                drawHeight = drawWidth / imgAspectRatio;
            }

            // Center the image
            const x = camera.x * parallaxFactor - (drawWidth - canvas.width) / 2;
            const y = camera.y * parallaxFactor - (drawHeight - canvas.height) / 2;

            ctx.drawImage(image, x, y, drawWidth, drawHeight);
        }
    }
}

export default World;