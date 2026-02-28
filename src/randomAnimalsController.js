import { Assets, Container } from "pixi.js";
import { RandomAnimal } from "./randomAnimal.js";
import { FPS, grassTop } from "./config.js";

const MAX_ANIMAL_COUNT = 10;
const ANIMAL_SPAWN_INTERVAL = 3 * FPS;
const SPAWN_MARGIN_BOTTOM = 150; // Pixels from bottom of screen to avoid spawning

// Sprite definitions (reusing cat sprites for now)
const SPRITE_DEFS = {
  walk: { url: "assets/sheep/walk.png", frames: 6 },
  run: { url: "assets/sheep/run.png", frames: 6 },
  hurt: { url: "assets/sheep/hurt.png", frames: 4 },
};

/**
 * RandomAnimalsController - Manages spawning and updating random animals
 * that walk across the screen.
 */
export class RandomAnimalsController {
  constructor() {
    this.container = new Container();
    this.animals = []; // Active animals
    this.spawnTimer = 0;
    this.spriteTextures = {}; // Loaded textures
    this.initialized = false;
  }

  /**
   * Initialize and load sprite assets.
   */
  async init() {
    // Load sprite textures
    for (const [name, def] of Object.entries(SPRITE_DEFS)) {
      const texture = await Assets.load(def.url);
      // Nearest-neighbour filtering keeps pixel art sharp when scaled up
      texture.source.scaleMode = "nearest";
      this.spriteTextures[name] = {
        texture,
        frames: def.frames,
      };
    }

    this.initialized = true;
  }

  /**
   * Spawn a new random animal.
   */
  spawnAnimal() {
    if (this.animals.length >= MAX_ANIMAL_COUNT) return;
    if (!this.initialized) return;

    // Random Y position in the grass area (with bottom margin)
    const grassH = window.innerHeight - grassTop() - SPAWN_MARGIN_BOTTOM;
    const y = grassTop() + Math.random() * grassH;

    // Random direction: -1 (left) or 1 (right)
    const direction = Math.random() < 0.5 ? -1 : 1;

    // Start position off-screen on the appropriate side
    const margin = 100;
    const startX = direction > 0 ? -margin : window.innerWidth + margin;

    // Create and add the animal (pass all sprite textures)
    const animal = new RandomAnimal(this.spriteTextures, startX, y, direction);
    this.animals.push(animal);
    this.container.addChild(animal.container);
  }

  /**
   * Update all animals and spawn new ones.
   * @param {number} catX - Cat's X position for collision detection
   * @param {number} catY - Cat's Y position for collision detection
   */
  update(catX, catY) {
    if (!this.initialized) return;

    // Update spawn timer
    this.spawnTimer++;
    if (this.spawnTimer >= ANIMAL_SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.spawnAnimal();
    }

    // Update all active animals
    for (let i = this.animals.length - 1; i >= 0; i--) {
      const animal = this.animals[i];
      const stillActive = animal.update(catX, catY);

      // Remove inactive animals
      if (!stillActive) {
        this.container.removeChild(animal.container);
        animal.destroy();
        this.animals.splice(i, 1);
      }
    }
  }

  /**
   * Get the container for rendering.
   */
  getContainer() {
    return this.container;
  }

  /**
   * Get the count of active animals.
   */
  getCount() {
    return this.animals.length;
  }
}
