import { scoreEntry } from './assistantMatcher.js';
import { canAccessModule } from '../config/permissions.js';

export function findAssistantQuery(question, queries, role) {
  const ranked = queries
    .map((entry) => ({ entry, score: scoreEntry({ ...entry, module: '', screen: null }, question, {}, null) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < 6) return null;
  const allowed = best.entry.roles.includes(role) && (!best.entry.permission || canAccessModule(role, best.entry.permission));
  if (!allowed) return { type: 'restricted', queryId: best.entry.id, answer: restrictedMessage(best.entry.permission), handler: null, score: best.score };
  if (!best.entry.handler) return { type: 'unavailable', queryId: best.entry.id, answer: 'Esta consulta administrativa todavía no está disponible en el asistente.', handler: null };
  return { type: 'read_query', ...best.entry, score: best.score };
}

const restrictedMessage = (permission) => {
  if (permission === 'finanzas') return 'La información financiera está disponible únicamente para usuarios administradores.';
  if (permission === 'usuarios') return 'La información de usuarios está disponible únicamente para usuarios administradores.';
  return 'No tienes permiso para consultar información de otros usuarios.';
};

const countText = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

export function formatAssistantQueryResult(handler, data) {
  const actions = {
    appointments: { type: 'navigate', route: '/citas', label: 'Abrir Agenda', permission: 'agenda' },
    sessions: { type: 'navigate', route: '/sesiones', label: 'Ir a Sesiones', permission: 'sesiones' },
    notifications: { type: 'navigate', route: '/notificaciones', label: 'Ver Notificaciones', permission: null },
    activities: { type: 'navigate', route: '/personal/actividades', label: 'Ir a Actividades', permission: 'actividadesPropias' },
    reception: { type: 'navigate', route: '/whatsapp/recepcion', label: 'Abrir Recepción WhatsApp', permission: 'recepcionWhatsapp' }
  };
  const formatters = {
    appointmentsToday: () => ({ text: `Hoy tienes ${countText(data.citas.total, 'cita programada', 'citas programadas')}.`, action: actions.appointments }),
    appointmentsPending: () => ({ text: `Hoy hay ${countText(data.citas.pendientes, 'cita pendiente', 'citas pendientes')}.`, action: actions.appointments }),
    appointmentsConfirmed: () => ({ text: `Hoy hay ${countText(data.citas.confirmadas, 'cita confirmada', 'citas confirmadas')}.`, action: actions.appointments }),
    nextAppointment: () => ({ text: data.citas.proxima ? `La próxima cita de hoy está prevista a las ${data.citas.proxima.hora} y su estado es ${data.citas.proxima.estado}.` : 'No hay una próxima cita pendiente para hoy.', action: actions.appointments }),
    sessionsToday: () => ({ text: `Hoy hay ${countText(data.sesiones.total, 'sesión registrada', 'sesiones registradas')}.`, action: actions.sessions }),
    sessionsPending: () => ({ text: `Hay ${countText(data.sesiones.pendientes, 'sesión pendiente', 'sesiones pendientes')} hoy.`, action: actions.sessions }),
    sessionsAttended: () => ({ text: `Hoy se atendieron ${countText(data.sesiones.atendidas, 'sesión', 'sesiones')}.`, action: actions.sessions }),
    notificationsPending: () => ({ text: `Tienes ${countText(data.notificaciones.pendientes, 'notificación pendiente', 'notificaciones pendientes')}.`, action: actions.notifications }),
    notificationsTotal: () => ({ text: `Tienes ${countText(data.notificaciones.total, 'notificación', 'notificaciones')} en tu bandeja.`, action: actions.notifications }),
    activitiesToday: () => ({ text: `Tienes ${countText(data.actividades.total, 'actividad para hoy', 'actividades para hoy')}.`, action: actions.activities }),
    activitiesPending: () => ({ text: `Tienes ${countText(data.actividades.pendientes, 'actividad pendiente', 'actividades pendientes')}.`, action: actions.activities }),
    activitiesCompleted: () => ({ text: `Tienes ${countText(data.actividades.completadas, 'actividad completada', 'actividades completadas')} hoy.`, action: actions.activities }),
    receptionPending: () => ({ text: `Hay ${countText(data.recepcion.pendientes, 'solicitud de WhatsApp pendiente', 'solicitudes de WhatsApp pendientes')}.`, action: actions.reception }),
    receptionAssigned: () => ({ text: `Tienes ${countText(data.recepcion.asignadas, 'solicitud asignada', 'solicitudes asignadas')} activa.`, action: actions.reception }),
    todaySummary: () => ({ text: 'Este es tu resumen operativo de hoy:', steps: [`${data.citas.total} citas`, `${data.sesiones.total} sesiones`, `${data.actividades.pendientes} actividades pendientes`, `${data.notificaciones.pendientes} notificaciones sin leer`] })
  };
  return formatters[handler]?.() || { text: 'No encontré una forma segura de presentar esa consulta.' };
}

export async function executeAssistantQuery(query, readSummary) {
  if (!query?.handler) throw new Error('Consulta no permitida');
  const getSummary = readSummary || (await import('../services/assistantReadService.js')).getAssistantOperationalSummary;
  return formatAssistantQueryResult(query.handler, await getSummary());
}
