import { normalizeText } from './assistantMatcher.js';

const TECHNICAL_NAMES = /^(admin|administrator|administrador|personal|user|usuario|root|admin\d+|user\d+)$/i;

export function getAssistantDisplayName(user) {
  const candidates = [user?.ficha_personal?.nombres, user?.nombres, user?.nombre];
  const value = candidates
    .map((item) => String(item || '').trim().replace(/\s+/g, ' '))
    .find((item) => item && !item.includes('@') && !TECHNICAL_NAMES.test(item));
  return value ? value.split(' ')[0] : '';
}

export function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const withName = (text, name) => `${text}${name ? `, ${name}` : ''}`;

export function createInitialAssistantGreeting(user, date = new Date()) {
  return `¡${withName(getTimeGreeting(date), getAssistantDisplayName(user))}! 👋 Soy el Asistente Physio. ¿En qué puedo ayudarte?`;
}

export function getConversationResponse(question, user) {
  const normalized = normalizeText(question);
  const name = getAssistantDisplayName(user);
  if (/^(gracias|muchas gracias|te agradezco)$/.test(normalized)) return { type: 'conversation', answer: `¡${withName('Con gusto', name)}! 😊`, steps: [] };
  if (/^(hasta luego|chau|adios|nos vemos)$/.test(normalized)) return { type: 'conversation', answer: `¡${withName('Hasta luego', name)}! 👋`, steps: [] };
  if (/^(hola|buenos dias|buenas tardes|buenas noches|como estas|que tal)(\s|$)/.test(normalized)) {
    const asksHow = normalized.includes('como estas') || normalized.includes('que tal');
    return { type: 'conversation', answer: asksHow ? `¡${withName('Hola', name)}! 😊 Todo bien. Estoy listo para ayudarte con Physio Active. ¿Qué necesitas?` : `¡${withName('Hola', name)}! 👋 ¿En qué puedo ayudarte con Physio Active?`, steps: [] };
  }
  if (/^(ayudame|necesito ayuda)$/.test(normalized)) return { type: 'conversation', title: 'Estoy para ayudarte', answer: 'Puedes preguntarme cómo usar esta pantalla o consultar tu información operativa autorizada.', steps: [] };
  return null;
}
