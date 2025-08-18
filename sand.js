export default class SandSim {
    constructor(game, { bandHeight = 160, cell = 4 } = {}) {
        this.game = game;
        this.cell = cell;
        this.bandHeight = bandHeight;
        this.stepsPerFrame = 2;
        this._init();
    }
    _init() {
        this.cols = Math.ceil(this.game.width / this.cell);
        this.rows = Math.ceil(this.bandHeight / this.cell);
        this.bandTop = this.game.height - this.bandHeight;
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
    impulseAt(screenX, screenY, radiusPx, dirX = 0) {
        const topY = this.game.height - this.rows * this.cell;
        const cx = Math.floor(screenX / this.cell);
        const cy = Math.floor((screenY - topY) / this.cell);
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
    update(_, player, camera) {
        // Player-sand interaction
        const bandTop = this.bandTop;
        const px = player.x - camera.x;
        const py = player.y - camera.y;
        const pr = Math.max(player.width, player.height) * 0.4;
        if (py + pr > bandTop - 4) {
            const speed = Math.hypot(player.vx, player.vy);
            const radius = Math.min(40, 12 + speed * 0.03);
            this.impulseAt(px, Math.max(py, bandTop + 2), radius, Math.cos(player.angle));
        }
        for (let i = 0; i < this.stepsPerFrame; i++) this._step();
    }
    draw(ctx) {
        const topY = this.bandTop;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.rect(0, topY, this.game.width, this.game.height - topY);
        ctx.clip();
        ctx.fillStyle = 'rgba(230,215,170,0.25)';
        ctx.fillRect(0, topY, this.game.width, this.game.height - topY);
        // Draw particles
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (!this.grid[this._idx(x, y)]) continue;
                ctx.fillStyle = this.colors[(x + y) & 3];
                ctx.fillRect(x * this.cell, topY + y * this.cell, this.cell, this.cell);
            }
        }
        ctx.restore();
    }
}