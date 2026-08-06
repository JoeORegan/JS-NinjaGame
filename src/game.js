export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.player = null;
        this.playerReady = false;
    }

    async start() {
        this.player = await this.loadImage("./assets/images/player.png");
        this.playerReady = true;
        this.render();
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }

    render() {
        const { ctx, canvas } = this;

        // Gray background like tutorial
        ctx.fillStyle = "#999999";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!this.playerReady) return;

        // Position: x = 10% width, y = 50% height
        const x = canvas.width * 0.1;
        const y = canvas.height * 0.5;

        // Draw centered
        const w = this.player.width;
        const h = this.player.height;
        ctx.drawImage(this.player, x - w * 0.5, y - h * 0.5);
    }
}