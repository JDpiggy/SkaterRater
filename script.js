// --- DOM Elements ---
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const startGameButton = document.getElementById('start-game-button');
const opponentCountSlider = document.getElementById('opponent-count-slider');
const opponentCountDisplay = document.getElementById('opponent-count-display');
const menuBankrollDisplay = document.getElementById('menu-bankroll-display');

const communityCardsArea = document.getElementById('community-cards-area');
const potAmountEl = document.getElementById('pot-amount');
const messageLogEl = document.getElementById('message-log');
const actionsArea = document.getElementById('actions-area');
const betAmountInput = document.getElementById('bet-amount-input');
const betSliderInput = document.getElementById('bet-slider-input');
const allInButton = document.querySelector('.all-in-button');

const playerSeatsContainer = document.getElementById('player-seats-container');
const playerInfoDisplayArea = document.getElementById('player-info-display-area');

// --- Game Constants & State ---
const SUITS = ["♥", "♦", "♣", "♠"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const RANK_VALUES = { /* ... (as before) ... */ }; // Populated in init if not here

const DEFAULT_STARTING_BANKROLL = 1000;
let playerBankroll = DEFAULT_STARTING_BANKROLL;
const BUY_IN_AMOUNT = 500;
const SMALL_BLIND_AMOUNT = 10;
const BIG_BLIND_AMOUNT = 20;
const BANKROLL_STORAGE_KEY = 'neoPokerPrimeBankroll';

let deck = [];
let players = [];
let communityCards = [];
let pot = 0;
let currentBet = 0; // Highest bet amount on the current street
let dealerButtonPos = 0;
let currentPlayerIndex = 0;
let currentPhase = ''; // 'pre-flop', 'flop', 'turn', 'river', 'showdown'
let totalNumPlayers = 4;
let humanPlayerCurrentTableStack = 0; // Human's stack for the current hand/session at table

const BOT_PERSONALITIES = { /* ... (as defined before, e.g., TIGHT_AGGIE, etc.) ... */ };

// --- Initialization Function ---
function initializeGameData() {
    // Populate RANK_VALUES if not hardcoded
    if (Object.keys(RANK_VALUES).length === 0) {
        RANKS.forEach((rank, i) => {
            if (rank === "T") RANK_VALUES[rank] = 10;
            else if (rank === "J") RANK_VALUES[rank] = 11;
            else if (rank === "Q") RANK_VALUES[rank] = 12;
            else if (rank === "K") RANK_VALUES[rank] = 13;
            else if (rank === "A") RANK_VALUES[rank] = 14;
            else RANK_VALUES[rank] = parseInt(rank);
        });
    }
    loadBankroll();
    if (opponentCountSlider && opponentCountDisplay) {
        opponentCountDisplay.textContent = opponentCountSlider.value;
        opponentCountSlider.addEventListener('input', () => {
            opponentCountDisplay.textContent = opponentCountSlider.value;
        });
    }
    if (betAmountInput && betSliderInput) {
        betSliderInput.addEventListener('input', () => betAmountInput.value = betSliderInput.value);
        betAmountInput.addEventListener('input', () => betSliderInput.value = betAmountInput.value);
    }
     // Add event listeners for action buttons
    if (actionsArea) {
        actionsArea.addEventListener('click', (event) => {
            if (event.target.classList.contains('action-button')) {
                const actionType = event.target.dataset.action;
                let amount = 0;
                if (actionType === 'bet' || actionType === 'raise') {
                    amount = parseInt(betAmountInput.value);
                } else if (actionType === 'allin') {
                    amount = players[0].stack; // Human player's stack
                    // The actual action type might become 'bet' or 'raise' based on context
                }
                handlePlayerAction(players[0], actionType, amount);
            }
        });
    }
    if (startGameButton) startGameButton.addEventListener('click', startGame);
}


// --- Utility Functions ---
function createDeck() { /* ... (same) ... */ }
function shuffleDeck() { /* ... (same) ... */ }
function dealCard() { /* ... (same, with null check) ... */ }
function logMessage(message, type = "default") {
    if (!messageLogEl) return;
    const p = document.createElement('p');
    p.textContent = message;
    if (type) p.classList.add(`log-${type}`); // For CSS styling based on type
    messageLogEl.appendChild(p);
    messageLogEl.scrollTop = messageLogEl.scrollHeight;
    console.log(message);
}

function loadBankroll() { /* ... (same) ... */ }
function saveBankroll() { /* ... (same) ... */ }

// --- Player Setup ---
function initializePlayers() {
    players = [];
    const numOpponents = parseInt(opponentCountSlider.value) || 3;
    totalNumPlayers = 1 + numOpponents;

    humanPlayerCurrentTableStack = Math.min(BUY_IN_AMOUNT, playerBankroll);
    if (playerBankroll < BIG_BLIND_AMOUNT) {
        alert("Your bankroll is too low to play. Please reset data (if option available) or earn more.");
        menuScreen.classList.add('active');
        gameScreen.classList.remove('active');
        return false; // Setup failed
    }
    playerBankroll -= humanPlayerCurrentTableStack; // Deduct buy-in
    saveBankroll();

    players.push({
        id: 0, name: "YOU", stack: humanPlayerCurrentTableStack, cards: [], currentBetThisStreet: 0, totalBetInHand: 0,
        hasActedThisRound: false, folded: false, isAllIn: false, isHuman: true,
        seatDiv: null // Will hold reference to their seat div
    });

    const availablePersonalities = Object.values(BOT_PERSONALITIES);
    for (let i = 0; i < numOpponents; i++) {
        const personality = availablePersonalities[i % availablePersonalities.length];
        players.push({
            id: i + 1, name: personality.name, stack: BUY_IN_AMOUNT, cards: [], currentBetThisStreet: 0, totalBetInHand: 0,
            hasActedThisRound: false, folded: false, isAllIn: false, isHuman: false,
            personality: personality, seatDiv: null
        });
    }
    createPlayerSeatsUI();
    return true; // Setup success
}

function createPlayerSeatsUI() {
    if (!playerSeatsContainer) return;
    playerSeatsContainer.innerHTML = '';
    const tableEl = document.querySelector('.poker-table');
    if (!tableEl) return;

    const tableCenterX = tableEl.offsetWidth / 2;
    const tableCenterY = tableEl.offsetHeight / 2;
    const radiusX = tableEl.offsetWidth * 0.40; // Elliptical placement
    const radiusY = tableEl.offsetHeight * 0.38;

    players.forEach((player, index) => {
        const seatDiv = document.createElement('div');
        seatDiv.classList.add('player-seat');
        seatDiv.id = `seat-${player.id}`;
        player.seatDiv = seatDiv; // Store reference

        let angleDeg;
        if (player.isHuman) {
            angleDeg = 180; // Bottom
        } else {
            const botIndex = players.filter(p => !p.isHuman).indexOf(player);
            const numBots = totalNumPlayers - 1;
            // Improved bot distribution for 1 to 5 opponents
            const baseAngle = -90; // Start from top
            const totalAngleSpread = 180; // Spread bots over top half mostly
            if (numBots === 1) angleDeg = 0; // Directly opposite human
            else {
                 angleDeg = baseAngle + (botIndex * (totalAngleSpread / (numBots -1 || 1)));
                 if (numBots === 2) angleDeg = botIndex === 0 ? -60 : 60; // Wider for 2
                 if (numBots === 4) angleDeg = baseAngle + (botIndex * (200 / (numBots -1 || 1))) -10; // Adjust spread for 4
            }
        }

        const angleRad = angleDeg * (Math.PI / 180);
        const x = tableCenterX + radiusX * Math.cos(angleRad);
        const y = tableCenterY + radiusY * Math.sin(angleRad);

        seatDiv.style.left = `${x}px`;
        seatDiv.style.top = `${y}px`;
        // transform translate(-50%,-50%) should be in CSS for .player-seat

        seatDiv.innerHTML = `
            <div class="player-avatar ${player.isHuman ? 'player-human-avatar' : ''}" id="player-${player.id}-avatar">
                ${player.isHuman ? 'YOU' : player.name.substring(0,1)}
            </div>
            <div class="player-hole-cards" id="player-${player.id}-cards"></div>
        `;
        playerSeatsContainer.appendChild(seatDiv);
    });
}

// --- UI Update Functions ---
function updateAllUI() {
    if (!gameScreen.classList.contains('active')) return; // Don't update if game screen not active

    potAmountEl.textContent = pot;
    updateCommunityCardsUI();
    updatePlayerAvatarsAndCardsOnTable(); // For visual table avatars/cards
    updatePlayerInfoList();             // For the text list area
    updateActionButtons();
}

function updateCommunityCardsUI() { /* ... (same as before, creates card divs) ... */ }
function updatePlayerAvatarsAndCardsOnTable() { /* ... (same as before, updates avatars & cards by seats) ... */ }
function updatePlayerInfoList() { /* ... (same as before, creates <p> for each player) ... */ }

function formatCardDisplay(card) {
    if (!card) return "";
    let suitColorClass = (card.suit === "♥" || card.suit === "♦") ? "suit-red" : "suit-black";
    return `<span class="rank">${card.rank}</span><span class="suit ${suitColorClass}">${card.suit}</span>`;
}
function getPlayerStatusText(player) { /* ... (same: Folded, ALL-IN, Dealer) ... */ }

function updateActionButtons() {
    if (currentPlayerIndex !== 0 || !players[0] || players[0].folded || players[0].isAllIn || currentPhase === 'showdown') {
        actionsArea.style.visibility = 'hidden';
        return;
    }
    actionsArea.style.visibility = 'visible';
    const human = players[0];
    const callAmount = currentBet - human.currentBetThisStreet;

    document.querySelector('[data-action="call"]').textContent = callAmount > 0 ? `Call ${callAmount}` : "Call";
    document.querySelector('[data-action="call"]').disabled = !(callAmount > 0 && human.stack >= callAmount);
    document.querySelector('[data-action="check"]').disabled = callAmount > 0;

    betSliderInput.min = BIG_BLIND_AMOUNT; // Min legal bet/raise
    betSliderInput.max = human.stack; // Cannot bet more than stack
    betAmountInput.min = BIG_BLIND_AMOUNT;
    betAmountInput.max = human.stack;

    // If currentBet is 0, "Bet" is an option. If currentBet > 0, "Raise" is an option.
    const betButton = document.querySelector('[data-action="bet"]');
    const raiseButton = document.querySelector('[data-action="raise"]');

    if (currentBet === 0) { // No bets yet this street
        betButton.disabled = false;
        raiseButton.disabled = true;
        betSliderInput.min = BIG_BLIND_AMOUNT; // Min bet
        if (parseInt(betAmountInput.value) < BIG_BLIND_AMOUNT) betAmountInput.value = BIG_BLIND_AMOUNT;

    } else { // There is a bet to call or raise
        betButton.disabled = true;
        raiseButton.disabled = false;
        let minRaiseTo = currentBet + Math.max(BIG_BLIND_AMOUNT, currentBet - (players.find(p => p.id !== human.id && p.currentBetThisStreet < currentBet && p.currentBetThisStreet > 0)?.currentBetThisStreet || 0) );
        minRaiseTo = Math.max(minRaiseTo, currentBet + BIG_BLIND_AMOUNT); // Absolute min raise size
        betSliderInput.min = Math.min(minRaiseTo, human.stack); // Min raise to this amount
        if (parseInt(betAmountInput.value) < parseInt(betSliderInput.min)) betAmountInput.value = betSliderInput.min;
    }
    // Disable bet/raise if stack too small
    if (human.stack < parseInt(betSliderInput.min)) {
        betButton.disabled = true;
        raiseButton.disabled = true;
    }
    allInButton.disabled = human.stack <=0;
}


// --- Game Flow ---
function startGame() {
    menuScreen.classList.remove('active');
    gameScreen.classList.add('active');
    if (!initializePlayers()) return; // Stop if player setup failed (e.g. low bankroll)
    dealerButtonPos = Math.floor(Math.random() * totalNumPlayers);
    startNewHand();
}

function startNewHand() {
    logMessage("--- New Hand ---", "phase");
    createDeck();
    shuffleDeck();
    communityCards = [];
    pot = 0;
    currentBet = 0; // Highest bet on the current street

    players.forEach(p => {
        p.cards = [];
        p.currentBetThisStreet = 0; // Money put in this specific betting round
        p.totalBetInHand = 0; // Total money put in for the entire hand (for side pots later)
        p.folded = false;
        p.isAllIn = false;
        p.hasActedThisRound = false;
        // Stacks carry over, only human player's stack is tied to bankroll initially
    });

    // Rotate dealer (skip broke players)
    let attempts = 0;
    do {
        dealerButtonPos = (dealerButtonPos + 1) % totalNumPlayers;
        attempts++;
    } while (players[dealerButtonPos].stack === 0 && attempts < totalNumPlayers * 2);
    if (players[dealerButtonPos].stack === 0) { /* Handle game over if only one player has chips */ return; }


    // Post Blinds
    const sbIdx = getNextActivePlayerIndex(dealerButtonPos);
    postBlind(sbIdx, SMALL_BLIND_AMOUNT, "Small Blind");
    const bbIdx = getNextActivePlayerIndex(sbIdx);
    postBlind(bbIdx, BIG_BLIND_AMOUNT, "Big Blind");
    currentBet = BIG_BLIND_AMOUNT; // Initial highest bet

    // Deal Hole Cards
    for (let i = 0; i < 2; i++) {
        players.forEach(p => { if (p.stack > 0) p.cards.push(dealCard()); });
    }

    currentPlayerIndex = getNextActivePlayerIndex(bbIdx); // Action starts left of BB
    currentPhase = 'pre-flop';
    logMessage(`Phase: Pre-flop. Blinds posted. Cards dealt.`, "phase");
    updateAllUI();
    nextAction();
}

function getNextActivePlayerIndex(startIndex) {
    let currentIndex = startIndex;
    let attempts = 0;
    do {
        currentIndex = (currentIndex + 1) % totalNumPlayers;
        attempts++;
    } while (players[currentIndex].stack === 0 && attempts < totalNumPlayers * 2); // Skip broke players
    return currentIndex;
}

function postBlind(playerIndex, amount, type) { /* ... (same, use currentBetThisStreet and totalBetInHand) ... */
    const player = players[playerIndex];
    const blindAmt = Math.min(amount, player.stack);
    player.stack -= blindAmt;
    player.currentBetThisStreet = blindAmt;
    player.totalBetInHand = blindAmt;
    pot += blindAmt;
    logMessage(`${player.name} posts ${type} of ${blindAmt}`, "action");
    if (player.stack === 0) player.isAllIn = true;
}


function nextAction() {
    updateAllUI();
    const player = players[currentPlayerIndex];

    if (!player || player.folded || player.isAllIn || player.stack === 0) {
        moveToNextPlayer();
        return;
    }

    if (player.isHuman) {
        logMessage("Your turn. What's your action?", "turn");
        // Action buttons are updated in updateAllUI
    } else {
        actionsArea.style.visibility = 'hidden';
        logMessage(`${player.name}'s turn...`, "turn");
        setTimeout(() => {
            const action = getBotAction(player);
            handlePlayerAction(player, action.type, action.amount);
        }, 1000 + Math.random() * 1000);
    }
}

function moveToNextPlayer() {
    // Determine if the betting round is over
    if (isBettingRoundOver()) {
        endBettingRound();
    } else {
        let searchIndex = currentPlayerIndex;
        do {
            searchIndex = (searchIndex + 1) % totalNumPlayers;
        } while (players[searchIndex].folded || players[searchIndex].isAllIn || players[searchIndex].stack === 0);
        currentPlayerIndex = searchIndex;
        nextAction();
    }
}

function isBettingRoundOver() {
    const activePlayers = players.filter(p => !p.folded && !p.isAllIn && p.stack > 0);
    if (activePlayers.length <= 1 && currentPhase !== 'pre-flop') return true; // If only one active player left (not pre-flop where BB might get a walk)

    // All active players must have acted AND their currentBetThisStreet matches the highest currentBet OR they are all-in
    return activePlayers.every(p =>
        p.hasActedThisRound && (p.currentBetThisStreet === currentBet || p.isAllIn)
    );
}

function endBettingRound() {
    logMessage(`Betting round ends. Pot: ${pot}`, "phase");
    players.forEach(p => {
        p.hasActedThisRound = false; // Reset for next street
        // p.currentBetThisStreet is NOT reset here, it's for the current street.
        // It will be reset if they bet on the NEXT street.
    });
    currentBet = 0; // Reset the "highest bet to match" for the new street

    // Determine next phase
    if (currentPhase === 'pre-flop') { currentPhase = 'flop'; dealFlop(); }
    else if (currentPhase === 'flop') { currentPhase = 'turn'; dealTurn(); }
    else if (currentPhase === 'turn') { currentPhase = 'river'; dealRiver(); }
    else if (currentPhase === 'river') { currentPhase = 'showdown'; showdown(); }

    if (currentPhase !== 'showdown') {
        const playersStillIn = players.filter(p => !p.folded && p.stack > 0);
        if (playersStillIn.length <= 1) { // Not enough players to continue betting
            showdown(); // Proceed to showdown even if early
        } else {
            currentPlayerIndex = getNextActivePlayerIndex(dealerButtonPos); // Action starts left of dealer
            nextAction();
        }
    }
    updateAllUI();
}

function dealFlop() { /* ... (deal 3 cards, log, update UI) ... */ }
function dealTurn() { /* ... (deal 1 card, log, update UI) ... */ }
function dealRiver() { /* ... (deal 1 card, log, update UI) ... */ }
// These deal functions should call startNextStreetBetting after dealing
function startNextStreetBetting() { /* ... (this logic is now mostly in endBettingRound) ... */ }


// --- Player Action Handling ---
function handlePlayerAction(player, actionType, amount = 0) {
    if (player.folded || player.isAllIn) return; // Should not happen if UI is correct

    player.hasActedThisRound = true;
    let actionText = `${player.name} `;
    let betMadeThisAction = 0; // How much money player physically puts in this specific action

    if (actionType === 'allin') {
        amount = player.stack + player.currentBetThisStreet; // Total amount they will have in after all-in
        if (amount > currentBet) actionType = 'raise'; // All-in is a raise
        else if (amount <= currentBet && amount > player.currentBetThisStreet) actionType = 'call'; // All-in is a call
        else actionType = 'bet'; // All-in is an opening bet (should be rare with this button)
    }


    switch (actionType) {
        case 'fold':
            player.folded = true;
            actionText += "folds.";
            const activeLeft = players.filter(p => !p.folded);
            if (activeLeft.length === 1) { awardPot(activeLeft); return; }
            break;
        case 'check':
            if (player.currentBetThisStreet < currentBet) { /* Invalid, should be caught by UI */ return; }
            actionText += "checks.";
            break;
        case 'call':
            const neededToCall = currentBet - player.currentBetThisStreet;
            betMadeThisAction = Math.min(neededToCall, player.stack);
            player.stack -= betMadeThisAction;
            player.currentBetThisStreet += betMadeThisAction;
            player.totalBetInHand += betMadeThisAction;
            pot += betMadeThisAction;
            actionText += `calls ${betMadeThisAction}.`;
            if (player.stack === 0) player.isAllIn = true;
            break;
        case 'bet': // Opening bet on a street
            betMadeThisAction = Math.min(amount, player.stack);
            if (betMadeThisAction < BIG_BLIND_AMOUNT && player.stack > betMadeThisAction) { /* Min bet rule */ return; }
            player.stack -= betMadeThisAction;
            player.currentBetThisStreet = betMadeThisAction; // New bet this street
            player.totalBetInHand += betMadeThisAction;
            pot += betMadeThisAction;
            currentBet = player.currentBetThisStreet; // This is the new amount to call
            actionText += `bets ${betMadeThisAction}.`;
            if (player.stack === 0) player.isAllIn = true;
            players.forEach(p => { if (p.id !== player.id && !p.folded && !p.isAllIn) p.hasActedThisRound = false; }); // Others must act again
            break;
        case 'raise':
            // Amount is the TOTAL amount they are raising TO for this street
            const raiseToAmountForStreet = amount;
            betMadeThisAction = Math.min(raiseToAmountForStreet - player.currentBetThisStreet, player.stack);

            if (raiseToAmountForStreet <= currentBet && player.stack > betMadeThisAction) { /* Invalid raise amount */ return; }
            // Min raise rule: must raise by at least the previous bet/raise amount (or BB if opening raise)
            const prevBetOrRaiseSize = currentBet - (players.find(p=>p.currentBetThisStreet < currentBet && p.currentBetThisStreet > 0 && p.hasActedThisRound)?.currentBetThisStreet || 0);
            const minRaiseDelta = Math.max(BIG_BLIND_AMOUNT, prevBetOrRaiseSize);
            if ((raiseToAmountForStreet - currentBet) < minRaiseDelta && player.stack > betMadeThisAction) { /* Invalid raise size */ return; }


            player.stack -= betMadeThisAction;
            player.currentBetThisStreet += betMadeThisAction; // total for this street is now 'raiseToAmountForStreet'
            player.totalBetInHand += betMadeThisAction;
            pot += betMadeThisAction;
            currentBet = player.currentBetThisStreet; // New highest bet
            actionText += `raises to ${player.currentBetThisStreet}.`;
            if (player.stack === 0) player.isAllIn = true;
            players.forEach(p => { if (p.id !== player.id && !p.folded && !p.isAllIn) p.hasActedThisRound = false; }); // Others must act
            break;
    }

    if (player.isAllIn) actionText += " (ALL-IN)";
    logMessage(actionText, player.isHuman ? "human-action" : "bot-action");

    if (betMadeThisAction > 0) {
        animateChipsToPot(player.id, betMadeThisAction);
    }
    moveToNextPlayer();
}


// --- Bot AI ---
function getBotAction(bot) { /* ... (Simplified placeholder, as before) ... */
    const callAmount = currentBet - bot.currentBetThisStreet;
    if (callAmount === 0) return { type: 'check' };
    if (callAmount > 0 && callAmount < bot.stack / 4 && Math.random() < (1 - bot.personality.preflopTightness + 0.2) ) {
        if (Math.random() < bot.personality.aggressionFactor && bot.stack > callAmount + BIG_BLIND_AMOUNT * 2) {
            return { type: 'raise', amount: currentBet + BIG_BLIND_AMOUNT * (1 + Math.floor(Math.random()*3))};
        }
        return { type: 'call' };
    }
    return { type: 'fold' };
}
function evaluatePreflopHandStrength(cards) { /* ... (as before) ... */ }


// --- Hand Evaluation & Showdown ---
function evaluateHand(holeCards, communityCardsInput) { /* ... (THE COMPLEX PART - NEEDS ROBUST IMPLEMENTATION) ... */
    // Placeholder: returns a random score based on highest card for now for testing flow
    const allCards = [...holeCards, ...communityCardsInput].filter(c => c); // Filter nulls if deck runs out
    if (allCards.length < 2) return { rankName: "No Hand", rankValue: 0, cards: [], kickers: [] }; // Need at least hole cards
    allCards.sort((a, b) => b.value - a.value);
    const kickers = allCards.slice(0, Math.min(5, allCards.length)).map(c => c.value);
    return { rankName: `High Card ${RANKS.find(r => RANK_VALUES[r] === kickers[0]) || ''}`, rankValue: 1, cards: allCards.slice(0,5), kickers: kickers };
}
function compareHands(hand1Details, hand2Details) { /* ... (as before) ... */ }
function showdown() { /* ... (as before, calls evaluateHand and compareHands) ... */ }

function awardPot(winnersInput) {
    let winnersArray = Array.isArray(winnersInput) ? winnersInput : [winnersInput].filter(w => w);
    if (winnersArray.length === 0 || pot <= 0) {
        logMessage("No eligible winners or empty pot. Pot carries over or error.", "error");
        setTimeout(startNewHand, 3000); return;
    }
    // Basic pot splitting (no side pots yet)
    const amountPerWinner = Math.floor(pot / winnersArray.length);
    winnersArray.forEach(winner => {
        winner.stack += amountPerWinner;
        logMessage(`${winner.name} wins ${amountPerWinner} with ${winner.evaluatedHand ? winner.evaluatedHand.rankName : 'the pot by default'}.`, "win");
    });
    const remainder = pot % winnersArray.length;
    if (remainder > 0 && winnersArray[0]) winnersArray[0].stack += remainder; // Give remainder to first winner

    pot = 0;
    updateAllUI();

    // Check if human player is out of money completely (bankroll + table stack)
    if (players[0].stack === 0) {
        playerBankroll += players[0].stack; // Add back any remaining table stack (should be 0 if they lost it all)
        saveBankroll();
        if (playerBankroll < BIG_BLIND_AMOUNT) {
            logMessage("--- GAME OVER --- You are out of funds!", "game-over");
            alert("GAME OVER! You've run out of bankroll. Thanks for playing Neo Poker Prime!");
            // Reset to menu, potentially disable start button until bankroll reset
            menuScreen.classList.add('active');
            gameScreen.classList.remove('active');
            loadBankroll(); // Refresh menu display
            return;
        } else {
            logMessage("You busted at the table. Re-buy possible from bankroll.", "info");
            // Prompt for rebuy or just end session and return to menu
            // For now, just end hand and next hand will try to buy in again
        }
    } else {
        // Human player still has chips at the table
    }

    // Check for overall game winner if only one player has chips across all players
    const playersWithAnyChips = players.filter(p => p.stack > 0 || (p.isHuman && playerBankroll > 0));
    if (playersWithAnyChips.length === 1 && playersWithAnyChips[0].isHuman && playerBankroll > 0) {
        // This condition means human is the only one left effectively, but bots might have had fixed buyins
        logMessage(`Congratulations ${playersWithAnyChips[0].name}! You are the last one standing!`, "game-over");
    }


    setTimeout(startNewHand, 4000);
}


// --- Chip Animation ---
function animateChipsToPot(playerId, amount) { /* ... (same as before) ... */ }


// --- Initial Call ---
document.addEventListener('DOMContentLoaded', initializeGameData);
