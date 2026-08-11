import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('los componentes del asistente no acceden directamente a Gemini ni a credenciales', () => {
  const directory = new URL('../src/components/assistant/', import.meta.url);
  const sources = readdirSync(directory).filter((file) => file.endsWith('.jsx')).map((file) => readFileSync(fileURLToPath(new URL(file, directory)), 'utf8')).join('\n');
  assert.doesNotMatch(sources, /\b(fetch|axios)\s*\(/);
  assert.doesNotMatch(sources, /generativelanguage\.googleapis|GEMINI_API_KEY|@google\/genai/i);
  assert.doesNotMatch(sources, /localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(sources, /window\.location|document\.querySelector/);
});

test('el servicio IA usa solamente el endpoint backend autenticado', () => {
  const source = readFileSync(fileURLToPath(new URL('../src/services/assistantAiService.js', import.meta.url)), 'utf8');
  assert.match(source, /api\.post\('\/assistant\/chat'/);
  assert.doesNotMatch(source, /googleapis|GEMINI_API_KEY|patientId|historiaId|sesionId/i);
});

test('el servicio de lectura del asistente contiene únicamente GET', () => {
  const source = readFileSync(fileURLToPath(new URL('../src/services/assistantReadService.js', import.meta.url)), 'utf8');
  assert.match(source, /api\.get\(/);
  assert.doesNotMatch(source, /api\.(post|put|patch|delete)\(/i);
});
