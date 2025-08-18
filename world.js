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
        this.scenery = []; // new in-world scenery layer
        this.generate();
    }

    generate() {
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

        // Spawn rocks and coral at same level as crab
        const crabLevelY = this.bounds.height - 100;
        for (let i = 0; i < 12; i++) {
            const isRock = Math.random() < 0.5;
            const img = isRock ? this.game.assets.rock : this.game.assets.coral;
            const w = Math.random() * 140 + 200;
            const h = Math.random() * 120 + 160;
            this.scenery.push({
                x: Math.random() * this.bounds.width,
                y: crabLevelY + 15,
                image: img,
                width: w,
                height: h
            });
        }
        
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
                y: 1815,
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
            const width = Math.random() * 140 + 120;
            const height = Math.random() * 180 + 140;
            this.backgroundEntities.mid.push({
                x: Math.random() * this.bounds.width,
                y: (entityType === 'rock' || entityType === 'coral') ? 1815 : this.bounds.height - (height / 2) - (Math.random() * 50),
                image: this.game.assets[entityType],
                type: entityType,
                width: width,
                height: height,
                alpha: entityType === 'rock' ? 1 : 0.6
            });
        }
        
        // Near background entities
        for (let i = 0; i < 30; i++) {
            const entities = ['coral', 'seaweed', 'rock'];
            const entityType = entities[Math.floor(Math.random() * entities.length)];
            const width = Math.random() * 100 + 140;
            const height = Math.random() * 120 + 180;
            this.backgroundEntities.near.push({
                x: Math.random() * this.bounds.width,
                y: (entityType === 'rock' || entityType === 'coral') ? 1815 : this.bounds.height - (height / 2) - (Math.random() * 70),
                image: this.game.assets[entityType],
                type: entityType,
                width: width,
                height: height,
                alpha: entityType === 'rock' ? 1 : 0.9
            });
        }

        // Ensure at least two visible landmark rocks near the bottom
        this.backgroundEntities.near.push({
            x: 1200, y: 1815, image: this.game.assets.rock, type: 'rock',
            width: 320, height: 200, alpha: 1
        });
        this.backgroundEntities.near.push({
            x: 1800, y: 1815, image: this.game.assets.coral, type: 'coral',
            width: 260, height: 220, alpha: 0.9
        });
    }

    update(deltaTime, player) {
        // Collision with collectibles
        this.collectibles.forEach(item => {
            if (!item.collected) {
                const dx = player.x - item.x;
                const dy = player.y - item.y;
                const within = Math.sqrt(dx * dx + dy * dy) < (player.width/2 + item.width/2);
                let covered = false;
                if (item.layer === 'front_sand') covered = this.game.sand?.isFrontFilledAt(item.x, item.y, item.width * 0.4);
                if (item.layer === 'back_sand')  covered = this.game.sand?.isBackFilledAt(item.x, item.y, item.width * 0.4);
                if (within && !covered) {
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
        ctx.globalAlpha = 1; // ensure full opacity baseline
        this.backgroundEntities.near.forEach(entity => {
            ctx.globalAlpha = entity.alpha;
            ctx.drawImage(entity.image, entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
        });
        ctx.restore();
    }

    draw(ctx, camera) {
        // Draw in-world scenery (behind NPCs, in front of backgrounds)
        this.scenery.forEach(s => {
            ctx.drawImage(s.image, s.x - s.width / 2, s.y - s.height / 2, s.width, s.height);
        });

        // Draw collectibles
        this.collectibles.forEach(item => {
            if (item.collected) return;
            if (item.layer === 'back_sand' && this.game.sand?.isBackFilledAt(item.x, item.y, item.width * 0.4)) return;
            ctx.drawImage(item.image, item.x - item.width / 2, item.y - item.height / 2, item.width, item.height);
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

    placePearls(sand) {
        this.collectibles.length = 0;
        const addPearl = (x, y, layer) => {
            this.collectibles.push({
                x, y, layer,
                type: 'pearl',
                image: this.game.assets.pearl,
                width: 30, height: 30,
                collected: false
            });
        };
        // 2 front-sand pearls: slightly below the front surface so they're buried
        for (let i = 0; i < 2; i++) {
            let tries = 0, placed = false;
            while (!placed && tries++ < 50) {
                const x = Math.random() * this.bounds.width;
                const surf = sand.getFrontSurfaceY(x);
                if (isFinite(surf) && surf < this.bounds.height - 5) {
                    addPearl(x, surf + 12, 'front_sand');
                    placed = true;
                }
            }
        }
        // 2 back-sand pearls: just under the back surface so hidden until cleared
        for (let i = 0; i < 2; i++) {
            let tries = 0, placed = false;
            while (!placed && tries++ < 50) {
                const x = Math.random() * this.bounds.width;
                const surf = sand.getBackSurfaceY(x);
                const cx = Math.max(0, Math.min(sand.cols - 1, Math.floor(x / sand.cell)));
                const top = this.bounds.height - sand.backdropRows * sand.cell;
                const minFill = Math.floor(sand.backdropRows * sand.backMinProfile[cx]);
                const lineY = top + (sand.backdropRows - minFill) * sand.cell;
                const bury = 12;
                const yCandidate = Math.min(surf + bury, lineY - 4);
                if (isFinite(surf) && yCandidate > surf + 6) {
                    addPearl(x, yCandidate, 'back_sand');
                    placed = true;
                }
            }
        }
        // 1 ocean pearl somewhere away from sand bands
        const bandTop = this.bounds.height - sand.rows * sand.cell;
        const x = Math.random() * this.bounds.width;
        const y = Math.random() * (bandTop - 400) + 150;
        addPearl(x, y, 'ocean');
    }
}

export default World;