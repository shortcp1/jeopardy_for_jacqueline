# Jeopardy Game - Claude Code Project Specification

## Project Overview
Build a two-player Jeopardy game using the Kaggle Jeopardy dataset with speech input, LLM answer validation, and authentic gameplay mechanics. The game should run locally on Mac with a Jeopardy-themed web interface.

## Tech Stack
- **Frontend**: HTML/CSS/JavaScript with Jeopardy-themed UI
- **Backend**: Node.js with Express server
- **Speech**: Web Speech API (modular design for future Wispr Flow integration)
- **LLM**: OpenRouter API with Claude Haiku for answer validation
- **Data**: Kaggle Jeopardy CSV dataset (user-provided in `/data` folder)

## File Structure
```
/jeopardy-game
  /data
    jeopardy.csv (user provided)
    used_questions.json (auto-generated tracking)
  /public
    /css
      styles.css (Jeopardy theming - blue board, yellow text)
    /js
      game.js (core game logic)
      speechService.js (modular speech interface)
      ui.js (DOM manipulation and rendering)
    index.html
  /server
    server.js (Express server)
    questionManager.js (CSV parsing, question selection, filtering)
    llmService.js (OpenRouter API integration)
  package.json
  .env (API keys)
  README.md (setup instructions)
```

## Detailed Requirements

### 1. Data Management
- Parse Kaggle Jeopardy CSV on server startup
- Maintain `used_questions.json` to track previously played questions
- Filter out used questions from selection pool to prevent repeats
- Log all played questions after each game

### 2. Game Staging Phase
Create a staging screen with:
- **Difficulty selector**: Easy/Medium/Hard/Mix dropdown
- **Timer configuration**: Adjustable response time slider (default 15 seconds)
- **Category preview**: Display 6 randomly selected categories for Jeopardy round
- **Category swapping**: 
  - Each category has individual "swap" button to replace only that category
  - Unlimited individual category swaps
  - "Re-roll All Categories" button to regenerate all 6
- **Start Game** button to lock in selections and begin

**Category Swap UI Layout**:
```
[Category Name 1] [🔄 Swap]
[Category Name 2] [🔄 Swap]
[Category Name 3] [🔄 Swap]
[Category Name 4] [🔄 Swap]
[Category Name 5] [🔄 Swap]
[Category Name 6] [🔄 Swap]

[Re-roll All Categories] [Start Game]
```

### 3. Game Board Structure

**Jeopardy Round:**
- 6 categories × 5 questions ($200, $400, $600, $800, $1000)
- 1 randomly placed Daily Double

**Double Jeopardy Round:**
- 6 new categories × 5 questions ($400, $800, $1200, $1600, $2000)
- 2 randomly placed Daily Doubles

**Final Jeopardy:**
- Single question, both players wager

**Visual Design:**
- Blue Jeopardy board background (#060CE9 or similar)
- Yellow/gold text for categories and dollar amounts
- Category headers at top
- Grid of dollar values that disappear when selected
- Large centered area for question display

### 4. Buzzer System Mechanics
- **Player 1**: A key
- **Player 2**: L key
- **Flow**:
  1. Question is revealed on screen
  2. Buzzers activate (both players can buzz)
  3. First player to press their key locks out the other
  4. Locked-in player gets to answer via speech
  5. If answer is wrong:
     - Deduct question value from their score
     - Other player can now buzz in
  6. If second player also wrong, reveal answer and move on

### 5. Speech Input & Answer Validation

**Speech Service (speechService.js):**
- Use Web Speech API (Chrome/Edge compatible)
- Modular design to allow future Wispr Flow integration
- Interface:
```javascript
const speechService = {
  startListening: (callback) => {},
  stopListening: () => {},
  onResult: (callback) => {},
  onError: (callback) => {}
}
```

**Answer Validation Flow:**
1. Player buzzes in
2. Microphone activates automatically
3. Player speaks answer (with or without "What is" format)
4. Transcription sent to LLM via OpenRouter
5. LLM evaluates correctness against canonical answer
6. Response returned within 2-3 seconds
7. Points awarded/deducted, result displayed

**LLM Service (llmService.js):**
- Use OpenRouter API with Claude Haiku model
- Prompt template:
```
Question: {question}
Correct Answer: {correctAnswer}
User's Answer: {userTranscription}

Evaluate if the user's answer is correct. Accept answers with or without "What is" format. Consider synonyms, alternate phrasings, and minor spelling variations in speech transcription. Respond with JSON:
{
  "correct": true/false,
  "explanation": "brief reason"
}
```

### 6. Daily Double Mechanics
- Revealed AFTER player selects a clue
- Only the player in control (who selected the clue) can answer
- Player must wager BEFORE seeing the question
- Wager constraints:
  - Minimum: $5
  - Maximum: Current score OR maximum clue value in that round (whichever is higher)
- Speech input and LLM validation same as regular questions
- Award/deduct wagered amount based on correctness

### 7. Final Jeopardy
1. Display category to both players
2. Both players enter wagers simultaneously (min $0, max current score)
3. Reveal question
4. Both players answer via speech (sequential: Player 1 then Player 2)
5. LLM validates both answers
6. Scores adjusted based on wagers
7. Winner declared

### 8. Scoring & Game State
- Display both players' scores prominently at all times
- Track current player in control (who gets to select next clue)
- Player with control rotates when:
  - They answer incorrectly
  - Question goes unanswered by both
  - After Daily Doubles
- Starting player in control: random selection
- Negative scores are allowed

### 9. UI Components Required

**Main Game Screen:**
- Jeopardy board (6×5 grid)
- Player 1 score (left side)
- Player 2 score (right side)
- Current category/question display (large, centered)
- Timer countdown visualization (circular or bar)
- Buzzer status indicators (who buzzed in)
- Answer evaluation result display
- "Pause Game" button

**Visual Elements:**
- Jeopardy blue background (#060CE9)
- Gold/yellow text (#FFCC00)
- Category names in boxes at grid top
- Dollar amounts in grid cells
- Smooth animations for revealing questions
- Visual feedback for correct/incorrect answers
- Timer that changes color as time runs low

**Keyboard Shortcuts:**
- A / L: Buzz in
- Spacebar: Pause/Resume
- ESC: Exit to main menu
- R: Restart game

### 10. Question Selection Logic (questionManager.js)
- Filter questions by difficulty based on user selection
- Ensure category diversity (no duplicate categories per round)
- Randomly place Daily Doubles in different positions each game
- Exclude all questions in `used_questions.json`
- For each round, select 6 categories and 5 questions per category
- Map question values to appropriate dollar amounts for the round

### 11. Environment Configuration
Create `.env` file template:
```
OPENROUTER_API_KEY=your_key_here
PORT=3000
```

### 12. Package Dependencies
Required npm packages:
- express
- dotenv
- csv-parser (for reading Jeopardy dataset)
- axios or node-fetch (for OpenRouter API calls)
- cors

### 13. README Requirements
Include in README.md:
1. Setup instructions
2. How to obtain and place Kaggle Jeopardy dataset
3. Environment variable configuration
4. How to run the application
5. Gameplay instructions
6. Keyboard controls reference
7. How to swap speech service for Wispr Flow in the future

## User Flow Summary
1. Launch app → Staging screen appears
2. Select difficulty level and adjust timer
3. Preview 6 categories → swap individual categories as desired
4. Click "Start Game"
5. Play Jeopardy Round (30 questions with 1 Daily Double)
6. Play Double Jeopardy Round (30 questions with 2 Daily Doubles)
7. Final Jeopardy (both players wager and answer)
8. Winner declared → "Play Again" option returns to staging

## Success Criteria
- ✅ Game runs smoothly on Mac in Chrome/Edge browser
- ✅ Speech recognition accurately captures spoken answers
- ✅ LLM validates answers within 2-3 seconds
- ✅ Buzzer system is responsive and fair
- ✅ UI looks polished and Jeopardy-like
- ✅ No question repeats across multiple games
- ✅ Daily Doubles work authentically
- ✅ Scoring is accurate throughout game
- ✅ Timer enforces time limits properly
- ✅ Individual category swapping works in staging phase

## Additional Notes
- Focus on functionality first, then polish UI
- Keep speech service modular for easy future integration with Wispr Flow
- Optimize LLM prompts for cost (Claude Haiku is cheap but still optimize)
- Handle edge cases: tied games, negative scores, network errors
- Consider adding optional sound effects (buzzer sound, theme music) as enhancement

---

**End of Specification**
