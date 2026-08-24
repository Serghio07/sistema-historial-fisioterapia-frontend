import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modal = readFileSync(new URL('../src/pages/historiasClinicas/ProgramacionSesionesModal.jsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/citaService.js', import.meta.url), 'utf8');
const accordion = readFileSync(new URL('../src/pages/historiasClinicas/PacienteHistoriasAccordion.jsx', import.meta.url), 'utf8');
const histories = readFileSync(new URL('../src/pages/historiasClinicas/HistoriasClinicas.jsx', import.meta.url), 'utf8');
const sessionForm = readFileSync(new URL('../src/pages/sesiones/SesionForm.jsx', import.meta.url), 'utf8');
const expansion = readFileSync(new URL('../src/pages/historiasClinicas/AmpliarSesionesModal.jsx', import.meta.url), 'utf8');
const historyService = readFileSync(new URL('../src/services/historiaClinicaService.js', import.meta.url), 'utf8');

test('después de guardar muestra directamente todas las sesiones vinculadas', () => {
  assert.match(modal, /Sesiones programadas del tratamiento/);
  assert.match(modal, /!\['Cancelada', 'Reprogramada'\]\.includes\(x\.estado\)/);
  assert.match(modal, /setSummary\(data\)/);
  assert.match(modal, /\{x\.estado\}/);
});

test('permite editar, desprogramar y reducir sesiones pendientes de forma segura', () => {
  assert.match(modal, /saveScheduled/);
  assert.match(modal, /unschedule/);
  assert.match(modal, /removeLastSession/);
  assert.match(service, /\/citas\/programacion\/historia\/\$\{historiaId\}\/reducir/);
});

test('permite ampliar el mismo plan de tratamiento', () => {
  assert.match(modal, /Añadir nueva sesión/);
  assert.match(modal, /setShowExpansion\(true\)/);
  assert.match(expansion, /Motivo de la ampliación \(opcional\)/i);
  assert.match(expansion, /crypto\.randomUUID\(\)/);
  assert.match(historyService, /\/historias-clinicas\/\$\{id\}\/ampliar-sesiones/);
});

test('ampliar una sesión recarga la historia y evita formularios con totales antiguos', () => {
  assert.match(accordion, /onSaved=\{onScheduleChanged\}/);
  assert.match(histories, /onScheduleChanged=\{load\}/);
});

test('una historia completada puede ampliarse desde Nueva sesión y habilita el siguiente número', () => {
  assert.match(sessionForm, /planCompleto.*Ampliar sesiones/s);
  assert.match(sessionForm, /AmpliarSesionesModal/);
  assert.match(sessionForm, /sesiones_debe: nuevoTotal/);
  assert.match(sessionForm, /numero_sesion: sesionesRealizadasPrevias \+ 1/);
  assert.match(sessionForm, /await onPlanExpanded\?\.\(\)/);
});
