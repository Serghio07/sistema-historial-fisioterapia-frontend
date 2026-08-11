import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialAssistantGreeting, getAssistantDisplayName, getConversationResponse, getTimeGreeting } from '../src/utils/assistantGreeting.js';

test('saluda utilizando el nombre real disponible', () => {
  const response = getConversationResponse('hola', { nombre: 'Sergio', rol: 'admin' });
  assert.match(response.answer, /Sergio/);
});

test('responde naturalmente a saludo y cortesía', () => {
  assert.match(getConversationResponse('hola como estas', { nombre: 'Sergio' }).answer, /Todo bien/);
  assert.match(getConversationResponse('gracias', { nombre: 'Sergio' }).answer, /Con gusto/);
});

test('omite nombres técnicos o inexistentes', () => {
  assert.equal(getAssistantDisplayName({ nombre: 'admin123', usuario: 'admin123' }), '');
  const response = getConversationResponse('hola', { usuario: 'admin123' }).answer;
  assert.match(response, /¡Hola!/);
  assert.doesNotMatch(response, /undefined|null|admin123/);
});

test('adapta el saludo a la hora local', () => {
  assert.equal(getTimeGreeting(new Date(2026, 0, 1, 9)), 'Buenos días');
  assert.equal(getTimeGreeting(new Date(2026, 0, 1, 15)), 'Buenas tardes');
  assert.equal(getTimeGreeting(new Date(2026, 0, 1, 21)), 'Buenas noches');
  assert.match(createInitialAssistantGreeting({ nombre: 'Ana' }, new Date(2026, 0, 1, 9)), /Buenos días, Ana/);
});
