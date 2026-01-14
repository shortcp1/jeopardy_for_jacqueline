const fs = require('fs');
const path = require('path');

class QuestionManager {
  constructor() {
    this.allQuestions = [];
    this.usedQuestions = new Set();
    this.usedQuestionsFile = path.join(__dirname, '../data/used_questions.json');
    this.tsvFile = path.join(__dirname, '../data/combined_season1-41.tsv');
  }

  // Initialize: load TSV and used questions
  async initialize() {
    await this.loadUsedQuestions();
    await this.loadTSV();
    console.log(`Loaded ${this.allQuestions.length} questions`);
    console.log(`${this.usedQuestions.size} questions already used`);
  }

  // Load used questions from JSON file
  async loadUsedQuestions() {
    try {
      if (fs.existsSync(this.usedQuestionsFile)) {
        const data = fs.readFileSync(this.usedQuestionsFile, 'utf8');
        const usedArray = JSON.parse(data);
        this.usedQuestions = new Set(usedArray);
      }
    } catch (error) {
      console.error('Error loading used questions:', error);
      this.usedQuestions = new Set();
    }
  }

  // Parse TSV file
  async loadTSV() {
    try {
      const data = fs.readFileSync(this.tsvFile, 'utf8');
      const lines = data.split('\n');
      const headers = lines[0].split('\t');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split('\t');
        const question = {};

        headers.forEach((header, index) => {
          question[header.trim()] = values[index] ? values[index].trim() : '';
        });

        // Only include questions from rounds 1 and 2 (Jeopardy and Double Jeopardy)
        // We'll handle Final Jeopardy separately
        if (question.round === '1' || question.round === '2') {
          // Create unique ID for question
          const questionId = `${question.round}_${question.category}_${question.question}_${question.answer}`;

          if (!this.usedQuestions.has(questionId)) {
            question.id = questionId;
            this.allQuestions.push(question);
          }
        }
      }
    } catch (error) {
      console.error('Error loading TSV:', error);
      throw error;
    }
  }

  // Get random categories for a round
  getRandomCategories(count = 6) {
    // Get unique categories
    const categoryMap = new Map();

    for (const q of this.allQuestions) {
      if (!categoryMap.has(q.category)) {
        categoryMap.set(q.category, []);
      }
      categoryMap.get(q.category).push(q);
    }

    // Filter categories that have at least 5 questions
    const validCategories = Array.from(categoryMap.entries())
      .filter(([_, questions]) => questions.length >= 5);

    // Shuffle and select categories
    const shuffled = validCategories.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(([category]) => category);
  }

  // Get questions for specific categories
  getQuestionsForCategories(categories, round) {
    const result = [];

    for (const category of categories) {
      const categoryQuestions = this.allQuestions
        .filter(q => q.category === category)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);

      // Map questions to dollar values based on round
      const values = round === 1
        ? [200, 400, 600, 800, 1000]
        : [400, 800, 1200, 1600, 2000];

      categoryQuestions.forEach((q, index) => {
        result.push({
          ...q,
          displayValue: values[index],
          category: category
        });
      });
    }

    return result;
  }

  // Generate a complete game board
  generateGameBoard() {
    // Jeopardy Round
    const jeopardyCategories = this.getRandomCategories(6);
    const jeopardyQuestions = this.getQuestionsForCategories(jeopardyCategories, 1);

    // Place 1 Daily Double randomly
    const jeopardyDD = Math.floor(Math.random() * jeopardyQuestions.length);
    jeopardyQuestions[jeopardyDD].isDailyDouble = true;

    // Double Jeopardy Round
    const doubleJeopardyCategories = this.getRandomCategories(6);
    const doubleJeopardyQuestions = this.getQuestionsForCategories(doubleJeopardyCategories, 2);

    // Place 2 Daily Doubles randomly (different positions)
    // Rules: 1) Cannot be in $400 row (valueIndex 1)
    //        2) Must be in different categories
    // Indexing: questionIndex = categoryIndex * 5 + valueIndex
    // Categories 0-5, valueIndex 0-4 (0=$200, 1=$400, 2=$600, 3=$800, 4=$1000)

    // Get valid positions (exclude $400 row where valueIndex === 1)
    const validPositions = [];
    for (let i = 0; i < doubleJeopardyQuestions.length; i++) {
      const valueIndex = i % 5; // Row within category
      if (valueIndex !== 1) { // Exclude $400 row
        validPositions.push(i);
      }
    }

    // Pick first DD from valid positions
    const djDD1 = validPositions[Math.floor(Math.random() * validPositions.length)];
    const djDD1Category = Math.floor(djDD1 / 5); // Category index (0-5)

    // Pick second DD from valid positions, ensuring different category
    let djDD2;
    let attempts = 0;
    do {
      djDD2 = validPositions[Math.floor(Math.random() * validPositions.length)];
      const djDD2Category = Math.floor(djDD2 / 5);
      if (djDD2 !== djDD1 && djDD2Category !== djDD1Category) {
        break;
      }
      attempts++;
    } while (attempts < 100);

    doubleJeopardyQuestions[djDD1].isDailyDouble = true;
    doubleJeopardyQuestions[djDD2].isDailyDouble = true;

    // Final Jeopardy - get one random Final Jeopardy question
    const finalJeopardyQuestion = this.getFinalJeopardyQuestion();

    return {
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
  }

  // Get Final Jeopardy question (round = 3 or FJ)
  getFinalJeopardyQuestion() {
    try {
      const data = fs.readFileSync(this.tsvFile, 'utf8');
      const lines = data.split('\n');
      const headers = lines[0].split('\t');

      const finalQuestions = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split('\t');
        const question = {};

        headers.forEach((header, index) => {
          question[header.trim()] = values[index] ? values[index].trim() : '';
        });

        // Final Jeopardy can be marked as round 3 or "FJ"
        if (question.round === '3' || question.round === 'FJ') {
          const questionId = `${question.round}_${question.category}_${question.question}_${question.answer}`;

          if (!this.usedQuestions.has(questionId)) {
            question.id = questionId;
            finalQuestions.push(question);
          }
        }
      }

      if (finalQuestions.length === 0) {
        return null;
      }

      // Return random Final Jeopardy question
      return finalQuestions[Math.floor(Math.random() * finalQuestions.length)];
    } catch (error) {
      console.error('Error getting Final Jeopardy question:', error);
      return null;
    }
  }

  // Swap a single category
  swapCategory(oldCategory, currentCategories) {
    // Get all categories excluding current ones
    const categoryMap = new Map();

    for (const q of this.allQuestions) {
      if (!categoryMap.has(q.category)) {
        categoryMap.set(q.category, []);
      }
      categoryMap.get(q.category).push(q);
    }

    const availableCategories = Array.from(categoryMap.entries())
      .filter(([cat, questions]) =>
        questions.length >= 5 && !currentCategories.includes(cat)
      )
      .map(([cat]) => cat);

    if (availableCategories.length === 0) {
      return null;
    }

    // Return random available category
    return availableCategories[Math.floor(Math.random() * availableCategories.length)];
  }

  // Mark questions as used after game completion
  markQuestionsAsUsed(questionIds) {
    questionIds.forEach(id => this.usedQuestions.add(id));
    this.saveUsedQuestions();
  }

  // Save used questions to file
  saveUsedQuestions() {
    try {
      const usedArray = Array.from(this.usedQuestions);
      fs.writeFileSync(
        this.usedQuestionsFile,
        JSON.stringify(usedArray, null, 2),
        'utf8'
      );
      console.log(`Saved ${usedArray.length} used questions`);
    } catch (error) {
      console.error('Error saving used questions:', error);
    }
  }
}

module.exports = QuestionManager;
