import { GoogleGenAI } from '@google/genai';

class GeminiService {
  constructor() {
    // Lazy initialization - will be set on first use
    this.ai = null;
    this.modelName = 'gemini-2.0-flash';
    this.isAvailable = true;
  }

  getAI() {
    if (!this.ai) {
      // Initialize only when needed, after env vars are loaded
      console.log('Initializing Gemini AI with API key:', process.env.GEMINI_API_KEY ? 'present' : 'missing');
      this.ai = new GoogleGenAI({});
    }
    return this.ai;
  }

  // Fallback grouping using simple keyword matching
  fallbackGrouping(items) {
    console.log('Using fallback grouping algorithm...');

    // Common keywords for grouping
    const keywordGroups = {
      'Tecnología': ['sistema', 'plataforma', 'software', 'digital', 'app', 'aplicación', 'datos', 'integración', 'automatizar', 'tecnología'],
      'Usuarios': ['usuario', 'cliente', 'persona', 'gente', 'equipo', 'empleado', 'operador', 'administrador'],
      'Procesos': ['proceso', 'flujo', 'operación', 'gestión', 'control', 'seguimiento', 'monitoreo'],
      'Comunicación': ['comunicación', 'información', 'reportes', 'notificación', 'alerta', 'mensaje'],
      'Eficiencia': ['tiempo', 'costo', 'eficiencia', 'productividad', 'optimizar', 'mejorar', 'reducir'],
      'Calidad': ['calidad', 'error', 'falla', 'problema', 'defecto', 'confiabilidad'],
      'Seguridad': ['seguridad', 'acceso', 'permiso', 'autorización', 'privacidad'],
      'Análisis': ['análisis', 'métricas', 'kpi', 'indicador', 'medición', 'estadística']
    };

    const groups = [];
    const assigned = new Set();

    // Group items by keywords
    for (const [category, keywords] of Object.entries(keywordGroups)) {
      const groupItems = [];
      items.forEach((item, index) => {
        if (assigned.has(index)) return;
        const lowerItem = item.toLowerCase();
        if (keywords.some(kw => lowerItem.includes(kw))) {
          groupItems.push(index + 1);
          assigned.add(index);
        }
      });
      if (groupItems.length > 0) {
        groups.push({
          category,
          items: groupItems,
          description: `Items relacionados con ${category.toLowerCase()}`
        });
      }
    }

    // Add remaining items to "Otros" group
    const unassigned = [];
    items.forEach((_, index) => {
      if (!assigned.has(index)) {
        unassigned.push(index + 1);
      }
    });
    if (unassigned.length > 0) {
      groups.push({
        category: 'Otros',
        items: unassigned,
        description: 'Items que no coinciden con categorías específicas'
      });
    }

    return { groups, usedFallback: true };
  }

  // Group similar items semantically
  async groupItems(items, context = 'problemas y oportunidades') {
    const prompt = `Eres un analista semántico experto en descubrir patrones y conceptos subyacentes en talleres de diseño de producto.

CONTEXTO DE LA FASE ACTUAL:
${context}

Tu rol es:
1. COMPRENDER el objetivo de esta fase del taller según el contexto proporcionado
2. IDENTIFICAR conceptos relacionados semánticamente basándote en el propósito de la fase
3. AGRUPAR items que compartan el mismo concepto subyacente, propósito, o área de impacto

Items a analizar:
${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

INSTRUCCIONES CRÍTICAS:
- Busca SIGNIFICADOS y CONCEPTOS, no coincidencias de palabras literales
- Agrupa según la naturaleza de la fase (problemas/oportunidades, actores/roles, KPIs/métricas, o módulos/funcionalidades)
- Un item puede referirse a un concepto sin usar las palabras exactas
- Crea categorías que revelen insights y patrones útiles para la toma de decisiones
- Los nombres de categoría deben ser claros y accionables (1-3 palabras)

Responde ÚNICAMENTE en formato JSON válido:
{
  "groups": [
    {
      "category": "Nombre conceptual (1-3 palabras)",
      "items": [1, 3, 5],
      "description": "Explicación del concepto común que une estos items"
    }
  ]
}

IMPORTANTE: Todos los items DEBEN estar en al menos un grupo. No dejes items sin clasificar.`;

    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: prompt
      });
      const text = response.text;

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        this.isAvailable = true;
        console.log('Successfully grouped items with Gemini AI');
        return { ...parsed, usedFallback: false };
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Error grouping items with Gemini:', error);
      this.isAvailable = false;

      // Throw error instead of fallback so we can see if Gemini works
      throw error;
    }
  }

  // Guide the workshop process
  async getNextStep(currentStep, context) {
    const steps = {
      'start': 'problem_framing',
      'problem_framing': 'actors',
      'actors': 'kpis',
      'kpis': 'modules',
      'modules': 'features',
      'features': 'prioritization',
      'prioritization': 'complete'
    };

    const instructions = {
      'problem_framing': 'Estamos en la fase de Problem Framing. Pide a los participantes que mencionen problemas actuales, oportunidades identificadas y expectativas de la nueva plataforma. Cada idea será capturada como un sticky note.',

      'actors': 'Ahora identificaremos los Actores Principales del sistema. ¿Quiénes son los usuarios principales? ¿Qué roles interactúan con la plataforma? ¿Cuáles son sus necesidades y comportamientos?',

      'kpis': 'Definamos los Indicadores de Éxito. ¿Cómo mediremos el éxito de la plataforma? ¿Qué KPIs son relevantes para el negocio? ¿Qué métricas de usuario son importantes?',

      'modules': 'Ahora definiremos los Módulos de la plataforma. ¿Qué módulos principales necesita? ¿Cómo se organizan las funcionalidades?',

      'features': 'Para cada módulo, listemos sus Features. ¿Qué funcionalidades específicas tiene cada módulo? ¿Qué capacidades debe ofrecer?',

      'prioritization': 'Finalmente, priorizaremos usando la Matriz Valor-Complejidad. Para cada feature votar el valor para el negocio de 1 a 5, y la complejidad de implementación de 1 a 5.',

      'complete': 'El taller ha sido completado exitosamente.'
    };

    return {
      nextStep: steps[currentStep] || 'complete',
      instructions: instructions[steps[currentStep]] || 'Taller completado'
    };
  }

  // Analyze and suggest improvements
  async analyzeContent(content, type) {
    const prompt = `Como experto en diseño de productos, analiza este ${type}:

"${content}"

Proporciona:
1. Si es claro y específico
2. Sugerencias de mejora (si aplica)
3. Posibles items relacionados que podrían faltar

Responde en formato JSON:
{
  "isValid": true/false,
  "clarity": "alta/media/baja",
  "suggestions": ["sugerencia 1", "sugerencia 2"],
  "relatedItems": ["item relacionado 1"]
}`;

    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: prompt
      });
      const text = response.text;

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { isValid: true, clarity: 'media', suggestions: [], relatedItems: [] };
    } catch (error) {
      console.error('Error analyzing content:', error);
      return { isValid: true, clarity: 'media', suggestions: [], relatedItems: [] };
    }
  }
}

export default new GeminiService();
