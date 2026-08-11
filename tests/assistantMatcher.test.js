import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantKnowledge } from '../src/config/assistant/assistantKnowledge.js';
import { findBestAssistantAnswer, normalizeText } from '../src/utils/assistantMatcher.js';
import { resolveAssistantContext } from '../src/utils/assistantContext.js';

const agenda = { module: 'agenda', screen: 'agenda', label: 'Citas / Agenda', permission: 'agenda' };

test('normaliza tildes, mayúsculas y puntuación', () => {
  assert.equal(normalizeText('¿Cómo agendo una CITA?'), 'como agendo una cita');
  const result = findBestAssistantAnswer({ question: '¿Cómo agendo una CITA?', knowledge: assistantKnowledge, context: agenda, role: 'personal' });
  assert.equal(result.entryId, 'agenda.crear');
});

test('reconoce mover una cita como reprogramación', () => {
  const result = findBestAssistantAnswer({ question: 'quiero mover mi cita', knowledge: assistantKnowledge, context: agenda, role: 'personal' });
  assert.equal(result.entryId, 'agenda.reprogramar');
});

test('usa el módulo actual para una pregunta contextual', () => {
  const result = findBestAssistantAnswer({ question: '¿Qué puedo hacer aquí?', knowledge: assistantKnowledge, context: agenda, role: 'personal' });
  assert.equal(result.entryId, 'agenda.overview');
  assert.match(result.answer, /Citas \/ Agenda/);
});

test('restringe sueldos para personal y entrega la guía a admin', () => {
  const input = { question: '¿Cómo veo planillas de sueldos?', knowledge: assistantKnowledge, context: agenda };
  const restricted = findBestAssistantAnswer({ ...input, role: 'personal' });
  const allowed = findBestAssistantAnswer({ ...input, role: 'admin' });
  assert.equal(restricted.type, 'restricted');
  assert.equal(restricted.steps.length, 0);
  assert.match(allowed.entryId, /sueldos/);
});

test('admin recibe navegación permitida hacia Usuarios', () => {
  const result = findBestAssistantAnswer({ question: '¿Dónde administro usuarios?', knowledge: assistantKnowledge, context: agenda, role: 'admin' });
  assert.deepEqual(result.action, { type: 'navigate', route: '/usuarios', label: 'Administrar Usuarios', permission: 'usuarios' });
});

test('personal recibe navegación permitida hacia Pacientes', () => {
  const result = findBestAssistantAnswer({ question: 'quiero ir a pacientes', knowledge: assistantKnowledge, context: agenda, role: 'personal' });
  assert.equal(result.action?.route, '/pacientes');
});

test('personal no recibe acción hacia Usuarios', () => {
  const result = findBestAssistantAnswer({ question: 'llévame a usuarios', knowledge: assistantKnowledge, context: agenda, role: 'personal' });
  assert.equal(result.type, 'restricted');
  assert.equal(result.action, undefined);
});

test('no ofrece navegación cuando el usuario ya está en Pacientes', () => {
  const context = { module: 'pacientes', screen: 'pacientes', label: 'Pacientes', permission: 'pacientes' };
  const result = findBestAssistantAnswer({ question: '¿Dónde registro un paciente?', knowledge: assistantKnowledge, context, role: 'personal' });
  assert.equal(result.entryId, 'pacientes.crear');
  assert.equal(result.action, undefined);
});

test('desde el detalle ofrece volver al listado sin fabricar un id', () => {
  const context = { module: 'pacientes', screen: 'detalle-paciente', label: 'Paciente', permission: 'pacientes' };
  const result = findBestAssistantAnswer({ question: 'quiero volver a pacientes', knowledge: assistantKnowledge, context, role: 'personal' });
  assert.equal(result.action?.route, '/pacientes');
  assert.doesNotMatch(result.action?.route, /20|:id|undefined/);
});

test('ofrece volver al Panel principal', () => {
  const result = findBestAssistantAnswer({ question: 'llévame al inicio', knowledge: assistantKnowledge, context: agenda, role: 'personal' });
  assert.equal(result.action?.route, '/');
});

test('explica acciones reales de Pacientes según el contexto', () => {
  const context = resolveAssistantContext('/pacientes');
  const result = findBestAssistantAnswer({ question: '¿Qué puedo hacer aquí?', knowledge: assistantKnowledge, context, role: 'personal' });
  assert.match(result.answer, /listado de pacientes/i);
  assert.ok(result.steps.some((step) => /Buscar pacientes/i.test(step)));
  assert.ok(result.steps.some((step) => /Registrar pacientes/i.test(step)));
});

test('identifica el detalle de paciente sin mostrar el id', () => {
  const context = resolveAssistantContext('/pacientes/25');
  const result = findBestAssistantAnswer({ question: '¿Dónde estoy?', knowledge: assistantKnowledge, context, role: 'personal' });
  assert.match(result.title, /Paciente/);
  assert.doesNotMatch(JSON.stringify(result), /25/);
});

test('recomienda el flujo real después de crear una historia', () => {
  const context = resolveAssistantContext('/historias-clinicas');
  const result = findBestAssistantAnswer({ question: '¿Qué sigue después de crear una historia?', knowledge: assistantKnowledge, context, role: 'personal' });
  assert.match(result.answer, /plan de tratamiento/i);
  assert.match(result.answer, /sesiones contratadas/i);
});

test('explica el estado Confirmada en Agenda', () => {
  const context = resolveAssistantContext('/citas');
  const result = findBestAssistantAnswer({ question: '¿Qué significa confirmada?', knowledge: assistantKnowledge, context, role: 'personal' });
  assert.equal(result.entryId, 'agenda.confirmada-significado');
  assert.match(result.answer, /fecha y horario/i);
});

test('prioriza la guía de dolor dentro de Sesiones', () => {
  const context = resolveAssistantContext('/sesiones');
  const result = findBestAssistantAnswer({ question: '¿Dónde registro el dolor?', knowledge: assistantKnowledge, context, role: 'personal' });
  assert.equal(result.entryId, 'sesiones.dolor');
});

test('el resumen diario de PERSONAL no menciona capacidades financieras', () => {
  const context = resolveAssistantContext('/control-diario/resumen');
  const result = findBestAssistantAnswer({ question: '¿Qué puedo ver aquí?', knowledge: assistantKnowledge, context, role: 'personal' });
  assert.doesNotMatch(`${result.answer} ${result.steps.join(' ')}`, /finanzas|pagos|montos/i);
  assert.ok(result.warnings.some((warning) => /no incluye información financiera/i.test(warning)));
});

test('el resumen diario de ADMIN incluye el contexto administrativo disponible', () => {
  const context = resolveAssistantContext('/control-diario/resumen');
  const result = findBestAssistantAnswer({ question: '¿Qué puedo ver aquí?', knowledge: assistantKnowledge, context, role: 'admin' });
  assert.ok(result.steps.some((step) => /administrativo/i.test(step)));
});

test('PERSONAL no recibe el flujo interno de arqueos', () => {
  const context = resolveAssistantContext('/');
  const result = findBestAssistantAnswer({ question: '¿Cómo funciona arqueos?', knowledge: assistantKnowledge, context, role: 'personal' });
  assert.equal(result.type, 'restricted');
  assert.equal(result.action, undefined);
  assert.doesNotMatch(result.answer, /control-financiero|planilla-pagos|paso/i);
});

test('la misma pregunta ambigua usa el módulo actual', () => {
  const agendaResult = findBestAssistantAnswer({ question: '¿Qué hago aquí?', knowledge: assistantKnowledge, context: resolveAssistantContext('/citas'), role: 'personal' });
  const patientResult = findBestAssistantAnswer({ question: '¿Qué hago aquí?', knowledge: assistantKnowledge, context: resolveAssistantContext('/pacientes'), role: 'personal' });
  assert.match(agendaResult.title, /Citas|Agenda/);
  assert.match(patientResult.title, /Pacientes/);
});
