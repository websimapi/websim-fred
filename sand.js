export default class SandSim {
    constructor(game, { bandHeight = 160, cell = 4 } = {}) {
        this.game = game;
        this.cell = cell;
        this.bandHeight = bandHeight;
        this.stepsPerFrame = 2;
        this.backdropStepsPerFrame = 2;
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
        this.backdropBuffer = new Uint8Array(this.cols * this.backdropRows);
        this.backdropColors = this._makeDarkerPalette();
        this._seedBackdrop();
        this.backMinProfile = this._computeBackMinProfile(); // per-column min fill profile
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
    _stepBackdrop() {
        this.backdropBuffer.fill(0);
        for (let y = this.backdropRows - 1; y >= 0; y--) for (let x = 0; x < this.cols; x++) {
            const i = y * this.cols + x;
            if (!this.backdropGrid[i]) continue;
            const below = y + 1 < this.backdropRows ? i + this.cols : -1;
            if (below >= 0 && !this.backdropGrid[below] && !this.backdropBuffer[below]) { this.backdropBuffer[below] = 1; continue; }
            const dir = Math.random() < 0.5 ? -1 : 1, nx = x + dir, ny = y + 1;
            const i1 = ny * this.cols + nx, i2 = ny * this.cols + (x - dir);
            if (nx >= 0 && nx < this.cols && ny < this.backdropRows && !this.backdropGrid[i1] && !this.backdropBuffer[i1]) this.backdropBuffer[i1] = 1;
            else if (x - dir >= 0 && x - dir < this.cols && ny < this.backdropRows && !this.backdropGrid[i2] && !this.backdropBuffer[i2]) this.backdropBuffer[i2] = 1;
            else this.backdropBuffer[i] = 1;
        }
        const t = this.backdropGrid; this.backdropGrid = this.backdropBuffer; this.backdropBuffer = t;
    }
    _computeBackMinProfile() {
        const profile = new Float32Array(this.cols);
        for (let x = 0; x < this.cols; x++) {
            const n = 0.5 + 0.1 * Math.sin(x * 0.08) + 0.05 * Math.sin(x * 0.013 + 1.7);
            profile[x] = Math.min(0.7, Math.max(0.35, n));
        }
        return profile;
    }
    impulseAt(worldX, worldY, radiusPx, dirX = 0, playerY = null, speed = 0) {
        const topYWorld = this.game.world.bounds.height - this.rows * this.cell;
        const cx = Math.floor(worldX / this.cell);
        const cy = Math.floor((worldY - topYWorld) / this.cell);
        const r = Math.max(1, Math.floor(radiusPx / this.cell));
        const lowSpeed = speed < 40; // pause transfer when nearly still
        const supplyFront = (x, yPref) => {
            if (lowSpeed) return false;
            const xi = Math.max(0, Math.min(this.cols - 1, x));
            const minFill = Math.floor(this.backdropRows * this.backMinProfile[xi]);
            return this._removeFromBackTop(xi, minFill) && this._dropToFrontNear(xi, yPref);
        };
        for (let y = cy - r; y <= cy + r; y++) {
            for (let x = cx - r; x <= cx + r; x++) {
                if (!this._inBounds(x, y)) continue;
                const dx = x - cx, dy = y - cy;
                if (dx * dx + dy * dy > r * r) continue;
                if (lowSpeed) continue; // no push/pull at low speeds
                if (this.grid[this._idx(x, y)]) {
                    this.grid[this._idx(x, y)] = 0;
                    this._addToBackTop(x);
                } else {
                    supplyFront(x, y);
                    if (Math.random() < 0.3 && supplyFront(x + Math.sign(dirX), y)) {}
                }
            }
        }
    }
    _dropToFrontNear(x, yPref) {
        for (let y = Math.min(this.rows - 1, yPref + 2); y >= 0; y--) {
            if (!this.grid[this._idx(x, y)]) { this.grid[this._idx(x, y)] = 1; return true; }
        }
        for (let y = Math.max(0, yPref - 2); y < this.rows; y++) {
            if (!this.grid[this._idx(x, y)]) { this.grid[this._idx(x, y)] = 1; return true; }
        }
        return false;
    }
    _backIdx(x, y) { return y * this.cols + x; }
    _backColFill(x) {
        let cnt = 0;
        for (let y = this.backdropRows - 1; y >= 0; y--) {
            if (this.backdropGrid[this._backIdx(x, y)]) cnt++; else break;
        }
        return cnt;
    }
    _addToBackTop(x) {
        const fill = this._backColFill(x);
        if (fill >= this.backdropRows) return false;
        const y = this.backdropRows - fill - 1;
        this.backdropGrid[this._backIdx(x, y)] = 1;
        return true;
    }
    _removeFromBackTop(x, minFill) {
        const fill = this._backColFill(x);
        if (fill <= minFill) return false;
        const y = this.backdropRows - fill;
        this.backdropGrid[this._backIdx(x, y)] = 0;
        return true;
    }
    update(_, player) {
        // Player-sand interaction
        const bandTopWorld = this.game.world.bounds.height - this.rows * this.cell;
        const px = player.x, py = player.y;
        const pr = Math.max(player.width, player.height) * 0.4;
        if (py + pr > bandTopWorld - 4) {
            const speed = Math.hypot(player.vx, player.vy);
            const radius = Math.min(40, 12 + speed * 0.03);
            if (speed > 40) this.impulseAt(px, Math.max(py, bandTopWorld + 2), radius, Math.cos(player.angle), py, speed);
        }
        for (let i = 0; i < this.stepsPerFrame; i++) this._step();
        for (let i = 0; i < this.backdropStepsPerFrame; i++) this._stepBackdrop();
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
            const aboveEnd = Math.max(0, bodyTopRow);
            for (let x = x0; x <= x1; x++) {
                for (let y = 0; y <= Math.min(this.rows - 1, aboveEnd); y++) {
                    const i = this._idx(x, y);
                    if (this.grid[i]) { this.grid[i] = 0; this._addToBackTop(x); }
                }
                for (let y = Math.max(0, bodyTopRow); y <= Math.min(this.rows - 1, bodyBotRow); y++) {
                    const i = this._idx(x, y);
                    if (this.grid[i]) { this.grid[i] = 0; this._addToBackTop(x); }
                }
            }
        }
    }
}