import Game from 'game';

window.addEventListener('load', () => {
    const canvas = document.getElementById('game-canvas');
    const loadingScreen = document.getElementById('loading-screen');
    const game = new Game(canvas, loadingScreen);
    game.start();
});

