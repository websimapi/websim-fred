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
    impulseAt(worldX, worldY, radiusPx, dirX = 0) {
        const topYWorld = this.game.world.bounds.height - this.rows * this.cell;
        const cx = Math.floor(worldX / this.cell);
        const cy = Math.floor((worldY - topYWorld) / this.cell);
        const r = Math.max(1, Math.floor(radiusPx / this.cell));
        for (let y = cy - r; y <= cy + r; y++) {
            for (let x = cx - r; x <= cx + r; x++) {
                if (!this._inBounds(x, y)) continue;
                const dx = x - cx, dy = y - cy;
                if (dx * dx + dy * dy <= r * r) {
                    // Carve a pocket and bias sideways a bit
                    this.grid[this._idx(x, y)] = 0;
                    const sx = x + Math.sign(dirX);
                    if (this._inBounds(sx, y) && Math.random() < 0.4) this.grid[this._idx(sx, y)] = 1;
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
            this.impulseAt(px, Math.max(py, bandTopWorld + 2), radius, Math.cos(player.angle));
        }
        for (let i = 0; i < this.stepsPerFrame; i++) this._step();
        this._applyNoSandMask();
    }
    draw(ctx) {
        const topYWorld = this.game.world.bounds.height - this.rows * this.cell;
        ctx.save();
        ctx.translate(-this.game.camera.x, -this.game.camera.y);
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