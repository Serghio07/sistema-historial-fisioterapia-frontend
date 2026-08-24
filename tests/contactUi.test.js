import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isMinorByBirthDate } from '../src/utils/patientAge.js';

const contacts = readFileSync(new URL('../src/pages/pacientes/ContactosPaciente.jsx', import.meta.url), 'utf8');
const patientForm = readFileSync(new URL('../src/pages/pacientes/PacienteForm.jsx', import.meta.url), 'utf8');
const patients = readFileSync(new URL('../src/pages/pacientes/Pacientes.jsx', import.meta.url), 'utf8');
const patientDetail = readFileSync(new URL('../src/pages/pacientes/PacienteDetalle.jsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/contactoService.js', import.meta.url), 'utf8');

test('detecta menor y adulto usando fecha completa', () => {
  assert.equal(isMinorByBirthDate('2008-08-20', '2026-08-19'), true, 'cumple 18 mañana');
  assert.equal(isMinorByBirthDate('2008-08-19', '2026-08-19'), false, 'cumple 18 hoy');
  assert.equal(isMinorByBirthDate('2000-01-01', '2026-08-19'), false);
  assert.equal(isMinorByBirthDate('', '2026-08-19'), false);
});

test('menor muestra tutor obligatorio antes de contacto y diferencia teléfonos', () => {
  assert.match(patientForm, /Paciente menor de 18 años/);
  assert.match(patientForm, /Debe registrar un responsable o tutor/);
  assert.ok(patientForm.indexOf('Paciente menor de 18 años') < patientForm.indexOf('Contacto y perfil'));
  assert.match(patientForm, /Teléfono administrativo/);
  assert.match(patientForm, /Teléfono personal \(opcional\)/);
  assert.match(patients, /Debe seleccionar un responsable principal para el paciente menor/);
  assert.doesNotMatch(patientForm, /!isMinor && guardianBlock/);
  assert.doesNotMatch(patientForm, /disabled=\{hasTutor\}/);
  assert.match(patientForm, /Teléfono administrativo/);
  assert.match(patientForm, /El contacto administrativo se obtiene del tutor asignado/);
  assert.doesNotMatch(patientForm, /update\('telefono', administrativeContact\.telefono\)/);
});

test('tutor seleccionado muestra identidad, parentesco y condición de paciente', () => {
  assert.match(contacts, /Tutor del paciente/);
  assert.match(contacts, /También es paciente/);
  assert.match(contacts, /relationName\(x\).*x\.contacto\.telefono/);
  assert.match(contacts, /Cambiar tutor/);
  assert.match(contacts, /Este paciente menor quedará sin tutor principal/);
  assert.match(patientForm, /administrativeRelation\?\.parentesco/);
});

test('cambiar tutor abre el buscador en lugar de editar los datos del tutor actual', () => {
  assert.match(contacts, /const edit = \(\) => setEditor\(\{ new: true \}\)/);
  assert.doesNotMatch(contacts, /const edit = async \(item\)/);
});

test('cambio de principal sincroniza inmediatamente el teléfono administrativo mostrado', () => {
  assert.match(patientForm, /onLinkedContactsChange\?\.\(items\)/);
  assert.match(patients, /const syncAdministrativeContact = \(items, patientId = editing\)/);
  assert.match(patients, /items\.find\(\(item\) => item\.estado !== false && item\.es_contacto_principal\)/);
  assert.match(patients, /telefono_administrativo: contact\?\.telefono \|\| null/);
  assert.match(patients, /responsable_principal: contact \?/);
  assert.match(patients, /onLinkedContactsChange=\{syncAdministrativeContact\}/);
  assert.match(patients, /readOnly onItemsChange=\{\(items\) => syncAdministrativeContact\(items, selectedPaciente\.id\)\}/);
});

test('usa un solo botón y un solo editor para buscar o crear', () => {
  assert.match(contacts, /Agregar responsable/);
  assert.match(contacts, /function ContactEditor/);
  assert.match(contacts, /No se encontró el contacto/);
  assert.match(contacts, /Crear nuevo contacto/);
  assert.doesNotMatch(contacts, /Crear contacto nuevo[\s\S]*Buscar contacto existente/);
});

test('busca con debounce y admite varios resultados con el mismo teléfono', () => {
  assert.match(contacts, /setTimeout\(async \(\) =>/);
  assert.match(contacts, /350/);
  assert.match(contacts, /results\.map/);
  assert.match(contacts, /Resultados de búsqueda/);
  assert.doesNotMatch(contacts, /teléfono duplicado/i);
});

test('mantiene solamente los campos cotidianos de la relación', () => {
  for (const label of ['Nombres *', 'Apellidos *', 'Teléfono *', 'Parentesco *', 'Contacto principal', 'Responsable legal']) assert.match(contacts, new RegExp(label.replace('*', '\\*')));
  assert.doesNotMatch(contacts, /Opciones avanzadas/);
  for (const field of ['Recibe recordatorios', 'Puede gestionar citas', 'Autoriza WhatsApp', 'Prioridad', 'Observaciones']) assert.doesNotMatch(contacts, new RegExp(`label="${field}`));
  assert.match(contacts, /md:grid-cols-3 md:items-end/);
});

test('asigna defaults a relaciones nuevas y preserva valores ocultos existentes', () => {
  assert.match(contacts, /recibe_recordatorios: true/);
  assert.match(contacts, /puede_gestionar_citas: true/);
  assert.match(contacts, /autoriza_whatsapp: true/);
  assert.match(contacts, /prioridad: 1/);
  assert.match(contacts, /observaciones: null/);
  assert.match(contacts, /editing \? \{ \.\.\.blankRelation, \.\.\.relationPayload\(editing\) \} : blankRelation/);
  assert.match(contacts, /r\[key\] === undefined \? blankRelation\[key\] : r\[key\]/);
});

test('valida OTRO y conserva responsables legales independientes', () => {
  assert.match(contacts, /parentesco === 'OTRO'/);
  assert.match(contacts, /Especifique parentesco/);
  assert.match(contacts, /type="checkbox"/);
  assert.doesNotMatch(contacts, /type="radio"/);
});

test('cambio de principal usa confirmación y acción rápida', () => {
  assert.match(contacts, /Cambiar contacto principal/);
  assert.match(contacts, /Hacer principal/);
  assert.match(contacts, /es_contacto_principal: true/);
});

test('reutiliza existentes, crea atómicamente y reconoce contacto-paciente', () => {
  assert.match(contacts, /linkContactoPaciente/);
  assert.match(contacts, /createContactoAndLink/);
  assert.match(contacts, /setSelected\(item\); setStage\('relation'\)/);
  assert.match(contacts, /También es paciente/);
  assert.match(contacts, /source_patient/);
  assert.match(contacts, /paciente_id: selected\.paciente_id/);
  assert.match(service, /api\.post\(`\/pacientes\/\$\{pacienteId\}\/contactos`/);
});

test('edición separa contacto y relación, avisa compartido y conserva historial', () => {
  assert.match(contacts, /Datos del contacto/);
  assert.match(contacts, /Relación con este paciente/);
  assert.match(contacts, /asociado a otros pacientes/);
  assert.match(contacts, /Quitar de este paciente/);
  assert.match(contacts, /se conservará el historial/);
  assert.match(contacts, /Ver historial/);
  assert.match(service, /\/cerrar/);
  assert.doesNotMatch(service, /api\.delete/);
});

test('nuevo y editar paciente reutilizan la gestión de responsables', () => {
  assert.match(patientForm, /ContactosPreparados/);
  assert.match(patientForm, /ContactosPaciente/);
  assert.match(patientForm, /pacienteId/);
  assert.match(patients, /preparedContacts/);
  assert.match(patients, /createPacienteWithContacts/);
  assert.doesNotMatch(patients, /createPayload = isMinor \? \{ \.\.\.payload, telefono: null \}/);
  assert.doesNotMatch(patients, /quedaron responsables pendientes/);
  assert.match(patientForm, /Teléfono personal \(opcional\)/);
  assert.match(patientForm, /'Teléfono \*'/);
  assert.doesNotMatch(patientForm, /disabled=\{hasTutor\}/);
  assert.match(patientForm, /value=\{form\.telefono\}/);
});

test('detalle muestra responsables únicamente cuando el paciente es menor', () => {
  assert.match(patients, /isMinorByBirthDate\(selectedPaciente\.fecha_nacimiento\) && <section[\s\S]*<ContactosPaciente paciente=\{selectedPaciente\} readOnly/);
  assert.match(patientDetail, /isMinorByBirthDate\(paciente\.fecha_nacimiento\) && <ContactosPaciente paciente=\{paciente\} readOnly/);
});

test('detalle de solo lectura muestra datos sin acciones del responsable', () => {
  assert.match(contacts, /readOnly = false/);
  assert.match(contacts, /if \(readOnly\) return <section/);
  const readOnlyView = contacts.slice(contacts.indexOf('if (readOnly) return'), contacts.indexOf('const save = async', contacts.indexOf('if (readOnly) return')));
  for (const action of ['Agregar responsable', 'Agregar otro responsable', 'Cambiar tutor', 'Quitar', 'Ver historial', 'Ocultar historial', 'Más acciones']) assert.doesNotMatch(readOnlyView, new RegExp(action));
});

test('es responsive y no integra WhatsApp ni recordatorios', () => {
  assert.match(contacts, /sm:grid-cols-2/);
  assert.match(contacts, /flex-wrap/);
  assert.doesNotMatch(service, /whatsapp|recordatorio/i);
  assert.doesNotMatch(contacts, />\s*(telefono_normalizado|paciente_contactos|contacto_id)\s*</);
});

test('resumen lateral usa un solo teléfono de contacto y panel conserva el detalle', () => {
  assert.match(patients, /'Teléfono de contacto', getDisplayPhoneText\(selectedPaciente\)/);
  assert.match(patients, /label="Teléfono personal"/);
  assert.match(patients, /label="Teléfono administrativo"/);
  const lateralStart = patients.indexOf('<aside');
  const lateralEnd = patients.indexOf('</aside>', lateralStart);
  const lateral = patients.slice(lateralStart, lateralEnd);
  assert.doesNotMatch(lateral, /'Teléfono personal'/);
  assert.doesNotMatch(lateral, /'Teléfono administrativo'/);
});

test('etiqueta agregar responsable cambia según existan relaciones', () => {
  assert.match(contacts, /items\.length \? 'Agregar otro responsable' : 'Agregar responsable'/);
  assert.match(contacts, /!items\.length && <Button onClick=\{\(\) => setEditor\(\{ new: true \}\)\}>/);
});

test('tarjeta muestra flags verdaderos y condición de paciente sin valores negativos', () => {
  assert.match(contacts, /item\.es_contacto_principal &&[\s\S]*Principal/);
  assert.match(contacts, /item\.es_responsable_legal &&[\s\S]*Responsable legal/);
  assert.match(contacts, /item\.contacto\?\.paciente_id &&[\s\S]*También es paciente/);
  assert.doesNotMatch(contacts, /Responsable legal:\s*No/);
});

test('quitar relación y desactivar contacto tienen jerarquías diferentes', () => {
  assert.match(contacts, /Quita la relación con este paciente y conserva el historial/);
  assert.match(contacts, /Más acciones del contacto/);
  assert.match(contacts, /Desactivar contacto/);
  assert.match(contacts, /isAdmin && <details/);
  assert.doesNotMatch(contacts, /isAdmin && <button className="text-xs underline"/);
});

test('tarjetas son compactas, flexibles y no presentan null ni undefined', () => {
  assert.match(contacts, /min-w-0 flex-1/);
  assert.match(contacts, /flex flex-wrap items-center/);
  assert.match(contacts, /break-words/);
  assert.doesNotMatch(contacts, />\s*\{?null\}?\s*</);
  assert.doesNotMatch(contacts, />\s*\{?undefined\}?\s*</);
});
