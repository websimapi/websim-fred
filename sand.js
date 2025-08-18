export default class SandSim {
    constructor(game, { bandHeight = 160, cell = 4 } = {}) {
        this.game = game;
        this.cell = cell;
        this.bandHeight = bandHeight;
        this.stepsPerFrame = 2;
        this.backdropStepsPerFrame = 2;
        this._init();
        this._lastGrid = null;
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
        this.bufferBackdrop = new Uint8Array(this.cols * this.backdropRows);
        this.backdropColors = this._makeDarkerPalette();
        this._seedBackdrop();
        this.backdropHalf = Math.floor(this.backdropRows / 2);
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
    _idxB(x, y) { return y * this.cols + x; }
    _inBoundsBackdrop(x, y) { return x >= 0 && x < this.cols && y >= 0 && y < this.backdropRows; }
    _stepBackdrop() {
        this.bufferBackdrop.fill(0);
        for (let y = this.backdropRows - 1; y >= 0; y--) {
            for (let x = 0; x < this.cols; x++) {
                if (!this.backdropGrid[this._idxB(x, y)]) continue;
                if (this._inBoundsBackdrop(x, y + 1) && !this.backdropGrid[this._idxB(x, y + 1)] && !this.bufferBackdrop[this._idxB(x, y + 1)]) { this.bufferBackdrop[this._idxB(x, y + 1)] = 1; continue; }
                const dir = Math.random() < 0.5 ? -1 : 1, dx1 = x + dir, dx2 = x - dir, ny = y + 1;
                if (this._inBoundsBackdrop(dx1, ny) && !this.backdropGrid[this._idxB(dx1, ny)] && !this.bufferBackdrop[this._idxB(dx1, ny)]) this.bufferBackdrop[this._idxB(dx1, ny)] = 1;
                else if (this._inBoundsBackdrop(dx2, ny) && !this.backdropGrid[this._idxB(dx2, ny)] && !this.bufferBackdrop[this._idxB(dx2, ny)]) this.bufferBackdrop[this._idxB(dx2, ny)] = 1;
                else if (!this.bufferBackdrop[this._idxB(x, y)]) this.bufferBackdrop[this._idxB(x, y)] = 1;
            }
        }
        const t = this.backdropGrid; this.backdropGrid = this.bufferBackdrop; this.bufferBackdrop = t;
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
        // Push into backdrop where we carve
        this._backdropAddAt(worldX, worldY, radiusPx * 1.1, 0.35);
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
        // Track previous state for backdrop sync
        this._lastGrid = this.grid.slice();
        for (let i = 0; i < this.stepsPerFrame; i++) this._step();
        this._applyNoSandMask();
        this._syncBackdropFromFront(this._lastGrid);
        for (let i = 0; i < this.backdropStepsPerFrame; i++) this._stepBackdrop();
        this._enforceMinColumnHeights();
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

    drawBackdrop(ctx) {
        const topYWorld = this.game.world.bounds.height - this.backdropRows * this.cell;
        ctx.save();
        ctx.translate(-this.game.camera.x, -this.game.camera.y);
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

    // Map world to backdrop cell coords
    _worldToBackdrop(wx, wy) {
        const top = this.game.world.bounds.height - this.backdropRows * this.cell;
        return { bx: Math.floor(wx / this.cell), by: Math.floor((wy - top) / this.cell) };
    }

    // Add to backdrop within a radius (probabilistic)
    _backdropAddAt(wx, wy, rPx, prob = 0.5) {
        const { bx, by } = this._worldToBackdrop(wx, wy);
        const r = Math.max(1, Math.floor(rPx / this.cell));
        for (let y = by - r; y <= by + r; y++) {
            for (let x = bx - r; x <= bx + r; x++) {
                if (x < 0 || x >= this.cols || y < 0 || y >= this.backdropRows) continue;
                const dx = x - bx, dy = y - by;
                if (dx * dx + dy * dy <= r * r && Math.random() < prob) {
                    this.backdropGrid[y * this.cols + x] = 1;
                }
            }
        }
    }

    // Remove from backdrop within a radius (probabilistic)
    _backdropRemoveAt(wx, wy, rPx, prob = 0.6) {
        const { bx, by } = this._worldToBackdrop(wx, wy);
        // Guard: don't pull if column is at/below half full
        let bHeight = 0; for (let y = this.backdropRows - 1; y >= 0; y--) if (this.backdropGrid[y * this.cols + bx]) bHeight++;
        if (bHeight <= this.backdropHalf) return;
        const r = Math.max(1, Math.floor(rPx / this.cell));
        for (let y = by - r; y <= by + r; y++) {
            if (y > this.backdropHalf) continue; // never pull from bottom half
            for (let x = bx - r; x <= bx + r; x++) {
                if (x < 0 || x >= this.cols || y < 0 || y >= this.backdropRows) continue;
                const dx = x - bx, dy = y - by;
                if (dx * dx + dy * dy <= r * r && Math.random() < prob) {
                    this.backdropGrid[y * this.cols + x] = 0;
                }
            }
        }
    }

    _syncBackdropFromFront(prev) {
        const topYWorld = this.game.world.bounds.height - this.rows * this.cell;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const i = y * this.cols + x;
                const wx = x * this.cell + this.cell * 0.5, wy = topYWorld + y * this.cell + this.cell * 0.5;
                if (!prev[i] && this.grid[i]) {
                    // Front gained sand: only pull from back upper half and if back > half-full
                    const { bx, by } = this._worldToBackdrop(wx, wy);
                    let bH = 0; for (let ky = this.backdropRows - 1; ky >= 0; ky--) if (this.backdropGrid[ky * this.cols + bx]) bH++;
                    if (by < this.backdropHalf && bH > this.backdropHalf) this._backdropRemoveAt(wx, wy, this.cell * 1.8, 0.7);
                } else if (prev[i] && !this.grid[i]) {
                    // Front lost sand: push into back (regenerate)
                    this._backdropAddAt(wx, wy, this.cell * 1.8, 0.8);
                }
            }
        }
    }

    _enforceMinColumnHeights() {
        for (let x = 0; x < this.cols; x++) {
            let f = 0, b = 0;
            for (let y = this.rows - 1; y >= 0; y--) if (this.grid[this._idx(x, y)]) f++;
            for (let y = this.backdropRows - 1; y >= 0; y--) if (this.backdropGrid[this._idxB(x, y)]) b++;
            const minBack = Math.max(f, this.backdropHalf);
            if (b < minBack) for (let k = b; k < minBack; k++) this.backdropGrid[this._idxB(x, this.backdropRows - 1 - k)] = 1;
        }
    }
}