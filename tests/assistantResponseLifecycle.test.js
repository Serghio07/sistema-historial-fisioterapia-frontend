import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeAssistantAiResponse } from '../src/utils/assistantResponse.js';

test('normaliza una respuesta válida del backend', () => {
  assert.deepEqual(normalizeAssistantAiResponse({ message: '  Respuesta lista.  ', source: 'gemini' }), { message: 'Respuesta lista.', source: 'gemini' });
});

test('una respuesta vacía termina en el fallback de error', () => {
  assert.throws(() => normalizeAssistantAiResponse({ message: '   ' }), /Respuesta vacía/);
  assert.throws(() => normalizeAssistantAiResponse(null), /Respuesta vacía/);
});

test('la petición IA tiene timeout y usa la URL final correcta', () => {
  const source = readFileSync(fileURLToPath(new URL('../src/services/assistantAiService.js', import.meta.url)), 'utf8');
  assert.match(source, /api\.post\('\/assistant\/chat'/);
  assert.match(source, /timeout:\s*16000/);
});

test('Strict Mode reactiva mounted y finally siempre libera querying mientras siga montado', () => {
  const source = readFileSync(fileURLToPath(new URL('../src/components/assistant/PhysioAssistant.jsx', import.meta.url)), 'utf8');
  assert.match(source, /useEffect\(\(\) => \{\s*mounted\.current = true;/);
  assert.match(source, /finally \{\s*if \(mounted\.current\) setQuerying\(false\);\s*\}/);
});
