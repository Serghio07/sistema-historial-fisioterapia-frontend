import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyCollectionRows } from '../src/utils/consolidadoDailyRows.js';

test('mantiene los cobros y agrega solamente las obligaciones no canceladas', () => {
  const rows = buildDailyCollectionRows({
    detalle_cobros: [{ id: 7, paciente: 'PAGADO', monto: 100, deuda_actual: 0, metodo: 'QR', numero_recibo: 'REC-7', estado_deuda: 'Sin deuda' }],
    detalle_obligaciones: [
      { conceptoId: 7, paciente: 'PAGADO', montoPagado: 100, saldoPendiente: 0, estadoReporte: 'CANCELADO' },
      { conceptoId: 8, paciente: 'SIN PAGO', montoPagado: 0, saldoPendiente: 70, metodosPago: [], recibos: [], estadoReporte: 'NO CANCELADO' },
      { conceptoId: 9, paciente: 'PARCIAL', montoPagado: 50, saldoPendiente: 50, estadoReporte: 'PENDIENTE' }
    ]
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.paciente), ['PAGADO', 'SIN PAGO']);
  assert.equal(rows[1].displayAmount, 0);
  assert.equal(rows[1].displayBalance, 70);
  assert.equal(rows[1].displayMethod, '—');
  assert.equal(rows[1].displayReceipt, '—');
  assert.equal(rows[1].displayState, 'No cancelado');
});

test('tolera respuestas sin detalles', () => {
  assert.deepEqual(buildDailyCollectionRows(), []);
});

test('conserva la fecha para mostrar períodos semanales y mensuales', () => {
  const rows = buildDailyCollectionRows({
    detalle_obligaciones: [{ conceptoId: 10, fecha: '2026-09-03', estadoReporte: 'NO CANCELADO', saldoPendiente: 100 }]
  });

  assert.equal(rows[0].fecha, '2026-09-03');
});
