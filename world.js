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
            this.backgroundEntities.far.push({
                x: Math.random() * this.bounds.width,
                y: Math.random() * this.bounds.height,
                image: this.game.assets.rock,
                width: Math.random() * 200 + 150,
                height: Math.random() * 100 + 75,
                alpha: 0.3
            });
        }
        
        // Mid background entities
        for (let i = 0; i < 12; i++) {
            const entities = ['coral', 'seaweed', 'rock'];
            const entityType = entities[Math.floor(Math.random() * entities.length)];
            this.backgroundEntities.mid.push({
                x: Math.random() * this.bounds.width,
                y: Math.random() * this.bounds.height,
                image: this.game.assets[entityType],
                width: Math.random() * 120 + 80,
                height: Math.random() * 150 + 100,
                alpha: 0.5
            });
        }
        
        // Near background entities
        for (let i = 0; i < 15; i++) {
            const entities = ['coral', 'seaweed'];
            const entityType = entities[Math.floor(Math.random() * entities.length)];
            this.backgroundEntities.near.push({
                x: Math.random() * this.bounds.width,
                y: Math.random() * this.bounds.height,
                image: this.game.assets[entityType],
                width: Math.random() * 80 + 60,
                height: Math.random() * 120 + 80,
                alpha: 0.7
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

    draw(ctx, camera) {
        // Solid background layers
        const bgFar = this.game.assets.backgroundFar;
        const bgMid = this.game.assets.backgroundMid;
        const bgNear = this.game.assets.backgroundNear;

        const parallaxFactorFar = 0.1;
        const parallaxFactorMid = 0.3;
        const parallaxFactorNear = 0.6;
        
        // Draw solid backgrounds
        this.drawSolidBackground(ctx, bgFar, camera.x * parallaxFactorFar, camera.y * parallaxFactorFar);
        
        // Draw far background entities
        ctx.save();
        ctx.translate(-camera.x * parallaxFactorFar, -camera.y * parallaxFactorFar);
        this.backgroundEntities.far.forEach(entity => {
            ctx.globalAlpha = entity.alpha;
            ctx.drawImage(entity.image, entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
        });
        ctx.restore();
        
        this.drawSolidBackground(ctx, bgMid, camera.x * parallaxFactorMid, camera.y * parallaxFactorMid);
        
        // Draw mid background entities
        ctx.save();
        ctx.translate(-camera.x * parallaxFactorMid, -camera.y * parallaxFactorMid);
        this.backgroundEntities.mid.forEach(entity => {
            ctx.globalAlpha = entity.alpha;
            ctx.drawImage(entity.image, entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
        });
        ctx.restore();
        
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

        // Draw near background (foreground)
        this.drawSolidBackground(ctx, bgNear, camera.x * parallaxFactorNear, camera.y * parallaxFactorNear);
        
        // Draw near background entities
        ctx.save();
        ctx.translate(-camera.x * parallaxFactorNear, -camera.y * parallaxFactorNear);
        this.backgroundEntities.near.forEach(entity => {
            ctx.globalAlpha = entity.alpha;
            ctx.drawImage(entity.image, entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
        });
        ctx.restore();
    }

    drawSolidBackground(ctx, image, offsetX, offsetY) {
        if (!image) return;
        ctx.save();
        ctx.translate(-offsetX, -offsetY);
        ctx.drawImage(image, 0, 0, this.game.width + Math.abs(offsetX) * 2, this.game.height + Math.abs(offsetY) * 2);
        ctx.restore();
    }
}

export default World;