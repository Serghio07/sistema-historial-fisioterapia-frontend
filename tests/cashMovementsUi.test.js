import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/movimientosCaja/MovimientosCaja.jsx', import.meta.url), 'utf8');
const sidebar = fs.readFileSync(new URL('../src/components/layout/Sidebar.jsx', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../src/routes/AppRoutes.jsx', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../src/services/movimientoCajaService.js', import.meta.url), 'utf8');

test('navegación financiera incluye ingresos y egresos entre planilla y arqueos', () => {
  const planilla = sidebar.indexOf("label: 'Planilla de pagos'");
  const caja = sidebar.indexOf("label: 'Ingresos y egresos'");
  const arqueos = sidebar.indexOf("label: 'Arqueos'");
  assert.ok(planilla < caja && caja < arqueos);
  assert.match(routes, /control-financiero\/movimientos-caja/);
});

test('pantalla contiene cinco cards, filtros, formulario, detalle y anulación', () => {
  for (const label of ['Ingresos operativos', 'Egresos operativos', 'Aportes', 'Retiros manuales', 'Efectivo esperado en caja']) assert.match(page, new RegExp(`label=\\"${label}`));
  assert.match(page, /Nuevo movimiento/);
  assert.match(page, /Motivo de anulación/);
  assert.match(page, /No existen movimientos manuales de caja para los filtros seleccionados/);
});

test('aclara movimientos manuales y desglose sin recalcular ingresos operativos', () => {
  assert.match(page, /Esta tabla muestra únicamente movimientos manuales de caja/);
  assert.match(page, /Los cobros de pacientes pueden consultarse desde Planilla de pagos/);
  assert.match(page, /summary\?\.pagos_pacientes/);
  assert.match(page, /summary\?\.ingresos_extraordinarios/);
  assert.match(page, /summary\?\.ingresos_operativos/);
});

test('cliente usa endpoints REST de movimientos de caja', () => {
  assert.match(service, /\/finanzas\/movimientos-caja/);
  assert.match(service, /\/resumen/);
  assert.match(service, /\/saldo/);
  assert.match(service, /\/anular/);
});

test('ajustes se fuerzan a efectivo y se muestra advertencia de clasificación', () => {
  assert.match(page, /cashOnly/); assert.match(page, /disabled=\{cashOnly\.has\(form\.tipo_movimiento\)\}/);
  assert.match(page, /advertencia_clasificacion/); assert.match(page, /Ingresos operativos/);
});
