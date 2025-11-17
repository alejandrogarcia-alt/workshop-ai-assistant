import React from 'react';

function StickyNoteGrid({ items, color = 'yellow' }) {
  if (items.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-secondary)'
      }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px', opacity: 0.5 }}>
          📝
        </span>
        <p>No hay items aún. Usa el campo de texto o el micrófono para agregar.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '16px'
    }}>
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className={`sticky-note sticky-${color} fade-in`}
          style={{
            animationDelay: `${index * 0.03}s`,
            height: '130px',
            display: 'flex',
            flexDirection: 'column'
          }}
          title={item.text}
        >
          <p style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.5',
            wordBreak: 'break-word',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 5,
            WebkitBoxOrient: 'vertical',
            flex: 1
          }}>
            {item.text}
          </p>
          <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: 'rgba(0,0,0,0.4)',
            textAlign: 'right'
          }}>
            #{index + 1}
          </div>
        </div>
      ))}
    </div>
  );
}

export default StickyNoteGrid;
