import { useEffect, useMemo, useState } from 'react';
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
import Table from '../../components/common/Table';
import { useAuth } from '../../context/AuthContext';
import { getHistoriasClinicas } from '../../services/historiaClinicaService';
import { getPacientes } from '../../services/pacienteService';
import { createSesion, deleteSesion, getSesiones, updateSesion } from '../../services/sesionService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import SesionForm from './SesionForm';

const initialForm = {
  paciente_id: '',
  historia_clinica_id: '',
  fecha: new Date().toISOString().slice(0, 10),
  numero_sesion: 1,
  sesiones_debe: 0,
  sesiones_hizo: 0,
  asistencia: 'pendiente',
  metodo_pago: 'Pendiente',
  estado_pago: 'Pendiente',
  aplica_farmacos: false,
  observacion_farmacos: '',
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
  Pendiente: 'bg-amber-50 text-amber-700 ring-amber-200'
};

const estadoPagoTone = {
  Pagado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  Parcial: 'bg-orange-50 text-orange-700 ring-orange-200'
};

const isSesionAnulada = (sesion) =>
  sesion?.anulada === true || String(sesion?.estado || '').toLowerCase() === 'anulada';

const isSesionRealizada = (sesion) => {
  const asistencia = String(sesion?.asistencia || '').toLowerCase();
  return !isSesionAnulada(sesion) && (asistencia === 'asistio' || sesion?.descontarSesion === true || sesion?.descontar_sesion === true);
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
  const { isAdmin } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [historias, setHistorias] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [selectedHistoria, setSelectedHistoria] = useState(null);
  const [viewMode, setViewMode] = useState('agrupado');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [registeredFilters, setRegisteredFilters] = useState({ query: '', orderBy: 'fecha_desc' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pacientesData, historiasData] = await Promise.all([getPacientes(), getHistoriasClinicas()]);
      setPacientes(pacientesData);
      setHistorias(historiasData);
    } catch (err) {
      setError(`No se pudieron cargar pacientes: ${err.message}`);
    }

    try {
      const sesionesData = await getSesiones();
      setSesiones(sesionesData);
    } catch (err) {
      setSesiones([]);
      setError(`Los pacientes cargaron, pero las sesiones fallaron: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredSesiones = useMemo(() => {
    const query = registeredFilters.query.trim().toLowerCase();
    const filtered = sesiones.filter((sesion) => {
      const historia = sesion.historia_clinica || historias.find((item) => String(item.id) === String(sesion.historia_clinica_id));
      const text = `${nombrePaciente(sesion.paciente)} ${sesion.registrado_por?.nombre || ''} ${sesion.observacion || ''} ${sesion.observacion_farmacos || ''} ${sesion.metodo_pago || ''} ${historia?.condicion_actual?.zona_cuerpo || ''} ${historia?.motivo_consulta || ''}`.toLowerCase();
      return !query || text.includes(query);
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
      const key = `${historia.paciente_id || paciente.id}-${historia.id}`;
      groups.set(key, { key, paciente, historia, sesiones: [] });
    });

    sesionesActivas.forEach((sesion) => {
      const historia = sesion.historia_clinica || historias.find((item) => String(item.id) === String(sesion.historia_clinica_id));
      if (!historia || !isHistoriaActiva(historia)) return;
      const paciente = sesion.paciente || historia.paciente || pacientes.find((item) => String(item.id) === String(sesion.paciente_id || historia.paciente_id));
      if (!paciente) return;
      const key = `${historia.paciente_id || paciente.id}-${historia.id}`;
      if (!groups.has(key)) groups.set(key, { key, paciente, historia, sesiones: [] });
      groups.get(key).sesiones.push(sesion);
    });

    const query = registeredFilters.query.trim().toLowerCase();
    return [...groups.values()]
      .map((group) => {
        const sesionesOrdenadas = [...group.sesiones].sort((a, b) =>
          String(b.fecha || '').localeCompare(String(a.fecha || '')) || Number(b.numero_sesion || 0) - Number(a.numero_sesion || 0)
        );
        const contratadas = Number(group.historia.evaluacion_final?.sesiones_contratadas || Math.max(0, ...sesionesOrdenadas.map((sesion) => Number(sesion.sesiones_debe || 0))));
        const realizadas = sesionesOrdenadas.filter(isSesionRealizada).length;
        const montoTotal = sesionesOrdenadas.reduce((sum, sesion) => sum + montoSesion(sesion), 0);
        const pagado = sesionesOrdenadas.reduce((sum, sesion) => sum + montoPagado(sesion), 0);
        const saldo = sesionesOrdenadas.reduce((sum, sesion) => sum + saldoPendiente(sesion), 0);
        const estadoPago = saldo > 0 && pagado > 0 ? 'Parcial' : saldo > 0 ? 'Pendiente' : sesionesOrdenadas.length ? 'Pagado' : 'Pendiente';
        return {
          ...group,
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
        if (!query) return group.sesiones.length > 0;
        const text = `${nombrePaciente(group.paciente)} ${group.paciente?.ci || ''} ${group.paciente?.telefono || group.paciente?.celular || ''} ${group.historia.condicion_actual?.zona_cuerpo || ''} ${group.historia.motivo_consulta || ''} ${group.historia.profesional_cargo || ''}`.toLowerCase();
        return text.includes(query) || group.sesiones.length > 0;
      })
      .sort((a, b) => String(b.ultimaSesion?.fecha || b.historia.fecha_evaluacion || '').localeCompare(String(a.ultimaSesion?.fecha || a.historia.fecha_evaluacion || '')));
  }, [historias, pacientes, sesionesActivas, registeredFilters.query]);

  const validate = () => {
    if (!form.paciente_id) return 'Selecciona un paciente.';
    if (!form.historia_clinica_id) return 'Selecciona una historia clinica activa.';
    if (!form.fecha) return 'La fecha es obligatoria.';
    if (Number(form.sesiones_debe || 0) < 0) return 'Las sesiones contratadas no pueden ser negativas.';
    if (Number(form.sesiones_hizo || 0) < 0) return 'Las sesiones realizadas no pueden ser negativas.';
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
        numero_sesion: Number(form.numero_sesion || 1),
        sesiones_debe: Number(form.sesiones_debe || 0),
        sesiones_hizo: Number(form.sesiones_hizo || 0)
      });
      editing ? await updateSesion(editing, payload) : await createSesion(payload);
      setForm(initialForm);
      setEditing(null);
      setShowFormModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const editSesion = (sesion) => {
    setEditing(sesion.id);
    setForm({
      paciente_id: sesion.paciente_id || sesion.paciente?.id || '',
      historia_clinica_id: sesion.historia_clinica_id || sesion.historia_clinica?.id || '',
      fecha: sesion.fecha || new Date().toISOString().slice(0, 10),
      numero_sesion: sesion.numero_sesion || 1,
      sesiones_debe: sesion.sesiones_debe || 0,
      sesiones_hizo: sesion.sesiones_hizo || 0,
      asistencia: sesion.asistencia || 'pendiente',
      metodo_pago: sesion.metodo_pago || 'Pendiente',
      estado_pago: sesion.estado_pago || 'Pendiente',
      aplica_farmacos: Boolean(sesion.aplica_farmacos),
      observacion_farmacos: sesion.observacion_farmacos || '',
      observacion: sesion.observacion || ''
    });
    setShowFormModal(true);
  };

  const openNuevaSesion = () => {
    setEditing(null);
    setForm(initialForm);
    setError('');
    setShowFormModal(true);
  };

  const openNuevaSesionGrupo = (group) => {
    const realizadas = group.sesiones.filter(isSesionRealizada).length;
    setEditing(null);
    setForm({
      ...initialForm,
      paciente_id: group.paciente.id,
      historia_clinica_id: group.historia.id,
      numero_sesion: realizadas + 1,
      sesiones_debe: group.contratadas,
      sesiones_hizo: realizadas + 1
    });
    setError('');
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditing(null);
    setForm(initialForm);
    setError('');
  };

  const toggleGroup = (key) => {
    setExpandedGroups((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-3 bg-gradient-to-r from-brand-900 to-brand-600 p-4 text-white md:grid-cols-[1fr_auto]">
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
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Buscar</span>
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Search size={17} className="shrink-0 text-slate-500" />
              <input
                className="w-full border-0 bg-transparent p-0 text-sm text-ink shadow-none placeholder:text-slate-400 focus:ring-0"
                value={registeredFilters.query}
                onChange={(event) => setRegisteredFilters({ ...registeredFilters, query: event.target.value })}
                placeholder="Paciente, pago u observación"
              />
            </span>
          </label>
          <Input
            label="Ordenar"
            value={registeredFilters.orderBy}
            onChange={(event) => setRegisteredFilters({ ...registeredFilters, orderBy: event.target.value })}
            options={[
              { value: 'fecha_desc', label: 'Fecha reciente primero' },
              { value: 'fecha_asc', label: 'Fecha antigua primero' },
              { value: 'nombre_asc', label: 'Paciente A-Z' },
              { value: 'nombre_desc', label: 'Paciente Z-A' }
            ]}
          />
        </div>
        <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
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
                        <StatPill icon={CreditCard} label="Pago / saldo" value={`${group.estadoPago} · ${formatMoney(group.saldo)}`} tone={group.saldo > 0 ? 'bg-amber-50 text-amber-800 ring-amber-100' : 'bg-emerald-50 text-emerald-800 ring-emerald-100'} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                      <StatPill icon={ClipboardList} label="Registradas" value={group.sesiones.length} />
                      <StatPill icon={Eye} label="Última asistencia" value={group.ultimaSesion ? labelAsistencia(group.ultimaSesion.asistencia) : 'Sin dato'} tone={group.ultimaSesion ? asistenciaTone[group.ultimaSesion.asistencia] || asistenciaTone.pendiente : 'bg-slate-50 text-slate-700 ring-slate-200'} />
                      <StatPill icon={CreditCard} label="Estado pago" value={group.estadoPago} tone={paymentTone} />
                      <StatPill icon={CreditCard} label="Total" value={formatMoney(group.montoTotal)} />
                      <StatPill icon={CreditCard} label="Pagado" value={formatMoney(group.pagado)} tone="bg-emerald-50 text-emerald-800 ring-emerald-100" />
                      <StatPill icon={CreditCard} label="Saldo" value={formatMoney(group.saldo)} tone={group.saldo > 0 ? 'bg-amber-50 text-amber-800 ring-amber-100' : 'bg-slate-50 text-slate-700 ring-slate-200'} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <Button variant="secondary" onClick={() => toggleGroup(group.key)}>
                        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                        {expanded ? 'Ocultar sesiones' : 'Ver sesiones'}
                      </Button>
                      <Button variant="ghost" onClick={() => openNuevaSesionGrupo(group)}>
                        <PlusCircle size={17} />
                        Nueva sesión
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
                        <h5 className="text-sm font-black text-brand-900">Sesiones de esta historia clínica</h5>
                        <Button variant="ghost" onClick={() => toggleGroup(group.key)}>
                          <ChevronUp size={17} />
                          Ocultar sesiones
                        </Button>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="min-w-[980px] w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500">
                            <tr>
                              {['Sesión', 'Fecha', 'Asistencia', 'Método', 'Estado pago', 'Monto', 'Pagado', 'Saldo', 'Fármacos', 'Observación clínica', 'Acciones'].map((head) => (
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
                                <td className="px-3 py-2"><Badge tone={pagoTone[sesion.metodo_pago] || pagoTone.Pendiente}>{sesion.metodo_pago}</Badge></td>
                                <td className="px-3 py-2"><Badge tone={estadoPagoTone[sesion.estado_pago] || estadoPagoTone.Pendiente}>{sesion.estado_pago || 'Pendiente'}</Badge></td>
                                <td className="px-3 py-2 font-semibold text-slate-700">{formatMoney(montoSesion(sesion))}</td>
                                <td className="px-3 py-2 font-semibold text-emerald-700">{formatMoney(montoPagado(sesion))}</td>
                                <td className="px-3 py-2 font-semibold text-amber-700">{formatMoney(saldoPendiente(sesion))}</td>
                                <td className="px-3 py-2">{sesion.aplica_farmacos ? 'Sí' : 'No'}</td>
                                <td className="max-w-[220px] px-3 py-2 text-slate-600">{sesion.observacion || 'Sin observación'}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1.5">
                                    <ActionButton label="Ver sesión" icon={Eye} tone="view" className="h-9 w-9" onClick={() => setSelectedSesion(sesion)} />
                                    <ActionButton label="Editar sesión" icon={FilePenLine} tone="edit" className="h-9 w-9" onClick={() => editSesion(sesion)} />
                                    {isAdmin && <ActionButton label="Anular sesión" icon={Trash2} tone="delete" className="h-9 w-9" onClick={() => deleteSesion(sesion.id).then(load)} />}
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
          columns={['Paciente', 'Fecha', 'Registrado por', 'Contratadas', 'Realizadas', 'Restantes', 'Asistencia', 'Pago', 'Fármacos', 'Observación clínica', 'Acciones']}
          rows={sesionesActivas.map((sesion) => {
            const restantes = Math.max(Number(sesion.sesiones_debe || 0) - Number(sesion.sesiones_hizo || 0), 0);
            return [
              nombrePaciente(sesion.paciente),
              formatDate(sesion.fecha),
              sesion.registrado_por?.nombre || 'Registro anterior',
              sesion.sesiones_debe,
              sesion.sesiones_hizo,
              <span className={restantes === 0 && Number(sesion.sesiones_debe || 0) > 0 ? 'font-bold text-amber-700' : 'font-bold text-brand-700'}>{restantes}</span>,
              <Badge tone={asistenciaTone[sesion.asistencia] || asistenciaTone.pendiente}>{labelAsistencia(sesion.asistencia)}</Badge>,
              <div className="grid gap-1">
                <Badge tone={pagoTone[sesion.metodo_pago] || pagoTone.Pendiente}>{sesion.metodo_pago}</Badge>
                <Badge tone={estadoPagoTone[sesion.estado_pago] || estadoPagoTone.Pendiente}>{sesion.estado_pago || 'Pendiente'}</Badge>
              </div>,
              <Badge tone={sesion.aplica_farmacos ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>
                {sesion.aplica_farmacos ? 'Sí' : 'No'}
              </Badge>,
              sesion.observacion || 'Sin observación',
              <div className="flex gap-2">
                <ActionButton label="Ver sesión" icon={Eye} tone="view" onClick={() => setSelectedSesion(sesion)} />
                <ActionButton label="Editar sesión" icon={FilePenLine} tone="edit" onClick={() => editSesion(sesion)} />
                {isAdmin && <ActionButton label="Anular sesión" icon={Trash2} tone="delete" onClick={() => deleteSesion(sesion.id).then(load)} />}
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
                    <Badge tone={pagoTone[sesion.metodo_pago] || pagoTone.Pendiente}>{sesion.metodo_pago}</Badge>
                    <Badge tone={sesion.aplica_farmacos ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>
                      Fármacos: {sesion.aplica_farmacos ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                  <span className="truncate text-xs text-slate-500">{sesion.observacion || 'Sin observación clínica'}</span>
                </div>
                <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <ActionButton label="Ver sesión" icon={Eye} tone="view" className="h-9 w-9" onClick={() => setSelectedSesion(sesion)} />
                  <ActionButton label="Editar sesión" icon={FilePenLine} tone="edit" className="h-9 w-9" onClick={() => editSesion(sesion)} />
                  {isAdmin && <ActionButton label="Anular sesión" icon={Trash2} tone="delete" className="h-9 w-9" onClick={() => deleteSesion(sesion.id).then(load)} />}
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
        subtitle="Registra la atención diaria del paciente y actualiza automáticamente su resumen semanal."
        onClose={closeFormModal}
        size="sessions"
      >
        <SesionForm form={form} setForm={setForm} pacientes={pacientes} historias={historias} sesiones={sesiones} editing={editing} onSubmit={submit} onCancel={closeFormModal} error={error} />
      </Modal>

      <Modal open={Boolean(selectedSesion)} title="Detalle de la sesión" subtitle="Información clínica y administrativa de la atención." onClose={() => setSelectedSesion(null)} size="sessions">
        {selectedSesion && (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Detail label="Paciente" value={nombrePaciente(selectedSesion.paciente)} />
              <Detail label="Fecha" value={formatDate(selectedSesion.fecha)} />
              <Detail label="Registrado por" value={selectedSesion.registrado_por?.nombre || 'Registro anterior'} />
              <Detail label="Contratadas" value={selectedSesion.sesiones_debe} />
              <Detail label="Realizadas" value={selectedSesion.sesiones_hizo} />
              <Detail label="Restantes" value={Math.max(Number(selectedSesion.sesiones_debe || 0) - Number(selectedSesion.sesiones_hizo || 0), 0)} />
              <Detail label="Asistencia" value={labelAsistencia(selectedSesion.asistencia)} />
              <Detail label="Método de pago" value={selectedSesion.metodo_pago} />
              <Detail label="Estado de pago" value={selectedSesion.estado_pago} />
              <Detail label="Fármacos" value={selectedSesion.aplica_farmacos ? 'Sí aplica' : 'No aplica'} />
              <Detail label="Estado" value={Math.max(Number(selectedSesion.sesiones_debe || 0) - Number(selectedSesion.sesiones_hizo || 0), 0) === 0 ? 'Completado' : 'Pendiente'} />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800">
              <CalendarSync size={17} />
              Esta atención está sincronizada con Sesiones Semanales.
            </div>
            <Detail label="Observación clínica" value={selectedSesion.observacion} />
            {selectedSesion.aplica_farmacos && <Detail label="Observación de fármacos" value={selectedSesion.observacion_farmacos} />}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedSesion(null);
                  editSesion(selectedSesion);
                }}
              >
                <FilePenLine size={17} />
                Editar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(selectedHistoria)} title="Historia clínica relacionada" subtitle="Resumen de la historia asociada a estas sesiones." onClose={() => setSelectedHistoria(null)} size="sessions">
        {selectedHistoria && (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Detail label="Fecha" value={formatDate(selectedHistoria.fecha_evaluacion)} />
              <Detail label="Estado" value={selectedHistoria.estado || 'activa'} />
              <Detail label="Profesional" value={selectedHistoria.profesional_cargo || selectedHistoria.usuario?.nombre} />
              <Detail label="Zona / motivo" value={selectedHistoria.condicion_actual?.zona_cuerpo || selectedHistoria.motivo_consulta} />
              <Detail label="Diagnóstico médico" value={selectedHistoria.diagnostico_medico} />
              <Detail label="Sesiones indicadas" value={selectedHistoria.evaluacion_final?.sesiones_contratadas} />
            </div>
            <Detail label="Plan tratamiento" value={selectedHistoria.evaluacion_final?.plan_tratamiento} />
            <Detail label="Diagnóstico kinésico" value={selectedHistoria.evaluacion_final?.diagnostico_kinesico_cif} />
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Sesiones;
