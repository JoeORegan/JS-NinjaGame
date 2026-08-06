function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalize(vx, vy) {
    const len = Math.hypot(vx, vy) || 1;
    return { x: vx / len, y: vy / len };
}

function intersectsAABB(a, b) {
    return (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
    );
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

        this.debug = false;
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

        this.playerPos.x = this.canvas.width * 0.1;
        this.playerPos.y = this.canvas.height * 0.5;

        this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));

        window.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() === "p") this.debug = !this.debug;
        });

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

        const duration = randInt(2, 4);
        const startX = this.canvas.width + mw * 0.5;
        const endX = -mw * 0.5;
        const speed = (startX - endX) / duration;

        this.monsters.push({
            x: startX,
            y,
            speed,
            w: mw,
            h: mh,
            active: true
        });
    }

    onPointerDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const touchX = (e.clientX - rect.left) * scaleX;
        const touchY = (e.clientY - rect.top) * scaleY;

        const offsetX = touchX - this.playerPos.x;
        const offsetY = touchY - this.playerPos.y;

        if (offsetX < 0) return; // no backward shots

        const dir = normalize(offsetX, offsetY);
        const shootAmount = { x: dir.x * 1000, y: dir.y * 1000 };

        const destX = this.playerPos.x + shootAmount.x;
        const destY = this.playerPos.y + shootAmount.y;

        const duration = 2.0;
        const vx = (destX - this.playerPos.x) / duration;
        const vy = (destY - this.playerPos.y) / duration;

        this.projectiles.push({
            x: this.playerPos.x,
            y: this.playerPos.y,
            vx,
            vy,
            life: duration,
            w: this.projectileImage.width,
            h: this.projectileImage.height,
            active: true
        });
    }

    projectileAABB(p) {
        return {
            left: p.x - p.w * 0.5,
            right: p.x + p.w * 0.5,
            top: p.y - p.h * 0.5,
            bottom: p.y + p.h * 0.5
        };
    }

    monsterAABB(m) {
        return {
            left: m.x - m.w * 0.5,
            right: m.x + m.w * 0.5,
            top: m.y - m.h * 0.5,
            bottom: m.y + m.h * 0.5
        };
    }

    handleCollisions() {
        for (const p of this.projectiles) {
            if (!p.active) continue;
            const pa = this.projectileAABB(p);

            for (const m of this.monsters) {
                if (!m.active) continue;
                const ma = this.monsterAABB(m);

                if (intersectsAABB(pa, ma)) {
                    // Equivalent of removing both nodes on contact
                    p.active = false;
                    m.active = false;
                    break;
                }
            }
        }
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
        this.spawnTimer += dt;
        while (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer -= this.spawnInterval;
            this.addMonster();
        }

        for (const m of this.monsters) {
            if (!m.active) continue;
            m.x -= m.speed * dt;
        }

        for (const p of this.projectiles) {
            if (!p.active) continue;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) p.active = false;
        }

        this.handleCollisions();

        this.monsters = this.monsters.filter((m) => m.active && m.x > -m.w * 0.5);
        this.projectiles = this.projectiles.filter((p) => p.active);
    }

    render() {
        const { ctx, canvas } = this;

        ctx.fillStyle = "#999999";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(
            this.player,
            this.playerPos.x - this.player.width * 0.5,
            this.playerPos.y - this.player.height * 0.5
        );

        for (const m of this.monsters) {
            ctx.drawImage(this.monsterImage, m.x - m.w * 0.5, m.y - m.h * 0.5);

            if (this.debug) this.drawMonsterDebug(m);
        }

        for (const p of this.projectiles) {
            ctx.drawImage(this.projectileImage, p.x - p.w * 0.5, p.y - p.h * 0.5);

            if (this.debug) this.drawProjectileDebug(p);
        }

        if (this.debug) {
            ctx.fillStyle = "#ff8080";
            ctx.font = "16px monospace";
            ctx.fillText("DEBUG: ON (P to toggle)", 16, 24);
        }
    }

    drawMonsterDebug(m) {
        const { ctx } = this;
        const left = m.x - m.w * 0.5;
        const top = m.y - m.h * 0.5;

        ctx.save();
        ctx.strokeStyle = "rgba(255, 64, 64, 0.95)";
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, m.w, m.h);
        ctx.restore();
    }

    drawProjectileDebug(p) {
        const { ctx } = this;
        const r = Math.max(p.w, p.h) * 0.5; // circle-style physics proxy

        ctx.save();
        ctx.strokeStyle = "rgba(255, 64, 64, 0.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}