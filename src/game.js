function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.player = null;
        this.monsterImage = null;

        this.playerPos = { x: 0, y: 0 };
        this.monsters = [];

        this.lastTime = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 1.5; // seconds

        this.running = false;
    }

    async start() {
        const [player, monster] = await Promise.all([
            this.loadImage("./assets/images/player.png"),
            this.loadImage("./assets/images/monster.png")
        ]);

        this.player = player;
        this.monsterImage = monster;

        // Player at 10% from left, centered vertically (tutorial)
        this.playerPos.x = this.canvas.width * 0.1;
        this.playerPos.y = this.canvas.height * 0.5;

        // like srand(time) equivalent effect is built-in via Math.random()

        this.running = true;
        requestAnimationFrame((t) => this.loop(t));
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }

    addMonster() {
        const mw = this.monsterImage.width;
        const mh = this.monsterImage.height;

        // random Y within visible bounds
        const minY = mh * 0.5;
        const maxY = this.canvas.height - mh * 0.5;
        const y = randInt(Math.ceil(minY), Math.floor(maxY));

        // random duration 2..4s
        const duration = randInt(2, 4);

        // start just off right edge, move to just off left edge
        const startX = this.canvas.width + mw * 0.5;
        const endX = -mw * 0.5;

        const speed = (startX - endX) / duration; // px/sec

        this.monsters.push({
            x: startX,
            y,
            speed,
            w: mw,
            h: mh
        });
    }

    loop(timestamp) {
        if (!this.running) return;

        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.033);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // spawn monsters every 1.5s
        this.spawnTimer += dt;
        while (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer -= this.spawnInterval;
            this.addMonster();
        }

        // move monsters right->left
        for (const m of this.monsters) {
            m.x -= m.speed * dt;
        }

        // remove monsters once fully offscreen left
        this.monsters = this.monsters.filter((m) => m.x > -m.w * 0.5);
    }

    render() {
        const { ctx, canvas } = this;

        // grey background like tutorial
        ctx.fillStyle = "#999999";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // player
        if (this.player) {
            ctx.drawImage(
                this.player,
                this.playerPos.x - this.player.width * 0.5,
                this.playerPos.y - this.player.height * 0.5
            );
        }

        // monsters
        for (const m of this.monsters) {
            ctx.drawImage(
                this.monsterImage,
                m.x - m.w * 0.5,
                m.y - m.h * 0.5
            );
        }
    }
}