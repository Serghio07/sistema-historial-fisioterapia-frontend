const normalizeStatus = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_');

export const buildAttendanceSummary = (sessions = [], appointments = []) => {
  const linkedSessionIds = new Set(appointments.map((item) => Number(item.sesion_id)).filter(Boolean));
  const sessionEvents = sessions.map((item) => ({
    id: `sesion-${item.id}`,
    date: item.fecha,
    status: normalizeStatus(item.asistencia),
    source: 'SESION'
  }));
  const appointmentEvents = appointments
    .filter((item) => !item.sesion_id || !sessions.some((session) => Number(session.id) === Number(item.sesion_id)))
    .map((item) => ({ id: `cita-${item.id}`, date: item.fecha, status: normalizeStatus(item.estado), source: 'CITA' }));
  const rescheduleHistoryEvents = appointments.flatMap((item) => (Array.isArray(item.historial_programacion) ? item.historial_programacion : [])
    .filter((entry) => normalizeStatus(entry.accion).includes('reprogramacion') || normalizeStatus(entry.estado_nuevo).startsWith('reprogramad'))
    .map((entry, index) => ({ id: `cita-${item.id}-reprogramacion-${index}`, date: entry.fecha_anterior || entry.fecha_nueva || String(entry.registrado_en || '').slice(0, 10), status: 'reprogramada', source: 'HISTORIAL_CITA' })));
  const events = [...sessionEvents, ...appointmentEvents];
  const attended = events.filter((item) => item.status === 'asistio');
  const missed = events.filter((item) => ['no_asistio', 'falto'].includes(item.status));
  const appointmentsWithHistory = new Set(rescheduleHistoryEvents.map((item) => item.id.split('-')[1]));
  const rescheduled = [...events.filter((item) => ['reprogramada', 'reprogramado'].includes(item.status) && !(item.source === 'CITA' && appointmentsWithHistory.has(item.id.split('-')[1]))), ...rescheduleHistoryEvents];
  const pending = sessionEvents.filter((item) => item.status === 'pendiente');
  const decided = attended.length + missed.length;
  return { attended, missed, rescheduled, pending, attendancePercent: decided ? Math.round(attended.length / decided * 100) : 0, linkedSessionIds };
};
