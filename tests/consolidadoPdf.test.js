import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildObligationPdfRows, obligationPdfHeaders, obligationPdfWidths, paginateRows, pdfPeriodLabel } from '../src/utils/consolidadoPdf.js';

const obligation = (id, overrides = {}) => ({
  conceptoId:id,fecha:'2026-08-26',paciente:`PACIENTE ${id}`,documento:`DOC-${id}`,profesional:'FT RESPONSABLE',
  montoPagado:150,saldoPendiente:0,metodosPago:['Efectivo'],recibos:[`REC-${id}`],estadoReporte:'CANCELADO',...overrides
});

test('PDF usa las diez columnas solicitadas y cabe en A4 horizontal',()=>{
  assert.deepEqual(obligationPdfHeaders,['N°','Fecha','Paciente','Documento','Profesional','Cobrado','Pago','Recibo','Deuda','Estado']);
  assert.equal(obligationPdfWidths.length,10);assert.ok(obligationPdfWidths.reduce((sum,width)=>sum+width,0)<=273);
});

test('formatea pago completo, sin pago, parcial, varios pagos y varios recibos sin duplicar conceptos',()=>{
  const data={detalle_obligaciones:[
    obligation(1),
    obligation(2,{montoPagado:0,saldoPendiente:150,metodosPago:[],recibos:[],estadoReporte:'NO CANCELADO'}),
    obligation(3,{montoPagado:100,saldoPendiente:100,metodosPago:['QR'],recibos:['REC-3'],estadoReporte:'PENDIENTE'}),
    obligation(4,{montoPagado:300,saldoPendiente:0,metodosPago:['Efectivo','QR'],recibos:['REC-4A','REC-4B','REC-4C'],estadoReporte:'CANCELADO'})
  ]};
  const rows=buildObligationPdfRows(data);
  assert.equal(rows.length,4);assert.deepEqual(rows.map(row=>row[0]),['1','2','3','4']);
  assert.deepEqual(rows[0].slice(1),['26/08/2026','PACIENTE 1','DOC-1','FT RESPONSABLE','Bs 150,00','Efectivo','REC-1','Bs 0,00','CANCELADO']);
  assert.equal(rows[1][5],'Bs 0,00');assert.equal(rows[1][6],'—');assert.equal(rows[1][7],'—');assert.equal(rows[1][8],'Bs 150,00');assert.equal(rows[1][9],'NO CANCELADO');
  assert.equal(rows[2][5],'Bs 100,00');assert.equal(rows[2][8],'Bs 100,00');assert.equal(rows[2][9],'PENDIENTE');
  assert.equal(rows[3][6],'Efectivo / QR');assert.equal(rows[3][7],'REC-4A / REC-4B +1');
});

test('períodos diario, semanal, mensual y cruce de mes conservan fechas reales',()=>{
  assert.equal(pdfPeriodLabel({tipo:'dia',desde:'2026-08-26',hasta:'2026-08-26'}),'26/08/2026');
  assert.equal(pdfPeriodLabel({tipo:'semana',desde:'2026-08-24',hasta:'2026-08-30'}),'24/08/2026 al 30/08/2026');
  assert.equal(pdfPeriodLabel({tipo:'mes',desde:'2026-08-01',hasta:'2026-08-31'}),'Agosto 2026');
  assert.equal(pdfPeriodLabel({tipo:'semana',desde:'2026-08-29',hasta:'2026-09-04'}),'29/08/2026 al 04/09/2026');
});

for(const count of [30,50,100])test(`paginación de ${count} filas mantiene numeración correlativa y filas completas`,()=>{
  const rows=buildObligationPdfRows({detalle_obligaciones:Array.from({length:count},(_,index)=>obligation(index+1))});
  const pages=paginateRows(rows,()=>7,160);const flattened=pages.flat();
  assert.equal(flattened.length,count);assert.equal(flattened[0][0],'1');assert.equal(flattened.at(-1)[0],String(count));
  assert.deepEqual(flattened.map(row=>Number(row[0])),Array.from({length:count},(_,index)=>index+1));
  assert.ok(pages.every(page=>page.length*7<=160));
});

test('PDF consume detalle autoritativo, omite el resumen final y no altera el histórico',()=>{
  const page=fs.readFileSync(new URL('../src/pages/planillaPagos/ConsolidadoFinanciero.jsx',import.meta.url),'utf8');
  const historical=fs.readFileSync(new URL('../src/pages/planillaPagos/Arqueos.jsx',import.meta.url),'utf8');
  assert.match(page,/buildObligationPdfRows\(data\)/);assert.doesNotMatch(page,/RESUMEN DEL DÍA|RESUMEN DE LA SEMANA|RESUMEN DEL MES/);
  assert.match(page,/data\.resultado\.total_ingresos_operativos/);assert.match(page,/data\.resultado\.total_egresos_operativos/);assert.match(page,/data\.resultado\.resultado_neto_operativo/);
  assert.doesNotMatch(page,/detalle_obligaciones[^\n]*reduce/);assert.match(historical,/snapshot_resumen/);assert.match(historical,/const downloadPdf = async \(arqueo\)/);
});
