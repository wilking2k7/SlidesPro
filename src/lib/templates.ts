/**
 * Plantillas de presentación (DIFERENTES de los themes).
 *
 *  - Theme = identidad visual (colores, fuentes, mood)
 *  - Template = estructura de contenido + tono (qué tipo de deck es)
 *
 * El designer agent recibe el `designerHint` de la plantilla y lo usa para
 * decidir la secuencia de layouts y el tono. La plantilla también sugiere
 * un theme por defecto y un slide count óptimo.
 */

export type PresentationTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  defaultSlideCount: number;
  defaultThemeSlug: string;
  designerHint: string; // Inyectado en el prompt del designer
  outline: string[]; // Para mostrar al usuario qué esperar
};

export const TEMPLATES: PresentationTemplate[] = [
  {
    id: "auto",
    name: "Auto",
    description: "Deja que la IA elija la mejor estructura según tu fuente.",
    emoji: "✨",
    defaultSlideCount: 8,
    defaultThemeSlug: "editorial",
    designerHint: "",
    outline: [],
  },
  {
    id: "pitch-deck",
    name: "Pitch deck",
    description:
      "Para inversores: gancho, problema, solución, mercado, tracción, equipo, CTA.",
    emoji: "🚀",
    defaultSlideCount: 12,
    defaultThemeSlug: "editorial",
    designerHint: `This is a STARTUP PITCH DECK for investors. Recommended sequence:
1. Cover (company name + one-line value prop)
2. Hook / problem statement (something visceral)
3. Solution (your product, in one frame)
4. Market opportunity (TAM/SAM/SOM if data available)
5. Product / how it works (image-full or image-left)
6. Traction (data slide with chart if numbers exist)
7. Business model
8. Competition / why now
9. Team
10. Roadmap / vision
11. The ask (raise amount + use of funds)
12. Closing (contact)
Tone: confident, declarative, data-driven. Use "image-full" for emotional beats. Charts when traction data is present.`,
    outline: [
      "Cover · gancho · problema",
      "Solución · producto",
      "Mercado · tracción (chart)",
      "Modelo · competencia · equipo",
      "Roadmap · ask · cierre",
    ],
  },
  {
    id: "executive-report",
    name: "Reporte ejecutivo",
    description:
      "Resumen para C-level: insights clave, datos, conclusiones, próximos pasos.",
    emoji: "📊",
    defaultSlideCount: 10,
    defaultThemeSlug: "cleantech",
    designerHint: `This is an EXECUTIVE REPORT for C-level decision-makers. Recommended sequence:
1. Cover (report title + period + author)
2. Executive summary (3-4 bullet points with the headline findings)
3. Context / methodology (brief)
4-7. Key findings (one per slide, each with a chart or table when data warrants)
8. Risks / considerations
9. Recommendations / next steps (clear, actionable bullets)
10. Closing / Q&A
Tone: precise, data-forward, neutral. Use "data" layouts (chart + commentary). Avoid hyperbole.`,
    outline: [
      "Cover · executive summary",
      "Contexto · 4 hallazgos clave",
      "Riesgos · recomendaciones",
      "Cierre · Q&A",
    ],
  },
  {
    id: "educational",
    name: "Educativo",
    description:
      "Para enseñar un tema: introducción, conceptos, ejemplos, ejercicios, cierre.",
    emoji: "🎓",
    defaultSlideCount: 10,
    defaultThemeSlug: "apple",
    designerHint: `This is an EDUCATIONAL PRESENTATION. Recommended sequence:
1. Cover (topic title + lesson context)
2. Learning objectives (what students will know after this)
3. Hook / why this matters
4-6. Core concepts (one per slide, with definitions + examples)
7-8. Worked examples / case studies
9. Practice exercise / discussion question
10. Summary / key takeaways
Tone: clear, friendly, scaffolded. Use "two-col" for concept+example pairs. Use "quote" for memorable definitions.`,
    outline: [
      "Cover · objetivos · hook",
      "Conceptos clave (3)",
      "Ejemplos · ejercicios",
      "Resumen · takeaways",
    ],
  },
  {
    id: "sales",
    name: "Sales / propuesta",
    description: "Pitch de producto a un prospecto: dolor, solución, ROI, cierre.",
    emoji: "💼",
    defaultSlideCount: 9,
    defaultThemeSlug: "bold",
    designerHint: `This is a SALES PROPOSAL for a specific prospect. Recommended sequence:
1. Cover (your company + their company name + date)
2. Their challenge (mirror their pain back to them)
3. The cost of inaction (numbers if possible)
4. Our solution (your product, focused on their pain)
5. How it works (demo image + 3 features)
6. Proof / case studies / customer logos
7. Pricing / packages
8. Implementation timeline
9. Closing / call to action
Tone: empathetic but confident. Center on THEM, not you. Always end with a clear next step.`,
    outline: [
      "Cover · su problema",
      "Costo · solución · cómo funciona",
      "Proof · pricing · timeline",
      "Cierre · próximo paso",
    ],
  },
  {
    id: "webinar",
    name: "Webinar / charla",
    description:
      "Para un evento o talk: hook, viaje del aprendizaje, takeaways, recursos.",
    emoji: "🎤",
    defaultSlideCount: 14,
    defaultThemeSlug: "dark",
    designerHint: `This is a WEBINAR or LIVE TALK presentation. Recommended sequence:
1. Cover with arresting visual
2. Speaker intro (1 slide, brief)
3. The promise (what attendees will walk away with)
4-5. Hook story / opening provocation
6-10. The journey (3-5 main acts of your story, each with one big idea)
11. The transformation (the "after" picture)
12. 3 takeaways (concrete, memorable)
13. Resources / what to read next
14. Thank you + how to connect
Tone: storytelling, conversational. Use "image-full" liberally for emotional rhythm. "section" dividers between acts.`,
    outline: [
      "Cover · intro · promesa",
      "Hook · viaje (3-5 actos)",
      "Transformación · 3 takeaways",
      "Recursos · gracias",
    ],
  },
  {
    id: "case-study",
    name: "Estudio de caso",
    description:
      "Análisis profundo de un caso real: contexto, problema, solución, resultados.",
    emoji: "🔬",
    defaultSlideCount: 9,
    defaultThemeSlug: "editorial",
    designerHint: `This is a CASE STUDY. Recommended sequence:
1. Cover (case name + one-line summary)
2. Context (industry, company, scale)
3. The challenge (specific problem being solved)
4. Constraints (budget, timeline, tech)
5. Our approach (methodology, what was tried)
6. Implementation (the work, with images)
7. Results (CHART required if quantitative data exists)
8. Lessons learned
9. What's next / how to apply this
Tone: investigative, honest about trade-offs. Show the work.`,
    outline: [
      "Cover · contexto",
      "Challenge · constraints",
      "Approach · implementation",
      "Results (chart) · lessons",
    ],
  },
];

export function getTemplate(id: string): PresentationTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
