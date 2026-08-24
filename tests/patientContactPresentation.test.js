import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getDisplayPhone,
  getDisplayPhoneText,
  getResponsibleSummary,
  isAdministrativeContactPhone
} from '../src/utils/patientContact.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('adulto presenta su teléfono personal sin responsable', () => {
  const patient = { telefono: '77712345', telefono_administrativo: '77712345', telefono_fuente: 'PACIENTE' };
  assert.equal(getDisplayPhone(patient), '77712345');
  assert.equal(getResponsibleSummary(patient), '');
  assert.equal(isAdministrativeContactPhone(patient), false);
});

test('menor presenta teléfono, responsable y parentesco del DTO administrativo', () => {
  const patient = { telefono: null, telefono_administrativo: '62295637', telefono_fuente: 'CONTACTO', responsable_principal: { nombres: 'SERGIO', apellidos: 'TICONA', parentesco: 'PADRE' } };
  assert.equal(getDisplayPhone(patient), '62295637');
  assert.equal(getResponsibleSummary(patient), 'SERGIO TICONA — PADRE');
  assert.equal(isAdministrativeContactPhone(patient), true);
});

test('fallback nunca presenta null ni undefined', () => {
  assert.equal(getDisplayPhoneText(null), 'Sin teléfono de contacto');
  assert.equal(getDisplayPhoneText({ telefono: null, telefono_administrativo: null }), 'Sin teléfono de contacto');
});

test('pantallas clínicas, pagos y documentos consumen la utilidad común', () => {
  [
    '../src/pages/historiasClinicas/HistoriasClinicas.jsx',
    '../src/pages/citas/Citas.jsx',
    '../src/pages/sesiones/Sesiones.jsx',
    '../src/pages/sesionesSemanales/SesionesSemanales.jsx',
    '../src/pages/resumenPacientes/ResumenPacientes.jsx',
    '../src/pages/planillaPagos/PlanillaPagos.jsx',
    '../src/pages/documentos/DocumentosClinicos.jsx'
  ].forEach((path) => assert.match(read(path), /getDisplayPhone/));
});

test('consentimiento conserva snapshot de responsable y documento', () => {
  const documents = read('../src/pages/documentos/DocumentosClinicos.jsx');
  const preview = read('../src/pages/documentos/DocumentoPreview.jsx');
  assert.match(documents, /tutor_parentesco/);
  assert.match(documents, /tutor_numero_documento/);
  assert.match(preview, /Responsable legal/);
  assert.match(preview, /Documento del responsable/);
});
