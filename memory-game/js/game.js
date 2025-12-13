/**
 * 記憶大挑戰 - Memory Match Game
 * A fun and engaging memory card matching game
 */

class MemoryGame {
    constructor() {
        // Game elements
        this.gameBoard = document.getElementById('gameBoard');
        this.timerDisplay = document.getElementById('timer');
        this.movesDisplay = document.getElementById('moves');
        this.matchesDisplay = document.getElementById('matches');
        this.restartBtn = document.getElementById('restartBtn');
        this.hintBtn = document.getElementById('hintBtn');
        this.victoryModal = document.getElementById('victoryModal');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        this.difficultyBtns = document.querySelectorAll('.difficulty-btn');
        
        // Game state
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.timer = null;
        this.seconds = 0;
        this.isLocked = false;
        this.hintsRemaining = 3;
        this.difficulty = 'easy';
        
        // Card symbols - using emojis for visual appeal
        this.symbols = [
            '🐶', '🐱', '🐼', '🦊', '🦁', '🐸', '🐵', '🐰',
            '🦄', '🐲', '🦋', '🐙', '🦀', '🐢', '🦩', '🐳',
            '🌸', '🌺', '🌻', '🌹', '🍀', '🌈', '⭐', '🌙'
        ];
        
        // Difficulty settings
        this.difficultySettings = {
            easy: { rows: 3, cols: 4, pairs: 6 },
            medium: { rows: 4, cols: 4, pairs: 8 },
            hard: { rows: 4, cols: 6, pairs: 12 }
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.startGame();
    }
    
    bindEvents() {
        this.restartBtn.addEventListener('click', () => this.startGame());
        this.hintBtn.addEventListener('click', () => this.useHint());
        this.playAgainBtn.addEventListener('click', () => this.closeVictoryModal());
        
        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setDifficulty(e.target.dataset.level);
            });
        });
    }
    
    setDifficulty(level) {
        this.difficulty = level;
        
        // Update active button
        this.difficultyBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level === level);
        });
        
        // Update game board class
        this.gameBoard.className = 'game-board ' + level;
        
        this.startGame();
    }
    
    startGame() {
        // Reset game state
        this.stopTimer();
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.seconds = 0;
        this.isLocked = false;
        this.hintsRemaining = 3;
        
        // Update displays
        this.updateDisplay();
        this.hintBtn.innerHTML = '<span class="btn-icon">💡</span><span class="btn-text">提示 (3)</span>';
        this.hintBtn.disabled = false;
        
        // Set board class
        this.gameBoard.className = 'game-board ' + this.difficulty;
        
        // Generate cards
        this.generateCards();
        this.renderCards();
    }
    
    generateCards() {
        const settings = this.difficultySettings[this.difficulty];
        const numPairs = settings.pairs;
        
        // Select random symbols
        const selectedSymbols = this.shuffleArray([...this.symbols])
            .slice(0, numPairs);
        
        // Create pairs
        const cardSymbols = [...selectedSymbols, ...selectedSymbols];
        
        // Shuffle cards
        this.cards = this.shuffleArray(cardSymbols).map((symbol, index) => ({
            id: index,
            symbol: symbol,
            isFlipped: false,
            isMatched: false
        }));
    }
    
    renderCards() {
        this.gameBoard.innerHTML = '';
        
        this.cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.index = index;
            
            cardElement.innerHTML = `
                <div class="card-inner">
                    <div class="card-face card-front"></div>
                    <div class="card-face card-back">${card.symbol}</div>
                </div>
            `;
            
            cardElement.addEventListener('click', () => this.flipCard(index));
            this.gameBoard.appendChild(cardElement);
            
            // Add staggered entrance animation
            setTimeout(() => {
                cardElement.style.opacity = '1';
                cardElement.style.transform = 'translateY(0)';
            }, index * 50);
        });
        
        // Initial animation setup
        const cardElements = this.gameBoard.querySelectorAll('.card');
        cardElements.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        });
    }
    
    flipCard(index) {
        const card = this.cards[index];
        const cardElement = this.gameBoard.children[index];
        
        // Prevent invalid flips
        if (this.isLocked || 
            card.isFlipped || 
            card.isMatched || 
            this.flippedCards.length >= 2) {
            return;
        }
        
        // Start timer on first flip
        if (this.moves === 0 && this.flippedCards.length === 0) {
            this.startTimer();
        }
        
        // Flip the card
        card.isFlipped = true;
        cardElement.classList.add('flipped');
        this.flippedCards.push({ card, element: cardElement, index });
        
        // Play flip sound effect (visual feedback)
        this.playFlipEffect(cardElement);
        
        // Check for match when two cards are flipped
        if (this.flippedCards.length === 2) {
            this.moves++;
            this.updateDisplay();
            this.checkMatch();
        }
    }
    
    playFlipEffect(element) {
        element.style.animation = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.animation = null;
    }
    
    checkMatch() {
        const [first, second] = this.flippedCards;
        const isMatch = first.card.symbol === second.card.symbol;
        
        this.isLocked = true;
        
        if (isMatch) {
            this.handleMatch(first, second);
        } else {
            this.handleMismatch(first, second);
        }
    }
    
    handleMatch(first, second) {
        setTimeout(() => {
            first.card.isMatched = true;
            second.card.isMatched = true;
            first.element.classList.add('matched');
            second.element.classList.add('matched');
            
            this.matchedPairs++;
            this.updateDisplay();
            this.flippedCards = [];
            this.isLocked = false;
            
            // Check for victory
            const totalPairs = this.difficultySettings[this.difficulty].pairs;
            if (this.matchedPairs === totalPairs) {
                this.handleVictory();
            }
        }, 300);
    }
    
    handleMismatch(first, second) {
        setTimeout(() => {
            first.card.isFlipped = false;
            second.card.isFlipped = false;
            first.element.classList.remove('flipped');
            second.element.classList.remove('flipped');
            
            this.flippedCards = [];
            this.isLocked = false;
        }, 1000);
    }
    
    handleVictory() {
        this.stopTimer();
        
        // Calculate rating based on moves
        const totalPairs = this.difficultySettings[this.difficulty].pairs;
        const perfectMoves = totalPairs;
        const goodMoves = totalPairs * 1.5;
        
        let rating;
        if (this.moves <= perfectMoves + 2) {
            rating = '⭐⭐⭐';
        } else if (this.moves <= goodMoves + 4) {
            rating = '⭐⭐';
        } else {
            rating = '⭐';
        }
        
        // Update modal
        document.getElementById('finalTime').textContent = this.formatTime(this.seconds);
        document.getElementById('finalMoves').textContent = this.moves;
        document.getElementById('finalRating').textContent = rating;
        
        // Show modal with delay for last match animation
        setTimeout(() => {
            this.victoryModal.classList.add('active');
        }, 600);
    }
    
    closeVictoryModal() {
        this.victoryModal.classList.remove('active');
        setTimeout(() => this.startGame(), 300);
    }
    
    useHint() {
        if (this.hintsRemaining <= 0 || this.isLocked) return;
        
        // Find unmatched cards
        const unmatchedCards = this.cards
            .map((card, index) => ({ ...card, index }))
            .filter(card => !card.isMatched && !card.isFlipped);
        
        if (unmatchedCards.length < 2) return;
        
        // Find a pair
        const symbolGroups = {};
        unmatchedCards.forEach(card => {
            if (!symbolGroups[card.symbol]) {
                symbolGroups[card.symbol] = [];
            }
            symbolGroups[card.symbol].push(card.index);
        });
        
        // Get first pair
        for (const symbol in symbolGroups) {
            if (symbolGroups[symbol].length >= 2) {
                const [first, second] = symbolGroups[symbol];
                
                // Highlight the pair
                const firstElement = this.gameBoard.children[first];
                const secondElement = this.gameBoard.children[second];
                
                firstElement.classList.add('hint');
                secondElement.classList.add('hint');
                
                setTimeout(() => {
                    firstElement.classList.remove('hint');
                    secondElement.classList.remove('hint');
                }, 1000);
                
                break;
            }
        }
        
        this.hintsRemaining--;
        this.hintBtn.innerHTML = `<span class="btn-icon">💡</span><span class="btn-text">提示 (${this.hintsRemaining})</span>`;
        
        if (this.hintsRemaining <= 0) {
            this.hintBtn.disabled = true;
        }
    }
    
    startTimer() {
        this.timer = setInterval(() => {
            this.seconds++;
            this.timerDisplay.textContent = this.formatTime(this.seconds);
        }, 1000);
    }
    
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }
    
    updateDisplay() {
        this.timerDisplay.textContent = this.formatTime(this.seconds);
        this.movesDisplay.textContent = this.moves;
        
        const totalPairs = this.difficultySettings[this.difficulty].pairs;
        this.matchesDisplay.textContent = `${this.matchedPairs}/${totalPairs}`;
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame();
});
