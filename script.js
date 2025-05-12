// Game State Variables - Add creditsTriggered
let gameState = {
    stardust: 0,
    stardustPerClick: 1,
    clickUpgrade: { /* ... same ... */ },
    synergyUpgrade: { /* ... same ... */ },
    critUpgrade: { /* ... same ... */ },
    generators: [ /* ... same ... */ ],
    lastSaveTime: Date.now(),
    creditsTriggered: false // NEW
};

// DOM Elements Cache (Add credits overlay elements)
// ... (all previous DOM elements) ...
const gameUIWrapper = document.querySelector('.game-ui-wrapper'); // Wrapper for main game
const creditsOverlay = document.getElementById('credits-overlay');
const creditsScrollText = document.querySelector('.credits-scroll');
const creditsRestartButton = document.getElementById('credits-restart-button');
const teaserTextEl = document.getElementById('teaser-text'); // For potential hiding later

const STARDUST_FOR_CREDITS = 100_000_000; // 100 Million

// --- Core Game Logic ---
function manualClick(event) { /* ... same ... */ }
function buyClickUpgrade() { /* ... same ... */ }
function buySynergyUpgrade() { /* ... same ... */ }
function buyCritUpgrade() { /* ... same ... */ }
function buyGenerator(generatorId) { /* ... same ... */ }
function calculateSPS() { /* ... same ... */ }
function updateBlobColor() { /* ... same ... */ }

// --- Display Updates (Ensure buttons are disabled) ---
function updateDisplay() {
    // ... (stardust, spc, sps counts) ...

    // Quantum Tapper
    const qtUpgrade = gameState.clickUpgrade;
    // ... (level, bonus, cost display) ...
    buyClickUpgradeBtn.disabled = gameState.stardust < qtUpgrade.cost;

    // Synergy Spark
    const synUpgrade = gameState.synergyUpgrade;
    // ... (level, bonus, cost display) ...
    buySynergyUpgradeBtn.disabled = gameState.stardust < synUpgrade.cost; // ENSURE THIS IS SET

    // Critical Surge
    const crUpgrade = gameState.critUpgrade;
    // ... (chance, multiplier, cost display) ...
    buyCritUpgradeBtn.disabled = gameState.stardust < crUpgrade.cost; // ENSURE THIS IS SET

    // ... (Generators display) ...

    // Check for credits trigger
    if (gameState.stardust >= STARDUST_FOR_CREDITS && !gameState.creditsTriggered) {
        triggerCreditsScene();
    }
}

function formatNumber(num) { /* ... same ... */ }

// --- Visual & Animation Functions (No changes) ---
// ... (createBackgroundStars, showClickSparks, etc.) ...

// --- NEW: Credits Scene Logic ---
function triggerCreditsScene() {
    gameState.creditsTriggered = true;
    saveGame(); // Save progress just before credits roll

    if (gameUIWrapper) gameUIWrapper.classList.add('hidden'); // Hide main game
    if (creditsOverlay) creditsOverlay.classList.remove('hidden');
    if (creditsScrollText) creditsScrollText.classList.add('scrolling');
    if (teaserTextEl) teaserTextEl.classList.add('hidden'); // Hide teaser

    // Optional: Stop game loop or particle animations if desired during credits
    // For now, background stars and blob pulse might continue if not explicitly stopped.
}

function handleCreditsRestart() {
    if (creditsOverlay) creditsOverlay.classList.add('hidden');
    if (creditsScrollText) creditsScrollText.classList.remove('scrolling'); // Reset animation class
    if (gameUIWrapper) gameUIWrapper.classList.remove('hidden'); // Show main game
    if (teaserTextEl) teaserTextEl.classList.remove('hidden'); // Show teaser again

    resetGameConfirm(false); // Reset game without confirmation
    gameState.creditsTriggered = false; // Allow credits to be triggered again in new game
    // RecalculateAllCosts and updateBlobColor are called within resetGameConfirm/loadGame
}


// --- Saving and Loading (Include creditsTriggered) ---
function saveGame() {
    gameState.lastSaveTime = Date.now();
    try {
        const saveData = {
            // ... (all previous save data properties) ...
            creditsTriggered: gameState.creditsTriggered // Save credits state
        };
        localStorage.setItem('cosmicClickerDeluxeSave', JSON.stringify(saveData));
        if (!gameState.creditsTriggered) { // Don't show "Game Saved!" during credits
            showSaveStatus('Game Saved!');
        }
    } catch (error) { console.error("Error saving game:", error); showSaveStatus('Error saving game.'); }
}

function loadGame() {
    const savedGame = localStorage.getItem('cosmicClickerDeluxeSave');
    if (savedGame) {
        try {
            const loadedData = JSON.parse(savedGame);
            // ... (load all previous game state properties) ...
            gameState.creditsTriggered = loadedData.creditsTriggered || false; // Load credits state

            // ... (rest of loadGame logic, offline progress, etc.) ...

            // If credits were already triggered and game is loaded, keep them showing
            // Or, decide if loading should reset the view. For now, let's assume if creditsTriggered, UI stays hidden.
            if (gameState.creditsTriggered) {
                if (gameUIWrapper) gameUIWrapper.classList.add('hidden');
                if (creditsOverlay) creditsOverlay.classList.remove('hidden');
                if (creditsScrollText) creditsScrollText.classList.add('scrolling'); // Resume scrolling
                if (teaserTextEl) teaserTextEl.classList.add('hidden');
            } else {
                if (gameUIWrapper) gameUIWrapper.classList.remove('hidden');
                if (creditsOverlay) creditsOverlay.classList.add('hidden');
                if (teaserTextEl) teaserTextEl.classList.remove('hidden');
            }


        } catch (error) { /* ... error handling ... */ }
    } else { /* ... new game ... */ }
    updateDisplay(); // This will check for credits trigger again if stardust is high
}


function resetGameConfirm(confirmPrompt = true) {
    const doReset = confirmPrompt ? confirm("Are you sure you want to reset all progress? This cannot be undone.") : true;
    if (doReset) {
        // ... (all previous reset logic) ...
        gameState.creditsTriggered = false; // Reset credits state on full game reset

        // Ensure credits overlay is hidden and game UI is shown after a reset
        if (creditsOverlay) creditsOverlay.classList.add('hidden');
        if (creditsScrollText) creditsScrollText.classList.remove('scrolling');
        if (gameUIWrapper) gameUIWrapper.classList.remove('hidden');
        if (teaserTextEl) teaserTextEl.classList.remove('hidden');

        // ... (rest of reset: showSaveStatus, updateDisplay, etc.) ...
    }
}

function showSaveStatus(message) { /* ... same ... */ }
function recalculateAllCosts() { /* ... same ... */ }

// --- Game Loop (No changes needed here for credits trigger, updateDisplay handles it) ---
// ...

// --- Initialization (Add event listener for credits restart) ---
function initializeGame() {
    // ... (previous initialization code, button listeners) ...
    if (!creditsRestartButton) {
        console.error("Credits restart button not found.");
        return;
    }
    creditsRestartButton.addEventListener('click', handleCreditsRestart);

    // ... (rest of init)
}

document.addEventListener('DOMContentLoaded', initializeGame);
