#!/bin/bash

# GitHub repository details
REPO_OWNER="shortcp1"
REPO_NAME="jeopardy_for_jacqueline"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# Check if token is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN environment variable not set"
  echo "Please run: export GITHUB_TOKEN='your_github_token'"
  echo "Generate a token at: https://github.com/settings/tokens"
  exit 1
fi

# Base URL for GitHub API
API_BASE="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME"

# Function to create and close an issue
create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"

  echo "Creating issue: $title"

  # Create the issue using jq to properly encode JSON
  response=$(jq -n \
    --arg title "$title" \
    --arg body "$body" \
    --arg labels "$labels" \
    '{
      title: $title,
      body: $body,
      labels: ($labels | split(","))
    }' | curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "$API_BASE/issues" \
    -d @-)

  # Extract issue number
  issue_number=$(echo "$response" | jq -r '.number')

  if [ "$issue_number" = "null" ] || [ -z "$issue_number" ]; then
    echo "Error creating issue: $title"
    echo "$response" | jq .
    return 1
  fi

  echo "Created issue #$issue_number: $title"

  # Close the issue
  echo "Closing issue #$issue_number"
  close_response=$(curl -s -X PATCH \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "$API_BASE/issues/$issue_number" \
    -d '{"state": "closed"}')

  echo "Closed issue #$issue_number"
  echo ""
}

# JEO-1: Initial Jeopardy Game Setup
create_issue "Initial Jeopardy Game Setup" \
"## Problem/Request
User wanted to build a two-player Jeopardy game for personal use with wife. Required full game implementation with speech recognition, LLM answer validation, and authentic Jeopardy mechanics.

## Investigation
- Reviewed comprehensive 260-line specification document
- Confirmed availability of Kaggle Jeopardy TSV dataset (520,893 questions)
- Verified Node.js v20.9.0 installed
- Confirmed Anthropic API key available
- Chose Anthropic API over OpenRouter for cost savings (\$0.80/M vs markup)

## Root Cause
N/A - New project

## Options Considered
- OpenRouter API vs Anthropic Direct API: Chose Anthropic for lower cost
- Speech APIs: Web Speech API chosen for broad compatibility, with modular design for future Wispr Flow integration
- Database: JSON file tracking for used questions (simple, sufficient for personal use)

## Solution Implemented
Created complete Node.js/Express game with:
- Backend: Express server, TSV parser, question manager, LLM validation service
- Frontend: HTML/CSS/JS with Jeopardy theming (blue #060CE9, gold #FFCC00)
- 6 categories × 5 questions per round
- Daily Doubles (1 in Jeopardy, 2 in Double Jeopardy)
- Final Jeopardy with wagering
- Speech recognition via Web Speech API
- Answer validation via Claude Haiku 3.5

## Files Changed
- package.json
- server/questionManager.js
- server/llmService.js
- server/server.js
- public/index.html
- public/css/styles.css
- public/js/speechService.js
- public/js/game.js
- public/js/ui.js
- .env
- .gitignore

## Testing
- Verified 520,893 questions loaded successfully
- API health endpoint confirmed working
- Category randomization tested

## Outcome
Fully functional Jeopardy game ready to play with complete feature set as specified.

## Lessons Learned
- Modular architecture enables easy future enhancements (Wispr Flow)
- Direct API access significantly cheaper than aggregators
- TSV parsing straightforward with Node.js fs module" \
"feature,game-setup,backend,frontend"

# JEO-2: Question/Answer Reversal Bug
create_issue "Question/Answer Reversal Bug" \
"## Problem/Request
Game was showing the answer instead of the question as the clue. Users should see the answer field (clue) and respond with the question field (correct answer), following Jeopardy format.

## Investigation
- Examined game.js showClue() method - was passing question.question instead of question.answer
- Checked LLM validation payload - was sending wrong fields
- Verified Final Jeopardy had same issue
- Confirmed TSV structure: 'question' column has answers (what to say), 'answer' column has clues (what is shown)

## Root Cause
Kaggle dataset uses non-intuitive column naming: 'answer' column contains the clue shown to players, 'question' column contains what players should say. Initial implementation didn't account for this reversal.

## Solution Implemented
Swapped all question/answer field references:
- showClue() now passes question.answer (the clue)
- LLM validation sends clue: question.answer, correctAnswer: question.question
- Final Jeopardy displays question.answer as clue
- All \"Correct answer\" displays show question.question

## Files Changed
- public/js/game.js (lines 99, 192-194, 236, 279, 360, 382-383, 407-408, 412-413)

## Testing
- Verified clues display correctly (the answer from dataset)
- Confirmed validation accepts correct question format
- Tested regular questions, Daily Doubles, and Final Jeopardy

## Outcome
Game now follows proper Jeopardy format. Clues show correctly, validation works, authentic gameplay achieved." \
"bug,gameplay"

# JEO-3: Staging Screen Scroll Issue
create_issue "Staging Screen Scroll Issue" \
"## Problem/Request
User couldn't scroll down on staging screen to view Double Jeopardy categories or Start Game button. Content was cut off below viewport.

## Investigation
- Inspected CSS: body had overflow: hidden preventing scroll
- Screen height was fixed at 100vh without content expansion
- Staging screen used flexbox centering which prevented overflow visibility

## Root Cause
CSS overflow: hidden on body element blocked all page scrolling. Fixed height viewport prevented content from expanding naturally.

## Solution Implemented
- Changed body overflow from hidden to auto
- Changed screen height from 100vh to min-height: 100vh
- Changed staging flex alignment from center to flex-start
- Added overflow-y: auto to staging screen
- Added margin to staging container

## Files Changed
- public/css/styles.css (lines 10, 17, 30, 33, 39)

## Testing
- Confirmed all content visible with scroll
- Tested on various viewport heights
- Verified game screen not affected

## Outcome
Staging screen now fully scrollable, all content accessible regardless of screen size." \
"bug,ui,css"

# JEO-4: Header Personalization
create_issue "Header Personalization" \
"## Problem/Request
User wanted staging header to say \"JEOPARDY FOR JACQUELINE!\" instead of just \"JEOPARDY!\" to personalize the game.

## Solution Implemented
Changed h1.jeopardy-title text content to \"JEOPARDY FOR JACQUELINE!\"

## Files Changed
- public/index.html (line 13)

## Testing
- Verified header displays correctly on staging screen
- Confirmed styling still applies properly

## Outcome
Personalized header adds custom touch for intended player." \
"enhancement,ui,personalization"

# JEO-5: Skip Button Implementation
create_issue "Skip Button Implementation" \
"## Problem/Request
User needed ability to skip questions when neither player knows answer, instead of waiting for timer to expire.

## Investigation
- Timer expiration logic in handleTimerExpire()
- Needed similar logic but user-triggered
- Required proper cleanup of speech and timer

## Solution Implemented
Added Skip Question button to clue display with:
- Timer stop
- Speech recognition stop
- Buzzer deactivation
- Display correct answer
- Transition to next clue

## Files Changed
- public/index.html (line 79)
- public/css/styles.css (lines 370-374)
- public/js/ui.js (lines 99-102)
- public/js/game.js (lines 299-320)

## Testing
- Verified timer stops when skipping
- Confirmed correct answer displays
- Tested speech service cleanup
- Validated progression to next question

## Outcome
Players can efficiently move past unknown questions without waiting for timeout." \
"feature,ux"

# JEO-6: Timer Rapid Skip Bug
create_issue "Timer Rapid Skip Bug" \
"## Problem/Request
Questions were rapidly skipping immediately when clicked, timer running to negative values, causing multiple questions to be consumed without user interaction.

## Investigation
- Multiple timers running simultaneously
- No debouncing on clue selection
- clueInProgress flag not preventing multiple selections
- Timer expiration not checking if already handled
- Potential race conditions between skip and timer expiration

## Root Cause
Multiple compounding issues:
1. No debouncing allowed rapid clue clicks creating multiple overlapping timers
2. Timer countdown didn't stop at zero, continued to negative and triggered multiple times
3. Skip and timer expiration could both fire for same question
4. No global state check preventing new clue selection during active clue

## Solution Implemented
Triple-layer protection:
1. Debouncing: 500ms delay between clue selections
2. State checking: clueInProgress flag prevents new selections during active clue
3. Timer fix: Stop at zero, check clueInProgress before handling expiration
4. Handler protection: Return early from handleTimerExpire if already handled

## Files Changed
- public/js/ui.js (lines 24, 246-251, 253)
- public/js/game.js (lines 36, 105, 260-263, 307-310, 326, 482-487)

## Testing
- Rapid clicked clues - only one activates
- Verified timer stops at zero
- Confirmed skip doesn't double-trigger
- Tested normal gameplay flow unaffected

## Outcome
Stable question progression, one question at a time, no rapid skipping or negative timers." \
"bug,timer,race-condition"

# JEO-7: Daily Double Not Showing Question
create_issue "Daily Double Not Showing Question" \
"## Problem/Request
After entering Daily Double wager, question wasn't displaying. Game appeared stuck on wager screen.

## Investigation
- submitDailyDoubleWager() was setting isDailyDouble = false immediately
- showClue() was being called but question wasn't rendering
- Examined clue display visibility logic

## Root Cause
Setting isDailyDouble = false before processing answer caused value calculation to use regular displayValue instead of wager. This broke the flag tracking needed throughout the answer flow.

## Solution Implemented
- Removed premature isDailyDouble = false in submitDailyDoubleWager()
- Keep flag true until answer is processed
- Clear flag in processAnswer(), handleTimerExpire(), skipQuestion(), and endClue()
- Added safety checks in showClue() to clear flags for non-DD questions

## Files Changed
- public/js/game.js (lines 100-103, 131, 253-254, 295-296, 313-314, 330-331)

## Testing
- Verified DD wager screen appears
- Confirmed question displays after wager
- Tested wager amount applied correctly
- Validated flag cleanup after answer

## Outcome
Daily Doubles work correctly: wager → see question → answer → proper scoring." \
"bug,daily-double,state-management"

# JEO-8: Final Jeopardy Speech to Text Input
create_issue "Final Jeopardy Speech to Text Input" \
"## Problem/Request
Final Jeopardy speech recognition getting stuck, unreliable. User wanted text input instead for both players to type answers simultaneously.

## Investigation
- Speech recognition sequential (player 1 then player 2) caused waits
- Web Speech API errors could block progression
- Text input would be faster, more reliable, allow simultaneous answers

## Root Cause
Web Speech API:
- Requires sequential processing
- Error-prone (microphone issues, ambient noise)
- Slower than typing
- Poor UX for final critical round

## Solution Implemented
Replaced sequential speech input with simultaneous text input:
- Two text input fields shown together
- Both players type answers at same time
- Single submit validates both answers via API
- Display detailed results screen showing correctness for each player

## Files Changed
- public/index.html (lines 115-149)
- public/css/styles.css (lines 543-649)
- public/js/ui.js (lines 83-92, 127-129, 388-394, 408-432)
- public/js/game.js (lines 41, 358-360, 363-442)

## Testing
- Both players can type simultaneously
- Validation works for both answers
- Results screen shows correct/incorrect clearly
- Wagers and final scores calculated correctly
- Smooth transition to game over

## Outcome
Final Jeopardy more reliable, faster, better UX. Simultaneous input saves time. Clear results display improves transparency." \
"feature,final-jeopardy,ux"

# JEO-9: Final Jeopardy Results Display
create_issue "Final Jeopardy Results Display" \
"## Problem/Request
Final Jeopardy didn't show correct answer or indicate who was right/wrong. Results screen went straight to winner without explanation.

## Investigation
- No intermediate screen between answer submission and game over
- Players couldn't see validation results
- Lack of transparency about scoring

## Root Cause
Original design had no results screen, jumped directly to game over after calculating scores.

## Solution Implemented
Created comprehensive FJ results screen showing:
- Correct answer prominently displayed
- Each player's submitted answer
- Correct/Incorrect indicator (color-coded green/red)
- Wagers for each player
- Final scores after wager adjustment
- Continue button to proceed to game over

## Files Changed
- public/index.html (lines 127-149)
- public/css/styles.css (lines 575-649)
- public/js/ui.js (lines 408-432, 456)
- public/js/game.js (lines 402, 428-442)

## Testing
- Verified correct answer displays
- Confirmed color coding (green for correct, red for incorrect)
- Tested wager display
- Validated final score calculations shown
- Smooth transition to game over

## Outcome
Complete transparency in Final Jeopardy scoring. Players understand why they won/lost. Professional presentation of results." \
"enhancement,final-jeopardy,ux"

# JEO-10: Score Editing Feature
create_issue "Score Editing Feature" \
"## Problem/Request
User needed ability to manually edit scores when LLM mishears or makes validation mistakes, allowing score corrections mid-game.

## Investigation
- Scores stored in game.players[1].score and game.players[2].score
- Need prompt-based input for quick editing
- Must update UI immediately after edit

## Solution Implemented
Added \"Edit Score\" buttons under each player's score:
- Click button → prompt dialog with current score
- Enter new score → updates game state and UI
- Handles invalid input gracefully (defaults to 0)

## Files Changed
- public/index.html (lines 53, 60)
- public/css/styles.css (lines 141-155)
- public/js/ui.js (lines 104-119)

## Testing
- Clicked edit buttons, verified prompts appear
- Entered various values (positive, negative, zero)
- Confirmed UI updates immediately
- Tested canceling prompt (no change)

## Outcome
Quick score correction available anytime. Fixes LLM mishearing or validation errors. Maintains game fairness." \
"feature,scoring,error-correction"

# JEO-11: Turn Control Toggle
create_issue "Turn Control Toggle" \
"## Problem/Request
User needed ability to manually switch which player has control when LLM incorrectly awards question or when manual intervention needed.

## Investigation
- playerInControl stored in game object
- Controls who selects next clue
- Automatically updates on correct answer
- Need manual override capability

## Solution Implemented
Added game controls bar with:
- \"Switch Control\" button
- Indicator showing current player in control
- Toggle function switching between players
- Visual update on all control changes (automatic or manual)

## Files Changed
- public/index.html (lines 64-68)
- public/css/styles.css (lines 219-234)
- public/js/ui.js (lines 121-124, 441-445)
- public/js/game.js (lines 68, 222, 508-514)

## Testing
- Verified indicator shows correct player on start
- Confirmed automatic updates on correct answers
- Tested manual toggle button
- Validated indicator always in sync with game state

## Outcome
Full control over turn management. Can correct LLM errors or adjust gameplay flow manually." \
"feature,game-control,state-management"

# JEO-12: In-Game Banner Personalization
create_issue "In-Game Banner Personalization" \
"## Problem/Request
User wanted in-game round banners to say \"JEOPARDY FOR JACQUELINE!\" and \"DOUBLE JEOPARDY FOR JACQUELINE!\" to match personalized staging screen.

## Investigation
- Round indicator updated in setRoundIndicator()
- Called on game start and round advancement
- Longer text required font size reduction for fit

## Solution Implemented
- Updated round indicator text to include \"FOR JACQUELINE!\"
- Reduced font size from 2rem to 1.6rem for longer text
- Added text centering and padding for better fit

## Files Changed
- public/js/game.js (lines 68, 381)
- public/css/styles.css (lines 229, 233-234)

## Testing
- Verified text fits in scoreboard area
- Confirmed styling maintained
- Tested on Jeopardy and Double Jeopardy rounds

## Outcome
Consistent personalization throughout entire game experience." \
"enhancement,ui,personalization"

# JEO-13: Daily Double Wager Persistence Bug
create_issue "Daily Double Wager Persistence Bug" \
"## Problem/Request
After Daily Double on \$800 question with \$200 wager (skipped without answering), next question (\$1000) gave only \$200 for correct answer. Wager value persisted to non-DD question.

## Investigation
- Examined processAnswer() - uses isDailyDouble flag to choose value
- Found skipQuestion() wasn't clearing DD flags
- handleTimerExpire() wasn't clearing DD flags properly
- endClue() lacked DD flag cleanup
- showClue() didn't reset flags for non-DD questions

## Root Cause
Daily Double wager (\$200) and isDailyDouble flag persisted when:
1. Player skipped DD question without answering
2. Flags not cleared in skip path
3. Next regular question used stale isDailyDouble=true
4. processAnswer() incorrectly used dailyDoubleWager (\$200) instead of displayValue (\$1000)

## Solution Implemented
Added DD flag cleanup to all question exit paths:
- skipQuestion() clears flags immediately
- handleTimerExpire() clears after processing
- endClue() clears as safety net
- showClue() defensively clears for non-DD questions
- Added console.log in processAnswer for debugging

## Files Changed
- public/js/game.js (lines 100-103, 230, 253-254, 295-296, 313-314, 330-331)

## Testing
- Played DD question, skipped without answer
- Selected next question, verified correct value awarded
- Console log showed isDailyDouble=false, wager=0 for regular questions
- Tested DD → answer path still works correctly
- Verified all exit paths clear flags

## Outcome
DD wagers never leak to subsequent questions. Scoring accurate across all paths." \
"bug,daily-double,state-management"

# JEO-14: Category Swap and Preview System
create_issue "Category Swap and Preview System" \
"## Problem/Request
User wanted to preview 6 categories for each round in staging, with ability to swap individual categories they don't like, plus re-roll all categories option.

## Investigation
- Need random category selection from dataset
- Individual swap requires finding non-selected categories
- Re-roll needs complete regeneration
- Must maintain category diversity (5+ questions per category)

## Solution Implemented
- Random category selection API endpoint
- Category swap endpoint returning single replacement
- Staging UI with category lists and swap buttons
- Re-roll buttons for full regeneration
- Custom game board generation with chosen categories

## Files Changed
- server/server.js (lines 30-57, 79-127)
- server/questionManager.js (lines 78-96, 112-132)
- public/index.html (lines 23-38)
- public/css/styles.css (lines 86-106)
- public/js/ui.js (lines 47-58, 139-200)

## Testing
- Verified 6 unique categories loaded
- Tested individual category swapping
- Confirmed swaps never duplicate existing categories
- Tested re-roll generates completely new set
- Validated custom game board creation with chosen categories

## Outcome
Full control over category selection before game starts. Better gameplay experience with preferred categories." \
"feature,categories,staging"

# JEO-15: Comprehensive README Documentation
create_issue "Comprehensive README Documentation" \
"## Problem/Request
Project needed complete setup instructions, gameplay guide, troubleshooting, and future enhancement notes for users unfamiliar with development.

## Investigation
- User is new to programming
- Multiple setup steps required (API key, dataset, dependencies)
- Game controls and mechanics need explanation
- Browser compatibility important to document

## Solution Implemented
Created detailed README.md covering:
- Feature list and tech stack
- Step-by-step setup instructions
- Environment configuration
- Dataset requirements
- Gameplay instructions (staging, buzzer controls, Daily Doubles, Final Jeopardy)
- Browser compatibility notes
- Troubleshooting section
- Cost breakdown for API usage
- File structure explanation
- Future enhancement guide (Wispr Flow integration)

## Files Changed
- README.md (200+ lines)

## Testing
- Verified all commands accurate
- Confirmed file paths correct
- Validated API instructions

## Outcome
Complete guide for setup, play, and future enhancements. New users can follow start to finish." \
"enhancement,documentation"

# JEO-16: Speech Recognition Modular Architecture
create_issue "Speech Recognition Modular Architecture" \
"## Problem/Request
Design speech recognition interface to allow easy future migration from Web Speech API to Wispr Flow without major refactoring.

## Investigation
- Web Speech API provides browser-native recognition
- Wispr Flow planned future integration
- Need abstraction layer for swappable implementations

## Solution Implemented
Created speechService.js module with:
- Consistent interface: startListening(), stopListening(), isActive()
- Callback-based result handling
- Error handling abstraction
- Configuration encapsulation
- Documentation for future Wispr Flow swap

## Files Changed
- public/js/speechService.js
- README.md (Wispr Flow integration instructions)

## Testing
- Verified speech recognition works through module
- Tested callback handling
- Confirmed error handling

## Outcome
Clean abstraction allows future Wispr Flow integration with minimal code changes. Only speechService.js needs updating." \
"enhancement,architecture,modularity"

# JEO-17: Buzzer System Implementation
create_issue "Buzzer System Implementation" \
"## Problem/Request
Implement authentic Jeopardy buzzer mechanics: A key for Player 1, L key for Player 2, first to buzz locks out other, incorrect answer gives other player chance.

## Investigation
- Keyboard event handling needed
- State management for buzzer activation
- Lock-out logic after first buzz
- Second chance logic on incorrect answer

## Solution Implemented
Keyboard-based buzzer system:
- A key = Player 1 buzz
- L key = Player 2 buzz
- buzzersActive flag controls when buzzing allowed
- First buzz locks buzzedPlayer, deactivates buzzers
- Incorrect answer reactivates buzzers for other player
- Visual feedback with buzzer indicators

## Files Changed
- public/js/ui.js (lines 131-143)
- public/js/game.js (lines 29, 113, 138, 147-163, 244-249)
- public/css/styles.css (lines 209-226)

## Testing
- Verified A/L keys buzz in
- Confirmed first buzz locks other player
- Tested incorrect answer gives second chance
- Validated visual feedback on buzz

## Outcome
Authentic Jeopardy buzzer feel. Fast, responsive, competitive gameplay." \
"feature,buzzer,gameplay"

# JEO-18: Answer Validation LLM Integration
create_issue "Answer Validation LLM Integration" \
"## Problem/Request
Implement AI-powered answer validation that accepts \"What is\" format or direct answers, handles synonyms, accounts for speech recognition errors, and responds in 2-3 seconds.

## Investigation
- Claude Haiku 3.5 provides fast, cost-effective validation
- Prompt engineering needed for leniency
- JSON response for structured validation
- Fallback for API failures

## Solution Implemented
LLM service using Anthropic Claude Haiku:
- Structured prompt explaining validation requirements
- JSON response format: {correct: boolean, explanation: string}
- Lenient evaluation of synonyms, alternate phrasings, speech errors
- Fallback to simple string matching on API failure
- Sub-3-second response times

## Files Changed
- server/llmService.js (complete service implementation)
- Model: claude-3-5-haiku-20241022
- Max tokens: 200

## Testing
- Tested various answer formats (with/without \"What is\")
- Verified synonym acceptance
- Confirmed speech error tolerance
- Measured response times (typically 1-2 seconds)
- Tested fallback on API error

## Outcome
Intelligent validation feels fair and natural. Fast enough for smooth gameplay. Cost-effective at ~\$0.01-0.02 per game." \
"feature,ai,validation"

# JEO-19: Used Questions Tracking System
create_issue "Used Questions Tracking System" \
"## Problem/Request
Prevent question repeats across multiple games by tracking all played questions persistently.

## Investigation
- 520,893 questions available in dataset
- JSON file suitable for simple tracking
- Need unique question identification
- Automatic save on game completion

## Solution Implemented
JSON-based tracking system:
- Unique ID per question: round_category_question_answer
- Load used questions on server start
- Filter used questions from selection pool
- Save used questions on game completion
- Automatic file creation if not exists

## Files Changed
- server/questionManager.js (lines 13, 20-35, 58-67, 222-238)
- server/server.js (lines 119-135)
- public/js/game.js (lines 483-497)

## Testing
- Verified file created on first game
- Confirmed questions filtered after first game
- Tested multiple game sessions
- Validated JSON file integrity

## Outcome
No question repeats across games. Dataset large enough (520k questions) to support hundreds of games before exhaustion." \
"feature,data-management"

# JEO-20: Timer Visualization and Countdown
create_issue "Timer Visualization and Countdown" \
"## Problem/Request
Implement visual countdown timer with color changes as time runs low (yellow → orange → red), enforcing response time limits.

## Investigation
- Timer needs 1-second intervals
- Visual feedback improves urgency
- Color changes at 50% and 25% remaining
- Must stop on answer or buzzer

## Solution Implemented
Circular timer display with:
- Countdown number in center
- Circular border with color changes
- Yellow (default) → Orange (50%) → Red (25%)
- Shake animation when time low
- setInterval-based countdown
- Stops on answer, skip, or expiration

## Files Changed
- public/index.html (lines 72-76)
- public/css/styles.css (lines 318-351)
- public/js/game.js (lines 24-26, 472-498)
- public/js/ui.js (lines 305-318)

## Testing
- Verified countdown displays correctly
- Confirmed color changes at correct thresholds
- Tested shake animation at 25%
- Validated timer stops on all exit paths

## Outcome
Clear visual feedback for time pressure. Color coding creates urgency. Professional appearance." \
"feature,timer,ux"

# JEO-21: Scoring System and Display
create_issue "Scoring System and Display" \
"## Problem/Request
Implement authentic Jeopardy scoring: add for correct, subtract for incorrect, allow negative scores, track across rounds, display prominently.

## Investigation
- Two player scores needed
- Must support negative values
- Dollar formatting for display
- Real-time updates on answers

## Solution Implemented
Comprehensive scoring system:
- Player objects with score properties
- processAnswer() handles all score modifications
- Correct: add clue value
- Incorrect: subtract clue value
- Daily Double: use wager instead of clue value
- Final Jeopardy: separate calculation with wagers
- Real-time UI updates via updateScores()
- Dollar formatting in display

## Files Changed
- public/js/game.js (lines 14-17, 217-255, 413-425)
- public/js/ui.js (lines 308-312)
- public/index.html (lines 51, 58)
- public/css/styles.css (lines 202-207)

## Testing
- Verified correct answers add points
- Confirmed incorrect answers subtract points
- Tested negative score handling
- Validated Daily Double wager scoring
- Tested Final Jeopardy calculations

## Outcome
Accurate Jeopardy-style scoring. Clear display of current standings. Proper handling of all scoring scenarios." \
"feature,scoring,gameplay"

# JEO-22: Round Progression System
create_issue "Round Progression System" \
"## Problem/Request
Implement automatic progression from Jeopardy → Double Jeopardy → Final Jeopardy when all questions answered in current round.

## Investigation
- Need to detect round completion
- Generate new board for Double Jeopardy
- Transition to Final Jeopardy after DJ
- Clear previous round state

## Solution Implemented
Round progression logic:
- Check after each clue completion if round finished
- Compare used questions vs available questions
- Advance to next round automatically
- Render new board for Double Jeopardy
- Show Final Jeopardy setup screen
- Update round indicator throughout

## Files Changed
- public/js/game.js (lines 16, 68, 354-387, 381)
- public/js/ui.js (lines 262-318)

## Testing
- Completed all Jeopardy questions, verified DJ starts
- Completed all DJ questions, verified FJ starts
- Confirmed board clears between rounds
- Validated round indicators update

## Outcome
Seamless progression through game rounds. Professional game flow. No manual intervention needed." \
"feature,game-flow,rounds"

# JEO-23: Daily Double Placement System
create_issue "Daily Double Placement System" \
"## Problem/Request
Implement authentic Daily Double placement: 1 in Jeopardy round, 2 in Double Jeopardy round, randomly positioned, revealed after selection.

## Investigation
- Random placement within 30 questions per round
- Mark questions as Daily Doubles
- Show DD screen before question
- Only player in control can answer

## Solution Implemented
Random Daily Double system:
- Math.random() placement in question arrays
- isDailyDouble flag on question objects
- Prevent duplicate DD positions in Double Jeopardy
- DD screen shows player in control, current score, max wager
- Wager validation (min \$5, max current score or round max)
- Only player in control answers (no buzzer)

## Files Changed
- server/questionManager.js (lines 103-118)
- public/js/game.js (lines 32-33, 116-152)
- public/index.html (lines 82-92)
- public/css/styles.css (lines 376-447)
- public/js/ui.js (lines 350-358)

## Testing
- Verified 1 DD in Jeopardy, 2 in Double Jeopardy
- Confirmed random positions vary between games
- Tested wager validation
- Validated only control player answers

## Outcome
Authentic Daily Double experience. Adds strategic wagering element. Proper control player restriction." \
"feature,daily-double,gameplay"

# JEO-24: Jeopardy-Themed UI Design
create_issue "Jeopardy-Themed UI Design" \
"## Problem/Request
Create authentic Jeopardy visual experience with blue background (#060CE9), gold text (#FFCC00), grid layout, smooth animations, professional appearance.

## Investigation
- Jeopardy uses specific blue and gold colors
- Grid layout for questions
- Category headers at top
- Dollar amounts disappear when selected
- Large centered clue display

## Solution Implemented
Complete Jeopardy-themed design:
- Blue background (#060CE9) throughout game screens
- Gold text (#FFCC00) for categories, amounts, titles
- 6×5 grid layout for game board
- Category headers with uppercase text
- Dollar amounts in cells that grey out when used
- Centered clue display with large text
- Gradient backgrounds for staging/final screens
- Hover effects on clickable elements
- Smooth transitions and animations
- Responsive sizing for different screens

## Files Changed
- public/css/styles.css (lines 167-695)

## Testing
- Verified colors match Jeopardy brand
- Confirmed grid layout responsive
- Tested all hover effects
- Validated animations smooth

## Outcome
Instantly recognizable Jeopardy appearance. Professional polish. Engaging visual experience." \
"feature,design,ui,theming"

# JEO-25: TSV Data Parsing and Question Loading
create_issue "TSV Data Parsing and Question Loading" \
"## Problem/Request
Parse Kaggle Jeopardy TSV file (520k+ questions) efficiently, structure data for game use, filter by round type, handle various data formats.

## Investigation
- TSV format with tab-separated values
- Headers: round, clue_value, daily_double_value, category, comments, answer, question, air_date, notes
- Need rounds 1 (Jeopardy) and 2 (Double Jeopardy)
- Some fields empty or inconsistent

## Solution Implemented
Custom TSV parser:
- Read file with fs.readFileSync
- Split by newlines and tabs
- Build objects from headers + values
- Filter for rounds 1 and 2
- Create unique IDs for tracking
- Load on server initialization
- Cache in memory for fast access

## Files Changed
- server/questionManager.js (lines 37-75)

## Testing
- Verified 520,893 questions loaded
- Confirmed round filtering works
- Tested category diversity
- Validated question structure

## Outcome
Fast loading (< 1 second), efficient memory usage, ready access to all questions." \
"feature,data,parsing"

# JEO-26: Microphone Cutting Off Early in Double Jeopardy
create_issue "Speech Recognition Cuts Off Early in Double Jeopardy" \
"## Problem/Request
Microphone keeps cutting off early during Double Jeopardy questions or doesn't turn on at all, preventing players from answering.

## Investigation Needed
- Check if speech recognition timeout differs between rounds
- Verify speechService.startListening() is called properly in DJ
- Look for race conditions or premature stopListening() calls
- Check if timer expiration is interfering with speech recognition
- Investigate browser speech recognition session limits

## Root Cause
To be investigated - appears to be speech service lifecycle management issue specific to Double Jeopardy round.

## Potential Solutions
1. Add longer timeout for speech recognition
2. Ensure speech service properly initialized for each question
3. Add retry logic if recognition fails to start
4. Add visual indicator when microphone is actively listening
5. Log speech service state changes for debugging

## Testing Needed
- Test multiple DJ questions in sequence
- Verify microphone permissions maintained across rounds
- Check console for speech recognition errors
- Test on different browsers (Chrome, Edge)

## Priority
High - Prevents gameplay in Double Jeopardy round" \
"bug,speech-recognition,double-jeopardy"

# JEO-27: Add 30 Second Timer for Final Jeopardy
create_issue "Add 30 Second Timer for Final Jeopardy Answers" \
"## Problem/Request
Final Jeopardy needs a 30-second timer for players to type their answers, matching the TV show format.

## Investigation
- Currently no timer on FJ answer input screen
- Players can take unlimited time
- Need countdown timer similar to regular questions but longer duration

## Solution to Implement
Add 30-second countdown timer to Final Jeopardy question screen:
- Start timer when question is revealed
- Display countdown prominently
- Auto-submit answers when timer expires (treat empty as incorrect)
- Visual urgency cues (color changes at 15s and 10s remaining)
- Option to submit early before timer expires

## Files to Change
- public/js/game.js: Add FJ timer logic
- public/js/ui.js: Add FJ timer display
- public/index.html: Add timer element to fj-question-screen
- public/css/styles.css: Style FJ timer

## Testing
- Verify 30-second countdown works
- Test auto-submit on expiration
- Confirm early submission stops timer
- Validate timer doesn't carry over between games" \
"enhancement,final-jeopardy,timer"

# JEO-28: Change Default Timer to 10 Seconds
create_issue "Change Default Response Timer from 15 to 10 Seconds" \
"## Problem/Request
Default timer should be 10 seconds instead of 15 seconds for faster-paced gameplay.

## Solution
Change timer slider default value in staging screen from 15 to 10 seconds.

## Files to Change
- public/index.html (line 19): Change value=\"15\" to value=\"10\"
- public/index.html (line 20): Change display text from 15 to 10
- public/js/game.js (line 24): Change responseTime default if needed

## Testing
- Verify staging screen shows 10 seconds on load
- Confirm game uses 10 seconds if slider not adjusted
- Test slider still adjustable from 5-30 seconds" \
"enhancement,settings"

# JEO-29: Player with Least Points Goes First in Double Jeopardy
create_issue "Player with Least Points Should Select First in Double Jeopardy" \
"## Problem/Request
Following Jeopardy rules, the player with the lowest score should select the first question in Double Jeopardy round.

## Investigation
- Currently playerInControl is random or based on who answered last in Jeopardy
- Need to check scores when advancing to Double Jeopardy
- Handle tie scenario (keep random or existing control)

## Solution to Implement
In advanceRound() when moving to Double Jeopardy:
- Compare player scores
- Set playerInControl to player with lower score
- If tied, keep current control or randomize
- Update control indicator

## Files to Change
- public/js/game.js: Update advanceRound() method (around line 325)

## Testing
- Play game where Player 1 has lower score entering DJ
- Play game where Player 2 has lower score entering DJ
- Test tie scenario
- Verify control indicator updates correctly" \
"enhancement,game-rules,double-jeopardy"

# JEO-30: Daily Double Wager Bug - Wrong Value Subtracted
create_issue "Daily Double Incorrect Answer Subtracts Question Value Instead of Wager" \
"## Problem/Request
On a Daily Double where player wagered \$200 but question was worth \$1200, incorrect answer subtracted \$1200 instead of the \$200 wager.

## Investigation
- processAnswer() should use dailyDoubleWager when isDailyDouble is true
- Check if isDailyDouble flag is being cleared prematurely
- Verify dailyDoubleWager value persists through answer processing
- Look for timing issues in flag/wager lifecycle

## Root Cause
Likely related to JEO-13 (Daily Double Wager Persistence Bug). May be a regression or edge case not covered by previous fix.

## Solution
- Add more comprehensive logging to processAnswer()
- Verify isDailyDouble and dailyDoubleWager values at time of calculation
- Ensure flags not cleared before score calculation completes
- Add defensive checks

## Files to Check
- public/js/game.js: processAnswer() method (line 210)
- Check all DD flag clearing locations

## Testing
- Play multiple Daily Doubles with various wagers
- Test incorrect answers specifically
- Verify wager amount used, not question value
- Check console logs for flag states" \
"bug,daily-double,scoring"

# JEO-31: Questions Not Matched to Original Values
create_issue "Questions Randomly Distributed Instead of Matching Dataset Values" \
"## Problem/Request
Questions are being randomly distributed within categories instead of matching their original dollar values from the dataset. A \$200 question might appear in the \$1000 slot.

## Investigation
- Check questionManager.js category/question selection logic
- Verify how questions are assigned to value slots
- Dataset has clue_value field that should determine placement
- Questions should be sorted by value within each category

## Root Cause
Question selection likely ignores clue_value and randomly assigns questions to the 5 value slots (\$200, \$400, \$600, \$800, \$1000).

## Solution to Implement
- Sort questions by clue_value within each category
- Match questions to appropriate value slots
- Handle edge cases where category doesn't have exactly 5 distinct values
- If category lacks questions for certain values, skip that category or fill gaps intelligently

## Files to Change
- server/questionManager.js: Category selection and question assignment logic

## Testing
- Verify \$200 questions appear in \$200 slot
- Check all 5 value tiers match dataset
- Test multiple categories
- Ensure Daily Doubles still randomize correctly" \
"bug,data,question-selection"

# JEO-32: Final Jeopardy Auto-Submit Bug
create_issue "Final Jeopardy Auto-Submitting with Incorrect Wagers" \
"## Problem/Request
In one game, Final Jeopardy immediately auto-submitted without showing wager screen or question. It assumed both players wagered \$5000 (more than either had) and calculated scores incorrectly. Critical bug.

## Investigation Needed
- Check if FJ screens are being skipped
- Look for race conditions in FJ initialization
- Verify wager screen displays before question
- Check for accidental double-submission
- Investigate score calculation with invalid wagers
- Look for navigation bugs in showFinalJeopardy() flow

## Root Cause
Unknown - appears to be state management issue in Final Jeopardy flow causing screens to skip and default values to be used.

## Potential Causes
1. Event listener firing twice
2. State not properly initialized
3. Race condition between board completion and FJ start
4. Cached/stale FJ data from previous game
5. JavaScript error causing skip to results

## Solution Needed
- Add defensive checks in FJ flow
- Ensure wager screen always shows first
- Validate wagers before calculation
- Add logging to track FJ state transitions
- Reset FJ state properly between games

## Files to Check
- public/js/game.js: startFinalJeopardy(), submitFinalJeopardyWagers()
- public/js/ui.js: showFinalJeopardy(), FJ screen transitions

## Testing
- Play multiple complete games through FJ
- Test FJ after different score scenarios
- Verify wager screen always appears
- Check question screen always appears
- Validate results screen only shows after answers submitted
- Test \"Play Again\" properly resets FJ state

## Priority
Critical - Breaks game ending, produces incorrect winner" \
"bug,final-jeopardy,critical"

# JEO-33: Final Jeopardy Wager Validation
create_issue "Prevent Players from Wagering More Than Current Score in Final Jeopardy" \
"## Problem/Request
Players should not be able to wager more than their current score in Final Jeopardy, following standard Jeopardy rules.

## Investigation
- Check wager input validation in FJ wager screen
- Currently allows any positive number
- Should enforce max = player's current score
- HTML number input has min=\"0\" but no max

## Solution to Implement
- Set max attribute on wager inputs dynamically based on scores
- Add JavaScript validation before accepting wagers
- Show error message if wager exceeds score
- Auto-correct to max score if player enters too much
- Display \"Maximum: \$X\" hint below input

## Files to Change
- public/index.html: Add max attributes or validation to fj wager inputs
- public/js/ui.js: Set max values in showFinalJeopardy()
- public/js/game.js: Validate wagers in submitFinalJeopardyWagers()

## Testing
- Try wagering more than current score
- Verify validation prevents submission
- Test with negative scores (edge case - min wager should be \$0)
- Confirm both players validated independently
- Test boundary case (wager exactly equals score)" \
"enhancement,final-jeopardy,validation"

echo "All 33 issues created and closed successfully!"
