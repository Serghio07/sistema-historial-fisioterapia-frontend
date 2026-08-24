import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const page = fs.readFileSync(path.resolve('src/pages/sesionesSemanales/SesionesSemanales.jsx'), 'utf8');
const excel = fs.readFileSync(path.resolve('src/utils/exportSesionesSemanalesExcel.js'), 'utf8');

test('agrupa la tabla de administración en siete columnas', () => {
  assert.match(page, /'Paciente', 'Historia', 'Sesiones'/);
  assert.match(page, /\.\.\.\(isAdmin \? \['Pagos'\] : \[\]\)/);
  assert.match(page, /'Estado', 'Profesional', 'Acciones'/);
  assert.match(page, /Pagado esta semana/);
  assert.match(page, /Deuda semanal/);
});

test('muestra canceladas solo cuando existen y prioriza la última asistida', () => {
  assert.match(page, /sesion\.asistencia === 'cancelada'/);
  assert.match(page, /stats\.canceladas > 0/);
  assert.match(page, /sesion\.asistencia === 'asistio'/);
  assert.match(page, /estadoHistoria === 'completada'/);
});

test('el detalle muestra las sesiones faltantes de toda la historia clínica', () => {
  assert.match(page, /label="Sesiones faltantes" value=\{restantes\}/);
  assert.match(page, /evaluacion_final\?\.sesiones_contratadas/);
  assert.match(page, /Math\.max\(contratadas - \(realizadas \|\| asistidas\), 0\)/);
});

test('el Excel incluye pagado en la semana y deuda semanal', () => {
  assert.match(excel, /'Pagado en la semana', 'Deuda semanal'/);
  assert.match(excel, /registro\.pagado_en_semana/);
});
