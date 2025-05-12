// Game State Variables
let gameState = {
    stardust: 0,
    stardustPerClick: 1,
    clickUpgrade: {
        level: 0,
        cost: 10,
        baseCost: 10,
        bonusPerLevel: 1,
        costMultiplier: 1.15 // Cost increases by 15% each level
    },
    generators: [
        {
            id: 'gen1', // Mining Drone
            name: 'Mining Drone',
            level: 0,
            sps: 1, // Stardust per second per generator
            cost: 50,
            baseCost: 50,
            costMultiplier: 1.18
        },
        {
            id: 'gen2', // Solar Sail Collector
            name: 'Solar Sail Collector',
            level: 0,
            sps: 5,
            cost: 250,
            baseCost: 250,
            costMultiplier: 1.20
        }
        // Add more generators here following the same structure
    ]
};

// DOM Elements Cache
const stardustCountEl = document.getElementById('stardust-count');
const spsCountEl = document.getElementById('sps-count');
const spcCountEl = document.getElementById('spc-count');
const clickButton = document.getElementById('click-button');
const clickFeedbackContainer = document.getElementById('click-feedback-container');

// Upgrade Elements
const clickUpgradeLevelEl = document.getElementById('click-upgrade-level');
const clickUpgradeBonusEl = document.getElementById('click-upgrade-bonus');
const buyClickUpgradeBtn = document.getElementById('buy-click-upgrade');

// Generator Elements (Map for easier access)
const generatorElements = {};
gameState.generators.forEach(gen => {
    generatorElements[gen.id] = {
        levelEl: document.getElementById(`${gen.id}-level`),
        spsEl: document.getElementById(`${gen.id}-sps`),
        buyBtn: document.getElementById(`buy-${gen.id}`)
    };
    // Set initial display for SPS per generator
    if(generatorElements[gen.id].spsEl) {
       generatorElements[gen.id].spsEl.textContent = formatNumber(gen.sps);
    }
});

// Save/Load/Reset Buttons
const saveButton = document.getElementById('save-button');
const loadButton = document.getElementById('load-button');
const resetButton = document.getElementById('reset-button');
const saveStatusEl = document.getElementById('save-status');


// --- Core Game Logic ---

function manualClick() {
    gameState.stardust += gameState.stardustPerClick;
    showClickFeedback(`+${formatNumber(gameState.stardustPerClick)}`);
    updateDisplay(); // Update immediately for responsiveness
}

function buyClickUpgrade() {
    const upgrade = gameState.clickUpgrade;
    if (gameState.stardust >= upgrade.cost) {
        gameState.stardust -= upgrade.cost;
        upgrade.level++;
        // Increase Stardust Per Click (SPC) - could be linear or exponential
        gameState.stardustPerClick = 1 + upgrade.level * upgrade.bonusPerLevel;
        // Increase cost for next upgrade
        upgrade.cost = Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
        updateDisplay();
    }
}

function buyGenerator(generatorId) {
    const gen = gameState.generators.find(g => g.id === generatorId);
    if (gen && gameState.stardust >= gen.cost) {
        gameState.stardust -= gen.cost;
        gen.level++;
        // Increase cost for next generator
        gen.cost = Math.ceil(gen.baseCost * Math.pow(gen.costMultiplier, gen.level));
        updateDisplay(); // Update display including SPS
    }
}

function calculateSPS() {
    let totalSPS = 0;
    gameState.generators.forEach(gen => {
        totalSPS += gen.level * gen.sps;
    });
    return totalSPS;
}

// --- Display Updates ---

function updateDisplay() {
    stardustCountEl.textContent = formatNumber(gameState.stardust);
    spcCountEl.textContent = formatNumber(gameState.stardustPerClick);

    const currentSPS = calculateSPS();
    spsCountEl.textContent = formatNumber(currentSPS);

    // Update Click Upgrade Display
    const clickUpgrade = gameState.clickUpgrade;
    clickUpgradeLevelEl.textContent = formatNumber(clickUpgrade.level);
    clickUpgradeBonusEl.textContent = formatNumber(clickUpgrade.bonusPerLevel);
    buyClickUpgradeBtn.textContent = `Buy (Cost: ${formatNumber(clickUpgrade.cost)} Stardust)`;
    buyClickUpgradeBtn.disabled = gameState.stardust < clickUpgrade.cost;

    // Update Generator Displays
    gameState.generators.forEach(gen => {
        const elements = generatorElements[gen.id];
        if (elements) {
            elements.levelEl.textContent = formatNumber(gen.level);
            elements.buyBtn.textContent = `Buy (Cost: ${formatNumber(gen.cost)} Stardust)`;
            elements.buyBtn.disabled = gameState.stardust < gen.cost;
             // Update SPS per generator display in case it changes dynamically later
             if(elements.spsEl) elements.spsEl.textContent = formatNumber(gen.sps);
        }
    });
}

// Helper to format large numbers (optional but nice)
function formatNumber(num) {
    // Simple version for demonstration
    if (num < 1000) return num.toFixed(0);
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    return (num / 1000000000).toFixed(1) + 'B';
    // Can expand with more suffixes (T, Qa, Qi...)
}

// Click feedback function
function showClickFeedback(text) {
    const feedback = document.createElement('div');
    feedback.textContent = text;
    feedback.className = 'click-feedback';
    clickFeedbackContainer.appendChild(feedback);

    // Remove the element after the animation finishes
    setTimeout(() => {
        feedback.remove();
    }, 700); // Match animation duration
}

// --- Saving and Loading ---

function saveGame() {
    try {
        localStorage.setItem('cosmicClickerSave', JSON.stringify(gameState));
        showSaveStatus('Game Saved!');
        console.log("Game saved:", gameState);
    } catch (error) {
        console.error("Error saving game:", error);
        showSaveStatus('Error saving game.');
    }
}

function loadGame() {
    const savedGame = localStorage.getItem('cosmicClickerSave');
    if (savedGame) {
        try {
            const loadedState = JSON.parse(savedGame);
            // Basic validation/migration could go here if structure changes
            // For now, directly merge. Be careful with complex nested objects.
            // A safer approach might be to iterate keys and assign.
            Object.assign(gameState, loadedState);

            // Ensure costs and derived values are recalculated or correctly loaded
            // (Might need more robust merging if game structure evolves)
            recalculateCosts(); // Add this function if needed after loading
            gameState.stardustPerClick = 1 + gameState.clickUpgrade.level * gameState.clickUpgrade.bonusPerLevel;


            showSaveStatus('Game Loaded!');
            console.log("Game loaded:", gameState);
        } catch (error) {
            console.error("Error loading game:", error);
            showSaveStatus('Error loading game. Starting fresh.');
            resetGameConfirm(); // Reset if save is corrupted
        }
    } else {
        showSaveStatus('No save game found.');
    }
    updateDisplay(); // Update display with loaded/new data
}

// Optional: Recalculate costs if baseCost/multipliers might change or weren't saved properly
function recalculateCosts() {
     const clickUpgrade = gameState.clickUpgrade;
     clickUpgrade.cost = Math.ceil(clickUpgrade.baseCost * Math.pow(clickUpgrade.costMultiplier, clickUpgrade.level));

     gameState.generators.forEach(gen => {
         gen.cost = Math.ceil(gen.baseCost * Math.pow(gen.costMultiplier, gen.level));
     });
}


function resetGameConfirm() {
    if (confirm("Are you sure you want to reset your game? All progress will be lost!")) {
        localStorage.removeItem('cosmicClickerSave');
        // Reset gameState object to its initial state definition
        // Need to be careful not to just assign a new object, but reset the properties
        // Or define an initial state function/object
         gameState = {
            stardust: 0,
            stardustPerClick: 1,
            clickUpgrade: { level: 0, cost: 10, baseCost: 10, bonusPerLevel: 1, costMultiplier: 1.15 },
            generators: [
                { id: 'gen1', name: 'Mining Drone', level: 0, sps: 1, cost: 50, baseCost: 50, costMultiplier: 1.18 },
                { id: 'gen2', name: 'Solar Sail Collector', level: 0, sps: 5, cost: 250, baseCost: 250, costMultiplier: 1.20 }
            ]
        };
        showSaveStatus('Game Reset!');
        updateDisplay();
        console.log("Game reset");
    }
}

function showSaveStatus(message) {
    saveStatusEl.textContent = message;
    setTimeout(() => {
        saveStatusEl.textContent = ''; // Clear message after a few seconds
    }, 3000);
}


// --- Game Loop ---

let lastUpdateTime = Date.now();

function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastUpdateTime) / 1000; // Time difference in seconds

    // Calculate passive Stardust gain
    const sps = calculateSPS();
    gameState.stardust += sps * deltaTime;

    // Update display periodically (not necessarily every frame for performance)
    updateDisplay();

    lastUpdateTime = now;
}

// --- Initialization ---

function initializeGame() {
    // Add event listeners
    clickButton.addEventListener('click', manualClick);
    buyClickUpgradeBtn.addEventListener('click', buyClickUpgrade);

    gameState.generators.forEach(gen => {
        const btn = generatorElements[gen.id]?.buyBtn;
        if (btn) {
            btn.addEventListener('click', () => buyGenerator(gen.id));
        }
    });

    saveButton.addEventListener('click', saveGame);
    loadButton.addEventListener('click', loadGame);
    resetButton.addEventListener('click', resetGameConfirm);

    // Attempt to load saved game on start
    loadGame();

    // Start the game loop (runs every 100ms = 10 times per second)
    setInterval(gameLoop, 100);

    // Initial display update
    updateDisplay();

    console.log("Cosmic Clicker Initialized!");
}

// Run initialization when the DOM is ready
document.addEventListener('DOMContentLoaded', initializeGame);
