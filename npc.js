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
        this.noSand = true;
        this.quest = {
            id: 'pearl_collector',
            pearls_needed: 5,
            complete: false
        };
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
}