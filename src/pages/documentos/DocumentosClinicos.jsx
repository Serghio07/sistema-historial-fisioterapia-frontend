import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Eye, FilePenLine, FileText, Plus, Printer, Save, Search, Trash2 } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { useAuth } from '../../context/AuthContext';
import { getPacientes } from '../../services/pacienteService';
import { getSesiones } from '../../services/sesionService';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import { formatDate } from '../../utils/formatDate';
import {
  createDocumentoClinico,
  deleteDocumentoClinico,
  getDatosPacienteDocumento,
  getDocumentosClinicos,
  updateDocumentoClinico
} from '../../services/documentoClinicoService';
import DocumentoPreview from './DocumentoPreview';

const today = new Date().toISOString().slice(0, 10);

const config = {
  consentimiento: {
    title: 'Consentimiento Informado',
    description: 'Genera y administra consentimientos informados vinculados a los pacientes.',
    action: 'Nuevo consentimiento',
    iconLabel: 'Consentimientos',
    empty: 'No hay consentimientos registrados.'
  },
  signos_vitales: {
    title: 'Signos Vitales',
    description: 'Registra fichas de signos vitales antes, durante y despues del procedimiento.',
    action: 'Nueva ficha',
    iconLabel: 'Fichas',
    empty: 'No hay fichas de signos vitales registradas.'
  },
  farmacos: {
    title: 'Administracion de Farmacos',
    description: 'Registra medicamentos administrados, dosis y pagos asociados.',
    action: 'Nuevo registro',
    iconLabel: 'Planilla',
    empty: 'No hay registros de farmacos.'
  }
};

const initialBase = {
  paciente_id: '',
  sesion_id: '',
  fecha: today,
  estado: 'Guardado',
  titulo: '',
  descripcion: '',
  datos: {}
};

const initialDatos = {
  consentimiento: {
    nombre_completo: '',
    edad: '',
    ci: '',
    celular: '',
    diagnostico: '',
    tratamiento: '',
    tutor_nombre: '',
    ciudad: 'La Paz',
    firma_representante: ''
  },
  signos_vitales: {
    nombre_completo: '',
    edad: '',
    ci: '',
    celular: '',
    antecedentes_patologicos: '',
    diagnostico: '',
    tratamiento: '',
    hora: '',
    responsable_nombre: '',
    observaciones_generales: '',
    pre: {},
    durante: {},
    post: {},
    observaciones: ''
  },
  farmacos: {
    fecha_fin: today,
    filas: []
  }
};

const newFarmacoRow = (paciente = null) => ({
  fecha: today,
  paciente_id: paciente?.id || '',
  paciente_nombre: paciente ? nombrePaciente(paciente) : '',
  ci: paciente?.ci || '',
  diagnostico: paciente?.referencia || '',
  diclo: false,
  dexa: false,
  com_b: false,
  dosis_3ml: false,
  dosis_5ml: false,
  dosis_10ml: false,
  monto_bs: '',
  metodo_pago: 'Efectivo',
  qr: false,
  observaciones: ''
});

const makeInitialForm = (tipo, user) => ({
  ...initialBase,
  tipo,
  titulo: config[tipo].title,
  descripcion: config[tipo].description,
  datos: {
    ...initialDatos[tipo],
    responsable_nombre: user?.nombre || '',
    filas: tipo === 'farmacos' ? [newFarmacoRow()] : undefined
  }
});

const fileName = (prefix, paciente, fecha, ext) =>
  `${prefix === 'consentimiento' ? 'consentimiento_informado' : prefix}_${nombrePaciente(paciente).replace(/\s+/g, '_') || 'paciente'}_${String(fecha || today).replaceAll('-', '-')}.${ext}`.toLowerCase();

function StageFields({ title, data = {}, onChange }) {
  const set = (key, value) => onChange({ ...data, [key]: value });
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h4 className="mb-3 text-sm font-black text-ink">{title}</h4>
      <div className="grid gap-3 md:grid-cols-4">
        <Input label="Presion arterial" value={data.presion_arterial || ''} onChange={(e) => set('presion_arterial', e.target.value)} compact />
        <Input label="Frecuencia cardiaca" value={data.frecuencia_cardiaca || ''} onChange={(e) => set('frecuencia_cardiaca', e.target.value)} compact />
        <Input label="Frecuencia respiratoria" value={data.frecuencia_respiratoria || ''} onChange={(e) => set('frecuencia_respiratoria', e.target.value)} compact />
        <Input label="SPO2" value={data.spo2 || ''} onChange={(e) => set('spo2', e.target.value)} compact />
      </div>
    </div>
  );
}

function DocumentosClinicos({ tipo }) {
  const meta = config[tipo];
  const { user, isAdmin } = useAuth();
  const previewRef = useRef(null);
  const [searchParams] = useSearchParams();
  const [pacientes, setPacientes] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [form, setForm] = useState(() => makeInitialForm(tipo, user));
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', desde: '', hasta: '', estado: '' });
  const pacienteInicialId = searchParams.get('paciente_id');

  const pacienteSeleccionado = useMemo(
    () => pacientes.find((paciente) => Number(paciente.id) === Number(form.paciente_id)),
    [pacientes, form.paciente_id]
  );

  const previewDocumento = useMemo(() => ({
    ...form,
    paciente: pacienteSeleccionado,
    creado_por: user
  }), [form, pacienteSeleccionado, user]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pacientesData, documentosData, sesionesData] = await Promise.all([
        getPacientes(),
        getDocumentosClinicos({ tipo, paciente_id: pacienteInicialId || undefined }),
        getSesiones()
      ]);
      setPacientes(pacientesData);
      setDocumentos(documentosData);
      setSesiones(sesionesData);
      if (pacienteInicialId && !form.paciente_id) {
        setForm((current) => ({ ...current, paciente_id: pacienteInicialId }));
        setTimeout(() => hydratePaciente(pacienteInicialId), 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm(makeInitialForm(tipo, user));
    setEditing(null);
    setPreview(null);
    setShowForm(false);
    load();
  }, [tipo]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateDatos = (key, value) => setForm((current) => ({ ...current, datos: { ...current.datos, [key]: value } }));

  const hydratePaciente = async (pacienteId) => {
    const paciente = pacientes.find((item) => Number(item.id) === Number(pacienteId));
    setForm((current) => ({ ...current, paciente_id: pacienteId }));
    if (!pacienteId) return;
    try {
      const data = await getDatosPacienteDocumento(pacienteId);
      const sugeridos = data.sugeridos || {};
      setForm((current) => {
        if (tipo === 'farmacos') {
          const rows = current.datos.filas?.length ? current.datos.filas : [newFarmacoRow(paciente)];
          return {
            ...current,
            paciente_id: pacienteId,
            datos: {
              ...current.datos,
              filas: rows.map((row, index) => index === 0 ? { ...row, ...newFarmacoRow(data.paciente), diagnostico: sugeridos.diagnostico } : row)
            }
          };
        }
        return {
          ...current,
          paciente_id: pacienteId,
          datos: {
            ...current.datos,
            nombre_completo: current.datos.nombre_completo || sugeridos.nombre_completo,
            edad: current.datos.edad || sugeridos.edad,
            ci: current.datos.ci || sugeridos.ci,
            celular: current.datos.celular || sugeridos.celular,
            diagnostico: current.datos.diagnostico || sugeridos.diagnostico,
            tratamiento: current.datos.tratamiento || sugeridos.tratamiento,
            antecedentes_patologicos: current.datos.antecedentes_patologicos || sugeridos.antecedentes_patologicos,
            observaciones: current.datos.observaciones || sugeridos.observaciones_clinicas,
            responsable_nombre: current.datos.responsable_nombre || user?.nombre || ''
          }
        };
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const validate = () => {
    if (!form.paciente_id && tipo !== 'farmacos') return 'Selecciona un paciente.';
    if (!form.fecha) return 'Registra la fecha.';
    if (tipo === 'consentimiento') {
      if (!form.datos.edad) return 'Registra la edad.';
      if (!form.datos.ci) return 'Registra el CI.';
      if (!form.datos.diagnostico) return 'Registra el diagnostico.';
      if (!form.datos.tratamiento) return 'Registra el tratamiento.';
      if (Number(form.datos.edad || 0) < 18 && !form.datos.tutor_nombre) return 'Registra el tutor o padre de familia.';
    }
    if (tipo === 'farmacos' && !form.datos.filas?.length) return 'Agrega al menos una fila.';
    return '';
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const validation = validate();
    setError(validation);
    if (validation) return;

    try {
      const payload = cleanPayload({
        ...form,
        paciente_id: form.paciente_id || form.datos.filas?.[0]?.paciente_id,
        datos: tipo === 'consentimiento'
          ? {
              nombre_completo: form.datos.nombre_completo,
              edad: form.datos.edad,
              ci: form.datos.ci,
              celular: form.datos.celular,
              tutor_nombre: form.datos.tutor_nombre,
              diagnostico: form.datos.diagnostico,
              tratamiento: form.datos.tratamiento,
              ciudad: form.datos.ciudad || 'La Paz',
              firma_representante: form.datos.firma_representante
            }
          : form.datos
      });
      editing ? await updateDocumentoClinico(editing, payload) : await createDocumentoClinico(payload);
      setMessage('Registro guardado correctamente.');
      setShowForm(false);
      setEditing(null);
      setForm(makeInitialForm(tipo, user));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startCreate = () => {
    setEditing(null);
    setForm(makeInitialForm(tipo, user));
    setShowForm(true);
  };

  const editDocumento = (documento) => {
    setEditing(documento.id);
    setForm({
      ...makeInitialForm(tipo, user),
      ...documento,
      paciente_id: documento.paciente_id || documento.paciente?.id || '',
      datos: { ...makeInitialForm(tipo, user).datos, ...(documento.datos || {}) }
    });
    setPreview(null);
    setShowForm(true);
  };

  const filtered = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    return documentos.filter((documento) => {
      const text = `${nombrePaciente(documento.paciente)} ${documento.datos?.ci || ''} ${documento.datos?.diagnostico || ''} ${documento.estado || ''}`.toLowerCase();
      if (term && !text.includes(term)) return false;
      if (filters.desde && documento.fecha < filters.desde) return false;
      if (filters.hasta && documento.fecha > filters.hasta) return false;
      if (filters.estado && documento.estado !== filters.estado) return false;
      return true;
    });
  }, [documentos, filters]);

  const renderDocumentForExport = async (documento) => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-10000px';
    wrapper.style.top = '0';
    wrapper.style.background = '#fff';
    document.body.appendChild(wrapper);
    const rootElement = document.createElement('div');
    wrapper.appendChild(rootElement);
    const root = createRoot(rootElement);
    root.render(<DocumentoPreview documento={documento} />);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { wrapper, rootElement, root };
  };

  const downloadPdf = async (documento = previewDocumento) => {
    const { wrapper, rootElement, root } = await renderDocumentForExport(documento);
    const canvas = await html2canvas(rootElement.firstElementChild, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(fileName(tipo, documento.paciente, documento.fecha, 'pdf'));
    root.unmount();
    document.body.removeChild(wrapper);
  };

  const downloadWord = (documento = previewDocumento) => {
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${previewRef.current?.innerHTML || ''}</body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName(tipo, documento.paciente, documento.fecha, 'doc');
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Administracion de Farmacos');
    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value = 'ADMINISTRACION DE FARMACOS';
    sheet.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FFD9480F' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.addRow([]);
    sheet.addRow(['FECHA', 'PACIENTE', 'DICLO', 'DEXA', 'COM B', '3ml', '5ml', '10ml', 'Bs.', 'Qr']);
    (previewDocumento.datos.filas || []).forEach((fila) => {
      sheet.addRow([fila.fecha, fila.paciente_nombre, fila.diclo ? 'X' : '', fila.dexa ? 'X' : '', fila.com_b ? 'X' : '', fila.dosis_3ml ? 'X' : '', fila.dosis_5ml ? 'X' : '', fila.dosis_10ml ? 'X' : '', Number(fila.monto_bs || 0), fila.qr || fila.metodo_pago === 'QR' ? 'X' : '']);
    });
    const header = sheet.getRow(3);
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8A00' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber < 4) return;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: colNumber === 2 ? 'left' : 'center' };
        cell.border = { top: { style: 'thin', color: { argb: 'FFF4A261' } }, left: { style: 'thin', color: { argb: 'FFF4A261' } }, bottom: { style: 'thin', color: { argb: 'FFF4A261' } }, right: { style: 'thin', color: { argb: 'FFF4A261' } } };
        if (colNumber >= 3 && colNumber <= 5) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4D6' } };
        if (colNumber >= 6) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF7EA' } };
      });
    });
    sheet.columns = [
      { width: 14 },
      { width: 34 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 12 },
      { width: 10 }
    ];
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `administracion_farmacos_${today}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printDocumento = (documento) => {
    setPreview(documento);
    setTimeout(() => window.print(), 100);
  };

  const updateFarmacoRow = (index, key, value) => {
    const filas = (form.datos.filas || []).map((fila, current) => {
      if (current !== index) return fila;
      const next = { ...fila, [key]: value };
      if (key === 'qr') next.metodo_pago = value ? 'QR' : 'Efectivo';
      if (key === 'metodo_pago') next.qr = value === 'QR';
      return next;
    });
    updateDatos('filas', filas);
  };

  const selectPacienteFila = (index, pacienteId) => {
    const paciente = pacientes.find((item) => Number(item.id) === Number(pacienteId));
    updateFarmacoRow(index, 'paciente_id', pacienteId);
    const filas = (form.datos.filas || []).map((fila, current) => current === index ? {
      ...fila,
      paciente_id: pacienteId,
      paciente_nombre: paciente ? nombrePaciente(paciente) : '',
      ci: paciente?.ci || '',
      diagnostico: paciente?.referencia || ''
    } : fila);
    updateDatos('filas', filas);
    if (index === 0) update('paciente_id', pacienteId);
  };

  const addFarmacoRow = () => updateDatos('filas', [...(form.datos.filas || []), newFarmacoRow()]);
  const removeFarmacoRow = (index) => updateDatos('filas', form.datos.filas.filter((_, current) => current !== index));

  return (
    <section className="grid gap-4">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-3 bg-gradient-to-r from-brand-900 to-brand-600 p-4 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Documentos</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">{meta.title}</h2>
            <span className="mt-2 block text-sm text-brand-50">{meta.description}</span>
          </div>
          <FileText size={46} className="self-center text-brand-50" />
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-ink">{meta.iconLabel} registrados</h3>
            <p className="text-sm text-slate-500">Registros vinculados al historial del paciente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tipo === 'farmacos' && (
              <Button variant="ghost" onClick={addFarmacoRow}>
                <Plus size={17} />
                Agregar fila
              </Button>
            )}
            <Button onClick={startCreate}>
              <Plus size={17} />
              {meta.action}
            </Button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_160px_160px_160px]">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Search size={18} className="text-slate-400" />
            <input className="w-full border-0 p-0 text-sm focus:ring-0" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Buscar por paciente, CI o diagnostico" />
          </label>
          <Input label="" type="date" value={filters.desde} onChange={(e) => setFilters({ ...filters, desde: e.target.value })} compact />
          <Input label="" type="date" value={filters.hasta} onChange={(e) => setFilters({ ...filters, hasta: e.target.value })} compact />
          <Input label="" value={filters.estado} onChange={(e) => setFilters({ ...filters, estado: e.target.value })} compact options={[{ value: '', label: 'Todos' }, { value: 'Borrador', label: 'Borrador' }, { value: 'Guardado', label: 'Guardado' }, { value: 'Finalizado', label: 'Finalizado' }, { value: 'Anulado', label: 'Anulado' }]} />
        </div>

        <Table
          columns={tipo === 'farmacos' ? ['Fecha', 'Paciente', 'Medicamentos', 'Monto', 'Responsable', 'Estado', 'Acciones'] : ['Fecha', 'Paciente', 'CI', 'Diagnostico', 'Responsable', 'Estado', 'Acciones']}
          rows={filtered.map((documento) => {
            const filas = documento.datos?.filas || [];
            const medicamentos = filas.flatMap((fila) => [fila.diclo && 'Diclo', fila.dexa && 'Dexa', fila.com_b && 'Com B'].filter(Boolean)).join(', ');
            const monto = filas.reduce((sum, fila) => sum + Number(fila.monto_bs || 0), 0);
            const commonActions = (
              <div className="flex flex-wrap gap-2">
                <ActionButton label="Vista previa" icon={Eye} tone="view" onClick={() => setPreview(documento)} />
                <ActionButton label="Editar" icon={FilePenLine} tone="edit" onClick={() => editDocumento(documento)} />
                <ActionButton label="Imprimir" icon={Printer} tone="print" onClick={() => printDocumento(documento)} />
                {tipo !== 'farmacos' && <ActionButton label="Descargar PDF" icon={Download} tone="download" onClick={() => downloadPdf(documento)} />}
                {isAdmin && <ActionButton label="Eliminar" icon={Trash2} tone="delete" onClick={() => deleteDocumentoClinico(documento.id).then(load)} />}
              </div>
            );
            if (tipo === 'farmacos') {
              return [formatDate(documento.fecha), nombrePaciente(documento.paciente), medicamentos || 'Sin medicamentos', `Bs. ${monto.toFixed(2)}`, documento.creado_por?.nombre || '-', documento.estado, commonActions];
            }
            return [formatDate(documento.fecha), nombrePaciente(documento.paciente), documento.datos?.ci || documento.paciente?.ci || '-', documento.datos?.diagnostico || '-', documento.creado_por?.nombre || '-', documento.estado, commonActions];
          })}
          empty={meta.empty}
        />
      </div>

      <Modal open={showForm} title={editing ? `Editar ${meta.title}` : meta.action} onClose={() => setShowForm(false)} size="lg">
        <form onSubmit={submit} className="grid max-h-[74vh] gap-4 overflow-y-auto pr-1">
          {tipo === 'consentimiento' ? (
            <div className="form-grid">
              <Input label="Paciente" value={form.paciente_id} onChange={(e) => hydratePaciente(e.target.value)} options={[{ value: '', label: 'Seleccionar paciente' }, ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))]} />
              <Input label="Fecha" type="date" value={form.fecha} onChange={(e) => update('fecha', e.target.value)} disabled={!isAdmin} />
            </div>
          ) : (
            <div className="form-grid">
              {tipo !== 'farmacos' && (
                <Input label="Paciente" value={form.paciente_id} onChange={(e) => hydratePaciente(e.target.value)} options={[{ value: '', label: 'Seleccionar paciente' }, ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))]} />
              )}
              <Input label="Fecha" type="date" value={form.fecha} onChange={(e) => update('fecha', e.target.value)} />
              <Input label="Estado" value={form.estado} onChange={(e) => update('estado', e.target.value)} options={[{ value: 'Borrador', label: 'Borrador' }, { value: 'Guardado', label: 'Guardado' }, { value: 'Finalizado', label: 'Finalizado' }, { value: 'Anulado', label: 'Anulado' }]} />
              <Input label="Sesion diaria vinculada" value={form.sesion_id || ''} onChange={(e) => update('sesion_id', e.target.value)} options={[{ value: '', label: 'Sin sesion' }, ...sesiones.filter((sesion) => !form.paciente_id || Number(sesion.paciente_id) === Number(form.paciente_id)).map((sesion) => ({ value: sesion.id, label: `${formatDate(sesion.fecha)} - ${nombrePaciente(sesion.paciente)}` }))]} />
            </div>
          )}

          {tipo === 'consentimiento' && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 border-b border-slate-200 pb-3">
                <h3 className="text-lg font-black text-ink">Declaracion de Consentimiento Informado</h3>
                <p className="text-sm text-slate-500">Solo completa los campos variables. El texto institucional queda fijo para impresion.</p>
              </div>
              <div className="grid gap-3">
                <div className="form-grid">
                  <Input label="Paciente" value={form.datos.nombre_completo || ''} onChange={(e) => updateDatos('nombre_completo', e.target.value)} />
                  <Input label="Edad" value={form.datos.edad || ''} onChange={(e) => updateDatos('edad', e.target.value)} />
                  <Input label="CI" value={form.datos.ci || ''} onChange={(e) => updateDatos('ci', e.target.value)} />
                  <Input label="Tutor o Padre de familia" value={form.datos.tutor_nombre || ''} onChange={(e) => updateDatos('tutor_nombre', e.target.value)} />
                  <Input label="Diagnostico" value={form.datos.diagnostico || ''} onChange={(e) => updateDatos('diagnostico', e.target.value)} multiline />
                  <Input label="Tratamiento" value={form.datos.tratamiento || ''} onChange={(e) => updateDatos('tratamiento', e.target.value)} multiline />
                  <Input label="Ciudad" value={form.datos.ciudad || 'La Paz'} onChange={(e) => updateDatos('ciudad', e.target.value)} />
                  <Input label="Firma representante legal" value={form.datos.firma_representante || ''} onChange={(e) => updateDatos('firma_representante', e.target.value)} />
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-slate-700">
                  Texto legal institucional fijo. Se mostrara completo en la vista previa, PDF, Word e impresion.
                </div>
              </div>
            </div>
          )}

          {tipo === 'signos_vitales' && (
            <div className="grid gap-3">
              <div className="form-grid">
                <Input label="Nombre completo" value={form.datos.nombre_completo || ''} onChange={(e) => updateDatos('nombre_completo', e.target.value)} />
                <Input label="Edad" value={form.datos.edad || ''} onChange={(e) => updateDatos('edad', e.target.value)} />
                <Input label="CI" value={form.datos.ci || ''} onChange={(e) => updateDatos('ci', e.target.value)} />
                <Input label="Celular" value={form.datos.celular || ''} onChange={(e) => updateDatos('celular', e.target.value)} />
                <Input label="Antecedentes patologicos" value={form.datos.antecedentes_patologicos || ''} onChange={(e) => updateDatos('antecedentes_patologicos', e.target.value)} multiline />
                <Input label="Diagnostico actual" value={form.datos.diagnostico || ''} onChange={(e) => updateDatos('diagnostico', e.target.value)} multiline />
                <Input label="Hora" type="time" value={form.datos.hora || ''} onChange={(e) => updateDatos('hora', e.target.value)} />
                <Input label="Responsable" value={form.datos.responsable_nombre || ''} onChange={(e) => updateDatos('responsable_nombre', e.target.value)} />
              </div>
              <StageFields title="Pre procedimiento" data={form.datos.pre} onChange={(value) => updateDatos('pre', value)} />
              <StageFields title="Durante procedimiento" data={form.datos.durante} onChange={(value) => updateDatos('durante', value)} />
              <StageFields title="Post procedimiento" data={form.datos.post} onChange={(value) => updateDatos('post', value)} />
              <Input label="Observaciones" value={form.datos.observaciones || ''} onChange={(e) => updateDatos('observaciones', e.target.value)} multiline />
            </div>
          )}

          {tipo === 'farmacos' && (
            <div className="grid gap-3">
              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={addFarmacoRow}>
                  <Plus size={17} />
                  Agregar fila
                </Button>
              </div>
              {(form.datos.filas || []).map((fila, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 lg:grid-cols-[130px_minmax(180px,1fr)_repeat(7,70px)_100px_120px_auto]">
                    <Input label="Fecha" type="date" value={fila.fecha || today} onChange={(e) => updateFarmacoRow(index, 'fecha', e.target.value)} compact />
                    <Input label="Paciente" value={fila.paciente_id || ''} onChange={(e) => selectPacienteFila(index, e.target.value)} compact options={[{ value: '', label: 'Paciente' }, ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))]} />
                    {[
                      ['diclo', 'Diclo'],
                      ['dexa', 'Dexa'],
                      ['com_b', 'Com B'],
                      ['dosis_3ml', '3 ml'],
                      ['dosis_5ml', '5 ml'],
                      ['dosis_10ml', '10 ml'],
                      ['qr', 'QR']
                    ].map(([key, label]) => (
                      <label key={key} className="grid content-end gap-1 text-xs font-bold text-slate-700">
                        <span>{label}</span>
                        <input type="checkbox" className="h-9 w-9 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={Boolean(fila[key])} onChange={(e) => updateFarmacoRow(index, key, e.target.checked)} />
                      </label>
                    ))}
                    <Input label="Bs." type="number" min="0" step="0.01" value={fila.monto_bs || ''} onChange={(e) => updateFarmacoRow(index, 'monto_bs', e.target.value)} compact />
                    <Input label="Metodo" value={fila.metodo_pago || 'Efectivo'} onChange={(e) => updateFarmacoRow(index, 'metodo_pago', e.target.value)} compact options={[{ value: 'Efectivo', label: 'Efectivo' }, { value: 'QR', label: 'QR' }, { value: 'Transferencia', label: 'Transferencia' }, { value: 'Otro', label: 'Otro' }]} />
                    <div className="flex items-end">
                      <ActionButton label="Eliminar fila" icon={Trash2} tone="delete" onClick={() => removeFarmacoRow(index)} disabled={form.datos.filas.length === 1} />
                    </div>
                  </div>
                  <Input label="Observaciones" value={fila.observaciones || ''} onChange={(e) => updateFarmacoRow(index, 'observaciones', e.target.value)} compact className="mt-3" />
                </div>
              ))}
            </div>
          )}

          <div className="sticky-actions justify-between">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setPreview(previewDocumento)}>
                <Eye size={17} />
                Vista previa
              </Button>
              {tipo === 'farmacos' && (
                <Button type="button" variant="ghost" onClick={exportExcel}>
                  <Download size={17} />
                  Exportar Excel
                </Button>
              )}
              <Button type="submit">
                <Save size={17} />
                Guardar
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(preview)} title={`Vista previa - ${meta.title}`} onClose={() => setPreview(null)} size="lg">
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => editDocumento(preview)}>
            <FilePenLine size={17} />
            Editar
          </Button>
          {tipo === 'farmacos' ? (
            <Button variant="ghost" onClick={exportExcel}>
              <Download size={17} />
              Exportar Excel
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => downloadPdf(preview)}>
                <Download size={17} />
                PDF
              </Button>
              <Button variant="ghost" onClick={() => downloadWord(preview)}>
                <Download size={17} />
                Word
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={17} />
            Imprimir
          </Button>
        </div>
        <div ref={previewRef} className="max-h-[75vh] overflow-auto bg-slate-100 p-4">
          <DocumentoPreview documento={preview} />
        </div>
      </Modal>
    </section>
  );
}

export default DocumentosClinicos;
