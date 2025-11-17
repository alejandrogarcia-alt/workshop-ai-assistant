import express from 'express';
import figmaService from '../services/figmaService.js';

const router = express.Router();

// In-memory storage for FigJam board data
const boards = new Map();

// Create new FigJam board
router.post('/create-board', async (req, res) => {
  try {
    const { name, workshopId } = req.body;

    // Try to create FigJam file via API
    let figmaFile = null;
    try {
      figmaFile = await figmaService.createFigJamFile(name);
    } catch (err) {
      console.log('Using local board simulation (Figma API may have limitations)');
    }

    const boardId = figmaFile?.key || `local_${Date.now()}`;
    const board = {
      id: boardId,
      name,
      workshopId,
      fileKey: figmaFile?.key || null,
      fileUrl: figmaFile?.key ? `https://www.figma.com/file/${figmaFile.key}` : null,
      frames: [],
      elements: [],
      createdAt: new Date().toISOString()
    };

    boards.set(boardId, board);

    res.json({
      success: true,
      boardId,
      fileUrl: board.fileUrl,
      message: board.fileKey
        ? 'FigJam board created successfully'
        : 'Using local board (connect Figma plugin for sync)'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add frame to board
router.post('/:boardId/add-frame', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name, x, y, width, height } = req.body;

    const board = boards.get(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const frame = await figmaService.createFrame(board.fileKey, name, x, y, width, height);
    board.frames.push(frame);
    boards.set(boardId, board);

    res.json({ success: true, frame });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add sticky note to board
router.post('/:boardId/add-sticky', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { text, x, y, color } = req.body;

    const board = boards.get(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const colorMap = {
      'yellow': '#FFF9B1',
      'pink': '#FFD1DC',
      'blue': '#B1D4FF',
      'green': '#B1FFB1',
      'orange': '#FFD4A3',
      'purple': '#D4B1FF'
    };

    const stickyColor = colorMap[color] || color || '#FFF9B1';
    const sticky = await figmaService.createStickyNote(board.fileKey, text, x, y, stickyColor);
    board.elements.push(sticky);
    boards.set(boardId, board);

    res.json({ success: true, sticky });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add text label (for group headers)
router.post('/:boardId/add-label', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { text, x, y, fontSize } = req.body;

    const board = boards.get(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const label = await figmaService.createTextLabel(board.fileKey, text, x, y, fontSize);
    board.elements.push(label);
    boards.set(boardId, board);

    res.json({ success: true, label });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create grouped layout (after AI grouping)
router.post('/:boardId/create-grouped-layout', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { groups, frameName } = req.body;

    const board = boards.get(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const layout = {
      frameId: `frame_${Date.now()}`,
      frameName,
      groups: []
    };

    // Create visual layout for each group
    groups.forEach((group, groupIndex) => {
      const groupX = 100 + (groupIndex % 3) * 400;
      const groupY = 100 + Math.floor(groupIndex / 3) * 350;

      // Add group header label
      const label = {
        type: 'TEXT',
        text: group.category,
        x: groupX,
        y: groupY - 40,
        fontSize: 20,
        fontWeight: 'bold',
        id: `label_${Date.now()}_${groupIndex}`
      };
      board.elements.push(label);

      // Add sticky notes for items in this group
      const groupStickies = group.items.map((item, itemIndex) => {
        const stickyX = groupX + (itemIndex % 2) * 180;
        const stickyY = groupY + Math.floor(itemIndex / 2) * 120;

        const sticky = {
          type: 'STICKY',
          text: item.text || item,
          x: stickyX,
          y: stickyY,
          color: getGroupColor(groupIndex),
          id: `sticky_${Date.now()}_${groupIndex}_${itemIndex}`
        };
        board.elements.push(sticky);
        return sticky;
      });

      layout.groups.push({
        category: group.category,
        description: group.description,
        label,
        stickies: groupStickies
      });
    });

    boards.set(boardId, board);

    res.json({ success: true, layout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create prioritization matrix
router.post('/:boardId/create-matrix', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { features } = req.body;

    const board = boards.get(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    // Matrix dimensions
    const matrixX = 100;
    const matrixY = 100;
    const matrixWidth = 800;
    const matrixHeight = 600;

    // Create matrix frame
    const matrixFrame = {
      type: 'FRAME',
      name: 'Matriz de Priorización',
      x: matrixX,
      y: matrixY,
      width: matrixWidth,
      height: matrixHeight,
      id: `matrix_frame_${Date.now()}`
    };
    board.frames.push(matrixFrame);

    // Add axis labels
    const axisLabels = [
      { text: 'Alto Valor', x: matrixX + matrixWidth / 2, y: matrixY - 30 },
      { text: 'Bajo Valor', x: matrixX + matrixWidth / 2, y: matrixY + matrixHeight + 10 },
      { text: 'Alta Complejidad', x: matrixX - 60, y: matrixY + matrixHeight / 2 },
      { text: 'Baja Complejidad', x: matrixX + matrixWidth + 10, y: matrixY + matrixHeight / 2 }
    ];

    axisLabels.forEach(label => {
      board.elements.push({
        type: 'TEXT',
        ...label,
        fontSize: 14,
        id: `axis_${Date.now()}_${Math.random()}`
      });
    });

    // Add quadrant labels
    const quadrantLabels = [
      { text: 'Quick Wins', x: matrixX + matrixWidth * 0.75, y: matrixY + 20 },
      { text: 'Major Projects', x: matrixX + 20, y: matrixY + 20 },
      { text: 'Fill-ins', x: matrixX + matrixWidth * 0.75, y: matrixY + matrixHeight - 40 },
      { text: 'Avoid', x: matrixX + 20, y: matrixY + matrixHeight - 40 }
    ];

    quadrantLabels.forEach(label => {
      board.elements.push({
        type: 'TEXT',
        ...label,
        fontSize: 16,
        fontWeight: 'bold',
        id: `quadrant_${Date.now()}_${Math.random()}`
      });
    });

    // Position features on matrix
    const positionedFeatures = features.map(feature => {
      // Convert value/complexity to matrix coordinates
      // High value = top, Low complexity = right
      const x = matrixX + matrixWidth - (feature.averages.complexity / 10) * matrixWidth;
      const y = matrixY + matrixHeight - (feature.averages.value / 10) * matrixHeight;

      const sticky = {
        type: 'STICKY',
        text: `${feature.name}\nValor: ${feature.averages.value}\nComplejidad: ${feature.averages.complexity}`,
        x,
        y,
        color: getQuadrantColor(feature.quadrant),
        id: `feature_${feature.featureId}`
      };
      board.elements.push(sticky);
      return { ...feature, position: { x, y }, sticky };
    });

    boards.set(boardId, board);

    res.json({ success: true, matrix: matrixFrame, features: positionedFeatures });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get board data (for rendering in frontend)
router.get('/:boardId', (req, res) => {
  const board = boards.get(req.params.boardId);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  res.json(board);
});

// Helper function for group colors
function getGroupColor(index) {
  const colors = ['#FFF9B1', '#FFD1DC', '#B1D4FF', '#B1FFB1', '#FFD4A3', '#D4B1FF'];
  return colors[index % colors.length];
}

// Helper function for quadrant colors
function getQuadrantColor(quadrant) {
  const colors = {
    'quick-wins': '#B1FFB1',
    'major-projects': '#FFD4A3',
    'fill-ins': '#B1D4FF',
    'avoid': '#FFD1DC'
  };
  return colors[quadrant] || '#FFF9B1';
}

export default router;
