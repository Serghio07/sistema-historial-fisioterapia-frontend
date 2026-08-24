import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/documentos/DocumentosClinicos.jsx', import.meta.url), 'utf8');

test('Consentimiento Informado usa la lista clínica compacta solicitada', () => {
  assert.match(page, /tipo === 'consentimiento' \? \['Paciente', 'Diagnóstico', 'Estado', 'Acciones'\]/);
  assert.match(page, /documentoTexto.*formatDate\(documento\.fecha\)/s);
  assert.match(page, /<MoreVertical size=\{18\}/);
  assert.match(page, />Imprimir<\/button>/);
  assert.match(page, />Descargar<\/button>/);
  assert.match(page, />Eliminar<\/button>/);
});

test('otros documentos conservan su tabla y acciones actuales', () => {
  assert.match(page, /\['Fecha', 'Paciente', 'Documento', 'Diagnostico', 'Responsable', 'Estado', 'Acciones'\]/);
  assert.match(page, /const commonActions/);
});
