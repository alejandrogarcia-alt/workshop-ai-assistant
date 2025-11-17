import React from 'react';

const STEPS = [
  { key: 'problem_framing', label: 'Problema', icon: '🎯' },
  { key: 'actors', label: 'Actores', icon: '👥' },
  { key: 'kpis', label: 'KPIs', icon: '📊' },
  { key: 'modules', label: 'Módulos', icon: '🧩' },
  { key: 'features', label: 'Features', icon: '⚙️' },
  { key: 'prioritization', label: 'Priorizar', icon: '⚖️' }
];

function StepIndicator({ currentStep, onStepClick }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '2px'
    }}>
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isClickable = onStepClick && !isActive;

        return (
          <div
            key={step.key}
            onClick={() => isClickable && onStepClick(step.key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              cursor: isClickable ? 'pointer' : 'default',
              opacity: isActive ? 1 : 0.8,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (isClickable) {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (isClickable) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '0.8';
              }
            }}
            title={isClickable ? `Ir a ${step.label}` : ''}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: isCompleted
                ? 'var(--success)'
                : isActive
                  ? 'var(--primary)'
                  : '#E0E0E0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: isCompleted || isActive ? 'white' : 'var(--text-secondary)',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}>
              {isCompleted ? '✓' : step.icon}
            </div>
            <span style={{
              fontSize: '9px',
              marginTop: '2px',
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: isActive ? '600' : '400'
            }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default StepIndicator;
