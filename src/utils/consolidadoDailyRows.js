const summarize = (values) => {
  const unique = [...new Set((Array.isArray(values) ? values : []).filter(Boolean).map(String))];
  return unique.length ? unique.join(' / ') : '—';
};

export const buildDailyCollectionRows = (data = {}) => {
  const paidRows = (data.detalle_cobros || []).map((row) => ({
    ...row,
    rowKey: `payment-${row.id}`,
    displayAmount: row.monto,
    displayBalance: row.deuda_actual,
    displayMethod: row.metodo || '—',
    displayReceipt: row.numero_recibo || '—',
    displayState: row.estado_deuda || 'Sin deuda'
  }));

  const unpaidRows = (data.detalle_obligaciones || [])
    .filter((row) => (row.estadoReporte || row.estado_reporte) === 'NO CANCELADO')
    .map((row) => ({
      ...row,
      rowKey: `obligation-${row.conceptoId ?? row.concepto_id}`,
      hora: row.hora || '—',
      displayAmount: row.montoPagado ?? row.monto_pagado ?? 0,
      displayBalance: row.saldoPendiente ?? row.saldo_pendiente ?? 0,
      displayMethod: summarize(row.metodosPago ?? row.metodos_pago),
      displayReceipt: summarize(row.recibos),
      displayState: 'No cancelado'
    }));

  return [...paidRows, ...unpaidRows];
};
