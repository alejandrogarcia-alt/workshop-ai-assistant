import { useState, useEffect, useRef, useCallback } from 'react';

const useContinuousSpeech = (onCommand) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const recognitionRef = useRef(null);
  const onCommandRef = useRef(onCommand);
  const shouldRestartRef = useRef(false);
  const restartTimeoutRef = useRef(null);

  // Update ref when onCommand changes
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();

      recognition.continuous = false; // Auto-stop after dictation
      recognition.interimResults = true;
      recognition.lang = 'es-MX';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart;
          } else {
            interimTranscript += transcriptPart;
          }
        }

        // Check for commands in final transcript
        if (finalTranscript) {
          const lowerText = finalTranscript.toLowerCase().trim();

          // Command detection
          if (lowerText.includes('siguiente') || lowerText.includes('next')) {
            setLastCommand('siguiente');
            onCommandRef.current?.('next');
            setTranscript('');
          } else if (lowerText.includes('anterior') || lowerText.includes('atrás') || lowerText.includes('back')) {
            setLastCommand('anterior');
            onCommandRef.current?.('prev');
            setTranscript('');
          } else if (lowerText.includes('agrupar') || lowerText.includes('grupo') || lowerText.includes('organizar')) {
            setLastCommand('agrupar');
            onCommandRef.current?.('group');
            setTranscript('');
          } else if (lowerText === 'ok' || lowerText === 'agregar' || lowerText === 'listo' || lowerText === 'añadir') {
            setLastCommand('agregar');
            onCommandRef.current?.('add');
            setTranscript('');
          } else if (lowerText.includes('borrar') || lowerText.includes('limpiar') || lowerText.includes('clear')) {
            setLastCommand('limpiar');
            onCommandRef.current?.('clear');
            setTranscript('');
          } else {
            // It's content, not a command
            setTranscript(prev => {
              const newText = prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim();
              return newText;
            });
            setLastCommand('');
          }
        } else if (interimTranscript) {
          // Show interim results but don't save them yet
          setTranscript(prev => {
            // Keep existing final text, show interim at the end
            return prev;
          });
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'network') {
          // Auto-restart on these errors if we should be listening
          if (shouldRestartRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = setTimeout(() => {
              if (recognitionRef.current && shouldRestartRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.log('Restarting recognition...');
                }
              }
            }, 500);
          }
        } else if (event.error === 'aborted') {
          // Ignore aborted errors
        } else {
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      };

      recognition.onend = () => {
        // Auto-stop after dictation is complete
        shouldRestartRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      shouldRestartRef.current = false;
      clearTimeout(restartTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !shouldRestartRef.current) {
      setTranscript('');
      setLastCommand('');
      shouldRestartRef.current = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Error starting recognition:', e);
        shouldRestartRef.current = false;
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    clearTimeout(restartTimeoutRef.current);
    if (recognitionRef.current) {
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setLastCommand('');
  }, []);

  const setManualTranscript = useCallback((text) => {
    setTranscript(text);
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    lastCommand,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript: setManualTranscript
  };
};

export default useContinuousSpeech;
