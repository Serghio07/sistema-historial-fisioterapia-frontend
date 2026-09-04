import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/pages/planillaPagos/Arqueos.jsx', import.meta.url), 'utf8');
const pdfSource = source.slice(source.indexOf('const downloadPdf'), source.indexOf('function Arqueos'));

test('PDF histórico conserva formato A4 vertical y encabezado corporativo', () => {
  assert.match(pdfSource, /new jsPDF\(\{ unit: 'mm', format: 'a4' \}\)/);
  assert.match(pdfSource, /PHYSIO ACTIVE/);
  assert.match(pdfSource, /ARQUEO DE CAJA/);
});

test('arqueo sin pagos y sin obligaciones muestra estados vacíos explícitos', () => {
  assert.match(pdfSource, /No existen pagos registrados para este arqueo/);
  assert.match(pdfSource, /No existen obligaciones pendientes registradas para este arqueo/);
});

test('pagos usan solo hora paciente método y monto sin diagnóstico', () => {
  assert.match(pdfSource, /\['N°','Hora','Paciente','Método','Monto'\]/);
  const paymentSection = pdfSource.slice(pdfSource.indexOf("section('PAGOS DE PACIENTES')"), pdfSource.indexOf("section('PACIENTES NO CANCELADOS')"));
  assert.doesNotMatch(paymentSection, /concepto_snapshot/);
});

test('nombres largos determinan una altura de fila dinámica', () => {
  assert.match(pdfSource, /splitTextToSize/);
  assert.match(pdfSource, /rowHeight=Math\.max\(8/);
});

test('paginación central agrega página y repite encabezado de tabla', () => {
  assert.match(pdfSource, /const ensureSpace =/);
  assert.match(pdfSource, /pdf\.addPage\(\)/);
  assert.match(pdfSource, /if\(ensureSpace\(rowHeight\)\)drawHeader\(\)/);
});

test('no cancelados consumen exclusivamente el arreglo entregado por backend', () => {
  assert.match(pdfSource, /arqueo\.obligacionesNoCanceladas\|\|\[\]/);
  assert.match(pdfSource, /montoEsperado\?\?row\.monto_esperado/);
  assert.match(pdfSource, /montoPagado\?\?row\.monto_pagado/);
  assert.match(pdfSource, /saldoPendiente\?\?row\.saldo_pendiente/);
  assert.match(pdfSource, /estadoReporte\?\?row\.estado_reporte/);
});

test('pago parcial conserva esperado pagado pendiente y estado del backend', () => {
  assert.match(pdfSource, /\['N°','Fecha','Paciente','Esperado','Pagado','Pendiente','Estado'\]/);
  assert.doesNotMatch(pdfSource, /estadoReporte\s*=|estado_reporte\s*=/);
});

test('muchos pagos y obligaciones pasan por la misma tabla paginada', () => {
  assert.match(pdfSource, /if\(payments\.length\)table/);
  assert.match(pdfSource, /if\(outstanding\.length\)table/);
});

test('movimiento de caja permite descripción larga sin invadir columnas', () => {
  assert.match(pdfSource, /descripcion_snapshot\|\|row\.concepto_snapshot/);
  assert.match(pdfSource, /\['Hora','Tipo','Descripción','Método','Monto','Responsable'\]/);
});

test('totales financieros se leen del snapshot y no se reducen en frontend', () => {
  assert.match(pdfSource, /snap\.total_cobrado\?\?arqueo\.total_cobrado/);
  assert.match(pdfSource, /snap\.total_pendiente\?\?arqueo\.total_pendiente/);
  assert.match(pdfSource, /snap\.total_sistema/);
  assert.match(pdfSource, /snap\.total_confirmado/);
  assert.match(pdfSource, /snap\.diferencia_total/);
  assert.doesNotMatch(pdfSource, /movimientosSnapshot[^\n]*reduce/);
});
