// Voice service for TTS using Web Speech API
class VoiceService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.enabled = true;
    this.loadVoice();
  }

  loadVoice() {
    // Wait for voices to load
    const setVoice = () => {
      const voices = this.synth.getVoices();

      // Priority: Premium/Neural voices first, then standard Spanish Latin American
      // Look for high-quality voices (Google, Microsoft Neural, Apple Premium)
      const premiumKeywords = ['premium', 'neural', 'enhanced', 'google', 'wavenet'];
      const maleNames = ['jorge', 'diego', 'carlos', 'pablo', 'andrés', 'juan', 'miguel'];
      const preferredLocales = ['es-MX', 'es-US', 'es-419', 'es-AR', 'es-CO', 'es-CL', 'es-ES'];

      // First try to find premium/neural Spanish voice
      for (const locale of preferredLocales) {
        const voice = voices.find(v =>
          v.lang.startsWith(locale) &&
          premiumKeywords.some(keyword => v.name.toLowerCase().includes(keyword))
        );
        if (voice) {
          this.voice = voice;
          console.log('Premium voice selected:', voice.name, voice.lang);
          return;
        }
      }

      // Then try to find male Spanish Latin American voice
      for (const locale of preferredLocales) {
        const voice = voices.find(v =>
          v.lang.startsWith(locale) &&
          maleNames.some(name => v.name.toLowerCase().includes(name))
        );
        if (voice) {
          this.voice = voice;
          console.log('Male voice selected:', voice.name, voice.lang);
          return;
        }
      }

      // Then try any Spanish Latin American voice (prefer non-compact)
      for (const locale of preferredLocales) {
        const voice = voices.find(v =>
          v.lang.startsWith(locale) &&
          !v.name.toLowerCase().includes('compact')
        );
        if (voice) {
          this.voice = voice;
          console.log('Standard voice selected:', voice.name, voice.lang);
          return;
        }
      }

      // Fallback to any Spanish voice
      const spanishVoice = voices.find(v => v.lang.startsWith('es'));
      if (spanishVoice) {
        this.voice = spanishVoice;
        console.log('Voice selected (fallback):', spanishVoice.name, spanishVoice.lang);
        return;
      }

      console.log('No Spanish voice found, using default');
    };

    if (this.synth.getVoices().length > 0) {
      setVoice();
    } else {
      this.synth.addEventListener('voiceschanged', setVoice, { once: true });
    }
  }

  speak(text) {
    if (!this.enabled || !this.synth) return;

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (this.voice) {
      utterance.voice = this.voice;
    }

    utterance.lang = 'es-MX';
    utterance.rate = 0.95; // Slightly slower for more natural speech
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
    }
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

// Singleton instance
const voiceService = new VoiceService();

export default voiceService;
