import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workshopApi } from '../services/api';
import useContinuousSpeech from '../hooks/useContinuousSpeech';
import StepIndicator from '../components/StepIndicator';
import StickyNoteGrid from '../components/StickyNoteGrid';
import VoiceInput from '../components/VoiceInput';
import GroupedView from '../components/GroupedView';
import PrioritizationMatrix from '../components/PrioritizationMatrix';
import ModuleSelector from '../components/ModuleSelector';
import voiceService from '../services/voiceService';

const STEP_CONFIG = {
  problem_framing: {
    title: 'Problem Framing',
    icon: '🎯',
    placeholder: 'Escribe un problema, oportunidad o expectativa...',
    color: 'yellow'
  },
  actors: {
    title: 'Actores del Sistema',
    icon: '👥',
    placeholder: 'Escribe un actor o rol del sistema...',
    color: 'blue'
  },
  kpis: {
    title: 'Indicadores de Éxito',
    icon: '📊',
    placeholder: 'Escribe un KPI o métrica de éxito...',
    color: 'green'
  },
  modules: {
    title: 'Módulos de la Plataforma',
    icon: '🧩',
    placeholder: 'Escribe un módulo o componente...',
    color: 'orange'
  },
  features: {
    title: 'Features por Módulo',
    icon: '⚙️',
    placeholder: 'Escribe una funcionalidad o feature...',
    color: 'purple'
  },
  prioritization: {
    title: 'Priorización',
    icon: '⚖️',
    placeholder: '',
    color: 'pink'
  },
  complete: {
    title: 'Taller Completado',
    icon: '✅',
    placeholder: '',
    color: 'green'
  }
};

function Workshop() {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState(null);
  const [currentStep, setCurrentStep] = useState('problem_framing');
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isGrouped, setIsGrouped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [selectedModule, setSelectedModule] = useState(null);
  const [showGrouped, setShowGrouped] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showNewWorkshop, setShowNewWorkshop] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newWorkshopName, setNewWorkshopName] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importName, setImportName] = useState('');
  const [importError, setImportError] = useState('');
  const [showOpenWorkshop, setShowOpenWorkshop] = useState(false);
  const [workshopList, setWorkshopList] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const lastSpokenStep = useRef(null);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [tempParticipantName, setTempParticipantName] = useState('');

  // Generate random anonymous name
  const generateAnonymousName = () => {
    const num = Math.floor(Math.random() * 99) + 1;
    return `Anonimo ${String(num).padStart(2, '0')}`;
  };

  // Check for participant name on mount
  useEffect(() => {
    const storedName = localStorage.getItem(`workshop_${workshopId}_participant`);
    if (storedName) {
      setParticipantName(storedName);
    } else {
      setShowParticipantModal(true);
    }
  }, [workshopId]);

  // Handle participant name save
  const handleSaveParticipantName = () => {
    const finalName = tempParticipantName.trim() || generateAnonymousName();
    setParticipantName(finalName);
    localStorage.setItem(`workshop_${workshopId}_participant`, finalName);
    setShowParticipantModal(false);
    setTempParticipantName('');
  };

  // Voice command handler
  const handleVoiceCommand = useCallback((command) => {
    switch (command) {
      case 'next':
        handleNextStep();
        break;
      case 'prev':
        handlePrevStep();
        break;
      case 'group':
        handleGroupItems();
        break;
      case 'add':
        handleAddItem();
        break;
      case 'clear':
        setInputText('');
        speech.resetTranscript();
        break;
    }
  }, []);

  const speech = useContinuousSpeech(handleVoiceCommand);

  // Load workshop data
  useEffect(() => {
    loadWorkshop();
  }, [workshopId]);

  // Update input from speech
  useEffect(() => {
    if (speech.transcript) {
      setInputText(speech.transcript);
    }
  }, [speech.transcript]);

  // Speak instructions when step changes
  useEffect(() => {
    if (instructions && voiceEnabled && currentStep !== lastSpokenStep.current) {
      lastSpokenStep.current = currentStep;
      // Small delay to allow UI to update first
      setTimeout(() => {
        voiceService.speak(instructions);
      }, 500);
    }
  }, [instructions, currentStep, voiceEnabled]);

  // Toggle voice assistant
  const handleToggleVoice = () => {
    const newState = voiceService.toggle();
    setVoiceEnabled(newState);
  };

  const loadWorkshop = async () => {
    try {
      const response = await workshopApi.get(workshopId);
      const ws = response.data;
      setWorkshop(ws);

      // If workshop is at 'start', move to problem_framing
      if (ws.currentStep === 'start') {
        const guidanceResponse = await workshopApi.nextStep(workshopId);
        setCurrentStep(guidanceResponse.data.nextStep);
        setInstructions(guidanceResponse.data.instructions);
        // Reload to get updated workshop state
        const updatedResponse = await workshopApi.get(workshopId);
        setWorkshop(updatedResponse.data);
        updateItemsForStep(updatedResponse.data, updatedResponse.data.currentStep);
      } else {
        setCurrentStep(ws.currentStep);
        updateItemsForStep(ws, ws.currentStep);
        // Get instructions for current step without advancing
        const instructionsMap = {
          'problem_framing': 'Estamos en la fase de Problem Framing. Pide a los participantes que mencionen problemas actuales, oportunidades identificadas y expectativas de la nueva plataforma. Cada idea será capturada como un sticky note.',
          'actors': 'Ahora identificaremos los Actores Principales del sistema. ¿Quiénes son los usuarios principales? ¿Qué roles interactúan con la plataforma? ¿Cuáles son sus necesidades y comportamientos?',
          'kpis': 'Definamos los Indicadores de Éxito. ¿Cómo mediremos el éxito de la plataforma? ¿Qué KPIs son relevantes para el negocio? ¿Qué métricas de usuario son importantes?',
          'modules': 'Ahora definiremos los Módulos de la plataforma. ¿Qué módulos principales necesita? ¿Cómo se organizan las funcionalidades?',
          'features': 'Para cada módulo, listemos sus Features. ¿Qué funcionalidades específicas tiene cada módulo? ¿Qué capacidades debe ofrecer?',
          'prioritization': 'Finalmente, priorizaremos usando la Matriz Valor-Complejidad. Para cada feature votar el valor para el negocio de 1 a 5, y la complejidad de implementación de 1 a 5.'
        };
        setInstructions(instructionsMap[ws.currentStep] || '');
      }
    } catch (error) {
      console.error('Error loading workshop:', error);
    }
  };

  const updateItemsForStep = (ws, step) => {
    let stepGroups = [];

    switch (step) {
      case 'problem_framing':
        setItems(ws.data.problems);
        stepGroups = ws.groups?.problems || [];
        setGroups(stepGroups);
        break;
      case 'actors':
        setItems(ws.data.actors);
        stepGroups = ws.groups?.actors || [];
        setGroups(stepGroups);
        break;
      case 'kpis':
        setItems(ws.data.kpis);
        stepGroups = ws.groups?.kpis || [];
        setGroups(stepGroups);
        break;
      case 'modules':
        setItems(ws.data.modules);
        stepGroups = ws.groups?.modules || [];
        setGroups(stepGroups);
        break;
      case 'features':
        if (selectedModule && ws.data.features[selectedModule]) {
          setItems(ws.data.features[selectedModule]);
        } else {
          setItems([]);
        }
        stepGroups = [];
        setGroups(stepGroups);
        break;
      default:
        setItems([]);
        stepGroups = [];
        setGroups(stepGroups);
    }

    // If groups exist, mark as grouped and show them
    if (stepGroups.length > 0) {
      setIsGrouped(true);
      setShowGrouped(true);
    } else {
      setIsGrouped(false);
      setShowGrouped(false);
    }
  };

  const handleAddItem = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    try {
      const response = await workshopApi.addItem(
        workshopId,
        inputText.trim(),
        currentStep,
        selectedModule,
        participantName
      );

      const newItem = response.data.item;
      setItems(prev => [...prev, newItem]);
      setInputText('');
      speech.resetTranscript();

      // Switch to items view if currently showing groups
      if (showGrouped) {
        setShowGrouped(false);
      }
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupItems = async () => {
    if (items.length < 2) return;

    setIsLoading(true);
    setFallbackMessage('');
    try {
      const response = await workshopApi.groupItems(workshopId, currentStep);
      setGroups(response.data.groups);
      setIsGrouped(true);
      setShowGrouped(true);

      // Show fallback message if AI was not available
      if (response.data.usedFallback) {
        setFallbackMessage(response.data.message || 'Se usó agrupación básica (Gemini no disponible)');
      }
    } catch (error) {
      console.error('Error grouping items:', error);
      setFallbackMessage('Error al agrupar items. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await workshopApi.get(workshopId);
      const workshopJson = JSON.stringify(response.data, null, 2);
      setExportData(workshopJson);
      setShowExport(true);
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const handleGeneratePPTX = async () => {
    try {
      setIsLoading(true);
      // Direct download from backend
      const link = document.createElement('a');
      link.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/workshop/${workshopId}/generate-pptx`;
      link.download = 'workshop.pptx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating PPTX:', error);
      alert('Error al generar presentación: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      alert('JSON copiado al portapapeles');
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workshop_${workshop?.boardName?.replace(/\s+/g, '_') || workshopId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateNewWorkshop = async () => {
    if (!newWorkshopName.trim()) {
      alert('Por favor ingresa un nombre para el taller');
      return;
    }
    try {
      const response = await workshopApi.create(newWorkshopName);
      const { workshopId: newId } = response.data;
      setShowNewWorkshop(false);
      setNewWorkshopName('');
      navigate(`/workshop/${newId}`);
    } catch (error) {
      console.error('Error creating workshop:', error);
      alert('Error al crear el workshop');
    }
  };

  const handleImportWorkshop = async () => {
    if (!importJson.trim()) {
      setImportError('Por favor pega el JSON del workshop');
      return;
    }

    try {
      const workshopData = JSON.parse(importJson);

      // Check if name already exists
      const existingWorkshops = await workshopApi.list();
      const nameToUse = importName.trim() || workshopData.boardName || 'Workshop Importado';

      const nameExists = existingWorkshops.data.workshops?.some(
        ws => ws.boardName.toLowerCase() === nameToUse.toLowerCase()
      );

      if (nameExists && !importName.trim()) {
        setImportError(`El nombre "${nameToUse}" ya existe. Por favor ingresa un nombre alternativo.`);
        setImportName(nameToUse + ' (copia)');
        return;
      }

      const finalName = importName.trim() || nameToUse;
      const response = await workshopApi.import(finalName, workshopData);
      const { workshopId: newId } = response.data;

      setShowImport(false);
      setImportJson('');
      setImportName('');
      setImportError('');
      navigate(`/workshop/${newId}`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setImportError('JSON inválido. Verifica el formato.');
      } else {
        setImportError('Error al importar: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImportJson(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const loadWorkshopList = async () => {
    try {
      const response = await workshopApi.list();
      setWorkshopList(response.data.workshops || []);
    } catch (error) {
      console.error('Error loading workshop list:', error);
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

  const handleNextStep = async () => {
    setIsLoading(true);
    try {
      const response = await workshopApi.nextStep(workshopId);
      setCurrentStep(response.data.nextStep);
      setInstructions(response.data.instructions);

      // Reload workshop to get updated data
      await loadWorkshop();
    } catch (error) {
      console.error('Error moving to next step:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevStep = async () => {
    setIsLoading(true);
    try {
      const response = await workshopApi.prevStep(workshopId);
      if (response.data.previousStep) {
        setCurrentStep(response.data.previousStep);
        setInstructions(response.data.instructions || '');
      }

      // Reload workshop to get updated data
      await loadWorkshop();
    } catch (error) {
      console.error('Error moving to previous step:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetStep = async (step) => {
    setIsLoading(true);
    setFallbackMessage('');
    try {
      const response = await workshopApi.setStep(workshopId, step);
      setCurrentStep(response.data.step);
      setInstructions(response.data.instructions || '');

      // Reload workshop to get updated data
      await loadWorkshop();
    } catch (error) {
      console.error('Error setting step:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canGoPrev = () => {
    const stepsOrder = ['problem_framing', 'actors', 'kpis', 'modules', 'features', 'prioritization'];
    return stepsOrder.indexOf(currentStep) > 0;
  };

  const stepConfig = STEP_CONFIG[currentStep] || STEP_CONFIG.problem_framing;

  if (!workshop) {
    return (
      <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <div className="pulse" style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <p>Cargando workshop...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface)',
        padding: '4px 16px',
        borderBottom: '1px solid #E0E0E0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Logo */}
            <img
              src="/logo-multiplica.png"
              alt="Multiplica"
              style={{ height: '40px', width: 'auto' }}
            />
            <div style={{ width: '1px', height: '30px', background: '#E0E0E0' }} />
            <span style={{ fontSize: '20px' }}>{stepConfig.icon}</span>
            <div style={{ minWidth: '100px' }}>
              <h1 style={{ fontSize: '14px', margin: 0, color: 'var(--secondary)' }}>
                {stepConfig.title}
              </h1>
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0 }}>
                {workshop.boardName}
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <StepIndicator currentStep={currentStep} onStepClick={handleSetStep} />
            </div>
          </div>

          {/* Menu Button */}
          <div style={{ position: 'absolute', top: '12px', right: '16px', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleToggleVoice}
              style={{
                background: voiceEnabled ? 'var(--accent)' : '#999',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
            >
              <span>{voiceEnabled ? '🔊' : '🔇'}</span> Voz
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'var(--secondary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>☰</span> Menú
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '160px',
                zIndex: 1000,
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => { setShowMenu(false); setShowNewWorkshop(true); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <span>➕</span> Nuevo Workshop
                </button>
                <button
                  onClick={() => { setShowMenu(false); loadWorkshopList(); setShowOpenWorkshop(true); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '1px solid #E0E0E0'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <span>📂</span> Abrir Workshop
                </button>
                <button
                  onClick={() => { setShowMenu(false); setShowImport(true); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '1px solid #E0E0E0'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <span>📥</span> Importar
                </button>
                <button
                  onClick={() => { setShowMenu(false); handleExport(); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '1px solid #E0E0E0'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <span>📤</span> Exportar
                </button>
                <button
                  onClick={() => { setShowMenu(false); handleGeneratePPTX(); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '1px solid #E0E0E0'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#F5F5F5'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <span>📊</span> Generar Presentación
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions - Compact with hover expand + Group button */}
      {instructions && currentStep !== 'complete' && (
        <div className="container" style={{ paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
            <div
              className="fade-in"
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                color: 'white',
                borderRadius: '10px',
                padding: '12px 16px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                overflow: 'hidden',
                maxHeight: '64px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.maxHeight = '300px'}
              onMouseLeave={(e) => e.currentTarget.style.maxHeight = '64px'}
            >
              <div style={{
                fontSize: '13px',
                lineHeight: '1.4',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>🤖</span>
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {instructions}
                </span>
              </div>
            </div>
            {/* Group button on the right */}
            <button
              onClick={handleGroupItems}
              className="btn"
              style={{
                background: items.length >= 2 ? '#9C27B0' : '#ccc',
                color: 'white',
                opacity: items.length >= 2 ? 1 : 0.5,
                padding: '10px 20px',
                minWidth: '110px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              disabled={items.length < 2 || isLoading}
            >
              <span style={{ fontSize: '20px' }}>{isLoading ? '⏳' : '🧠'}</span>
              <span>Agrupar</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container" style={{ paddingTop: '16px', paddingBottom: '200px' }}>
        {/* Module selector for features step */}
        {currentStep === 'features' && (
          <ModuleSelector
            modules={workshop.data.modules}
            selectedModule={selectedModule}
            onSelect={(moduleId) => {
              setSelectedModule(moduleId);
              if (workshop.data.features[moduleId]) {
                setItems(workshop.data.features[moduleId]);
              } else {
                setItems([]);
              }
            }}
          />
        )}

        {/* Fallback Message */}
        {fallbackMessage && (
          <div style={{
            background: '#FFF3E0',
            border: '1px solid #FFB74D',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '16px',
            fontSize: '13px',
            color: '#E65100'
          }}>
            <strong>Aviso:</strong> {fallbackMessage}
          </div>
        )}

        {/* Items/Groups Display */}
        {currentStep !== 'prioritization' && currentStep !== 'complete' && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>
                {showGrouped ? 'Grupos Conceptuales' : `Items (${items.length})`}
              </h3>
              {items.length > 1 && (
                <button
                  onClick={() => setShowGrouped(!showGrouped)}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                  disabled={!isGrouped && !showGrouped}
                >
                  {showGrouped ? 'Ver Items' : 'Ver Grupos'}
                </button>
              )}
            </div>

            {showGrouped && groups.length > 0 ? (
              <GroupedView
                groups={groups}
                workshopId={workshopId}
                step={currentStep}
                moduleId={selectedModule}
                onUpdate={loadWorkshop}
              />
            ) : (
              <StickyNoteGrid
                items={items}
                color={stepConfig.color}
                workshopId={workshopId}
                step={currentStep}
                moduleId={selectedModule}
                onUpdate={loadWorkshop}
              />
            )}
          </div>
        )}

        {/* Prioritization Matrix */}
        {currentStep === 'prioritization' && (
          <PrioritizationMatrix
            workshopId={workshopId}
            modules={workshop.data.modules}
            features={Object.entries(workshop.data.features).flatMap(([moduleId, feats]) =>
              feats.map(f => ({ ...f, moduleId }))
            )}
            prioritization={workshop.data.prioritization}
            onVote={loadWorkshop}
          />
        )}

        {/* Completion Screen */}
        {currentStep === 'complete' && (
          <div className="card fade-in" style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🎉</span>
            <h2 style={{ marginBottom: '16px' }}>Taller Completado</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Has completado exitosamente todas las etapas del taller.
              Los resultados están disponibles en tu tablero de FigJam.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      {currentStep !== 'prioritization' && currentStep !== 'complete' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--surface)',
          borderTop: '1px solid #E0E0E0',
          padding: '12px 0',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
        }}>
          <div className="container">
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              {/* Navigation buttons */}
              <button
                onClick={handlePrevStep}
                className="btn"
                style={{
                  background: canGoPrev() ? 'var(--secondary)' : '#ccc',
                  color: 'white',
                  opacity: canGoPrev() ? 1 : 0.5,
                  padding: '12px 20px',
                  minWidth: '120px'
                }}
                disabled={!canGoPrev() || isLoading}
              >
                ◀️ Anterior
              </button>

              {/* Input area - takes remaining space */}
              <div style={{ flex: 1 }}>
                <VoiceInput
                  value={inputText}
                  onChange={setInputText}
                  onSubmit={handleAddItem}
                  placeholder={stepConfig.placeholder}
                  isListening={speech.isListening}
                  onStartListening={speech.startListening}
                  onStopListening={speech.stopListening}
                  isSupported={speech.isSupported}
                  isLoading={isLoading}
                />
              </div>

              {/* Next button */}
              <button
                onClick={handleNextStep}
                className="btn btn-primary"
                style={{ padding: '12px 20px', minWidth: '120px' }}
                disabled={isLoading}
              >
                Siguiente ▶️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
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
            maxWidth: '500px',
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
              <h3 style={{ margin: 0, fontSize: '18px' }}>Exportar Workshop</h3>
              <button
                onClick={() => setShowExport(false)}
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
              <p style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginBottom: '12px'
              }}>
                Copia este texto para pegarlo en FigJam u otra herramienta:
              </p>
              <textarea
                value={exportData}
                readOnly
                style={{
                  width: '100%',
                  minHeight: '300px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '12px',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{
              padding: '16px',
              borderTop: '1px solid #E0E0E0',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={copyToClipboard}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                📋 Copiar
              </button>
              <button
                onClick={downloadJson}
                className="btn"
                style={{ flex: 1, background: 'var(--success)', color: 'white' }}
              >
                💾 Descargar
              </button>
              <button
                onClick={() => setShowExport(false)}
                className="btn"
                style={{ flex: 1 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Workshop Modal */}
      {showNewWorkshop && (
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
            maxWidth: '400px',
            padding: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Crear Nuevo Workshop</h3>
            <input
              type="text"
              value={newWorkshopName}
              onChange={(e) => setNewWorkshopName(e.target.value)}
              placeholder="Nombre del workshop..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #E0E0E0',
                marginBottom: '16px',
                fontSize: '14px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateNewWorkshop()}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCreateNewWorkshop}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Crear
              </button>
              <button
                onClick={() => { setShowNewWorkshop(false); setNewWorkshopName(''); }}
                className="btn"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => { setShowImport(false); setImportJson(''); setImportName(''); setImportError(''); }}
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
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                  Cargar archivo JSON (opcional)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  style={{ fontSize: '12px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                  O pegar JSON directamente
                </label>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder="Pega aquí el JSON exportado..."
                  style={{
                    width: '100%',
                    minHeight: '150px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    padding: '12px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                  Nombre del workshop (opcional, usa el del JSON si no se especifica)
                </label>
                <input
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="Nombre alternativo..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #E0E0E0',
                    fontSize: '13px'
                  }}
                />
              </div>
              {importError && (
                <div style={{
                  background: '#FFE5E5',
                  color: 'var(--error)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  {importError}
                </div>
              )}
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
              >
                📥 Importar
              </button>
              <button
                onClick={() => { setShowImport(false); setImportJson(''); setImportName(''); setImportError(''); }}
                className="btn"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Workshop Modal */}
      {showOpenWorkshop && (
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
            maxHeight: '70vh',
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
              <h3 style={{ margin: 0, fontSize: '18px' }}>Abrir Workshop</h3>
              <button
                onClick={() => setShowOpenWorkshop(false)}
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
              {workshopList.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay workshops disponibles
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {workshopList.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setShowOpenWorkshop(false);
                        navigate(`/workshop/${ws.id}`);
                      }}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        background: ws.id === workshopId ? '#E3F2FD' : 'var(--background)',
                        border: ws.id === workshopId ? '2px solid var(--primary)' : '2px solid transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (ws.id !== workshopId) e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        if (ws.id !== workshopId) e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                          {ws.boardName}
                          {ws.id === workshopId && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--primary)' }}>(actual)</span>}
                        </div>
                        <span style={{
                          background: ws.currentStep === 'complete' ? '#B1FFB1' : '#FFD4A3',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {ws.currentStep}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Creado: {formatDate(ws.createdAt)}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                        <span>Problemas: {ws.itemCounts.problems}</span>
                        <span>Actores: {ws.itemCounts.actors}</span>
                        <span>Módulos: {ws.itemCounts.modules}</span>
                        <span>Features: {ws.itemCounts.features}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{
              padding: '16px',
              borderTop: '1px solid #E0E0E0'
            }}>
              <button
                onClick={() => setShowOpenWorkshop(false)}
                className="btn"
                style={{ width: '100%' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participant Name Modal */}
      {showParticipantModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            padding: '24px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>👤</span>
              <h3 style={{ margin: '0 0 8px', fontSize: '20px' }}>¡Bienvenido al Workshop!</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Para comenzar, ingresa tu nombre o deja vacío para usar un nombre anónimo
              </p>
            </div>
            <input
              type="text"
              value={tempParticipantName}
              onChange={(e) => setTempParticipantName(e.target.value)}
              placeholder="Tu nombre..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #E0E0E0',
                marginBottom: '16px',
                fontSize: '14px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveParticipantName()}
              autoFocus
            />
            <button
              onClick={handleSaveParticipantName}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Workshop;
