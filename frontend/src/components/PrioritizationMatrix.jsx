import React, { useState } from 'react';
import { workshopApi } from '../services/api';

function PrioritizationMatrix({ workshopId, features, prioritization, onVote, modules }) {
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [valueVote, setValueVote] = useState(3);
  const [complexityVote, setComplexityVote] = useState(3);
  const [isVoting, setIsVoting] = useState(false);
  const [participantId] = useState(`p_${Date.now()}`);

  const handleVote = async () => {
    if (!selectedFeature) return;

    setIsVoting(true);
    try {
      await workshopApi.vote(
        workshopId,
        selectedFeature.id,
        valueVote,
        complexityVote,
        participantId
      );

      // Reset selection
      setSelectedFeature(null);
      setValueVote(3);
      setComplexityVote(3);

      // Callback to refresh data
      if (onVote) {
        await onVote();
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  // Calculate quadrant for display (scale 1-5, threshold at 3)
  const getQuadrant = (value, complexity) => {
    if (value >= 3 && complexity <= 3) return { name: 'Quick Wins', color: '#B1FFB1', icon: '🚀' };
    if (value >= 3 && complexity > 3) return { name: 'Major Projects', color: '#FFD4A3', icon: '🏗️' };
    if (value < 3 && complexity <= 3) return { name: 'Fill-ins', color: '#B1D4FF', icon: '📝' };
    return { name: 'Avoid', color: '#FFD1DC', icon: '⚠️' };
  };

  // Get features for selected module
  const getModuleFeatures = () => {
    if (!selectedModule) return [];
    return features.filter(f => f.moduleId === selectedModule.id);
  };

  // Get module name by id
  const getModuleName = (moduleId) => {
    const module = modules?.find(m => m.id === moduleId);
    return module?.text || moduleId;
  };

  return (
    <div>
      {/* Module Selection */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
          1. Selecciona un Módulo
        </h3>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {modules?.map((module) => (
            <button
              key={module.id}
              onClick={() => {
                setSelectedModule(module);
                setSelectedFeature(null);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: selectedModule?.id === module.id ? 'var(--primary)' : 'var(--background)',
                color: selectedModule?.id === module.id ? 'white' : 'var(--text)',
                border: 'none',
                fontWeight: '500',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {module.text}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Selection */}
      {selectedModule && (
        <div className="card fade-in" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
            2. Selecciona un Feature de "{selectedModule.text}"
          </h3>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {getModuleFeatures().length === 0 ? (
              <div style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No hay features en este módulo
              </div>
            ) : (
              getModuleFeatures().map((feature) => {
                const prioData = prioritization.find(p => p.featureId === feature.id);
                const hasVoted = prioData?.votes?.some(v => v.participantId === participantId);

                return (
                  <button
                    key={feature.id}
                    onClick={() => !hasVoted && setSelectedFeature(feature)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      background: selectedFeature?.id === feature.id
                        ? 'var(--primary)'
                        : hasVoted
                          ? '#E8F5E9'
                          : 'var(--background)',
                      color: selectedFeature?.id === feature.id ? 'white' : 'var(--text)',
                      border: 'none',
                      opacity: hasVoted ? 0.7 : 1,
                      cursor: hasVoted ? 'default' : 'pointer'
                    }}
                    disabled={hasVoted}
                  >
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                      {hasVoted && '✓ '}{feature.text}
                    </div>
                    {prioData?.averages && (
                      <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                        Valor: {prioData.averages.value} | Complejidad: {prioData.averages.complexity}
                        ({prioData.votes.length} votos)
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Voting Panel */}
      {selectedFeature && (
        <div className="card fade-in" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>
            Votar: {selectedFeature.text}
          </h3>

          {/* Value Slider */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              Valor para el Negocio: {valueVote}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={valueVote}
              onChange={(e) => setValueVote(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                appearance: 'none',
                background: `linear-gradient(to right, #FFD1DC 0%, #B1FFB1 100%)`
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: 'var(--text-secondary)',
              marginTop: '4px'
            }}>
              <span>1<br/>Muy Bajo</span>
              <span>2<br/>Bajo</span>
              <span>3<br/>Medio</span>
              <span>4<br/>Alto</span>
              <span>5<br/>Muy Alto</span>
            </div>
          </div>

          {/* Complexity Slider */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              Complejidad de Implementación: {complexityVote}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={complexityVote}
              onChange={(e) => setComplexityVote(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                appearance: 'none',
                background: `linear-gradient(to right, #B1FFB1 0%, #FFD1DC 100%)`
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: 'var(--text-secondary)',
              marginTop: '4px'
            }}>
              <span>1<br/>Muy Baja</span>
              <span>2<br/>Baja</span>
              <span>3<br/>Media</span>
              <span>4<br/>Alta</span>
              <span>5<br/>Muy Alta</span>
            </div>
          </div>

          {/* Quadrant Preview */}
          {(() => {
            const quadrant = getQuadrant(valueVote, complexityVote);
            return (
              <div style={{
                background: quadrant.color,
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '24px' }}>{quadrant.icon}</span>
                <div style={{ fontWeight: '600', marginTop: '4px' }}>
                  {quadrant.name}
                </div>
              </div>
            );
          })()}

          <button
            onClick={handleVote}
            className="btn btn-primary btn-full"
            disabled={isVoting}
          >
            {isVoting ? '⏳ Guardando...' : '✓ Confirmar Voto'}
          </button>
        </div>
      )}

      {/* Matrix Visualization */}
      <div className="card">
        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>
          Matriz de Priorización
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: '8px',
          aspectRatio: '1',
          background: '#F0F0F0',
          padding: '8px',
          borderRadius: '12px'
        }}>
          {/* Major Projects - Top Left */}
          <div style={{
            background: '#FFD4A3',
            borderRadius: '8px',
            padding: '12px',
            position: 'relative'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
              🏗️ Major Projects
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Alto valor, Alta complejidad
            </div>
            {renderFeaturesInQuadrant('major-projects')}
          </div>

          {/* Quick Wins - Top Right */}
          <div style={{
            background: '#B1FFB1',
            borderRadius: '8px',
            padding: '12px',
            position: 'relative'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
              🚀 Quick Wins
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Alto valor, Baja complejidad
            </div>
            {renderFeaturesInQuadrant('quick-wins')}
          </div>

          {/* Avoid - Bottom Left */}
          <div style={{
            background: '#FFD1DC',
            borderRadius: '8px',
            padding: '12px',
            position: 'relative'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
              ⚠️ Avoid
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Bajo valor, Alta complejidad
            </div>
            {renderFeaturesInQuadrant('avoid')}
          </div>

          {/* Fill-ins - Bottom Right */}
          <div style={{
            background: '#B1D4FF',
            borderRadius: '8px',
            padding: '12px',
            position: 'relative'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
              📝 Fill-ins
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Bajo valor, Baja complejidad
            </div>
            {renderFeaturesInQuadrant('fill-ins')}
          </div>
        </div>

        {/* Axis Labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}>
          <span>← Alta Complejidad</span>
          <span>Baja Complejidad →</span>
        </div>
        <div style={{
          textAlign: 'center',
          marginTop: '4px',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}>
          ↑ Alto Valor | Bajo Valor ↓
        </div>
      </div>
    </div>
  );

  function renderFeaturesInQuadrant(quadrantName) {
    const quadrantFeatures = prioritization.filter(p => p.quadrant === quadrantName);

    if (quadrantFeatures.length === 0) return null;

    return (
      <div style={{
        marginTop: '8px',
        maxHeight: '120px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {quadrantFeatures.map((prio, idx) => {
          const feature = features.find(f => f.id === prio.featureId);
          const moduleName = feature ? getModuleName(feature.moduleId) : '';
          return (
            <div key={idx} style={{
              fontSize: '9px',
              background: 'rgba(255,255,255,0.7)',
              padding: '4px 6px',
              borderRadius: '4px',
              marginBottom: '4px'
            }}>
              <strong>{moduleName}</strong> - {feature?.text || prio.featureId}
            </div>
          );
        })}
      </div>
    );
  }
}

export default PrioritizationMatrix;
