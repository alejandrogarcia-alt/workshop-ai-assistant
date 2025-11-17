import express from 'express';
import geminiService from '../services/geminiService.js';
import { loadWorkshops, saveWorkshop } from '../utils/storage.js';
import PPTX from 'nodejs-pptx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Load workshops from file on startup
const workshops = loadWorkshops();
console.log(`Loaded ${workshops.size} workshops from storage`);

// List all workshops
router.get('/', (req, res) => {
  try {
    const workshopList = Array.from(workshops.values()).map(ws => ({
      id: ws.id,
      boardName: ws.boardName,
      currentStep: ws.currentStep,
      createdAt: ws.createdAt,
      figmaBoard: ws.figmaBoard,
      itemCounts: {
        problems: ws.data.problems.length,
        actors: ws.data.actors.length,
        kpis: ws.data.kpis.length,
        modules: ws.data.modules.length,
        features: Object.values(ws.data.features).flat().length
      }
    }));

    // Sort by creation date (newest first)
    workshopList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ workshops: workshopList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new workshop session
router.post('/create', async (req, res) => {
  try {
    const { boardName } = req.body;
    const workshopId = `ws_${Date.now()}`;

    const workshop = {
      id: workshopId,
      boardName,
      currentStep: 'problem_framing', // Start directly at problem_framing
      createdAt: new Date().toISOString(),
      figmaBoard: null, // Will be set when board is created
      data: {
        problems: [],
        actors: [],
        kpis: [],
        modules: [],
        features: {},
        prioritization: []
      },
      groups: {
        problems: [],
        actors: [],
        kpis: [],
        modules: []
      }
    };

    workshops.set(workshopId, workshop);
    saveWorkshop(workshops, workshopId); // Persist to file

    res.json({
      workshopId,
      boardName,
      currentStep: 'problem_framing',
      instructions: 'Estamos en la fase de Problem Framing. Pide a los participantes que mencionen problemas actuales, oportunidades identificadas y expectativas de la nueva plataforma. Cada idea será capturada como un sticky note.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import workshop from JSON
router.post('/import', async (req, res) => {
  try {
    const { boardName, workshopData } = req.body;
    const workshopId = `ws_${Date.now()}`;

    const workshop = {
      id: workshopId,
      boardName,
      currentStep: workshopData.currentStep || 'problem_framing',
      createdAt: new Date().toISOString(),
      figmaBoard: null,
      data: workshopData.data || {
        problems: [],
        actors: [],
        kpis: [],
        modules: [],
        features: {},
        prioritization: []
      },
      groups: workshopData.groups || {
        problems: [],
        actors: [],
        kpis: [],
        modules: []
      }
    };

    workshops.set(workshopId, workshop);
    saveWorkshop(workshops, workshopId);

    res.json({
      workshopId,
      boardName,
      message: 'Workshop importado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get workshop state
router.get('/:workshopId', (req, res) => {
  const workshop = workshops.get(req.params.workshopId);
  if (!workshop) {
    return res.status(404).json({ error: 'Workshop not found' });
  }
  res.json(workshop);
});

// Add item to current step
router.post('/:workshopId/add-item', async (req, res) => {
  try {
    const { workshopId } = req.params;
    const { text, step } = req.body;

    const workshop = workshops.get(workshopId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    const item = {
      id: `item_${Date.now()}`,
      text,
      timestamp: new Date().toISOString(),
      x: Math.random() * 600,
      y: Math.random() * 400
    };

    // Add to appropriate collection based on step
    switch (step) {
      case 'problem_framing':
        workshop.data.problems.push(item);
        break;
      case 'actors':
        workshop.data.actors.push(item);
        break;
      case 'kpis':
        workshop.data.kpis.push(item);
        break;
      case 'modules':
        workshop.data.modules.push(item);
        break;
      case 'features':
        const { moduleId } = req.body;
        if (!workshop.data.features[moduleId]) {
          workshop.data.features[moduleId] = [];
        }
        workshop.data.features[moduleId].push(item);
        break;
    }

    workshops.set(workshopId, workshop);
    saveWorkshop(workshops, workshopId); // Persist to file

    res.json({ success: true, item, totalItems: getStepItems(workshop, step).length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Group items for current step
router.post('/:workshopId/group-items', async (req, res) => {
  try {
    const { workshopId } = req.params;
    const { step } = req.body;

    const workshop = workshops.get(workshopId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    const items = getStepItems(workshop, step);
    if (items.length === 0) {
      return res.json({ groups: [], message: 'No items to group' });
    }

    const texts = items.map(item => item.text);

    // Use the full phase instructions for better context
    const phaseInstructions = {
      'problem_framing': 'Estamos en la fase de Problem Framing. Pide a los participantes que mencionen problemas actuales, oportunidades identificadas y expectativas de la nueva plataforma. Cada idea será capturada como un sticky note.',
      'actors': 'Ahora identificaremos los Actores Principales del sistema. ¿Quiénes son los usuarios principales? ¿Qué roles interactúan con la plataforma? ¿Cuáles son sus necesidades y comportamientos?',
      'kpis': 'Definamos los Indicadores de Éxito. ¿Cómo mediremos el éxito de la plataforma? ¿Qué KPIs son relevantes para el negocio? ¿Qué métricas de usuario son importantes?',
      'modules': 'Ahora definiremos los Módulos de la plataforma. ¿Qué módulos principales necesita? ¿Cómo se organizan las funcionalidades?'
    };

    const groupingResult = await geminiService.groupItems(texts, phaseInstructions[step] || step);

    // Map grouped items back to original items with positions
    const groupedData = groupingResult.groups.map((group, groupIndex) => {
      const groupItems = group.items.map(itemIndex => items[itemIndex - 1]).filter(Boolean);
      return {
        ...group,
        items: groupItems,
        position: {
          x: 100 + (groupIndex % 3) * 350,
          y: 100 + Math.floor(groupIndex / 3) * 400
        }
      };
    });

    // Store groups
    switch (step) {
      case 'problem_framing':
        workshop.groups.problems = groupedData;
        break;
      case 'actors':
        workshop.groups.actors = groupedData;
        break;
      case 'kpis':
        workshop.groups.kpis = groupedData;
        break;
      case 'modules':
        workshop.groups.modules = groupedData;
        break;
    }

    workshops.set(workshopId, workshop);
    saveWorkshop(workshops, workshopId); // Persist to file

    res.json({
      groups: groupedData,
      usedFallback: groupingResult.usedFallback || false,
      message: groupingResult.usedFallback
        ? 'Agrupación básica (Gemini API no disponible). Para mejor agrupación, habilita la API de Generative Language en tu proyecto de Google Cloud.'
        : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export workshop data for FigJam
router.get('/:workshopId/export', (req, res) => {
  try {
    const { workshopId } = req.params;
    const workshop = workshops.get(workshopId);

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    // Create formatted export
    const exportData = {
      workshopName: workshop.boardName,
      createdAt: workshop.createdAt,
      currentStep: workshop.currentStep,
      sections: []
    };

    // Problem Framing
    if (workshop.data.problems.length > 0) {
      const section = {
        title: 'PROBLEM FRAMING',
        items: workshop.data.problems.map(p => p.text),
        groups: workshop.groups.problems.map(g => ({
          category: g.category,
          items: g.items.map(i => i.text)
        }))
      };
      exportData.sections.push(section);
    }

    // Actors
    if (workshop.data.actors.length > 0) {
      const section = {
        title: 'ACTORES',
        items: workshop.data.actors.map(a => a.text),
        groups: workshop.groups.actors.map(g => ({
          category: g.category,
          items: g.items.map(i => i.text)
        }))
      };
      exportData.sections.push(section);
    }

    // KPIs
    if (workshop.data.kpis.length > 0) {
      const section = {
        title: 'KPIs',
        items: workshop.data.kpis.map(k => k.text),
        groups: workshop.groups.kpis.map(g => ({
          category: g.category,
          items: g.items.map(i => i.text)
        }))
      };
      exportData.sections.push(section);
    }

    // Modules
    if (workshop.data.modules.length > 0) {
      const section = {
        title: 'MÓDULOS',
        items: workshop.data.modules.map(m => m.text),
        groups: workshop.groups.modules.map(g => ({
          category: g.category,
          items: g.items.map(i => i.text)
        }))
      };
      exportData.sections.push(section);
    }

    // Features by Module
    if (Object.keys(workshop.data.features).length > 0) {
      const section = {
        title: 'FEATURES POR MÓDULO',
        modules: {}
      };

      for (const [moduleId, features] of Object.entries(workshop.data.features)) {
        const module = workshop.data.modules.find(m => m.id === moduleId);
        const moduleName = module ? module.text : moduleId;
        section.modules[moduleName] = features.map(f => f.text);
      }
      exportData.sections.push(section);
    }

    // Prioritization
    if (workshop.data.prioritization.length > 0) {
      const section = {
        title: 'MATRIZ DE PRIORIZACIÓN',
        features: workshop.data.prioritization.map(p => {
          const allFeatures = Object.values(workshop.data.features).flat();
          const feature = allFeatures.find(f => f.id === p.featureId);
          return {
            name: feature ? feature.text : p.featureId,
            value: p.averages?.value || 0,
            complexity: p.averages?.complexity || 0,
            quadrant: p.quadrant
          };
        })
      };
      exportData.sections.push(section);
    }

    // Generate text format for easy copy-paste
    let textExport = `=== ${exportData.workshopName.toUpperCase()} ===\n`;
    textExport += `Fecha: ${new Date(exportData.createdAt).toLocaleDateString('es-MX')}\n\n`;

    for (const section of exportData.sections) {
      textExport += `--- ${section.title} ---\n\n`;

      if (section.items) {
        section.items.forEach((item, i) => {
          textExport += `• ${item}\n`;
        });
        textExport += '\n';

        if (section.groups && section.groups.length > 0) {
          textExport += 'GRUPOS:\n';
          section.groups.forEach(group => {
            textExport += `  [${group.category}]\n`;
            group.items.forEach(item => {
              textExport += `    - ${item}\n`;
            });
          });
          textExport += '\n';
        }
      }

      if (section.modules) {
        for (const [moduleName, features] of Object.entries(section.modules)) {
          textExport += `  [${moduleName}]\n`;
          features.forEach(f => {
            textExport += `    - ${f}\n`;
          });
        }
        textExport += '\n';
      }

      if (section.features) {
        textExport += 'QUICK WINS (Alto Valor, Baja Complejidad):\n';
        section.features.filter(f => f.quadrant === 'quick-wins').forEach(f => {
          textExport += `  • ${f.name} (V:${f.value}, C:${f.complexity})\n`;
        });
        textExport += '\nPROYECTOS MAYORES (Alto Valor, Alta Complejidad):\n';
        section.features.filter(f => f.quadrant === 'major-projects').forEach(f => {
          textExport += `  • ${f.name} (V:${f.value}, C:${f.complexity})\n`;
        });
        textExport += '\nFILL-INS (Bajo Valor, Baja Complejidad):\n';
        section.features.filter(f => f.quadrant === 'fill-ins').forEach(f => {
          textExport += `  • ${f.name} (V:${f.value}, C:${f.complexity})\n`;
        });
        textExport += '\nEVITAR (Bajo Valor, Alta Complejidad):\n';
        section.features.filter(f => f.quadrant === 'avoid').forEach(f => {
          textExport += `  • ${f.name} (V:${f.value}, C:${f.complexity})\n`;
        });
      }
    }

    res.json({
      json: exportData,
      text: textExport
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Move to next step
router.post('/:workshopId/next-step', async (req, res) => {
  try {
    const { workshopId } = req.params;
    const workshop = workshops.get(workshopId);

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    const nextStepInfo = await geminiService.getNextStep(workshop.currentStep, workshop);
    workshop.currentStep = nextStepInfo.nextStep;
    workshops.set(workshopId, workshop);
    saveWorkshop(workshops, workshopId); // Persist to file

    res.json(nextStepInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set specific step
router.post('/:workshopId/set-step', async (req, res) => {
  try {
    const { workshopId } = req.params;
    const { step } = req.body;
    const workshop = workshops.get(workshopId);

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    const validSteps = ['problem_framing', 'actors', 'kpis', 'modules', 'features', 'prioritization', 'complete'];
    if (!validSteps.includes(step)) {
      return res.status(400).json({ error: 'Invalid step' });
    }

    workshop.currentStep = step;
    workshops.set(workshopId, workshop);
    saveWorkshop(workshops, workshopId);

    const instructionsMap = {
      'problem_framing': 'Estamos en la fase de Problem Framing. Pide a los participantes que mencionen problemas actuales, oportunidades identificadas y expectativas de la nueva plataforma. Cada idea será capturada como un sticky note.',
      'actors': 'Ahora identificaremos los Actores Principales del sistema. ¿Quiénes son los usuarios principales? ¿Qué roles interactúan con la plataforma? ¿Cuáles son sus necesidades y comportamientos?',
      'kpis': 'Definamos los Indicadores de Éxito. ¿Cómo mediremos el éxito de la plataforma? ¿Qué KPIs son relevantes para el negocio? ¿Qué métricas de usuario son importantes?',
      'modules': 'Ahora definiremos los Módulos de la plataforma. ¿Qué módulos principales necesita? ¿Cómo se organizan las funcionalidades?',
      'features': 'Para cada módulo, listemos sus Features. ¿Qué funcionalidades específicas tiene cada módulo? ¿Qué capacidades debe ofrecer?',
      'prioritization': 'Finalmente, priorizaremos usando la Matriz Valor-Complejidad. Para cada feature votar el valor para el negocio de 1 a 5, y la complejidad de implementación de 1 a 5.',
      'complete': 'El taller ha sido completado exitosamente.'
    };

    res.json({
      step,
      instructions: instructionsMap[step] || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Move to previous step
router.post('/:workshopId/prev-step', async (req, res) => {
  try {
    const { workshopId } = req.params;
    const workshop = workshops.get(workshopId);

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    const stepsOrder = ['start', 'problem_framing', 'actors', 'kpis', 'modules', 'features', 'prioritization', 'complete'];
    const currentIndex = stepsOrder.indexOf(workshop.currentStep);

    if (currentIndex <= 1) {
      return res.json({
        previousStep: workshop.currentStep,
        message: 'Ya estás en el primer paso'
      });
    }

    const previousStep = stepsOrder[currentIndex - 1];
    workshop.currentStep = previousStep;
    workshops.set(workshopId, workshop);
    saveWorkshop(workshops, workshopId); // Persist to file

    const instructions = await geminiService.getNextStep(stepsOrder[currentIndex - 2] || 'start', workshop);

    res.json({
      previousStep,
      instructions: instructions.instructions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update FigJam board info
router.post('/:workshopId/set-figma-board', (req, res) => {
  try {
    const { workshopId } = req.params;
    const { boardId, boardUrl } = req.body;

    const workshop = workshops.get(workshopId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    workshop.figmaBoard = {
      id: boardId,
      url: boardUrl
    };
    workshops.set(workshopId, workshop);
    saveWorkshop(workshops, workshopId); // Persist to file

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add prioritization vote
router.post('/:workshopId/vote', async (req, res) => {
  try {
    const { workshopId } = req.params;
    const { featureId, value, complexity, participantId } = req.body;

    const workshop = workshops.get(workshopId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    let feature = workshop.data.prioritization.find(f => f.featureId === featureId);
    if (!feature) {
      feature = {
        featureId,
        votes: []
      };
      workshop.data.prioritization.push(feature);
    }

    feature.votes.push({
      participantId,
      value,
      complexity,
      timestamp: new Date().toISOString()
    });

    // Calculate averages
    const avgValue = feature.votes.reduce((sum, v) => sum + v.value, 0) / feature.votes.length;
    const avgComplexity = feature.votes.reduce((sum, v) => sum + v.complexity, 0) / feature.votes.length;

    feature.averages = {
      value: Math.round(avgValue * 10) / 10,
      complexity: Math.round(avgComplexity * 10) / 10
    };

    // Determine quadrant
    feature.quadrant = getQuadrant(avgValue, avgComplexity);

    workshops.set(workshopId, workshop);
    saveWorkshop(workshops, workshopId); // Persist to file

    res.json({ feature });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get items for a step
function getStepItems(workshop, step) {
  switch (step) {
    case 'problem_framing':
      return workshop.data.problems;
    case 'actors':
      return workshop.data.actors;
    case 'kpis':
      return workshop.data.kpis;
    case 'modules':
      return workshop.data.modules;
    default:
      return [];
  }
}

// Helper function to determine quadrant (scale 1-5, threshold at 3)
function getQuadrant(value, complexity) {
  const highValue = value >= 3;
  const lowEffort = complexity <= 3;

  if (highValue && lowEffort) return 'quick-wins';
  if (highValue && !lowEffort) return 'major-projects';
  if (!highValue && lowEffort) return 'fill-ins';
  return 'avoid';
}

// Generate PPTX presentation
router.get('/:workshopId/generate-pptx', async (req, res) => {
  try {
    const { workshopId } = req.params;
    const workshop = workshops.get(workshopId);

    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    // Create temp directory first (needed for matrix image)
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const pptx = new PPTX.Composer();
    await pptx.compose(async pres => {
      // Colors for sticky notes (matching template)
      const colors = [
        '7EFFC4', // Green/cyan
        'D4E4FF', // Light blue
        'FFD1DC', // Pink
        'FFD4A3'  // Orange/peach
      ];

      // Helper to add section slides with groups
      const addSectionSlide = async (title, groups) => {
        if (!groups || groups.length === 0) return;

        const maxNotes = 8;
        const noteWidth = 150;
        const noteHeight = 120;
        const startX = 60;
        const startY = 150;
        const gapX = 10;
        const gapY = 10;

        await pres.addSlide(slide => {
          // Title
          slide.addText(text => {
            text.value('Resultados Workshop');
            text.x(60);
            text.y(50);
            text.cx(400);
            text.cy(30);
            text.fontSize(14);
            text.textColor('666666');
          });

          slide.addText(text => {
            text.value(title);
            text.x(60);
            text.y(80);
            text.cx(600);
            text.cy(50);
            text.fontSize(36);
            text.textColor('006D5B');
            // bold not supported in nodejs-pptx
          });

          // Add sticky notes grid (4x2)
          let noteIndex = 0;

          for (const group of groups) {
            if (noteIndex >= maxNotes) break;

            for (const item of group.items) {
              if (noteIndex >= maxNotes) break;

              const col = noteIndex % 4;
              const row = Math.floor(noteIndex / 4);
              const x = startX + col * (noteWidth + gapX);
              const y = startY + row * (noteHeight + gapY);
              const colorIndex = noteIndex % colors.length;

              // Sticky note background
              slide.addShape(shape => {
                shape.type('rect');
                shape.x(x);
                shape.y(y);
                shape.cx(noteWidth);
                shape.cy(noteHeight);
                shape.color(colors[colorIndex]);
              });

              // Text on sticky note
              const itemText = typeof item === 'string' ? item : (item.text || '');
              if (itemText) {
                slide.addText(text => {
                  text.value(itemText.substring(0, 100) + (itemText.length > 100 ? '...' : ''));
                  text.x(x + 10);
                  text.y(y + 10);
                  text.cx(noteWidth - 20);
                  text.cy(noteHeight - 20);
                  text.fontSize(12);
                  text.textColor('333333');
                });
              }

              noteIndex++;
            }
          }
        });

        // If more than 8 items, create additional slides
        let totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);
        if (totalItems > maxNotes) {
          let remainingItems = [];
          let count = 0;
          for (const group of groups) {
            for (const item of group.items) {
              if (count >= maxNotes) {
                remainingItems.push(item);
              }
              count++;
            }
          }

          // Create continuation slides
          while (remainingItems.length > 0) {
            const batch = remainingItems.splice(0, maxNotes);
            await pres.addSlide(slide => {
              slide.addText(text => {
                text.value(`${title} (continuación)`);
                text.x(60);
                text.y(80);
                text.cx(600);
                text.cy(50);
                text.fontSize(36);
                text.textColor('006D5B');
                // bold not supported in nodejs-pptx
              });

              batch.forEach((item, idx) => {
                const col = idx % 4;
                const row = Math.floor(idx / 4);
                const x = 60 + col * 160;
                const y = 150 + row * 130;
                const colorIndex = idx % colors.length;

                slide.addShape(shape => {
                  shape.type('rect');
                  shape.x(x);
                  shape.y(y);
                  shape.cx(150);
                  shape.cy(120);
                  shape.color(colors[colorIndex]);
                });

                const itemText = typeof item === 'string' ? item : (item.text || '');
                if (itemText) {
                  slide.addText(text => {
                    text.value(itemText.substring(0, 100));
                    text.x(x + 8);
                    text.y(y + 8);
                    text.cx(134);
                    text.cy(104);
                    text.fontSize(10);
                    text.textColor('333333');
                  });
                }
              });
            });
          }
        }
      };

      // Add slides for each section
      if (workshop.groups.problems.length > 0) {
        await addSectionSlide('Problem Framing', workshop.groups.problems);
      }
      if (workshop.groups.actors.length > 0) {
        await addSectionSlide('Actores', workshop.groups.actors);
      }
      if (workshop.groups.kpis.length > 0) {
        await addSectionSlide('KPIs', workshop.groups.kpis);
      }
      if (workshop.groups.modules.length > 0) {
        await addSectionSlide('Módulos', workshop.groups.modules);
      }

      // Features by module
      if (Object.keys(workshop.data.features).length > 0) {
        for (const [moduleId, features] of Object.entries(workshop.data.features)) {
          if (features.length === 0) continue;

          const module = workshop.data.modules.find(m => m.id === moduleId);
          const moduleName = module ? module.text : moduleId;

          await pres.addSlide(slide => {
            slide.addText(text => {
              text.value('Resultados Workshop');
              text.x(60);
              text.y(50);
              text.cx(400);
              text.cy(30);
              text.fontSize(14);
              text.textColor('666666');
            });

            slide.addText(text => {
              text.value(`Features - ${moduleName}`);
              text.x(60);
              text.y(80);
              text.cx(600);
              text.cy(50);
              text.fontSize(36);
              text.textColor('006D5B');
              // bold not supported in nodejs-pptx
            });

            features.slice(0, 8).forEach((feature, idx) => {
              const col = idx % 4;
              const row = Math.floor(idx / 4);
              const x = 60 + col * 160;
              const y = 150 + row * 130;
              const colorIndex = idx % colors.length;

              slide.addShape(shape => {
                shape.type('rect');
                shape.x(x);
                shape.y(y);
                shape.cx(150);
                shape.cy(120);
                shape.color(colors[colorIndex]);
              });

              slide.addText(text => {
                text.value(feature.text.substring(0, 100));
                text.x(x + 8);
                text.y(y + 8);
                text.cx(134);
                text.cy(104);
                text.fontSize(10);
                text.textColor('333333');
              });
            });
          });
        }
      }

      // Prioritization Matrix slide
      if (workshop.data.prioritization.length > 0) {
        // Generate matrix as PNG image using canvas
        const canvasWidth = 600;
        const canvasHeight = 450;
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Chart dimensions within canvas
        const chartMarginLeft = 80;
        const chartMarginTop = 60;
        const chartMarginRight = 50;
        const chartMarginBottom = 60;
        const chartWidth = canvasWidth - chartMarginLeft - chartMarginRight;
        const chartHeight = canvasHeight - chartMarginTop - chartMarginBottom;

        // Draw axes
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;

        // Y-axis (Valor)
        ctx.beginPath();
        ctx.moveTo(chartMarginLeft, chartMarginTop);
        ctx.lineTo(chartMarginLeft, chartMarginTop + chartHeight);
        ctx.stroke();

        // X-axis (Complejidad)
        ctx.beginPath();
        ctx.moveTo(chartMarginLeft, chartMarginTop + chartHeight);
        ctx.lineTo(chartMarginLeft + chartWidth, chartMarginTop + chartHeight);
        ctx.stroke();

        // Quadrant dividers (dashed lines)
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 8]);

        // Horizontal middle line
        ctx.beginPath();
        ctx.moveTo(chartMarginLeft, chartMarginTop + chartHeight / 2);
        ctx.lineTo(chartMarginLeft + chartWidth, chartMarginTop + chartHeight / 2);
        ctx.stroke();

        // Vertical middle line
        ctx.beginPath();
        ctx.moveTo(chartMarginLeft + chartWidth / 2, chartMarginTop);
        ctx.lineTo(chartMarginLeft + chartWidth / 2, chartMarginTop + chartHeight);
        ctx.stroke();

        ctx.setLineDash([]);

        // Axis labels
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 14px Arial';

        // Y-axis label (Valor) - rotated
        ctx.save();
        ctx.translate(20, chartMarginTop + chartHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('VALOR', 0, 0);
        ctx.restore();

        // X-axis label (Complejidad)
        ctx.textAlign = 'center';
        ctx.fillText('COMPLEJIDAD', chartMarginLeft + chartWidth / 2, canvasHeight - 15);

        // Y-axis scale labels
        ctx.font = '11px Arial';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'right';
        ctx.fillText('Alto (5)', chartMarginLeft - 10, chartMarginTop + 10);
        ctx.fillText('Bajo (1)', chartMarginLeft - 10, chartMarginTop + chartHeight - 5);

        // X-axis scale labels
        ctx.textAlign = 'center';
        ctx.fillText('Alta (5)', chartMarginLeft + 15, chartMarginTop + chartHeight + 20);
        ctx.fillText('Baja (1)', chartMarginLeft + chartWidth - 15, chartMarginTop + chartHeight + 20);

        // Group features by quadrant and sort by priority score
        const quadrants = {
          'quick-wins': [],
          'major-projects': [],
          'fill-ins': [],
          'avoid': []
        };

        const allFeatures = Object.values(workshop.data.features).flat();

        workshop.data.prioritization.forEach((prio, idx) => {
          if (!prio.averages) return;

          const feature = allFeatures.find(f => f.id === prio.featureId);
          let featureName = feature ? feature.text : `Item ${idx + 1}`;

          // Find the module this feature belongs to
          let moduleName = '';
          for (const [moduleId, moduleFeatures] of Object.entries(workshop.data.features)) {
            if (moduleFeatures.some(f => f.id === prio.featureId)) {
              const module = workshop.data.modules.find(m => m.id === moduleId);
              moduleName = module ? module.text : '';
              break;
            }
          }

          // Include module name in feature name
          const fullName = moduleName ? `${moduleName} - ${featureName}` : featureName;

          // Priority score: higher value and lower complexity = better
          const priorityScore = prio.averages.value * (6 - prio.averages.complexity);

          const quadrant = getQuadrant(prio.averages.value, prio.averages.complexity);
          quadrants[quadrant].push({
            name: fullName,
            value: prio.averages.value,
            complexity: prio.averages.complexity,
            score: priorityScore
          });
        });

        // Sort each quadrant by priority score (descending)
        Object.keys(quadrants).forEach(q => {
          quadrants[q].sort((a, b) => b.score - a.score);
        });

        // Draw quadrant backgrounds with labels
        const quadrantConfig = [
          { key: 'major-projects', label: 'MAJOR PROJECTS', x: chartMarginLeft, y: chartMarginTop, color: '#FFF3E0' },
          { key: 'quick-wins', label: 'QUICK WINS', x: chartMarginLeft + chartWidth / 2, y: chartMarginTop, color: '#E8F5E9' },
          { key: 'avoid', label: 'AVOID', x: chartMarginLeft, y: chartMarginTop + chartHeight / 2, color: '#FFEBEE' },
          { key: 'fill-ins', label: 'FILL-INS', x: chartMarginLeft + chartWidth / 2, y: chartMarginTop + chartHeight / 2, color: '#E3F2FD' }
        ];

        quadrantConfig.forEach(config => {
          // Light background for each quadrant
          ctx.fillStyle = config.color;
          ctx.fillRect(config.x, config.y, chartWidth / 2, chartHeight / 2);

          // Quadrant title
          ctx.font = 'bold 11px Arial';
          ctx.fillStyle = '#006D5B';
          ctx.textAlign = 'center';
          ctx.fillText(config.label, config.x + chartWidth / 4, config.y + 18);

          // List features in this quadrant
          ctx.font = '9px Arial';
          ctx.fillStyle = '#333333';
          ctx.textAlign = 'left';

          const items = quadrants[config.key];
          const maxItems = 6; // Max items per quadrant
          const lineHeight = 14;
          const startY = config.y + 35;
          const startX = config.x + 10;
          const maxWidth = chartWidth / 2 - 20;

          items.slice(0, maxItems).forEach((item, idx) => {
            const y = startY + idx * lineHeight;
            const labelText = item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name;

            // Bullet point
            ctx.fillStyle = '#7EFFC4';
            ctx.beginPath();
            ctx.arc(startX + 4, y - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#006D5B';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Feature name
            ctx.fillStyle = '#333333';
            ctx.fillText(`${labelText}`, startX + 12, y);
          });

          // Show count if more items
          if (items.length > maxItems) {
            ctx.fillStyle = '#999999';
            ctx.font = 'italic 8px Arial';
            ctx.fillText(`+${items.length - maxItems} más...`, startX + 12, startY + maxItems * lineHeight);
            ctx.font = '9px Arial';
          }
        });

        // Save canvas to PNG file
        const matrixImagePath = path.join(tempDir, `matrix_${workshopId}_${Date.now()}.png`);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(matrixImagePath, buffer);

        // Add slide with the matrix image
        await pres.addSlide(async slide => {
          // Title
          slide.addText(text => {
            text.value('Resultados Discovery');
            text.x(60);
            text.y(30);
            text.cx(400);
            text.cy(25);
            text.fontSize(12);
            text.textColor('666666');
          });

          slide.addText(text => {
            text.value('Matriz de impacto');
            text.x(60);
            text.y(55);
            text.cx(400);
            text.cy(40);
            text.fontSize(28);
            text.textColor('006D5B');
          });

          // Add the matrix image - centered on slide
          slide.addImage(image => {
            image.file(matrixImagePath);
            image.x(100);
            image.y(110);
            image.cx(550);
            image.cy(400);
          });
        });

        // Clean up matrix image after adding to PPTX
        setTimeout(() => {
          if (fs.existsSync(matrixImagePath)) {
            fs.unlinkSync(matrixImagePath);
          }
        }, 5000);
      }
    });

    // Save to temp file
    const fileName = `workshop_${workshopId}_${Date.now()}.pptx`;
    const filePath = path.join(tempDir, fileName);

    await pptx.save(filePath);

    // Send file
    res.download(filePath, `${workshop.boardName.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`, (err) => {
      // Clean up temp file after download
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (err) {
        console.error('Error sending file:', err);
      }
    });
  } catch (error) {
    console.error('Error generating PPTX:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
