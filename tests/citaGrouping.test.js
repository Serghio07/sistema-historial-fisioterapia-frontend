import test from 'node:test';
import assert from 'node:assert/strict';
import { agruparCitasPorPacienteEHistoria, progresoHistoria, tituloHistoria } from '../src/pages/citas/utils/agruparCitas.js';

const now = new Date('2026-08-04T12:00:00-04:00');
const cita = (values = {}) => ({ id: 1, paciente_id: 7, paciente: { id: 7, nombres: 'Paciente', registro_pendiente: false }, fecha: '2026-08-08', hora_inicio: '09:00', hora_fin: '10:00', estado: 'Programada', ...values });

test('agrupa una sola tarjeta por paciente y separa historias reales', () => {
  const groups = agruparCitasPorPacienteEHistoria([
    cita({ id: 1, historia_clinica_id: 10, historia_clinica: { id: 10 } }),
    cita({ id: 2, historia_clinica_id: 10, historia_clinica: { id: 10 }, hora_inicio: '10:00' }),
    cita({ id: 3, historia_clinica_id: 11, historia_clinica: { id: 11 } })
  ], now);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].historias.length, 2);
  assert.deepEqual(groups[0].historias.map((item) => item.citas.length), [2, 1]);
});

test('mantiene citas sin historia en una seccion independiente', () => {
  const group = agruparCitasPorPacienteEHistoria([cita()], now)[0];
  assert.equal(group.historias[0].key, 'without-history');
  assert.equal(group.historias[0].citas[0].id, 1);
});

test('conserva origen WhatsApp y paciente temporal', () => {
  const group = agruparCitasPorPacienteEHistoria([cita({ origen: 'WhatsApp', paciente: { id: 7, nombres: 'Temporal', registro_pendiente: true } })], now)[0];
  assert.equal(group.whatsapp, true);
  assert.equal(group.paciente.registro_pendiente, true);
});

test('separa proximas, anteriores y canceladas respetando estados', () => {
  const section = agruparCitasPorPacienteEHistoria([
    cita({ id: 1 }),
    cita({ id: 2, fecha: '2026-08-03', estado: 'Atendida' }),
    cita({ id: 3, estado: 'Cancelada' }),
    cita({ id: 4, estado: 'Reprogramada' })
  ], now)[0].historias[0];
  assert.equal(section.upcoming.length, 1);
  assert.equal(section.previous.length, 1);
  assert.equal(section.cancelled.length, 2);
});

test('el progreso usa sesiones reales asistidas y evita inventar contratadas', () => {
  const withoutContract = { historia: {}, citas: [] };
  assert.equal(progresoHistoria(withoutContract), null);
  const progress = progresoHistoria({ historia: { evaluacion_final: { sesiones_contratadas: 4 } }, citas: [
    cita({ sesion_clinica: { id: 20, asistencia: 'asistio' } }),
    cita({ id: 2, sesion_clinica: { id: 21, asistencia: 'pendiente' } })
  ] });
  assert.deepEqual(progress, { completed: 1, contracted: 4, percent: 25 });
});

test('una historia sin diagnostico se identifica por su fecha real', () => {
  assert.equal(tituloHistoria({ fecha_evaluacion: '2026-07-02' }), 'Historia clínica del 2/7/2026');
  assert.equal(tituloHistoria({ diagnostico_medico: 'Dolor de rodilla', fecha_evaluacion: '2026-07-02' }), 'Dolor de rodilla');
});
