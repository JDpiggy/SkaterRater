// Game State Variables (same core, add visualClass to generators)
let gameState = {
    stardust: 0,
    stardustPerClick: 1,
    clickUpgrade: {
        level: 0, cost: 10, baseCost: 10, bonusPerLevel: 1, costMultiplier: 1.15
    },
    generators: [
        { id: 'gen1', name: 'Nebula Drone', level: 0, sps: 1, baseSps: 1, cost: 50, baseCost: 50, costMultiplier: 1.18, visualClass: 'visual-gen1' },
        { id: 'gen2', name: 'Crystal Harvester', level: 0, sps: 5, baseSps: 5, cost: 250, baseCost: 250, costMultiplier: 1.20, visualClass: 'visual-gen2' }
    ],
    lastSaveTime: Date.now()
};

// DOM Elements
const stardustCountEl = document.getElementById('stardust-count');
const spsCountEl = document.getElementById('sps-count');
const spcCountEl = document.getElementById('spc-count');
const clickTarget = document.getElementById('click-target');
const clickFeedbackContainer = document.getElementById('click-feedback-container');
const stardustParticleFlowContainer = document.getElementById('stardust-particle-flow-container');
const generatorFleetDisplay = document.getElementById('generator-fleet-display');
const backgroundAnimationContainer = document.getElementById('background-animation-container');

// Upgrade & Generator Button Elements (cache as before)
// ... (same caching logic for buy buttons, level spans, etc.)
const clickUpgradeLevelEl = document.getElementById('click-upgrade-level');
const clickUpgradeBonusEl = document.getElementById('click-upgrade-bonus');
const buyClickUpgradeBtn = document.getElementById('buy-click-upgrade');
const generatorElements = {};
gameState.generators.forEach(gen => {
    generatorElements[gen.id] = {
        levelEl: document.getElementById(`${gen.id}-level`),
        spsEl: document.getElementById(`${gen.id}-sps`),
        buyBtn: document.getElementById(`buy-${gen.id}`)
    };
    if(generatorElements[gen.id].spsEl) generatorElements[gen.id].spsEl.textContent = formatNumber(gen.sps);
});


// Save/Load/Reset Buttons
const saveButton = document.getElementById('save-button');
const loadButton = document.getElementById('load-button');
const resetButton = document.getElementById('reset-button');
const saveStatusEl = document.getElementById('save-status');


// --- Animation & Visuals Configuration ---
const MAX_BG_STARS = 50;
const STARDUST_PARTICLE_ANIMATION_DURATION = 1800; // ms
const MAX_VISUAL_GENERATORS_PER_TYPE_DISPLAYED = 30; // Max small icons to show for each generator type
let stardustBufferForAnimation = 0; // Accumulates SPS gain for particle emission
const PARTICLE_EMISSION_THRESHOLD = 0.5; // Emit particle(s) when buffer reaches this (can be SPS dependent)
let particleEmissionRateLimiter = 0; // To control emission frequency

// --- Core Game Logic (largely same, but trigger visual updates) ---

function manualClick(event) { // Pass event for positioning
    const clickValue = gameState.stardustPerClick;
    // gameState.stardust += clickValue; // Delaying actual increment for particle animation
    createStardustParticlesOnClick(clickValue, event); // Animate particles from click
    showClickSparks(event);
    showClickTextFeedback(`+${formatNumber(clickValue)}`, event); // Pass event
    // updateDisplay(); // updateDisplay is called in gameLoop
}

function buyClickUpgrade() {
    const upgrade = gameState.clickUpgrade;
    if (gameState.stardust >= upgrade.cost) {
        gameState.stardust -= upgrade.cost;
        upgrade.level++;
        gameState.stardustPerClick = 1 + upgrade.level * upgrade.bonusPerLevel;
        upgrade.cost = Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
        // Optionally, add visual change to clickTarget based on level
        // updateDisplay();
    }
}

function buyGenerator(generatorId) {
    const gen = gameState.generators.find(g => g.id === generatorId);
    if (gen && gameState.stardust >= gen.cost) {
        gameState.stardust -= gen.cost;
        gen.level++;
        gen.cost = Math.ceil(gen.baseCost * Math.pow(gen.costMultiplier, gen.level));
        updateGeneratorFleetVisuals(gen); // Update the visual display
        // updateDisplay();
    }
}

function calculateSPS() {
    return gameState.generators.reduce((total, gen) => total + (gen.level * gen.sps), 0);
}

// --- Display Update (largely same) ---
function updateDisplay() {
    stardustCountEl.textContent = formatNumber(Math.floor(gameState.stardust));
    spcCountEl.textContent = formatNumber(gameState.stardustPerClick);
    spsCountEl.textContent = formatNumber(calculateSPS());

    // Click Upgrade
    const clickUpgrade = gameState.clickUpgrade;
    clickUpgradeLevelEl.textContent = formatNumber(clickUpgrade.level);
    // clickUpgradeBonusEl.textContent = formatNumber(clickUpgrade.bonusPerLevel); // Assuming this is fixed text
    buyClickUpgradeBtn.textContent = `Buy (Cost: ${formatNumber(clickUpgrade.cost)})`;
    buyClickUpgradeBtn.disabled = gameState.stardust < clickUpgrade.cost;

    // Generators
    gameState.generators.forEach(gen => {
        const elements = generatorElements[gen.id];
        if (elements) {
            elements.levelEl.textContent = formatNumber(gen.level);
            elements.buyBtn.textContent = `Buy (Cost: ${formatNumber(gen.cost)})`;
            elements.buyBtn.disabled = gameState.stardust < gen.cost;
            if(elements.spsEl) elements.spsEl.textContent = formatNumber(gen.sps);
        }
    });
}

function formatNumber(num) { // Same as before, ensure it handles potentially small/large numbers
    num = Math.floor(num);
    if (num < 1000) return num.toString();
    const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"];
    const i = Math.floor(Math.log10(Math.abs(num)) / 3);
    if (i >= suffixes.length) return num.toExponential(2);
    const shortNum = (num / Math.pow(1000, i));
    return shortNum.toFixed(i > 0 ? (shortNum < 10 ? 2 : (shortNum < 100 ? 1 : 0)) : 0) + suffixes[i];
}

// --- NEW Visual & Animation Functions ---

function createBackgroundStars() {
    for (let i = 0; i < MAX_BG_STARS; i++) {
        const star = document.createElement('div');
        star.className = 'bg-star';
        const size = Math.random() * 2.5 + 0.5; // 0.5px to 3px
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}vw`;
        star.style.animationDelay = `${Math.random() * 10}s`; // Stagger start
        star.style.animationDuration = `${Math.random() * 10 + 8}s`; // Vary speed (8-18s)
        backgroundAnimationContainer.appendChild(star);
    }
}

function showClickSparks(event) {
    const rect = clickTarget.getBoundingClientRect(); // Click target's position
    const containerRect = clickFeedbackContainer.getBoundingClientRect(); // Feedback container's position

    // Calculate click position relative to the feedback container
    const clickX = event.clientX - containerRect.left;
    const clickY = event.clientY - containerRect.top;

    for (let i = 0; i < 5; i++) { // Create 5 sparks
        const spark = document.createElement('div');
        spark.className = 'click-spark';
        const angle = Math.random() * 360; // Random direction
        spark.style.setProperty('--angle', `${angle - 90}deg`); // -90 because triangle points up
        spark.style.left = `${clickX}px`;
        spark.style.top = `${clickY}px`;
        clickFeedbackContainer.appendChild(spark);
        setTimeout(() => spark.remove(), 600); // Match animation duration
    }
}

function showClickTextFeedback(text, event) {
    const feedback = document.createElement('div');
    feedback.textContent = text;
    feedback.className = 'click-text-feedback';

    const containerRect = clickFeedbackContainer.getBoundingClientRect();
    feedback.style.left = `${event.clientX - containerRect.left}px`;
    feedback.style.top = `${event.clientY - containerRect.top - 20}px`; // Position above cursor

    clickFeedbackContainer.appendChild(feedback);
    setTimeout(() => feedback.remove(), 700);
}

function createStardustParticle(startX, startY, isFromClick = false) {
    const particle = document.createElement('div');
    particle.className = 'stardust-particle';
    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    stardustParticleFlowContainer.appendChild(particle); // Add to the correct container

    // Target: Stardust counter element
    const counterRect = stardustCountEl.getBoundingClientRect();
    const flowContainerRect = stardustParticleFlowContainer.getBoundingClientRect();

    // Calculate target relative to the flow container
    const targetX = (counterRect.left + counterRect.width / 2) - flowContainerRect.left;
    const targetY = (counterRect.top + counterRect.height / 2) - flowContainerRect.top;

    // Randomize arrival slightly for a more natural look
    const endX = targetX + (Math.random() - 0.5) * 20;
    const endY = targetY + (Math.random() - 0.5) * 10;

    particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.3)`, opacity: 0.5, offset: 0.9 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.1)`, opacity: 0 }
    ], {
        duration: STARDUST_PARTICLE_ANIMATION_DURATION * (0.9 + Math.random() * 0.2), // Slightly varied duration
        easing: 'cubic-bezier(0.3, 0, 0.7, 1)', // Custom ease-in, then fast
        fill: 'forwards'
    }).onfinish = () => {
        particle.remove();
        if (isFromClick) {
            gameState.stardust += 1; // Increment by 1 for each click particle
        } else {
            // For passive SPS, the stardust is already notionally "earned" and buffered.
            // The actual increment happens when the game loop decides to "cash in" the buffer.
            // This function just handles the visual.
            // If we want each particle to represent 1 stardust from SPS, then increment here.
            // For now, let's assume SPS particles are purely visual and the buffer handles the amount.
        }
    };
}

// For particles from manual clicks
function createStardustParticlesOnClick(amount, event) {
    const clickRect = clickTarget.getBoundingClientRect();
    const flowContainerRect = stardustParticleFlowContainer.getBoundingClientRect();

    // Origin point for click particles (center of clickTarget, relative to flowContainer)
    const originX = (clickRect.left + clickRect.width / 2) - flowContainerRect.left;
    const originY = (clickRect.top + clickRect.height / 2) - flowContainerRect.top;

    const numParticles = Math.min(Math.floor(amount), 10); // Max 10 particles per click visually
    const stardustPerParticle = amount / numParticles; // How much each visual particle represents

    for (let i = 0; i < numParticles; i++) {
        // Stagger creation slightly
        setTimeout(() => {
            createStardustParticle(originX + (Math.random()-0.5)*20, originY + (Math.random()-0.5)*20, true);
        }, i * 20); // isFromClick = true
    }
    // For amounts > 10, directly add the remainder without visual particles to avoid clutter.
    if (amount > numParticles) {
        gameState.stardust += (amount - numParticles);
    }
}


// For particles from passive SPS generation
function emitSPSParticles() {
    if (stardustBufferForAnimation >= PARTICLE_EMISSION_THRESHOLD) {
        const particlesToEmit = Math.floor(stardustBufferForAnimation / PARTICLE_EMISSION_THRESHOLD);
        stardustBufferForAnimation -= particlesToEmit * PARTICLE_EMISSION_THRESHOLD; // Consume from buffer

        // Origin for SPS particles (e.g., from generator fleet area or random within flow container)
        const fleetRect = generatorFleetDisplay.getBoundingClientRect();
        const flowContainerRect = stardustParticleFlowContainer.getBoundingClientRect();

        for (let i = 0; i < Math.min(particlesToEmit, 5); i++) { // Max 5 SPS particles per emission cycle visually
            const startX = (fleetRect.left + Math.random() * fleetRect.width) - flowContainerRect.left;
            const startY = (fleetRect.top + Math.random() * fleetRect.height / 2) - flowContainerRect.top; // From top half of fleet
            createStardustParticle(startX, startY, false); // isFromClick = false
        }
    }
}


function updateGeneratorFleetVisuals(changedGen) {
    // Clear existing visuals ONLY for this specific generator type
    const existingVisuals = generatorFleetDisplay.querySelectorAll(`.visual-generator-icon.${changedGen.visualClass}`);
    existingVisuals.forEach(v => v.remove());

    const count = Math.min(changedGen.level, MAX_VISUAL_GENERATORS_PER_TYPE_DISPLAYED);
    for (let i = 0; i < count; i++) {
        const visualIcon = document.createElement('div');
        visualIcon.className = `visual-generator-icon ${changedGen.visualClass}`;
        visualIcon.style.setProperty('--delay', `${i * 0.03}s`); // Stagger pop-in animation
        generatorFleetDisplay.appendChild(visualIcon);
    }
}

// --- Saving and Loading (largely same, ensure visual state is restored) ---
function saveGame() {
    gameState.lastSaveTime = Date.now();
    try {
        localStorage.setItem('cosmicClickerDeluxeSave', JSON.stringify(gameState));
        showSaveStatus('Game Saved!');
    } catch (error) { console.error("Error saving game:", error); showSaveStatus('Error saving game.'); }
}

function loadGame() {
    const savedGame = localStorage.getItem('cosmicClickerDeluxeSave');
    if (savedGame) {
        try {
            const loadedState = JSON.parse(savedGame);
            const timeSinceLastSave = Date.now() - (loadedState.lastSaveTime || Date.now());

            Object.assign(gameState.clickUpgrade, loadedState.clickUpgrade);
            loadedState.generators.forEach((savedGen, index) => {
                if (gameState.generators[index]) {
                    Object.assign(gameState.generators[index], savedGen);
                } else { gameState.generators[index] = savedGen; }
            });
            gameState.stardust = loadedState.stardust || 0;
            gameState.stardustPerClick = loadedState.stardustPerClick || 1;
            gameState.lastSaveTime = loadedState.lastSaveTime || Date.now();

            const offlineSPS = gameState.generators.reduce((total, gen) => total + ((gen.level || 0) * (gen.sps || 0)), 0);
            const offlineStardustGained = offlineSPS * (timeSinceLastSave / 1000);

            if (offlineStardustGained > 0) {
                gameState.stardust += offlineStardustGained;
                showSaveStatus(`Welcome back! +${formatNumber(offlineStardustGained)} Stardust while away.`);
            } else { showSaveStatus('Game Loaded!'); }

            // Restore visual state of generators
            gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));

        } catch (error) {
            console.error("Error loading game:", error);
            showSaveStatus('Error loading. Starting fresh.');
            resetGameConfirm(false); // No confirm prompt on load error
        }
    } else {
        showSaveStatus('No save found. New game started.');
        // Initialize fleet visuals for a new game (empty)
        gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));
    }
    updateDisplay();
}

function resetGameConfirm(confirmPrompt = true) {
    const doReset = confirmPrompt ? confirm("Are you sure you want to reset all progress?") : true;
    if (doReset) {
        localStorage.removeItem('cosmicClickerDeluxeSave');
        // Define initial state again to ensure a clean reset
        const initialClickUpgrade = { level: 0, cost: 10, baseCost: 10, bonusPerLevel: 1, costMultiplier: 1.15 };
        const initialGenerators = [
            { id: 'gen1', name: 'Nebula Drone', level: 0, sps: 1, baseSps: 1, cost: 50, baseCost: 50, costMultiplier: 1.18, visualClass: 'visual-gen1' },
            { id: 'gen2', name: 'Crystal Harvester', level: 0, sps: 5, baseSps: 5, cost: 250, baseCost: 250, costMultiplier: 1.20, visualClass: 'visual-gen2' }
        ];
        gameState.stardust = 0;
        gameState.stardustPerClick = 1;
        gameState.clickUpgrade = { ...initialClickUpgrade };
        gameState.generators = initialGenerators.map(g => ({ ...g }));
        gameState.lastSaveTime = Date.now();
        stardustBufferForAnimation = 0;

        gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen)); // Reset visual fleet
        showSaveStatus('Game Reset!');
        updateDisplay();
    }
}

function showSaveStatus(message) {
    saveStatusEl.textContent = message;
    setTimeout(() => { saveStatusEl.textContent = ''; }, 4000);
}

// --- Game Loop ---
let lastUpdateTime = Date.now();
const MAIN_UPDATE_INTERVAL = 100; // ms, for display & non-critical logic
let timeSinceLastMainUpdate = 0;

function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastUpdateTime) / 1000; // seconds
    lastUpdateTime = currentTime;

    // Passive Stardust Gain Logic
    const sps = calculateSPS();
    gameState.stardust += sps * deltaTime; // Actual stardust increment
    stardustBufferForAnimation += sps * deltaTime; // Buffer for visuals

    // Emit SPS particles based on buffer and rate limiting
    particleEmissionRateLimiter += deltaTime * 1000;
    if (particleEmissionRateLimiter > 150) { // Emit roughly every 150ms if buffer allows
        emitSPSParticles();
        particleEmissionRateLimiter = 0;
    }

    // Main display and button state updates (less frequent than every frame)
    timeSinceLastMainUpdate += deltaTime * 1000;
    if (timeSinceLastMainUpdate >= MAIN_UPDATE_INTERVAL) {
        updateDisplay();
        timeSinceLastMainUpdate = 0;
    }

    requestAnimationFrame(gameLoop);
}

// --- Initialization ---
function initializeGame() {
    createBackgroundStars();

    clickTarget.addEventListener('click', manualClick);
    buyClickUpgradeBtn.addEventListener('click', buyClickUpgrade);
    gameState.generators.forEach(gen => {
        const btn = generatorElements[gen.id]?.buyBtn;
        if (btn) btn.addEventListener('click', () => buyGenerator(gen.id));
    });

    saveButton.addEventListener('click', saveGame);
    loadButton.addEventListener('click', loadGame);
    resetButton.addEventListener('click', resetGameConfirm);

    loadGame(); // Load game data
    // updateDisplay(); // Initial display (called by loadGame or gameLoop)
    // gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen)); // Also called by loadGame

    console.log("Cosmic Clicker Deluxe Initialized!");
    lastUpdateTime = performance.now(); // Use performance.now() for rAF
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initializeGame);
