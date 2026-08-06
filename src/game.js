function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalize(vx, vy) {
    const len = Math.hypot(vx, vy) || 1;
    return { x: vx / len, y: vy / len };
}

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.player = null;
        this.monsterImage = null;
        this.projectileImage = null;

        this.playerPos = { x: 0, y: 0 };
        this.monsters = [];
        this.projectiles = [];

        this.lastTime = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 1.5; // seconds

        this.running = false;
    }

    async start() {
        const [player, monster, projectile] = await Promise.all([
            this.loadImage("./assets/images/player.png"),
            this.loadImage("./assets/images/monster.png"),
            this.loadImage("./assets/images/projectile.png")
        ]);

        this.player = player;
        this.monsterImage = monster;
        this.projectileImage = projectile;

        // Player at 10% from left, centered vertically (tutorial)
        this.playerPos.x = this.canvas.width * 0.1;
        this.playerPos.y = this.canvas.height * 0.5;

        // Click/tap to shoot
        this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));

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

        const minY = mh * 0.5;
        const maxY = this.canvas.height - mh * 0.5;
        const y = randInt(Math.ceil(minY), Math.floor(maxY));

        // random duration 2..4s equivalent
        const duration = randInt(2, 4);
        const startX = this.canvas.width + mw * 0.5;
        const endX = -mw * 0.5;
        const speed = (startX - endX) / duration;

        this.monsters.push({ x: startX, y, speed, w: mw, h: mh });
    }

    onPointerDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const touchX = (e.clientX - rect.left) * scaleX;
        const touchY = (e.clientY - rect.top) * scaleY;

        const offsetX = touchX - this.playerPos.x;
        const offsetY = touchY - this.playerPos.y;

        // Don't shoot backwards
        if (offsetX < 0) return;

        // Unit direction * 1000
        const dir = normalize(offsetX, offsetY);
        const shootAmount = { x: dir.x * 1000, y: dir.y * 1000 };

        // Real destination
        const destX = this.playerPos.x + shootAmount.x;
        const destY = this.playerPos.y + shootAmount.y;

        // MoveTo over 2 seconds equivalent
        const duration = 2.0;
        const vx = (destX - this.playerPos.x) / duration;
        const vy = (destY - this.playerPos.y) / duration;

        this.projectiles.push({
            x: this.playerPos.x,
            y: this.playerPos.y,
            vx,
            vy,
            life: duration, // auto-remove after 2s
            w: this.projectileImage.width,
            h: this.projectileImage.height
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
        // Spawn monsters every 1.5s
        this.spawnTimer += dt;
        while (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer -= this.spawnInterval;
            this.addMonster();
        }

        // Move monsters
        for (const m of this.monsters) {
            m.x -= m.speed * dt;
        }

        // Remove monsters off left edge
        this.monsters = this.monsters.filter((m) => m.x > -m.w * 0.5);

        // Move projectiles
        for (const p of this.projectiles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        }

        // Remove projectiles after their move duration
        this.projectiles = this.projectiles.filter((p) => p.life > 0);
    }

    render() {
        const { ctx, canvas } = this;

        // Gray background
        ctx.fillStyle = "#999999";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Player
        ctx.drawImage(
            this.player,
            this.playerPos.x - this.player.width * 0.5,
            this.playerPos.y - this.player.height * 0.5
        );

        // Monsters
        for (const m of this.monsters) {
            ctx.drawImage(this.monsterImage, m.x - m.w * 0.5, m.y - m.h * 0.5);
        }

        // Projectiles
        for (const p of this.projectiles) {
            ctx.drawImage(this.projectileImage, p.x - p.w * 0.5, p.y - p.h * 0.5);
        }
    }
}