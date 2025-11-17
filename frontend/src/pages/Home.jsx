import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workshopApi, figmaApi } from '../services/api';

function Home() {
  const [boardName, setBoardName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingWorkshops, setExistingWorkshops] = useState([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importName, setImportName] = useState('');
  const navigate = useNavigate();

  // Load existing workshops on mount
  useEffect(() => {
    loadWorkshops();
  }, []);

  const loadWorkshops = async () => {
    try {
      setLoadingWorkshops(true);
      const response = await workshopApi.list();
      setExistingWorkshops(response.data.workshops || []);
    } catch (err) {
      console.error('Error loading workshops:', err);
    } finally {
      setLoadingWorkshops(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStepLabel = (step) => {
    const labels = {
      'start': 'Iniciando',
      'problem_framing': 'Problem Framing',
      'actors': 'Actores',
      'kpis': 'KPIs',
      'modules': 'Módulos',
      'features': 'Features',
      'prioritization': 'Priorización',
      'complete': 'Completado'
    };
    return labels[step] || step;
  };

  const handleCreateWorkshop = async (e) => {
    e.preventDefault();
    if (!boardName.trim()) {
      setError('Por favor ingresa un nombre para el taller');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const workshopResponse = await workshopApi.create(boardName);
      const { workshopId } = workshopResponse.data;
      navigate(`/workshop/${workshopId}`);
    } catch (err) {
      setError('Error al crear el workshop: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWorkshop = async () => {
    if (!importName.trim()) {
      setError('Por favor ingresa un nombre para el taller importado');
      return;
    }
    if (!importJson.trim()) {
      setError('Por favor pega el JSON del workshop');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const workshopData = JSON.parse(importJson);
      const response = await workshopApi.import(importName, workshopData);
      const { workshopId } = response.data;
      navigate(`/workshop/${workshopId}`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('JSON inválido. Verifica el formato.');
      } else {
        setError('Error al importar: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'var(--primary)',
          borderRadius: '20px',
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px'
        }}>
          <span role="img" aria-label="workshop">🎯</span>
        </div>
        <h1 style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--secondary)' }}>
          Workshop AI Assistant
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.5' }}>
          Facilita talleres de diseño de producto con IA y visualización automática en FigJam
        </p>
      </div>

      <div className="card fade-in">
        <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--secondary)' }}>
          Crear Nuevo Taller
        </h2>

        <form onSubmit={handleCreateWorkshop}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: 'var(--text)'
            }}>
              Nombre del Taller
            </label>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Ej: Taller Roadmap Plataforma TP"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div style={{
              background: '#FFE5E5',
              color: 'var(--error)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="pulse">⏳</span>
                Creando...
              </>
            ) : (
              <>
                <span>🚀</span>
                Iniciar Workshop
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>o</span>
          </div>

          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="btn btn-outline btn-full"
            disabled={isLoading}
          >
            <span>📥</span>
            Importar Workshop
          </button>
        </form>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #E0E0E0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Importar Workshop</h3>
              <button
                onClick={() => setShowImport(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Nombre del nuevo taller
                </label>
                <input
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="Ej: Copia Taller TP"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  JSON del Workshop
                </label>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder="Pega aquí el JSON exportado..."
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>
            <div style={{
              padding: '16px',
              borderTop: '1px solid #E0E0E0',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleImportWorkshop}
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Importando...' : '📥 Importar'}
              </button>
              <button
                onClick={() => setShowImport(false)}
                className="btn"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Workshops */}
      {!loadingWorkshops && existingWorkshops.length > 0 && (
        <div className="card fade-in" style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--secondary)' }}>
            Talleres Existentes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {existingWorkshops.map((ws) => (
              <button
                key={ws.id}
                onClick={() => navigate(`/workshop/${ws.id}`)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '16px',
                  background: 'var(--background)',
                  borderRadius: '12px',
                  border: '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>
                    {ws.boardName}
                  </div>
                  <span style={{
                    background: ws.currentStep === 'complete' ? '#B1FFB1' : '#FFD4A3',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    {getStepLabel(ws.currentStep)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Creado: {formatDate(ws.createdAt)}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)'
                }}>
                  <span>Problemas: {ws.itemCounts.problems}</span>
                  <span>Actores: {ws.itemCounts.actors}</span>
                  <span>Módulos: {ws.itemCounts.modules}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {loadingWorkshops && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
          Cargando talleres existentes...
        </div>
      )}

      <div className="card fade-in" style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--secondary)' }}>
          Etapas del Taller
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { icon: '🎯', title: 'Problem Framing', desc: 'Definición del problema' },
            { icon: '👥', title: 'Actores', desc: 'Identificación de usuarios' },
            { icon: '📊', title: 'KPIs', desc: 'Indicadores de éxito' },
            { icon: '🧩', title: 'Feature Mapping', desc: 'Módulos y funcionalidades' },
            { icon: '⚖️', title: 'Priorización', desc: 'Matriz Valor-Complejidad' }
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--background)',
              borderRadius: '10px'
            }}>
              <span style={{ fontSize: '24px' }}>{step.icon}</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{step.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
