import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldUseAssistantAI } from '../src/utils/assistantHybrid.js';

test('mantiene local una respuesta de alta confianza', () => {
  assert.equal(shouldUseAssistantAI({ type: 'answer', score: 18, confidence: 'high' }), false);
});

test('envía a IA una pregunta sin coincidencia o de confianza media', () => {
  assert.equal(shouldUseAssistantAI({ type: 'fallback', score: 0, confidence: 'low' }), true);
  assert.equal(shouldUseAssistantAI({ type: 'answer', score: 8, confidence: 'medium' }), true);
});

test('una restricción nunca se deriva a la IA', () => {
  assert.equal(shouldUseAssistantAI({ type: 'restricted', score: 5 }), false);
});
