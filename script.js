// --- DOM Elements ---
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const startGameButton = document.getElementById('start-game-button');
// ... (cache all other relevant DOM elements: player areas, card slots, pot, buttons, message log)
const communityCardsArea = document.getElementById('community-cards-area');
const potAmountEl = document.getElementById('pot-amount');
const messageLogEl = document.getElementById('message-log');
const actionsArea = document.getElementById('actions-area');
const betAmountInput = document.getElementById('bet-amount-input');

// Player-specific elements (example for player 0)
// const player0StackEl = document.getElementById('player-0-stack');
// ... and so on for all players and their bet, status, cards elements

// --- Game Constants & State ---
const SUITS = ["♥", "♦", "♣", "♠"]; // Hearts, Diamonds, Clubs, Spades
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]; // T=Ten
const RANK_VALUES = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"T":10,"J":11,"Q":12,"K":13,"A":14 };

const NUM_BOT_PLAYERS = 3;
const STARTING_STACK = 1000;
const SMALL_BLIND_AMOUNT = 10;
const BIG_BLIND_AMOUNT = 20;

let deck = [];
let players = []; // Array of player objects
let communityCards = [];
let pot = 0;
let currentBet = 0; // Highest bet in the current round
let dealerButtonPos = 0;
let currentPlayerIndex = 0;
let currentPhase = ''; // 'pre-flop', 'flop', 'turn', 'river', 'showdown'
let activePlayersInHand = []; // Players who haven't folded

// --- Bot Personalities & Config ---
const BOT_PERSONALITIES = {
    TIGHT_AGGIE: {
        name: "ONYX", // Was BOT ACE, changed for theme
        preflopTightness: 0.8, // Plays only top 20% of hands
        aggressionFactor: 0.7, // More likely to bet/raise
        bluffFrequency: 0.1, // Rarely bluffs
        habit: "Rarely bluffs, bets big with strong hands."
    },
    LOOSE_CANNON: {
        name: "CYBER KATE",
        preflopTightness: 0.4, // Plays ~60% of hands
        aggressionFactor: 0.5,
        bluffFrequency: 0.4, // Bluffs more
        habit: "Overvalues draws, can be bluffed."
    },
    THE_ROCK: {
        name: "GLITCH",
        preflopTightness: 0.95, // Plays only ~5% of hands (super premium)
        aggressionFactor: 0.8,
        bluffFrequency: 0.01, // Almost never bluffs
        habit: "If they bet, they likely have a monster."
    },
    // Add more if needed
};


// --- Utility Functions ---
function createDeck() {
    deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit, value: RANK_VALUES[rank], display: `${rank}${suit}` });
        }
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function dealCard() {
    return deck.pop();
}

function logMessage(message) {
    const p = document.createElement('p');
    p.textContent = message;
    messageLogEl.appendChild(p);
    messageLogEl.scrollTop = messageLogEl.scrollHeight; // Auto-scroll
    console.log(message); // Also log to console for debugging
}

// --- Player Setup ---
function initializePlayers() {
    players = [];
    // Human Player
    players.push({
        id: 0, name: "YOU", stack: STARTING_STACK, cards: [], currentBet: 0,
        hasActedThisRound: false, folded: false, isAllIn: false, isHuman: true
    });

    // Bot Players
    const personalityKeys = Object.keys(BOT_PERSONALITIES);
    for (let i = 0; i < NUM_BOT_PLAYERS; i++) {
        const personality = BOT_PERSONALITIES[personalityKeys[i % personalityKeys.length]]; // Cycle through personalities
        players.push({
            id: i + 1, name: personality.name, stack: STARTING_STACK, cards: [], currentBet: 0,
            hasActedThisRound: false, folded: false, isAllIn: false, isHuman: false,
            personality: personality // Store personality object
        });
    }
}

// --- UI Update Functions ---
function updateAllUI() {
    // Update Pot
    potAmountEl.textContent = pot;

    // Update Community Cards
    communityCardsArea.innerHTML = ''; // Clear previous
    for(let i=0; i<5; i++) {
        const cardDiv = document.createElement('div');
        if (communityCards[i]) {
            cardDiv.classList.add('card');
            cardDiv.innerHTML = formatCardDisplay(communityCards[i]);
        } else {
            cardDiv.classList.add('card-placeholder');
        }
        communityCardsArea.appendChild(cardDiv);
    }


    // Update Each Player's UI
    players.forEach(player => {
        const playerArea = document.getElementById(`player-${player.id}-area`);
        document.getElementById(`player-${player.id}-stack`).textContent = player.stack;
        document.getElementById(`player-${player.id}-bet`).textContent = `Bet: ${player.currentBet}`;
        document.getElementById(`player-${player.id}-status`).textContent = getPlayerStatusText(player);

        const playerCardsDiv = document.getElementById(`player-${player.id}-cards`);
        playerCardsDiv.innerHTML = '';
        player.cards.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('card');
            if (player.isHuman || currentPhase === 'showdown' || (player.isAllIn && currentPhase !== 'pre-flop' && currentPhase !== 'flop' && currentPhase !== 'turn' && currentPhase !== 'river' && activePlayersInHand.length > 1 )) { // Show cards for human, or at showdown, or if player is all-in and others are still playing
                cardDiv.innerHTML = formatCardDisplay(card);
            } else {
                cardDiv.classList.add('facedown');
                // cardDiv.textContent = "??"; // Or use card back image
            }
            playerCardsDiv.appendChild(cardDiv);
        });

        if (player.id === currentPlayerIndex && !player.folded && !player.isAllIn) {
            playerArea.classList.add('active-player');
        } else {
            playerArea.classList.remove('active-player');
        }
    });

    updateActionButtons();
}

function getPlayerStatusText(player) {
    if (player.folded) return "Folded";
    if (player.isAllIn) return "ALL-IN";
    if (player.id === dealerButtonPos) return "Dealer";
    // Add Small/Big Blind status if needed
    return "";
}

function formatCardDisplay(card) {
    // Simple text display for now. Could be more elaborate with SVGs or images.
    let suitColorClass = (card.suit === "♥" || card.suit === "♦") ? "hearts" : "clubs"; // Assuming red/black or thematic
    return `<span class="rank">${card.rank}</span><span class="suit ${suitColorClass}">${card.suit}</span>`;
}

function updateActionButtons() {
    const humanPlayer = players[0];
    if (currentPlayerIndex !== 0 || humanPlayer.folded || humanPlayer.isAllIn || currentPhase === 'showdown') {
        actionsArea.style.display = 'none';
        return;
    }
    actionsArea.style.display = 'flex';

    const callAmount = currentBet - humanPlayer.currentBet;
    document.querySelector('[data-action="call"]').textContent = callAmount > 0 ? `Call ${callAmount}` : "Call";
    document.querySelector('[data-action="call"]').disabled = callAmount > humanPlayer.stack || (callAmount === 0 && currentBet > 0); // Cannot call if it's 0 unless a bet was made
    document.querySelector('[data-action="check"]').disabled = callAmount > 0; // Cannot check if there's a bet to call

    // Bet/Raise logic
    betAmountInput.min = BIG_BLIND_AMOUNT; // Minimum bet/raise
    betAmountInput.max = humanPlayer.stack;
    document.querySelector('[data-action="bet"]').disabled = currentBet > 0; // Cannot bet if a bet is already made (must raise)
    document.querySelector('[data-action="raise"]').disabled = currentBet === 0 && callAmount === 0; // Cannot raise if no prior bet (must bet)
                                                        // Also disable raise if calling the currentBet would mean going all-in
    if (callAmount >= humanPlayer.stack) {
        document.querySelector('[data-action="raise"]').disabled = true;
        document.querySelector('[data-action="bet"]').disabled = true;
    }

}

// --- Game Flow ---
function startGame() {
    menuScreen.classList.remove('active');
    gameScreen.classList.add('active');
    initializePlayers();
    dealerButtonPos = Math.floor(Math.random() * players.length);
    startNewHand();
}

function startNewHand() {
    logMessage("--- New Hand ---");
    createDeck();
    shuffleDeck();
    communityCards = [];
    pot = 0;
    currentBet = 0;
    activePlayersInHand = [];

    players.forEach(p => {
        p.cards = [];
        p.currentBet = 0;
        p.folded = false;
        p.hasActedThisRound = false;
        p.isAllIn = false;
        if (p.stack > 0) activePlayersInHand.push(p.id);
    });

    // Rotate dealer button
    dealerButtonPos = (dealerButtonPos + 1) % players.length;
    // Skip players with 0 stack for dealer
    while(players[dealerButtonPos].stack === 0) {
        dealerButtonPos = (dealerButtonPos + 1) % players.length;
    }


    // Post Blinds (Handle players with insufficient stack for blinds)
    let sbPlayerIndex = (dealerButtonPos + 1) % players.length;
    while(players[sbPlayerIndex].stack === 0) sbPlayerIndex = (sbPlayerIndex + 1) % players.length;
    let bbPlayerIndex = (sbPlayerIndex + 1) % players.length;
    while(players[bbPlayerIndex].stack === 0) bbPlayerIndex = (bbPlayerIndex + 1) % players.length;

    postBlind(sbPlayerIndex, SMALL_BLIND_AMOUNT, "Small Blind");
    postBlind(bbPlayerIndex, BIG_BLIND_AMOUNT, "Big Blind");
    currentBet = BIG_BLIND_AMOUNT; // Initial current bet is the big blind

    // Deal Hole Cards
    for (let i = 0; i < 2; i++) {
        for (const player of players) {
            if (!player.folded && player.stack > 0) {
                player.cards.push(dealCard());
            }
        }
    }

    // Determine starting player for pre-flop (player after big blind)
    currentPlayerIndex = (bbPlayerIndex + 1) % players.length;
    while(players[currentPlayerIndex].folded || players[currentPlayerIndex].stack === 0) {
         currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    }

    currentPhase = 'pre-flop';
    logMessage("Phase: Pre-flop. Blinds posted. Hole cards dealt.");
    updateAllUI();
    nextAction();
}

function postBlind(playerIndex, amount, type) {
    const player = players[playerIndex];
    const blindAmount = Math.min(amount, player.stack); // Cannot bet more than stack
    player.stack -= blindAmount;
    player.currentBet += blindAmount;
    pot += blindAmount;
    logMessage(`${player.name} posts ${type} of ${blindAmount}`);
    if (player.stack === 0) {
        player.isAllIn = true;
        logMessage(`${player.name} is ALL-IN with the blind.`);
    }
}


function nextAction() {
    updateAllUI();
    const player = players[currentPlayerIndex];

    if (player.folded || player.isAllIn || player.stack === 0) {
        moveToNextPlayer();
        return;
    }

    if (player.isHuman) {
        // Enable action buttons, wait for human input
        logMessage("Your turn. What's your action?");
        updateActionButtons(); // Ensure buttons are correctly enabled/disabled
    } else {
        // Bot's turn
        actionsArea.style.display = 'none'; // Hide buttons during bot turn
        logMessage(`${player.name}'s turn...`);
        setTimeout(() => { // Simulate bot thinking time
            const action = getBotAction(player);
            handlePlayerAction(player, action.type, action.amount);
        }, 1000 + Math.random() * 1500);
    }
}

function moveToNextPlayer() {
    let nextPlayerFound = false;
    let initialIndex = currentPlayerIndex;
    do {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        const nextPlayer = players[currentPlayerIndex];
        if (!nextPlayer.folded && nextPlayer.stack > 0 && !nextPlayer.isAllIn) { // Can act
            nextPlayerFound = true;
            break;
        }
    } while (currentPlayerIndex !== initialIndex); // Prevent infinite loop if all others folded/all-in


    // Check if betting round is over
    if (isBettingRoundOver()) {
        endBettingRound();
    } else {
        // If player hasn't acted or needs to call a raise
        if(players[currentPlayerIndex].hasActedThisRound && players[currentPlayerIndex].currentBet < currentBet && !players[currentPlayerIndex].isAllIn) {
            // Player has acted but needs to respond to a raise. They are still the current player.
        } else {
            // Normal move to next player
        }
        players[currentPlayerIndex].hasActedThisRound = false; // Reset for new round of actions if a raise occurred.
                                                            // Or, better, set it only after they complete an action.
        nextAction();
    }
}

function isBettingRoundOver() {
    const activePlayersStillToAct = players.filter(p => !p.folded && p.stack > 0 && !p.isAllIn && (!p.hasActedThisRound || p.currentBet < currentBet));
    const playersWithMoneyAbleToBet = players.filter(p => !p.folded && p.stack > 0 && !p.isAllIn);


    if (playersWithMoneyAbleToBet.length <= 1 && currentPhase !== 'pre-flop') { // Handle walk for big blind later
        return true; // Everyone else folded or is all-in
    }

    // All active players (not folded, not all-in, has stack) must have:
    // 1. Put in the same amount as currentBet OR
    // 2. Are all-in with less than currentBet OR
    // 3. Have had a chance to act and chose to check (if currentBet is 0 or their currentBet matches currentBet)
    let roundOver = true;
    for (const player of players) {
        if (!player.folded && player.stack > 0 && !player.isAllIn) { // Consider only active players
            if (player.currentBet < currentBet && player.stack > 0) { // Someone still needs to call/raise/fold
                if (!player.hasActedThisRound) { // If they haven't acted since the last bet/raise
                     roundOver = false; break;
                }
                if (player.hasActedThisRound && player.currentBet < currentBet) { // They acted, but a raise happened after them
                    roundOver = false; break;
                }
            }
            // If a player checked and currentBet is 0, they are good.
            // If a player called currentBet, they are good.
        }
    }
    // A simpler check: if all non-folded, non-all-in players have acted and their currentBet matches the highest currentBet
    const relevantPlayers = players.filter(p => !p.folded && !p.isAllIn && p.stack > 0);
    if (relevantPlayers.length === 0) return true; // Should not happen if game logic is correct before this

    const allMatchedOrActed = relevantPlayers.every(p => p.currentBet === currentBet || p.hasActedThisRound);

    if(allMatchedOrActed) {
         const firstActorIndex = (currentPhase === 'pre-flop') ? (dealerButtonPos + 3) % players.length : (dealerButtonPos + 1) % players.length; //TODO: Adjust for BB/SB
         // Check if action is back to the player who made the last bet/raise, or if everyone has checked around
         if(relevantPlayers.every(p => p.hasActedThisRound && p.currentBet === currentBet) ||
            (currentBet === 0 && relevantPlayers.every(p => p.hasActedThisRound)) ) {
            return true;
         }
    }


    return false; // Placeholder - more robust check needed
}


function endBettingRound() {
    logMessage(`Betting round ends. Pot: ${pot}`);
    // Collect bets into pot (already partially done, this is more about finalizing currentBet for players)
    players.forEach(p => p.hasActedThisRound = false); // Reset for next round
    // currentBet = 0; // Reset for the next street (or is it?) - this depends on game rules. Usually, yes.

    // Determine next phase
    if (currentPhase === 'pre-flop') {
        currentPhase = 'flop';
        dealFlop();
    } else if (currentPhase === 'flop') {
        currentPhase = 'turn';
        dealTurn();
    } else if (currentPhase === 'turn') {
        currentPhase = 'river';
        dealRiver();
    } else if (currentPhase === 'river') {
        currentPhase = 'showdown';
        showdown();
    }

    if (currentPhase !== 'showdown') {
        // Start next betting round
        // currentPlayerIndex = (dealerButtonPos + 1) % players.length; // Player left of dealer starts
        // while(players[currentPlayerIndex].folded || players[currentPlayerIndex].stack === 0) {
        //      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        // }
        // currentBet = 0; // Bets are fresh for the new street
        // players.forEach(p => p.hasActedThisRound = false); // Reset for new round
        // nextAction();
    }
    updateAllUI();
}

function dealFlop() {
    deck.pop(); // Burn card
    communityCards.push(dealCard());
    communityCards.push(dealCard());
    communityCards.push(dealCard());
    logMessage(`Flop: ${communityCards.map(c=>c.display).join(', ')}`);
    startNextStreetBetting();
}

function dealTurn() {
    deck.pop(); // Burn card
    communityCards.push(dealCard());
    logMessage(`Turn: ${communityCards[3].display}`);
    startNextStreetBetting();
}

function dealRiver() {
    deck.pop(); // Burn card
    communityCards.push(dealCard());
    logMessage(`River: ${communityCards[4].display}`);
    startNextStreetBetting();
}

function startNextStreetBetting() {
    currentBet = 0;
    players.forEach(p => {
        // p.currentBet = 0; // Bets on previous streets are in the pot. New street, new bets.
                            // NO! currentBet on player object is their total bet IN THIS HAND for the current street.
                            // The pot is the sum of all bets from all streets.
                            // What needs to reset is how much MORE they need to put in.
        p.hasActedThisRound = false;
    });

    // Determine first player to act (left of dealer, not folded, has stack)
    currentPlayerIndex = (dealerButtonPos + 1) % players.length;
    let foundFirstActor = false;
    for (let i = 0; i < players.length; i++) {
        const checkIndex = (dealerButtonPos + 1 + i) % players.length;
        if (!players[checkIndex].folded && players[checkIndex].stack > 0) {
            currentPlayerIndex = checkIndex;
            foundFirstActor = true;
            break;
        }
    }
    if (!foundFirstActor) { // Should only happen if one player is left
        showdown(); // Or award pot if only one left
        return;
    }
    nextAction();
}


// --- Player Action Handling ---
function handlePlayerAction(player, actionType, amount = 0) {
    player.hasActedThisRound = true;
    let actionText = `${player.name} `;

    switch (actionType) {
        case 'fold':
            player.folded = true;
            actionText += "folds.";
            const activeLeft = players.filter(p => !p.folded && p.stack > 0);
            if (activeLeft.length === 1) {
                awardPot(activeLeft[0]);
                return; // End hand
            }
            break;
        case 'check':
            if (player.currentBet < currentBet) { // Cannot check if there's a bet to call
                logMessage(`Invalid action: ${player.name} cannot check. Must call ${currentBet - player.currentBet} or raise or fold.`);
                player.hasActedThisRound = false; // Let them act again
                if (player.isHuman) updateActionButtons(); // Re-enable buttons for human
                else setTimeout(() => nextAction(), 50); // Bot tries again quickly
                return;
            }
            actionText += "checks.";
            break;
        case 'call':
            const callAmount = Math.min(currentBet - player.currentBet, player.stack);
            if (callAmount <= 0 && currentBet > 0) { // Trying to call when already matched or no bet
                 actionText += "already in or no bet to call (effectively checks).";
                 // This case should be handled by button disable logic for human
            } else {
                player.stack -= callAmount;
                player.currentBet += callAmount;
                pot += callAmount;
                actionText += `calls ${callAmount}.`;
                if (player.stack === 0) {
                    player.isAllIn = true;
                    actionText += " (ALL-IN)";
                }
            }
            break;
        case 'bet': // Player is opening the betting on this street
            if (currentBet > 0) { // Cannot bet if already a bet, must raise
                logMessage(`Invalid action: ${player.name} cannot bet. Must raise or call.`);
                player.hasActedThisRound = false;
                if (player.isHuman) updateActionButtons();
                else setTimeout(() => nextAction(), 50);
                return;
            }
            const betVal = Math.min(amount, player.stack);
            if (betVal < BIG_BLIND_AMOUNT && currentPhase !== 'pre-flop' && pot > BIG_BLIND_AMOUNT*2) { // Min bet rule, except preflop blinds
                // Exception for going all-in with less
                if (betVal < player.stack) {
                     logMessage(`Invalid bet amount: ${player.name} bets ${betVal}. Min bet is ${BIG_BLIND_AMOUNT}.`);
                     player.hasActedThisRound = false;
                     if (player.isHuman) { betAmountInput.value = BIG_BLIND_AMOUNT; updateActionButtons(); }
                     else setTimeout(() => nextAction(), 50);
                     return;
                }
            }
            player.stack -= betVal;
            player.currentBet += betVal;
            pot += betVal;
            currentBet = player.currentBet; // New current bet for others to match
            actionText += `bets ${betVal}.`;
            if (player.stack === 0) {
                player.isAllIn = true;
                actionText += " (ALL-IN)";
            }
            // Reset hasActedThisRound for other players as the bet has increased
            players.forEach(p => { if(p.id !== player.id) p.hasActedThisRound = false; });
            break;
        case 'raise':
            const minRaiseAmount = currentBet + (currentBet - (players.find(p => p.currentBet < currentBet && p.hasActedThisRound)?.currentBet || 0) ); // Min raise is usually the size of the last bet/raise
                                                                                                                                                // Or at least double the previous bet if it was an open.
                                                                                                                                                // Simplified: currentBet + BIG_BLIND_AMOUNT
            const raiseToAmount = amount; // Assume 'amount' is the total amount they are raising TO.
            const actualRaiseAmountNeeded = raiseToAmount - player.currentBet;

            if (raiseToAmount <= currentBet || actualRaiseAmountNeeded <= 0) {
                 logMessage(`Invalid raise: ${player.name} raise to ${raiseToAmount} is not more than current bet of ${currentBet}.`);
                 player.hasActedThisRound = false;
                 if (player.isHuman) updateActionButtons(); else setTimeout(() => nextAction(), 50);
                 return;
            }
            // Min raise rule: raise must be at least the size of the previous bet/raise.
            // Or if it's an open bet that's being raised, raise must be at least double.
            // This is complex. Simplified: must raise by at least BIG_BLIND_AMOUNT on top of currentBet.
            if ( (raiseToAmount - currentBet) < BIG_BLIND_AMOUNT && player.stack > raiseToAmount ) { // If not all-in
                logMessage(`Invalid raise: ${player.name} raise to ${raiseToAmount}. Must raise by at least ${BIG_BLIND_AMOUNT} more than current bet ${currentBet}.`);
                player.hasActedThisRound = false;
                if (player.isHuman) { betAmountInput.value = currentBet + BIG_BLIND_AMOUNT; updateActionButtons(); }
                else setTimeout(() => nextAction(), 50);
                return;
            }

            const finalRaiseToAmount = Math.min(raiseToAmount, player.stack + player.currentBet); // Cannot raise to more than they have
            const costToPlayer = finalRaiseToAmount - player.currentBet;

            player.stack -= costToPlayer;
            player.currentBet += costToPlayer; // player.currentBet is now finalRaiseToAmount
            pot += costToPlayer;
            currentBet = player.currentBet; // New current high bet
            actionText += `raises to ${player.currentBet}.`;
            if (player.stack === 0) {
                player.isAllIn = true;
                actionText += " (ALL-IN)";
            }
            // Reset hasActedThisRound for other players as the bet has increased
            players.forEach(p => { if(p.id !== player.id) p.hasActedThisRound = false; });
            break;
    }
    logMessage(actionText);
    moveToNextPlayer();
}


// --- Bot AI (Conceptual) ---
function getBotAction(bot) {
    // This is where the bot's "personality" comes into play.
    // It needs to consider:
    // 1. Its hole cards (strength)
    // 2. Community cards (if any, and how they improve its hand)
    // 3. Current bet amount / Pot odds
    // 4. Number of players remaining
    // 5. Actions of previous players in the round
    // 6. Its own personality (tight, loose, aggressive, passive, bluff tendency)
    // 7. Its stack size

    // Example simplified logic for pre-flop:
    if (currentPhase === 'pre-flop') {
        const handStrength = evaluatePreflopHandStrength(bot.cards); // Needs a helper function
        const callAmount = currentBet - bot.currentBet;
        const effectiveStack = bot.stack + bot.currentBet; // What they could lose this hand

        // Personality modifier
        let playThreshold = 0.3; // Default: plays 70% of hands
        if (bot.personality.preflopTightness) {
            playThreshold = bot.personality.preflopTightness;
        }

        if (handStrength < playThreshold && callAmount > 0) { // Too weak to call a bet
            if (callAmount > effectiveStack * 0.1 && Math.random() > bot.personality.bluffFrequency) { // Don't call big bets with weak hands unless bluffing raise
                return { type: 'fold' };
            }
        }
        // If strong enough or meets bluff criteria
        if (callAmount === 0) return { type: 'check' }; // Can check
        if (callAmount > 0 && callAmount <= bot.stack) {
            // Decide to call, raise, or fold based on strength, pot odds, aggression
            if (handStrength > 0.7 || (handStrength > 0.5 && Math.random() < bot.personality.aggressionFactor)) {
                const raiseAmount = Math.min(bot.stack, currentBet * 2 + Math.floor(Math.random() * BIG_BLIND_AMOUNT * 3)); // Example raise
                if (raiseAmount > currentBet) return { type: 'raise', amount: currentBet + raiseAmount }; // Amount is TO what value
            }
            if (callAmount <= effectiveStack * 0.3 || handStrength > 0.5) { // Call if not too expensive or decent hand
                 return { type: 'call' };
            }
        }
        return { type: 'fold' }; // Default if other conditions not met
    }

    // Post-flop, Turn, River: More complex. Evaluate hand with community cards.
    // Placeholder:
    const callAmount = currentBet - bot.currentBet;
    if (callAmount === 0) return { type: 'check' };
    if (callAmount > 0 && callAmount < bot.stack / 3 && Math.random() < 0.7) return { type: 'call' }; // Simple call logic

    return { type: 'fold' }; // Default to fold if unsure
}

function evaluatePreflopHandStrength(cards) {
    // Simplified: returns a value 0-1.
    // Real evaluation is complex. This is a placeholder.
    // Consider pairs, suited connectors, high cards.
    const c1 = cards[0], c2 = cards[1];
    let strength = 0;
    if (c1.value === c2.value) strength += 0.5; // Pair
    if (c1.suit === c2.suit) strength += 0.2;   // Suited
    strength += (c1.value + c2.value) / 50;   // High cards
    return Math.min(1, strength + Math.random()*0.1); // Add some noise
}


// --- Hand Evaluation (VERY Complex - Placeholder) ---
function evaluateHand(holeCards, communityCardsInput) {
    // This is the heart of poker logic. It needs to:
    // 1. Take 2 hole cards and 5 community cards (or fewer if not all dealt).
    // 2. Find ALL possible 5-card combinations from these 7 (or 5, or 6) cards. (7C5 = 21 combinations)
    // 3. For each combination, determine its rank (Royal Flush, Straight Flush, ..., High Card).
    // 4. Return the highest ranking hand found, along with tie-breaking kickers.

    // Structure:
    // - Hand object: { rankName: "Straight", rankValue: 5, highCardValues: [10,9,8,7,6] }
    // - Helper functions:
    //   - isFlush(cards)
    //   - isStraight(cards)
    //   - countCardRanks(cards) -> returns map of {rank: count} for pairs, trips, quads.
    //   - sortCardsByValue(cards)

    // Placeholder: returns a random score for now
    logMessage("DEBUG: evaluateHand called for " + holeCards.map(c=>c.display).join('/') + " with community " + communityCardsInput.map(c=>c.display).join('/'));

    const allCards = [...holeCards, ...communityCardsInput];
    if (allCards.length < 5 && communityCardsInput.length < 3) { // Need at least 3 community for a 5 card hand
         return { rankName: "Incomplete", rankValue: 0, cards: [], kickers: [] };
    }


    // THIS IS THE MOST DIFFICULT PART. A full robust hand evaluator is many lines of code.
    // Search for "Texas Hold'em hand evaluator javascript" for existing libraries or algorithms.
    // For now, a very naive strength based on highest card in hole cards.
    let bestCombo = [];
    let bestHandDetails = { rankName: "High Card", rankValue: 1, cards: [], kickers: [] };

    // A very simplified version to get something working:
    // Just consider hole cards + community cards for a simple check.
    // In reality, you need to check all 5-card combinations.

    // Example: just find the highest card for now
    let highestCardValue = 0;
    let tempKickers = [];
    allCards.sort((a,b) => b.value - a.value);
    tempKickers = allCards.slice(0,5).map(c => c.value);


    bestHandDetails.kickers = tempKickers;
    bestHandDetails.cards = allCards.slice(0,5); // Example, not a real poker hand
    if (allCards.length > 0) {
        bestHandDetails.rankName = `High Card ${RANKS.find(r => RANK_VALUES[r] === tempKickers[0])}`;
    }


    // Simulate some pair finding for basic testing
    const rankCounts = {};
    allCards.forEach(card => { rankCounts[card.value] = (rankCounts[card.value] || 0) + 1; });
    let pairs = 0, threes = 0, fours = 0;
    let pairValues = [], threeValue = 0, fourValue = 0;

    for(const val in rankCounts) {
        if (rankCounts[val] === 2) { pairs++; pairValues.push(parseInt(val));}
        if (rankCounts[val] === 3) { threes++; threeValue = parseInt(val);}
        if (rankCounts[val] === 4) { fours++; fourValue = parseInt(val);}
    }
    pairValues.sort((a,b) => b-a);


    if (fours > 0) {
        bestHandDetails = { rankName: "Four of a Kind", rankValue: 8, cards: [], kickers: [fourValue] };
    } else if (threes > 0 && pairs > 0) {
        bestHandDetails = { rankName: "Full House", rankValue: 7, cards: [], kickers: [threeValue, pairValues[0]] };
    } else if (threes > 0) { // Placeholder, need to check for flush/straight first
        bestHandDetails = { rankName: "Three of a Kind", rankValue: 4, cards: [], kickers: [threeValue] };
    } else if (pairs >= 2) {
        bestHandDetails = { rankName: "Two Pair", rankValue: 3, cards: [], kickers: [pairValues[0], pairValues[1]] };
    } else if (pairs === 1) {
        bestHandDetails = { rankName: "One Pair", rankValue: 2, cards: [], kickers: [pairValues[0]] };
    }
    // This simplified logic doesn't include kickers for pairs correctly or Flushes/Straights

    return bestHandDetails;
}

function compareHands(hand1Details, hand2Details) {
    // Compares two hand evaluation objects.
    // Returns:
    //  1 if hand1 wins
    // -1 if hand2 wins
    //  0 if tie (split pot)

    if (hand1Details.rankValue > hand2Details.rankValue) return 1;
    if (hand1Details.rankValue < hand2Details.rankValue) return -1;

    // Same rank, compare kickers
    for (let i = 0; i < Math.min(hand1Details.kickers.length, hand2Details.kickers.length); i++) {
        if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
        if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
    }
    return 0; // Exact tie
}

// --- Showdown & Pot Awarding ---
function showdown() {
    logMessage("--- Showdown ---");
    updateAllUI(); // Show all cards

    const eligiblePlayers = players.filter(p => !p.folded);
    if (eligiblePlayers.length === 0) {
        logMessage("Error: No eligible players for showdown.");
        setTimeout(startNewHand, 3000);
        return;
    }
    if (eligiblePlayers.length === 1) {
        awardPot(eligiblePlayers[0]);
        return;
    }

    eligiblePlayers.forEach(player => {
        player.evaluatedHand = evaluateHand(player.cards, communityCards);
        logMessage(`${player.name} has: ${player.evaluatedHand.rankName} (Kickers: ${player.evaluatedHand.kickers.join(',')})`);
    });

    // Find the winner(s)
    let winners = [eligiblePlayers[0]];
    for (let i = 1; i < eligiblePlayers.length; i++) {
        const comparison = compareHands(eligiblePlayers[i].evaluatedHand, winners[0].evaluatedHand);
        if (comparison === 1) { // Current player has better hand
            winners = [eligiblePlayers[i]];
        } else if (comparison === 0) { // Tie
            winners.push(eligiblePlayers[i]);
        }
    }

    awardPot(winners); // Pass array of winners
}

function awardPot(winnersInput) {
    let winnersArray = Array.isArray(winnersInput) ? winnersInput : [winnersInput];

    if (winnersArray.length === 0) {
        logMessage("Error: No winners to award pot to.");
        setTimeout(startNewHand, 3000);
        return;
    }

    const amountPerWinner = Math.floor(pot / winnersArray.length);
    const remainder = pot % winnersArray.length; // For uneven splits, give to first winner or by position

    winnersArray.forEach((winner, index) => {
        winner.stack += amountPerWinner;
        if (index === 0 && remainder > 0) winner.stack += remainder; // Give remainder to first listed winner
        logMessage(`${winner.name} wins ${amountPerWinner + (index === 0 ? remainder : 0)} with ${winner.evaluatedHand ? winner.evaluatedHand.rankName : 'default'}.`);
    });

    pot = 0;
    updateAllUI();

    // Check for game over (only one player with stack)
    const playersWithChips = players.filter(p => p.stack > 0);
    if (playersWithChips.length <= 1) {
        logMessage(`--- GAME OVER --- ${playersWithChips.length === 1 ? playersWithChips[0].name + " wins the game!" : "No one has chips left."}`);
        // Could show a game over screen or offer to restart
        startGameButton.textContent = "Play Again?"; // Update button text
        menuScreen.classList.add('active'); // Go back to menu
        gameScreen.classList.remove('active');
        return;
    }


    setTimeout(startNewHand, 5000); // Start new hand after a delay
}


// --- Event Listeners ---
startGameButton.addEventListener('click', startGame);

actionsArea.addEventListener('click', (event) => {
    if (event.target.classList.contains('action-button')) {
        const actionType = event.target.dataset.action;
        let amount = 0;
        if (actionType === 'bet' || actionType === 'raise') {
            amount = parseInt(betAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                logMessage("Invalid amount entered.");
                return;
            }
        }
        handlePlayerAction(players[0], actionType, amount);
    }
});


// --- Initial Call ---
// Game starts from menu, so no direct call to startGame here initially.
// updateAllUI(); // Call once to set up initial empty table if not starting from menu.
