import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/planillaPagos/Arqueos.jsx', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../src/services/planillaPagosService.js', import.meta.url), 'utf8');

test('arqueos incluye vista actual, historial y consolidado', () => {
  assert.match(page, /Arqueo actual/); assert.match(page, /Historial/); assert.match(page, /Consolidado/);
});

test('conciliación contempla cinco métodos y diferencia pendiente', () => {
  for (const method of ['Efectivo', 'QR', 'Transferencia', 'Tarjeta', 'Otro']) assert.match(page, new RegExp(method));
  assert.match(page, /Pendiente de confirmar/); assert.match(page, /TOTAL/);
});

test('historial descarga PDF A4 desde detalle snapshot', () => {
  assert.match(page, /format: 'a4'/); assert.match(page, /movimientosSnapshot/); assert.match(page, /movimientosCajaSnapshot/); assert.match(page, /Página/);
  assert.match(service, /arqueos\/consolidado/); assert.match(service, /arqueos\/actual/);
});

test('usa preview backend para apertura manual y etiquetas financieras precisas', () => {
  assert.match(service, /arqueos\/preview/); assert.match(page, /previewArqueoPago/);
  assert.match(page, /Total esperado por servicios/); assert.match(page, /Cobros de pacientes del período/);
  assert.match(page, /Saldo inicial automático/);
  assert.match(page, /Heredado del cierre del/);
  assert.match(page, /dinero que quedó en caja en el último cierre diario/);
  assert.match(page, /No existe un cierre diario anterior válido/);
  assert.match(page, /efectivo con el que inicia la caja hoy/);
  assert.match(page, /Registra únicamente el efectivo disponible al comenzar la jornada/);
});

test('un arqueo cerrado es informativo y no vuelve a mostrar controles de cierre', () => {
  assert.match(page, /const isClosed=/);
  assert.match(page, /Arqueo diario cerrado/);
  assert.match(page, /ya no pueden modificarse/);
  assert.match(page, /isClosed\?<div[\s\S]*Saldo dejado en caja[\s\S]*:<>\{/);
  assert.match(page, /isClosed\?<b>[\s\S]*:<input aria-label/);
});

test('PDF prioriza responsable y cierre congelados', () => {
  assert.match(page, /responsable_nombre_snapshot \?\?/); assert.match(page, /estado_cierre_snapshot \?\?/);
  assert.match(page, /observacion_snapshot \?\?/);
});
