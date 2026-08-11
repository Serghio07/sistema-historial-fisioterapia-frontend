const BOTH = ['admin', 'personal'];
const query = (id, intents, keywords, handler, permission, roles = BOTH) => ({ id, type: 'read_query', intents, keywords, handler, permission, roles });

export const assistantQueries = Object.freeze([
  query('appointments.today', ['cuantas citas hay hoy', 'cuantas citas tengo hoy', 'tengo citas hoy'], ['citas', 'hoy'], 'appointmentsToday', 'agenda'),
  query('appointments.pending', ['hay citas pendientes', 'cuantas citas pendientes'], ['citas', 'pendientes'], 'appointmentsPending', 'agenda'),
  query('appointments.confirmed', ['cuantas citas estan confirmadas', 'citas confirmadas hoy'], ['citas', 'confirmadas'], 'appointmentsConfirmed', 'agenda'),
  query('appointments.next', ['cual es la proxima cita', 'proxima cita'], ['proxima', 'cita'], 'nextAppointment', 'agenda'),
  query('sessions.today', ['cuantas sesiones hay hoy', 'cuantas sesiones hay', 'hay sesiones programadas hoy'], ['sesiones', 'hoy'], 'sessionsToday', 'sesiones'),
  query('sessions.pending', ['cuantas sesiones estan pendientes', 'hay sesiones pendientes'], ['sesiones', 'pendientes'], 'sessionsPending', 'sesiones'),
  query('sessions.attended', ['cuantas sesiones ya fueron atendidas', 'sesiones realizadas hoy'], ['sesiones', 'atendidas'], 'sessionsAttended', 'sesiones'),
  query('notifications.pending', ['tengo notificaciones pendientes', 'tengo notificaciones', 'notificaciones sin leer'], ['notificaciones', 'pendientes'], 'notificationsPending', null),
  query('notifications.total', ['cuantas notificaciones tengo'], ['notificaciones'], 'notificationsTotal', null),
  query('activities.today', ['cuantas actividades tengo hoy'], ['actividades', 'hoy'], 'activitiesToday', 'actividadesPropias'),
  query('activities.pending', ['tengo tareas pendientes', 'tengo actividades pendientes', 'que actividades me faltan', 'que actividades hay pendientes'], ['actividades', 'tareas', 'pendientes'], 'activitiesPending', 'actividadesPropias'),
  query('activities.completed', ['tengo actividades completadas', 'cuantas tareas complete'], ['actividades', 'completadas'], 'activitiesCompleted', 'actividadesPropias'),
  query('reception.pending', ['hay solicitudes de whatsapp pendientes', 'hay solicitudes de whatsapp', 'cuantas solicitudes estan pendientes', 'hay solicitudes sin atender'], ['solicitudes', 'whatsapp', 'pendientes'], 'receptionPending', 'recepcionWhatsapp'),
  query('reception.assigned', ['tengo solicitudes asignadas'], ['solicitudes', 'asignadas'], 'receptionAssigned', 'recepcionWhatsapp'),
  query('summary.today', ['que tengo hoy', 'que tengo pendiente hoy', 'tengo algo pendiente', 'como esta el dia', 'dame un resumen de hoy', 'que paso hoy'], ['resumen', 'hoy'], 'todaySummary', 'dashboard'),
  query('restricted.financial', ['cuanto dinero ingreso hoy', 'cuanto se recaudo hoy', 'ingresos de hoy', 'cuanto pagan en planillas'], ['dinero', 'recaudo', 'ingresos', 'planillas'], null, 'finanzas', ['admin']),
  query('restricted.users', ['cuantos usuarios existen', 'cuantos usuarios hay'], ['usuarios'], null, 'usuarios', ['admin']),
  query('restricted.other-activities', ['cuantas actividades tiene otro usuario', 'actividades de otro usuario'], ['actividades', 'otro usuario'], null, 'actividadesPropias', [])
]);

const QUICK_QUERY_IDS = Object.freeze({
  dashboard: ['summary.today', 'appointments.today', 'notifications.pending'],
  agenda: ['appointments.today', 'appointments.pending', 'appointments.confirmed'],
  sesiones: ['sessions.today', 'sessions.pending', 'sessions.attended'],
  actividades: ['activities.pending', 'activities.today', 'activities.completed'],
  notificaciones: ['notifications.pending', 'notifications.total'],
  'recepcion-whatsapp': ['reception.pending', 'reception.assigned']
});

export function getAssistantQueryQuickQuestions(context, role) {
  return (QUICK_QUERY_IDS[context.module] || [])
    .map((id) => assistantQueries.find((entry) => entry.id === id))
    .filter((entry) => entry?.roles.includes(role))
    .map((entry) => ({ id: `query:${entry.id}`, question: entry.intents[0] }));
}
