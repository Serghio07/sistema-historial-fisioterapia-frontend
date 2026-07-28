import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Ban, CalendarDays, ChevronLeft, ChevronRight, Coins, Download, Eye, FilePenLine, FileText, Pill, Plus, Printer, Save, Search, Syringe, Trash2, Users } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { PatientIdentity } from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { getPacientes } from '../../services/pacienteService';
import { getSesiones } from '../../services/sesionService';
import { getHistoriasClinicas } from '../../services/historiaClinicaService';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import { formatDate } from '../../utils/formatDate';
import { matchesSearch } from '../../utils/search';
import { boliviaDate } from '../../utils/boliviaDateTime';
import {
  createDocumentoClinico,
  deleteDocumentoClinico,
  getDatosPacienteDocumento,
  getDocumentosClinicos,
  updateDocumentoClinico
} from '../../services/documentoClinicoService';
import DocumentoPreview from './DocumentoPreview';

const today = boliviaDate();

const upperText = (value) => (typeof value === 'string' ? value.toLocaleUpperCase('es-BO') : value);
const isSesionActiva = (sesion) => !sesion?.anulada && String(sesion?.estado || '').toLowerCase() !== 'anulada';

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
    title: 'Administración de fármacos',
    description: 'Consulta y seguimiento de los fármacos administrados según la evolución clínica de cada paciente.',
    action: 'Registrar administración externa',
    iconLabel: 'Planilla',
    empty: 'No hay registros de farmacos.'
  }
};

const initialBase = {
  paciente_id: '',
  historia_clinica_id: '',
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
    ciudad: 'LA PAZ',
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

const normalizeConsentimientoDatos = (datos = {}) => ({
  ...datos,
  nombre_completo: upperText(datos.nombre_completo || ''),
  ci: upperText(datos.ci || ''),
  celular: upperText(datos.celular || ''),
  diagnostico: upperText(datos.diagnostico || ''),
  tratamiento: upperText(datos.tratamiento || ''),
  tutor_nombre: upperText(datos.tutor_nombre || ''),
  ciudad: upperText(datos.ciudad || 'LA PAZ'),
  firma_representante: upperText(datos.firma_representante || '')
});

const newFarmacoRow = (paciente = null) => ({
  origen: 'externa',
  fecha: today,
  paciente_id: paciente?.id || '',
  paciente_nombre: paciente ? nombrePaciente(paciente) : '',
  ci: paciente?.ci || '',
  telefono: paciente?.telefono || '',
  historia_clinica_id: '',
  historia_label: '',
  sesion_id: '',
  profesional: '',
  diagnostico: paciente?.referencia || '',
  diclo: false,
  dexa: false,
  com_b: false,
  otro: false,
  otro_farmaco: '',
  dosis_3ml: false,
  dosis_5ml: false,
  dosis_10ml: false,
  dosis_otro: '',
  via_administracion: 'Intramuscular',
  motivo: '',
  monto_bs: '',
  estado_pago: 'Pagado',
  saldo_bs: '',
  metodo_pago: 'Efectivo',
  qr: false,
  observaciones: '',
  productos: [emptyProducto()],
  monto_pagado: '',
  reaccion_adversa: false,
  detalle_reaccion: '',
  estado: 'Guardado',
  anulado: false,
  motivo_anulacion: ''
});

const makeInitialForm = (tipo, user) => ({
  ...initialBase,
  tipo,
  titulo: config[tipo].title,
  descripcion: config[tipo].description,
  datos: {
    ...initialDatos[tipo],
    responsable_nombre: user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || '',
    filas: tipo === 'farmacos' ? [{ ...newFarmacoRow(), profesional: user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || '' }] : undefined
  }
});

const fileName = (prefix, paciente, fecha, ext) =>
  `${prefix === 'consentimiento' ? 'consentimiento_informado' : prefix}_${nombrePaciente(paciente).replace(/\s+/g, '_') || 'paciente'}_${String(fecha || today).replaceAll('-', '-')}.${ext}`.toLowerCase();

const parseLocalDate = (value) => {
  const [year, month, day] = String(value || today).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (value = today) => {
  const date = parseLocalDate(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return toDateInput(date);
};

const addDays = (value, days) => {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
};

const farmacoWeekDays = (weekStart) => ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((label, index) => {
  const fecha = addDays(weekStart, index);
  return { label, fecha, day: String(parseLocalDate(fecha).getDate()).padStart(2, '0') };
});

const isFarmacoAnulado = (row = {}, documento = {}) =>
  Boolean(row.anulado) || String(row.estado || documento.estado || '').toLowerCase() === 'anulado' || Boolean(documento.eliminado);

const farmacoDose = (row = {}) => {
  if (row.productos?.length === 1) return row.productos[0].dosis || row.productos[0].volumen || '';
  if (row.dosis_otro) return `${row.dosis_otro} ml`;
  if (row.dosis_10ml) return '10 ml';
  if (row.dosis_5ml) return '5 ml';
  if (row.dosis_3ml) return '3 ml';
  return '';
};

const farmacoLabels = (row = {}) => row.productos?.length
  ? row.productos.map((producto) => producto.producto === 'Otro' ? producto.nombre_otro || 'Otro' : producto.producto).filter(Boolean)
  : [
  row.diclo && 'Diclofenaco',
  row.dexa && 'Dexametasona',
  row.com_b && 'Complejo B',
  (row.otro || row.otro_farmaco) && (row.otro_farmaco ? `Otro: ${row.otro_farmaco}` : 'Otro')
].filter(Boolean);

const emptyProducto = () => ({ producto: '', nombre_otro: '', presentacion: '', dosis: '', volumen: '', cantidad: 1, via: 'Intramuscular', costo: '' });

const legacyProductos = (row = {}) => {
  if (row.productos?.length) return row.productos;
  return farmacoLabels(row).map((producto) => ({ ...emptyProducto(), producto: producto.startsWith('Otro:') ? 'Otro' : producto, nombre_otro: producto.startsWith('Otro:') ? producto.replace('Otro:', '').trim() : '', volumen: farmacoDose(row), via: row.via_administracion || 'Intramuscular', costo: row.monto_bs || '' }));
};

const historiaLabel = (historia) => {
  if (!historia) return '';
  const fecha = historia.fecha_evaluacion ? formatDate(historia.fecha_evaluacion) : '';
  const zona = historia.condicion_actual?.zona_cuerpo || historia.motivo_consulta || historia.diagnostico_medico || '';
  return [fecha, zona].filter(Boolean).join(' - ') || 'Historia clínica';
};

const money = (value) => Number(value || 0).toFixed(2);

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
  const location = useLocation();
  const navigate = useNavigate();
  const meta = config[tipo];
  const { user, isAdmin } = useAuth();
  const previewRef = useRef(null);
  const [searchParams] = useSearchParams();
  const [pacientes, setPacientes] = useState([]);
  const [historias, setHistorias] = useState([]);
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
  const [farmacoFilters, setFarmacoFilters] = useState({ semana: startOfWeek(today), q: '', estado: '', paciente_id: '', farmaco: '', profesional: '', via: '' });
  const [farmacoDetail, setFarmacoDetail] = useState(null);
  const [annulTarget, setAnnulTarget] = useState(null);
  const [annulReason, setAnnulReason] = useState('');
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

  const historiasPorPaciente = useMemo(() => {
    const map = new Map();
    historias.forEach((historia) => {
      const key = Number(historia.paciente_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(historia);
    });
    return map;
  }, [historias]);

  const sesionesActivas = useMemo(() => sesiones.filter(isSesionActiva), [sesiones]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pacientesData, documentosData, sesionesData, historiasData] = await Promise.all([
        getPacientes(),
        getDocumentosClinicos({ tipo, paciente_id: pacienteInicialId || undefined, incluir_anulados: tipo === 'farmacos' || undefined }),
        getSesiones(),
        getHistoriasClinicas()
      ]);
      setPacientes(pacientesData);
      setDocumentos(documentosData);
      setSesiones(sesionesData);
      setHistorias(historiasData);
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

  useEffect(() => {
    const documentoId = location.state?.documentoId;
    if (!documentoId || !documentos.length) return;
    const documento = documentos.find((item) => Number(item.id) === Number(documentoId));
    if (documento) setPreview(documento);
  }, [documentos, location.state?.documentoId]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateDatos = (key, value) => setForm((current) => ({
    ...current,
    datos: {
      ...current.datos,
      [key]: tipo === 'consentimiento' ? upperText(value) : value
    }
  }));

  const historiasPacienteActual = historias
    .filter((historia) => Number(historia.paciente_id || historia.paciente?.id) === Number(form.paciente_id))
    .sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || Number(b.id || 0) - Number(a.id || 0));

  const selectHistoriaDocumento = (historiaId) => {
    const historia = historias.find((item) => Number(item.id) === Number(historiaId));
    setForm((current) => ({
      ...current,
      historia_clinica_id: historiaId,
      sesion_id: '',
      datos: historia ? {
        ...current.datos,
        diagnostico: upperText(historia.diagnostico_medico || historia.evaluacion_final?.diagnostico_kinesico_cif || ''),
        tratamiento: upperText(historia.evaluacion_final?.plan_tratamiento || ''),
        antecedentes_patologicos: upperText(historia.antecedente_personal?.antecedentes_patologicos || historia.antecedente_personal?.descripcion || current.datos.antecedentes_patologicos || '')
      } : current.datos
    }));
  };

  const hydratePaciente = async (pacienteId) => {
    const paciente = pacientes.find((item) => Number(item.id) === Number(pacienteId));
    const historiasDelPaciente = historias.filter((historia) => Number(historia.paciente_id || historia.paciente?.id) === Number(pacienteId));
    const historiaUnica = historiasDelPaciente.length === 1 ? historiasDelPaciente[0] : null;
    setForm((current) => ({ ...current, paciente_id: pacienteId, historia_clinica_id: historiaUnica?.id || '', sesion_id: '' }));
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
              filas: rows.map((row, index) => index === 0 ? { ...row, ...newFarmacoRow(data.paciente), profesional: row.profesional || user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || '', diagnostico: sugeridos.diagnostico } : row)
            }
          };
        }
        return {
          ...current,
          paciente_id: pacienteId,
          datos: {
            ...current.datos,
            nombre_completo: upperText(current.datos.nombre_completo || sugeridos.nombre_completo),
            edad: current.datos.edad || sugeridos.edad,
            ci: upperText(current.datos.ci || sugeridos.ci),
            celular: upperText(current.datos.celular || sugeridos.celular),
            diagnostico: upperText(historiaUnica?.diagnostico_medico || historiaUnica?.evaluacion_final?.diagnostico_kinesico_cif || (historiasDelPaciente.length > 1 ? '' : sugeridos.diagnostico)),
            tratamiento: upperText(historiaUnica?.evaluacion_final?.plan_tratamiento || (historiasDelPaciente.length > 1 ? '' : sugeridos.tratamiento)),
            antecedentes_patologicos: upperText(current.datos.antecedentes_patologicos || sugeridos.antecedentes_patologicos),
            observaciones: upperText(current.datos.observaciones || sugeridos.observaciones_clinicas),
            responsable_nombre: current.datos.responsable_nombre || user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || ''
          }
        };
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const validate = () => {
    if (!form.paciente_id && tipo !== 'farmacos') return 'Selecciona un paciente.';
    if (tipo !== 'farmacos' && historiasPacienteActual.length > 1 && !form.historia_clinica_id) return 'Selecciona una historia clínica.';
    if (!form.fecha) return 'Registra la fecha.';
    if (tipo === 'consentimiento') {
      if (!form.datos.edad) return 'Registra la edad.';
      if (!form.datos.ci) return 'Registra el CI.';
      if (!form.datos.diagnostico) return 'Registra el diagnostico.';
      if (!form.datos.tratamiento) return 'Registra el tratamiento.';
      if (Number(form.datos.edad || 0) < 18 && !form.datos.tutor_nombre) return 'Registra el tutor o padre de familia.';
    }
    if (tipo === 'farmacos') {
      const fila = form.datos.filas?.[0];
      if (!fila?.paciente_id) return 'Selecciona un paciente o una sesión diaria.';
      if (!fila?.historia_clinica_id) return 'Selecciona la historia clínica.';
      if (fila.origen === 'sesion' && !fila.sesion_id) return 'Selecciona la sesión diaria vinculada.';
      const productos = legacyProductos(fila).filter((producto) => producto.producto);
      if (!productos.length) return 'Agrega al menos un fármaco o insumo.';
      if (productos.some((producto) => producto.producto === 'Otro' && !String(producto.nombre_otro || '').trim())) return 'Especifica el nombre del fármaco.';
      if (productos.some((producto) => !String(producto.dosis || producto.volumen || producto.presentacion || '').trim())) return 'Registra la presentación o dosis de cada fármaco.';
      if (productos.some((producto) => !producto.via || !(Number(producto.cantidad) > 0))) return 'Cada fármaco debe tener vía y cantidad mayor a cero.';
      if (!String(fila.motivo || '').trim()) return 'Registra el motivo clínico.';
    }
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
        fecha: tipo === 'farmacos' ? form.datos.filas?.[0]?.fecha || form.fecha : form.fecha,
        sesion_id: tipo === 'farmacos' ? form.datos.filas?.[0]?.sesion_id || form.sesion_id : form.sesion_id,
        datos: tipo === 'consentimiento'
          ? {
              nombre_completo: upperText(form.datos.nombre_completo),
              edad: form.datos.edad,
              ci: upperText(form.datos.ci),
              celular: upperText(form.datos.celular),
              tutor_nombre: upperText(form.datos.tutor_nombre),
              diagnostico: upperText(form.datos.diagnostico),
              tratamiento: upperText(form.datos.tratamiento),
              ciudad: upperText(form.datos.ciudad || 'LA PAZ'),
              firma_representante: upperText(form.datos.firma_representante)
            }
          : form.datos
      });
      editing ? await updateDocumentoClinico(editing, payload) : await createDocumentoClinico(payload);
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
    const baseDatos = { ...makeInitialForm(tipo, user).datos, ...(documento.datos || {}) };
    setEditing(documento.id);
    setForm({
      ...makeInitialForm(tipo, user),
      ...documento,
      paciente_id: documento.paciente_id || documento.paciente?.id || '',
      datos: tipo === 'consentimiento' ? normalizeConsentimientoDatos(baseDatos) : baseDatos
    });
    setPreview(null);
    setShowForm(true);
  };

  const filtered = useMemo(() => {
    return documentos.filter((documento) => {
      const text = `${nombrePaciente(documento.paciente)} ${documento.datos?.ci || ''} ${documento.datos?.diagnostico || ''} ${documento.estado || ''}`;
      if (!matchesSearch(text, filters.q)) return false;
      if (filters.desde && documento.fecha < filters.desde) return false;
      if (filters.hasta && documento.fecha > filters.hasta) return false;
      if (filters.estado && documento.estado !== filters.estado) return false;
      return true;
    });
  }, [documentos, filters]);

  const farmacoRows = useMemo(() => {
    const rows = [];
    documentos.forEach((documento) => {
      const filas = Array.isArray(documento.datos?.filas) ? documento.datos.filas : [];
      filas.forEach((fila, rowIndex) => {
        const paciente = pacientes.find((item) => Number(item.id) === Number(fila.paciente_id || documento.paciente_id)) || documento.paciente;
        const historia = historias.find((item) => Number(item.id) === Number(fila.historia_clinica_id));
        const sesion = sesiones.find((item) => Number(item.id) === Number(fila.sesion_id || documento.sesion_id));
        const fecha = fila.fecha || documento.fecha;
        const labels = farmacoLabels(fila);
        const anulado = isFarmacoAnulado(fila, documento);
        rows.push({
          id: `${documento.id}-${rowIndex}`,
          documento,
          rowIndex,
          fecha,
          paciente,
          historia,
          sesion,
          data: fila,
          anulado,
          labels,
          searchText: [
            nombrePaciente(paciente),
            fila.paciente_nombre,
            fila.ci,
            paciente?.ci,
            paciente?.telefono,
            fila.telefono,
            fila.diagnostico,
            fila.historia_label,
            historiaLabel(historia),
            labels.join(' '),
            fila.metodo_pago,
            fila.estado,
            documento.estado
          ].filter(Boolean).join(' ')
        });
      });
    });
    return rows;
  }, [documentos, pacientes, historias, sesiones]);

  const farmacoVisibleRows = useMemo(() => {
    const weekStart = farmacoFilters.semana;
    const weekEnd = addDays(weekStart, 6);
    return farmacoRows.filter((row) => {
      if (row.fecha < weekStart || row.fecha > weekEnd) return false;
      if (!matchesSearch(row.searchText, farmacoFilters.q)) return false;
      if (farmacoFilters.paciente_id && Number(row.data.paciente_id || row.documento.paciente_id) !== Number(farmacoFilters.paciente_id)) return false;
      if (farmacoFilters.farmaco && !row.labels.some((label) => label.toLowerCase().includes(farmacoFilters.farmaco.toLowerCase()))) return false;
      if (farmacoFilters.profesional && !String(row.data.profesional || row.documento.creado_por?.nombre || '').toLowerCase().includes(farmacoFilters.profesional.toLowerCase())) return false;
      if (farmacoFilters.via && !String(row.data.via_administracion || row.data.productos?.[0]?.via || '').toLowerCase().includes(farmacoFilters.via.toLowerCase())) return false;
      if (farmacoFilters.estado === 'Anulado') return row.anulado;
      if (farmacoFilters.estado && String(row.data.estado || row.documento.estado || '').toLowerCase() !== farmacoFilters.estado.toLowerCase()) return false;
      return !row.anulado;
    });
  }, [farmacoRows, farmacoFilters]);

  const farmacoGroups = useMemo(() => {
    const map = new Map();
    farmacoVisibleRows.forEach((row) => {
      const pacienteId = row.data.paciente_id || row.documento.paciente_id || 'sin-paciente';
      const historiaId = row.data.historia_clinica_id || 'sin-historia';
      const atencionId = row.data.sesion_id || row.documento.sesion_id || `externa-${row.documento.id}`;
      const key = `${pacienteId}-${historiaId}-${atencionId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          paciente: row.paciente,
          historia: row.historia,
          historiaLabel: row.data.historia_label || historiaLabel(row.historia) || 'Sin historia clinica',
          rows: []
        });
      }
      map.get(key).rows.push(row);
    });
    return Array.from(map.values()).map((group) => {
      const totalBs = group.rows.reduce((sum, row) => sum + Number(row.data.monto_bs || 0), 0);
      const pendiente = group.rows.reduce((sum, row) => sum + Number(row.data.saldo_bs || 0), 0);
      const metodos = [...new Set(group.rows.map((row) => row.data.metodo_pago || (row.data.qr ? 'QR' : '')).filter(Boolean))];
      const estados = group.rows.map((row) => row.data.estado_pago || row.data.estado || row.documento.estado).filter(Boolean);
      return {
        ...group,
        totalBs,
        pendiente,
        metodo: metodos.length > 1 ? 'Mixto' : metodos[0] || '-',
        estado: group.rows.every((row) => row.anulado) ? 'Anulado' : estados.includes('Pendiente') ? 'Pendiente' : estados.includes('Parcial') ? 'Parcial' : 'Guardado'
      };
    });
  }, [farmacoVisibleRows]);

  const farmacoSummary = useMemo(() => ({
    pacientes: farmacoGroups.length,
    aplicaciones: farmacoVisibleRows.length,
    cobrado: farmacoVisibleRows.reduce((sum, row) => sum + Number(row.data.monto_bs || 0), 0),
    pendientes: farmacoVisibleRows.reduce((sum, row) => sum + Number(row.data.saldo_bs || 0), 0),
    anulados: farmacoRows.filter((row) => row.fecha >= farmacoFilters.semana && row.fecha <= addDays(farmacoFilters.semana, 6) && row.anulado).length
  }), [farmacoGroups.length, farmacoRows, farmacoVisibleRows, farmacoFilters.semana]);

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
    const pdf = new jsPDF('p', 'mm', [216, 279]);
    const pageWidth = 216;
    const pageHeight = 279;
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
    const days = farmacoWeekDays(farmacoFilters.semana);
    sheet.mergeCells('A1:L1');
    sheet.getCell('A1').value = 'ADMINISTRACION DE FARMACOS';
    sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF0F766E' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.mergeCells('A2:L2');
    sheet.getCell('A2').value = `Semana ${formatDate(farmacoFilters.semana)} al ${formatDate(addDays(farmacoFilters.semana, 5))}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };
    sheet.addRow([]);
    sheet.addRow(['PACIENTE', 'HISTORIA CLINICA', ...days.map((day) => `${day.label} ${day.day}`), 'TOTAL SEMANA', 'Bs.', 'METODO', 'ESTADO']);
    farmacoGroups.forEach((group) => {
      const dayValues = days.map((day) => group.rows
        .filter((row) => row.fecha === day.fecha)
        .map((row) => `${row.labels.join(', ')} ${farmacoDose(row.data)}`.trim())
        .join(' | '));
      sheet.addRow([
        nombrePaciente(group.paciente),
        group.historiaLabel,
        ...dayValues,
        group.rows.length,
        Number(group.totalBs || 0),
        group.metodo,
        group.estado
      ]);
    });
    const header = sheet.getRow(4);
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber < 5) return;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: colNumber <= 2 ? 'left' : 'center', wrapText: true };
        cell.border = { top: { style: 'thin', color: { argb: 'FFBFDAD6' } }, left: { style: 'thin', color: { argb: 'FFBFDAD6' } }, bottom: { style: 'thin', color: { argb: 'FFBFDAD6' } }, right: { style: 'thin', color: { argb: 'FFBFDAD6' } } };
      });
    });
    sheet.columns = [
      { width: 30 },
      { width: 34 },
      ...days.map(() => ({ width: 22 })),
      { width: 14 },
      { width: 12 },
      { width: 14 },
      { width: 14 }
    ];
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `administracion_farmacos_${farmacoFilters.semana}.xlsx`;
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
      if (key === 'estado_pago' && value === 'Pagado') next.saldo_bs = '';
      if (key === 'monto_bs' && next.estado_pago === 'Pagado') next.saldo_bs = '';
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
      telefono: paciente?.telefono || '',
      historia_clinica_id: '',
      historia_label: '',
      sesion_id: '',
      diagnostico: paciente?.referencia || ''
    } : fila);
    updateDatos('filas', filas);
    if (index === 0) update('paciente_id', pacienteId);
  };

  const selectHistoriaFila = (index, historiaId) => {
    const historia = historias.find((item) => Number(item.id) === Number(historiaId));
    const filas = (form.datos.filas || []).map((fila, current) => current === index ? {
      ...fila,
      historia_clinica_id: historiaId,
      historia_label: historiaLabel(historia),
      diagnostico: historia?.diagnostico_medico || fila.diagnostico || ''
    } : fila);
    updateDatos('filas', filas);
  };

  const selectSesionFila = (index, sesionId) => {
    const sesion = sesiones.find((item) => Number(item.id) === Number(sesionId));
    const historia = historias.find((item) => Number(item.id) === Number(sesion?.historia_clinica_id || sesion?.historia_clinica?.id));
    const filas = (form.datos.filas || []).map((fila, current) => current === index ? {
      ...fila,
      sesion_id: sesionId,
      fecha: sesion?.fecha || fila.fecha,
      paciente_id: sesion?.paciente_id || fila.paciente_id,
      paciente_nombre: sesion?.paciente ? nombrePaciente(sesion.paciente) : fila.paciente_nombre,
      ci: sesion?.paciente?.ci || fila.ci,
      telefono: sesion?.paciente?.telefono || fila.telefono,
      historia_clinica_id: sesion?.historia_clinica_id || sesion?.historia_clinica?.id || fila.historia_clinica_id,
      historia_label: historiaLabel(historia) || fila.historia_label,
      profesional: sesion?.profesional || sesion?.usuario?.nombre || fila.profesional,
      origen: 'sesion'
    } : fila);
    updateDatos('filas', filas);
    if (sesion?.paciente_id) update('paciente_id', sesion.paciente_id);
  };

  const annulFarmacoGroup = async () => {
    if (!annulTarget) return;
    const reason = annulReason.trim() || 'Anulado desde administracion de farmacos';
    const updates = new Map();
    annulTarget.rows.forEach((row) => {
      const current = updates.get(row.documento.id) || { documento: row.documento, filas: [...(row.documento.datos?.filas || [])] };
      current.filas[row.rowIndex] = {
        ...current.filas[row.rowIndex],
        anulado: true,
        estado: 'Anulado',
        motivo_anulacion: reason,
        fecha_anulacion: today
      };
      updates.set(row.documento.id, current);
    });
    await Promise.all(Array.from(updates.values()).map(({ documento, filas }) => updateDocumentoClinico(documento.id, {
      ...documento,
      estado: filas.every((fila) => fila.anulado || fila.estado === 'Anulado') ? 'Anulado' : documento.estado,
      datos: { ...(documento.datos || {}), filas }
    })));
    setAnnulTarget(null);
    setAnnulReason('');
    await load();
  };

  const addFarmacoRow = () => updateDatos('filas', [...(form.datos.filas || []), newFarmacoRow()]);
  const removeFarmacoRow = (index) => updateDatos('filas', form.datos.filas.filter((_, current) => current !== index));

  const FarmacoBadge = ({ row }) => (
    <div className="grid gap-1">
      {row.labels.map((label) => (
        <span key={label} className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-100">
          {label}{farmacoDose(row.data) ? ` · ${farmacoDose(row.data)}` : ''}
        </span>
      ))}
    </div>
  );

  const renderFarmacosPanel = () => {
    const days = farmacoWeekDays(farmacoFilters.semana);
    return (
      <>
        <div className="mb-4 grid gap-3 lg:grid-cols-[160px_minmax(220px,1fr)_180px_150px_150px]">
          <Input label="Semana" type="date" value={farmacoFilters.semana} onChange={(e) => setFarmacoFilters((current) => ({ ...current, semana: startOfWeek(e.target.value) }))} compact />
          <label className="grid gap-0.5 text-xs font-bold text-slate-700">
            <span>Buscar paciente, CI, telefono o historia</span>
            <span className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <Search size={17} className="text-slate-400" />
              <input className="w-full border-0 p-0 text-sm focus:ring-0" value={farmacoFilters.q} onChange={(e) => setFarmacoFilters((current) => ({ ...current, q: e.target.value }))} placeholder="Buscar..." />
            </span>
          </label>
          <Input label="Paciente" value={farmacoFilters.paciente_id} onChange={(e) => setFarmacoFilters((current) => ({ ...current, paciente_id: e.target.value }))} compact options={[{ value: '', label: 'Todos' }, ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))]} />
          <Input label="Estado" value={farmacoFilters.estado} onChange={(e) => setFarmacoFilters((current) => ({ ...current, estado: e.target.value }))} compact options={[{ value: '', label: 'Todos' }, { value: 'Guardado', label: 'Guardado' }, { value: 'Pendiente', label: 'Pendiente' }, { value: 'Anulado', label: 'Anulado' }]} />
          <Input label="Farmaco" value={farmacoFilters.farmaco} onChange={(e) => setFarmacoFilters((current) => ({ ...current, farmaco: e.target.value }))} compact options={[{ value: '', label: 'Todos' }, { value: 'Diclofenaco', label: 'Diclofenaco' }, { value: 'Dexametasona', label: 'Dexametasona' }, { value: 'Complejo B', label: 'Complejo B' }, { value: 'Otro', label: 'Otro' }]} />
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-5">
          {[
            ['Pacientes con aplicacion', farmacoSummary.pacientes],
            ['Aplicaciones semana', farmacoSummary.aplicaciones],
            ['Total cobrado', `${money(farmacoSummary.cobrado)} Bs`],
            ['Pendientes', `${money(farmacoSummary.pendientes)} Bs`],
            ['Anulados', farmacoSummary.anulados]
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
              <span className="block text-[11px] font-black uppercase text-emerald-700">{label}</span>
              <strong className="text-lg text-ink">{value}</strong>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Paciente</th>
                <th className="px-3 py-3">Historia clinica</th>
                {days.map((day) => <th key={day.fecha} className="px-3 py-3 text-center">{day.label} {day.day}</th>)}
                <th className="px-3 py-3 text-center">Total semana</th>
                <th className="px-3 py-3 text-center">Bs.</th>
                <th className="px-3 py-3 text-center">Metodo</th>
                <th className="px-3 py-3 text-center">Estado</th>
                <th className="px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {farmacoGroups.map((group) => (
                <tr key={group.key} className="align-top">
                  <td className="px-3 py-3">
                    <PatientIdentity paciente={group.paciente} secondary={`CI: ${group.paciente?.ci || '-'}`} />
                    <div className="text-xs text-slate-500">CI: {group.paciente?.ci || group.rows[0]?.data.ci || '-'} · Tel: {group.paciente?.telefono || group.rows[0]?.data.telefono || '-'}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-56 font-semibold text-slate-700">{group.historiaLabel}</div>
                    <div className="text-xs text-slate-500">{group.rows[0]?.data.diagnostico || group.historia?.diagnostico_medico || '-'}</div>
                  </td>
                  {days.map((day) => {
                    const rows = group.rows.filter((row) => row.fecha === day.fecha);
                    return (
                      <td key={day.fecha} className="min-w-36 px-3 py-3 text-center">
                        {rows.length ? rows.map((row) => <FarmacoBadge key={row.id} row={row} />) : <span className="text-slate-300">-</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center font-black text-ink">{group.rows.length}</td>
                  <td className="px-3 py-3 text-center font-black text-emerald-700">{money(group.totalBs)}</td>
                  <td className="px-3 py-3 text-center">{group.metodo}</td>
                  <td className="px-3 py-3 text-center"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{group.estado}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex justify-center gap-2">
                      <ActionButton label="Detalle" icon={Eye} tone="view" onClick={() => setFarmacoDetail(group)} />
                      <ActionButton label="Editar" icon={FilePenLine} tone="edit" onClick={() => editDocumento(group.rows[0].documento)} />
                      {isAdmin && <ActionButton label="Anular" icon={Ban} tone="delete" onClick={() => setAnnulTarget(group)} />}
                    </div>
                  </td>
                </tr>
              ))}
              {!farmacoGroups.length && (
                <tr>
                  <td colSpan={days.length + 7} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">{meta.empty}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderFarmacosPanelModern = () => {
    const days = farmacoWeekDays(farmacoFilters.semana);
    const dayGroups = farmacoGroups;
    const dayRows = dayGroups.flatMap((group) => group.rows);
    const productCount = dayRows.reduce((sum, row) => sum + Math.max(row.labels.length, 1), 0);
    const patientCount = new Set(dayRows.map((row) => row.data.paciente_id || row.documento.paciente_id)).size;
    const weekAdministrationCount = new Set(farmacoVisibleRows.map((row) => row.documento.id)).size;
    const supplyCount = dayRows.reduce((sum, row) => sum + row.labels.filter((label) => /jeringa|insumo|aguja/i.test(label)).length, 0);
    const total = dayRows.reduce((sum, row) => sum + Number(row.data.monto_bs || 0), 0);
    const changeWeek = (offset) => {
      const semana = addDays(farmacoFilters.semana, offset * 7);
      setFarmacoFilters((current) => ({ ...current, semana }));
    };
    return <div className="grid gap-4">
      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid items-end gap-3 lg:grid-cols-[150px_minmax(260px,1fr)_minmax(230px,360px)]">
          <Input label="Semana" type="date" value={farmacoFilters.semana} onChange={(e) => setFarmacoFilters((current) => ({ ...current, semana: startOfWeek(e.target.value) }))} compact />
          <div className="flex items-center justify-center gap-2 pb-0.5"><button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" onClick={() => changeWeek(-1)}><ChevronLeft size={17} /></button><strong className="min-w-48 text-center text-sm text-slate-700">{formatDate(farmacoFilters.semana)} - {formatDate(addDays(farmacoFilters.semana, 6))}</strong><button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" onClick={() => changeWeek(1)}><ChevronRight size={17} /></button></div>
          <label className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm"><Search size={16} className="text-slate-400" /><input className="w-full border-0 p-0 text-sm focus:ring-0" value={farmacoFilters.q} onChange={(e) => setFarmacoFilters((current) => ({ ...current, q: e.target.value }))} placeholder="Buscar paciente, CI, historia o fármaco..." /></label>
        </div>
        <details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-slate-500">Filtros adicionales</summary><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><Input label="Paciente" value={farmacoFilters.paciente_id} onChange={(e) => setFarmacoFilters((current) => ({ ...current, paciente_id: e.target.value }))} compact options={[{ value: '', label: 'Todos' }, ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))]} /><Input label="Estado" value={farmacoFilters.estado} onChange={(e) => setFarmacoFilters((current) => ({ ...current, estado: e.target.value }))} compact options={[{ value: '', label: 'Activos' }, { value: 'Guardado', label: 'Activo' }, { value: 'Anulado', label: 'Anulado' }]} /><Input label="Fármaco" value={farmacoFilters.farmaco} onChange={(e) => setFarmacoFilters((current) => ({ ...current, farmaco: e.target.value }))} compact options={[{ value: '', label: 'Todos' }, { value: 'Diclofenaco', label: 'Diclofenaco' }, { value: 'Dexametasona', label: 'Dexametasona' }, { value: 'Complejo B', label: 'Complejo B' }, { value: 'Otro', label: 'Otro' }]} /><Input label="Profesional" value={farmacoFilters.profesional} onChange={(e) => setFarmacoFilters((current) => ({ ...current, profesional: e.target.value }))} compact placeholder="Buscar profesional" /><Input label="Vía" value={farmacoFilters.via} onChange={(e) => setFarmacoFilters((current) => ({ ...current, via: e.target.value }))} compact options={[{ value: '', label: 'Todas' }, { value: 'Intramuscular', label: 'IM – Intramuscular' }, { value: 'Intravenosa', label: 'IV – Intravenosa' }, { value: 'Vía oral', label: 'VO – Vía oral' }, { value: 'Subcutánea', label: 'SC – Subcutánea' }, { value: 'Tópica', label: 'Tópica' }, { value: 'Otra', label: 'Otra' }]} /></div></details>
      </section>
      <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4">{[[Syringe, 'Administraciones de la semana', weekAdministrationCount], [Users, 'Pacientes atendidos', patientCount], [Pill, 'Medicamentos aplicados', productCount], [CalendarDays, 'Registros de la semana', weekAdministrationCount]].map(([Icon, label, value], index) => <div key={label} className={`flex items-center gap-3 px-4 py-3 ${index ? 'border-t border-slate-100 sm:border-l sm:border-t-0' : ''}`}><span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Icon size={17} /></span><div><small className="block text-[10px] font-bold text-slate-500">{label}</small><strong className="text-base text-slate-800">{value}</strong></div></div>)}</section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Historia clínica</th>
                <th className="px-4 py-3">Fármacos administrados</th>
                <th className="px-4 py-3 text-center">Cantidad total</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dayGroups.map((group) => {
                const labels = [...new Set(group.rows.flatMap((row) => row.labels))];
                const first = group.rows[0];
                const fromSession = first.data.origen === 'sesion' && first.data.sesion_id;
                return (
                  <tr key={group.key} className="hover:bg-emerald-50/30">
                    <td className="px-4 py-3">
                      <PatientIdentity paciente={group.paciente} secondary={`CI: ${group.paciente?.ci || first.data.ci || '-'}`} />
                    </td>
                    <td className="px-4 py-3">
                      <strong className="block text-slate-700">{group.historia?.condicion_actual?.zona_cuerpo || group.historiaLabel}</strong>
                      <small className="text-slate-500">{formatDate(first.fecha)}{first.data.numero_sesion ? ` · Sesión ${first.data.numero_sesion}` : ''}</small>
                    </td>
                    <td className="px-4 py-3">
                      <strong className="block text-slate-700">{labels.join(', ') || 'Sin fármacos registrados'}</strong>
                      <small className="text-slate-500">{first.data.via_administracion || first.data.productos?.[0]?.via || ''}</small>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex min-w-8 justify-center rounded-full bg-emerald-50 px-2.5 py-1 font-black text-emerald-700">{group.rows.reduce((sum, row) => sum + Math.max(row.labels.length, 1), 0)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1.5">
                        <ActionButton label="Ver detalle" icon={Eye} tone="view" onClick={() => setFarmacoDetail({ ...group, rows: group.rows })} />
                        {fromSession
                          ? <ActionButton label="Ver sesión" icon={CalendarDays} tone="edit" onClick={() => navigate('/sesiones', { state: { verSesionId: first.data.sesion_id } })} />
                          : <ActionButton label="Editar" icon={FilePenLine} tone="edit" onClick={() => editDocumento(first.documento)} />}
                        {isAdmin && <ActionButton label="Anular" icon={Ban} tone="delete" onClick={() => setAnnulTarget({ ...group, rows: group.rows })} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!dayGroups.length && <tr><td colSpan="5" className="px-4 py-10 text-center text-sm text-slate-500">No hay administraciones registradas para esta semana.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Mostrando {dayGroups.length} pacientes · Semana del {formatDate(days[0]?.fecha)} al {formatDate(days.at(-1)?.fecha)}
        </div>
      </section>
    </div>;
  };

  return (
    <section className="grid gap-4">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="module-hero">
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
              <>
                <Button variant="ghost" onClick={() => setFarmacoFilters((current) => ({ ...current, semana: startOfWeek(today) }))}>
                  <CalendarDays size={17} />
                  Generar planilla semanal
                </Button>
                <Button variant="ghost" onClick={exportExcel}>
                  <Download size={17} />
                  Exportar Excel
                </Button>
              </>
            )}
            <Button onClick={startCreate}>
              <Plus size={17} />
              {meta.action}
            </Button>
          </div>
        </div>

        {tipo === 'farmacos' ? renderFarmacosPanelModern() : (
          <>
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
              columns={['Fecha', 'Paciente', 'CI', 'Diagnostico', 'Responsable', 'Estado', 'Acciones']}
              rows={filtered.map((documento) => {
                const commonActions = (
                  <div className="flex flex-wrap gap-2">
                    <ActionButton label="Vista previa" icon={Eye} tone="view" onClick={() => setPreview(documento)} />
                    <ActionButton label="Editar" icon={FilePenLine} tone="edit" onClick={() => editDocumento(documento)} />
                    <ActionButton label="Imprimir" icon={Printer} tone="print" onClick={() => printDocumento(documento)} />
                    <ActionButton label="Descargar PDF" icon={Download} tone="download" onClick={() => downloadPdf(documento)} />
                    {isAdmin && <ActionButton label="Eliminar" icon={Trash2} tone="delete" onClick={() => deleteDocumentoClinico(documento.id).then(load)} />}
                  </div>
                );
                return [formatDate(documento.fecha), <PatientIdentity paciente={documento.paciente} secondary={`CI: ${documento.datos?.ci || documento.paciente?.ci || '-'}`} />, documento.datos?.ci || documento.paciente?.ci || '-', documento.datos?.diagnostico || '-', documento.creado_por?.nombre || '-', documento.estado, commonActions];
              })}
              empty={meta.empty}
            />
          </>
        )}
      </div>

      <Modal open={showForm} title={tipo === 'farmacos' ? (editing ? 'Editar administración externa' : 'Registrar administración externa') : (editing ? `Editar ${meta.title}` : meta.action)} subtitle={tipo === 'farmacos' ? 'Uso excepcional para medicamentos administrados fuera de una sesión fisioterapéutica.' : undefined} onClose={() => setShowForm(false)} size={tipo === 'farmacos' ? 'compact' : 'lg'}>
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
              {tipo !== 'farmacos' && <Input label="Sesion diaria vinculada" value={form.sesion_id || ''} onChange={(e) => update('sesion_id', e.target.value)} options={[{ value: '', label: 'Sin sesion' }, ...sesiones.filter((sesion) => isSesionActiva(sesion) && (!form.paciente_id || Number(sesion.paciente_id) === Number(form.paciente_id)) && (!form.historia_clinica_id || Number(sesion.historia_clinica_id || sesion.historia_clinica?.id) === Number(form.historia_clinica_id))).map((sesion) => ({ value: sesion.id, label: `${formatDate(sesion.fecha)} - ${nombrePaciente(sesion.paciente)}` }))]} />}
            </div>
          )}

          {tipo !== 'farmacos' && form.paciente_id && (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Historia clínica" value={form.historia_clinica_id || ''} onChange={(e) => selectHistoriaDocumento(e.target.value)} options={[{ value: '', label: historiasPacienteActual.length ? `Seleccionar entre ${historiasPacienteActual.length} historias` : 'Sin historias clínicas' }, ...historiasPacienteActual.map((historia) => ({ value: historia.id, label: historiaLabel(historia) }))]} disabled={!historiasPacienteActual.length} />
              {tipo === 'consentimiento' && <Input label="Sesión diaria vinculada" value={form.sesion_id || ''} onChange={(e) => update('sesion_id', e.target.value)} options={[{ value: '', label: 'Sin sesión' }, ...sesiones.filter((sesion) => isSesionActiva(sesion) && Number(sesion.paciente_id || sesion.paciente?.id) === Number(form.paciente_id) && (!form.historia_clinica_id || Number(sesion.historia_clinica_id || sesion.historia_clinica?.id) === Number(form.historia_clinica_id))).map((sesion) => ({ value: sesion.id, label: `${formatDate(sesion.fecha)} · Sesión ${sesion.numero_sesion || ''}` }))]} />}
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
                  <Input label="Ciudad" value={form.datos.ciudad || 'LA PAZ'} onChange={(e) => updateDatos('ciudad', e.target.value)} />
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

          {tipo === 'farmacos' && (() => {
            const fila = form.datos.filas?.[0] || newFarmacoRow();
            const productos = legacyProductos(fila).length ? legacyProductos(fila) : [emptyProducto()];
            const costoTotal = productos.reduce((sum, producto) => sum + Number(producto.costo || 0) * Math.max(Number(producto.cantidad || 1), 1), 0);
            const montoPagado = Math.min(Number(fila.monto_pagado || 0), costoTotal);
            const saldo = Math.max(costoTotal - montoPagado, 0);
            const estadoPago = costoTotal <= 0 || montoPagado <= 0 ? 'Pendiente' : saldo <= 0 ? 'Pagado' : 'Parcial';
            const setProductos = (next) => {
              const nextTotal = next.reduce((sum, producto) => sum + Number(producto.costo || 0) * Math.max(Number(producto.cantidad || 1), 1), 0);
              const nextPaid = Math.min(Number(fila.monto_pagado || 0), nextTotal);
              updateDatos('filas', [{ ...fila, productos: next, monto_bs: nextTotal, saldo_bs: Math.max(nextTotal - nextPaid, 0), estado_pago: nextTotal > 0 && nextPaid >= nextTotal ? 'Pagado' : nextPaid > 0 ? 'Parcial' : 'Pendiente' }]);
            };
            const updateProducto = (index, key, value) => {
              const next = productos.map((producto, current) => current === index ? { ...producto, [key]: value } : producto);
              const nextTotal = next.reduce((sum, producto) => sum + Number(producto.costo || 0) * Math.max(Number(producto.cantidad || 1), 1), 0);
              const nextPaid = Math.min(Number(fila.monto_pagado || 0), nextTotal);
              updateDatos('filas', [{ ...fila, productos: next, monto_bs: nextTotal, saldo_bs: Math.max(nextTotal - nextPaid, 0), estado_pago: nextTotal > 0 && nextPaid >= nextTotal ? 'Pagado' : nextPaid > 0 ? 'Parcial' : 'Pendiente' }]);
            };
            const historia = historias.find((item) => Number(item.id) === Number(fila.historia_clinica_id));
            const sesion = sesiones.find((item) => Number(item.id) === Number(fila.sesion_id));
            return <div className="grid gap-5 overflow-x-hidden pb-3">
              <section className="grid gap-3">
                <div><h3 className="text-sm font-black text-slate-800">Administración externa</h3><p className="text-xs text-slate-500">Utiliza este registro únicamente cuando el medicamento fue administrado fuera de una sesión fisioterapéutica.</p></div>
                <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-700">Este registro no incrementará las sesiones realizadas.</div>
                <div className="grid gap-3 md:grid-cols-2"><Input label="Fecha" type="date" value={fila.fecha || today} onChange={(e) => updateFarmacoRow(0, 'fecha', e.target.value)} /><Input label="Paciente" value={fila.paciente_id || ''} onChange={(e) => selectPacienteFila(0, e.target.value)} options={[{ value: '', label: 'Seleccionar paciente' }, ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))]} /><Input label="Historia clínica" value={fila.historia_clinica_id || ''} onChange={(e) => selectHistoriaFila(0, e.target.value)} options={[{ value: '', label: 'Seleccionar historia' }, ...(historiasPorPaciente.get(Number(fila.paciente_id)) || []).map((item) => ({ value: item.id, label: historiaLabel(item) }))]} /><Input label="Profesional responsable" value={fila.profesional || form.datos.responsable_nombre || ''} onChange={(e) => updateFarmacoRow(0, 'profesional', e.target.value)} /></div>
              </section>
              <section className="grid gap-3 border-t border-slate-100 pt-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-800">Fármacos e insumos</h3><p className="text-xs text-slate-500">Agrega uno o varios productos administrados.</p></div><Button type="button" variant="ghost" onClick={() => setProductos([...productos, emptyProducto()])}><Plus size={16} />Agregar producto</Button></div>{productos.map((producto, index) => <article key={index} className="rounded-lg border border-slate-200 p-3"><div className="mb-3 flex items-center justify-between"><strong className="text-xs text-emerald-700">Producto {index + 1}</strong><button type="button" title="Eliminar producto" onClick={() => productos.length > 1 && setProductos(productos.filter((_, current) => current !== index))} disabled={productos.length === 1} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={15} /></button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Input label="Fármaco o insumo" value={producto.producto} onChange={(e) => updateProducto(index, 'producto', e.target.value)} options={['', 'Diclofenaco', 'Dexametasona', 'Complejo B', 'Jeringa 3 ml', 'Jeringa 5 ml', 'Jeringa 10 ml', 'Otro'].map((value) => ({ value, label: value || 'Seleccionar producto' }))} />{producto.producto === 'Otro' && <Input label="Nombre del producto" value={producto.nombre_otro} onChange={(e) => updateProducto(index, 'nombre_otro', e.target.value)} />}<Input label="Presentación" value={producto.presentacion} onChange={(e) => updateProducto(index, 'presentacion', e.target.value)} placeholder="Ej. Ampolla" /><Input label="Dosis" value={producto.dosis} onChange={(e) => updateProducto(index, 'dosis', e.target.value)} placeholder="Ej. 75 mg" /><Input label="Volumen" value={producto.volumen} onChange={(e) => updateProducto(index, 'volumen', e.target.value)} placeholder="Ej. 3 ml" /><Input label="Cantidad" type="number" min="1" value={producto.cantidad} onChange={(e) => updateProducto(index, 'cantidad', e.target.value)} /><Input label="Vía" value={producto.via} onChange={(e) => updateProducto(index, 'via', e.target.value)} options={['Intramuscular', 'Tópica', 'Oral', 'Intravenosa', 'Otra'].map((value) => ({ value, label: value }))} /><Input label="Costo unitario Bs." type="number" min="0" step="0.01" value={producto.costo} onChange={(e) => updateProducto(index, 'costo', e.target.value)} /></div></article>)}</section>
              <section className="grid gap-3 border-t border-slate-100 pt-4"><Input label="Motivo de aplicación" value={fila.motivo || ''} onChange={(e) => updateFarmacoRow(0, 'motivo', e.target.value)} placeholder="Aplicación posterior a terapia manual" /><Input label="Observaciones clínicas" value={fila.observaciones || ''} onChange={(e) => updateFarmacoRow(0, 'observaciones', e.target.value)} multiline /><label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-red-600" checked={Boolean(fila.reaccion_adversa)} onChange={(e) => updateFarmacoRow(0, 'reaccion_adversa', e.target.checked)} />Se presentó una reacción adversa</label>{fila.reaccion_adversa && <Input label="Detalle de la reacción" value={fila.detalle_reaccion || ''} onChange={(e) => updateFarmacoRow(0, 'detalle_reaccion', e.target.value)} multiline />}</section>
              <section className="grid gap-3 border-t border-slate-100 pt-4"><div><h3 className="text-sm font-black text-slate-800">Pago</h3><p className="text-xs text-slate-500">El costo y el saldo se calculan automáticamente.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Input label="Costo total Bs." value={money(costoTotal)} readOnly /><Input label="Monto pagado Bs." type="number" min="0" step="0.01" value={fila.monto_pagado || ''} onChange={(e) => { const paid = Math.min(Number(e.target.value || 0), costoTotal); updateDatos('filas', [{ ...fila, productos, monto_bs: costoTotal, monto_pagado: e.target.value, saldo_bs: Math.max(costoTotal - paid, 0), estado_pago: costoTotal > 0 && paid >= costoTotal ? 'Pagado' : paid > 0 ? 'Parcial' : 'Pendiente' }]); }} /><Input label="Saldo Bs." value={money(saldo)} readOnly /><Input label="Método" value={fila.metodo_pago || 'Efectivo'} onChange={(e) => updateFarmacoRow(0, 'metodo_pago', e.target.value)} options={['Efectivo', 'QR', 'Transferencia', 'Otro'].map((value) => ({ value, label: value }))} /><Input label="Estado de pago" value={estadoPago} readOnly /><Input label="Estado del registro" value={fila.estado || 'Guardado'} onChange={(e) => updateFarmacoRow(0, 'estado', e.target.value)} options={[{ value: 'Borrador', label: 'Borrador' }, { value: 'Guardado', label: 'Guardado' }, { value: 'Anulado', label: 'Anulado' }]} /></div></section>
            </div>;
          })()}

          {false && tipo === 'farmacos' && (
            <div className="grid gap-3">
              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={addFarmacoRow}>
                  <Plus size={17} />
                  Agregar otro paciente
                </Button>
              </div>
              {(form.datos.filas || []).map((fila, index) => (
                <div key={index} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-black text-ink">Registro de aplicacion</h3>
                      <p className="text-sm text-slate-500">Paciente, historia clinica, farmacos, pago y observacion.</p>
                    </div>
                    <ActionButton label="Eliminar registro" icon={Trash2} tone="delete" onClick={() => removeFarmacoRow(index)} disabled={form.datos.filas.length === 1} />
                  </div>

                  <section className="grid gap-3">
                    <h4 className="text-sm font-black text-ink">Datos principales</h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input label="Fecha" type="date" value={fila.fecha || today} onChange={(e) => updateFarmacoRow(index, 'fecha', e.target.value)} />
                      <Input label="Paciente" value={fila.paciente_id || ''} onChange={(e) => selectPacienteFila(index, e.target.value)} options={[{ value: '', label: 'Seleccionar paciente' }, ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))]} />
                      <Input label="Historia clinica" value={fila.historia_clinica_id || ''} onChange={(e) => selectHistoriaFila(index, e.target.value)} options={[{ value: '', label: 'Sin historia' }, ...(historiasPorPaciente.get(Number(fila.paciente_id)) || []).map((historia) => ({ value: historia.id, label: historiaLabel(historia) }))]} />
                      <div className="flex min-h-11 items-center rounded-lg border border-teal-100 bg-teal-50 px-3 text-xs font-black text-teal-700">Administración externa</div>
                      <Input label="Profesional" value={fila.profesional || form.datos.responsable_nombre || ''} onChange={(e) => updateFarmacoRow(index, 'profesional', e.target.value)} />
                      <Input label="Estado" value={fila.estado || 'Guardado'} onChange={(e) => updateFarmacoRow(index, 'estado', e.target.value)} options={[{ value: 'Guardado', label: 'Guardado' }, { value: 'Pendiente', label: 'Pendiente' }, { value: 'Anulado', label: 'Anulado' }]} />
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <h4 className="text-sm font-black text-ink">Farmacos aplicados</h4>
                    <div className="grid gap-2 md:grid-cols-4">
                      {[
                        ['diclo', 'Diclofenaco'],
                        ['dexa', 'Dexametasona'],
                        ['com_b', 'Complejo B'],
                        ['otro', 'Otro']
                      ].map(([key, label]) => (
                        <label key={key} className={`flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-black ${fila[key] ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={Boolean(fila[key])} onChange={(e) => updateFarmacoRow(index, key, e.target.checked)} />
                          {label}
                        </label>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <Input label="Otro farmaco" value={fila.otro_farmaco || ''} onChange={(e) => updateFarmacoRow(index, 'otro_farmaco', e.target.value)} />
                      <Input label="Dosis/volumen" value={fila.dosis_otro ? 'otro' : fila.dosis_10ml ? '10' : fila.dosis_5ml ? '5' : fila.dosis_3ml ? '3' : ''} onChange={(e) => {
                        const value = e.target.value;
                        updateDatos('filas', (form.datos.filas || []).map((item, current) => current === index ? { ...item, dosis_3ml: value === '3', dosis_5ml: value === '5', dosis_10ml: value === '10', dosis_otro: value === 'otro' ? item.dosis_otro : '' } : item));
                      }} options={[{ value: '', label: 'Seleccionar' }, { value: '3', label: '3 ml' }, { value: '5', label: '5 ml' }, { value: '10', label: '10 ml' }, { value: 'otro', label: 'Otro' }]} />
                      <Input label="Dosis otro ml" value={fila.dosis_otro || ''} onChange={(e) => updateFarmacoRow(index, 'dosis_otro', e.target.value)} />
                      <Input label="Via" value={fila.via_administracion || 'Intramuscular'} onChange={(e) => updateFarmacoRow(index, 'via_administracion', e.target.value)} options={[{ value: 'Intramuscular', label: 'Intramuscular' }, { value: 'Topica', label: 'Topica' }, { value: 'Oral', label: 'Oral' }, { value: 'Otra', label: 'Otra' }]} />
                    </div>
                    <Input label="Motivo" value={fila.motivo || ''} onChange={(e) => updateFarmacoRow(index, 'motivo', e.target.value)} />
                  </section>

                  <section className="grid gap-3">
                    <h4 className="text-sm font-black text-ink">Pago</h4>
                    <div className="grid gap-3 md:grid-cols-4">
                      <Input label="Costo Bs." type="number" min="0" step="0.01" value={fila.monto_bs || ''} onChange={(e) => updateFarmacoRow(index, 'monto_bs', e.target.value)} />
                      <Input label="Metodo" value={fila.metodo_pago || 'Efectivo'} onChange={(e) => updateFarmacoRow(index, 'metodo_pago', e.target.value)} options={[{ value: 'Efectivo', label: 'Efectivo' }, { value: 'QR', label: 'QR' }, { value: 'Transferencia', label: 'Transferencia' }, { value: 'Otro', label: 'Otro' }]} />
                      <Input label="Estado pago" value={fila.estado_pago || 'Pagado'} onChange={(e) => updateFarmacoRow(index, 'estado_pago', e.target.value)} options={[{ value: 'Pagado', label: 'Pagado' }, { value: 'Parcial', label: 'Parcial' }, { value: 'Pendiente', label: 'Pendiente' }]} />
                      <Input label="Saldo Bs." type="number" min="0" step="0.01" value={fila.saldo_bs || ''} onChange={(e) => updateFarmacoRow(index, 'saldo_bs', e.target.value)} disabled={(fila.estado_pago || 'Pagado') === 'Pagado'} />
                    </div>
                  </section>

                  <section className="grid gap-3 md:grid-cols-2">
                    <Input label="Observaciones clinicas" value={fila.observaciones || ''} onChange={(e) => updateFarmacoRow(index, 'observaciones', e.target.value)} multiline />
                    <div className="grid gap-2">
                      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700">
                        <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500" checked={Boolean(fila.reaccion_adversa)} onChange={(e) => updateFarmacoRow(index, 'reaccion_adversa', e.target.checked)} />
                        Reaccion adversa
                      </label>
                      <Input label="Detalle reaccion" value={fila.detalle_reaccion || ''} onChange={(e) => updateFarmacoRow(index, 'detalle_reaccion', e.target.value)} multiline />
                    </div>
                  </section>
                </div>
              ))}
            </div>
          )}

          <div className="sticky-actions justify-between">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <div className="flex flex-wrap gap-2">
              {tipo !== 'farmacos' && <Button type="button" variant="secondary" onClick={() => setPreview(previewDocumento)}>
                <Eye size={17} />
                Vista previa
              </Button>}
              <Button type="submit">
                <Save size={17} />
                {tipo === 'farmacos' ? 'Guardar registro' : 'Guardar'}
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

      <Modal open={Boolean(farmacoDetail)} title="Detalle de administración" subtitle="Fármacos e insumos registrados para el paciente." onClose={() => setFarmacoDetail(null)} size="compact">
        {farmacoDetail && (
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
              <div><span className="text-xs font-black uppercase text-slate-500">Paciente</span><strong className="block text-ink">{nombrePaciente(farmacoDetail.paciente)}</strong></div>
              <div><span className="text-xs font-black uppercase text-slate-500">CI / Tel</span><strong className="block text-ink">{farmacoDetail.paciente?.ci || farmacoDetail.rows[0]?.data.ci || '-'} / {farmacoDetail.paciente?.telefono || farmacoDetail.rows[0]?.data.telefono || '-'}</strong></div>
              <div><span className="text-xs font-black uppercase text-slate-500">Historia</span><strong className="block text-ink">{farmacoDetail.historiaLabel}</strong></div>
              <div><span className="text-xs font-black uppercase text-slate-500">Fecha</span><strong className="block text-ink">{formatDate(farmacoDetail.rows[0]?.fecha)}</strong></div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-emerald-50 p-3"><span className="block text-xs font-black text-emerald-700">Aplicaciones</span><strong>{farmacoDetail.rows.length}</strong></div>
              <div className="rounded-lg bg-blue-50 p-3"><span className="block text-xs font-black text-blue-700">Total</span><strong>{money(farmacoDetail.totalBs)} Bs</strong></div>
              <div className="rounded-lg bg-amber-50 p-3"><span className="block text-xs font-black text-amber-700">Pendiente</span><strong>{money(farmacoDetail.pendiente)} Bs</strong></div>
              <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs font-black text-slate-600">Profesional</span><strong>{farmacoDetail.rows[0]?.data.profesional || farmacoDetail.rows[0]?.documento.creado_por?.nombre || '-'}</strong></div>
            </div>
            {farmacoDetail.rows[0]?.data.origen === 'sesion' && <div className="grid gap-2 rounded-lg border border-teal-100 bg-teal-50 p-3 text-sm text-slate-700"><strong className="text-teal-800">Evolución clínica · Sesión N.º {farmacoDetail.rows[0].data.numero_sesion}</strong><span>Dolor: {farmacoDetail.rows[0].data.dolor_inicial ?? '-'} → {farmacoDetail.rows[0].data.dolor_final ?? '-'}</span><span><b>Procedimiento:</b> {farmacoDetail.rows[0].data.procedimiento_realizado || '-'}</span><span><b>Respuesta:</b> {farmacoDetail.rows[0].data.resumen_evolucion || '-'}</span></div>}
            <div className="grid gap-3 md:grid-cols-2">
              {farmacoDetail.rows.map((row) => (
                <div key={row.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="text-ink">{formatDate(row.fecha)}</strong>
                      <p className="text-sm text-slate-500">{row.data.motivo || row.data.diagnostico || 'Sin motivo registrado'}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{row.data.estado_pago || row.data.estado || row.documento.estado}</span>
                  </div>
                  <div className="mt-3"><FarmacoBadge row={row} /></div>
                  <p className="mt-3 text-sm text-slate-600">Vía: {row.data.via_administracion || row.data.productos?.[0]?.via || '-'}</p>
                  <p className="text-sm text-slate-600">Cantidad: {row.data.productos?.[0]?.cantidad || 1} · Motivo: {row.data.motivo || row.data.productos?.[0]?.motivo_clinico || '-'}</p>
                  <p className="text-sm text-slate-600">Pago: {money(row.data.monto_bs)} Bs · {row.data.metodo_pago || '-'}</p>
                  {row.data.observaciones && <p className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-600">{row.data.observaciones}</p>}
                  {row.data.reaccion_adversa && <p className="mt-2 rounded bg-red-50 p-2 text-sm font-semibold text-red-700">Reaccion adversa: {row.data.detalle_reaccion || 'Sin detalle'}</p>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="ghost" onClick={exportExcel}><Download size={17} />Exportar Excel</Button>
              <Button onClick={() => setFarmacoDetail(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(annulTarget)} title="Anular aplicaciones de farmacos" onClose={() => setAnnulTarget(null)} size="md">
        <div className="grid gap-4">
          <p className="text-sm text-slate-600">Se anularan las aplicaciones visibles de este paciente e historia. No se eliminara informacion del sistema.</p>
          <Input label="Motivo de anulacion" value={annulReason} onChange={(e) => setAnnulReason(e.target.value)} multiline />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAnnulTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={annulFarmacoGroup}><Ban size={17} />Anular</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default DocumentosClinicos;

