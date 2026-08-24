import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const report = readFileSync(new URL('../src/pages/reportes/Reportes.jsx', import.meta.url), 'utf8');

test('el informe recopila tratamientos, evolución y fármacos de sesiones realizadas', () => {
  assert.match(report, /const sesionesToInformeFields/);
  assert.match(report, /sesion\.descripcion_tratamiento/);
  assert.match(report, /ultima\?\.evolucion_observada/);
  assert.match(report, /Array\.isArray\(sesion\.farmacos\)/);
  assert.match(report, /farmaco\.presentacion_dosis/);
  assert.match(report, /farmaco\.motivo_clinico/);
});

test('un informe guardado conserva el número histórico de sesiones', () => {
  assert.match(report, /sesiones_realizadas: Number\(informe\.cantidad_sesiones \|\| 0\)/);
  assert.match(report, /const sesionesRealizadas = Number\(informe\.cantidad_sesiones \|\| 0\)/);
});

test('DX CIF prioriza el diagnóstico kinésico registrado', () => {
  assert.match(report, /evaluacion_final\?\.diagnostico_kinesico_cif \|\| historia\?\.condicion_actual\?\.descripcion/);
});
