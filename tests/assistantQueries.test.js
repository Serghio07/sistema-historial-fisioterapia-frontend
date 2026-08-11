import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantQueries } from '../src/config/assistant/assistantQueries.js';
import { executeAssistantQuery, findAssistantQuery } from '../src/utils/assistantQueryHandlers.js';

const summary = {
  citas: { total: 6, pendientes: 2, confirmadas: 3, proxima: { hora: '10:30', estado: 'Confirmada' } },
  sesiones: { total: 4, pendientes: 1, atendidas: 3 },
  notificaciones: { total: 8, pendientes: 2 },
  actividades: { total: 5, pendientes: 2, completadas: 3, alcance: 'propio' },
  recepcion: { pendientes: 1, asignadas: 2 }
};

test('selecciona y ejecuta el handler de citas usando un GET mockeado', async () => {
  const query = findAssistantQuery('¿Cuántas citas tengo hoy?', assistantQueries, 'personal');
  let calls = 0;
  const response = await executeAssistantQuery(query, async () => { calls += 1; return summary; });
  assert.equal(query.handler, 'appointmentsToday');
  assert.equal(calls, 1);
  assert.match(response.text, /6 citas/);
});

test('consulta únicamente las notificaciones resumidas autorizadas', async () => {
  const query = findAssistantQuery('¿Tengo notificaciones pendientes?', assistantQueries, 'personal');
  const response = await executeAssistantQuery(query, async () => summary);
  assert.equal(query.handler, 'notificationsPending');
  assert.match(response.text, /2 notificaciones pendientes/);
});

test('actividades de PERSONAL usan el resumen con alcance propio', async () => {
  const query = findAssistantQuery('¿Tengo actividades pendientes?', assistantQueries, 'personal');
  const response = await executeAssistantQuery(query, async () => summary);
  assert.equal(query.handler, 'activitiesPending');
  assert.match(response.text, /2 actividades pendientes/);
});

test('bloquea finanzas antes de ejecutar HTTP', async () => {
  const query = findAssistantQuery('¿Cuánto se recaudó hoy?', assistantQueries, 'personal');
  let calls = 0;
  assert.equal(query.type, 'restricted');
  assert.equal(query.handler, null);
  assert.equal(calls, 0);
});

test('no permite consultar actividades de otro usuario ni acepta ids', () => {
  const query = findAssistantQuery('¿Cuántas actividades tiene otro usuario?', assistantQueries, 'personal');
  assert.equal(query.type, 'restricted');
  assert.equal(query.handler, null);
  assert.equal('params' in query, false);
});
