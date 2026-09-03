import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/planillaPagos/ConsolidadoFinanciero.jsx', import.meta.url), 'utf8');
const arqueos = fs.readFileSync(new URL('../src/pages/planillaPagos/Arqueos.jsx', import.meta.url), 'utf8');

test('Consolidado vive dentro de Arqueos y ofrece los períodos Día Semana y Mes', () => {
  assert.match(arqueos, /ConsolidadoFinanciero/);
  for (const label of ['Diario', 'Semanal', 'Mensual', 'Fecha', 'Semana de referencia', 'Mes', 'Año']) assert.match(page, new RegExp(label));
});

test('día presenta arqueo informativo, snapshot y aviso sin permitir cerrar', () => {
  for (const label of ['Arqueo del día', 'Sin cierre diario', 'aún no posee un cierre diario', 'Responsable', 'Saldo inicial', 'Efectivo sistema', 'Efectivo confirmado', 'Diferencia total', 'Monto retirado', 'Saldo dejado en caja']) assert.match(page, new RegExp(label));
  assert.doesNotMatch(page, /Cerrar arqueo/);
});

test('frontend presenta datos autoritativos sin sumar pagos ni construir período anterior', () => {
  assert.match(page, /getArqueosConsolidado/);
  assert.match(page, /data\.cobros/);
  assert.match(page, /data\.comparacion/);
  assert.doesNotMatch(page, /reduce\(.*movimientos_pago|anterior_desde\s*=/);
  assert.doesNotMatch(page, /Recibido por/);
  assert.doesNotMatch(page, /row\.recibido_por/);
  assert.match(page, /setInterval\(refresh,15000\)/);
});

test('muestra actividad, cobros separados, servicios, deuda, caja y resultado con etiquetas precisas', () => {
  for (const label of ['Pacientes atendidos', 'Sesiones realizadas', 'Total cobrado', 'label="QR"', 'label="Transferencia"', 'Fisioterapia', 'Otros servicios', 'Deuda vigente actual', 'Pendiente originado en el período', 'Ingresos extraordinarios', 'Egresos operativos', 'Resultado neto operativo']) assert.match(page, new RegExp(label));
});

test('comparativo conserva actual anterior variación y semántica neutral', () => {
  for (const label of ['Comparación con período anterior', 'Métrica', 'Actual', 'Anterior', 'Variación', 'value.etiqueta']) assert.match(page, new RegExp(label));
  assert.doesNotMatch(page, /text-emerald.*direccion/);
});

test('gastos presentan categorías y agrupaciones sin alterar almacenamiento', () => {
  for (const label of ['Gastos administrativos', 'Gastos de insumos', 'Otros egresos', 'Gastos por categoría']) assert.match(page, new RegExp(label));
  assert.match(page, /gastos_por_categoria/);
});

test('incluye loading error empty state aviso de cierres y PDF para Día Semana y Mes', () => {
  assert.match(page, /Loader/);
  assert.match(page, /No se pudo cargar el consolidado financiero/);
  assert.match(page, /No existen movimientos ni sesiones registradas para este período/);
  assert.match(page, /cierres_diarios\.estado/);
  assert.match(page, /Generar PDF/);
  for (const title of ["dia:'DIARIO'", "semana:'SEMANAL'", "mes:'MENSUAL'"]) assert.match(page, new RegExp(title));
});
