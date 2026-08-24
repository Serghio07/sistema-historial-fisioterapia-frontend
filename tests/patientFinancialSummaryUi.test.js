import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/planillaPagos/PlanillaPagos.jsx', import.meta.url), 'utf8');
const modal = fs.readFileSync(new URL('../src/pages/planillaPagos/ResumenFinancieroPacienteModal.jsx', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../src/services/planillaPagosService.js', import.meta.url), 'utf8');
const modalBase = fs.readFileSync(new URL('../src/components/common/Modal.jsx', import.meta.url), 'utf8');

test('Planilla abre un único componente interno por paciente e historia', () => {
  assert.match(page, /ResumenFinancieroPacienteModal/);
  assert.match(page, /setFinancialSummary\(\{ pacienteId: i\.paciente_id, historiaId: i\.historia_clinica_id \}\)/);
  assert.match(page, /aria-label="Ver resumen financiero del paciente"/);
});

test('servicio consulta endpoint GET específico con historia opcional', () => {
  assert.match(service, /getResumenFinancieroPaciente/);
  assert.match(service, /pacientes\/\$\{pacienteId\}\/resumen-financiero/);
  assert.match(service, /historiaId \? \{ historiaId \} : \{\}/);
});

test('modal contiene selector Todas y las ocho métricas solicitadas', () => {
  assert.match(modal, /Todas las historias/);
  for (const label of ['Sesiones realizadas','Total esperado','Pagado total','Saldo pendiente','Pagado hoy','Pagado esta semana','Pagado este mes','Total histórico']) assert.match(modal, new RegExp(label));
  assert.match(modal, /setData\(null\)/);
});

test('muestra último pago, métodos, conceptos, total y compatibilidad legacy', () => {
  for (const label of ['Último pago recibido','Pagos por método','Conceptos y sesiones asociados','TOTALES','Pago histórico','Ver recibo','Ver comprobante']) assert.match(modal, new RegExp(label));
  assert.match(modal, /DEUDA_HISTORIA/); assert.match(modal, /ESPECIFICO/);
});

test('conceptos son tabla en desktop y cards en móvil', () => {
  assert.match(modal, /hidden overflow-x-auto md:block/);
  assert.match(modal, /grid gap-3 md:hidden/);
  assert.match(modal, /Historia clínica/);
});

test('modal soporta escape, focus trap y semántica dialog', () => {
  assert.match(modal, /closeOnEscape/);
  assert.match(modalBase, /role="dialog"/); assert.match(modalBase, /aria-modal="true"/); assert.match(modalBase, /event\.key !== 'Tab'/);
});
