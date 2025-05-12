@@ -1,277 +1,201 @@
// Game State Variables (same core, add visualClass to generators)
// Game State Variables - EXPANDED clickUpgrade
let gameState = {
    stardust: 0,
    stardustPerClick: 1,
    clickUpgrade: {
    stardustPerClick: 1, // Base SPC from Quantum Tapper
    clickUpgrade: { // For Quantum Tapper
        level: 0, cost: 10, baseCost: 10, bonusPerLevel: 1, costMultiplier: 1.15
    },
    synergyUpgrade: { // NEW: For Synergy Spark
        level: 0, cost: 150, baseCost: 150, bonusPerLevel: 0.1, // 0.1% SPS per level
        costMultiplier: 1.25, currentBonus: 0
    },
    critUpgrade: { // NEW: For Critical Surge
        level: 0, cost: 500, baseCost: 500,
        chancePerLevel: 0.5, // 0.5% crit chance per level
        multiplier: 2, // Base multiplier, could be upgradable too
        costMultiplier: 1.3, currentChance: 0
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
// DOM Elements Cache (Add new upgrade elements)
// ... (stardustCountEl, spsCountEl, spcCountEl, etc. are the same) ...
const clickTarget = document.getElementById('click-target');
const clickFeedbackContainer = document.getElementById('click-feedback-container');
const stardustParticleFlowContainer = document.getElementById('stardust-particle-flow-container');
const generatorFleetDisplay = document.getElementById('generator-fleet-display');
const backgroundAnimationContainer = document.getElementById('background-animation-container');

// Quantum Tapper elements
const clickUpgradeLevelEl = document.getElementById('click-upgrade-level');
const clickUpgradeBonusEl = document.getElementById('click-upgrade-bonus'); // This span shows the bonus, text should be "+N SPC"
const clickUpgradeBonusDisplayEl = document.getElementById('click-upgrade-bonus-display');
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
// Synergy Spark elements
const synergyUpgradeLevelEl = document.getElementById('synergy-upgrade-level');
const synergyBonusDisplayEl = document.getElementById('synergy-bonus-display');
const buySynergyUpgradeBtn = document.getElementById('buy-synergy-upgrade');

// Critical Surge elements
const critChanceDisplayEl = document.getElementById('crit-chance-display');
const critMultiplierDisplayEl = document.getElementById('crit-multiplier-display');
const buyCritUpgradeBtn = document.getElementById('buy-crit-upgrade');

// ... (generatorElements, save/load buttons are the same) ...

// --- Blob Colors Array ---
const BLOB_COLORS = [
    "radial-gradient(circle, #c89aff 0%, #9370db 60%, #6a0dad 100%)", // Purple (Default)
    "radial-gradient(circle, #89f7fe 0%, #33c5d0 60%, #008c9e 100%)", // Cyan
    "radial-gradient(circle, #f789fe 0%, #d033c5 60%, #9e008c 100%)", // Magenta
    "radial-gradient(circle, #f7c889 0%, #d0a333 60%, #9e7c00 100%)", // Gold/Orange
    "radial-gradient(circle, #89fea2 0%, #33d06e 60%, #009e3a 100%)", // Green
    "radial-gradient(circle, #ff9a8b 0%, #ff6a88 50%, #ff3a88 100%)",  // Pink/Redish
    "radial-gradient(circle, #a0c4ff 0%, #6b9eff 50%, #3a7dff 100%)",  // Bright Blue
];

// --- Core Game Logic ---

function manualClick(event) {
    const clickValue = gameState.stardustPerClick;
    if (clickValue <= 0 && gameState.stardustPerClick <= 0) return; // Check actual SPC in case clickValue is stale
    let clickValue = gameState.stardustPerClick; // Base from Quantum Tapper

    // Apply Synergy Spark bonus
    const currentSPS = calculateSPS();
    const synergyBonus = currentSPS * (gameState.synergyUpgrade.currentBonus / 100);
    clickValue += synergyBonus;

    // Apply Critical Surge
    let isCrit = false;
    if (Math.random() * 100 < gameState.critUpgrade.currentChance) {
        clickValue *= gameState.critUpgrade.multiplier;
        isCrit = true;
    }

    // --- Stardust Gain Logic ---
    gameState.stardust += gameState.stardustPerClick; // IMMEDIATE Stardust addition
    if (clickValue <= 0) return; // No negative or zero gains

    // --- Visual Feedback ---
    createStardustParticlesOnClickVisualsOnly(gameState.stardustPerClick, event); // Visuals only
    showClickSparks(event);
    showClickTextFeedback(`+${formatNumber(gameState.stardustPerClick)}`, event);
    gameState.stardust += clickValue;

    // updateDisplay(); // Game loop handles periodic updates, this can make it snappier but might be redundant
    // Visual Feedback
    createStardustParticlesOnClickVisualsOnly(clickValue, event);
    showClickSparks(event);
    let feedbackText = `+${formatNumber(clickValue)}`;
    if (isCrit) feedbackText = `CRIT! ${feedbackText}`;
    showClickTextFeedback(feedbackText, event);
}


// Quantum Tapper Upgrade
function buyClickUpgrade() {
    const upgrade = gameState.clickUpgrade;
    if (gameState.stardust >= upgrade.cost) {
        gameState.stardust -= upgrade.cost;
        upgrade.level++;
        // Base stardustPerClick is directly from this upgrade's effect
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
        updateBlobColor();
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
// Synergy Spark Upgrade
function buySynergyUpgrade() {
    const upgrade = gameState.synergyUpgrade;
    if (gameState.stardust >= upgrade.cost) {
        gameState.stardust -= upgrade.cost;
        upgrade.level++;
        upgrade.currentBonus = upgrade.level * upgrade.bonusPerLevel;
        upgrade.cost = Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
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
// Critical Surge Upgrade
function buyCritUpgrade() {
    const upgrade = gameState.critUpgrade;
    if (gameState.stardust >= upgrade.cost) {
        gameState.stardust -= upgrade.cost;
        upgrade.level++; // Each level just increases chance for now
        upgrade.currentChance = Math.min(upgrade.level * upgrade.chancePerLevel, 90); // Cap crit chance at 90%
        // Crit multiplier could also be an upgrade path later
        upgrade.cost = Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
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
function buyGenerator(generatorId) { /* ... same ... */ }
function calculateSPS() { /* ... same ... */ }

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
// --- NEW: Update Blob Color ---
function updateBlobColor() {
    const level = gameState.clickUpgrade.level; // Color tied to Quantum Tapper level
    const colorIndex = level % BLOB_COLORS.length;
    if (clickTarget) {
        clickTarget.style.background = BLOB_COLORS[colorIndex];
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
// --- Display Updates (EXPANDED) ---
function updateDisplay() {
    stardustCountEl.textContent = formatNumber(Math.floor(gameState.stardust));
    
    // Calculate total SPC for display (combining all click bonuses)
    let displaySPC = gameState.stardustPerClick;
    const currentSPS = calculateSPS();
    displaySPC += currentSPS * (gameState.synergyUpgrade.currentBonus / 100);
    // Note: Crit isn't averaged into SPC display, it's a chance effect.
    spcCountEl.textContent = formatNumber(displaySPC);
    
    spsCountEl.textContent = formatNumber(currentSPS);

    // Quantum Tapper
    const qtUpgrade = gameState.clickUpgrade;
    clickUpgradeLevelEl.textContent = formatNumber(qtUpgrade.level);
    clickUpgradeBonusDisplayEl.textContent = formatNumber(qtUpgrade.bonusPerLevel); // Base bonus per level
    buyClickUpgradeBtn.textContent = `Buy (Cost: ${formatNumber(qtUpgrade.cost)})`;
    buyClickUpgradeBtn.disabled = gameState.stardust < qtUpgrade.cost;

    // Synergy Spark
    const synUpgrade = gameState.synergyUpgrade;
    synergyUpgradeLevelEl.textContent = formatNumber(synUpgrade.level);
    synergyBonusDisplayEl.textContent = synUpgrade.currentBonus.toFixed(1); // Show with one decimal
    buySynergyUpgradeBtn.textContent = `Buy (Cost: ${formatNumber(synUpgrade.cost)})`;
    buySynergyUpgradeBtn.disabled = gameState.stardust < synUpgrade.cost;

    // Critical Surge
    const crUpgrade = gameState.critUpgrade;
    critChanceDisplayEl.textContent = crUpgrade.currentChance.toFixed(1);
    critMultiplierDisplayEl.textContent = formatNumber(crUpgrade.multiplier);
    buyCritUpgradeBtn.textContent = `Buy (Cost: ${formatNumber(crUpgrade.cost)})`;
    buyCritUpgradeBtn.disabled = gameState.stardust < crUpgrade.cost;

    // Generators (same as before)
    gameState.generators.forEach(gen => { /* ... same ... */ });
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
function formatNumber(num) { /* ... same ... */ }

// --- Visual & Animation Functions (No changes, just ensure they are present) ---
function createBackgroundStars() { /* ... same ... */ }
function showClickSparks(event) { /* ... same ... */ }
function showClickTextFeedback(text, event) { /* ... same ... */ }
function createStardustParticle(startX, startY) { /* ... same ... */ }
function createStardustParticlesOnClickVisualsOnly(amount, event) { /* ... same ... */ }
function emitSPSParticles() { /* ... same ... */ }
function updateGeneratorFleetVisuals(changedGen) { /* ... same ... */ }

// --- Saving and Loading ---
// --- Saving and Loading (EXPANDED to include new upgrades) ---
function saveGame() {
    gameState.lastSaveTime = Date.now();
    try {
        localStorage.setItem('cosmicClickerDeluxeSave', JSON.stringify(gameState));
        // Selective serialization to avoid saving derived/cached values unnecessarily
        const saveData = {
            stardust: gameState.stardust,
            stardustPerClick: gameState.stardustPerClick,
            clickUpgrade: { level: gameState.clickUpgrade.level, cost: gameState.clickUpgrade.cost },
            synergyUpgrade: { level: gameState.synergyUpgrade.level, cost: gameState.synergyUpgrade.cost, currentBonus: gameState.synergyUpgrade.currentBonus },
            critUpgrade: { level: gameState.critUpgrade.level, cost: gameState.critUpgrade.cost, currentChance: gameState.critUpgrade.currentChance },
            generators: gameState.generators.map(g => ({ id: g.id, level: g.level, cost: g.cost })), // Save only essential generator data
            lastSaveTime: gameState.lastSaveTime
        };
        localStorage.setItem('cosmicClickerDeluxeSave', JSON.stringify(saveData));
        showSaveStatus('Game Saved!');
    } catch (error) { console.error("Error saving game:", error); showSaveStatus('Error saving game.'); }
}
@@ -280,29 +204,55 @@ function loadGame() {
    const savedGame = localStorage.getItem('cosmicClickerDeluxeSave');
    if (savedGame) {
        try {
            const loadedState = JSON.parse(savedGame);
            const timeSinceLastSave = Date.now() - (loadedState.lastSaveTime || Date.now());
            const loadedData = JSON.parse(savedGame);
            
            gameState.stardust = loadedData.stardust || 0;
            gameState.stardustPerClick = loadedData.stardustPerClick || 1; // From Quantum Tapper
            gameState.lastSaveTime = loadedData.lastSaveTime || Date.now();

            // Load Quantum Tapper
            if (loadedData.clickUpgrade) {
                gameState.clickUpgrade.level = loadedData.clickUpgrade.level || 0;
                gameState.clickUpgrade.cost = loadedData.clickUpgrade.cost || gameState.clickUpgrade.baseCost;
            }
            // Recalculate derived stardustPerClick just in case
            gameState.stardustPerClick = 1 + gameState.clickUpgrade.level * gameState.clickUpgrade.bonusPerLevel;


            // Load Synergy Spark
            if (loadedData.synergyUpgrade) {
                gameState.synergyUpgrade.level = loadedData.synergyUpgrade.level || 0;
                gameState.synergyUpgrade.cost = loadedData.synergyUpgrade.cost || gameState.synergyUpgrade.baseCost;
                gameState.synergyUpgrade.currentBonus = loadedData.synergyUpgrade.currentBonus || 0;
            } else { // If loading old save without synergy
                gameState.synergyUpgrade.currentBonus = gameState.synergyUpgrade.level * gameState.synergyUpgrade.bonusPerLevel;
            }

            // Carefully merge states, prioritizing loaded simple values and object structures
            gameState.stardust = loadedState.stardust || 0;
            gameState.stardustPerClick = loadedState.stardustPerClick || 1;
            gameState.lastSaveTime = loadedState.lastSaveTime || Date.now();

            if (loadedState.clickUpgrade) {
                Object.assign(gameState.clickUpgrade, loadedState.clickUpgrade);
            // Load Critical Surge
            if (loadedData.critUpgrade) {
                gameState.critUpgrade.level = loadedData.critUpgrade.level || 0;
                gameState.critUpgrade.cost = loadedData.critUpgrade.cost || gameState.critUpgrade.baseCost;
                gameState.critUpgrade.currentChance = loadedData.critUpgrade.currentChance || 0;
            } else { // If loading old save without crit
                 gameState.critUpgrade.currentChance = Math.min(gameState.critUpgrade.level * gameState.critUpgrade.chancePerLevel, 90);
            }

            if (loadedState.generators && Array.isArray(loadedState.generators)) {
                loadedState.generators.forEach((savedGen, index) => {
                    if (gameState.generators[index]) {
                        Object.assign(gameState.generators[index], savedGen);
                    } else { // Should not happen if base structure is same
                        gameState.generators[index] = savedGen;
            // Load Generators
            if (loadedData.generators && Array.isArray(loadedData.generators)) {
                loadedData.generators.forEach(savedGenData => {
                    const gameGen = gameState.generators.find(g => g.id === savedGenData.id);
                    if (gameGen) {
                        gameGen.level = savedGenData.level || 0;
                        gameGen.cost = savedGenData.cost || gameGen.baseCost;
                    }
                });
            }
            
            const offlineSPS = calculateSPS(); // Calculate SPS based on loaded levels
            // Recalculate all costs just to be sure after loading levels
            recalculateAllCosts();

            const timeSinceLastSave = Date.now() - gameState.lastSaveTime;
            const offlineSPS = calculateSPS();
            const offlineStardustGained = offlineSPS * (timeSinceLastSave / 1000);

            if (offlineStardustGained > 0) {
@@ -311,6 +261,7 @@ function loadGame() {
            } else { showSaveStatus('Game Loaded!'); }

            gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));
            updateBlobColor(); // Set initial blob color based on loaded level

        } catch (error) {
            console.error("Error loading game:", error);
@@ -319,86 +270,86 @@ function loadGame() {
        }
    } else {
        showSaveStatus('No save found. New game started.');
        recalculateAllCosts(); // Calculate initial costs for new game
        gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));
        updateBlobColor(); // Set default blob color
    }
    updateDisplay();
}

function recalculateAllCosts() {
    // Quantum Tapper
    gameState.clickUpgrade.cost = Math.ceil(gameState.clickUpgrade.baseCost * Math.pow(gameState.clickUpgrade.costMultiplier, gameState.clickUpgrade.level));
    // Synergy Spark
    gameState.synergyUpgrade.cost = Math.ceil(gameState.synergyUpgrade.baseCost * Math.pow(gameState.synergyUpgrade.costMultiplier, gameState.synergyUpgrade.level));
    // Critical Surge
    gameState.critUpgrade.cost = Math.ceil(gameState.critUpgrade.baseCost * Math.pow(gameState.critUpgrade.costMultiplier, gameState.critUpgrade.level));
    // Generators
    gameState.generators.forEach(gen => {
        gen.cost = Math.ceil(gen.baseCost * Math.pow(gen.costMultiplier, gen.level));
    });
}


function resetGameConfirm(confirmPrompt = true) {
    const doReset = confirmPrompt ? confirm("Are you sure you want to reset all progress?") : true;
    if (doReset) {
        localStorage.removeItem('cosmicClickerDeluxeSave');
        const initialClickUpgrade = { level: 0, cost: 10, baseCost: 10, bonusPerLevel: 1, costMultiplier: 1.15 };
        // Reset game state to initial values
        gameState.stardust = 0;
        gameState.stardustPerClick = 1; // Base value

        gameState.clickUpgrade = { level: 0, cost: 10, baseCost: 10, bonusPerLevel: 1, costMultiplier: 1.15 };
        gameState.synergyUpgrade = { level: 0, cost: 150, baseCost: 150, bonusPerLevel: 0.1, costMultiplier: 1.25, currentBonus: 0 };
        gameState.critUpgrade = { level: 0, cost: 500, baseCost: 500, chancePerLevel: 0.5, multiplier: 2, costMultiplier: 1.3, currentChance: 0 };
        
        const initialGenerators = [
            { id: 'gen1', name: 'Nebula Drone', level: 0, sps: 1, baseSps: 1, cost: 50, baseCost: 50, costMultiplier: 1.18, visualClass: 'visual-gen1' },
            { id: 'gen2', name: 'Crystal Harvester', level: 0, sps: 5, baseSps: 5, cost: 250, baseCost: 250, costMultiplier: 1.20, visualClass: 'visual-gen2' }
        ];
        gameState.stardust = 0;
        gameState.stardustPerClick = 1;
        gameState.clickUpgrade = { ...initialClickUpgrade }; // Use spread for new object
        // Deep copy for generators array of objects
        gameState.generators = initialGenerators.map(g => ({ ...g }));
        gameState.generators = initialGenerators.map(g => ({ ...g })); // Deep copy

        gameState.lastSaveTime = Date.now();
        stardustBufferForAnimation = 0;

        recalculateAllCosts(); // Ensure costs are reset
        gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));
        updateBlobColor(); // Reset blob color
        showSaveStatus('Game Reset!');
        updateDisplay();
    }
}

function showSaveStatus(message) {
    if (!saveStatusEl) return;
    saveStatusEl.textContent = message;
    setTimeout(() => { saveStatusEl.textContent = ''; }, 4000);
}
function showSaveStatus(message) { /* ... same ... */ }

// --- Game Loop ---
let lastUpdateTime = 0; // Will be set in initializeGame
// ... (Game loop itself is largely unchanged, relies on updated calculateSPS and manualClick) ...
let lastUpdateTime = 0;
const MAIN_UPDATE_INTERVAL = 100;
let timeSinceLastMainUpdate = 0;

function gameLoop(currentTime) {
    if (!lastUpdateTime) lastUpdateTime = currentTime; // Initialize on first frame
    const deltaTime = (currentTime - lastUpdateTime) / 1000;
    lastUpdateTime = currentTime;
function gameLoop(currentTime) { /* ... same as before ... */ }

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
// --- Initialization (Add event listeners for new buttons) ---
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
    // ... (Defensive checks for critical DOM elements from before) ...
    if (!buySynergyUpgradeBtn || !buyCritUpgradeBtn) {
         console.error("New upgrade buttons not found. Game cannot initialize properly.");
         // Optionally, display an error message to the user on the page itself.
         return;
    }

    createBackgroundStars();

    clickTarget.addEventListener('click', manualClick);
    // Quantum Tapper
    buyClickUpgradeBtn.addEventListener('click', buyClickUpgrade);
    // Synergy Spark
    buySynergyUpgradeBtn.addEventListener('click', buySynergyUpgrade);
    // Critical Surge
    buyCritUpgradeBtn.addEventListener('click', buyCritUpgrade);

    gameState.generators.forEach(gen => {
        const btn = generatorElements[gen.id]?.buyBtn;
        if (btn) btn.addEventListener('click', () => buyGenerator(gen.id));
@@ -407,11 +358,11 @@ function initializeGame() {

    saveButton.addEventListener('click', saveGame);
    loadButton.addEventListener('click', loadGame);
    resetButton.addEventListener('click', () => resetGameConfirm(true)); // Ensure confirm prompt for button click
    resetButton.addEventListener('click', () => resetGameConfirm(true));

    loadGame();
    loadGame(); // This will also call updateDisplay and updateBlobColor

    console.log("Cosmic Clicker Deluxe Initialized!");
    console.log("Cosmic Clicker Deluxe Enhanced Initialized!");
    lastUpdateTime = performance.now();
    requestAnimationFrame(gameLoop);
}
