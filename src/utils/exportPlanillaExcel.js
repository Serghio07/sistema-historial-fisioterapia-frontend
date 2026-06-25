const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export async function exportPlanillaExcel(planilla) {
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
    { key: 'sueldo', width: 16 },
    { key: 'firma', width: 28 }
  ];

  sheet.mergeCells('A1:I1');
  sheet.getCell('A1').value = 'Centro de Fisioterapia y Kinesiología Integral';
  sheet.getCell('A1').font = { bold: true, size: 15 };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 25;

  sheet.mergeCells('A2:I2');
  sheet.getCell('A2').value = `PLANILLA DE SUELDOS CORRESPONDIENTE AL MES ${MESES[planilla.mes].toUpperCase()} ${planilla.anio}`;
  sheet.getCell('A2').font = { bold: true, size: 13 };
  sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 24;

  const headers = ['N°', 'AP. PATERNO', 'AP. MATERNO', 'NOMBRES', 'CÉDULA IDENTIDAD', 'CARGO', 'HORARIO', 'SUELDO Bs.-', 'FIRMA'];
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
      item.tipo_pago === 'por_servicio' ? 'POR SERVICIO' : Number(item.sueldo_base || 0),
      ''
    ]);
    row.height = 42;
    row.eachCell((cell, col) => {
      cell.alignment = { horizontal: col === 9 ? 'left' : 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    if (item.tipo_pago !== 'por_servicio') row.getCell(8).numFmt = '#,##0.00';
  });

  sheet.views = [{ state: 'frozen', ySplit: 3 }];
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

export { MESES };
