const CANCELLED_STATES = new Set(['Cancelada', 'Reprogramada']);
const FINISHED_STATES = new Set(['Atendida', 'No asistio', 'Falto']);

const appointmentTime = (cita) => new Date(`${cita.fecha}T${String(cita.hora_inicio || '00:00').slice(0, 5)}:00-04:00`).getTime();
const ascending = (a, b) => appointmentTime(a) - appointmentTime(b) || Number(a.id) - Number(b.id);
const descending = (a, b) => ascending(b, a);

const splitAppointments = (appointments, now) => {
  const timestamp = now.getTime();
  const upcoming = [];
  const previous = [];
  const cancelled = [];
  appointments.forEach((appointment) => {
    if (CANCELLED_STATES.has(appointment.estado)) cancelled.push(appointment);
    else if (FINISHED_STATES.has(appointment.estado) || appointmentTime(appointment) < timestamp) previous.push(appointment);
    else upcoming.push(appointment);
  });
  return { upcoming: upcoming.sort(ascending), previous: previous.sort(descending), cancelled: cancelled.sort(descending) };
};

export const agruparCitasPorPacienteEHistoria = (appointments, now = new Date()) => {
  const patients = new Map();
  appointments.forEach((appointment) => {
    const patientId = appointment.paciente_id || appointment.paciente?.id;
    const patientKey = patientId != null ? `patient-${patientId}` : `appointment-${appointment.id}`;
    if (!patients.has(patientKey)) patients.set(patientKey, { key: patientKey, paciente: appointment.paciente, citas: [], historias: new Map() });
    const patient = patients.get(patientKey);
    patient.citas.push(appointment);
    const historyId = appointment.historia_clinica_id || appointment.historia_clinica?.id;
    const historyKey = historyId != null ? `history-${historyId}` : 'without-history';
    if (!patient.historias.has(historyKey)) patient.historias.set(historyKey, { key: historyKey, historia: appointment.historia_clinica || null, citas: [] });
    patient.historias.get(historyKey).citas.push(appointment);
  });

  return Array.from(patients.values()).map((patient) => {
    const sections = Array.from(patient.historias.values()).map((section) => ({ ...section, ...splitAppointments(section.citas, now) }));
    const all = splitAppointments(patient.citas, now);
    return {
      ...patient,
      historias: sections.sort((a, b) => (a.key === 'without-history' ? 1 : b.key === 'without-history' ? -1 : 0)),
      proxima: all.upcoming[0] || null,
      proximas: all.upcoming.length,
      historiasCount: sections.filter((section) => section.historia).length,
      whatsapp: patient.citas.some((appointment) => String(appointment.origen || '').toLowerCase() === 'whatsapp')
    };
  }).sort((a, b) => {
    if (a.proxima && b.proxima) return ascending(a.proxima, b.proxima);
    if (a.proxima) return -1;
    if (b.proxima) return 1;
    return String(a.paciente?.nombres || '').localeCompare(String(b.paciente?.nombres || ''), 'es');
  });
};

export const tituloHistoria = (history) => history?.titulo || history?.nombre || history?.diagnostico_medico || history?.motivo_consulta || (history?.fecha_evaluacion ? `Historia clínica del ${new Intl.DateTimeFormat('es-BO', { timeZone: 'UTC' }).format(new Date(`${history.fecha_evaluacion}T00:00:00Z`))}` : 'Historia clínica');

export const progresoHistoria = (section) => {
  const contracted = Number(section.historia?.evaluacion_final?.sesiones_contratadas || 0);
  if (!contracted) return null;
  const completedIds = new Set(section.citas.filter((appointment) => appointment.sesion_clinica?.asistencia === 'asistio').map((appointment) => appointment.sesion_clinica.id));
  return { completed: completedIds.size, contracted, percent: Math.min(Math.round((completedIds.size / contracted) * 100), 100) };
};
