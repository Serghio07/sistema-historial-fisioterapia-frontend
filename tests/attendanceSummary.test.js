import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttendanceSummary } from '../src/utils/attendanceSummary.js';

test('cuenta una cita no asistida aunque no tenga sesión', () => {
  const result = buildAttendanceSummary([{ id: 1, fecha: '2026-07-31', asistencia: 'asistio' }], [{ id: 2, fecha: '2026-08-01', estado: 'No asistio', sesion_id: null }]);
  assert.equal(result.attended.length, 1);
  assert.equal(result.missed.length, 1);
  assert.equal(result.attendancePercent, 50);
});

test('cuenta reprogramaciones y normaliza tildes y espacios', () => {
  const result = buildAttendanceSummary([], [{ id: 2, fecha: '2026-08-01', estado: 'Reprogramada' }, { id: 3, fecha: '2026-08-02', estado: 'Faltó' }]);
  assert.equal(result.rescheduled.length, 1);
  assert.equal(result.missed.length, 1);
});

test('no duplica una cita vinculada con su sesión', () => {
  const result = buildAttendanceSummary([{ id: 8, fecha: '2026-08-01', asistencia: 'no_asistio' }], [{ id: 3, fecha: '2026-08-01', estado: 'No asistio', sesion_id: 8 }]);
  assert.equal(result.missed.length, 1);
});

test('cuenta cada reprogramación conservada en el historial de la cita', () => {
  const result = buildAttendanceSummary([], [{ id: 7, fecha: '2026-08-05', estado: 'Programada', historial_programacion: [{ accion: 'REPROGRAMACION_WHATSAPP', fecha_anterior: '2026-08-01' }, { accion: 'REPROGRAMACION_WHATSAPP', fecha_anterior: '2026-08-03' }] }]);
  assert.equal(result.rescheduled.length, 2);
  assert.deepEqual(result.rescheduled.map((item) => item.date), ['2026-08-01', '2026-08-03']);
});
