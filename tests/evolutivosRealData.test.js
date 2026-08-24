import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const documentSource = readFileSync(new URL('../src/pages/historiasClinicas/EvolutivosDocumento.jsx', import.meta.url), 'utf8');

test('el documento vuelve a consultar la historia clínica al abrirse', () => {
  assert.match(documentSource, /getHistoriaClinica\(historia\.id\)/);
  assert.match(documentSource, /setHistoriaActual\(data\)/);
  assert.match(documentSource, /Datos clínicos actualizados/);
});

test('muestra los fármacos reales registrados y no los clasifica todos como inyectables', () => {
  assert.match(documentSource, /Array\.isArray\(evolution\?\.farmacos\)/);
  assert.match(documentSource, /farmaco\?\.presentacion_dosis/);
  assert.match(documentSource, /farmaco\?\.via \|\| farmaco\?\.tipo_via/);
  assert.match(documentSource, /farmaco\?\.cantidad/);
  assert.match(documentSource, /farmaco\?\.motivo_clinico/);
  assert.match(documentSource, /Fármacos administrados/);
});

test('excluye las evoluciones anuladas del documento', () => {
  assert.match(documentSource, /evolution\.estado !== 'anulado'/);
});
