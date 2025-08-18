export class UI {
    constructor(game) {
        this.game = game;
        this.pearlImage = game.assets.pearl;
        this.activeNPC = null;
    }
    
    setActiveNPC(npc) {
        this.activeNPC = npc;
    }
    
    clearActiveNPC() {
        this.activeNPC = null;
    }

    draw(ctx) {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Draw pearl count
        const pearlIconSize = 30;
        ctx.drawImage(this.pearlImage, 15, 55, pearlIconSize, pearlIconSize);
        let scoreText = `${this.game.player.pearls}`;
        ctx.strokeText(scoreText, 55, 60);
        ctx.fillText(scoreText, 55, 60);

        // Draw health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(10, 10, 200, 30);
        ctx.fillStyle = 'green';
        ctx.fillRect(10, 10, (this.game.player.health / 100) * 200, 30);
        ctx.strokeRect(10, 10, 200, 30);
        
        // Draw dialogue box
        if(this.activeNPC && this.activeNPC.currentDialogue) {
            this.drawDialogueBox(ctx, this.activeNPC.currentDialogue);
        }
    }
    
    drawDialogueBox(ctx, text) {
        const boxWidth = this.game.width * 0.8;
        const boxHeight = 120;
        const boxX = (this.game.width - boxWidth) / 2;
        const boxY = this.game.height - boxHeight - 20;

        ctx.fillStyle = 'rgba(0, 50, 100, 0.8)';
        ctx.strokeStyle = '#aef';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 15);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Simple text wrapping
        const words = text.split(' ');
        let line = '';
        let y = boxY + 30;
        const maxWidth = boxWidth - 40;
        
        for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, boxX + boxWidth / 2, y);
            line = words[n] + ' ';
            y += 25;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, boxX + boxWidth / 2, y);
    }
}

