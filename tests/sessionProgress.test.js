import test from 'node:test';
import assert from 'node:assert/strict';
import { historyProgress, nextIncompleteHistory } from '../src/pages/sesiones/sessionProgress.js';

const history = (id, contracted) => ({ id, evaluacion_final: { sesiones_contratadas: contracted } });
const session = (id, historyId, asistencia = 'asistio', anulada = false) => ({ id, historia_clinica_id: historyId, asistencia, anulada });

test('marca una historia como completada usando solo asistencias validas', () => {
  assert.deepEqual(historyProgress(history(10, 2), [session(1, 10), session(2, 10), session(3, 10, 'asistio', true)]), { contracted: 2, completed: 2, remaining: 0, isComplete: true });
});

test('una falta no consume una sesion contratada', () => {
  assert.deepEqual(historyProgress(history(10, 2), [session(1, 10), session(2, 10, 'no_asistio')]), { contracted: 2, completed: 1, remaining: 1, isComplete: false });
});

test('continua otra historia cuando la mas reciente ya termino', () => {
  assert.equal(nextIncompleteHistory([history(20, 1), history(10, 2)], [session(1, 20), session(2, 10)])?.id, 10);
});
