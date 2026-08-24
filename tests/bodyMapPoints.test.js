import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/historiasClinicas/sections/BodyMap.jsx', import.meta.url), 'utf8');

const countZoneIds = (block) => (block.match(/\{ id:/g) || []).length;

test('conserva los puntos originales y amplía ambas vistas anatómicas', () => {
  const original = source.slice(source.indexOf('const zones = ['), source.indexOf('const anteriorZones'));
  const anterior = source.slice(source.indexOf('const anteriorZones'), source.indexOf('const posteriorZones'));
  const posterior = source.slice(source.indexOf('const posteriorZones'), source.indexOf('function Figure'));

  assert.equal(countZoneIds(original), 11);
  assert.equal(countZoneIds(anterior) + countZoneIds(original), 28);
  assert.equal(countZoneIds(posterior) + countZoneIds(original), 28);
  assert.match(anterior, /\.\.\.zones/);
  assert.match(posterior, /\.\.\.zones/);
});

test('mantiene la misma selección y estilo visual de los puntos', () => {
  assert.match(source, /onClick=\{\(\) => onSelect\(zone\.id\)\}/);
  assert.match(source, /selected\.includes\(zone\.id\.toUpperCase\(\)\)/);
  assert.match(source, /r=\{selected\.includes\(zone\.id\.toUpperCase\(\)\) \? 3 : 2\.15\}/);
  assert.match(source, /fill-white stroke-brand-500/);
  assert.match(source, /hover:stroke-coral/);
  assert.match(source, /r="5" className="fill-transparent stroke-transparent"/);
});
