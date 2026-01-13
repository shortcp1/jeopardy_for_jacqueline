require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const QuestionManager = require('./questionManager');
const LLMService = require('./llmService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize services
const questionManager = new QuestionManager();
const llmService = new LLMService(process.env.ANTHROPIC_API_KEY);

// Store current game state (in production, use session management)
let currentGameBoard = null;

// Initialize question manager
questionManager.initialize().then(() => {
  console.log('Question manager initialized');
}).catch(error => {
  console.error('Failed to initialize question manager:', error);
  process.exit(1);
});

// Routes

// Get random categories for staging
app.get('/api/categories/random', (req, res) => {
  try {
    const count = parseInt(req.query.count) || 6;
    const categories = questionManager.getRandomCategories(count);
    res.json({ categories });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Swap a single category
app.post('/api/categories/swap', (req, res) => {
  try {
    const { oldCategory, currentCategories } = req.body;
    const newCategory = questionManager.swapCategory(oldCategory, currentCategories);

    if (!newCategory) {
      return res.status(404).json({ error: 'No available categories to swap' });
    }

    res.json({ newCategory });
  } catch (error) {
    console.error('Error swapping category:', error);
    res.status(500).json({ error: 'Failed to swap category' });
  }
});

// Generate a new game board
app.post('/api/game/new', (req, res) => {
  try {
    const gameBoard = questionManager.generateGameBoard();
    currentGameBoard = gameBoard;
    res.json(gameBoard);
  } catch (error) {
    console.error('Error generating game board:', error);
    res.status(500).json({ error: 'Failed to generate game board' });
  }
});

// Get game board with custom categories
app.post('/api/game/custom', (req, res) => {
  try {
    const { jeopardyCategories, doubleJeopardyCategories } = req.body;

    // Generate questions for selected categories
    const jeopardyQuestions = questionManager.getQuestionsForCategories(jeopardyCategories, 1);
    const doubleJeopardyQuestions = questionManager.getQuestionsForCategories(doubleJeopardyCategories, 2);

    // Place Daily Doubles
    const jeopardyDD = Math.floor(Math.random() * jeopardyQuestions.length);
    jeopardyQuestions[jeopardyDD].isDailyDouble = true;

    const djDD1 = Math.floor(Math.random() * doubleJeopardyQuestions.length);
    let djDD2 = Math.floor(Math.random() * doubleJeopardyQuestions.length);
    while (djDD2 === djDD1) {
      djDD2 = Math.floor(Math.random() * doubleJeopardyQuestions.length);
    }
    doubleJeopardyQuestions[djDD1].isDailyDouble = true;
    doubleJeopardyQuestions[djDD2].isDailyDouble = true;

    const finalJeopardyQuestion = questionManager.getFinalJeopardyQuestion();

    const gameBoard = {
      jeopardy: {
        categories: jeopardyCategories,
        questions: jeopardyQuestions
      },
      doubleJeopardy: {
        categories: doubleJeopardyCategories,
        questions: doubleJeopardyQuestions
      },
      finalJeopardy: finalJeopardyQuestion
    };

    currentGameBoard = gameBoard;
    res.json(gameBoard);
  } catch (error) {
    console.error('Error generating custom game board:', error);
    res.status(500).json({ error: 'Failed to generate custom game board' });
  }
});

// Validate an answer
app.post('/api/validate', async (req, res) => {
  try {
    const { clue, correctAnswer, userAnswer } = req.body;

    if (!clue || !correctAnswer || !userAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await llmService.validateAnswer(clue, correctAnswer, userAnswer);
    res.json(result);
  } catch (error) {
    console.error('Error validating answer:', error);
    res.status(500).json({
      correct: false,
      explanation: 'Error validating answer'
    });
  }
});

// Mark questions as used (called at end of game)
app.post('/api/game/complete', (req, res) => {
  try {
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ error: 'questionIds must be an array' });
    }

    questionManager.markQuestionsAsUsed(questionIds);
    res.json({ success: true, message: `Marked ${questionIds.length} questions as used` });
  } catch (error) {
    console.error('Error marking questions as used:', error);
    res.status(500).json({ error: 'Failed to mark questions as used' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    questionsLoaded: questionManager.allQuestions.length,
    usedQuestions: questionManager.usedQuestions.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Jeopardy game server running on http://localhost:${PORT}`);
  console.log(`API ready at http://localhost:${PORT}/api`);
});
