import { Assets, Container } from "pixi.js";
import { RandomAnimal } from "./randomAnimal.js";
import { FPS, grassTop } from "./config.js";

const MAX_ANIMAL_COUNT = 10;
const ANIMAL_SPAWN_INTERVAL = 2 * FPS;
const SPAWN_MARGIN_BOTTOM = 150; // Pixels from bottom of screen to avoid spawning

const ANIMALS = ["sheep", "pig", "bird", "frog"];

function getSpriteDefs(animal) {
  return {
    walk: { url: `assets/${animal}/walk.png`, frames: 6 },
    run: { url: `assets/${animal}/run.png`, frames: 6 },
    hurt: { url: `assets/${animal}/hurt.png`, frames: 4 },
  };
}

/**
 * RandomAnimalsController - Manages spawning and updating random animals
 * that walk across the screen.
 */
export class RandomAnimalsController {
  constructor() {
    this.container = new Container();
    this.animals = []; // Active animals
    this.spawnTimer = 0;
    this.spriteTexturesByAnimal = {}; // Loaded textures organized by animal type
    this.initialized = false;
  }

  /**
   * Initialize and load sprite assets for all animals.
   */
  async init() {
    // Load sprite textures for each animal type
    for (const animalType of ANIMALS) {
      const spriteDefs = getSpriteDefs(animalType);
      const textures = {};

      for (const [name, def] of Object.entries(spriteDefs)) {
        const texture = await Assets.load(def.url);
        // Nearest-neighbour filtering keeps pixel art sharp when scaled up
        texture.source.scaleMode = "nearest";
        textures[name] = {
          texture,
          frames: def.frames,
        };
      }

      this.spriteTexturesByAnimal[animalType] = textures;
    }

    this.initialized = true;
  }

  /**
   * Spawn a new random animal.
   */
  spawnAnimal() {
    if (this.animals.length >= MAX_ANIMAL_COUNT) return;
    if (!this.initialized) return;

    // Random animal type
    const animalType = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const spriteTextures = this.spriteTexturesByAnimal[animalType];

    // Random Y position in the grass area (with bottom margin)
    const grassH = window.innerHeight - grassTop() - SPAWN_MARGIN_BOTTOM;
    const y = grassTop() + Math.random() * grassH;

    // Random direction: -1 (left) or 1 (right)
    const direction = Math.random() < 0.5 ? -1 : 1;

    // Start position off-screen on the appropriate side
    const margin = 100;
    const startX = direction > 0 ? -margin : window.innerWidth + margin;

    // Create and add the animal (pass sprite textures for this animal type)
    const animal = new RandomAnimal(spriteTextures, startX, y, direction);
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

  /**
   * Check if the cat is overlapping with any animal.
   * Returns the position of the first animal being overlapped, or null.
   * @param {number} catX - Cat's X position
   * @param {number} catY - Cat's Y position
   * @returns {object|null} - { x, y } of overlapped animal, or null
   */
  checkCatOverlap(catX, catY) {
    for (const animal of this.animals) {
      if (animal.checkCatCollision(catX, catY)) {
        // Return the animal's position for the cat to jump towards
        return { x: animal.x, y: animal.y };
      }
    }
    return null;
  }
}
