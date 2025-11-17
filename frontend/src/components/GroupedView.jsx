import React from 'react';

const GROUP_COLORS = [
  { bg: '#FFF9B1', label: 'yellow' },
  { bg: '#FFD1DC', label: 'pink' },
  { bg: '#B1D4FF', label: 'blue' },
  { bg: '#B1FFB1', label: 'green' },
  { bg: '#FFD4A3', label: 'orange' },
  { bg: '#D4B1FF', label: 'purple' }
];

function GroupedView({ groups }) {
  if (!groups || groups.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-secondary)'
      }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px', opacity: 0.5 }}>
          🧠
        </span>
        <p>Usa "Agrupar con IA" para organizar los items por conceptos similares.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {groups.map((group, groupIndex) => {
        const colorScheme = GROUP_COLORS[groupIndex % GROUP_COLORS.length];

        return (
          <div
            key={groupIndex}
            className="card fade-in"
            style={{
              animationDelay: `${groupIndex * 0.1}s`,
              border: `3px solid ${colorScheme.bg}`,
              padding: '0'
            }}
          >
            {/* Group Header */}
            <div style={{
              background: colorScheme.bg,
              padding: '10px 16px',
              borderBottom: `2px solid ${colorScheme.bg}`
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: '700',
                color: 'var(--secondary)'
              }}>
                🏷️ {group.category}
              </h4>
            </div>

            {/* Group Items */}
            <div style={{
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '10px'
            }}>
              {group.items.map((item, itemIndex) => {
                const itemText = typeof item === 'string' ? item : item.text;
                return (
                  <div
                    key={itemIndex}
                    className={`sticky-note sticky-${colorScheme.label}`}
                    style={{
                      height: '105px',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    title={itemText}
                  >
                    <p style={{
                      margin: 0,
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical',
                      flex: 1
                    }}>
                      {itemText}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Item count */}
            <div style={{
              padding: '8px 16px',
              background: 'var(--background)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              textAlign: 'right'
            }}>
              {group.items.length} items en este grupo
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default GroupedView;
