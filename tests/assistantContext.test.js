import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssistantContext } from '../src/utils/assistantContext.js';

test('resuelve una ruta dinámica sin conservar el id clínico', () => {
  const context = resolveAssistantContext('/pacientes/15');
  assert.equal(context.module, 'pacientes');
  assert.equal(context.screen, 'detalle-paciente');
  assert.equal(context.label, 'Paciente');
  assert.equal(context.permission, 'pacientes');
  assert.doesNotMatch(JSON.stringify(context), /15/);
});

test('prioriza rutas específicas del blog', () => {
  assert.equal(resolveAssistantContext('/blog/editar/8').screen, 'editar-blog');
});
