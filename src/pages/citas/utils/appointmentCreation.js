export const DRAGGABLE_APPOINTMENT_STATES = Object.freeze(['Pendiente', 'Programada', 'Confirmada', 'Atendida']);
export const VALID_APPOINTMENT_TYPES = Object.freeze([
  'Primera consulta', 'Sesion de fisioterapia', 'Sesion de tratamiento', 'Evaluacion', 'Control', 'Rehabilitacion', 'Otro'
]);

export const TIME_REQUIRED_ERROR = 'Debe seleccionar la hora de inicio y la hora de finalización.';
export const TIME_ORDER_ERROR = 'La hora de finalización debe ser posterior a la hora de inicio.';

const minutesOf = (time) => {
  const [hours, minutes] = String(time || '').slice(0, 5).split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

export const timeFromMinutes = (value) => {
  const minutes = Math.max(0, Math.min(23 * 60 + 59, Number(value) || 0));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

export const durationBetween = (startTime, endTime) => {
  const start = minutesOf(startTime);
  const end = minutesOf(endTime);
  return start !== null && end !== null && end > start ? end - start : null;
};

export const appointmentDuration = (appointment) => {
  return durationBetween(appointment?.hora_inicio, appointment?.hora_fin);
};

export const endTimeFor = (startTime, durationMinutes) => {
  const start = minutesOf(startTime);
  if (start === null) return '';
  return timeFromMinutes(start + Number(durationMinutes || 60));
};

export const validSuggestedType = (value) => VALID_APPOINTMENT_TYPES.includes(value) ? value : '';

export const canDragAppointment = (appointment) => DRAGGABLE_APPOINTMENT_STATES.includes(appointment?.estado);

export const validateNewAppointmentDraft = (draft) => {
  if (!draft?.hora_inicio || !draft?.hora_fin) return TIME_REQUIRED_ERROR;
  if (minutesOf(draft.hora_fin) <= minutesOf(draft.hora_inicio)) return TIME_ORDER_ERROR;
  if (!draft.paciente_id) return 'Debe seleccionar un paciente.';
  if (!draft.fecha) return 'Debe seleccionar una fecha.';
  if (!validSuggestedType(draft.tipo_atencion)) return 'Debe seleccionar un tipo de atención válido.';
  return '';
};

export const buildNewAppointmentPayload = (draft) => ({
  paciente_id: Number(draft.paciente_id),
  fecha: draft.fecha,
  hora_inicio: draft.hora_inicio,
  hora_fin: draft.hora_fin,
  tipo_atencion: draft.tipo_atencion,
  motivo: String(draft.motivo || '').trim(),
  observacion: String(draft.observacion || '').trim()
});

export const createNewAppointment = async ({ draft, createAppointment }) => {
  const validationError = validateNewAppointmentDraft(draft);
  if (validationError) throw new Error(validationError);
  const payload = buildNewAppointmentPayload(draft);
  return createAppointment(payload);
};

export const appendCreatedAppointment = (appointments, created) => [...appointments, created];
export const sortAppointments = (appointments) => [...appointments].sort((left, right) =>
  `${left.fecha || ''}T${left.hora_inicio || ''}`.localeCompare(`${right.fecha || ''}T${right.hora_inicio || ''}`)
);

export const draftFromAppointmentDrop = (appointment, destination) => {
  const duration = appointmentDuration(appointment);
  const start = destination.hora_inicio || String(appointment.hora_inicio || '').slice(0, 5);
  return {
    sourceAppointmentId: appointment.id,
    paciente_id: appointment.paciente_id || appointment.paciente?.id || '',
    pacienteNombre: [appointment.paciente?.nombres, appointment.paciente?.apellidos].filter(Boolean).join(' ').trim(),
    fecha: destination.fecha,
    hora_inicio: start,
    hora_fin: start && duration ? endTimeFor(start, duration) : '',
    duration: duration || '',
    tipo_atencion: validSuggestedType(appointment.tipo_atencion),
    motivo: '',
    observacion: ''
  };
};

export const emptySlotDraft = (destination) => ({
  sourceAppointmentId: null,
  paciente_id: '',
  pacienteNombre: '',
  fecha: destination.fecha,
  hora_inicio: destination.hora_inicio || '',
  hora_fin: destination.hora_inicio ? endTimeFor(destination.hora_inicio, 60) : '',
  duration: 60,
  tipo_atencion: '',
  motivo: '',
  observacion: ''
});
