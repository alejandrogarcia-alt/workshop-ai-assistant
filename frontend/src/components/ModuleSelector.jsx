import React from 'react';

function ModuleSelector({ modules, selectedModule, onSelect }) {
  if (!modules || modules.length === 0) {
    return (
      <div className="card" style={{ marginBottom: '16px' }}>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
          No hay módulos definidos. Ve al paso anterior para crear módulos.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--secondary)' }}>
        Selecciona un Módulo
      </h4>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {modules.map((module) => (
          <button
            key={module.id}
            onClick={() => onSelect(module.id)}
            style={{
              padding: '10px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '500',
              background: selectedModule === module.id
                ? 'var(--primary)'
                : 'var(--background)',
              color: selectedModule === module.id
                ? 'white'
                : 'var(--text)',
              border: selectedModule === module.id
                ? '2px solid var(--primary)'
                : '2px solid #E0E0E0',
              transition: 'all 0.2s ease'
            }}
          >
            {module.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ModuleSelector;
