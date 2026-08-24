import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/historiasClinicas/HistoriaDetalleProfesional.jsx', import.meta.url), 'utf8');

test('la zona corporal completa usa varias líneas y no se trunca', () => {
  assert.match(source, /label="Zona corporal" wrap/);
  assert.match(source, /wrap \? 'whitespace-normal break-words leading-5' : 'truncate'/);
});
