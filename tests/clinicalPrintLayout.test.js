import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('la impresión de documentos clínicos aísla la hoja y excluye el modal', () => {
  const page = read('../src/pages/documentos/DocumentosClinicos.jsx');
  const styles = read('../src/styles/global.css');
  assert.match(page, /data-clinical-print/);
  assert.match(styles, /body:has\(\[data-clinical-print\]\) \*/);
  assert.match(styles, /max-height: none !important/);
  assert.match(styles, /overflow: visible !important/);
  assert.match(styles, /@page \{[\s\S]*?margin: 0;/);
  assert.match(styles, /-webkit-print-color-adjust: exact !important/);
  assert.match(styles, /width: 210mm !important/);
  assert.match(styles, /min-height: 297mm !important/);
});

test('el consentimiento corresponde a fisioterapia y no conserva texto de cirugía o legislación extranjera', () => {
  const preview = read('../src/pages/documentos/DocumentoPreview.jsx');
  assert.match(preview, /tratamiento de fisioterapia y kinesiología/);
  assert.doesNotMatch(preview, /Cirugia Minimo Invasiva/i);
  assert.doesNotMatch(preview, /RGPD|Ley Organica 15\/1999/i);
});

test('los campos variables del consentimiento permiten varias líneas sin atravesar el texto', () => {
  const preview = read('../src/pages/documentos/DocumentoPreview.jsx');
  assert.match(preview, /function ConsentField/);
  assert.match(preview, /tableLayout: 'fixed'/);
  assert.match(preview, /borderCollapse: 'collapse'/);
  assert.match(preview, /overflowWrap: 'anywhere'/);
  assert.match(preview, /wordBreak: 'break-word'/);
  assert.match(preview, /padding: '0 6px 3px'/);
  assert.doesNotMatch(preview, /<strong>PACIENTE<\/strong>[\s\S]*?border-b border-dotted/);
});

test('la impresión de la planilla aísla únicamente PlanillaDocumento', () => {
  const page = read('../src/pages/planillasAtencion/PlanillasAtencion.jsx');
  assert.match(page, /data-clinical-print[\s\S]*?<PlanillaDocumento planilla=\{selectedPlanilla\}/);
});

test('el informe espera la carga de recursos antes de abrir el diálogo de impresión', () => {
  const page = read('../src/pages/reportes/Reportes.jsx');
  assert.match(page, /win\.document\.images/);
  assert.match(page, /image\.onload = resolve/);
  assert.match(page, /win\.addEventListener\('load'/);
  assert.match(page, /if \(!win\)/);
  assert.match(page, /@page \{ size: A4 portrait; margin: 0; \}/);
});

test('los documentos PDF usan A4 y paginación por recortes sin repetir la imagen completa', () => {
  const pagination = read('../src/utils/pdfPagination.js');
  const documents = read('../src/pages/documentos/DocumentosClinicos.jsx');
  const reports = read('../src/pages/reportes/Reportes.jsx');
  const sheets = read('../src/pages/planillasAtencion/PlanillasAtencion.jsx');
  assert.match(pagination, /portrait: \[210, 297\]/);
  assert.match(pagination, /landscape: \[297, 210\]/);
  assert.match(pagination, /safePageEnd/);
  assert.match(pagination, /contentBottom/);
  for (const source of [documents, reports, sheets]) {
    assert.match(source, /format: 'a4'/);
    assert.match(source, /addCanvasToA4Pdf/);
    assert.doesNotMatch(source, /heightLeft -= pageHeight/);
  }
});

test('las hojas de vista previa usan dimensiones A4 y reglas contra cortes huérfanos', () => {
  const preview = read('../src/pages/documentos/DocumentoPreview.jsx');
  const plan = read('../src/pages/planillasAtencion/PlanillaDocumento.jsx');
  const report = read('../src/pages/reportes/Reportes.jsx');
  const styles = read('../src/styles/global.css');
  assert.match(preview, /min-h-\[297mm\][\s\S]*?max-w-\[210mm\]/);
  assert.match(plan, /min-h-\[297mm\][\s\S]*?max-w-\[210mm\]/);
  assert.match(report, /min-h-\[297mm\][\s\S]*?max-w-\[210mm\]/);
  assert.match(styles, /break-inside: avoid/);
  assert.match(styles, /orphans: 3/);
  assert.match(styles, /widows: 3/);
});

test('signos vitales no reserva altura artificial ni posiciona fecha y profesional al fondo', () => {
  const preview = read('../src/pages/documentos/DocumentoPreview.jsx');
  const signs = preview.slice(preview.indexOf('function SignosPreview'), preview.indexOf('function FarmacosPreview'));
  assert.doesNotMatch(signs, /min-h-32/);
  assert.doesNotMatch(signs, /absolute bottom-/);
  assert.match(signs, /data-print-keep className="mt-6 text-right/);
  assert.match(signs, /data-print-keep className="mb-5"/);
});

test('la historia clínica conserva en impresión las mismas medidas y tipografía de la vista previa', () => {
  const styles = read('../src/styles/global.css');
  const history = read('../src/pages/historiasClinicas/HistoriasClinicas.jsx');
  assert.match(history, /pdf-page pdf-page-1[\s\S]*?max-w-\[190mm\][\s\S]*?text-\[11px\]/);
  assert.match(styles, /\[data-historia-print\] > \.pdf-page \{[\s\S]*?width: 190mm !important;[\s\S]*?min-height: 0 !important;/);
  assert.match(styles, /@page historia-clinica \{[\s\S]*?size: A4 portrait;[\s\S]*?margin: 10mm;/);
  assert.doesNotMatch(styles, /\[data-historia-print\] > \.pdf-page \{[\s\S]*?font-size: 8\.5px/);
  assert.doesNotMatch(styles, /\[data-historia-print\] > \.pdf-page \{[\s\S]*?padding: 0 !important/);
  assert.doesNotMatch(history, /createPortal/);
  assert.equal((history.match(/<HistoriaReporte historia=\{previewHistoria\}/g) || []).length, 1);
  assert.doesNotMatch(history, /pdf-page[^"\n]*min-h-\[297mm\]/);
  assert.match(history, /data-historia-print=\{previewHistoria\?\.id \|\| undefined\}/);
  assert.doesNotMatch(history, /data-historia-print=\{previewHistoria\.id\}/);
});

test('la segunda hoja de historia cabe en A4 sin expulsar observaciones a una hoja vacia', () => {
  const history = read('../src/pages/historiasClinicas/HistoriasClinicas.jsx');
  const secondPage = history.slice(history.indexOf('pdf-page pdf-page-2'), history.indexOf('pdf-page pdf-page-3'));
  assert.match(secondPage, /px-7 py-4/);
  assert.match(secondPage, /max-h-64/);
  assert.match(secondPage, /<Area rows=\{2\}>\{condicion\.estudios_imagenologicos\}/);
  assert.match(secondPage, /<Area rows=\{2\}>\{condicion\.descripcion\}/);
  assert.match(secondPage, /<Area rows=\{4\}>\{`\$\{intervencion\.goniometria_balance_articular/);
  assert.match(secondPage, /<Area rows=\{3\}>\{intervencion\.observaciones\}/);
});

test('la historia usa solo impresion del navegador y no muestra descarga PDF directa', () => {
  const history = read('../src/pages/historiasClinicas/HistoriasClinicas.jsx');
  assert.match(history, /Imprimir \/ Guardar PDF/);
  assert.doesNotMatch(history, /Descargar PDF|downloadHistoriaPdf|historiaPrintRef/);
  assert.doesNotMatch(history, /from 'html2canvas'|from 'jspdf'/);
});

test('nombre del paciente y fecha tienen la linea inmediatamente debajo del texto', () => {
  const history = read('../src/pages/historiasClinicas/HistoriasClinicas.jsx');
  assert.match(history, /const PatientLine = \(\{ children \}\)/);
  assert.match(history, /border-b border-dotted border-slate-500 pb-1 leading-5/);
  assert.match(history, /<PatientLine><strong>Nombres y Apellidos:<\/strong>/);
  assert.match(history, /<PatientLine><strong>Fecha de Evaluacion:<\/strong>/);
});

test('la paginacion PDF conserva escala fisica y admite margenes A4 sin encoger el contenido', () => {
  const pagination = read('../src/utils/pdfPagination.js');
  assert.match(pagination, /const contentWidth = pageWidth - \(margin \* 2\)/);
  assert.match(pagination, /const contentHeight = pageHeight - \(margin \* 2\)/);
  assert.match(pagination, /sliceHeight \* contentWidth \/ canvas\.width/);
  assert.match(pagination, /page > 0 \|\| addFirstPage/);
});

test('la tabla de sesiones muestra la fecha normalizada por el backend', () => {
  const history = read('../src/pages/historiasClinicas/HistoriasClinicas.jsx');
  const evolutionForm = read('../src/pages/historiasClinicas/sections/EvolutivoSection.jsx');
  assert.match(history, /formatDate\(session\.fecha_sesion \|\| session\.fecha\)/);
  assert.match(evolutionForm, /value=\{session\.fecha_sesion \|\| session\.fecha \|\| ''\}/);
});

test('las areas con texto largo mantienen una linea punteada por cada renglon visual', () => {
  const history = read('../src/pages/historiasClinicas/HistoriasClinicas.jsx');
  assert.match(history, /data-report-area/);
  assert.match(history, /minHeight: `\$\{rows \* 24\}px`/);
  assert.match(history, /radial-gradient\(circle at 1px 23px/);
  assert.match(history, /backgroundSize: '3px 24px'/);
  assert.doesNotMatch(history, /Array\.from\(\{ length: rows \}\)/);
});
