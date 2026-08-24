import { formatPatientDocument } from './validators.js';
import { getDisplayPhone } from './patientContact.js';

const formatDateExcel = (value) => {
  if (!value) return 'Sin registrar';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
};

const nombreCompleto = (paciente = {}) => [paciente.nombres, paciente.apellidos].filter(Boolean).join(' ').trim() || 'Sin registrar';

const estadoHistoria = (historia = {}) => {
  if (historia.anulada || historia.estado === 'anulada') return 'Anulada';
  if (historia.estado === 'activa') return 'En tratamiento';
  if (historia.estado === 'completada') return 'Completada';
  if (historia.estado === 'inactiva') return 'Inactiva';
  return historia.estado ? `${historia.estado.charAt(0).toUpperCase()}${historia.estado.slice(1)}` : 'Sin registrar';
};

const sesionesRegistro = (registro, range) => Object.values(registro.sesiones_resumen || {})
  .flat()
  .filter((sesion) => !sesion.anulada && sesion.fecha >= range.inicio && sesion.fecha <= range.fin);

const styleCell = (cell, fill) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  cell.font = { color: { argb: 'FF0F172A' }, size: 10 };
  cell.alignment = { vertical: 'middle', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD7E3E7' } },
    left: { style: 'thin', color: { argb: 'FFD7E3E7' } },
    bottom: { style: 'thin', color: { argb: 'FFD7E3E7' } },
    right: { style: 'thin', color: { argb: 'FFD7E3E7' } }
  };
};

export async function exportSesionesSemanalesExcel({ registros, range, generatedBy, includeFinancial = false }) {
  const excelModule = await import('exceljs');
  const ExcelJS = excelModule.default || excelModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Physio Active';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Resumen general', {
    views: [{ state: 'frozen', ySplit: 9 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const grouped = [...registros.reduce((map, registro) => {
    const key = `${registro.paciente_id}:${registro.historia_clinica_id || 'sin-historia'}`;
    const current = map.get(key);
    const combined = [...(current ? sesionesRegistro(current, range) : []), ...sesionesRegistro(registro, range)];
    const unique = [...new Map(combined.map((sesion) => [String(sesion.id), sesion])).values()];
    map.set(key, { ...(current || registro), sesiones_resumen: { rango: unique } });
    return map;
  }, new Map()).values()];

  const rows = grouped.map((registro) => {
    const sesiones = sesionesRegistro(registro, range);
    const sesionesOrdenadas = [...sesiones].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || Number(b.numero_sesion || 0) - Number(a.numero_sesion || 0));
    const ultima = sesionesOrdenadas.find((sesion) => sesion.asistencia === 'asistio') || sesionesOrdenadas[0];
    const farmacos = sesiones.filter((sesion) => sesion.aplica_farmacos || sesion.inyectable_nombre);
    const nombresFarmacos = [...new Set(farmacos.map((sesion) => sesion.inyectable_nombre).filter(Boolean))];
    const profesional = sesiones.find((sesion) => sesion.profesional_responsable)?.profesional_responsable || 'Sin registrar';
    const historia = registro.historia_clinica || {};
    const historiaTexto = [
      formatDateExcel(historia.fecha_evaluacion),
      historia.motivo_consulta || historia.diagnostico_medico,
      estadoHistoria(historia)
    ].filter(Boolean).join(' - ');
    return {
      pacienteId: registro.paciente_id,
      historiaId: registro.historia_clinica_id,
      registro,
      values: [
        nombreCompleto(registro.paciente),
        formatPatientDocument(registro.paciente) || 'Sin registrar',
        getDisplayPhone(registro.paciente) || registro.telefono || 'Sin teléfono de contacto',
        historiaTexto,
        registro.diagnostico || historia.diagnostico_medico || historia.motivo_consulta || 'Sin registrar',
        formatDateExcel(ultima?.fecha),
        sesiones.length,
        sesiones.filter((sesion) => sesion.asistencia === 'asistio').length,
        sesiones.filter((sesion) => ['pendiente', 'reprogramada'].includes(sesion.asistencia)).length,
        sesiones.filter((sesion) => sesion.asistencia === 'no_asistio').length,
        Number(registro.pagado_en_semana || 0),
        sesiones.reduce((sum, sesion) => sum + Number(sesion.saldo_pendiente || 0), 0),
        farmacos.length ? `Sí${nombresFarmacos.length ? `: ${nombresFarmacos.join(', ')}` : ''}` : 'No',
        estadoHistoria(historia),
        profesional
      ],
      sesiones,
      hasDrugs: farmacos.length > 0
    };
  }).filter((row) => row.sesiones.length > 0);

  const uniquePatients = new Set(rows.map((row) => row.pacienteId));
  const totalSessions = rows.reduce((sum, row) => sum + row.sesiones.length, 0);
  const titleFill = 'FF0F766E';
  sheet.mergeCells('A1:O1');
  sheet.getCell('A1').value = 'EXPORTACIÓN GENERAL DE SESIONES SEMANALES - PHYSIO ACTIVE';
  sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: titleFill } };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;
  sheet.mergeCells('A3:G3');
  sheet.getCell('A3').value = `Rango seleccionado: ${formatDateExcel(range.inicio)} al ${formatDateExcel(range.fin)}`;
  sheet.mergeCells('H3:O3');
  sheet.getCell('H3').value = `Fecha de generación: ${formatBoliviaDateTime(new Date(), { dateStyle: 'short', timeStyle: 'short' })}`;
  sheet.mergeCells('A4:O4');
  sheet.getCell('A4').value = `Generado por: ${generatedBy || 'Usuario autenticado'}`;
  sheet.mergeCells('A5:D5');
  sheet.getCell('A5').value = `Total pacientes: ${uniquePatients.size}`;
  sheet.mergeCells('E5:I5');
  sheet.getCell('E5').value = `Total historias clínicas: ${rows.length}`;
  sheet.mergeCells('J5:O5');
  sheet.getCell('J5').value = `Total sesiones: ${totalSessions}`;
  ['A3', 'H3', 'A4', 'A5', 'E5', 'J5'].forEach((ref) => {
    sheet.getCell(ref).font = { bold: true, color: { argb: 'FF164E63' } };
    sheet.getCell(ref).alignment = { vertical: 'middle' };
  });

  const headers = ['Paciente', 'Documento', 'Teléfono de contacto', 'Historia clínica', 'Diagnóstico', 'Fecha última sesión', 'Sesiones registradas', 'Asistió', 'Pendiente', 'Faltó', 'Pagado en la semana', 'Deuda semanal', 'Fármacos', 'Estado de la historia', 'Profesional responsable'];
  const headerRow = sheet.getRow(9);
  headerRow.values = headers;
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164E63' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } } };
  });

  rows.forEach((entry, index) => {
    const row = sheet.addRow(entry.values);
    row.height = 34;
    row.eachCell((cell) => styleCell(cell, index % 2 ? 'FFF8FAFC' : 'FFFFFFFF'));
    [7, 8, 9, 10].forEach((column) => { row.getCell(column).alignment = { horizontal: 'center', vertical: 'middle' }; });
    row.getCell(11).numFmt = '#,##0.00 "Bs"';
    row.getCell(12).numFmt = '#,##0.00 "Bs"';
    row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: Number(entry.values[10]) > 0 ? 'FFDCFCE7' : 'FFF1F5F9' } };
    row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: Number(entry.values[11]) > 0 ? 'FFFFEDD5' : 'FFDCFCE7' } };
    row.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: entry.hasDrugs ? 'FFF3E8FF' : 'FFF1F5F9' } };
  });
  sheet.autoFilter = { from: { row: 9, column: 1 }, to: { row: 9 + rows.length, column: 15 } };

  const summaryStart = 11 + rows.length;
  sheet.mergeCells(summaryStart, 1, summaryStart, 15);
  sheet.getCell(summaryStart, 1).value = 'RESUMEN GENERAL DEL PERIODO';
  sheet.getCell(summaryStart, 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(summaryStart, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: titleFill } };
  const allSessions = rows.flatMap((row) => row.sesiones);
  const summary = [
    ['Pacientes atendidos', uniquePatients.size],
    ['Historias clínicas incluidas', rows.length],
    ['Sesiones registradas', allSessions.length],
    ['Asistidas', allSessions.filter((sesion) => sesion.asistencia === 'asistio').length],
    ['Pendientes', allSessions.filter((sesion) => ['pendiente', 'reprogramada'].includes(sesion.asistencia)).length],
    ['Faltas', allSessions.filter((sesion) => sesion.asistencia === 'no_asistio').length],
    ['Pagado en la semana', rows.reduce((sum, row) => sum + Number(row.registro.pagado_en_semana || 0), 0)],
    ['Deuda total', allSessions.reduce((sum, sesion) => sum + Number(sesion.saldo_pendiente || 0), 0)],
    ['Pacientes con fármacos', new Set(rows.filter((row) => row.hasDrugs).map((row) => row.pacienteId)).size]
  ];
  summary.forEach(([label, value], index) => {
    const row = sheet.getRow(summaryStart + 1 + index);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    row.getCell(1).font = { bold: true, color: { argb: 'FF164E63' } };
    if (label === 'Deuda total' || label === 'Pagado en la semana') row.getCell(2).numFmt = '#,##0.00 "Bs"';
  });

  const widths = [28, 16, 17, 38, 38, 20, 15, 12, 12, 12, 20, 18, 30, 22, 32];
  sheet.columns.forEach((column, index) => { column.width = widths[index]; });

  const detail = workbook.addWorksheet('Detalle de sesiones', {
    views: [{ state: 'frozen', ySplit: 7 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  detail.mergeCells('A1:T1');
  detail.getCell('A1').value = 'DETALLE DE TODAS LAS SESIONES - PHYSIO ACTIVE';
  detail.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  detail.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: titleFill } };
  detail.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  detail.getRow(1).height = 28;
  detail.mergeCells('A3:J3');
  detail.getCell('A3').value = `Rango seleccionado: ${formatDateExcel(range.inicio)} al ${formatDateExcel(range.fin)}`;
  detail.mergeCells('K3:T3');
  detail.getCell('K3').value = `Total de sesiones: ${totalSessions}`;
  detail.getCell('A3').font = { bold: true, color: { argb: 'FF164E63' } };
  detail.getCell('K3').font = { bold: true, color: { argb: 'FF164E63' } };

  const detailHeaders = [
    'Paciente', 'Documento', 'Teléfono de contacto', 'Historia clínica', 'Diagnóstico', 'Fecha', 'N.º sesión',
    'Asistencia', 'Método de pago', 'Estado del pago', 'Monto sesión', 'Monto pagado',
    'Saldo pendiente', 'Dolor inicial', 'Dolor final', 'Fármacos', 'Dosis',
    'Evolución / tratamiento', 'Observaciones', 'Profesional responsable'
  ];
  const detailHeader = detail.getRow(7);
  detailHeader.values = detailHeaders;
  detailHeader.height = 32;
  detailHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164E63' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  let detailIndex = 0;
  rows.forEach((entry) => {
    const registro = entry.registro;
    const historia = registro.historia_clinica || {};
    const historyText = [formatDateExcel(historia.fecha_evaluacion), historia.motivo_consulta || historia.diagnostico_medico, estadoHistoria(historia)].filter(Boolean).join(' - ');
    [...entry.sesiones]
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || Number(a.numero_sesion || 0) - Number(b.numero_sesion || 0))
      .forEach((sesion) => {
        const drugs = sesion.inyectable_nombre || (sesion.aplica_farmacos ? 'Sí' : 'No');
        const treatment = sesion.evolucion_observada || sesion.descripcion_tratamiento || [sesion.medios_fisicos, sesion.tecnicas_manuales].filter(Boolean).join(' · ') || 'Sin registrar';
        const row = detail.addRow([
          nombreCompleto(registro.paciente),
          formatPatientDocument(registro.paciente) || 'Sin registrar',
          getDisplayPhone(registro.paciente) || registro.telefono || 'Sin teléfono de contacto',
          historyText,
          registro.diagnostico || historia.diagnostico_medico || historia.motivo_consulta || 'Sin registrar',
          formatDateExcel(sesion.fecha),
          sesion.numero_sesion || 'Sin registrar',
          ({ asistio: 'Asistió', no_asistio: 'Faltó', pendiente: 'Pendiente', reprogramada: 'Reprogramada', cancelada: 'Cancelada' })[sesion.asistencia] || sesion.asistencia || 'Sin registrar',
          sesion.metodo_pago || 'Sin registrar',
          sesion.estado_pago || 'Sin registrar',
          Number(sesion.monto_sesion || 0),
          Number(sesion.monto_pagado || 0),
          Number(sesion.saldo_pendiente || 0),
          sesion.dolor_antes === null || sesion.dolor_antes === undefined ? 'Sin registrar' : `${sesion.dolor_antes}/10`,
          sesion.dolor_despues === null || sesion.dolor_despues === undefined ? 'Sin registrar' : `${sesion.dolor_despues}/10`,
          drugs,
          sesion.inyectable_dosis || 'Sin registrar',
          treatment,
          sesion.observacion || sesion.observacion_farmacos || 'Sin registrar',
          sesion.profesional_responsable || 'Sin registrar'
        ]);
        row.height = 38;
        row.eachCell((cell) => styleCell(cell, detailIndex % 2 ? 'FFF8FAFC' : 'FFFFFFFF'));
        [7, 8, 14, 15].forEach((column) => { row.getCell(column).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
        [11, 12, 13].forEach((column) => { row.getCell(column).numFmt = '#,##0.00 "Bs"'; });
        row.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: Number(sesion.saldo_pendiente) > 0 ? 'FFFFEDD5' : 'FFDCFCE7' } };
        row.getCell(16).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sesion.aplica_farmacos || sesion.inyectable_nombre ? 'FFF3E8FF' : 'FFF1F5F9' } };
        detailIndex += 1;
      });
  });
  detail.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7 + totalSessions, column: 20 } };
  const detailWidths = [27, 15, 16, 34, 34, 14, 12, 15, 17, 17, 16, 16, 17, 15, 15, 23, 20, 40, 38, 30];
  detail.columns.forEach((column, index) => { column.width = detailWidths[index]; });
  if (!includeFinancial) {
    const financialSummaryRows = [];
    sheet.eachRow((row, rowNumber) => {
      if (['Pagado en la semana', 'Deuda total'].includes(row.getCell(1).value)) financialSummaryRows.push(rowNumber);
    });
    financialSummaryRows.sort((a, b) => b - a).forEach((rowNumber) => sheet.spliceRows(rowNumber, 1));
    sheet.spliceColumns(11, 2);
    detail.spliceColumns(9, 5);
  }
  workbook.views = [{ activeTab: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Sesiones_Semanales_${formatDateExcel(range.inicio).replaceAll('/', '-')}_al_${formatDateExcel(range.fin).replaceAll('/', '-')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
import { formatBoliviaDateTime } from './boliviaDateTime';
