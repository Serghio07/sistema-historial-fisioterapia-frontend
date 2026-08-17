import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/pages/usuarios/UsuarioForm.jsx', import.meta.url), 'utf8');

test('solo guarda el usuario desde el último paso', () => {
  assert.match(source, /if \(step < STEPS\.length - 1\) \{\s*next\(event\);\s*return;/);
  assert.match(source, /<Button type="button" onClick=\{next\}>Siguiente/);
});
