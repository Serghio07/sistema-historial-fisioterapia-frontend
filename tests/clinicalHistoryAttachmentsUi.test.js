import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modal = readFileSync(new URL('../src/pages/historiasClinicas/AdjuntosHistoriaModal.jsx', import.meta.url), 'utf8');
const accordion = readFileSync(new URL('../src/pages/historiasClinicas/PacienteHistoriasAccordion.jsx', import.meta.url), 'utf8');

test('cada historia expone su botón y contador independiente', () => {
  assert.match(accordion, /Adjuntos de la historia \(\{attachmentCounts\[latest\.id\] \|\| 0\}\)/);
  assert.match(accordion, /onViewAttachments\(latest\)/);
});

test('modal permite cinco archivos con metadatos individuales y sesiones de la historia', () => {
  assert.match(modal, /files\.length > 5/);
  assert.match(modal, /selected\.map\(\(item, index\)/);
  assert.match(modal, /historia_clinica_id \|\| item\.historia_clinica\?\.id/);
  assert.match(modal, /Sin sesión específica/);
});

test('incluye vista, descarga y eliminación lógica mediante API', () => {
  assert.match(modal, /getArchivoAdjunto/);
  assert.match(modal, /downloadArchivoAdjunto/);
  assert.match(modal, /deleteAdjuntoHistoria/);
});
