const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const includesAny = (values, terms) => values.some((value) => (
  terms.some((term) => normalize(value).includes(term))
));

const formatDate = (value) => {
  const [year, month, day] = String(value || '').slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};

const addDays = (value, amount) => {
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
};

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FF71867B' } },
  left: { style: 'thin', color: { argb: 'FF71867B' } },
  bottom: { style: 'thin', color: { argb: 'FF71867B' } },
  right: { style: 'thin', color: { argb: 'FF71867B' } }
};

const headerColors = [
  'FFC98243',
  'FFC98243',
  'FFE7B878',
  'FFE7B878',
  'FFE7B878',
  'FF9FC6B0',
  'FF9FC6B0',
  'FF9FC6B0',
  'FFC98243',
  'FFC98243'
];

const dataColors = [
  'FFFFF7ED',
  'FFFFF7ED',
  'FFFFF3DE',
  'FFFFF3DE',
  'FFFFF3DE',
  'FFE7F3EB',
  'FFE7F3EB',
  'FFE7F3EB',
  'FFFFF7ED',
  'FFFFF7ED'
];

export const buildFarmacosWorkbook = ({ ExcelJS, rows, weekStart, includeFinancial = false }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Physio Active';
  workbook.title = 'Administración de Fármacos';
  workbook.subject = 'Planilla semanal de administración de fármacos';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Administración de Fármacos', {
    properties: { defaultRowHeight: 24 },
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      verticalCentered: false,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.35,
        bottom: 0.35,
        header: 0.15,
        footer: 0.15
      }
    },
    views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }]
  });

  sheet.columns = [
    { key: 'fecha', width: 13 },
    { key: 'paciente', width: 36 },
    { key: 'diclo', width: 10 },
    { key: 'dexa', width: 10 },
    { key: 'complejoB', width: 11 },
    { key: 'jeringa3', width: 9 },
    { key: 'jeringa5', width: 9 },
    { key: 'jeringa10', width: 10 },
    { key: 'monto', width: 13 },
    { key: 'qr', width: 9 }
  ];

  sheet.mergeCells('A1:J1');
  const title = sheet.getCell('A1');
  title.value = 'ADMINISTRACIÓN DE FÁRMACOS';
  title.font = { name: 'Arial', bold: true, size: 20, color: { argb: 'FF9C3E25' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
  sheet.getRow(1).height = 34;

  sheet.mergeCells('A2:J2');
  const subtitle = sheet.getCell('A2');
  subtitle.value = `SEMANA DEL ${formatDate(weekStart)} AL ${formatDate(addDays(weekStart, 6))}`;
  subtitle.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF7C2D12' } };
  subtitle.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 8;

  const headers = ['FECHA', 'PACIENTE', 'DICLO', 'DEXA', 'COM B', '3 ml', '5 ml', '10 ml', 'Bs.', 'QR'];
  const headerRow = sheet.getRow(4);
  headers.forEach((label, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = label;
    cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColors[index] } };
    cell.border = thinBorder;
  });
  headerRow.height = 30;
  sheet.autoFilter = { from: 'A4', to: 'J4' };

  const sortedRows = [...rows].sort((a, b) => (
    String(a.fecha).localeCompare(String(b.fecha))
    || String(a.paciente).localeCompare(String(b.paciente), 'es')
  ));

  const printableRows = Math.max(18, sortedRows.length);
  for (let index = 0; index < printableRows; index += 1) {
    const item = sortedRows[index];
    const products = item?.productos || [];
    const productNames = products.flatMap((product) => [
      product.producto,
      product.nombre_otro,
      product.presentacion,
      product.dosis,
      product.volumen
    ]).filter(Boolean);
    const source = item?.source || {};
    const check = (condition) => condition ? '✓' : '';
    const values = item ? [
      formatDate(item.fecha),
      String(item.paciente || '').toLocaleUpperCase('es-BO'),
      check(Boolean(source.diclo) || includesAny(productNames, ['diclofenaco', 'diclo'])),
      check(Boolean(source.dexa) || includesAny(productNames, ['dexametasona', 'dexa'])),
      check(Boolean(source.com_b) || includesAny(productNames, ['complejo b', 'com b'])),
      check(Boolean(source.dosis_3ml) || includesAny(productNames, ['jeringa 3', '3 ml', '3ml'])),
      check(Boolean(source.dosis_5ml) || includesAny(productNames, ['jeringa 5', '5 ml', '5ml'])),
      check(Boolean(source.dosis_10ml) || includesAny(productNames, ['jeringa 10', '10 ml', '10ml'])),
      Number(item.monto || 0),
      check(Boolean(source.qr) || normalize(item.metodo) === 'qr')
    ] : ['', '', '', '', '', '', '', '', '', ''];

    const row = sheet.addRow(values);
    row.height = 27;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.font = {
        name: 'Arial',
        size: columnNumber === 2 ? 10 : 11,
        bold: columnNumber >= 3 && columnNumber <= 8 && Boolean(cell.value),
        color: { argb: 'FF24352E' }
      };
      cell.alignment = {
        horizontal: columnNumber === 2 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: dataColors[columnNumber - 1] }
      };
      cell.border = thinBorder;
    });
    if (includeFinancial) row.getCell(9).numFmt = '#,##0.00';
  }

  const lastRow = 4 + printableRows;
  sheet.pageSetup.printArea = `A1:J${lastRow}`;
  sheet.pageSetup.printTitlesRow = '1:4';
  sheet.headerFooter.oddFooter = '&LPhysio Active&CAdministración de Fármacos&RPágina &P de &N';
  if (!includeFinancial) {
    sheet.unMergeCells('A1:J1');
    sheet.unMergeCells('A2:J2');
    sheet.spliceColumns(9, 2);
    sheet.mergeCells('A1:H1');
    sheet.mergeCells('A2:H2');
    sheet.autoFilter = { from: 'A4', to: 'H4' };
    sheet.pageSetup.printArea = `A1:H${lastRow}`;
  }

  return workbook;
};
