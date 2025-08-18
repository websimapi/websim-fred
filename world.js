import { NPC, Crab } from 'npc';

class World {
    constructor(game) {
        this.game = game;
        this.bounds = { width: 3000, height: 2000 };
        this.collectibles = [];
        this.npcs = [];
        this.hazards = [];
        this.backgroundEntities = {
            far: [],
            mid: [],
            near: []
        };
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

        // Add NPCs
        this.npcs.push(new Crab(800, this.bounds.height - 100, this.game));
        
        // Generate background entities
        this.generateBackgroundEntities();
    }
    
    generateBackgroundEntities() {
        // Far background entities (large, distant)
        for (let i = 0; i < 8; i++) {
            const width = Math.random() * 200 + 150;
            const height = Math.random() * 100 + 75;
            this.backgroundEntities.far.push({
                x: Math.random() * this.bounds.width,
                y: 1800, // place rocks around 1800Y
                image: this.game.assets.rock,
                type: 'rock',
                width: width,
                height: height,
                alpha: 0.3
            });
        }
        
        // Mid background entities
        for (let i = 0; i < 12; i++) {
            const entities = ['coral', 'seaweed', 'rock'];
            const entityType = entities[Math.floor(Math.random() * entities.length)];
            const width = Math.random() * 120 + 80;
            const height = Math.random() * 150 + 100;
            this.backgroundEntities.mid.push({
                x: Math.random() * this.bounds.width,
                y: (entityType === 'rock' || entityType === 'coral') ? 1800 : this.bounds.height - (height / 2) - (Math.random() * 50),
                image: this.game.assets[entityType],
                type: entityType,
                width: width,
                height: height,
                alpha: 0.5
            });
        }
        
        // Near background entities
        for (let i = 0; i < 25; i++) {
            const entities = ['coral', 'seaweed', 'rock'];
            const entityType = entities[Math.floor(Math.random() * entities.length)];
            const width = Math.random() * 60 + 100;
            const height = Math.random() * 80 + 140;
            this.backgroundEntities.near.push({
                x: Math.random() * this.bounds.width,
                y: (entityType === 'rock' || entityType === 'coral') ? 1800 : this.bounds.height - (height / 2) - (Math.random() * 70),
                image: this.game.assets[entityType],
                width: width,
                height: height,
                alpha: entityType === 'rock' ? 1 : 0.8
            });
        }
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

    drawBackground(ctx, camera) {
        // Solid background layers
        const bgFar = this.game.assets.backgroundFar;
        // const bgMid = this.game.assets.backgroundMid;

        const parallaxFactorFar = 0.1;
        const parallaxFactorMid = 0.3;
        
        // Draw solid backgrounds
        this.drawBackgroundLayer(ctx, bgFar, camera.x * parallaxFactorFar, camera.y * parallaxFactorFar);
        
        // Draw far background entities
        ctx.save();
        ctx.translate(-camera.x * parallaxFactorFar, -camera.y * parallaxFactorFar);
        this.backgroundEntities.far.forEach(entity => {
            if (entity.type === 'rock') {
                ctx.globalAlpha = 1;
            } else {
                ctx.globalAlpha = entity.alpha;
            }
            ctx.drawImage(entity.image, entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
        });
        ctx.restore();
        
        // ctx.globalAlpha = 0.5;
        // this.drawBackgroundLayer(ctx, bgMid, camera.x * parallaxFactorMid, camera.y * parallaxFactorMid);
        // ctx.globalAlpha = 1;
        
        // Draw mid background entities
        ctx.save();
        ctx.translate(-camera.x * parallaxFactorMid, -camera.y * parallaxFactorMid);
        this.backgroundEntities.mid.forEach(entity => {
            if (entity.type === 'rock') {
                ctx.globalAlpha = 1;
            } else {
                ctx.globalAlpha = entity.alpha;
            }
            ctx.drawImage(entity.image, entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
        });
        ctx.restore();
    }

    drawForeground(ctx, camera) {
        // const bgNear = this.game.assets.backgroundNear;
        const parallaxFactorNear = 0.6;

        // Draw near background (foreground)
        // ctx.globalAlpha = 0.3;
        // this.drawBackgroundLayer(ctx, bgNear, camera.x * parallaxFactorNear, camera.y * parallaxFactorNear);
        // ctx.globalAlpha = 1;

        // Draw near background entities
        ctx.save();
        ctx.translate(-camera.x * parallaxFactorNear, -camera.y * parallaxFactorNear);
        this.backgroundEntities.near.forEach(entity => {
            ctx.globalAlpha = (entity.type === 'rock') ? 1 : entity.alpha;
            ctx.drawImage(entity.image, entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
        });
        ctx.restore();
    }

    draw(ctx, camera) {
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
    }

    drawBackgroundLayer(ctx, image, offsetX, offsetY) {
        if (!image) return;
        
        // Instead of tiling, draw the image to cover the entire world bounds.
        // The camera clamping will handle showing black void at edges.
        ctx.drawImage(image, 0, 0, this.bounds.width, this.bounds.height);
    }
}

export default World;