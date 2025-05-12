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

// DOM Elements Cache (ensure all are correctly fetched)
const stardustCountEl = document.getElementById('stardust-count');
const spsCountEl = document.getElementById('sps-count');
const spcCountEl = document.getElementById('spc-count');
const clickTarget = document.getElementById('click-target');
const clickFeedbackContainer = document.getElementById('click-feedback-container');
const stardustParticleFlowContainer = document.getElementById('stardust-particle-flow-container');
const generatorFleetDisplay = document.getElementById('generator-fleet-display');
const backgroundAnimationContainer = document.getElementById('background-animation-container');

const clickUpgradeLevelEl = document.getElementById('click-upgrade-level');
const clickUpgradeBonusEl = document.getElementById('click-upgrade-bonus'); // This span shows the bonus, text should be "+N SPC"
const buyClickUpgradeBtn = document.getElementById('buy-click-upgrade');

const generatorElements = {};
gameState.generators.forEach(gen => {
    generatorElements[gen.id] = {
        levelEl: document.getElementById(`${gen.id}-level`),
        spsEl: document.getElementById(`${gen.id}-sps`), // This span shows the SPS per generator unit
        buyBtn: document.getElementById(`buy-${gen.id}`)
    };
    if (generatorElements[gen.id].spsEl) {
       generatorElements[gen.id].spsEl.textContent = formatNumber(gen.sps);
    }
});

const saveButton = document.getElementById('save-button');
const loadButton = document.getElementById('load-button');
const resetButton = document.getElementById('reset-button');
const saveStatusEl = document.getElementById('save-status');


// --- Animation & Visuals Configuration ---
const MAX_BG_STARS = 50;
const STARDUST_PARTICLE_ANIMATION_DURATION = 1700; // ms, slightly faster
const MAX_VISUAL_GENERATORS_PER_TYPE_DISPLAYED = 30;
let stardustBufferForAnimation = 0;
const PARTICLE_EMISSION_THRESHOLD = 0.5;
let particleEmissionRateLimiter = 0;

// --- Core Game Logic ---

function manualClick(event) {
    const clickValue = gameState.stardustPerClick;
    if (clickValue <= 0 && gameState.stardustPerClick <= 0) return; // Check actual SPC in case clickValue is stale

    // --- Stardust Gain Logic ---
    gameState.stardust += gameState.stardustPerClick; // IMMEDIATE Stardust addition

    // --- Visual Feedback ---
    createStardustParticlesOnClickVisualsOnly(gameState.stardustPerClick, event); // Visuals only
    showClickSparks(event);
    showClickTextFeedback(`+${formatNumber(gameState.stardustPerClick)}`, event);

    // updateDisplay(); // Game loop handles periodic updates, this can make it snappier but might be redundant
}


function buyClickUpgrade() {
    const upgrade = gameState.clickUpgrade;
    if (gameState.stardust >= upgrade.cost) {
        gameState.stardust -= upgrade.cost;
        upgrade.level++;
        gameState.stardustPerClick = 1 + upgrade.level * upgrade.bonusPerLevel;
        upgrade.cost = Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
        // updateDisplay(); // Handled by game loop
    }
}

function buyGenerator(generatorId) {
    const gen = gameState.generators.find(g => g.id === generatorId);
    if (gen && gameState.stardust >= gen.cost) {
        gameState.stardust -= gen.cost;
        gen.level++;
        gen.cost = Math.ceil(gen.baseCost * Math.pow(gen.costMultiplier, gen.level));
        updateGeneratorFleetVisuals(gen);
        // updateDisplay(); // Handled by game loop
    }
}

function calculateSPS() {
    return gameState.generators.reduce((total, gen) => total + (gen.level * gen.sps), 0);
}

// --- Display Updates ---
function updateDisplay() {
    stardustCountEl.textContent = formatNumber(Math.floor(gameState.stardust));
    spcCountEl.textContent = formatNumber(gameState.stardustPerClick);
    spsCountEl.textContent = formatNumber(calculateSPS());

    const clickUpgrade = gameState.clickUpgrade;
    clickUpgradeLevelEl.textContent = formatNumber(clickUpgrade.level);
    // Ensure the "+N SPC" text is correct if bonusPerLevel can change, though it's static now
    // clickUpgradeBonusEl.textContent = formatNumber(clickUpgrade.bonusPerLevel);
    buyClickUpgradeBtn.textContent = `Buy (Cost: ${formatNumber(clickUpgrade.cost)})`;
    buyClickUpgradeBtn.disabled = gameState.stardust < clickUpgrade.cost;

    gameState.generators.forEach(gen => {
        const elements = generatorElements[gen.id];
        if (elements) {
            elements.levelEl.textContent = formatNumber(gen.level);
            elements.buyBtn.textContent = `Buy (Cost: ${formatNumber(gen.cost)})`;
            elements.buyBtn.disabled = gameState.stardust < gen.cost;
            if(elements.spsEl) elements.spsEl.textContent = formatNumber(gen.sps); // Update generator's SPS display
        }
    });
}

function formatNumber(num) {
    num = Math.floor(num);
    if (num < 1000) return num.toString();
    const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"]; // Added more
    const i = Math.floor(Math.log10(Math.abs(num)) / 3);
    if (i >= suffixes.length) return num.toExponential(2);
    const shortNum = (num / Math.pow(1000, i));
    // Adjust decimals based on number size
    let decimals = 0;
    if (i > 0) { // Only add decimals for K and above
        if (shortNum < 10) decimals = 2;
        else if (shortNum < 100) decimals = 1;
    }
    return shortNum.toFixed(decimals) + suffixes[i];
}

// --- NEW Visual & Animation Functions ---

function createBackgroundStars() {
    if (!backgroundAnimationContainer) return;
    for (let i = 0; i < MAX_BG_STARS; i++) {
        const star = document.createElement('div');
        star.className = 'bg-star';
        const size = Math.random() * 2.5 + 0.5;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}vw`;
        star.style.animationDelay = `${Math.random() * 10}s`;
        star.style.animationDuration = `${Math.random() * 10 + 8}s`;
        backgroundAnimationContainer.appendChild(star);
    }
}

function showClickSparks(event) {
    if (!clickFeedbackContainer || !clickTarget) return;
    const rect = clickTarget.getBoundingClientRect();
    const containerRect = clickFeedbackContainer.getBoundingClientRect();
    const clickX = event.clientX - containerRect.left;
    const clickY = event.clientY - containerRect.top;

    for (let i = 0; i < 5; i++) {
        const spark = document.createElement('div');
        spark.className = 'click-spark';
        const angle = Math.random() * 360;
        spark.style.setProperty('--angle', `${angle - 90}deg`);
        spark.style.left = `${clickX}px`;
        spark.style.top = `${clickY}px`;
        clickFeedbackContainer.appendChild(spark);
        setTimeout(() => spark.remove(), 600);
    }
}

function showClickTextFeedback(text, event) {
    if (!clickFeedbackContainer) return;
    const feedback = document.createElement('div');
    feedback.textContent = text;
    feedback.className = 'click-text-feedback';
    const containerRect = clickFeedbackContainer.getBoundingClientRect();
    feedback.style.left = `${event.clientX - containerRect.left}px`;
    feedback.style.top = `${event.clientY - containerRect.top - 20}px`;
    clickFeedbackContainer.appendChild(feedback);
    setTimeout(() => feedback.remove(), 700);
}

// --- MODIFIED: Stardust particle creation, now purely visual for clicks ---
function createStardustParticle(startX, startY) { // Removed isFromClick
    if (!stardustParticleFlowContainer || !stardustCountEl) return;
    const particle = document.createElement('div');
    particle.className = 'stardust-particle';
    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    stardustParticleFlowContainer.appendChild(particle);

    const counterRect = stardustCountEl.getBoundingClientRect();
    const flowContainerRect = stardustParticleFlowContainer.getBoundingClientRect();
    const targetX = (counterRect.left + counterRect.width / 2) - flowContainerRect.left;
    const targetY = (counterRect.top + counterRect.height / 2) - flowContainerRect.top;
    const endX = targetX + (Math.random() - 0.5) * 20;
    const endY = targetY + (Math.random() - 0.5) * 10;

    particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.3)`, opacity: 0.5, offset: 0.9 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.1)`, opacity: 0 }
    ], {
        duration: STARDUST_PARTICLE_ANIMATION_DURATION * (0.9 + Math.random() * 0.2),
        easing: 'cubic-bezier(0.3, 0, 0.7, 1)',
        fill: 'forwards'
    }).onfinish = () => {
        particle.remove(); // Just remove, no stardust logic here
    };
}

// --- NEW: Visual particle generation for manual clicks ---
function createStardustParticlesOnClickVisualsOnly(amount, event) {
    if (!clickTarget || !stardustParticleFlowContainer) return;
    const clickRect = clickTarget.getBoundingClientRect();
    const flowContainerRect = stardustParticleFlowContainer.getBoundingClientRect();
    const originX = (clickRect.left + clickRect.width / 2) - flowContainerRect.left;
    const originY = (clickRect.top + clickRect.height / 2) - flowContainerRect.top;

    let numVisualParticles = 0;
    if (amount >= 1) {
        numVisualParticles = Math.min(Math.floor(amount), 10);
    } else if (amount > 0) {
        numVisualParticles = 1;
    }
    if (numVisualParticles === 0) return;

    for (let i = 0; i < numVisualParticles; i++) {
        setTimeout(() => {
            createStardustParticle(originX + (Math.random()-0.5)*20, originY + (Math.random()-0.5)*20);
        }, i * 20);
    }
}

function emitSPSParticles() {
    if (stardustBufferForAnimation >= PARTICLE_EMISSION_THRESHOLD) {
        const particlesToEmit = Math.floor(stardustBufferForAnimation / PARTICLE_EMISSION_THRESHOLD);
        stardustBufferForAnimation -= particlesToEmit * PARTICLE_EMISSION_THRESHOLD;

        if (!generatorFleetDisplay || !stardustParticleFlowContainer) return;
        const fleetRect = generatorFleetDisplay.getBoundingClientRect();
        const flowContainerRect = stardustParticleFlowContainer.getBoundingClientRect();

        for (let i = 0; i < Math.min(particlesToEmit, 5); i++) {
            const startX = (fleetRect.left + Math.random() * fleetRect.width) - flowContainerRect.left;
            const startY = (fleetRect.top + Math.random() * fleetRect.height / 2) - flowContainerRect.top;
            createStardustParticle(startX, startY);
        }
    }
}

function updateGeneratorFleetVisuals(changedGen) {
    if (!generatorFleetDisplay) return;
    const existingVisuals = generatorFleetDisplay.querySelectorAll(`.visual-generator-icon.${changedGen.visualClass}`);
    existingVisuals.forEach(v => v.remove());

    const count = Math.min(changedGen.level, MAX_VISUAL_GENERATORS_PER_TYPE_DISPLAYED);
    for (let i = 0; i < count; i++) {
        const visualIcon = document.createElement('div');
        visualIcon.className = `visual-generator-icon ${changedGen.visualClass}`;
        visualIcon.style.setProperty('--delay', `${i * 0.03}s`);
        generatorFleetDisplay.appendChild(visualIcon);
    }
}

// --- Saving and Loading ---
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

            // Carefully merge states, prioritizing loaded simple values and object structures
            gameState.stardust = loadedState.stardust || 0;
            gameState.stardustPerClick = loadedState.stardustPerClick || 1;
            gameState.lastSaveTime = loadedState.lastSaveTime || Date.now();

            if (loadedState.clickUpgrade) {
                Object.assign(gameState.clickUpgrade, loadedState.clickUpgrade);
            }

            if (loadedState.generators && Array.isArray(loadedState.generators)) {
                loadedState.generators.forEach((savedGen, index) => {
                    if (gameState.generators[index]) {
                        Object.assign(gameState.generators[index], savedGen);
                    } else { // Should not happen if base structure is same
                        gameState.generators[index] = savedGen;
                    }
                });
            }
            
            const offlineSPS = calculateSPS(); // Calculate SPS based on loaded levels
            const offlineStardustGained = offlineSPS * (timeSinceLastSave / 1000);

            if (offlineStardustGained > 0) {
                gameState.stardust += offlineStardustGained;
                showSaveStatus(`Welcome back! +${formatNumber(offlineStardustGained)} Stardust while away.`);
            } else { showSaveStatus('Game Loaded!'); }

            gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));

        } catch (error) {
            console.error("Error loading game:", error);
            showSaveStatus('Error loading. Starting fresh.');
            resetGameConfirm(false);
        }
    } else {
        showSaveStatus('No save found. New game started.');
        gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));
    }
    updateDisplay();
}

function resetGameConfirm(confirmPrompt = true) {
    const doReset = confirmPrompt ? confirm("Are you sure you want to reset all progress?") : true;
    if (doReset) {
        localStorage.removeItem('cosmicClickerDeluxeSave');
        const initialClickUpgrade = { level: 0, cost: 10, baseCost: 10, bonusPerLevel: 1, costMultiplier: 1.15 };
        const initialGenerators = [
            { id: 'gen1', name: 'Nebula Drone', level: 0, sps: 1, baseSps: 1, cost: 50, baseCost: 50, costMultiplier: 1.18, visualClass: 'visual-gen1' },
            { id: 'gen2', name: 'Crystal Harvester', level: 0, sps: 5, baseSps: 5, cost: 250, baseCost: 250, costMultiplier: 1.20, visualClass: 'visual-gen2' }
        ];
        gameState.stardust = 0;
        gameState.stardustPerClick = 1;
        gameState.clickUpgrade = { ...initialClickUpgrade }; // Use spread for new object
        // Deep copy for generators array of objects
        gameState.generators = initialGenerators.map(g => ({ ...g }));
        gameState.lastSaveTime = Date.now();
        stardustBufferForAnimation = 0;

        gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));
        showSaveStatus('Game Reset!');
        updateDisplay();
    }
}

function showSaveStatus(message) {
    if (!saveStatusEl) return;
    saveStatusEl.textContent = message;
    setTimeout(() => { saveStatusEl.textContent = ''; }, 4000);
}

// --- Game Loop ---
let lastUpdateTime = 0; // Will be set in initializeGame
const MAIN_UPDATE_INTERVAL = 100;
let timeSinceLastMainUpdate = 0;

function gameLoop(currentTime) {
    if (!lastUpdateTime) lastUpdateTime = currentTime; // Initialize on first frame
    const deltaTime = (currentTime - lastUpdateTime) / 1000;
    lastUpdateTime = currentTime;

    const sps = calculateSPS();
    gameState.stardust += sps * deltaTime;
    stardustBufferForAnimation += sps * deltaTime;

    particleEmissionRateLimiter += deltaTime * 1000;
    if (particleEmissionRateLimiter > 150) {
        emitSPSParticles();
        particleEmissionRateLimiter = 0;
    }

    timeSinceLastMainUpdate += deltaTime * 1000;
    if (timeSinceLastMainUpdate >= MAIN_UPDATE_INTERVAL) {
        updateDisplay();
        timeSinceLastMainUpdate = 0;
    }

    requestAnimationFrame(gameLoop);
}

// --- Initialization ---
function initializeGame() {
    // Defensive checks for critical DOM elements
    if (!clickTarget || !buyClickUpgradeBtn || !saveButton || !loadButton || !resetButton) {
        console.error("Critical UI element not found. Game cannot initialize properly.");
        // Optionally, display an error message to the user on the page itself.
        const errorMsgDiv = document.createElement('div');
        errorMsgDiv.textContent = "Error: Game UI elements missing. Please refresh or check the console.";
        errorMsgDiv.style.color = "red"; errorMsgDiv.style.textAlign = "center"; errorMsgDiv.style.padding = "20px";
        document.body.prepend(errorMsgDiv);
        return;
    }

    createBackgroundStars();

    clickTarget.addEventListener('click', manualClick);
    buyClickUpgradeBtn.addEventListener('click', buyClickUpgrade);
    gameState.generators.forEach(gen => {
        const btn = generatorElements[gen.id]?.buyBtn;
        if (btn) btn.addEventListener('click', () => buyGenerator(gen.id));
        else console.warn(`Button for generator ${gen.id} not found.`);
    });

    saveButton.addEventListener('click', saveGame);
    loadButton.addEventListener('click', loadGame);
    resetButton.addEventListener('click', () => resetGameConfirm(true)); // Ensure confirm prompt for button click

    loadGame();

    console.log("Cosmic Clicker Deluxe Initialized!");
    lastUpdateTime = performance.now();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initializeGame);
