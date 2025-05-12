// Game State Variables - EXPANDED clickUpgrade
let gameState = {
    stardust: 0,
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

// DOM Elements Cache (Add new upgrade elements)
// ... (stardustCountEl, spsCountEl, spcCountEl, etc. are the same) ...
const clickTarget = document.getElementById('click-target');

// Quantum Tapper elements
const clickUpgradeLevelEl = document.getElementById('click-upgrade-level');
const clickUpgradeBonusDisplayEl = document.getElementById('click-upgrade-bonus-display');
const buyClickUpgradeBtn = document.getElementById('buy-click-upgrade');

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

    if (clickValue <= 0) return; // No negative or zero gains

    gameState.stardust += clickValue;

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
        updateBlobColor();
    }
}

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


function buyGenerator(generatorId) { /* ... same ... */ }
function calculateSPS() { /* ... same ... */ }

// --- NEW: Update Blob Color ---
function updateBlobColor() {
    const level = gameState.clickUpgrade.level; // Color tied to Quantum Tapper level
    const colorIndex = level % BLOB_COLORS.length;
    if (clickTarget) {
        clickTarget.style.background = BLOB_COLORS[colorIndex];
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

function formatNumber(num) { /* ... same ... */ }

// --- Visual & Animation Functions (No changes, just ensure they are present) ---
function createBackgroundStars() { /* ... same ... */ }
function showClickSparks(event) { /* ... same ... */ }
function showClickTextFeedback(text, event) { /* ... same ... */ }
function createStardustParticle(startX, startY) { /* ... same ... */ }
function createStardustParticlesOnClickVisualsOnly(amount, event) { /* ... same ... */ }
function emitSPSParticles() { /* ... same ... */ }
function updateGeneratorFleetVisuals(changedGen) { /* ... same ... */ }

// --- Saving and Loading (EXPANDED to include new upgrades) ---
function saveGame() {
    gameState.lastSaveTime = Date.now();
    try {
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

function loadGame() {
    const savedGame = localStorage.getItem('cosmicClickerDeluxeSave');
    if (savedGame) {
        try {
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


            // Load Critical Surge
            if (loadedData.critUpgrade) {
                gameState.critUpgrade.level = loadedData.critUpgrade.level || 0;
                gameState.critUpgrade.cost = loadedData.critUpgrade.cost || gameState.critUpgrade.baseCost;
                gameState.critUpgrade.currentChance = loadedData.critUpgrade.currentChance || 0;
            } else { // If loading old save without crit
                 gameState.critUpgrade.currentChance = Math.min(gameState.critUpgrade.level * gameState.critUpgrade.chancePerLevel, 90);
            }

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
            // Recalculate all costs just to be sure after loading levels
            recalculateAllCosts();

            const timeSinceLastSave = Date.now() - gameState.lastSaveTime;
            const offlineSPS = calculateSPS();
            const offlineStardustGained = offlineSPS * (timeSinceLastSave / 1000);

            if (offlineStardustGained > 0) {
                gameState.stardust += offlineStardustGained;
                showSaveStatus(`Welcome back! +${formatNumber(offlineStardustGained)} Stardust while away.`);
            } else { showSaveStatus('Game Loaded!'); }

            gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));
            updateBlobColor(); // Set initial blob color based on loaded level

        } catch (error) {
            console.error("Error loading game:", error);
            showSaveStatus('Error loading. Starting fresh.');
            resetGameConfirm(false);
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

function showSaveStatus(message) { /* ... same ... */ }

// --- Game Loop ---
// ... (Game loop itself is largely unchanged, relies on updated calculateSPS and manualClick) ...
let lastUpdateTime = 0;
const MAIN_UPDATE_INTERVAL = 100;
let timeSinceLastMainUpdate = 0;

function gameLoop(currentTime) { /* ... same as before ... */ }


// --- Initialization (Add event listeners for new buttons) ---
function initializeGame() {
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
        else console.warn(`Button for generator ${gen.id} not found.`);
    });

    saveButton.addEventListener('click', saveGame);
    loadButton.addEventListener('click', loadGame);
    resetButton.addEventListener('click', () => resetGameConfirm(true));

    loadGame(); // This will also call updateDisplay and updateBlobColor

    console.log("Cosmic Clicker Deluxe Enhanced Initialized!");
    lastUpdateTime = performance.now();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initializeGame);
