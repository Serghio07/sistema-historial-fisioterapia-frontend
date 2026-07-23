const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export async function exportPlanillaExcel(planilla, generadoPor = '') {
  const excelModule = await import('exceljs');
  const ExcelJS = excelModule.default || excelModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Centro de Fisioterapia y Kinesiología Integral';
  const sheet = workbook.addWorksheet('Planilla de Sueldos', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } }
  });

  sheet.columns = [
    { key: 'numero', width: 6 },
    { key: 'paterno', width: 18 },
    { key: 'materno', width: 18 },
    { key: 'nombres', width: 25 },
    { key: 'ci', width: 18 },
    { key: 'cargo', width: 22 },
    { key: 'horario', width: 28 },
    { key: 'modalidad', width: 20 },
    { key: 'sueldo', width: 16 },
    { key: 'firma', width: 28 }
  ];

  sheet.mergeCells('A1:J1');
  sheet.getCell('A1').value = 'Centro de Fisioterapia y Kinesiología Integral';
  sheet.getCell('A1').font = { bold: true, size: 15 };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 25;

  sheet.mergeCells('A2:J2');
  sheet.getCell('A2').value = `PLANILLA DE SUELDOS CORRESPONDIENTE AL MES ${MESES[planilla.mes].toUpperCase()} ${planilla.anio}`;
  sheet.getCell('A2').font = { bold: true, size: 13 };
  sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 24;

  sheet.mergeCells('A3:J3');
  sheet.getCell('A3').value = `Generado por: ${generadoPor || planilla.creado_por?.nombre || 'Administrador'} · Fecha: ${new Date().toLocaleDateString('es-BO')}`;
  sheet.getCell('A3').alignment = { horizontal: 'center' };
  const headers = ['N°', 'AP. PATERNO', 'AP. MATERNO', 'NOMBRES', 'CÉDULA IDENTIDAD', 'CARGO', 'HORARIO', 'MODALIDAD', 'SUELDO Bs.-', 'FIRMA'];
  const headerRow = sheet.addRow(headers);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9EAD3' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  (planilla.detalles || []).forEach((item, index) => {
    const row = sheet.addRow([
      index + 1,
      item.apellido_paterno,
      item.apellido_materno || '',
      item.nombres,
      item.ci || '',
      item.cargo || '',
      item.horario || '',
      item.tipo_pago === 'por_servicio' ? 'POR SERVICIO' : item.tipo_pago === 'otro' ? 'OTRA' : 'SUELDO FIJO',
      item.tipo_pago === 'por_servicio' && !item.monto_servicio ? 'POR SERVICIO' : Number(item.tipo_pago === 'por_servicio' ? item.monto_servicio || 0 : item.sueldo_base || 0),
      ''
    ]);
    row.height = 42;
    row.eachCell((cell, col) => {
      cell.alignment = { horizontal: col === 10 ? 'left' : 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    if (!(item.tipo_pago === 'por_servicio' && !item.monto_servicio)) row.getCell(9).numFmt = '#,##0.00 "Bs"';
  });

  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  sheet.autoFilter = { from: 'A4', to: `J${4 + (planilla.detalles || []).length}` };
  sheet.headerFooter.oddFooter = '&CPlanilla interna del personal';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Planilla_Sueldos_${MESES[planilla.mes]}_${planilla.anio}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportPlanillasGeneralExcel(planillas, generadoPor = '') {
  const excelModule = await import('exceljs');
  const ExcelJS = excelModule.default || excelModule;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Resumen general', { views: [{ state: 'frozen', ySplit: 5 }] });
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = 'RESUMEN GENERAL DE PLANILLAS DE SUELDOS - PHYSIO ACTIVE';
  sheet.getCell('A1').font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  sheet.mergeCells('A2:G2');
  sheet.getCell('A2').value = `Generado por: ${generadoPor || 'Administrador'} · ${new Date().toLocaleString('es-BO')}`;
  const headers = ['N.º de planilla', 'Mes', 'Cantidad de personal', 'Total de sueldos', 'Estado', 'Fecha de creación', 'Responsable'];
  const header = sheet.getRow(5); header.values = headers;
  header.eachCell((cell) => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164E63' } }; cell.alignment = { horizontal: 'center', wrapText: true }; });
  planillas.forEach((plan, index) => { const total = (plan.detalles || []).reduce((sum, item) => sum + Number(item.tipo_pago === 'por_servicio' ? item.monto_servicio || 0 : item.sueldo_base || 0), 0); const row = sheet.addRow([`PLA-${String(plan.id).padStart(4, '0')}`, `${MESES[plan.mes]} ${plan.anio}`, plan.detalles?.length || 0, total, plan.estado, plan.fecha_planilla || plan.created_at, plan.creado_por?.nombre || 'Administrador']); row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? 'FFF8FAFC' : 'FFFFFFFF' } }; cell.border = { bottom: { style: 'thin', color: { argb: 'FFD7E3E7' } } }; }); row.getCell(4).numFmt = '#,##0.00 "Bs"'; });
  sheet.autoFilter = { from: 'A5', to: `G${5 + planillas.length}` };
  sheet.columns = [{ width: 18 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 15 }, { width: 20 }, { width: 28 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'Planillas_Sueldos_Resumen_General.xlsx'; link.click(); URL.revokeObjectURL(url);
}

export { MESES };
