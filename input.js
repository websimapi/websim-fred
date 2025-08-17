class InputHandler {
    constructor() {
        this.keys = [];
        this.mouse = { x: 0, y: 0, down: false, clicked: false };

        window.addEventListener('keydown', e => {
            if (this.keys.indexOf(e.key) === -1) {
                this.keys.push(e.key);
            }
        });

        window.addEventListener('keyup', e => {
            this.keys.splice(this.keys.indexOf(e.key), 1);
        });
        
        window.addEventListener('mousemove', e => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mousedown', e => {
            this.mouse.down = true;
            this.mouse.clicked = true;
        });
        
        window.addEventListener('mouseup', e => {
            this.mouse.down = false;
        });

        window.addEventListener('touchstart', e => {
            this.mouse.down = true;
            this.mouse.clicked = true;
            this.mouse.x = e.touches[0].clientX;
            this.mouse.y = e.touches[0].clientY;
        }, { passive: false });

        window.addEventListener('touchmove', e => {
            e.preventDefault();
            this.mouse.x = e.touches[0].clientX;
            this.mouse.y = e.touches[0].clientY;
        }, { passive: false });

        window.addEventListener('touchend', e => {
            this.mouse.down = false;
        });
    }

    // This method should be called at the end of each game loop update
    reset() {
        this.mouse.clicked = false;
    }
}

export default InputHandler;