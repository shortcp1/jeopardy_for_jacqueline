/**
 * Jeopardy Game Logic
 * Manages game state, player scores, buzzer system, and game flow
 */

const game = {
  // Game state
  gameBoard: null,
  currentRound: 'jeopardy', // 'jeopardy', 'double-jeopardy', 'final-jeopardy'
  currentQuestion: null,
  usedQuestions: [],

  // Player state
  players: {
    1: { score: 0, name: 'Player 1' },
    2: { score: 0, name: 'Player 2' }
  },
  playerInControl: null,
  buzzedPlayer: null,
  bothPlayersAnswered: false,
  playersWhoAnswered: [],

  // Timer settings
  responseTime: 10,
  timerInterval: null,
  remainingTime: 0,

  // Buzzer state
  buzzersActive: false,

  // Daily Double state
  isDailyDouble: false,
  dailyDoubleWager: 0,

  // Clue state management
  clueInProgress: false,

  // Final Jeopardy state
  finalJeopardyWagers: {},
  finalJeopardyAnswers: {},
  finalJeopardyUserAnswers: {},
  finalJeopardyTimerInterval: null,
  finalJeopardyTimeRemaining: 0,

  // API base URL
  apiUrl: window.location.origin,

  /**
   * Initialize the game
   */
  initialize() {
    console.log('Game initialized');
    this.playerInControl = Math.random() < 0.5 ? 1 : 2;
  },

  /**
   * Start a new game with the provided game board
   */
  async startGame(gameBoard) {
    this.gameBoard = gameBoard;
    this.currentRound = 'jeopardy';
    this.players[1].score = 0;
    this.players[2].score = 0;
    this.usedQuestions = [];
    this.playerInControl = Math.random() < 0.5 ? 1 : 2;

    ui.showGameScreen();
    ui.updateScores(this.players[1].score, this.players[2].score);
    ui.renderBoard(gameBoard.jeopardy, 'jeopardy');
    ui.setRoundIndicator('JEOPARDY FOR JACQUELINE!');
    ui.updateControlIndicator(this.playerInControl);

    console.log(`Game started. Player ${this.playerInControl} in control.`);
  },

  /**
   * Handle clue selection
   */
  selectClue(categoryIndex, valueIndex, round) {
    const roundData = round === 'jeopardy' ? this.gameBoard.jeopardy : this.gameBoard.doubleJeopardy;
    const questionIndex = categoryIndex * 5 + valueIndex;
    const question = roundData.questions[questionIndex];

    if (!question || this.usedQuestions.includes(question.id)) {
      return;
    }

    this.currentQuestion = question;
    this.usedQuestions.push(question.id);

    // Check if it's a Daily Double
    if (question.isDailyDouble) {
      this.handleDailyDouble(question);
    } else {
      this.showClue(question);
    }
  },

  /**
   * Show the clue and activate buzzers
   */
  showClue(question) {
    // Stop any existing timer
    this.stopTimer();

    // Reset Daily Double flags for non-DD questions (safety)
    if (!question.isDailyDouble) {
      this.isDailyDouble = false;
      this.dailyDoubleWager = 0;
    }

    this.clueInProgress = true;

    ui.showClue(
      question.category,
      `$${question.displayValue}`,
      question.answer
    );

    this.buzzersActive = true;
    this.buzzedPlayer = null;
    this.playersWhoAnswered = [];
    this.bothPlayersAnswered = false;

    ui.setBuzzerStatus('Press your buzzer!');
    ui.resetBuzzerIndicators();

    this.startTimer();
  },

  /**
   * Handle Daily Double
   */
  handleDailyDouble(question) {
    this.isDailyDouble = true;
    const maxWager = Math.max(
      this.players[this.playerInControl].score,
      this.currentRound === 'jeopardy' ? 1000 : 2000
    );

    ui.showDailyDouble(this.playerInControl, this.players[this.playerInControl].score, maxWager);
  },

  /**
   * Submit Daily Double wager
   */
  submitDailyDoubleWager(wager) {
    this.dailyDoubleWager = wager;
    // Keep isDailyDouble = true until answer is processed

    ui.hideDailyDouble();
    this.showClue(this.currentQuestion);

    // Only the player in control can answer
    this.buzzedPlayer = this.playerInControl;
    this.buzzersActive = false;
    ui.setBuzzerStatus(`Player ${this.playerInControl}, speak your answer...`);
    ui.highlightBuzzer(this.playerInControl);

    // Start listening for speech
    this.startListeningForAnswer();
  },

  /**
   * Handle buzzer press
   */
  buzz(player) {
    if (!this.buzzersActive || this.buzzedPlayer !== null) {
      return;
    }

    this.buzzedPlayer = player;
    this.buzzersActive = false;
    this.stopTimer();

    ui.setBuzzerStatus(`Player ${player}, speak your answer...`);
    ui.highlightBuzzer(player);

    // Start listening for speech
    this.startListeningForAnswer();
  },

  /**
   * Start listening for the player's answer
   */
  startListeningForAnswer() {
    speechService.startListening(
      (transcript) => this.handleSpokenAnswer(transcript),
      (error) => {
        console.error('Speech error:', error);
        ui.setBuzzerStatus('Speech error. Try again...');
        setTimeout(() => this.startListeningForAnswer(), 1000);
      }
    );
  },

  /**
   * Handle spoken answer
   */
  async handleSpokenAnswer(transcript) {
    console.log('Heard:', transcript);
    ui.setBuzzerStatus(`Validating: "${transcript}"...`);

    // Call API to validate answer
    try {
      const response = await fetch(`${this.apiUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clue: this.currentQuestion.answer,
          correctAnswer: this.currentQuestion.question,
          userAnswer: transcript
        })
      });

      const result = await response.json();
      this.processAnswer(result.correct, result.explanation);

    } catch (error) {
      console.error('Error validating answer:', error);
      ui.setBuzzerStatus('Error validating answer');
    }
  },

  /**
   * Process the answer result
   */
  processAnswer(isCorrect, explanation) {
    const player = this.buzzedPlayer;
    const value = this.isDailyDouble ? this.dailyDoubleWager : this.currentQuestion.displayValue;

    console.log(`Processing answer: isDailyDouble=${this.isDailyDouble}, wager=${this.dailyDoubleWager}, displayValue=${this.currentQuestion.displayValue}, using value=${value}`);

    if (isCorrect) {
      // Correct answer
      this.players[player].score += value;
      this.playerInControl = player;
      ui.showAnswerResult(true, `Correct! +$${value}`);
      ui.updateScores(this.players[1].score, this.players[2].score);
      ui.updateControlIndicator(this.playerInControl);

      setTimeout(() => {
        this.endClue();
      }, 2000);

    } else {
      // Incorrect answer
      this.players[player].score -= value;
      this.playersWhoAnswered.push(player);
      ui.showAnswerResult(false, `Incorrect. -$${value}`);
      ui.updateScores(this.players[1].score, this.players[2].score);

      // Check if both players have answered
      if (this.playersWhoAnswered.length >= 2 || this.isDailyDouble) {
        // Show correct answer and end clue
        setTimeout(() => {
          ui.showAnswerResult(false, `Correct answer: ${this.currentQuestion.question}`);
          setTimeout(() => {
            this.endClue();
          }, 3000);
        }, 2000);
      } else {
        // Give other player a chance
        setTimeout(() => {
          this.buzzersActive = true;
          this.buzzedPlayer = null;
          ui.setBuzzerStatus('Other player can buzz in!');
          ui.resetBuzzerIndicators();
          this.startTimer();
        }, 2000);
      }
    }

    this.isDailyDouble = false;
    this.dailyDoubleWager = 0;
  },

  /**
   * Handle timer expiration
   */
  handleTimerExpire() {
    if (!this.clueInProgress) {
      return; // Already handled by skip or another timer
    }

    if (this.buzzedPlayer === null) {
      // No one buzzed
      ui.showAnswerResult(false, `Time's up! Answer: ${this.currentQuestion.question}`);
      setTimeout(() => {
        this.endClue();
      }, 3000);
    } else {
      // Player buzzed but didn't answer
      const player = this.buzzedPlayer;
      const value = this.isDailyDouble ? this.dailyDoubleWager : this.currentQuestion.displayValue;

      this.players[player].score -= value;
      this.playersWhoAnswered.push(player);
      ui.showAnswerResult(false, `Time's up! -$${value}`);
      ui.updateScores(this.players[1].score, this.players[2].score);

      if (this.playersWhoAnswered.length >= 2 || this.isDailyDouble) {
        setTimeout(() => {
          ui.showAnswerResult(false, `Correct answer: ${this.currentQuestion.question}`);
          setTimeout(() => {
            this.endClue();
          }, 3000);
        }, 2000);
      } else {
        setTimeout(() => {
          this.buzzersActive = true;
          this.buzzedPlayer = null;
          ui.setBuzzerStatus('Other player can buzz in!');
          ui.resetBuzzerIndicators();
          this.startTimer();
        }, 2000);
      }
    }

    this.isDailyDouble = false;
    this.dailyDoubleWager = 0;
  },

  /**
   * Skip the current question
   */
  skipQuestion() {
    if (!this.currentQuestion || !this.clueInProgress) {
      return;
    }

    this.clueInProgress = false; // Mark as handled
    this.stopTimer();
    this.buzzersActive = false;
    speechService.stopListening();

    // Clear Daily Double flags
    this.isDailyDouble = false;
    this.dailyDoubleWager = 0;

    ui.showAnswerResult(false, `Skipped. Correct answer: ${this.currentQuestion.question}`);
    setTimeout(() => {
      this.endClue();
    }, 3000);
  },

  /**
   * End the current clue
   */
  endClue() {
    this.clueInProgress = false;
    this.stopTimer();

    // Clear Daily Double flags (safety)
    this.isDailyDouble = false;
    this.dailyDoubleWager = 0;

    ui.hideClue();
    this.currentQuestion = null;
    this.buzzedPlayer = null;
    this.playersWhoAnswered = [];

    // Check if round is complete
    const roundData = this.currentRound === 'jeopardy'
      ? this.gameBoard.jeopardy
      : this.gameBoard.doubleJeopardy;

    const allQuestionsUsed = roundData.questions.every(q =>
      this.usedQuestions.includes(q.id)
    );

    if (allQuestionsUsed) {
      this.advanceRound();
    }
  },

  /**
   * Advance to the next round
   */
  advanceRound() {
    if (this.currentRound === 'jeopardy') {
      // Move to Double Jeopardy
      this.currentRound = 'double-jeopardy';

      // Player with lowest score goes first in Double Jeopardy
      if (this.players[1].score < this.players[2].score) {
        this.playerInControl = 1;
      } else if (this.players[2].score < this.players[1].score) {
        this.playerInControl = 2;
      }
      // If tied, keep current control

      ui.renderBoard(this.gameBoard.doubleJeopardy, 'double-jeopardy');
      ui.setRoundIndicator('DOUBLE JEOPARDY FOR JACQUELINE!');
      ui.updateControlIndicator(this.playerInControl);
      console.log(`Advanced to Double Jeopardy. Player ${this.playerInControl} in control (lowest score)`);
    } else if (this.currentRound === 'double-jeopardy') {
      // Move to Final Jeopardy
      this.currentRound = 'final-jeopardy';
      this.startFinalJeopardy();
    }
  },

  /**
   * Start Final Jeopardy
   */
  startFinalJeopardy() {
    if (!this.gameBoard.finalJeopardy) {
      this.endGame();
      return;
    }

    ui.showFinalJeopardy(
      this.gameBoard.finalJeopardy.category,
      this.players[1].score,
      this.players[2].score
    );
  },

  /**
   * Submit Final Jeopardy wagers
   */
  submitFinalJeopardyWagers(wager1, wager2) {
    console.log(`=== SUBMITTING FINAL JEOPARDY WAGERS ===`);
    console.log(`Player 1 wager: ${wager1}, current score: ${this.players[1].score}`);
    console.log(`Player 2 wager: ${wager2}, current score: ${this.players[2].score}`);
    this.finalJeopardyWagers = { 1: wager1, 2: wager2 };
    ui.showFinalJeopardyQuestion(this.gameBoard.finalJeopardy.answer);
    this.startFinalJeopardyTimer();
  },

  /**
   * Start Final Jeopardy 30-second timer
   */
  startFinalJeopardyTimer() {
    this.finalJeopardyTimeRemaining = 30;
    this.updateFinalJeopardyTimer();

    this.finalJeopardyTimerInterval = setInterval(() => {
      if (this.finalJeopardyTimeRemaining <= 0) {
        this.stopFinalJeopardyTimer();
        this.handleFinalJeopardyTimerExpire();
        return;
      }

      this.finalJeopardyTimeRemaining--;
      this.updateFinalJeopardyTimer();
    }, 1000);
  },

  /**
   * Stop Final Jeopardy timer
   */
  stopFinalJeopardyTimer() {
    if (this.finalJeopardyTimerInterval) {
      clearInterval(this.finalJeopardyTimerInterval);
      this.finalJeopardyTimerInterval = null;
    }
  },

  /**
   * Update Final Jeopardy timer display
   */
  updateFinalJeopardyTimer() {
    const timerCountdown = document.getElementById('fj-timer-countdown');
    const timerCircle = document.getElementById('fj-timer-circle');

    if (!timerCountdown || !timerCircle) return;

    timerCountdown.textContent = this.finalJeopardyTimeRemaining;

    // Change color based on remaining time
    timerCircle.classList.remove('warning', 'danger');

    if (this.finalJeopardyTimeRemaining <= 10) {
      timerCircle.classList.add('danger');
    } else if (this.finalJeopardyTimeRemaining <= 15) {
      timerCircle.classList.add('warning');
    }
  },

  /**
   * Handle Final Jeopardy timer expiration (auto-submit)
   */
  handleFinalJeopardyTimerExpire() {
    const answer1 = document.getElementById('fj-p1-answer').value.trim();
    const answer2 = document.getElementById('fj-p2-answer').value.trim();

    // Auto-submit with whatever answers are entered (empty strings if none)
    console.log('Final Jeopardy timer expired, auto-submitting answers');
    this.submitFinalJeopardyAnswers(answer1 || '', answer2 || '');
  },

  /**
   * Submit Final Jeopardy answers (text input)
   */
  async submitFinalJeopardyAnswers(answer1, answer2) {
    // Stop the timer
    this.stopFinalJeopardyTimer();

    // Store user answers
    this.finalJeopardyUserAnswers = { 1: answer1, 2: answer2 };

    // Validate both answers
    try {
      const response1 = await fetch(`${this.apiUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clue: this.gameBoard.finalJeopardy.answer,
          correctAnswer: this.gameBoard.finalJeopardy.question,
          userAnswer: answer1
        })
      });

      const response2 = await fetch(`${this.apiUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clue: this.gameBoard.finalJeopardy.answer,
          correctAnswer: this.gameBoard.finalJeopardy.question,
          userAnswer: answer2
        })
      });

      const result1 = await response1.json();
      const result2 = await response2.json();

      this.finalJeopardyAnswers[1] = result1.correct;
      this.finalJeopardyAnswers[2] = result2.correct;

      // Calculate final scores
      this.calculateFinalJeopardyScores();

      // Show results screen
      this.showFinalJeopardyResults();

    } catch (error) {
      console.error('Error validating Final Jeopardy answers:', error);
      alert('Error validating answers. Please try again.');
    }
  },

  /**
   * Calculate Final Jeopardy scores
   */
  calculateFinalJeopardyScores() {
    console.log('=== CALCULATING FINAL JEOPARDY SCORES ===');
    // Adjust scores based on wagers and correctness
    for (let player = 1; player <= 2; player++) {
      const wager = this.finalJeopardyWagers[player];
      const correct = this.finalJeopardyAnswers[player];
      const scoreBefore = this.players[player].score;

      if (correct) {
        this.players[player].score += wager;
      } else {
        this.players[player].score -= wager;
      }

      const scoreAfter = this.players[player].score;
      console.log(`Player ${player}: Score ${scoreBefore} + wager ${wager} (${correct ? 'correct' : 'incorrect'}) = ${scoreAfter}`);
    }
  },

  /**
   * Show Final Jeopardy results screen
   */
  showFinalJeopardyResults() {
    ui.showFinalJeopardyResults(
      this.gameBoard.finalJeopardy.question,
      this.finalJeopardyUserAnswers[1],
      this.finalJeopardyUserAnswers[2],
      this.finalJeopardyAnswers[1],
      this.finalJeopardyAnswers[2],
      this.finalJeopardyWagers[1],
      this.finalJeopardyWagers[2],
      this.players[1].score,
      this.players[2].score
    );
  },

  /**
   * End the game and show winner
   */
  endGame() {
    const p1Score = this.players[1].score;
    const p2Score = this.players[2].score;

    let winner;
    if (p1Score > p2Score) {
      winner = 'Player 1 Wins!';
    } else if (p2Score > p1Score) {
      winner = 'Player 2 Wins!';
    } else {
      winner = "It's a Tie!";
    }

    ui.showGameOver(winner, p1Score, p2Score);

    // Mark questions as used
    this.saveUsedQuestions();
  },

  /**
   * Save used questions to the server
   */
  async saveUsedQuestions() {
    try {
      await fetch(`${this.apiUrl}/api/game/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: this.usedQuestions })
      });
      console.log('Marked questions as used');
    } catch (error) {
      console.error('Error saving used questions:', error);
    }
  },

  /**
   * Timer management
   */
  startTimer() {
    // Stop any existing timer first
    this.stopTimer();

    this.remainingTime = this.responseTime;
    ui.updateTimer(this.remainingTime, this.responseTime);

    this.timerInterval = setInterval(() => {
      if (this.remainingTime <= 0) {
        this.stopTimer();
        this.handleTimerExpire();
        return;
      }

      this.remainingTime--;
      ui.updateTimer(this.remainingTime, this.responseTime);
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  /**
   * Set response time from settings
   */
  setResponseTime(seconds) {
    this.responseTime = seconds;
  },

  /**
   * Toggle which player is in control
   */
  toggleControl() {
    this.playerInControl = this.playerInControl === 1 ? 2 : 1;
    ui.updateControlIndicator(this.playerInControl);
    console.log(`Control switched to Player ${this.playerInControl}`);
  }
};

// Initialize game on load
document.addEventListener('DOMContentLoaded', () => {
  game.initialize();
});
