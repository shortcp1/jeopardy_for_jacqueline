# Jeopardy Game

A two-player Jeopardy game with speech recognition and AI-powered answer validation. Built with Node.js, Express, and the Anthropic API.

## Features

- Full Jeopardy gameplay: Jeopardy Round, Double Jeopardy Round, and Final Jeopardy
- Speech recognition for answering questions (Web Speech API)
- AI-powered answer validation using Claude Haiku
- Authentic buzzer system with keyboard controls
- Category selection and swapping in staging phase
- Daily Doubles with wagering
- Tracks used questions to prevent repeats
- Jeopardy-themed UI with authentic blue and gold colors

## Requirements

- Node.js (v14 or higher)
- A modern browser with Web Speech API support (Chrome or Edge recommended)
- Anthropic API key

## Setup Instructions

### 1. Get Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you'll need it in step 4)

### 2. Verify Your Dataset

Make sure your Jeopardy dataset file is in the `/data` folder:
```
/data/combined_season1-41.tsv
```

The TSV file should have these columns:
- round
- clue_value
- daily_double_value
- category
- comments
- answer
- question
- air_date
- notes

### 3. Install Dependencies

```bash
npm install
```

This will install:
- express (web server)
- dotenv (environment variables)
- cors (cross-origin requests)
- @anthropic-ai/sdk (Claude API client)

### 4. Configure Environment Variables

Edit the `.env` file and add your Anthropic API key:

```
ANTHROPIC_API_KEY=your_actual_api_key_here
PORT=3000
```

**Important:** Replace `your_actual_api_key_here` with your real API key from step 1.

### 5. Start the Server

```bash
npm start
```

You should see:
```
Jeopardy game server running on http://localhost:3000
API ready at http://localhost:3000/api
Question manager initialized
Loaded [number] questions
```

### 6. Open the Game

Open your browser (Chrome or Edge) and go to:
```
http://localhost:3000
```

## How to Play

### Staging Phase

1. **Adjust Timer**: Use the slider to set response time (5-30 seconds)
2. **Review Categories**: Preview the 6 categories for each round
3. **Swap Categories**: Click 🔄 Swap to replace individual categories
4. **Re-roll All**: Click "Re-roll All Categories" to regenerate all 6 categories
5. **Start Game**: Click "Start Game" when you're ready

### During the Game

#### Buzzer Controls
- **Player 1**: Press `A` key to buzz in
- **Player 2**: Press `L` key to buzz in

#### Answering Questions
1. Select a clue by clicking on a dollar amount
2. Read the clue when it appears
3. Press your buzzer key (A or L)
4. Speak your answer clearly into your microphone
   - You can say "What is..." or just the answer
   - The AI will validate your response
5. Points are awarded or deducted automatically

#### Daily Doubles
- Revealed after selecting a clue
- Only the player in control can answer
- Enter your wager before seeing the question
- Minimum wager: $5
- Maximum wager: Your current score OR the highest clue value in that round (whichever is higher)

#### Scoring
- Correct answers: Add the clue value to your score
- Incorrect answers: Subtract the clue value from your score
- If you answer incorrectly, the other player gets a chance to buzz in
- Negative scores are allowed
- The player who answers correctly gets control and selects the next clue

### Final Jeopardy

1. The category is revealed to both players
2. Both players enter their wagers (minimum $0, maximum current score)
3. The clue is revealed
4. Player 1 speaks their answer
5. Player 2 speaks their answer
6. Scores are adjusted based on correctness
7. Winner is declared!

### After the Game

Click "Play Again" to return to the staging screen and start a new game with fresh categories.

## Browser Compatibility

### Recommended
- **Google Chrome** (latest version)
- **Microsoft Edge** (latest version)

### Speech Recognition
The game uses the Web Speech API, which requires:
- Chrome or Edge browser
- Microphone access (you'll be prompted)
- Internet connection (speech processing happens in the cloud)

If speech recognition isn't working:
1. Make sure you're using Chrome or Edge
2. Check that your microphone is connected
3. Grant microphone permissions when prompted
4. Check browser console for errors

## File Structure

```
/jeopardy-game
  /data
    combined_season1-41.tsv    # Jeopardy dataset
    used_questions.json         # Auto-generated tracking file
  /public
    /css
      styles.css                # Jeopardy-themed styles
    /js
      speechService.js          # Web Speech API interface
      game.js                   # Core game logic
      ui.js                     # DOM manipulation
    index.html                  # Main game interface
  /server
    server.js                   # Express server
    questionManager.js          # Question selection & tracking
    llmService.js              # Anthropic API integration
  package.json
  .env                          # Environment variables
  README.md                     # This file
```

## Cost Considerations

The game uses Claude 3.5 Haiku for answer validation, which is very affordable:
- **Input**: $0.80 per million tokens
- **Output**: $4.00 per million tokens

Typical game cost:
- ~60 answers validated per game (Jeopardy + Double Jeopardy + Final)
- ~100-200 tokens per validation
- Estimated cost: **$0.01-0.02 per game**

## Troubleshooting

### Game won't start
- Make sure the server is running (`npm start`)
- Check that your `.env` file has a valid API key
- Verify the TSV file is in `/data` folder

### Speech recognition not working
- Use Chrome or Edge browser
- Grant microphone permissions
- Check that your microphone is working
- Try refreshing the page

### "No questions loaded" error
- Verify the TSV file path: `/data/combined_season1-41.tsv`
- Check the TSV file format matches the expected structure
- Look at server console for parsing errors

### API validation errors
- Verify your Anthropic API key is correct in `.env`
- Check you have API credits/billing set up
- Look at server console for detailed error messages

### Questions repeating
- The game tracks used questions in `/data/used_questions.json`
- This file is automatically created and updated
- If you want to replay questions, delete this file

## Future Enhancements

### Wispr Flow Integration
The speech service is modular and ready for Wispr Flow integration:

1. Install Wispr Flow SDK:
```bash
npm install wispr-flow-sdk
```

2. Update `speechService.js`:
```javascript
// Replace Web Speech API initialization with Wispr Flow
const wisprFlow = require('wispr-flow-sdk');

speechService.initialize = function() {
  // Initialize Wispr Flow instead
  this.recognition = wisprFlow.createRecognizer();
  // Configure and return
};
```

3. Update the `startListening` and `stopListening` methods to use Wispr Flow's API

## Credits

- Dataset: Jeopardy questions from seasons 1-41
- AI: Claude 3.5 Haiku by Anthropic
- Speech: Web Speech API (Chrome/Edge)

## License

MIT License - Feel free to modify and share!

---

**Enjoy your game! May the best Jeopardy champion win!** 🏆
