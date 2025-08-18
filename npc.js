export class NPC {
    constructor(x, y, game, image, width, height) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.image = image;
        this.width = width;
        this.height = height;
        this.interactionRadius = 150;
        this.dialogue = ["Hello there, Freddie!"];
        this.currentDialogue = null;
    }

    update(deltaTime, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.interactionRadius) {
            this.currentDialogue = this.getDialogue(player);
             if (!this.game.ui.activeNPC) {
                this.game.ui.setActiveNPC(this);
            }
        } else {
             if (this.game.ui.activeNPC === this) {
                this.game.ui.clearActiveNPC();
            }
            this.currentDialogue = null;
        }
    }
    
    getDialogue(player) {
       return this.dialogue[0];
    }

    draw(ctx) {
        ctx.drawImage(this.image, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }
}

export class Crab extends NPC {
    constructor(x, y, game) {
        super(x, y, game, game.assets.crab, 100, 70);
        this.speed = 40;
        this.dir = 1;
        this.patrolRange = 220;
        this.originX = x;
    }
    
    getDialogue(player) {
        if(this.quest.complete) {
            return "Thanks for the pearls! The ocean feels a bit shinier now.";
        }
        
        if (player.pearls >= this.quest.pearls_needed) {
            player.pearls -= this.quest.pearls_needed;
            this.quest.complete = true;
            player.speed *= 1.2; // Reward: permanent speed boost
            return `Wow! You found ${this.quest.pearls_needed} pearls! As a thank you, I'll teach you how to swim a little faster.`;
        } else {
            return `Welcome! I'm trying to collect shiny things. Could you bring me ${this.quest.pearls_needed} pearls? You have ${player.pearls}.`;
        }
    }

    update(deltaTime, player) {
        // simple patrol
        this.x += this.dir * this.speed * deltaTime;
        if (this.x > this.originX + this.patrolRange) this.dir = -1;
        if (this.x < this.originX - this.patrolRange) this.dir = 1;

        // stand on front sand surface
        const sand = this.game.sand;
        if (sand) {
            const surf = sand.getFrontSurfaceY(this.x);
            this.y = surf - this.height / 2 - 2;

            // apply gentle transfer-only impulse to shift sand as he walks
            const speed = Math.abs(this.dir * this.speed) + 50; // ensure > lowSpeed threshold
            sand.impulseAt(this.x, surf - 4, 18, this.dir, this.y, speed);
        }

        // keep existing interaction logic (dialogue, UI activation)
        super.update(deltaTime, player);
    }
}