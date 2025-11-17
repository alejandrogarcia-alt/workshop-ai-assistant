import React from 'react';

function VoiceInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  isListening,
  onStartListening,
  onStopListening,
  isSupported,
  isLoading
}) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div>
      {/* Voice commands help */}
      {isListening && (
        <div style={{
          background: '#E3F2FD',
          padding: '8px 12px',
          borderRadius: '8px',
          marginBottom: '8px',
          fontSize: '11px',
          color: '#1565C0',
          display: 'inline-block'
        }}>
          <strong>Comandos:</strong> "agregar/ok" • "siguiente" • "anterior" • "agrupar" • "limpiar"
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            style={{
              borderColor: isListening ? 'var(--error)' : undefined,
              borderWidth: isListening ? '3px' : '2px',
              height: '48px',
              fontSize: '16px',
              paddingRight: isSupported ? '60px' : '12px'
            }}
          />
          {/* Mic button floating inside input */}
          {isSupported && (
            <button
              onClick={onStartListening}
              className="btn"
              style={{
                position: 'absolute',
                top: '50%',
                right: '8px',
                transform: 'translateY(-50%)',
                width: '36px',
                height: '36px',
                minWidth: '36px',
                minHeight: '36px',
                padding: 0,
                borderRadius: '50%',
                background: isListening ? 'var(--error)' : 'var(--secondary)',
                color: 'white',
                fontSize: '16px',
                boxShadow: isListening ? '0 0 20px rgba(255,68,68,0.5)' : 'none',
                border: 'none',
                cursor: isListening ? 'default' : 'pointer',
                aspectRatio: '1 / 1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              disabled={isLoading || isListening}
              title={isListening ? 'Grabando...' : 'Grabar'}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          )}
          {isListening && (
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div className="recording-indicator" />
              <span style={{ fontSize: '11px', color: 'var(--error)', fontWeight: '600' }}>
                REC
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onSubmit}
          className="btn btn-primary"
          style={{
            width: '48px',
            height: '48px',
            padding: 0,
            borderRadius: '50%',
            fontSize: '20px',
            flexShrink: 0
          }}
          disabled={!value.trim() || isLoading}
          title="Agregar"
        >
          {isLoading ? '⏳' : '➕'}
        </button>
      </div>
    </div>
  );
}

export default VoiceInput;
