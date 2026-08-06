import { Game } from "./game.js";

const canvas = document.getElementById("game");
const game = new Game(canvas);
await game.start();