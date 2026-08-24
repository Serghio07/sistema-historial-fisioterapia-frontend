import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const summary=fs.readFileSync(new URL('../src/pages/planillaPagos/ResumenFinanciero.jsx',import.meta.url),'utf8');
const plan=fs.readFileSync(new URL('../src/pages/planillaPagos/PlanillaPagos.jsx',import.meta.url),'utf8');
const controller=fs.readFileSync(new URL('../../backend/src/controllers/planillaPagos.controller.js',import.meta.url),'utf8');

test('Resumen recibe resultado neto autoritativo y React solo lo presenta',()=>{assert.match(controller,/resultado_neto_operativo: cashSummary\.resultado_neto/);assert.match(summary,/Resultado neto operativo/);assert.match(summary,/data\?\.resultado_neto_operativo/);assert.doesNotMatch(summary,/total_cobrado\s*\+.*ingresos_extraordinarios\s*-/)});
test('Resumen explica fórmula y conserva signo negativo',()=>{assert.match(summary,/Cobros de pacientes \+ ingresos extraordinarios - egresos operativos/);assert.match(summary,/-Bs \$\{Math\.abs/)});
test('Planilla identifica métodos acumulados sin cambiar los indicadores',()=>{assert.match(plan,/Efectivo acumulado/);assert.match(plan,/Métodos acumulados/);assert.match(plan,/acumulado histórico de los conceptos actualmente visibles/);assert.match(plan,/data\.indicadores\.efectivo/)});
test('acciones financieras recargan la vista sin F5',()=>{assert.match(plan,/await onSaved\(\)/);assert.match(plan,/await annulOperacionPago[\s\S]*await load\(\)/);assert.match(plan,/await annulMovimientoPago[\s\S]*await load\(\)/);assert.doesNotMatch(plan,/location\.reload|window\.location\.reload/)});
test('Historia y detalle usa diagnóstico clínico actual y una presentación compacta',()=>{assert.match(plan,/const conceptoClinicoActual/);assert.match(plan,/historia_clinica\?\.diagnostico_medico/);assert.match(plan,/className="block truncate text-xs"/);assert.match(plan,/title=\{conceptoClinicoActual\(i\)\}/);assert.doesNotMatch(plan,/<b>\{i\.detalle\}<\/b>/)});
