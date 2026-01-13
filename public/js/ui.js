/**
 * UI Controller - Handles all DOM manipulation and rendering
 */

const ui = {
  // Staging elements
  stagingScreen: null,
  gameScreen: null,
  jeopardyCategoriesContainer: null,
  doubleJeopardyCategoriesContainer: null,
  timerSlider: null,
  timerValue: null,

  // Game elements
  gameBoard: null,
  clueDisplay: null,
  dailyDoubleDisplay: null,
  finalJeopardyDisplay: null,
  gameOverDisplay: null,

  // Staging state
  jeopardyCategories: [],
  doubleJeopardyCategories: [],
  lastClueClickTime: 0,

  /**
   * Initialize UI and set up event listeners
   */
  initialize() {
    // Get DOM elements
    this.stagingScreen = document.getElementById('staging-screen');
    this.gameScreen = document.getElementById('game-screen');
    this.jeopardyCategoriesContainer = document.getElementById('jeopardy-categories');
    this.doubleJeopardyCategoriesContainer = document.getElementById('double-jeopardy-categories');
    this.timerSlider = document.getElementById('timer-slider');
    this.timerValue = document.getElementById('timer-value');

    this.gameBoard = document.getElementById('game-board');
    this.clueDisplay = document.getElementById('clue-display');
    this.dailyDoubleDisplay = document.getElementById('daily-double-display');
    this.finalJeopardyDisplay = document.getElementById('final-jeopardy-display');
    this.gameOverDisplay = document.getElementById('game-over-display');

    // Set up staging screen event listeners
    this.timerSlider.addEventListener('input', () => {
      this.timerValue.textContent = this.timerSlider.value;
      game.setResponseTime(parseInt(this.timerSlider.value));
    });

    document.getElementById('reroll-jeopardy').addEventListener('click', () => {
      this.loadRandomCategories('jeopardy');
    });

    document.getElementById('reroll-double-jeopardy').addEventListener('click', () => {
      this.loadRandomCategories('double-jeopardy');
    });

    document.getElementById('start-game').addEventListener('click', () => {
      this.handleStartGame();
    });

    // Daily Double events
    document.getElementById('submit-wager').addEventListener('click', () => {
      const wager = parseInt(document.getElementById('wager-amount').value);
      if (wager && wager >= 5) {
        game.submitDailyDoubleWager(wager);
      } else {
        alert('Please enter a valid wager (minimum $5)');
      }
    });

    // Final Jeopardy events
    document.getElementById('fj-submit-wagers').addEventListener('click', () => {
      const wager1 = parseInt(document.getElementById('fj-p1-wager').value);
      const wager2 = parseInt(document.getElementById('fj-p2-wager').value);

      if (wager1 >= 0 && wager2 >= 0) {
        game.submitFinalJeopardyWagers(wager1, wager2);
      } else {
        alert('Please enter valid wagers for both players');
      }
    });

    document.getElementById('fj-submit-answers').addEventListener('click', () => {
      const answer1 = document.getElementById('fj-p1-answer').value.trim();
      const answer2 = document.getElementById('fj-p2-answer').value.trim();

      if (answer1 && answer2) {
        game.submitFinalJeopardyAnswers(answer1, answer2);
      } else {
        alert('Both players must enter an answer');
      }
    });

    // Play again
    document.getElementById('play-again').addEventListener('click', () => {
      this.returnToStaging();
    });

    // Skip question
    document.getElementById('skip-question').addEventListener('click', () => {
      game.skipQuestion();
    });

    // Edit scores
    document.getElementById('edit-score-1').addEventListener('click', () => {
      const newScore = prompt('Enter new score for Player 1:', game.players[1].score);
      if (newScore !== null) {
        game.players[1].score = parseInt(newScore) || 0;
        this.updateScores(game.players[1].score, game.players[2].score);
      }
    });

    document.getElementById('edit-score-2').addEventListener('click', () => {
      const newScore = prompt('Enter new score for Player 2:', game.players[2].score);
      if (newScore !== null) {
        game.players[2].score = parseInt(newScore) || 0;
        this.updateScores(game.players[1].score, game.players[2].score);
      }
    });

    // Toggle control
    document.getElementById('toggle-control').addEventListener('click', () => {
      game.toggleControl();
    });

    // Final Jeopardy continue
    document.getElementById('fj-continue').addEventListener('click', () => {
      game.endGame();
    });

    // Keyboard controls
    this.setupKeyboardControls();

    // Load initial categories
    this.loadRandomCategories('jeopardy');
    this.loadRandomCategories('double-jeopardy');

    console.log('UI initialized');
  },

  /**
   * Load random categories for staging
   */
  async loadRandomCategories(round) {
    try {
      const response = await fetch(`${game.apiUrl}/api/categories/random?count=6`);
      const data = await response.json();

      if (round === 'jeopardy') {
        this.jeopardyCategories = data.categories;
        this.renderCategories(this.jeopardyCategoriesContainer, this.jeopardyCategories, 'jeopardy');
      } else {
        this.doubleJeopardyCategories = data.categories;
        this.renderCategories(this.doubleJeopardyCategoriesContainer, this.doubleJeopardyCategories, 'double-jeopardy');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  },

  /**
   * Render categories in staging screen
   */
  renderCategories(container, categories, round) {
    container.innerHTML = '';

    categories.forEach((category, index) => {
      const item = document.createElement('div');
      item.className = 'category-item';

      const name = document.createElement('div');
      name.className = 'category-name';
      name.textContent = category;

      const swapBtn = document.createElement('button');
      swapBtn.className = 'btn btn-secondary btn-swap';
      swapBtn.textContent = '🔄 Swap';
      swapBtn.addEventListener('click', () => this.swapCategory(index, round));

      item.appendChild(name);
      item.appendChild(swapBtn);
      container.appendChild(item);
    });
  },

  /**
   * Swap a single category
   */
  async swapCategory(index, round) {
    const categories = round === 'jeopardy' ? this.jeopardyCategories : this.doubleJeopardyCategories;
    const oldCategory = categories[index];

    try {
      const response = await fetch(`${game.apiUrl}/api/categories/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldCategory: oldCategory,
          currentCategories: categories
        })
      });

      const data = await response.json();

      if (data.newCategory) {
        categories[index] = data.newCategory;

        if (round === 'jeopardy') {
          this.renderCategories(this.jeopardyCategoriesContainer, this.jeopardyCategories, 'jeopardy');
        } else {
          this.renderCategories(this.doubleJeopardyCategoriesContainer, this.doubleJeopardyCategories, 'double-jeopardy');
        }
      }
    } catch (error) {
      console.error('Error swapping category:', error);
    }
  },

  /**
   * Handle game start
   */
  async handleStartGame() {
    try {
      const response = await fetch(`${game.apiUrl}/api/game/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jeopardyCategories: this.jeopardyCategories,
          doubleJeopardyCategories: this.doubleJeopardyCategories
        })
      });

      const gameBoard = await response.json();
      game.startGame(gameBoard);

    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game. Please try again.');
    }
  },

  /**
   * Show game screen
   */
  showGameScreen() {
    this.stagingScreen.classList.remove('active');
    this.gameScreen.classList.add('active');
  },

  /**
   * Return to staging screen
   */
  returnToStaging() {
    this.gameScreen.classList.remove('active');
    this.stagingScreen.classList.add('active');
    this.hideGameOver();
    this.loadRandomCategories('jeopardy');
    this.loadRandomCategories('double-jeopardy');
  },

  /**
   * Render game board
   */
  renderBoard(roundData, roundName) {
    this.gameBoard.innerHTML = '';

    // Render category headers
    roundData.categories.forEach(category => {
      const header = document.createElement('div');
      header.className = 'category-header';
      header.textContent = category;
      this.gameBoard.appendChild(header);
    });

    // Render clue cells (5 rows of values)
    for (let valueIndex = 0; valueIndex < 5; valueIndex++) {
      for (let categoryIndex = 0; categoryIndex < 6; categoryIndex++) {
        const questionIndex = categoryIndex * 5 + valueIndex;
        const question = roundData.questions[questionIndex];

        const cell = document.createElement('div');
        cell.className = 'clue-cell';
        cell.textContent = `$${question.displayValue}`;
        cell.dataset.categoryIndex = categoryIndex;
        cell.dataset.valueIndex = valueIndex;
        cell.dataset.round = roundName;

        cell.addEventListener('click', () => {
          // Debounce: prevent clicks within 500ms of last click
          const now = Date.now();
          if (now - this.lastClueClickTime < 500) {
            return;
          }
          this.lastClueClickTime = now;

          if (!cell.classList.contains('used') && !game.clueInProgress) {
            cell.classList.add('used');
            game.selectClue(categoryIndex, valueIndex, roundName);
          }
        });

        this.gameBoard.appendChild(cell);
      }
    }
  },

  /**
   * Update scores
   */
  updateScores(score1, score2) {
    document.getElementById('player1-score').textContent = `$${score1}`;
    document.getElementById('player2-score').textContent = `$${score2}`;
  },

  /**
   * Set round indicator
   */
  setRoundIndicator(text) {
    document.getElementById('round-indicator').textContent = text;
  },

  /**
   * Show clue
   */
  showClue(category, value, clueText) {
    document.getElementById('clue-category').textContent = category;
    document.getElementById('clue-value').textContent = value;
    document.getElementById('clue-text').textContent = clueText;

    this.clueDisplay.classList.remove('hidden');
    document.getElementById('answer-status').classList.add('hidden');
  },

  /**
   * Hide clue
   */
  hideClue() {
    this.clueDisplay.classList.add('hidden');
  },

  /**
   * Set buzzer status text
   */
  setBuzzerStatus(text) {
    document.getElementById('buzzer-status').textContent = text;
  },

  /**
   * Show answer result
   */
  showAnswerResult(isCorrect, message) {
    const answerStatus = document.getElementById('answer-status');
    answerStatus.textContent = message;
    answerStatus.className = 'answer-status';
    answerStatus.classList.add(isCorrect ? 'correct' : 'incorrect');
    answerStatus.classList.remove('hidden');
  },

  /**
   * Update timer display
   */
  updateTimer(remaining, total) {
    const timerCountdown = document.getElementById('timer-countdown');
    const timerCircle = document.getElementById('timer-circle');

    timerCountdown.textContent = remaining;

    // Change color based on remaining time
    timerCircle.classList.remove('warning', 'danger');

    const percentage = (remaining / total) * 100;
    if (percentage <= 25) {
      timerCircle.classList.add('danger');
    } else if (percentage <= 50) {
      timerCircle.classList.add('warning');
    }
  },

  /**
   * Highlight buzzer for player
   */
  highlightBuzzer(player) {
    document.getElementById(`player${player}-buzzer`).classList.add('active');
  },

  /**
   * Reset buzzer indicators
   */
  resetBuzzerIndicators() {
    document.getElementById('player1-buzzer').classList.remove('active');
    document.getElementById('player2-buzzer').classList.remove('active');
  },

  /**
   * Show Daily Double screen
   */
  showDailyDouble(player, currentScore, maxWager) {
    document.getElementById('dd-player').textContent = `Player ${player}`;
    document.getElementById('dd-current-score').textContent = currentScore;
    document.getElementById('dd-max-wager').textContent = maxWager;

    const wagerInput = document.getElementById('wager-amount');
    wagerInput.value = '';
    wagerInput.max = maxWager;

    this.dailyDoubleDisplay.classList.remove('hidden');
  },

  /**
   * Hide Daily Double screen
   */
  hideDailyDouble() {
    this.dailyDoubleDisplay.classList.add('hidden');
  },

  /**
   * Show Final Jeopardy screen
   */
  showFinalJeopardy(category, score1, score2) {
    document.getElementById('fj-category').textContent = `Category: ${category}`;
    document.getElementById('fj-p1-score').textContent = score1;
    document.getElementById('fj-p2-score').textContent = score2;

    document.getElementById('fj-p1-wager').value = '';
    document.getElementById('fj-p1-wager').max = score1;
    document.getElementById('fj-p2-wager').value = '';
    document.getElementById('fj-p2-wager').max = score2;

    document.getElementById('fj-wager-screen').classList.remove('hidden');
    document.getElementById('fj-question-screen').classList.add('hidden');

    this.finalJeopardyDisplay.classList.remove('hidden');
  },

  /**
   * Show Final Jeopardy question
   */
  showFinalJeopardyQuestion(question) {
    document.getElementById('fj-clue').textContent = question;
    document.getElementById('fj-p1-answer').value = '';
    document.getElementById('fj-p2-answer').value = '';
    document.getElementById('fj-wager-screen').classList.add('hidden');
    document.getElementById('fj-question-screen').classList.remove('hidden');
  },

  /**
   * Set Final Jeopardy instructions
   */
  setFinalJeopardyInstructions(text) {
    document.getElementById('fj-instructions').textContent = text;
  },

  /**
   * Set Final Jeopardy listening status
   */
  setFinalJeopardyListening(text) {
    document.getElementById('fj-listening').textContent = text;
  },

  /**
   * Show Final Jeopardy results
   */
  showFinalJeopardyResults(correctAnswer, answer1, answer2, result1, result2, wager1, wager2, finalScore1, finalScore2) {
    document.getElementById('fj-correct-answer').textContent = correctAnswer;

    document.getElementById('fj-p1-answer-display').textContent = answer1;
    document.getElementById('fj-p2-answer-display').textContent = answer2;

    const p1Result = document.getElementById('fj-p1-result');
    p1Result.textContent = result1 ? '✓ CORRECT' : '✗ INCORRECT';
    p1Result.className = 'fj-result-status ' + (result1 ? 'correct' : 'incorrect');

    const p2Result = document.getElementById('fj-p2-result');
    p2Result.textContent = result2 ? '✓ CORRECT' : '✗ INCORRECT';
    p2Result.className = 'fj-result-status ' + (result2 ? 'correct' : 'incorrect');

    document.getElementById('fj-p1-wager-display').textContent = wager1;
    document.getElementById('fj-p2-wager-display').textContent = wager2;
    document.getElementById('fj-p1-final-score').textContent = finalScore1;
    document.getElementById('fj-p2-final-score').textContent = finalScore2;

    document.getElementById('fj-question-screen').classList.add('hidden');
    document.getElementById('fj-results-screen').classList.remove('hidden');
  },

  /**
   * Hide Final Jeopardy screen
   */
  hideFinalJeopardy() {
    this.finalJeopardyDisplay.classList.add('hidden');
  },

  /**
   * Update control indicator
   */
  updateControlIndicator(player) {
    document.getElementById('control-indicator').textContent = `Player ${player} in control`;
  },

  /**
   * Show game over screen
   */
  showGameOver(winner, score1, score2) {
    document.getElementById('go-winner').textContent = winner;
    document.getElementById('go-p1-score').textContent = `$${score1}`;
    document.getElementById('go-p2-score').textContent = `$${score2}`;

    this.hideFinalJeopardy();
    this.gameOverDisplay.classList.remove('hidden');
  },

  /**
   * Hide game over screen
   */
  hideGameOver() {
    this.gameOverDisplay.classList.add('hidden');
  },

  /**
   * Set up keyboard controls
   */
  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      // Player 1: A key
      if (e.key.toLowerCase() === 'a') {
        game.buzz(1);
      }

      // Player 2: L key
      if (e.key.toLowerCase() === 'l') {
        game.buzz(2);
      }

      // Spacebar: Pause/Resume (not implemented)
      // ESC: Exit to main menu (not implemented)
      // R: Restart game (not implemented)
    });
  }
};

// Initialize UI on load
document.addEventListener('DOMContentLoaded', () => {
  ui.initialize();
});
