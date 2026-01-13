const Anthropic = require('@anthropic-ai/sdk');

class LLMService {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  async validateAnswer(clue, correctAnswer, userAnswer) {
    try {
      const prompt = `You are evaluating a Jeopardy answer.

Clue: ${clue}
Correct Answer: ${correctAnswer}
User's Spoken Answer: ${userAnswer}

Evaluate if the user's answer is correct. Consider:
- Accept answers with or without "What is" / "Who is" format
- Accept synonyms and alternate phrasings
- Account for speech recognition errors (minor misspellings, homophones)
- Be lenient with pronunciation variations
- The answer should convey the same meaning as the correct answer

Respond ONLY with valid JSON in this exact format:
{
  "correct": true,
  "explanation": "brief reason"
}

or

{
  "correct": false,
  "explanation": "brief reason"
}`;

      const message = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // Extract the text response
      const responseText = message.content[0].text.trim();

      // Parse JSON response
      const result = JSON.parse(responseText);

      return {
        correct: result.correct,
        explanation: result.explanation
      };

    } catch (error) {
      console.error('Error validating answer:', error);

      // Fallback: simple string matching if API fails
      const normalizedCorrect = correctAnswer.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      const normalizedUser = userAnswer.toLowerCase().replace(/[^a-z0-9\s]/g, '');

      return {
        correct: normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser),
        explanation: 'API error - using simple matching'
      };
    }
  }
}

module.exports = LLMService;
