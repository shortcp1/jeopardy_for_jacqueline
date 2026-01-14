/**
 * Speech Service - Modular interface for speech recognition
 * Currently uses Web Speech API, designed for easy future integration with Wispr Flow
 */

const speechService = {
  recognition: null,
  isListening: false,
  onResultCallback: null,
  onErrorCallback: null,

  /**
   * Initialize the speech recognition service
   */
  initialize() {
    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Web Speech API not supported in this browser');
      return false;
    }

    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.continuous = false; // Stop after one result
    this.recognition.interimResults = false; // Only final results
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // Set up event handlers
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Speech recognized:', transcript);

      if (this.onResultCallback) {
        this.onResultCallback(transcript);
      }

      this.isListening = false;
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }

      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    console.log('Speech service initialized');
    return true;
  },

  /**
   * Start listening for speech input
   * @param {Function} onResult - Callback when speech is recognized
   * @param {Function} onError - Callback when an error occurs
   */
  startListening(onResult, onError) {
    if (!this.recognition) {
      console.error('Speech service not initialized');
      return false;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return false;
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;

    // Attempt to start with retry logic for Web Speech API issues
    const attemptStart = (retryCount = 0) => {
      try {
        this.recognition.start();
        this.isListening = true;
        console.log('Started listening...');
        return true;
      } catch (error) {
        console.error('Error starting speech recognition:', error);

        // Retry up to 3 times with 200ms delay
        if (retryCount < 3 && error.message && error.message.includes('already')) {
          console.log(`Retrying speech start (attempt ${retryCount + 1})...`);
          setTimeout(() => attemptStart(retryCount + 1), 200);
        } else {
          if (onError) onError(error);
        }
        return false;
      }
    };

    return attemptStart();
  },

  /**
   * Stop listening for speech input
   */
  stopListening() {
    if (!this.recognition) {
      return;
    }

    // Force stop even if not currently marked as listening (defensive)
    try {
      this.recognition.stop();
      this.isListening = false;
      console.log('Stopped listening');
    } catch (error) {
      // Ignore errors from stopping (may already be stopped)
      console.log('Stop listening (already stopped or error):', error.message);
      this.isListening = false;
    }
  },

  /**
   * Check if currently listening
   */
  isActive() {
    return this.isListening;
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const initialized = speechService.initialize();
  if (!initialized) {
    alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
  }
});
