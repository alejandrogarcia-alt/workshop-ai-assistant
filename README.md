# Workshop AI Assistant

Aplicación web móvil para facilitar talleres de diseño de producto con IA y visualización en FigJam.

## Características

- **Asistente IA** (Gemini) que guía paso a paso por el proceso del taller
- **Captura por voz y texto** para registrar ideas de participantes
- **Agrupamiento semántico automático** usando IA
- **Integración con FigJam** para visualización colaborativa
- **PWA optimizada** para iPhone 16 Pro Max

## Etapas del Taller

1. **Problem Framing** - Definición de problemas, oportunidades y expectativas
2. **Actores** - Identificación de usuarios y roles del sistema
3. **KPIs** - Indicadores de éxito y métricas
4. **Feature Mapping** - Módulos y funcionalidades
5. **Priorización** - Matriz Valor vs Complejidad

## Requisitos

- Node.js 18+
- npm o yarn

## Instalación

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Configuración

Las credenciales ya están configuradas en `backend/.env`:

```
GEMINI_API_KEY=your_gemini_key
FIGMA_ACCESS_TOKEN=your_figma_token
FIGMA_TEAM_ID=your_team_id
PORT=3001
```

## Ejecución

### Desarrollo (dos terminales)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Acceso desde iPhone

1. Asegúrate de estar en la misma red WiFi
2. Obtén tu IP local: `ifconfig | grep inet`
3. En el iPhone, abre: `http://TU_IP:3000`
4. Para agregar a Home Screen: Safari → Compartir → "Agregar a pantalla de inicio"

## Uso

1. **Crear Workshop** - Ingresa el nombre del tablero FigJam
2. **Problem Framing** - Agrega problemas/oportunidades por texto o voz
3. **Agrupar** - Presiona "Agrupar con IA" para organizar automáticamente
4. **Navegar** - Usa "Siguiente" para avanzar entre etapas
5. **Priorizar** - Vota valor y complejidad para cada feature

## Arquitectura

```
workshop-ai-assistant/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server
│   │   ├── routes/
│   │   │   ├── workshop.js   # Workshop state management
│   │   │   ├── figma.js      # FigJam integration
│   │   │   └── ai.js         # Gemini AI endpoints
│   │   └── services/
│   │       ├── geminiService.js  # AI grouping & analysis
│   │       └── figmaService.js   # Figma API client
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main router
    │   ├── pages/
    │   │   ├── Home.jsx      # Workshop creation
    │   │   └── Workshop.jsx  # Main workshop flow
    │   ├── components/
    │   │   ├── VoiceInput.jsx         # Text & voice capture
    │   │   ├── StickyNoteGrid.jsx     # Item display
    │   │   ├── GroupedView.jsx        # AI-grouped view
    │   │   ├── StepIndicator.jsx      # Progress tracker
    │   │   ├── ModuleSelector.jsx     # Module tabs
    │   │   └── PrioritizationMatrix.jsx # Value-Complexity matrix
    │   ├── hooks/
    │   │   └── useSpeechRecognition.js # Web Speech API
    │   └── services/
    │       └── api.js        # Backend API client
    └── package.json
```

## API Endpoints

### Workshop
- `POST /api/workshop/create` - Crear nuevo workshop
- `GET /api/workshop/:id` - Obtener estado
- `POST /api/workshop/:id/add-item` - Agregar item
- `POST /api/workshop/:id/group-items` - Agrupar con IA
- `POST /api/workshop/:id/next-step` - Siguiente etapa
- `POST /api/workshop/:id/vote` - Votar priorización

### Figma
- `POST /api/figma/create-board` - Crear tablero
- `POST /api/figma/:id/add-sticky` - Agregar sticky note
- `POST /api/figma/:id/create-grouped-layout` - Layout agrupado

### AI
- `POST /api/ai/group` - Agrupar items semánticamente
- `POST /api/ai/analyze` - Analizar contenido
- `POST /api/ai/guidance` - Obtener guía del paso actual

## Notas sobre Figma

La API REST de Figma tiene limitaciones para crear elementos directamente en archivos.
El sistema actual:
- Crea archivos FigJam via API
- Mantiene el estado de elementos localmente
- Para sincronización completa, se requeriría un plugin de Figma

## Personalización

### Cambiar idioma de reconocimiento de voz
En `frontend/src/hooks/useSpeechRecognition.js`:
```javascript
recognition.lang = 'es-MX'; // Cambiar a 'en-US' para inglés
```

### Ajustar colores del tema
En `frontend/src/index.css`:
```css
:root {
  --primary: #00D9A3;  /* Color principal */
  --secondary: #1E3A5F; /* Color secundario */
}
```

## Próximos Pasos

1. Agregar persistencia con base de datos (MongoDB/PostgreSQL)
2. Implementar plugin de Figma para sincronización real
3. Soporte multi-usuario en tiempo real (WebSockets)
4. Exportar resultados a PDF/CSV
5. Integración con herramientas de gestión (Jira, Notion)
