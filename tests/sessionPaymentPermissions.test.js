import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sessionsPage = readFileSync(new URL('../src/pages/sesiones/Sesiones.jsx', import.meta.url), 'utf8');
const sessionForm = readFileSync(new URL('../src/pages/sesiones/SesionForm.jsx', import.meta.url), 'utf8');
const input = readFileSync(new URL('../src/components/common/Input.jsx', import.meta.url), 'utf8');
const permissions = readFileSync(new URL('../src/config/permissions.js', import.meta.url), 'utf8');
const paymentPlan = readFileSync(new URL('../src/pages/planillaPagos/PlanillaPagos.jsx', import.meta.url), 'utf8');
const financialSummary = readFileSync(new URL('../src/pages/planillaPagos/ResumenFinanciero.jsx', import.meta.url), 'utf8');

test('administrador y personal pueden registrar el pago desde Nueva sesión', () => {
  assert.match(sessionsPage, /<SesionForm[^>]+canViewFinancial\s*\/>/s);
  assert.doesNotMatch(sessionsPage, /canViewFinancial=\{isAdmin\}/);
  assert.match(sessionForm, /canViewFinancial\s*&&\s*<Section title="Informacion de pago"/);
  assert.match(input, /isFinancialField && !allowFinancial/);
  assert.ok((sessionForm.match(/allowFinancial/g) || []).length >= 7);
  for (const label of ['Metodo de pago', 'Estado de pago', 'Monto de la sesion', 'Monto pagado', 'Saldo pendiente', 'Observación del pago (opcional)']) assert.ok(sessionForm.includes(`label="${label}"`));
});

test('los resúmenes financieros y la anulación permanecen restringidos al administrador', () => {
  assert.match(sessionsPage, /isAdmin && <StatPill[^>]+label="Pago \/ saldo"/);
  assert.match(sessionsPage, /isAdmin && <ActionButton label="Anular sesión"/);
});

test('Control financiero es visible para ambos roles y se refresca al volver a la pantalla', () => {
  assert.match(permissions, /finanzas: \['admin', 'personal'\]/);
  assert.match(permissions, /personal: \['view', 'create', 'edit', 'print', 'export'\]/);
  assert.match(paymentPlan, /window\.addEventListener\('focus', refreshWhenVisible\)/);
  assert.match(paymentPlan, /onAnnul=\{isAdmin \? annul : null\}/);
  assert.match(paymentPlan, /onAnnul=\{isAdmin \? annulOperation : null\}/);
  assert.doesNotMatch(financialSummary, /columns=\{\[[^\]]*'Recibido por'/);
  assert.match(financialSummary, /setInterval\(refresh,15000\)/);
});
