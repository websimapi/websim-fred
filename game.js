import Player from 'player';
import World from 'world';
import InputHandler from 'input';
import { ParticleSystem } from 'particles';
import { UI } from 'ui';
import Camera from 'camera';
import SandSim from 'sand';

class Game {
    constructor(canvas, loadingScreen) {
        this.canvas = canvas;
        this.loadingScreen = loadingScreen;
        this.ctx = canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.assetManifest = [
            { name: 'freddie', type: 'image', src: 'freddie.png', flip: true },
            { name: 'backgroundFar', type: 'image', src: 'background-far.png' },
            { name: 'backgroundMid', type: 'image', src: 'background-mid.png' },
            { name: 'backgroundNear', type: 'image', src: 'background-near.png' },
            { name: 'pearl', type: 'image', src: 'pearl.png' },
            { name: 'crab', type: 'image', src: 'crab.png' },
            { name: 'jellyfish', type: 'image', src: 'jellyfish.png' },
            { name: 'bubble', type: 'image', src: 'bubble.png' },
            { name: 'sparkle', type: 'image', src: 'sparkle.png' },
            { name: 'coral', type: 'image', src: 'coral.png' },
            { name: 'seaweed', type: 'image', src: 'seaweed.png' },
            { name: 'rock', type: 'image', src: 'rock.png' },
            { name: 'collect', type: 'audio', src: 'collect.mp3' },
            { name: 'dash', type: 'audio', src: 'dash.mp3' },
            { name: 'bump', type: 'audio', src: 'bump.mp3' },
            { name: 'ambient', type: 'audio', src: 'ambient.mp3', loop: true },
            { name: 'swim_bubble', type: 'audio', src: 'swim_bubble.mp3' },
        ];
        this.assets = {};
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        this.lastTime = 0;
        this.camera = { x: 0, y: 0 };
        this.debug = { showCoords: false };
        this.sand = null;
    }

    async loadAssets() {
        let loaded = 0;
        const total = this.assetManifest.length;

        const loadPromises = this.assetManifest.map(assetInfo => {
            if (assetInfo.type === 'image') {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.src = assetInfo.src;
                    img.onload = () => {
                        if (assetInfo.flip) {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.scale(-1, 1);
                            ctx.drawImage(img, -img.width, 0);
                            this.assets[assetInfo.name] = canvas;
                        } else {
                            this.assets[assetInfo.name] = img;
                        }

                        loaded++;
                        this.loadingScreen.textContent = `Loading... ${Math.round((loaded / total) * 100)}%`;
                        resolve();
                    };
                });
            } else if (assetInfo.type === 'audio') {
                return fetch(assetInfo.src)
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        this.assets[assetInfo.name] = { buffer: audioBuffer, loop: assetInfo.loop || false };
                        loaded++;
                        this.loadingScreen.textContent = `Loading... ${Math.round((loaded / total) * 100)}%`;
                    });
            }
        });

        await Promise.all(loadPromises);
    }

    playSound(name, playbackRate = 1) {
        if (!this.assets[name] || !this.assets[name].buffer) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.assets[name].buffer;
        source.connect(this.audioContext.destination);
        source.loop = this.assets[name].loop;
        source.playbackRate.value = playbackRate;
        source.start(0);
        return source;
    }

    async start() {
        await this.loadAssets();
        this.loadingScreen.style.display = 'none';

        this.input = new InputHandler();
        this.player = new Player(this.width / 2, this.height / 2, this);
        this.particleSystem = new ParticleSystem(this);
        this.world = new World(this);
        this.ui = new UI(this);
        this.camera = new Camera(this);
        this.sand = new SandSim(this);

        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            if (this.sand) this.sand.onResize(this.width, this.height);
        });
        
        if (this.audioContext.state === 'suspended') {
            const resumeAudio = () => {
                this.audioContext.resume();
                window.removeEventListener('click', resumeAudio);
                window.removeEventListener('touchstart', resumeAudio);
            };
            window.addEventListener('click', resumeAudio);
            window.addEventListener('touchstart', resumeAudio);
        }
        
        this.playSound('ambient');

        // Toggle coordinate display with ` or ~
        window.addEventListener('keydown', (e) => {
            if (e.key === '`' || e.key === '~') this.debug.showCoords = !this.debug.showCoords;
        });

        this.gameLoop(0);
    }

    gameLoop(timestamp) {
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        // Reset click state after update and draw
        this.input.reset();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        this.player.update(this.input, deltaTime);
        this.world.update(deltaTime, this.player);
        this.particleSystem.update(deltaTime);
        this.camera.update(this.player);
        if (this.sand) this.sand.update(deltaTime, this.player, this.camera);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.world.drawBackground(this.ctx, this.camera);
        
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.world.draw(this.ctx, this.camera);
        this.particleSystem.draw(this.ctx);
        this.player.draw(this.ctx);

        this.ctx.restore();

        this.world.drawForeground(this.ctx, this.camera);
        if (this.sand) this.sand.draw(this.ctx);
        this.ui.draw(this.ctx);
    }
}

export default Game;