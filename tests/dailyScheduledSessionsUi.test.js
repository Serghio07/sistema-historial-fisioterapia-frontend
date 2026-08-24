import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page=fs.readFileSync(new URL('../src/pages/sesiones/Sesiones.jsx',import.meta.url),'utf8');

test('Sesiones Diarias muestra programaciones vigentes del día antes del histórico',()=>{assert.match(page,/Atenciones de hoy/);assert.match(page,/sesiones pendientes/);assert.match(page,/String\(cita\.fecha\) === today/);assert.match(page,/!cita\.sesion_id/);assert.ok(page.indexOf('Atenciones de hoy')<page.lastIndexOf('Sesiones registradas'))});
test('la siguiente programación permite registrar atención mediante el flujo existente',()=>{assert.match(page,/Registrar atención/);assert.match(page,/state:\{programacion:next\}/);assert.match(page,/\['Programada', 'Confirmada'\]\.includes\(cita\.estado\)/)});
test('la agenda diaria no altera ni crea sesiones automáticamente',()=>{assert.doesNotMatch(page,/programacionesHoy[\s\S]{0,500}createSesion/);assert.match(page,/No hay sesiones de tratamiento pendientes para hoy/)});
test('agrupa por paciente y presenta línea de tiempo y próxima sesión',()=>{assert.match(page,/const atencionesHoy/);assert.match(page,/paciente_id.*historia_clinica_id/);assert.match(page,/Próxima sesión/);assert.match(page,/border-dashed/);assert.match(page,/group\.citas\[0\]/)});
