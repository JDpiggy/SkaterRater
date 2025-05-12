// Game State Variables - Add creditsTriggered
let gameState = {
    stardust: 0,
    stardustPerClick: 1, // Base SPC from Quantum Tapper
    clickUpgrade: { level: 0, cost: 10, baseCost: 10, bonusPerLevel: 1, costMultiplier: 1.15 },
    synergyUpgrade: { level: 0, cost: 150, baseCost: 150, bonusPerLevel: 0.1, costMultiplier: 1.25, currentBonus: 0 },
    critUpgrade: { level: 0, cost: 500, baseCost: 500, chancePerLevel: 0.5, multiplier: 2, costMultiplier: 1.3, currentChance: 0 },
    generators: [
        { id: 'gen1', name: 'Nebula Drone', level: 0, sps: 1, baseSps: 1, cost: 50, baseCost: 50, costMultiplier: 1.18, visualClass: 'visual-gen1' },
        { id: 'gen2', name: 'Crystal Harvester', level: 0, sps: 5, baseSps: 5, cost: 250, baseCost: 250, costMultiplier: 1.20, visualClass: 'visual-gen2' }
    ],
    lastSaveTime: Date.now(),
    creditsTriggered: false
};

// DOM Elements Cache
const stardustCountEl = document.getElementById('stardust-count');
const spsCountEl = document.getElementById('sps-count');
const spcCountEl = document.getElementById('spc-count');
const clickTarget = document.getElementById('click-target');
const clickFeedbackContainer = document.getElementById('click-feedback-container');
const stardustParticleFlowContainer = document.getElementById('stardust-particle-flow-container');
const generatorFleetDisplay = document.getElementById('generator-fleet-display');
const backgroundAnimationContainer = document.getElementById('background-animation-container');

const clickUpgradeLevelEl = document.getElementById('click-upgrade-level');
const clickUpgradeBonusDisplayEl = document.getElementById('click-upgrade-bonus-display');
const buyClickUpgradeBtn = document.getElementById('buy-click-upgrade');

const synergyUpgradeLevelEl = document.getElementById('synergy-upgrade-level');
const synergyBonusDisplayEl = document.getElementById('synergy-bonus-display');
const buySynergyUpgradeBtn = document.getElementById('buy-synergy-upgrade');

const critChanceDisplayEl = document.getElementById('crit-chance-display');
const critMultiplierDisplayEl = document.getElementById('crit-multiplier-display');
const buyCritUpgradeBtn = document.getElementById('buy-crit-upgrade');

const generatorElements = {};
gameState.generators.forEach(gen => {
    generatorElements[gen.id] = {
        levelEl: document.getElementById(`${gen.id}-level`),
        spsEl: document.getElementById(`${gen.id}-sps`),
        buyBtn: document.getElementById(`buy-${gen.id}`)
    };
    if (generatorElements[gen.id].spsEl) {
       generatorElements[gen.id].spsEl.textContent = formatNumber(gen.sps);
    }
});

const saveButton = document.getElementById('save-button');
const loadButton = document.getElementById('load-button');
const resetButton = document.getElementById('reset-button'); // Main game reset
const saveStatusEl = document.getElementById('save-status');
const teaserTextEl = document.getElementById('teaser-text');

const gameUIWrapper = document.querySelector('.game-ui-wrapper');
const creditsOverlay = document.getElementById('credits-overlay');
const creditsScrollText = document.querySelector('.credits-scroll');
const creditsRestartButton = document.getElementById('credits-restart-button'); // Credits screen reset

const STARDUST_FOR_CREDITS = 100_000_000; // 100 Million

const BLOB_COLORS = [
    "radial-gradient(circle, #c89aff 0%, #9370db 60%, #6a0dad 100%)",
    "radial-gradient(circle, #89f7fe 0%, #33c5d0 60%, #008c9e 100%)",
    "radial-gradient(circle, #f789fe 0%, #d033c5 60%, #9e008c 100%)",
    "radial-gradient(circle, #f7c889 0%, #d0a333 60%, #9e7c00 100%)",
    "radial-gradient(circle, #89fea2 0%, #33d06e 60%, #009e3a 100%)",
    "radial-gradient(circle, #ff9a8b 0%, #ff6a88 50%, #ff3a88 100%)",
    "radial-gradient(circle, #a0c4ff 0%, #6b9eff 50%, #3a7dff 100%)",
];

const MAX_BG_STARS = 50;
const STARDUST_PARTICLE_ANIMATION_DURATION = 1700;
const MAX_VISUAL_GENERATORS_PER_TYPE_DISPLAYED = 30;
let stardustBufferForAnimation = 0;
const PARTICLE_EMISSION_THRESHOLD = 0.5;
let particleEmissionRateLimiter = 0;


// --- Core Game Logic ---

function manualClick(event) {
    let clickValue = gameState.stardustPerClick; // Base from Quantum Tapper

    const currentSPS = calculateSPS();
    const synergyBonus = currentSPS * (gameState.synergyUpgrade.currentBonus / 100);
    clickValue += synergyBonus;

    let isCrit = false;
    if (Math.random() * 100 < gameState.critUpgrade.currentChance) {
        clickValue *= gameState.critUpgrade.multiplier;
        isCrit = true;
    }

    // Ensure clickValue is a positive number before proceeding
    clickValue = Math.max(0, clickValue);

    // --- Stardust Gain Logic ---
    if (clickValue > 0) { // Only add stardust if the calculated value is positive
        gameState.stardust += clickValue;
    }

    // --- Visual Feedback - ENSURE THESE ARE CALLED ---
    if (clickValue > 0 || gameState.stardustPerClick > 0) { // Show feedback even for base click if value is 0 due to modifiers
        createStardustParticlesOnClickVisualsOnly(clickValue > 0 ? clickValue : gameState.stardustPerClick, event);
        showClickSparks(event);
        let feedbackText = `+${formatNumber(clickValue > 0 ? clickValue : gameState.stardustPerClick)}`;
        if (isCrit && clickValue > 0) feedbackText = `CRIT! ${feedbackText}`;
        showClickTextFeedback(feedbackText, event);
    }
    // updateDisplay(); // Game loop handles periodic updates
}


function buyClickUpgrade() {
    const upgrade = gameState.clickUpgrade;
    if (gameState.stardust >= upgrade.cost) {
        gameState.stardust -= upgrade.cost;
        upgrade.level++;
        gameState.stardustPerClick = 1 + upgrade.level * upgrade.bonusPerLevel;
        upgrade.cost = Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
        updateBlobColor();
    }
}

function buySynergyUpgrade() {
    const upgrade = gameState.synergyUpgrade;
    if (gameState.stardust >= upgrade.cost) {
        gameState.stardust -= upgrade.cost;
        upgrade.level++;
        upgrade.currentBonus = upgrade.level * upgrade.bonusPerLevel;
        upgrade.cost = Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
    }
}

function buyCritUpgrade() {
    const upgrade = gameState.critUpgrade;
    if (gameState.stardust >= upgrade.cost) {
        gameState.stardust -= upgrade.cost;
        upgrade.level++;
        upgrade.currentChance = Math.min(upgrade.level * upgrade.chancePerLevel, 90);
        upgrade.cost = Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
    }
}

function buyGenerator(generatorId) {
    const gen = gameState.generators.find(g => g.id === generatorId);
    if (gen && gameState.stardust >= gen.cost) {
        gameState.stardust -= gen.cost;
        gen.level++;
        gen.cost = Math.ceil(gen.baseCost * Math.pow(gen.costMultiplier, gen.level));
        updateGeneratorFleetVisuals(gen);
    }
}

function calculateSPS() {
    return gameState.generators.reduce((total, gen) => total + (gen.level * gen.sps), 0);
}

function updateBlobColor() {
    const level = gameState.clickUpgrade.level;
    const colorIndex = level % BLOB_COLORS.length;
    if (clickTarget) {
        clickTarget.style.background = BLOB_COLORS[colorIndex];
    }
}

// --- Display Updates ---
function updateDisplay() {
    stardustCountEl.textContent = formatNumber(Math.floor(gameState.stardust));

    let displaySPC = gameState.stardustPerClick;
    const currentSPS = calculateSPS();
    displaySPC += currentSPS * (gameState.synergyUpgrade.currentBonus / 100);
    spcCountEl.textContent = formatNumber(displaySPC);
    spsCountEl.textContent = formatNumber(currentSPS);

    const qtUpgrade = gameState.clickUpgrade;
    clickUpgradeLevelEl.textContent = formatNumber(qtUpgrade.level);
    clickUpgradeBonusDisplayEl.textContent = formatNumber(qtUpgrade.bonusPerLevel);
    buyClickUpgradeBtn.textContent = `Buy (Cost: ${formatNumber(qtUpgrade.cost)})`;
    buyClickUpgradeBtn.disabled = gameState.stardust < qtUpgrade.cost;

    const synUpgrade = gameState.synergyUpgrade;
    synergyUpgradeLevelEl.textContent = formatNumber(synUpgrade.level);
    synergyBonusDisplayEl.textContent = synUpgrade.currentBonus.toFixed(1);
    buySynergyUpgradeBtn.textContent = `Buy (Cost: ${formatNumber(synUpgrade.cost)})`;
    buySynergyUpgradeBtn.disabled = gameState.stardust < synUpgrade.cost;

    const crUpgrade = gameState.critUpgrade;
    critChanceDisplayEl.textContent = crUpgrade.currentChance.toFixed(1);
    critMultiplierDisplayEl.textContent = formatNumber(crUpgrade.multiplier);
    buyCritUpgradeBtn.textContent = `Buy (Cost: ${formatNumber(crUpgrade.cost)})`;
    buyCritUpgradeBtn.disabled = gameState.stardust < crUpgrade.cost;

    gameState.generators.forEach(gen => {
        const elements = generatorElements[gen.id];
        if (elements) {
            elements.levelEl.textContent = formatNumber(gen.level);
            elements.buyBtn.textContent = `Buy (Cost: ${formatNumber(gen.cost)})`;
            elements.buyBtn.disabled = gameState.stardust < gen.cost;
            if(elements.spsEl) elements.spsEl.textContent = formatNumber(gen.sps);
        }
    });

    if (gameState.stardust >= STARDUST_FOR_CREDITS && !gameState.creditsTriggered) {
        triggerCreditsScene();
    }
}

function formatNumber(num) {
    num = Math.floor(num);
    if (num < 1000) return num.toString();
    const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    const i = Math.floor(Math.log10(Math.abs(num)) / 3);
    if (i >= suffixes.length) return num.toExponential(2);
    const shortNum = (num / Math.pow(1000, i));
    let decimals = 0;
    if (i > 0) {
        if (shortNum < 10) decimals = 2;
        else if (shortNum < 100) decimals = 1;
    }
    return shortNum.toFixed(decimals) + suffixes[i];
}

// --- Visual & Animation Functions ---
// These functions should remain as they were when clicks were working perfectly.
// Ensure they are being called from manualClick.

function createBackgroundStars() {
    if (!backgroundAnimationContainer) return;
    for (let i = 0; i < MAX_BG_STARS; i++) {
        const star = document.createElement('div');
        star.className = 'bg-star';
        const size = Math.random() * 2.5 + 0.5;
        star.style.width = `${size}px`; star.style.height = `${size}px`;
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
        spark.style.left = `${clickX}px`; spark.style.top = `${clickY}px`;
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

function createStardustParticle(startX, startY) {
    if (!stardustParticleFlowContainer || !stardustCountEl) return;
    const particle = document.createElement('div');
    particle.className = 'stardust-particle';
    particle.style.left = `${startX}px`; particle.style.top = `${startY}px`;
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
    }).onfinish = () => particle.remove();
}

function createStardustParticlesOnClickVisualsOnly(amount, event) {
    if (!clickTarget || !stardustParticleFlowContainer) return;
    const clickRect = clickTarget.getBoundingClientRect();
    const flowContainerRect = stardustParticleFlowContainer.getBoundingClientRect();
    const originX = (clickRect.left + clickRect.width / 2) - flowContainerRect.left;
    const originY = (clickRect.top + clickRect.height / 2) - flowContainerRect.top;
    let numVisualParticles = 0;
    if (amount >= 1) numVisualParticles = Math.min(Math.floor(amount), 10);
    else if (amount > 0) numVisualParticles = 1;
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


// --- Credits Scene Logic ---
function triggerCreditsScene() {
    gameState.creditsTriggered = true;
    saveGame(); // Save progress just before credits roll

    if (gameUIWrapper) gameUIWrapper.classList.add('hidden');
    if (creditsOverlay) creditsOverlay.classList.remove('hidden');
    if (creditsScrollText) creditsScrollText.classList.add('scrolling');
    if (teaserTextEl) teaserTextEl.classList.add('hidden');
}

function handleCreditsRestart() {
    if (creditsOverlay) creditsOverlay.classList.add('hidden');
    if (creditsScrollText) creditsScrollText.classList.remove('scrolling');
    if (gameUIWrapper) gameUIWrapper.classList.remove('hidden');
    if (teaserTextEl) teaserTextEl.classList.remove('hidden');

    // This will reset game state AND UI to initial values
    resetGameConfirm(false); // Reset game without confirmation prompt
    // gameState.creditsTriggered is reset within resetGameConfirm
}


// --- Saving and Loading ---
function saveGame() {
    gameState.lastSaveTime = Date.now();
    try {
        const saveData = {
            stardust: gameState.stardust,
            stardustPerClick: gameState.stardustPerClick,
            clickUpgrade: { level: gameState.clickUpgrade.level, cost: gameState.clickUpgrade.cost },
            synergyUpgrade: { level: gameState.synergyUpgrade.level, cost: gameState.synergyUpgrade.cost, currentBonus: gameState.synergyUpgrade.currentBonus },
            critUpgrade: { level: gameState.critUpgrade.level, cost: gameState.critUpgrade.cost, currentChance: gameState.critUpgrade.currentChance },
            generators: gameState.generators.map(g => ({ id: g.id, level: g.level, cost: g.cost })),
            lastSaveTime: gameState.lastSaveTime,
            creditsTriggered: gameState.creditsTriggered
        };
        localStorage.setItem('cosmicClickerDeluxeSave', JSON.stringify(saveData));
        if (!gameState.creditsTriggered && saveStatusEl) {
            showSaveStatus('Game Saved!');
        }
    } catch (error) { console.error("Error saving game:", error); if (saveStatusEl) showSaveStatus('Error saving game.'); }
}

function loadGame() {
    const savedGame = localStorage.getItem('cosmicClickerDeluxeSave');
    if (savedGame) {
        try {
            const loadedData = JSON.parse(savedGame);
            gameState.stardust = loadedData.stardust || 0;
            gameState.stardustPerClick = loadedData.stardustPerClick || 1;
            gameState.lastSaveTime = loadedData.lastSaveTime || Date.now();
            gameState.creditsTriggered = loadedData.creditsTriggered || false;

            if (loadedData.clickUpgrade) {
                gameState.clickUpgrade.level = loadedData.clickUpgrade.level || 0;
                // gameState.clickUpgrade.cost = loadedData.clickUpgrade.cost || gameState.clickUpgrade.baseCost; // Cost will be recalculated
            }
            gameState.stardustPerClick = 1 + gameState.clickUpgrade.level * gameState.clickUpgrade.bonusPerLevel;

            if (loadedData.synergyUpgrade) {
                gameState.synergyUpgrade.level = loadedData.synergyUpgrade.level || 0;
                // gameState.synergyUpgrade.cost = loadedData.synergyUpgrade.cost || gameState.synergyUpgrade.baseCost;
                gameState.synergyUpgrade.currentBonus = loadedData.synergyUpgrade.currentBonus || 0;
            } else {
                gameState.synergyUpgrade.currentBonus = gameState.synergyUpgrade.level * gameState.synergyUpgrade.bonusPerLevel;
            }

            if (loadedData.critUpgrade) {
                gameState.critUpgrade.level = loadedData.critUpgrade.level || 0;
                // gameState.critUpgrade.cost = loadedData.critUpgrade.cost || gameState.critUpgrade.baseCost;
                gameState.critUpgrade.currentChance = loadedData.critUpgrade.currentChance || 0;
            } else {
                 gameState.critUpgrade.currentChance = Math.min(gameState.critUpgrade.level * gameState.critUpgrade.chancePerLevel, 90);
            }

            if (loadedData.generators && Array.isArray(loadedData.generators)) {
                loadedData.generators.forEach(savedGenData => {
                    const gameGen = gameState.generators.find(g => g.id === savedGenData.id);
                    if (gameGen) {
                        gameGen.level = savedGenData.level || 0;
                        // gameGen.cost = savedGenData.cost || gameGen.baseCost; // Cost will be recalculated
                    }
                });
            }
            recalculateAllCosts(); // Crucial to set correct costs after loading levels

            const timeSinceLastSave = Date.now() - gameState.lastSaveTime;
            const offlineSPS = calculateSPS();
            const offlineStardustGained = offlineSPS * (timeSinceLastSave / 1000);

            if (offlineStardustGained > 0) {
                gameState.stardust += offlineStardustGained;
                showSaveStatus(`Welcome back! +${formatNumber(offlineStardustGained)} Stardust while away.`);
            } else { showSaveStatus('Game Loaded!'); }

            gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));
            updateBlobColor();

            if (gameState.creditsTriggered) {
                if (gameUIWrapper) gameUIWrapper.classList.add('hidden');
                if (creditsOverlay) creditsOverlay.classList.remove('hidden');
                if (creditsScrollText) creditsScrollText.classList.add('scrolling');
                if (teaserTextEl) teaserTextEl.classList.add('hidden');
            } else {
                if (gameUIWrapper) gameUIWrapper.classList.remove('hidden');
                if (creditsOverlay) creditsOverlay.classList.add('hidden');
                if (teaserTextEl) teaserTextEl.classList.remove('hidden');
            }

        } catch (error) {
            console.error("Error loading game:", error);
            showSaveStatus('Error loading. Corrupted save? Starting fresh.');
            resetGameConfirm(false); // Reset if save is corrupt
        }
    } else {
        showSaveStatus('No save found. New game started.');
        recalculateAllCosts();
        gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));
        updateBlobColor();
    }
    updateDisplay();
}

function recalculateAllCosts() {
    gameState.clickUpgrade.cost = Math.ceil(gameState.clickUpgrade.baseCost * Math.pow(gameState.clickUpgrade.costMultiplier, gameState.clickUpgrade.level));
    gameState.synergyUpgrade.cost = Math.ceil(gameState.synergyUpgrade.baseCost * Math.pow(gameState.synergyUpgrade.costMultiplier, gameState.synergyUpgrade.level));
    gameState.critUpgrade.cost = Math.ceil(gameState.critUpgrade.baseCost * Math.pow(gameState.critUpgrade.costMultiplier, gameState.critUpgrade.level));
    gameState.generators.forEach(gen => {
        gen.cost = Math.ceil(gen.baseCost * Math.pow(gen.costMultiplier, gen.level));
    });
}

function resetGameConfirm(isFromButton = true) { // Changed parameter name for clarity
    const doReset = !isFromButton || confirm("Are you sure you want to reset all progress? This cannot be undone.");
    if (doReset) {
        localStorage.removeItem('cosmicClickerDeluxeSave');
        gameState.stardust = 0;
        gameState.stardustPerClick = 1;
        gameState.clickUpgrade = { level: 0, cost: 10, baseCost: 10, bonusPerLevel: 1, costMultiplier: 1.15 };
        gameState.synergyUpgrade = { level: 0, cost: 150, baseCost: 150, bonusPerLevel: 0.1, costMultiplier: 1.25, currentBonus: 0 };
        gameState.critUpgrade = { level: 0, cost: 500, baseCost: 500, chancePerLevel: 0.5, multiplier: 2, costMultiplier: 1.3, currentChance: 0 };
        const initialGenerators = [
            { id: 'gen1', name: 'Nebula Drone', level: 0, sps: 1, baseSps: 1, cost: 50, baseCost: 50, costMultiplier: 1.18, visualClass: 'visual-gen1' },
            { id: 'gen2', name: 'Crystal Harvester', level: 0, sps: 5, baseSps: 5, cost: 250, baseCost: 250, costMultiplier: 1.20, visualClass: 'visual-gen2' }
        ];
        gameState.generators = initialGenerators.map(g => ({ ...g }));
        gameState.lastSaveTime = Date.now();
        stardustBufferForAnimation = 0;
        gameState.creditsTriggered = false; // CRITICAL: Reset credits state

        recalculateAllCosts();
        gameState.generators.forEach(gen => updateGeneratorFleetVisuals(gen));
        updateBlobColor();

        // Ensure UI is reset to game mode
        if (creditsOverlay) creditsOverlay.classList.add('hidden');
        if (creditsScrollText) creditsScrollText.classList.remove('scrolling');
        if (gameUIWrapper) gameUIWrapper.classList.remove('hidden');
        if (teaserTextEl) teaserTextEl.classList.remove('hidden');

        showSaveStatus('Game Reset!');
        updateDisplay(); // Update display with reset values
    }
}

function showSaveStatus(message) {
    if (!saveStatusEl) return;
    saveStatusEl.textContent = message;
    setTimeout(() => { saveStatusEl.textContent = ''; }, 4000);
}

// --- Game Loop ---
let lastUpdateTime = 0;
const MAIN_UPDATE_INTERVAL = 100;
let timeSinceLastMainUpdate = 0;

function gameLoop(currentTime) {
    if (!lastUpdateTime) lastUpdateTime = currentTime;
    const deltaTime = (currentTime - lastUpdateTime) / 1000;
    lastUpdateTime = currentTime;

    if (!gameState.creditsTriggered) { // Only run game logic if credits are not active
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
    }
    requestAnimationFrame(gameLoop);
}

// --- Initialization ---
function initializeGame() {
    // Defensive checks
    const criticalElements = [clickTarget, buyClickUpgradeBtn, buySynergyUpgradeBtn, buyCritUpgradeBtn, saveButton, loadButton, resetButton, creditsRestartButton, gameUIWrapper, creditsOverlay, creditsScrollText, teaserTextEl];
    for (const el of criticalElements) {
        if (!el) {
            console.error("Critical UI element not found during initialization. Game cannot start.", el === clickTarget ? "clickTarget" : "other");
            // Provide user feedback on the page
            const errorDiv = document.createElement('div');
            errorDiv.textContent = "Error: A critical game element is missing. Please refresh or check the console for details.";
            errorDiv.style.color = "red"; errorDiv.style.textAlign = "center"; errorDiv.style.padding = "30px"; errorDiv.style.fontSize = "1.5em";
            document.body.innerHTML = ''; // Clear body to show only error
            document.body.appendChild(errorDiv);
            return;
        }
    }

    createBackgroundStars();

    clickTarget.addEventListener('click', manualClick);
    buyClickUpgradeBtn.addEventListener('click', buyClickUpgrade);
    buySynergyUpgradeBtn.addEventListener('click', buySynergyUpgrade);
    buyCritUpgradeBtn.addEventListener('click', buyCritUpgrade);
    gameState.generators.forEach(gen => {
        const btn = generatorElements[gen.id]?.buyBtn;
        if (btn) btn.addEventListener('click', () => buyGenerator(gen.id));
    });
    saveButton.addEventListener('click', saveGame);
    loadButton.addEventListener('click', loadGame);
    resetButton.addEventListener('click', () => resetGameConfirm(true)); // Main reset button
    creditsRestartButton.addEventListener('click', handleCreditsRestart); // Credits screen reset

    loadGame(); // This handles initial display and potential credits state

    console.log("Cosmic Clicker Deluxe - Click Fix Initialized!");
    lastUpdateTime = performance.now();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initializeGame);
