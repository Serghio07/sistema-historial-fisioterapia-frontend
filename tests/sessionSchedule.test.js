import test from 'node:test';
import assert from 'node:assert/strict';
import { findScheduleConflict, schedulesOverlap } from '../src/utils/sessionSchedule.js';

const row = (numero_sesion, fecha, hora_inicio, hora_fin) => ({ numero_sesion, fecha, hora_inicio, hora_fin });

test('rechaza sesiones del mismo día con el mismo horario', () => {
  const conflict = findScheduleConflict([
    row(1, '2026-08-21', '09:00', '10:00'),
    row(2, '2026-08-21', '09:00', '10:00')
  ]);
  assert.deepEqual(conflict.map((item) => item.numero_sesion), [1, 2]);
});

test('rechaza solapamientos parciales y permite horarios consecutivos', () => {
  assert.equal(schedulesOverlap(row(1, '2026-08-21', '09:00', '10:00'), row(2, '2026-08-21', '09:30', '10:30')), true);
  assert.equal(schedulesOverlap(row(1, '2026-08-21', '09:00', '10:00'), row(2, '2026-08-21', '10:00', '11:00')), false);
});

test('permite el mismo horario en días diferentes', () => {
  assert.equal(findScheduleConflict([
    row(1, '2026-08-21', '09:00', '10:00'),
    row(2, '2026-08-22', '09:00', '10:00')
  ]), null);
});
