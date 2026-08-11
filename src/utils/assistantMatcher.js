import { canAccessModule } from '../config/permissions.js';
import { getAssistantRouteConfig, isSafeAssistantRoute } from '../config/assistant/assistantRoutes.js';

export const ASSISTANT_SYNONYMS = Object.freeze({
  agendar: ['agendo', 'agendar', 'programar', 'reservar', 'crear cita'],
  reprogramar: ['reprogramo', 'reprogramar', 'cambiar fecha', 'cambiar horario', 'mover cita', 'mover'],
  paciente: ['paciente', 'ficha', 'persona'],
  sesion: ['sesion', 'atencion', 'tratamiento', 'terapia'],
  evolucion: ['evolucion', 'evolutivo', 'progreso'],
  eliminar: ['eliminar', 'borrar', 'anular'],
  buscar: ['buscar', 'encontrar', 'localizar'],
  crear: ['crear', 'registrar', 'registro', 'nuevo', 'nueva', 'agregar'],
  administrar: ['administrar', 'administro', 'gestionar', 'gestion'],
  navegar: ['ir', 'abre', 'abrir', 'llevame', 'mostrar', 'muestrame', 'donde esta', 'donde encuentro', 'volver']
});

const STOP_WORDS = new Set(['como', 'donde', 'esta', 'estan', 'quiero', 'una', 'uno', 'un', 'mi', 'mis', 'al', 'el', 'la', 'los', 'las', 'de', 'del', 'en', 'que']);

export function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(value = '') {
  return normalizeText(value).split(' ').filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function expandSynonyms(value = '') {
  const normalized = normalizeText(value);
  const baseTokens = tokenize(normalized);
  const tokens = new Set(baseTokens);
  Object.entries(ASSISTANT_SYNONYMS).forEach(([canonical, variants]) => {
    if (variants.some((variant) => {
      const normalizedVariant = normalizeText(variant);
      return normalizedVariant.includes(' ')
        ? normalized.includes(normalizedVariant)
        : baseTokens.includes(normalizedVariant);
    })) tokens.add(canonical);
  });
  return [...tokens];
}

export function isAssistantEntryAllowed(entry, role) {
  const roleAllowed = entry.roles?.includes(role);
  return Boolean(roleAllowed && (!entry.permission || canAccessModule(role, entry.permission)));
}

export function scoreEntry(entry, question, context = {}, quickQuestionId = null) {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = new Set(expandSynonyms(question));
  let score = quickQuestionId === entry.id ? 50 : 0;

  let bestIntentScore = 0;
  entry.intents.forEach((intent) => {
    const normalizedIntent = normalizeText(intent);
    let intentScore = 0;
    if (normalizedQuestion === normalizedIntent) intentScore += 10;
    else if (normalizedQuestion.includes(normalizedIntent) || normalizedIntent.includes(normalizedQuestion)) intentScore += 7;
    const overlap = expandSynonyms(intent).filter((token) => questionTokens.has(token)).length;
    intentScore += overlap * 2;
    bestIntentScore = Math.max(bestIntentScore, intentScore);
  });
  score += bestIntentScore;
  entry.keywords.forEach((keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedQuestion.includes(normalizedKeyword) || questionTokens.has(normalizedKeyword)) score += 3;
  });
  if (context.module === entry.module) score += 5;
  if (entry.screen && context.screen === entry.screen) score += 3;
  if (entry.id.startsWith('navigation.') && isExplicitNavigationRequest(question)) score += 12;
  return score;
}

const isExplicitNavigationRequest = (question) => /^(llevame|ir|abre|abrir|muestrame|mostrar|quiero ir|volver)/.test(normalizeText(question));

const isContextQuestion = (question) => {
  const normalized = normalizeText(question);
  return ['que puedo hacer aqui', 'para que sirve esta pantalla', 'que hago aqui', 'explicame esta pantalla', 'ayudame con esta pantalla', 'como funciona esto', 'que puedo ver aqui'].some((intent) => normalized.includes(intent));
};

const isLocationQuestion = (question) => ['donde estoy', 'que pantalla es esta'].some((intent) => normalizeText(question).includes(intent));
const isActionsQuestion = (question) => ['que acciones tengo aqui', 'acciones disponibles', 'que opciones tengo'].some((intent) => normalizeText(question).includes(intent));
const isNextStepQuestion = (question) => ['que sigue', 'siguiente paso', 'ahora que hago', 'que deberia hacer despues', 'despues de'].some((intent) => normalizeText(question).includes(intent));

export function findBestAssistantAnswer({ question, knowledge, context, role, quickQuestionId = null }) {
  if (isLocationQuestion(question)) return buildContextResult(context, role, 'location');
  if (isActionsQuestion(question)) return buildContextResult(context, role, 'actions');
  if (isNextStepQuestion(question)) return buildContextResult(context, role, 'next');
  if (isContextQuestion(question)) return buildContextResult(context, role, 'overview');

  const ranked = knowledge
    .map((entry) => ({ entry, score: scoreEntry(entry, question, context, quickQuestionId) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < 6) {
    const restrictedMatch = ranked.find(({ entry, score }) => score >= 3 && !isAssistantEntryAllowed(entry, role));
    if (restrictedMatch) return buildResult(restrictedMatch.entry, role, context, restrictedMatch.score);
    return { type: 'fallback', title: 'No encontré una guía exacta', answer: 'Prueba con una de las preguntas rápidas de esta pantalla.', steps: [] };
  }
  return buildResult(best.entry, role, context, best.score);
}

function buildResult(entry, role, context, score = 100) {
  if (!isAssistantEntryAllowed(entry, role)) {
    return {
      type: 'restricted',
      title: 'Acceso restringido',
      answer: `${entry.title} está disponible únicamente para usuarios administradores.`,
      steps: [], score, confidence: 'high'
    };
  }
  return {
    type: 'answer',
    title: entry.title,
    answer: entry.answer,
    steps: entry.steps,
    entryId: entry.id,
    action: buildNavigationAction(entry, context, role),
    tips: entry.tips || [],
    warnings: entry.warnings || [],
    score,
    confidence: score >= 12 ? 'high' : 'medium'
  };
}

function buildContextResult(context, role, type) {
  if (context.adminOnly && role !== 'admin') {
    return { type: 'restricted', title: 'Acceso restringido', answer: 'Este módulo está disponible únicamente para usuarios administradores.', steps: [], tips: [], warnings: [] };
  }
  const capabilities = context.capabilities?.[role] || [];
  const warnings = context.warnings?.[role] || [];
  if (type === 'location') return { type: 'answer', title: `Estás en: ${context.label}`, answer: context.description, steps: [], tips: [], warnings: [] };
  if (type === 'next') return { type: 'answer', title: 'Siguiente paso recomendado', answer: context.nextStep || 'Selecciona una de las acciones disponibles en esta pantalla.', steps: [], tips: context.tips || [], warnings };
  return {
    type: 'answer',
    title: type === 'actions' ? `Acciones en ${context.label}` : `Ayuda sobre ${context.label}`,
    answer: context.description || `Esta pantalla pertenece al módulo ${context.label}.`,
    steps: capabilities,
    tips: context.tips || [],
    warnings,
    entryId: `${context.module}.overview`
  };
}

const ACTION_LABELS = Object.freeze({
  '/': 'Ir al Panel',
  '/pacientes': 'Ir a Pacientes',
  '/resumen-pacientes': 'Ver resumen de pacientes',
  '/historias-clinicas': 'Ver Historias clínicas',
  '/evolutivos-clinicos': 'Ver Evolutivos clínicos',
  '/citas': 'Abrir Agenda',
  '/sesiones': 'Ir a Sesiones',
  '/sesiones-semanales': 'Ver Sesiones semanales',
  '/planillas-atencion': 'Ver Planillas de atención',
  '/informes-medicos': 'Abrir Informes',
  '/notificaciones': 'Ver Notificaciones',
  '/whatsapp/recepcion': 'Abrir Recepción WhatsApp',
  '/personal/actividades': 'Ir a Actividades',
  '/blog': 'Ir al Blog',
  '/blog/nuevo': 'Crear artículo',
  '/usuarios': 'Administrar Usuarios',
  '/roles-permisos': 'Ver Roles y permisos',
  '/personal/planilla': 'Ver Planillas de sueldos',
  '/whatsapp/monitoring': 'Abrir Monitoreo WhatsApp',
  '/blog/categorias': 'Administrar categorías',
  '/control-financiero/planilla-pagos': 'Abrir Finanzas'
});

function buildNavigationAction(entry, context, role) {
  if (!entry.route || !isSafeAssistantRoute(entry.route)) return undefined;
  const target = getAssistantRouteConfig(entry.route);
  if (!target || (target.permission && !canAccessModule(role, target.permission))) return undefined;
  if (context.screen === target.screen) return undefined;
  return {
    type: 'navigate',
    route: entry.route,
    label: ACTION_LABELS[entry.route] || `Ir a ${target.label}`,
    permission: target.permission
  };
}

export function getAssistantQuickQuestions(knowledge, context, role, limit = 3) {
  const contextual = knowledge.filter((entry) => entry.module === context.module && entry.question && !entry.id.endsWith('.overview') && isAssistantEntryAllowed(entry, role));
  const general = knowledge.filter((entry) => entry.module === 'general' && entry.question && isAssistantEntryAllowed(entry, role));
  const contextQuestion = { id: `${context.module}.overview`, question: '¿Qué puedo hacer aquí?' };
  return [contextQuestion, ...contextual, ...general].slice(0, limit);
}
