export default class SandSim {
    constructor(game, { bandHeight = 160, cell = 4 } = {}) {
        this.game = game;
        this.cell = cell;
        this.bandHeight = bandHeight;
        this.stepsPerFrame = 2;
        this._init();
    }
    _init() {
        this.cols = Math.floor(this.game.world.bounds.width / this.cell);
        this.rows = Math.floor(this.bandHeight / this.cell);
        this.grid = new Uint8Array(this.cols * this.rows);
        this.buffer = new Uint8Array(this.cols * this.rows);
        this.colors = this._makePalette();
        this._seedBed();
        this.backdropRows = this.rows * 2;
        this.backdropGrid = new Uint8Array(this.cols * this.backdropRows);
        this.backdropColors = this._makeDarkerPalette();
        this._seedBackdrop();
    }
    onResize() { this._init(); }
    _idx(x, y) { return y * this.cols + x; }
    _inBounds(x, y) { return x >= 0 && x < this.cols && y >= 0 && y < this.rows; }
    _seedBed() {
        const base = Math.floor(this.rows * 0.65);
        for (let x = 0; x < this.cols; x++) {
            const wobble = Math.floor((Math.sin(x * 0.15) + Math.sin(x * 0.07)) * 2);
            const h = Math.max(2, base + wobble + (Math.random() * 2 | 0));
            for (let y = this.rows - 1; y >= this.rows - h; y--) {
                if (Math.random() < 0.95) this.grid[this._idx(x, y)] = 1;
            }
        }
    }
    _makePalette() {
        // Subtle sandy tones variation
        const c = [];
        for (let i = 0; i < 4; i++) {
            const r = 220 + ((Math.random() * 20) | 0);
            const g = 200 + ((Math.random() * 25) | 0);
            const b = 160 + ((Math.random() * 20) | 0);
            c.push(`rgb(${r},${g},${b})`);
        }
        return c;
    }
    _makeDarkerPalette() {
        const c = [];
        for (let i = 0; i < 4; i++) {
            const r = 185 + ((Math.random() * 15) | 0);
            const g = 165 + ((Math.random() * 18) | 0);
            const b = 130 + ((Math.random() * 15) | 0);
            c.push(`rgb(${r},${g},${b})`);
        }
        return c;
    }
    _seedBackdrop() {
        const base = Math.floor(this.backdropRows * 0.55);
        for (let x = 0; x < this.cols; x++) {
            const wobble = Math.floor((Math.sin(x * 0.12) + Math.sin(x * 0.05)) * 3);
            const h = Math.max(3, base + wobble + ((Math.random() * 3) | 0));
            for (let y = this.backdropRows - 1; y >= this.backdropRows - h; y--) {
                this.backdropGrid[y * this.cols + x] = 1;
            }
        }
    }
    _step() {
        // Double buffer clear
        this.buffer.fill(0);
        // Process from bottom-1 up to top
        for (let y = this.rows - 1; y >= 0; y--) {
            for (let x = 0; x < this.cols; x++) {
                if (!this.grid[this._idx(x, y)]) continue;
                // Try down
                if (this._inBounds(x, y + 1) && !this.grid[this._idx(x, y + 1)] && !this.buffer[this._idx(x, y + 1)]) {
                    this.buffer[this._idx(x, y + 1)] = 1;
                    continue;
                }
                // Try down-left / down-right
                const dir = Math.random() < 0.5 ? -1 : 1;
                const dx1 = x + dir, dy1 = y + 1;
                const dx2 = x - dir, dy2 = y + 1;
                if (this._inBounds(dx1, dy1) && !this.grid[this._idx(dx1, dy1)] && !this.buffer[this._idx(dx1, dy1)]) {
                    this.buffer[this._idx(dx1, dy1)] = 1;
                } else if (this._inBounds(dx2, dy2) && !this.grid[this._idx(dx2, dy2)] && !this.buffer[this._idx(dx2, dy2)]) {
                    this.buffer[this._idx(dx2, dy2)] = 1;
                } else {
                    // Stay put
                    if (!this.buffer[this._idx(x, y)]) this.buffer[this._idx(x, y)] = 1;
                }
            }
        }
        // Swap
        const tmp = this.grid; this.grid = this.buffer; this.buffer = tmp;
    }
    impulseAt(worldX, worldY, radiusPx, dirX = 0, playerY = null) {
        const topYWorld = this.game.world.bounds.height - this.rows * this.cell;
        const backTopYWorld = this.game.world.bounds.height - this.backdropRows * this.cell;
        const halfBackYWorld = backTopYWorld + (this.backdropRows * this.cell) * 0.5;
        const pushingBack = playerY != null && playerY > halfBackYWorld;
        const minBackFill = Math.floor(this.backdropRows * 0.5);
        const cx = Math.floor(worldX / this.cell);
        const cy = Math.floor((worldY - topYWorld) / this.cell);
        const r = Math.max(1, Math.floor(radiusPx / this.cell));
        const backIdx = (x, y) => y * this.cols + x;
        const frontIdx = (x, y) => y * this.cols + x;
        const backColFill = (x) => {
            let cnt = 0;
            for (let y = this.backdropRows - 1; y >= 0; y--) {
                if (this.backdropGrid[backIdx(x, y)]) cnt++; else break;
            }
            return cnt;
        };
        const removeFromBackTop = (x) => {
            let fill = backColFill(x);
            if (fill <= minBackFill) return false;
            const topY = this.backdropRows - fill;
            this.backdropGrid[backIdx(x, topY)] = 0;
            return true;
        };
        const addToBackTop = (x) => {
            let fill = backColFill(x);
            if (fill >= this.backdropRows) return false;
            const newTopY = this.backdropRows - fill - 1;
            this.backdropGrid[backIdx(x, newTopY)] = 1;
            return true;
        };
        const dropToFrontNear = (x, yPref) => {
            // try downward first
            for (let y = Math.min(this.rows - 1, yPref + 2); y >= 0; y--) {
                if (!this._inBounds(x, y)) continue;
                if (!this.grid[frontIdx(x, y)]) { this.grid[frontIdx(x, y)] = 1; return true; }
            }
            // then upward search
            for (let y = Math.max(0, yPref - 2); y < this.rows; y++) {
                if (!this.grid[frontIdx(x, y)]) { this.grid[frontIdx(x, y)] = 1; return true; }
            }
            return false;
        };
        for (let y = cy - r; y <= cy + r; y++) {
            for (let x = cx - r; x <= cx + r; x++) {
                if (!this._inBounds(x, y)) continue;
                const dx = x - cx, dy = y - cy;
                if (dx * dx + dy * dy <= r * r) {
                    // Carve a pocket in front
                    if (this.grid[this._idx(x, y)]) {
                        this.grid[this._idx(x, y)] = 0;
                        // Push carved sand back if player is deep
                        if (pushingBack) addToBackTop(x);
                    }
                    // Sideways bias remains
                    const sx = x + Math.sign(dirX);
                    if (this._inBounds(sx, y) && Math.random() < 0.4) this.grid[this._idx(sx, y)] = 1;
                    // Try to drop sand into front by pulling from back (respect 50% minimum)
                    if (!pushingBack) {
                        if (removeFromBackTop(x)) dropToFrontNear(x, y);
                    }
                }
            }
        }
    }
    update(_, player) {
        // Player-sand interaction
        const bandTopWorld = this.game.world.bounds.height - this.rows * this.cell;
        const px = player.x, py = player.y;
        const pr = Math.max(player.width, player.height) * 0.4;
        if (py + pr > bandTopWorld - 4) {
            const speed = Math.hypot(player.vx, player.vy);
            const radius = Math.min(40, 12 + speed * 0.03);
            this.impulseAt(px, Math.max(py, bandTopWorld + 2), radius, Math.cos(player.angle), py);
        }
        for (let i = 0; i < this.stepsPerFrame; i++) this._step();
        this._applyNoSandMask();
    }
    draw(ctx) {
        const topYWorld = this.game.world.bounds.height - this.rows * this.cell;
        ctx.save();
        ctx.translate(-Math.round(this.game.camera.x), -Math.round(this.game.camera.y));
        ctx.globalAlpha = 1;
        // Draw particles
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (!this.grid[this._idx(x, y)]) continue;
                ctx.fillStyle = this.colors[(x + y) & 3];
                ctx.fillRect(x * this.cell, topYWorld + y * this.cell, this.cell, this.cell);
            }
        }
        ctx.restore();
    }

    drawBackdrop(ctx) {
        const topYWorld = this.game.world.bounds.height - this.backdropRows * this.cell;
        ctx.save();
        ctx.translate(-Math.round(this.game.camera.x), -Math.round(this.game.camera.y));
        ctx.globalAlpha = 1;
        for (let y = 0; y < this.backdropRows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (!this.backdropGrid[y * this.cols + x]) continue;
                ctx.fillStyle = this.backdropColors[(x + y) & 3];
                ctx.fillRect(x * this.cell, topYWorld + y * this.cell, this.cell, this.cell);
            }
        }
        ctx.restore();
    }

    _applyNoSandMask() {
        const topYWorld = this.game.world.bounds.height - this.rows * this.cell;
        const npcs = (this.game.world && this.game.world.npcs) || [];
        for (const n of npcs) {
            if (!n.noSand) continue;
            const marginPx = 16;
            const x0 = Math.max(0, Math.floor((n.x - n.width / 2 - marginPx) / this.cell));
            const x1 = Math.min(this.cols - 1, Math.floor((n.x + n.width / 2 + marginPx) / this.cell));
            const bodyTopRow = Math.floor((n.y - n.height / 2 - topYWorld) / this.cell);
            const bodyBotRow = Math.floor((n.y + n.height / 2 - topYWorld) / this.cell);
            const aboveEnd = Math.max(0, bodyTopRow); // clear anything above the crab within the sand band
            for (let x = x0; x <= x1; x++) {
                for (let y = 0; y <= Math.min(this.rows - 1, aboveEnd); y++) this.grid[this._idx(x, y)] = 0;
                for (let y = Math.max(0, bodyTopRow); y <= Math.min(this.rows - 1, bodyBotRow); y++) this.grid[this._idx(x, y)] = 0;
            }
        }
    }
}