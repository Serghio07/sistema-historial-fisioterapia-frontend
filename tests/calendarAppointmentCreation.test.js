import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  appendCreatedAppointment,
  buildNewAppointmentPayload,
  canDragAppointment,
  createNewAppointment,
  draftFromAppointmentDrop,
  emptySlotDraft,
  sortAppointments,
  TIME_ORDER_ERROR,
  TIME_REQUIRED_ERROR,
  validateNewAppointmentDraft
} from '../src/pages/citas/utils/appointmentCreation.js';

const original = Object.freeze({
  id: 100, paciente_id: 25, fecha: '2026-08-17', hora_inicio: '10:00', hora_fin: '11:00',
  estado: 'Atendida', tipo_atencion: 'Sesion de fisioterapia', motivo: 'ANTERIOR', observacion: 'ANTERIOR',
  usuario_id: 7, profesional_id: 7, historia_clinica_id: 70, sesion_id: 90, google_event_id: 'google-original', historial_programacion: [{ accion: 'ORIGINAL' }],
  paciente: Object.freeze({ id: 25, nombres: 'JUAN', apellidos: 'PÉREZ' })
});

test('el drop prepara una cita nueva sin mutar ni copiar datos clínicos de la original', () => {
  const snapshot = JSON.stringify(original);
  const draft = draftFromAppointmentDrop(original, { fecha: '2026-08-18', hora_inicio: '15:30' });
  const payload = buildNewAppointmentPayload(draft);
  assert.deepEqual(payload, { paciente_id: 25, fecha: '2026-08-18', hora_inicio: '15:30', hora_fin: '16:30', tipo_atencion: 'Sesion de fisioterapia', motivo: '', observacion: '' });
  assert.equal(JSON.stringify(original), snapshot);
  for (const forbidden of ['id','estado','usuario_id','profesional_id','historia_clinica_id','sesion_id','numero_sesion','total_sesiones','google_event_id','origen','created_at','updated_at','fecha_programada_original','hora_inicio_original','hora_fin_original','motivo_cambio','historial_programacion']) assert.equal(forbidden in payload, false);
});

test('la confirmación ejecuta únicamente la función de creación recibida', async () => {
  let createCalls = 0; let updateCalls = 0;
  const draft = draftFromAppointmentDrop(original, { fecha: '2026-08-18', hora_inicio: '15:30' });
  const created = await createNewAppointment({ draft, createAppointment: async (payload) => { createCalls += 1; return { id: 101, ...payload, estado: 'Pendiente' }; } });
  const appointments = appendCreatedAppointment([original], created);
  assert.equal(createCalls, 1); assert.equal(updateCalls, 0);
  assert.equal(appointments.length, 2); assert.strictEqual(appointments[0], original); assert.equal(appointments[1].id, 101);
});

test('si el tipo original no es válido el modal exige seleccionar uno', () => {
  const draft = draftFromAppointmentDrop({ ...original, tipo_atencion: null }, { fecha: '2026-08-18', hora_inicio: '15:30' });
  assert.equal(draft.tipo_atencion, '');
});

for (const estado of ['Pendiente', 'Programada', 'Confirmada', 'Atendida']) {
  test(`${estado} puede utilizarse como origen del drag`, () => assert.equal(canDragAppointment({ estado }), true));
}

for (const estado of ['Cancelada', 'Reprogramada', 'No asistio', 'Falto']) {
  test(`${estado} no puede utilizarse como origen del drag`, () => assert.equal(canDragAppointment({ estado }), false));
}

test('una cita histórica sin hora final no recibe una duración inventada', () => {
  const draft = draftFromAppointmentDrop({ ...original, hora_fin: null }, { fecha: '2026-08-19', hora_inicio: '09:00' });
  assert.equal(draft.duration, '');
  assert.equal(draft.hora_fin, '');
  assert.equal(validateNewAppointmentDraft(draft), TIME_REQUIRED_ERROR);
});

test('el drop en Mes conserva el horario original como propuesta editable', () => {
  const draft = draftFromAppointmentDrop(original, { fecha: '2026-08-22', hora_inicio: '' });
  assert.equal(draft.hora_inicio, '10:00');
  assert.equal(draft.hora_fin, '11:00');
});

test('valida que la hora final sea posterior a la inicial antes del POST', async () => {
  const draft = { ...emptySlotDraft({ fecha: '2026-08-19', hora_inicio: '10:00' }), paciente_id: 25, tipo_atencion: 'Control', hora_fin: '09:30' };
  assert.equal(validateNewAppointmentDraft(draft), TIME_ORDER_ERROR);
  let calls = 0;
  await assert.rejects(() => createNewAppointment({ draft, createAppointment: async () => { calls += 1; } }), { message: TIME_ORDER_ERROR });
  assert.equal(calls, 0);
});

test('un error backend no agrega una cita falsa ni modifica la original', async () => {
  const current = [original];
  const draft = draftFromAppointmentDrop(original, { fecha: '2026-08-20', hora_inicio: '12:00' });
  await assert.rejects(() => createNewAppointment({ draft, createAppointment: async () => { throw new Error('Paciente con cita superpuesta'); } }), /superpuesta/);
  assert.deepEqual(current, [original]);
});

test('una nueva cita de paciente con sesiones sigue siendo independiente', async () => {
  const linkedOriginal = Object.freeze({ ...original, historia_clinica_id: 70, sesion_id: 90, numero_sesion: 5, total_sesiones: 10 });
  const snapshot = JSON.stringify(linkedOriginal);
  const draft = draftFromAppointmentDrop(linkedOriginal, { fecha: '2026-08-20', hora_inicio: '15:00' });
  const payload = buildNewAppointmentPayload(draft);
  const created = await createNewAppointment({ draft, createAppointment: async (value) => ({ id: 202, ...value, sesion_id: null, historia_clinica_id: null }) });
  assert.equal(payload.sesion_id, undefined);
  assert.equal(payload.historia_clinica_id, undefined);
  assert.equal(created.sesion_id, null);
  assert.equal(created.historia_clinica_id, null);
  assert.equal(JSON.stringify(linkedOriginal), snapshot);
});

test('el drag no copia el profesional original y deja que backend asigne al usuario autenticado', () => {
  const draft = draftFromAppointmentDrop({ ...original, profesional_id: 7 }, { fecha: '2026-08-21', hora_inicio: '16:00' });
  const payload = buildNewAppointmentPayload(draft);
  assert.equal(payload.profesional_id, undefined);
  assert.equal(payload.usuario_id, undefined);
  assert.equal(original.profesional_id, 7);
});

test('la cita devuelta se agrega y se ordena sin reemplazar registros existentes', () => {
  const created = { id: 102, fecha: '2026-08-16', hora_inicio: '09:00' };
  const result = sortAppointments(appendCreatedAppointment([original], created));
  assert.deepEqual(result.map((item) => item.id), [102, 100]);
  assert.strictEqual(result[1], original);
});

test('el componente conserva cancelación, drop inválido, umbral y bloqueo de doble envío', () => {
  const source = readFileSync(new URL('../src/pages/citas/Citas.jsx', import.meta.url), 'utf8');
  assert.match(source, /Math\.hypot\([\s\S]*?< 7/);
  assert.match(source, /if \(!target\) return/);
  assert.match(source, /quickSaveInFlight\.current \|\| !quickDraft/);
  assert.match(source, /createAppointment: createCita/);
  assert.match(source, /appendCreatedAppointment\(current, created\)/);
});
