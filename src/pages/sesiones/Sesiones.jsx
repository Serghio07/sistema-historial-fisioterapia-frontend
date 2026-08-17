import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Activity,
  CalendarDays,
  CalendarSync,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CreditCard,
  Eye,
  FilePenLine,
  IdCard,
  Phone,
  PlusCircle,
  Search,
  Stethoscope,
  Trash2
} from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Table from '../../components/common/Table';
import { matchesSearch } from '../../utils/search';
import { useAuth } from '../../context/AuthContext';
import { getHistoriasClinicas } from '../../services/historiaClinicaService';
import { getPacientes } from '../../services/pacienteService';
import { createSesion, deleteSesion, getSesiones, updateSesion } from '../../services/sesionService';
import { getCitas } from '../../services/citaService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import { boliviaDate } from '../../utils/boliviaDateTime';
import SesionForm from './SesionForm';
import SesionesPacienteAccordion, { sessionEvolution } from './SesionesPacienteAccordion';
import { nextIncompleteHistory } from './sessionProgress';

const initialForm = {
  cita_id: '',
  paciente_id: '',
  historia_clinica_id: '',
  fecha: boliviaDate(),
  numero_sesion: 1,
  sesiones_debe: 0,
  sesiones_hizo: 0,
  asistencia: 'asistio',
  metodo_pago: '',
  estado_pago: 'Pendiente',
  monto_sesion: '',
  monto_pagado: '',
  saldo_pendiente: 0,
  aplica_farmacos: false,
  farmacos: [],
  observacion_farmacos: '',
  observacion_pago: '',
  motivo_sin_costo: '',
  procedimiento: '',
  procedimiento_otro: '',
  medios_fisicos: '',
  tecnicas_manuales: '',
  descripcion_tratamiento: '',
  evolucion_observada: '',
  dolor_antes: '',
  dolor_despues: '',
  inyectable_nombre: '',
  inyectable_dosis: '',
  profesional_responsable: '',
  observacion: ''
};

function labelAsistencia(value) {
  const labels = {
    pendiente: 'Pendiente',
    asistio: 'Asistió',
    no_asistio: 'Faltó',
    cancelada: 'Cancelada',
    reprogramada: 'Reprogramada'
  };
  return labels[value] || value;
}

const asistenciaTone = {
  asistio: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  no_asistio: 'bg-red-50 text-red-700 ring-red-200',
  cancelada: 'bg-slate-100 text-slate-600 ring-slate-200',
  reprogramada: 'bg-blue-50 text-blue-700 ring-blue-200'
};

const pagoTone = {
  QR: 'bg-sky-50 text-sky-700 ring-sky-200',
  Efectivo: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Transferencia: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  Otro: 'bg-slate-100 text-slate-700 ring-slate-200'
};

const estadoPagoTone = {
  Pagado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  Parcial: 'bg-orange-50 text-orange-700 ring-orange-200',
  Debe: 'bg-red-50 text-red-700 ring-red-200'
};

const isSesionAnulada = (sesion) => {
  const estado = String(sesion?.estado || '').toLowerCase();
  return sesion?.anulada === true || ['anulada', 'anulado', 'eliminada', 'eliminado', 'inactiva', 'inactivo'].includes(estado);
};

const isSesionRealizada = (sesion) => {
  const asistencia = String(sesion?.asistencia || '').toLowerCase();
  return !isSesionAnulada(sesion) && (asistencia === 'asistio' || sesion?.descontarSesion === true || sesion?.descontar_sesion === true);
};

const dolorInicialParaHistoria = (historia, sesionesHistoria) => {
  const ultimoDolor = [...sesionesHistoria]
    .filter(isSesionRealizada)
    .sort((a, b) => Number(a.numero_sesion || 0) - Number(b.numero_sesion || 0) || String(a.fecha || '').localeCompare(String(b.fecha || '')))
    .map((sesion) => sesion.dolor_despues)
    .filter((value) => value !== '' && value != null)
    .at(-1);
  return ultimoDolor ?? historia?.intervencion_clinica?.escala_dolor ?? '';
};

const isHistoriaActiva = (historia) => !historia?.anulada && (historia?.estado || 'activa') === 'activa';

const initialsOf = (paciente) => {
  const name = nombrePaciente(paciente).trim();
  if (!name) return 'PA';
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};

const moneyValue = (sesion, keys) => {
  const value = keys.map((key) => sesion?.[key]).find((item) => item !== undefined && item !== null && item !== '');
  return Number(value || 0);
};

const montoSesion = (sesion) => moneyValue(sesion, ['monto_sesion', 'monto', 'monto_total', 'costo', 'precio']);
const montoPagado = (sesion) => {
  const explicit = moneyValue(sesion, ['monto_pagado', 'pagado', 'monto_pagado_bs']);
  if (explicit > 0) return explicit;
  return sesion?.estado_pago === 'Pagado' ? montoSesion(sesion) : 0;
};
const saldoPendiente = (sesion) => {
  const explicit = moneyValue(sesion, ['saldo_pendiente', 'saldo', 'pendiente']);
  if (explicit > 0) return explicit;
  return Math.max(montoSesion(sesion) - montoPagado(sesion), 0);
};
const formatMoney = (value) => `${Number(value || 0).toFixed(0)} Bs`;

function Badge({ children, tone }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone}`}>{children}</span>;
}

function StatPill({ icon: Icon, label, value, tone = 'bg-slate-50 text-slate-700 ring-slate-200' }) {
  return (
    <div className={`flex min-h-16 items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-inset ${tone}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/80 shadow-sm">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <span className="block text-[11px] font-black uppercase tracking-wide opacity-70">{label}</span>
        <strong className="block truncate text-sm font-black">{value}</strong>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm font-semibold text-ink">{value === null || value === undefined || value === '' ? 'Sin dato' : value}</strong>
    </div>
  );
}

function Sesiones() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const profesionalActual = user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || '';
  const [pacientes, setPacientes] = useState([]);
  const [historias, setHistorias] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [programaciones, setProgramaciones] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [formTab, setFormTab] = useState('session');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [selectedHistoria, setSelectedHistoria] = useState(null);
  const [annulSesion, setAnnulSesion] = useState(null);
  const [annulForm, setAnnulForm] = useState({ motivo_anulacion: '', observacion_anulacion: '' });
  const [viewMode, setViewMode] = useState('accordion');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [registeredFilters, setRegisteredFilters] = useState({ query: '', dateFrom: '', dateTo: '', orderBy: 'fecha_desc' });
  const [sessionFilter, setSessionFilter] = useState('todos');
  const [expandedGroupKey, setExpandedGroupKey] = useState(null);
  const [evolutionTarget, setEvolutionTarget] = useState(null);
  const [evolutionDetail, setEvolutionDetail] = useState(null);
  const [evolutionForm, setEvolutionForm] = useState({ dolor_inicial: '', dolor_final: '', aplicacion: '', observaciones: '', inyectables: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [historiasData, sesionesData] = await Promise.all([
        getHistoriasClinicas(),
        getSesiones()
      ]);
      setHistorias(historiasData);
      setSesiones(sesionesData);
      setLoading(false);

      const [pacientesData, programacionesData] = await Promise.all([
        getPacientes(),
        getCitas({ origen: 'Plan de tratamiento' })
      ]);
      setPacientes(pacientesData);
      setProgramaciones(programacionesData.filter((cita) => ['Programada', 'Confirmada'].includes(cita.estado)));
    } catch (err) {
      setError(`No se pudo cargar el módulo de sesiones: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const cita = location.state?.programacion;
    if (!cita || !pacientes.length || !historias.length) return;
    const historia = historias.find((item) => String(item.id) === String(cita.historia_clinica_id || cita.historia_clinica?.id));
    if (!historia) return setError('La historia clínica vinculada a esta programación no está disponible.');
    const hechas = sesiones.filter((item) => String(item.historia_clinica_id) === String(historia.id) && item.asistencia === 'asistio' && !item.anulada).length;
    const sesionesHistoria = sesiones.filter((item) => String(item.historia_clinica_id || item.historia_clinica?.id) === String(historia.id));
    setEditing(null);
    setFormTab('session');
    setForm({
      ...initialForm, cita_id: cita.id, paciente_id: cita.paciente_id,
      historia_clinica_id: historia.id, fecha: cita.fecha, numero_sesion: cita.numero_sesion,
      sesiones_debe: cita.total_sesiones || historia.evaluacion_final?.sesiones_contratadas || 0,
      sesiones_hizo: hechas + 1, profesional_responsable: cita.profesional?.nombre || profesionalActual,
      asistencia: 'asistio',
      dolor_antes: dolorInicialParaHistoria(historia, sesionesHistoria)
    });
    setShowFormModal(true);
    navigate('/sesiones', { replace: true, state: null });
  }, [location.state?.programacion, pacientes.length, historias.length, sesiones.length]);

  const filteredSesiones = useMemo(() => {
    const filtered = sesiones.filter((sesion) => {
      const historia = sesion.historia_clinica || historias.find((item) => String(item.id) === String(sesion.historia_clinica_id));
      const text = `${nombrePaciente(sesion.paciente)} ${sesion.paciente?.ci || ''} ${sesion.paciente?.telefono || sesion.paciente?.celular || ''} ${sesion.registrado_por?.nombre || ''} ${sesion.profesional_responsable || ''} ${sesion.observacion || ''} ${sesion.observacion_farmacos || ''} ${sesion.estado_pago || ''} ${sesion.metodo_pago || ''} ${historia?.condicion_actual?.zona_cuerpo || ''} ${historia?.motivo_consulta || ''} ${historia?.diagnostico_medico || ''}`;
      const date = String(sesion.fecha || '');
      const matchesDate = (!registeredFilters.dateFrom || date >= registeredFilters.dateFrom)
        && (!registeredFilters.dateTo || date <= registeredFilters.dateTo);
      return matchesSearch(text, registeredFilters.query) && matchesDate;
    });

    return [...filtered].sort((a, b) => {
      if (registeredFilters.orderBy === 'nombre_asc') return nombrePaciente(a.paciente).localeCompare(nombrePaciente(b.paciente), 'es');
      if (registeredFilters.orderBy === 'nombre_desc') return nombrePaciente(b.paciente).localeCompare(nombrePaciente(a.paciente), 'es');
      if (registeredFilters.orderBy === 'fecha_asc') return String(a.fecha || '').localeCompare(String(b.fecha || ''));
      return String(b.fecha || '').localeCompare(String(a.fecha || ''));
    });
  }, [sesiones, historias, registeredFilters]);

  const sesionesActivas = useMemo(
    () => filteredSesiones.filter((sesion) => !isSesionAnulada(sesion)),
    [filteredSesiones]
  );

  const groupedSesiones = useMemo(() => {
    const activeHistories = historias.filter(isHistoriaActiva);
    const groups = new Map();

    activeHistories.forEach((historia) => {
      const paciente = historia.paciente || pacientes.find((item) => String(item.id) === String(historia.paciente_id));
      if (!paciente) return;
      const key = String(historia.paciente_id || paciente.id);
      if (!groups.has(key)) groups.set(key, { key, paciente, historias: [], sesiones: [] });
      groups.get(key).historias.push(historia);
    });

    sesionesActivas.forEach((sesion) => {
      const historia = sesion.historia_clinica || historias.find((item) => String(item.id) === String(sesion.historia_clinica_id));
      if (!historia || !isHistoriaActiva(historia)) return;
      const paciente = sesion.paciente || historia.paciente || pacientes.find((item) => String(item.id) === String(sesion.paciente_id || historia.paciente_id));
      if (!paciente) return;
      const key = String(historia.paciente_id || paciente.id);
      if (!groups.has(key)) groups.set(key, { key, paciente, historias: [historia], sesiones: [] });
      if (!groups.get(key).historias.some((item) => String(item.id) === String(historia.id))) groups.get(key).historias.push(historia);
      groups.get(key).sesiones.push(sesion);
    });

    return [...groups.values()]
      .map((group) => {
        const sesionesOrdenadas = [...group.sesiones].sort((a, b) =>
          String(b.fecha || '').localeCompare(String(a.fecha || '')) || Number(b.numero_sesion || 0) - Number(a.numero_sesion || 0)
        );
        const historiasOrdenadas = [...group.historias].sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || Number(b.id) - Number(a.id));
        const contratadas = historiasOrdenadas.reduce((sum, historia) => sum + Number(historia.evaluacion_final?.sesiones_contratadas || 0), 0) || Math.max(0, ...sesionesOrdenadas.map((sesion) => Number(sesion.sesiones_debe || 0)));
        const realizadas = sesionesOrdenadas.filter(isSesionRealizada).length;
        const montoTotal = sesionesOrdenadas.reduce((sum, sesion) => sum + montoSesion(sesion), 0);
        const pagado = sesionesOrdenadas.reduce((sum, sesion) => sum + montoPagado(sesion), 0);
        const saldo = sesionesOrdenadas.reduce((sum, sesion) => sum + saldoPendiente(sesion), 0);
        const estadoPago = saldo > 0 && pagado > 0 ? 'Parcial' : saldo > 0 ? 'Debe' : sesionesOrdenadas.length ? 'Pagado' : 'Pendiente';
        return {
          ...group,
          historias: historiasOrdenadas,
          historia: historiasOrdenadas[0],
          sesiones: sesionesOrdenadas,
          contratadas,
          realizadas,
          restantes: Math.max(contratadas - realizadas, 0),
          ultimaSesion: sesionesOrdenadas[0],
          montoTotal,
          pagado,
          saldo,
          estadoPago
        };
      })
      .filter((group) => {
        if (!registeredFilters.query.trim()) return group.sesiones.length > 0;
        const historyText = group.historias.map((historia) => `${historia.condicion_actual?.zona_cuerpo || ''} ${historia.motivo_consulta || ''} ${historia.profesional_cargo || ''}`).join(' ');
        const text = `${nombrePaciente(group.paciente)} ${group.paciente?.ci || ''} ${group.paciente?.telefono || group.paciente?.celular || ''} ${historyText}`;
        return matchesSearch(text, registeredFilters.query);
      })
      .sort((a, b) => String(b.ultimaSesion?.fecha || b.historia.fecha_evaluacion || '').localeCompare(String(a.ultimaSesion?.fecha || a.historia.fecha_evaluacion || '')));
  }, [historias, pacientes, sesionesActivas, registeredFilters.query]);

  const sessionFilterCounts = useMemo(() => {
    const visibleSessions = groupedSesiones.flatMap((group) =>
      group.sesiones.map((sesion) => ({ sesion, group }))
    );
    const counts = { todos: visibleSessions.length, asistio: 0, no_asistio: 0, pendiente: 0, evolutivo_pendiente: 0, evolutivo_registrado: 0 };
    visibleSessions.forEach(({ sesion, group }) => {
      const history = sesion.historia_clinica
        || group.historias.find((item) => String(item.id) === String(sesion.historia_clinica_id))
        || group.historia;
      if (counts[sesion.asistencia] !== undefined) counts[sesion.asistencia] += 1;
      if (sesion.asistencia === 'asistio') counts[sessionEvolution(history, sesion) ? 'evolutivo_registrado' : 'evolutivo_pendiente'] += 1;
    });
    return counts;
  }, [groupedSesiones]);

  const visibleGroups = useMemo(() => {
    const filtered = sessionFilter === 'todos' ? groupedSesiones : groupedSesiones.filter((group) => group.sesiones.some((sesion) => {
      const history = sesion.historia_clinica || group.historias.find((item) => String(item.id) === String(sesion.historia_clinica_id)) || group.historia;
      const evolution = sessionEvolution(history, sesion);
      if (sessionFilter === 'evolutivo_pendiente') return sesion.asistencia === 'asistio' && !evolution;
      if (sessionFilter === 'evolutivo_registrado') return Boolean(evolution);
      return sesion.asistencia === sessionFilter;
    }));
    return [...filtered].sort((a, b) => {
      if (registeredFilters.orderBy === 'nombre_asc') return nombrePaciente(a.paciente).localeCompare(nombrePaciente(b.paciente), 'es');
      if (registeredFilters.orderBy === 'nombre_desc') return nombrePaciente(b.paciente).localeCompare(nombrePaciente(a.paciente), 'es');
      if (registeredFilters.orderBy === 'sesiones_desc') return b.sesiones.length - a.sesiones.length;
      if (registeredFilters.orderBy === 'sesiones_asc') return a.sesiones.length - b.sesiones.length;
      const comparison = String(b.ultimaSesion?.fecha || '').localeCompare(String(a.ultimaSesion?.fecha || ''));
      return registeredFilters.orderBy === 'fecha_asc' ? -comparison : comparison;
    });
  }, [groupedSesiones, sessionFilter, registeredFilters.orderBy]);
  const paginatedGroups = visibleGroups.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); setExpandedGroupKey(null); }, [sessionFilter, registeredFilters.query, registeredFilters.dateFrom, registeredFilters.dateTo, registeredFilters.orderBy, pageSize]);
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(visibleGroups.length / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [visibleGroups.length, pageSize, page]);

  const validate = () => {
    if (!form.paciente_id) return 'Selecciona un paciente.';
    if (!form.historia_clinica_id) return 'Selecciona una historia clinica activa.';
    if (!form.fecha) return 'La fecha es obligatoria.';
    if (Number(form.sesiones_debe || 0) < 0) return 'Las sesiones contratadas no pueden ser negativas.';
    if (Number(form.sesiones_hizo || 0) < 0) return 'Las sesiones realizadas no pueden ser negativas.';
    if (Number(form.monto_sesion || 0) < 0) return 'El monto de la sesion no puede ser negativo.';
    if (Number(form.monto_pagado || 0) < 0) return 'El monto pagado no puede ser negativo.';
    if (form.asistencia === 'asistio' && !form.procedimiento) return 'Selecciona el procedimiento.';
    if (form.asistencia === 'asistio' && form.procedimiento === 'Otro' && !String(form.procedimiento_otro || '').trim()) return 'Especifica el procedimiento.';
    if (form.asistencia === 'asistio' && (form.dolor_despues === '' || form.dolor_despues == null)) return 'Registra el dolor final.';
    if (form.asistencia === 'asistio' && !String(form.descripcion_tratamiento || '').trim()) return 'Registra el procedimiento realizado.';
    if (form.estado_pago === 'Parcial' && !(Number(form.monto_pagado) > 0 && Number(form.monto_pagado) < Number(form.monto_sesion))) return 'El pago parcial debe ser mayor a cero y menor al monto de la sesión.';
    if (form.estado_pago === 'Sin costo' && !String(form.motivo_sin_costo || '').trim()) return 'Registra el motivo de la sesión sin costo.';
    if (form.aplica_farmacos && !form.farmacos?.length) return 'Agrega al menos un fármaco.';
    if (form.aplica_farmacos) {
      for (const [index, farmaco] of form.farmacos.entries()) {
        const nombre = farmaco.nombre === 'Otro' ? farmaco.nombre_otro : farmaco.nombre;
        const via = farmaco.via === 'Otra' ? farmaco.via_otro : farmaco.via;
        if (!String(nombre || '').trim()) return `Selecciona el nombre del fármaco ${index + 1}.`;
        if (!String(farmaco.presentacion_dosis || '').trim()) return `Registra la presentación o dosis del fármaco ${index + 1}.`;
        if (!String(via || '').trim()) return `Selecciona la vía del fármaco ${index + 1}.`;
        if (!(Number(farmaco.cantidad) > 0)) return `La cantidad del fármaco ${index + 1} debe ser mayor a cero.`;
        if (!String(farmaco.motivo_clinico || '').trim()) return `Registra el motivo clínico del fármaco ${index + 1}.`;
      }
      const keys = form.farmacos.map((farmaco) => `${farmaco.nombre === 'Otro' ? farmaco.nombre_otro : farmaco.nombre}|${farmaco.presentacion_dosis}|${farmaco.via === 'Otra' ? farmaco.via_otro : farmaco.via}`.toLocaleLowerCase('es-BO'));
      if (new Set(keys).size !== keys.length && !window.confirm('Hay medicamentos repetidos con la misma dosis y vía. ¿Confirma que desea registrarlos?')) return 'Revise los medicamentos duplicados.';
    }
    return '';
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    try {
      const payload = cleanPayload({
        ...form,
        metodo_pago: form.metodo_pago || (Number(form.monto_pagado || 0) > 0 ? 'Efectivo' : null),
        numero_sesion: Number(form.numero_sesion || 1),
        sesiones_debe: Number(form.sesiones_debe || 0),
        sesiones_hizo: Number(form.sesiones_hizo || 0),
        monto_sesion: Number(form.monto_sesion || 0),
        monto_pagado: Number(form.monto_pagado || 0),
        saldo_pendiente: Number(form.saldo_pendiente || 0)
      });
      if (editing) await updateSesion(editing, payload);
      else await createSesion(payload);
      setMessage(form.asistencia === 'asistio'
        ? form.aplica_farmacos
          ? 'La sesión, evolución clínica y administración de fármacos se registraron correctamente.'
          : 'La sesión y evolución clínica se registraron correctamente.'
        : 'La sesión se registró correctamente.');
      setForm(initialForm);
      setEditing(null);
      setShowFormModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const editSesion = (sesion, tab = 'session') => {
    const historia = sesion.historia_clinica || historias.find((item) => String(item.id) === String(sesion.historia_clinica_id));
    const evolution = sessionEvolution(historia, sesion);
    const dolorInicialGuardado = sesion.dolor_antes ?? evolution?.dolor_inicial
      ?? (Number(sesion.numero_sesion || 1) === 1 ? historia?.intervencion_clinica?.escala_dolor : '');
    const dolorFinalGuardado = sesion.dolor_despues ?? evolution?.dolor_final ?? '';
    setFormTab(tab);
    setEditing(sesion.id);
    setForm({
      paciente_id: sesion.paciente_id || sesion.paciente?.id || '',
      historia_clinica_id: sesion.historia_clinica_id || sesion.historia_clinica?.id || '',
      fecha: sesion.fecha || boliviaDate(),
      numero_sesion: sesion.numero_sesion || 1,
      sesiones_debe: sesion.sesiones_debe || 0,
      sesiones_hizo: sesion.sesiones_hizo || 0,
      asistencia: sesion.asistencia || 'pendiente',
      metodo_pago: sesion.metodo_pago || '',
      estado_pago: sesion.estado_pago || 'Pendiente',
      monto_sesion: sesion.monto_sesion || '',
      monto_pagado: sesion.monto_pagado || '',
      saldo_pendiente: sesion.saldo_pendiente || saldoPendiente(sesion),
      aplica_farmacos: Boolean(sesion.aplica_farmacos),
      farmacos: Array.isArray(sesion.farmacos) ? sesion.farmacos.map((farmaco) => ({
        id: farmaco.id,
        fecha_creacion: farmaco.fecha_creacion,
        nombre: farmaco.tipo === 'Otro' ? 'Otro' : farmaco.nombre,
        nombre_otro: farmaco.tipo === 'Otro' ? farmaco.nombre : '',
        presentacion_dosis: farmaco.presentacion_dosis || '',
        via: farmaco.tipo_via === 'Otra' ? 'Otra' : farmaco.via,
        via_otro: farmaco.tipo_via === 'Otra' ? farmaco.via : '',
        cantidad: farmaco.cantidad || 1,
        motivo_clinico: farmaco.motivo_clinico || '',
        observacion: farmaco.observacion || ''
      })) : [],
      observacion_farmacos: sesion.observacion_farmacos || '',
      observacion_pago: sesion.observacion_pago || '',
      motivo_sin_costo: sesion.motivo_sin_costo || '',
      procedimiento: sesion.procedimiento || '',
      procedimiento_otro: sesion.procedimiento_otro || '',
      medios_fisicos: sesion.medios_fisicos || '',
      tecnicas_manuales: sesion.tecnicas_manuales || '',
      descripcion_tratamiento: sesion.descripcion_tratamiento || '',
      evolucion_observada: sesion.evolucion_observada || '',
      dolor_antes: dolorInicialGuardado,
      dolor_despues: dolorFinalGuardado,
      inyectable_nombre: sesion.inyectable_nombre || '',
      inyectable_dosis: sesion.inyectable_dosis || '',
      profesional_responsable: sesion.profesional_responsable || '',
      observacion: sesion.observacion || ''
    });
    setShowFormModal(true);
  };

  useEffect(() => {
    const sesionId = location.state?.editarSesionId || location.state?.verSesionId;
    if (!sesionId || !sesiones.length) return;

    const sesion = sesiones.find((item) => String(item.id) === String(sesionId));
    if (sesion) {
      if (location.state?.verSesionId) setSelectedSesion(sesion);
      else editSesion(sesion, 'evolution');
    }
    navigate('/sesiones', { replace: true, state: null });
  }, [sesiones, location.state, navigate]);

  const openNuevaSesion = () => {
    setFormTab('session');
    setEditing(null);
    setForm({
      ...initialForm,
      fecha: boliviaDate(),
      profesional_responsable: profesionalActual,
      dolor_antes: '',
      dolor_despues: '',
      descripcion_tratamiento: '',
      evolucion_observada: '',
      observacion: '',
      aplica_farmacos: false,
      farmacos: []
    });
    setError('');
    setShowFormModal(true);
  };

  const openNuevaSesionGrupo = (group) => {
    const historia = group.historia;
    const sesionesHistoria = group.sesiones.filter((sesion) =>
      String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(historia.id)
    );
    const realizadas = sesionesHistoria.filter(isSesionRealizada).length;
    const contratadas = Number(historia.evaluacion_final?.sesiones_contratadas || 0);
    if (contratadas > 0 && realizadas >= contratadas) {
      setMessage(`El paciente ya completó las ${contratadas} sesiones contratadas para esta historia clínica.`);
      setShowFormModal(false);
      return;
    }
    setFormTab('session');
    setEditing(null);
    setForm({
      ...initialForm,
      profesional_responsable: profesionalActual,
      paciente_id: group.paciente.id,
      historia_clinica_id: historia.id,
      numero_sesion: realizadas + 1,
      dolor_antes: dolorInicialParaHistoria(historia, sesionesHistoria),
      // El dolor final pertenece exclusivamente a esta nueva sesión.
      // Nunca debe heredarse de una sesión previamente abierta o editada.
      dolor_despues: '',
      descripcion_tratamiento: '',
      evolucion_observada: '',
      observacion: '',
      aplica_farmacos: false,
      farmacos: [],
      sesiones_debe: contratadas,
      sesiones_hizo: realizadas + 1
    });
    setError('');
    setShowFormModal(true);
  };

  const openNuevaSesionPendiente = (group) => {
    const historiaPendiente = nextIncompleteHistory(group.historias, group.sesiones);
    if (!historiaPendiente) {
      setMessage('El paciente ya completó las sesiones de todas sus historias clínicas activas.');
      return;
    }
    openNuevaSesionGrupo({ ...group, historia: historiaPendiente });
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setFormTab('session');
    setEditing(null);
    setForm(initialForm);
    setError('');
  };

  const toggleGroup = (key) => {
    setExpandedGroups((current) => ({ ...current, [key]: !current[key] }));
  };

  const openAnnulModal = async (sesion) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar sesión?',
      text: 'Esta sesión dejará de mostrarse y no será tomada en cuenta en los contadores ni en el progreso del tratamiento.',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Eliminar sesión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#64748B'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteSesion(sesion.id, { motivo_anulacion: 'Eliminación de sesión', observacion_anulacion: 'Eliminada desde Sesiones registradas' });
      await load();
      await Swal.fire({ icon: 'success', title: 'Sesión eliminada correctamente.', confirmButtonColor: '#0F766E' });
    } catch (err) {
      setError(err.message);
    }
  };

  const closeAnnulModal = () => {
    setAnnulSesion(null);
    setAnnulForm({ motivo_anulacion: '', observacion_anulacion: '' });
  };

  const submitAnnul = async (event) => {
    event.preventDefault();
    if (!annulForm.motivo_anulacion) {
      setError('Selecciona el motivo de anulacion.');
      return;
    }
    try {
      await deleteSesion(annulSesion.id, annulForm);
      closeAnnulModal();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEvolution = (group, session) => {
    const history = session.historia_clinica || group.historias.find((item) => String(item.id) === String(session.historia_clinica_id)) || group.historia;
    const currentEvolution = sessionEvolution(history, session);
    const previous = (Array.isArray(history.evolutivo) ? history.evolutivo : [])
      .filter((item) => item.estado !== 'anulado' && String(item.sesion_id || '') !== String(session.id) && Number(item.numero_sesion || item.numero || 0) < Number(session.numero_sesion || 0))
      .sort((a, b) => Number(a.numero_sesion || a.numero || 0) - Number(b.numero_sesion || b.numero || 0));
    const lastEvolution = previous.at(-1);
    const initialPain = currentEvolution?.dolor_inicial ?? session.dolor_antes ?? lastEvolution?.dolor_final ?? history.intervencion_clinica?.escala_dolor ?? '';
    setEvolutionTarget({ group, session, history, evolution: currentEvolution });
    setEvolutionForm({
      dolor_inicial: initialPain,
      dolor_final: currentEvolution?.dolor_final ?? session.dolor_despues ?? '',
      aplicacion: currentEvolution?.aplicacion || currentEvolution?.procedimiento_realizado || session.descripcion_tratamiento || '',
      observaciones: currentEvolution?.observaciones || session.evolucion_observada || session.observacion || '',
      inyectables: currentEvolution?.inyectables || session.inyectable_nombre || ''
    });
  };

  const saveEvolution = async (event) => {
    event.preventDefault();
    if (!evolutionTarget) return;
    const { session } = evolutionTarget;
    try {
      await updateSesion(session.id, {
        dolor_antes: evolutionForm.dolor_inicial,
        dolor_despues: evolutionForm.dolor_final,
        descripcion_tratamiento: evolutionForm.aplicacion,
        evolucion_observada: evolutionForm.observaciones,
        observacion: evolutionForm.observaciones,
        aplica_farmacos: Boolean(evolutionForm.inyectables),
        inyectable_nombre: evolutionForm.inyectables
      });
      setEvolutionTarget(null);
      setMessage(evolutionTarget.evolution ? 'Evolución actualizado correctamente.' : 'Evolución registrado correctamente.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="module-hero">
          <div>
            <p className="text-sm font-bold text-brand-50">Atención diaria</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Sesiones</h2>
            <span className="mt-2 block text-sm text-brand-50">Registro diario de atenciones, asistencia, pagos y evolución por paciente.</span>
          </div>
          <CalendarDays size={42} className="self-center text-brand-50" />
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      <div className="panel">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Sesiones registradas</h3>
            <p className="text-sm text-slate-500">Control diario por paciente.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">
              {viewMode === 'agrupado' ? groupedSesiones.length : sesionesActivas.length} resultados
            </span>
            <Button onClick={openNuevaSesion}>
              <PlusCircle size={17} />
              Nueva sesión
            </Button>
          </div>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_170px_170px_auto_230px]">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Buscar</span>
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Search size={17} className="shrink-0 text-slate-500" />
              <input
                className="w-full border-0 bg-transparent p-0 text-sm text-ink shadow-none placeholder:text-slate-400 focus:ring-0"
                value={registeredFilters.query}
                onChange={(event) => setRegisteredFilters({ ...registeredFilters, query: event.target.value })}
                placeholder="Buscar paciente, historia clínica, pago u observación..."
              />
            </span>
          </label>
          <Input compact label="Fecha desde" type="date" value={registeredFilters.dateFrom} onChange={(event) => setRegisteredFilters({ ...registeredFilters, dateFrom: event.target.value, dateTo: registeredFilters.dateTo || event.target.value })} />
          <Input compact label="Fecha hasta" type="date" min={registeredFilters.dateFrom || undefined} value={registeredFilters.dateTo} onChange={(event) => setRegisteredFilters({ ...registeredFilters, dateTo: event.target.value })} />
          <Button className="self-end" variant="secondary" onClick={() => setRegisteredFilters({ ...registeredFilters, dateFrom: '', dateTo: '' })}><CalendarDays size={16} />Limpiar fecha</Button>
          <Input
            label="Ordenar"
            value={registeredFilters.orderBy}
            onChange={(event) => setRegisteredFilters({ ...registeredFilters, orderBy: event.target.value })}
            options={[
              { value: 'fecha_desc', label: 'Fecha reciente primero' },
              { value: 'fecha_asc', label: 'Fecha antigua primero' },
              { value: 'nombre_asc', label: 'Paciente A-Z' },
              { value: 'nombre_desc', label: 'Paciente Z-A' },
              { value: 'sesiones_desc', label: 'Mayor número de sesiones' },
              { value: 'sesiones_asc', label: 'Menor número de sesiones' }
            ]}
          />
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ['todos', 'Todos'], ['asistio', 'Asistió'], ['no_asistio', 'Faltó'], ['pendiente', 'Pendiente'],
            ['evolutivo_pendiente', 'Evolución pendiente'], ['evolutivo_registrado', 'Evolución registrada']
          ].map(([value, label]) => <button key={value} type="button" onClick={() => { setSessionFilter(value); setExpandedGroupKey(null); }} className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${sessionFilter === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'}`}>{label} <span className="ml-1 opacity-75">{sessionFilterCounts[value]}</span></button>)}
        </div>
        <div className="hidden mb-4 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {[
            ['agrupado', 'Agrupado'],
            ['listado', 'Listado']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setViewMode(value)}
              className={`min-h-10 rounded-lg px-4 text-sm font-black transition ${
                viewMode === value ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-100' : 'text-slate-500 hover:text-brand-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {viewMode === 'accordion' && <SesionesPacienteAccordion
          groups={paginatedGroups}
          expandedKey={expandedGroupKey}
          onToggle={(key) => setExpandedGroupKey((current) => current === key ? null : key)}
          onViewHistory={setSelectedHistoria}
          onNewSession={openNuevaSesionGrupo}
          onViewSession={setSelectedSesion}
          onEditSession={editSesion}
          onAnnulSession={isAdmin ? openAnnulModal : null}
          onRegisterEvolution={openEvolution}
          onViewEvolution={(group, session, evolution) => setEvolutionDetail({ group, session, evolution })}
        />}
        {viewMode === 'accordion' && <Pagination total={visibleGroups.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}

        {viewMode === 'agrupado' && (
          <div className="grid gap-4">
            {groupedSesiones.map((group) => {
              const expanded = Boolean(expandedGroups[group.key]);
              const pacienteEstado = group.paciente?.estado || 'Activo';
              const telefono = group.paciente?.telefono || group.paciente?.celular || group.paciente?.telefono_referencia || 'Sin dato';
              const zona = group.historia.condicion_actual?.zona_cuerpo || group.historia.motivo_consulta || group.historia.diagnostico_medico || 'Sin detalle';
              const profesional = group.historia.profesional_cargo || group.historia.usuario?.ficha_personal?.nombre_mostrado || group.historia.usuario?.nombre || 'Sin profesional';
              const progress = group.contratadas > 0 ? Math.min((group.realizadas / group.contratadas) * 100, 100) : 0;
              const paymentTone = group.estadoPago === 'Pagado'
                ? estadoPagoTone.Pagado
                : group.estadoPago === 'Parcial'
                  ? estadoPagoTone.Parcial
                  : estadoPagoTone.Pendiente;

              return (
                <article key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                  <div className="p-4 md:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-700 text-base font-black text-white shadow-sm">
                              {initialsOf(group.paciente)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="truncate text-lg font-black uppercase text-slate-900">{nombrePaciente(group.paciente)}</h4>
                                <Badge tone="bg-emerald-50 text-emerald-700 ring-emerald-200">{String(pacienteEstado).toUpperCase()}</Badge>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                                <span className="inline-flex items-center gap-1"><IdCard size={14} /> CI: {group.paciente?.ci || 'Sin dato'}</span>
                                <span className="inline-flex items-center gap-1"><Phone size={14} /> TEL: {telefono}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 rounded-xl border border-brand-100 bg-brand-50/40 p-3 text-sm text-slate-700">
                          <span className="font-bold text-slate-900">
                            Historia clínica: {formatDate(group.historia.fecha_evaluacion)} - {zona}
                          </span>
                          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <Stethoscope size={15} className="text-brand-700" />
                            Profesional: {profesional}
                          </span>
                        </div>

                        <div className="mt-4">
                          <div className="mb-1 flex items-center justify-between text-xs font-black uppercase text-slate-500">
                            <span>{group.realizadas} de {group.contratadas} sesiones realizadas</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <StatPill icon={Activity} label="Sesiones" value={`${group.realizadas} / ${group.contratadas}`} tone="bg-emerald-50 text-emerald-800 ring-emerald-100" />
                        <StatPill icon={CalendarSync} label="Restantes" value={group.restantes} tone="bg-cyan-50 text-cyan-800 ring-cyan-100" />
                        <StatPill icon={CalendarDays} label="Última sesión" value={group.ultimaSesion ? formatDate(group.ultimaSesion.fecha) : 'Sin sesiones'} tone="bg-blue-50 text-blue-800 ring-blue-100" />
                        {isAdmin && <StatPill icon={CreditCard} label="Pago / saldo" value={`${group.estadoPago} · ${formatMoney(group.saldo)}`} tone={group.saldo > 0 ? 'bg-amber-50 text-amber-800 ring-amber-100' : 'bg-emerald-50 text-emerald-800 ring-emerald-100'} />}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                      <StatPill icon={ClipboardList} label="Registradas" value={group.sesiones.length} />
                      <StatPill icon={Eye} label="Última asistencia" value={group.ultimaSesion ? labelAsistencia(group.ultimaSesion.asistencia) : 'Sin dato'} tone={group.ultimaSesion ? asistenciaTone[group.ultimaSesion.asistencia] || asistenciaTone.pendiente : 'bg-slate-50 text-slate-700 ring-slate-200'} />
                      {isAdmin && <StatPill icon={CreditCard} label="Estado pago" value={group.estadoPago} tone={paymentTone} />}
                      {isAdmin && <StatPill icon={CreditCard} label="Total" value={formatMoney(group.montoTotal)} />}
                      {isAdmin && <StatPill icon={CreditCard} label="Pagado" value={formatMoney(group.pagado)} tone="bg-emerald-50 text-emerald-800 ring-emerald-100" />}
                      {isAdmin && <StatPill icon={CreditCard} label="Saldo" value={formatMoney(group.saldo)} tone={group.saldo > 0 ? 'bg-amber-50 text-amber-800 ring-amber-100' : 'bg-slate-50 text-slate-700 ring-slate-200'} />}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <Button variant="secondary" onClick={() => toggleGroup(group.key)}>
                        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                        {expanded ? 'Ocultar sesiones' : 'Ver sesiones'}
                      </Button>
                      <Button variant="ghost" disabled={!nextIncompleteHistory(group.historias, group.sesiones)} onClick={() => openNuevaSesionPendiente(group)}>
                        <PlusCircle size={17} />
                        {nextIncompleteHistory(group.historias, group.sesiones) ? 'Completar sesión pendiente' : 'Sesiones completadas'}
                      </Button>
                      <Button variant="ghost" onClick={() => setSelectedHistoria(group.historia)}>
                        <ClipboardList size={17} />
                        Ver historia
                      </Button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-brand-100 bg-brand-50/35 p-3 md:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h5 className="text-sm font-black text-brand-900">Sesiones registradas - {zona}</h5>
                        <Button variant="ghost" onClick={() => toggleGroup(group.key)}>
                          <ChevronUp size={17} />
                          Ocultar sesiones
                        </Button>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="min-w-[980px] w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500">
                            <tr>
                              {(isAdmin
                                ? ['Sesión', 'Fecha', 'Asistencia', 'Método', 'Estado pago', 'Monto', 'Pagado', 'Saldo', 'Fármacos', 'Observación clínica', 'Acciones']
                                : ['Sesión', 'Fecha', 'Asistencia', 'Fármacos', 'Observación clínica', 'Acciones']
                              ).map((head) => (
                                <th key={head} className="px-3 py-2">{head}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.sesiones.map((sesion) => (
                              <tr key={sesion.id} className="align-top hover:bg-slate-50/80">
                                <td className="px-3 py-2 font-black text-slate-800">#{sesion.numero_sesion || 1}</td>
                                <td className="px-3 py-2 font-semibold text-slate-700">{formatDate(sesion.fecha)}</td>
                                <td className="px-3 py-2"><Badge tone={asistenciaTone[sesion.asistencia] || asistenciaTone.pendiente}>{labelAsistencia(sesion.asistencia)}</Badge></td>
                                {isAdmin && <td className="px-3 py-2"><Badge tone={pagoTone[sesion.metodo_pago] || pagoTone.Pendiente}>{sesion.metodo_pago}</Badge></td>}
                                {isAdmin && <td className="px-3 py-2"><Badge tone={estadoPagoTone[sesion.estado_pago] || estadoPagoTone.Pendiente}>{sesion.estado_pago || 'Pendiente'}</Badge></td>}
                                {isAdmin && <td className="px-3 py-2 font-semibold text-slate-700">{formatMoney(montoSesion(sesion))}</td>}
                                {isAdmin && <td className="px-3 py-2 font-semibold text-emerald-700">{formatMoney(montoPagado(sesion))}</td>}
                                {isAdmin && <td className="px-3 py-2 font-semibold text-amber-700">{formatMoney(saldoPendiente(sesion))}</td>}
                                <td className="px-3 py-2">{sesion.aplica_farmacos ? 'Sí' : 'No'}</td>
                                <td className="max-w-[220px] px-3 py-2 text-slate-600">{sesion.observacion || 'Sin observación'}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1.5">
                                    <ActionButton label="Ver sesión" icon={Eye} tone="view" className="h-9 w-9" onClick={() => setSelectedSesion(sesion)} />
                                    <ActionButton label="Editar sesión" icon={FilePenLine} tone="edit" className="h-9 w-9" onClick={() => editSesion(sesion)} />
                                    {isAdmin && <ActionButton label="Anular sesión" icon={Trash2} tone="delete" className="h-9 w-9" onClick={() => openAnnulModal(sesion)} />}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            {groupedSesiones.length === 0 && <p className="empty-state">No hay sesiones activas para mostrar en la vista agrupada.</p>}
          </div>
        )}

        {viewMode === 'listado' && <div className="hidden md:block">
          <Table
          columns={[
            'Paciente', 'Historia clínica', 'Fecha', 'Registrado por', 'Contratadas', 'Realizadas', 'Restantes', 'Asistencia',
            ...(isAdmin ? ['Pago'] : []),
            'Fármacos', 'Observación clínica', 'Acciones'
          ]}
          rows={sesionesActivas.map((sesion) => {
            const restantes = Math.max(Number(sesion.sesiones_debe || 0) - Number(sesion.sesiones_hizo || 0), 0);
            const historia = sesion.historia_clinica || historias.find((item) => String(item.id) === String(sesion.historia_clinica_id));
            const historiaLabel = historia
              ? `${formatDate(historia.fecha_evaluacion)} - ${historia.condicion_actual?.zona_cuerpo || historia.motivo_consulta || historia.diagnostico_medico || 'Historia clínica'}`
              : 'Sin historia';
            return [
              nombrePaciente(sesion.paciente),
              historiaLabel,
              formatDate(sesion.fecha),
              sesion.registrado_por?.nombre || 'Registro anterior',
              sesion.sesiones_debe,
              sesion.sesiones_hizo,
              <span className={restantes === 0 && Number(sesion.sesiones_debe || 0) > 0 ? 'font-bold text-amber-700' : 'font-bold text-brand-700'}>{restantes}</span>,
              <Badge tone={asistenciaTone[sesion.asistencia] || asistenciaTone.pendiente}>{labelAsistencia(sesion.asistencia)}</Badge>,
              ...(isAdmin ? [<div className="grid gap-1">
                <Badge tone={pagoTone[sesion.metodo_pago] || pagoTone.Pendiente}>{sesion.metodo_pago}</Badge>
                <Badge tone={estadoPagoTone[sesion.estado_pago] || estadoPagoTone.Pendiente}>{sesion.estado_pago || 'Pendiente'}</Badge>
              </div>] : []),
              <Badge tone={sesion.aplica_farmacos ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>
                {sesion.aplica_farmacos ? 'Sí' : 'No'}
              </Badge>,
              sesion.observacion || 'Sin observación',
              <div className="flex gap-2">
                <ActionButton label="Ver sesión" icon={Eye} tone="view" onClick={() => setSelectedSesion(sesion)} />
                <ActionButton label="Editar sesión" icon={FilePenLine} tone="edit" onClick={() => editSesion(sesion)} />
                {isAdmin && <ActionButton label="Anular sesión" icon={Trash2} tone="delete" onClick={() => openAnnulModal(sesion)} />}
              </div>
            ];
          })}
          empty="No hay sesiones registradas."
          />
        </div>}
        {viewMode === 'listado' && <div className="grid gap-3 md:hidden">
          {sesionesActivas.map((sesion) => {
            const restantes = Math.max(Number(sesion.sesiones_debe || 0) - Number(sesion.sesiones_hizo || 0), 0);
            return (
              <article key={sesion.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-sm text-slate-900">{nombrePaciente(sesion.paciente)}</strong>
                    <span className="mt-1 block text-xs text-slate-500">{formatDate(sesion.fecha)} · Sesión #{sesion.numero_sesion || 1}</span>
                    <span className="mt-1 block text-xs font-semibold text-brand-700">Registrado por: {sesion.registrado_por?.nombre || 'Registro anterior'}</span>
                  </div>
                  <Badge tone={asistenciaTone[sesion.asistencia] || asistenciaTone.pendiente}>{labelAsistencia(sesion.asistencia)}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[['Contratadas', sesion.sesiones_debe], ['Realizadas', sesion.sesiones_hizo], ['Restantes', restantes]].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-2">
                      <span className="block text-[11px] font-bold text-slate-400">{label}</span>
                      <strong className="text-lg text-slate-800">{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1">
                    {isAdmin && <Badge tone={pagoTone[sesion.metodo_pago] || pagoTone.Pendiente}>{sesion.metodo_pago}</Badge>}
                    <Badge tone={sesion.aplica_farmacos ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>
                      Fármacos: {sesion.aplica_farmacos ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                  <span className="truncate text-xs text-slate-500">{sesion.observacion || 'Sin observación clínica'}</span>
                </div>
                <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <ActionButton label="Ver sesión" icon={Eye} tone="view" className="h-9 w-9" onClick={() => setSelectedSesion(sesion)} />
                  <ActionButton label="Editar sesión" icon={FilePenLine} tone="edit" className="h-9 w-9" onClick={() => editSesion(sesion)} />
                  {isAdmin && <ActionButton label="Anular sesión" icon={Trash2} tone="delete" className="h-9 w-9" onClick={() => openAnnulModal(sesion)} />}
                </div>
              </article>
            );
          })}
          {sesionesActivas.length === 0 && <p className="empty-state">No hay sesiones registradas.</p>}
        </div>}
      </div>

      <Modal
        open={showFormModal}
        title={editing ? 'Editar sesión' : 'Nueva sesión'}
        subtitle={form.cita_id ? `Sesión programada encontrada · Sesión ${form.numero_sesion} · ${form.fecha}` : 'Registra la atención diaria del paciente y actualiza automáticamente su resumen semanal.'}
        onClose={closeFormModal}
        size="sessions"
      >
        <SesionForm form={form} setForm={setForm} pacientes={pacientes} historias={historias} sesiones={sesiones} programaciones={programaciones} editing={editing} initialTab={formTab} onSubmit={submit} onCancel={closeFormModal} error={error} canEditDate={form.cita_id ? false : isAdmin} canViewFinancial={isAdmin} />
      </Modal>

      <Modal open={Boolean(evolutionTarget)} title={evolutionTarget?.evolution ? 'Editar evolución' : 'Registrar evolución'} subtitle={evolutionTarget ? `${nombrePaciente(evolutionTarget.group.paciente)} · Sesión N.º ${evolutionTarget.session.numero_sesion} · ${formatDate(evolutionTarget.session.fecha)}` : ''} onClose={() => setEvolutionTarget(null)} size="sessions">
        {evolutionTarget && <form onSubmit={saveEvolution} className="grid gap-4"><div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-800"><strong>{evolutionTarget.history.condicion_actual?.zona_cuerpo || evolutionTarget.history.motivo_consulta || 'Historia clínica activa'}</strong><span className="ml-2">Paciente, historia, sesión y fecha vinculados automáticamente.</span></div><div className="grid gap-3 sm:grid-cols-2"><Input label="Dolor inicial (desde historia clínica)" type="number" min="0" max="10" value={evolutionForm.dolor_inicial} readOnly /><Input label="Dolor final (0-10)" type="number" min="0" max="10" value={evolutionForm.dolor_final} onChange={(event) => setEvolutionForm({ ...evolutionForm, dolor_final: event.target.value })} required /></div><p className="-mt-2 text-[11px] text-slate-500">El dolor inicial se obtiene automáticamente del última evolución o de la evaluación de la historia clínica.</p><Input label="Procedimiento realizado" value={evolutionForm.aplicacion} onChange={(event) => setEvolutionForm({ ...evolutionForm, aplicacion: event.target.value.toLocaleUpperCase('es-BO') })} multiline required /><Input label="Observaciones" value={evolutionForm.observaciones} onChange={(event) => setEvolutionForm({ ...evolutionForm, observaciones: event.target.value.toLocaleUpperCase('es-BO') })} multiline /><Input label="Inyectables (opcional)" value={evolutionForm.inyectables} onChange={(event) => setEvolutionForm({ ...evolutionForm, inyectables: event.target.value.toLocaleUpperCase('es-BO') })} /><div className="flex justify-end gap-2 border-t border-slate-200 pt-3"><Button variant="ghost" onClick={() => setEvolutionTarget(null)}>Cancelar</Button><Button type="submit">{evolutionTarget.evolution ? 'Actualizar evolución' : 'Guardar evolución'}</Button></div></form>}
      </Modal>

      <Modal open={Boolean(evolutionDetail)} title="Detalle de la evolución" subtitle={evolutionDetail ? `${nombrePaciente(evolutionDetail.group.paciente)} · Sesión N.º ${evolutionDetail.session.numero_sesion} · ${formatDate(evolutionDetail.session.fecha)}` : ''} onClose={() => setEvolutionDetail(null)} size="sessions">
        {evolutionDetail && <div className="grid gap-3"><div className="grid gap-3 sm:grid-cols-2"><Detail label="Dolor inicial" value={`${evolutionDetail.session.dolor_antes ?? evolutionDetail.evolution.dolor_inicial ?? '-'} / 10`} /><Detail label="Dolor final" value={`${evolutionDetail.session.dolor_despues ?? evolutionDetail.evolution.dolor_final ?? '-'} / 10`} /></div><Detail label="Procedimiento realizado" value={evolutionDetail.session.descripcion_tratamiento || [evolutionDetail.session.medios_fisicos, evolutionDetail.session.tecnicas_manuales].filter(Boolean).join(' · ') || evolutionDetail.evolution.aplicacion || evolutionDetail.evolution.procedimiento_realizado} /><Detail label="Observaciones" value={evolutionDetail.session.evolucion_observada || evolutionDetail.session.observacion || evolutionDetail.evolution.observaciones} /><Detail label="Inyectables utilizados" value={[evolutionDetail.session.inyectable_nombre, evolutionDetail.session.inyectable_dosis].filter(Boolean).join(' · ') || evolutionDetail.evolution.inyectables} /></div>}
      </Modal>

      <Modal open={Boolean(selectedSesion)} title="Detalle de la sesión" subtitle={selectedSesion ? `Sesión N.º ${selectedSesion.numero_sesion || 1} · ${formatDate(selectedSesion.fecha)}` : ''} onClose={() => setSelectedSesion(null)} size="lg">
        {selectedSesion && (() => {
          const contratadas = Number(selectedSesion.sesiones_debe || 0);
          const realizadas = Number(selectedSesion.sesiones_hizo || 0);
          const restantes = Math.max(contratadas - realizadas, 0);
          const completado = contratadas > 0 && restantes === 0;
          return <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <section className="session-detail-card">
                <h3><IdCard size={19} />Paciente</h3>
                <div className="session-detail-row"><span className="grid h-10 w-10 place-items-center rounded-full bg-teal-50 font-black text-teal-700">{initialsOf(selectedSesion.paciente)}</span><span><small>Nombre completo</small><strong>{nombrePaciente(selectedSesion.paciente)}</strong></span></div>
                <div className="session-detail-row"><span className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-500"><Stethoscope size={18} /></span><span><small>Registrado por</small><strong>{selectedSesion.profesional_responsable || selectedSesion.registrado_por?.nombre || 'Registro anterior'}</strong></span></div>
              </section>
              <section className="session-detail-card">
                <h3><CalendarDays size={19} />Sesiones</h3>
                <div className="grid grid-cols-3 gap-2">{[['Contratadas', contratadas], ['Realizadas', realizadas], ['Restantes', restantes]].map(([label, value]) => <div key={label} className={`rounded-xl p-3 text-center ${label === 'Realizadas' ? 'border border-teal-300 bg-teal-50' : 'bg-slate-50'}`}><strong className="block text-2xl text-teal-800">{value}</strong><small className="text-[10px] font-bold uppercase text-slate-500">{label}</small></div>)}</div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm"><span className="text-slate-500">Asistencia</span><Badge tone={asistenciaTone[selectedSesion.asistencia] || asistenciaTone.pendiente}>{labelAsistencia(selectedSesion.asistencia)}</Badge></div>
                <Detail label="Procedimiento" value={selectedSesion.procedimiento === 'Otro' ? selectedSesion.procedimiento_otro || 'Otro' : selectedSesion.procedimiento} />
              </section>
              {isAdmin && <section className="session-detail-card">
                <h3><CreditCard size={19} />Detalle de pago</h3>
                <div className="grid grid-cols-2 gap-2"><Detail label="Método" value={selectedSesion.metodo_pago} /><Detail label="Estado" value={selectedSesion.estado_pago} /><Detail label="Monto sesión" value={formatMoney(montoSesion(selectedSesion))} /><Detail label="Monto pagado" value={formatMoney(montoPagado(selectedSesion))} /></div>
                <div className="flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50 p-3"><span className="text-xs font-semibold text-teal-700">Saldo pendiente</span><strong className="text-lg text-emerald-700">{formatMoney(saldoPendiente(selectedSesion))}</strong></div>
              </section>}
              <section className="session-detail-card">
                <h3><Activity size={19} />Estado clínico</h3>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3"><span className="text-sm text-slate-500">Fármacos</span><Badge tone={selectedSesion.aplica_farmacos ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>{selectedSesion.aplica_farmacos ? 'Sí aplica' : 'No aplica'}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Estado</span><Badge tone={completado ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}>{completado ? 'Completado' : 'En tratamiento'}</Badge></div>
                <div className="rounded-lg border-l-4 border-l-teal-500 bg-slate-50 p-3"><small className="block text-[10px] font-black uppercase text-slate-500">Observación clínica</small><p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-700">{selectedSesion.observacion || selectedSesion.evolucion_observada || 'Sin observación registrada'}</p></div>
              </section>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800"><span className="flex items-center gap-2"><CalendarSync size={17} />Esta atención está sincronizada con Sesiones Semanales.</span><Button variant="ghost" onClick={() => { setSelectedSesion(null); editSesion(selectedSesion); }}><FilePenLine size={16} />Editar sesión</Button></div>
          </div>;
        })()}
      </Modal>

      <Modal open={Boolean(selectedHistoria)} title="Historia clínica relacionada" subtitle="Resumen de la historia asociada a estas sesiones." onClose={() => setSelectedHistoria(null)} size="compact">
        {selectedHistoria && (
          <div className="grid gap-5">
            <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [CalendarDays, 'Fecha', formatDate(selectedHistoria.fecha_evaluacion)],
                [Activity, 'Estado', selectedHistoria.estado || 'Activa'],
                [Stethoscope, 'Profesional', selectedHistoria.profesional_cargo || selectedHistoria.usuario?.nombre || 'Sin dato'],
                [ClipboardList, 'Sesiones indicadas', selectedHistoria.evaluacion_final?.sesiones_contratadas ?? 0]
              ].map(([Icon, label, value], index) => (
                <div key={label} className={`flex min-w-0 gap-3 px-4 py-4 ${index ? 'border-t border-slate-200 sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'sm:border-t lg:border-t-0' : ''}`}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Icon size={18} /></span>
                  <div className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span>{label === 'Estado' ? <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black capitalize text-emerald-700">{value}</span> : <strong className="mt-1 block text-sm font-bold leading-snug text-slate-800">{value}</strong>}</div>
                </div>
              ))}
            </section>
            <section><h3 className="mb-2 flex items-center gap-2 text-sm font-black text-emerald-800"><ClipboardList size={17} />Resumen clínico</h3><div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-2"><div className="px-5 py-4 md:border-r md:border-slate-200"><span className="block text-xs font-semibold text-slate-500">Zona / motivo</span><strong className="mt-1 block text-sm uppercase text-slate-800">{selectedHistoria.condicion_actual?.zona_cuerpo || selectedHistoria.motivo_consulta || 'Sin dato'}</strong></div><div className="border-t border-slate-200 px-5 py-4 md:border-t-0"><span className="block text-xs font-semibold text-slate-500">Diagnóstico médico</span><strong className="mt-1 block text-sm uppercase text-slate-800">{selectedHistoria.diagnostico_medico || 'Sin dato'}</strong></div></div></section>
            <section><h3 className="mb-2 flex items-center gap-2 text-sm font-black text-emerald-800"><ClipboardList size={17} />Plan de tratamiento</h3><div className="min-h-14 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700">{selectedHistoria.evaluacion_final?.plan_tratamiento || 'Sin dato'}</div></section>
            <section><h3 className="mb-2 flex items-center gap-2 text-sm font-black text-emerald-800"><Activity size={17} />Diagnóstico kinésico</h3><div className="min-h-14 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700">{selectedHistoria.evaluacion_final?.diagnostico_kinesico_cif || 'Sin dato'}</div></section>
            <footer className="-mx-4 -mb-4 flex justify-end border-t border-slate-200 bg-white px-4 py-4"><Button variant="ghost" className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => setSelectedHistoria(null)}>Cerrar</Button></footer>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(annulSesion)} title="Anular sesión" subtitle="Esta acción no eliminará la sesión. Solo se marcará como anulada y quedará guardada para auditoría." onClose={closeAnnulModal} size="sessions">
        <form onSubmit={submitAnnul} className="grid gap-4">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          {annulSesion && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <strong className="block text-slate-900">{nombrePaciente(annulSesion.paciente)}</strong>
              <span>Sesión #{annulSesion.numero_sesion || 1} · {formatDate(annulSesion.fecha)}</span>
            </div>
          )}
          <Input
            label="Motivo de anulación"
            value={annulForm.motivo_anulacion}
            onChange={(event) => setAnnulForm({ ...annulForm, motivo_anulacion: event.target.value })}
            options={[
              { value: '', label: 'Seleccionar motivo' },
              { value: 'Registro duplicado', label: 'Registro duplicado' },
              { value: 'Error de asistencia', label: 'Error de asistencia' },
              { value: 'Error de pago', label: 'Error de pago' },
              { value: 'Paciente equivocado', label: 'Paciente equivocado' },
              { value: 'Otro', label: 'Otro' }
            ]}
            required
          />
          <Input
            label="Observación opcional"
            value={annulForm.observacion_anulacion}
            onChange={(event) => setAnnulForm({ ...annulForm, observacion_anulacion: event.target.value })}
            multiline
            rows={3}
            placeholder="Agrega un detalle si corresponde..."
          />
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
            <Button variant="ghost" onClick={closeAnnulModal}>Cancelar</Button>
            <Button type="submit" variant="danger">
              <Trash2 size={17} />
              Anular sesión
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default Sesiones;

