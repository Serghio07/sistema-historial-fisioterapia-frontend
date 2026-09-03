const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export const pdfMoney = (value) => `Bs ${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const pdfDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
};

export const pdfPeriodLabel = (period = {}) => {
  if (period.tipo === 'dia') return pdfDate(period.desde);
  if (period.tipo === 'mes') {
    const match = String(period.desde || '').match(/^(\d{4})-(\d{2})/);
    return match ? `${MONTHS[Number(match[2]) - 1]} ${match[1]}` : '—';
  }
  return `${pdfDate(period.desde)} al ${pdfDate(period.hasta)}`;
};

export const summarizeValues = (values, limit = 2) => {
  const unique = [...new Set((Array.isArray(values) ? values : []).filter(Boolean).map(String))];
  if (!unique.length) return '—';
  if (unique.length <= limit) return unique.join(' / ');
  return `${unique.slice(0, limit).join(' / ')} +${unique.length - limit}`;
};

const reportState = (row) => row.estadoReporte || row.estado_reporte || '—';

export const buildObligationPdfRows = (data = {}) => (data.detalle_obligaciones || []).map((row, index) => [
  String(index + 1),
  pdfDate(row.fecha),
  row.paciente || '—',
  row.documento || '—',
  row.profesional || 'Sin registrar',
  pdfMoney(row.montoPagado ?? row.monto_pagado),
  summarizeValues(row.metodosPago ?? row.metodos_pago),
  summarizeValues(row.recibos),
  pdfMoney(row.saldoPendiente ?? row.saldo_pendiente),
  reportState(row)
]);

export const paginateRows = (rows, measureRow, availableHeight) => {
  const pages = []; let page = []; let used = 0;
  rows.forEach((row) => {
    const height = Math.max(1, Number(measureRow(row)) || 1);
    if (page.length && used + height > availableHeight) { pages.push(page); page = []; used = 0; }
    page.push(row); used += height;
  });
  if (page.length || !pages.length) pages.push(page);
  return pages;
};

export const obligationPdfHeaders = Object.freeze(['N°','Fecha','Paciente','Documento','Profesional','Cobrado','Pago','Recibo','Deuda','Estado']);
export const obligationPdfWidths = Object.freeze([10,22,38,24,38,24,25,34,24,25]);
