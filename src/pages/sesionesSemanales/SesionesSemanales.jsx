import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Activity,
  CalendarCheck,
  CalendarRange,
  CalendarSync,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FileText,
  Pill,
  Search,
  Stethoscope,
  UserRound,
  WalletCards,
  XCircle
} from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { Avatar } from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { matchesSearch } from '../../utils/search';
import {
  getRegistrosSemanales,
  recalcularRegistrosSemanales
} from '../../services/registroSemanalService';
import { formatDate } from '../../utils/formatDate';
import { exportSesionesSemanalesExcel } from '../../utils/exportSesionesSemanalesExcel';
import { nombrePaciente } from '../../utils/validators';
import { boliviaDate, formatBoliviaDateTime } from '../../utils/boliviaDateTime';

const localDate = (date) => boliviaDate(date);

const getWeekRange = (value = boliviaDate()) => {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00-04:00`) : new Date(value);
  const day = date.getDay();
  const fromMonday = day === 0 ? 6 : day - 1;
  const start = new Date(date);
  start.setDate(date.getDate() - fromMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { inicio: localDate(start), fin: localDate(end) };
};

const isSessionInRange = (sesion, range) => {
  if (!range?.inicio || !range?.fin) return true;
  return sesion.fecha >= range.inicio && sesion.fecha <= range.fin;
};

const asistenciaLabel = {
  pendiente: 'Pendiente',
  asistio: 'Asistió',
  no_asistio: 'Faltó',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada'
};

const asistenciaTone = {
  asistio: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pendiente: 'border-amber-200 bg-amber-50 text-amber-700',
  no_asistio: 'border-red-200 bg-red-50 text-red-700',
  cancelada: 'border-slate-200 bg-slate-100 text-slate-600',
  reprogramada: 'border-amber-200 bg-amber-50 text-amber-700'
};

const money = (value) => `${Number(value || 0).toFixed(2)} Bs`;

const sesionesSincronizadas = (registro, range = null) => Object.values(registro.sesiones_resumen || {})
  .flat()
  .filter((sesion) => !sesion.anulada && isSessionInRange(sesion, range))
  .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || Number(b.numero_sesion || 0) - Number(a.numero_sesion || 0));

const conteos = (registro, range = null) => {
  const sesiones = sesionesSincronizadas(registro, range);
  return {
    sesiones,
    total: sesiones.length,
    asistio: sesiones.filter((sesion) => sesion.asistencia === 'asistio').length,
    pendiente: sesiones.filter((sesion) => sesion.asistencia === 'pendiente' || sesion.asistencia === 'reprogramada').length,
    falto: sesiones.filter((sesion) => sesion.asistencia === 'no_asistio').length,
    deuda: sesiones.reduce((sum, sesion) => sum + Number(sesion.saldo_pendiente || 0), 0),
    farmacos: sesiones.some((sesion) => sesion.aplica_farmacos)
  };
};

const estadoRegistro = (registro, range = null) => {
  const stats = conteos(registro, range);
  const estadoHistoria = registro.historia_clinica?.estado;
  if (estadoHistoria === 'anulada') return 'Finalizado';
  if (stats.falto > 0) return 'Con faltas';
  if (stats.pendiente > 0) return 'Pendiente';
  return 'En tratamiento';
};

const fechasSesion = (registro, range) => {
  const fechas = [...new Set(sesionesSincronizadas(registro, range).map((sesion) => sesion.fecha))].sort();
  if (!fechas.length) return 'Sin fecha';
  return fechas.map((fecha) => formatDate(fecha)).join(', ');
};

const ultimaFechaSesion = (registro, range) => {
  const sesiones = sesionesSincronizadas(registro, range);
  return sesiones.length ? formatDate(sesiones[0].fecha) : 'Sin registrar';
};

const profesionalRegistro = (registro, range) => sesionesSincronizadas(registro, range)
  .find((sesion) => sesion.profesional_responsable)?.profesional_responsable || 'Sin registrar';

const sesionesRestantes = (registro, range) => {
  const sesiones = sesionesSincronizadas(registro, range);
  const contratadas = sesiones.reduce((max, sesion) => Math.max(max, Number(sesion.sesiones_debe || 0)), 0);
  const realizadas = sesiones.reduce((max, sesion) => Math.max(max, Number(sesion.sesiones_hizo || 0)), 0);
  const asistidasRango = sesiones.filter((sesion) => sesion.asistencia === 'asistio').length;
  return Math.max(contratadas - (realizadas || asistidasRango), 0);
};

const statusClass = (estado) => ({
  'En tratamiento': 'bg-emerald-50 text-emerald-700',
  Finalizado: 'bg-slate-100 text-slate-600',
  Pendiente: 'bg-amber-50 text-amber-700',
  'Con faltas': 'bg-red-50 text-red-700'
}[estado] || 'bg-slate-100 text-slate-600');

const initials = (paciente) => {
  const name = nombrePaciente(paciente);
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PA';
};

const sessionHasEvolution = (sesion) => [
  sesion.dolor_antes,
  sesion.dolor_despues,
  sesion.medios_fisicos,
  sesion.tecnicas_manuales,
  sesion.descripcion_tratamiento,
  sesion.evolucion_observada
].some((value) => value !== null && value !== undefined && String(value).trim() !== '');

const painTone = (value) => {
  const number = Number(value);
  if (value === null || value === undefined || value === '') return 'bg-slate-100 text-slate-500';
  if (number <= 3) return 'bg-teal-50 text-teal-700 ring-teal-200';
  if (number <= 6) return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-red-50 text-red-700 ring-red-200';
};

const PainBadge = ({ value }) => (
  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-black ring-1 ring-inset ${painTone(value)}`}>
    {value === null || value === undefined || value === '' ? 'Sin registrar' : `${value}/10`}
  </span>
);

const longDate = (value) => {
  if (!value) return 'Fecha sin registrar';
  const text = formatBoliviaDateTime(`${value}T12:00:00-04:00`, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const historyStatus = (historia) => {
  if (historia?.anulada || historia?.estado === 'anulada') return 'Anulada';
  if (historia?.estado === 'activa') return 'En tratamiento';
  if (historia?.estado === 'inactiva') return 'Inactiva';
  if (historia?.estado === 'completada') return 'Completada';
  return historia?.estado ? historia.estado.charAt(0).toUpperCase() + historia.estado.slice(1) : 'Sin registrar';
};

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <article className={`rounded-lg border p-4 shadow-sm ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase">{label}</span>
        <Icon size={20} />
      </div>
      <strong className="mt-2 block text-2xl text-ink">{value}</strong>
    </article>
  );
}

function PatientCell({ registro }) {
  const paciente = registro.paciente || {};
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <Avatar src={paciente.foto} name={nombrePaciente(paciente)} size="sm" className="rounded-full" />
      <div>
        <strong className="block text-sm text-ink">{nombrePaciente(paciente)}</strong>
        <span className="block text-xs text-slate-500">CI: {paciente.ci || 'Sin dato'}</span>
        <span className="block text-xs text-slate-500">Tel: {paciente.telefono || registro.telefono || 'Sin dato'}</span>
      </div>
    </div>
  );
}

function HistoriaCell({ registro }) {
  const historia = registro.historia_clinica;
  return (
    <div className="min-w-[190px]">
      <strong className="block text-sm text-ink">{historia?.motivo_consulta || 'Historia clinica'}</strong>
      <span className="block text-xs text-slate-500">Dx: {registro.diagnostico || historia?.diagnostico_medico || 'Sin diagnostico'}</span>
    </div>
  );
}

function CountBadge({ value, tone }) {
  return <span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 text-xs font-black ${tone}`}>{value}</span>;
}

function DetailModal({ registro, dateRange, onClose, onHistory, onSession, onWeekChange, canViewFinancial = false }) {
  const stats = conteos(registro, dateRange);
  const historia = registro.historia_clinica;
  const estado = historyStatus(historia);
  const paciente = registro.paciente || {};
  const observacionesClinicas = stats.sesiones
    .map((sesion) => sesion.evolucion_observada || sesion.observacion)
    .filter(Boolean);
  const sesionesConFarmacos = stats.sesiones.filter((sesion) => (
    sesion.aplica_farmacos || sesion.inyectable_nombre || sesion.observacion_farmacos
  ));
  const profesional = stats.sesiones.find((sesion) => sesion.profesional_responsable)?.profesional_responsable
    || historia?.profesional_cargo
    || 'Sin registrar';
  const diagnostico = registro.diagnostico || historia?.diagnostico_medico || historia?.motivo_consulta || 'Sin registrar';
  const resumenEvolucion = stats.sesiones
    .filter(sessionHasEvolution)
    .map((sesion) => {
      const detalle = sesion.evolucion_observada || sesion.descripcion_tratamiento || sesion.observacion;
      const dolor = sesion.dolor_antes !== null && sesion.dolor_antes !== undefined
        ? `Dolor ${sesion.dolor_antes}/10 → ${sesion.dolor_despues ?? 'sin registrar'}`
        : null;
      return [detalle, dolor].filter(Boolean).join(' · ');
    })
    .filter(Boolean);

  return (
    <Modal
      open={Boolean(registro)}
      title="Detalle de sesiones"
      subtitle={canViewFinancial ? 'Resumen de asistencia, pagos, fármacos y evolución del paciente en el rango seleccionado.' : 'Resumen de asistencia, fármacos y evolución del paciente en el rango seleccionado.'}
      onClose={onClose}
      size="xl"
      patientStyle
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-4">
          <section className="rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50/90 via-white to-cyan-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-100 text-base font-black text-brand-800">{initials(paciente)}</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-black uppercase text-ink">{nombrePaciente(paciente)}</h3>
                  <p className="mt-0.5 text-xs font-semibold text-slate-600">CI: {paciente.ci || 'Sin registrar'} · Tel: {paciente.telefono || registro.telefono || 'Sin registrar'}</p>
                  <p className="mt-2 text-sm font-bold text-slate-700">Historia clínica: {historia?.fecha_evaluacion ? formatDate(historia.fecha_evaluacion) : 'Sin registrar'} · {historia?.motivo_consulta || diagnostico}</p>
                  <p className="text-xs text-slate-600">Dx: {diagnostico}</p>
                  <p className="text-xs text-slate-600">Rango: {formatDate(dateRange.inicio)} al {formatDate(dateRange.fin)}</p>
                </div>
              </div>
              <div className="grid gap-2 text-right">
                <span className={`justify-self-end rounded-full px-3 py-1 text-xs font-black ${statusClass(estado)}`}>{estado}</span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><UserRound size={15} className="text-brand-700" />{profesional}</span>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 lg:grid-cols-6">
            <StatCard label="Registradas" value={stats.total} icon={CalendarCheck} tone="border-cyan-100 bg-cyan-50 text-cyan-700" />
            <StatCard label="Asistió" value={stats.asistio} icon={CheckCircle2} tone="border-emerald-100 bg-emerald-50 text-emerald-700" />
            <StatCard label="Faltó" value={stats.falto} icon={XCircle} tone="border-red-100 bg-red-50 text-red-700" />
            <StatCard label="Pendiente" value={stats.pendiente} icon={Activity} tone="border-amber-100 bg-amber-50 text-amber-700" />
            {canViewFinancial && <StatCard label="Deuda semanal" value={money(stats.deuda)} icon={WalletCards} tone="border-red-100 bg-red-50 text-red-700" />}
            <StatCard label="Fármacos" value={sesionesConFarmacos.length ? 'Sí' : 'No'} icon={Pill} tone="border-violet-100 bg-violet-50 text-violet-700" />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
              <h3 className="flex items-center gap-2 text-sm font-black text-ink"><CalendarCheck size={17} className="text-brand-700" />Sesiones registradas en el rango</h3>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/60 p-1.5">
                <button type="button" onClick={() => onWeekChange(new Date(`${dateRange.inicio}T00:00:00`).setDate(new Date(`${dateRange.inicio}T00:00:00`).getDate() - 7))} className="grid h-8 w-8 place-items-center rounded-md bg-white text-brand-700 shadow-sm hover:bg-brand-100" aria-label="Semana anterior" title="Semana anterior"><ChevronLeft size={17} /></button>
                <label className="flex items-center gap-2 text-xs font-black text-brand-800">
                  <span>Buscar semana</span>
                  <input type="date" value={dateRange.inicio} onChange={(event) => event.target.value && onWeekChange(event.target.value)} className="h-8 rounded-md border border-brand-200 bg-white px-2 text-xs font-bold text-slate-700" />
                </label>
                <button type="button" onClick={() => onWeekChange(new Date(`${dateRange.inicio}T00:00:00`).setDate(new Date(`${dateRange.inicio}T00:00:00`).getDate() + 7))} className="grid h-8 w-8 place-items-center rounded-md bg-white text-brand-700 shadow-sm hover:bg-brand-100" aria-label="Semana siguiente" title="Semana siguiente"><ChevronRight size={17} /></button>
              </div>
            </div>
            {stats.sesiones.length ? (
              <div className="mt-2 grid gap-2">
                {stats.sesiones.map((sesion, index) => (
                  <article key={sesion.id} className="relative grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 pl-5 lg:grid-cols-[1.1fr_1fr_1fr_1.35fr_auto] lg:items-center">
                    <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-brand-500" />
                    <div>
                      <strong className="block text-sm text-ink">{longDate(sesion.fecha)}</strong>
                      <span className="text-xs font-bold text-brand-700">Sesión {sesion.numero_sesion || index + 1} de {sesion.sesiones_debe || '—'}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 font-black ${asistenciaTone[sesion.asistencia] || asistenciaTone.pendiente}`}>{asistenciaLabel[sesion.asistencia] || sesion.asistencia}</span>
                      {canViewFinancial && <p className="mt-1 font-semibold">{sesion.metodo_pago || 'Pendiente'} · {sesion.estado_pago || 'Pendiente'}</p>}
                      {canViewFinancial && <p>Pagado: <b>{money(sesion.monto_pagado)}</b> · Saldo: <b className={Number(sesion.saldo_pendiente) > 0 ? 'text-red-600' : 'text-emerald-700'}>{money(sesion.saldo_pendiente)}</b></p>}
                    </div>
                    <div className="grid gap-1 text-xs text-slate-600">
                      <span>Dolor inicial <PainBadge value={sesion.dolor_antes} /></span>
                      <span>Dolor final <PainBadge value={sesion.dolor_despues} /></span>
                      <span>Fármacos: <b>{sesion.aplica_farmacos || sesion.inyectable_nombre ? 'Sí' : 'No'}</b></span>
                    </div>
                    <div className="min-w-0 text-xs text-slate-600">
                      <p><b className="text-slate-700">Evolución:</b> {sessionHasEvolution(sesion) ? 'Registrado' : 'Pendiente'}</p>
                      <p className="mt-1 line-clamp-2"><b className="text-slate-700">Observación:</b> {sesion.evolucion_observada || sesion.observacion || 'Sin registrar'}</p>
                      <p className="mt-1 truncate"><b className="text-slate-700">Profesional:</b> {sesion.profesional_responsable || 'Sin registrar'}</p>
                    </div>
                    <button type="button" onClick={() => onSession(sesion)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 text-xs font-black text-brand-700 transition hover:bg-brand-50">
                      <Eye size={15} /> Ver sesión <ChevronRight size={14} />
                    </button>
                  </article>
                ))}
              </div>
            ) : <p className="py-8 text-center text-sm font-semibold text-slate-500">No se registraron sesiones para este paciente en el rango seleccionado.</p>}
          </section>

          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-xl border border-teal-100 bg-teal-50/45 p-4">
              <h3 className="flex items-center gap-2 text-sm font-black text-teal-800"><Activity size={17} />Resumen de evolución semanal</h3>
              {resumenEvolucion.length ? (
                <div className="mt-2 grid gap-1.5 text-sm leading-5 text-slate-700">
                  {resumenEvolucion.map((item, index) => <p key={`${item}-${index}`}>• {item}</p>)}
                  <p className="mt-1 text-xs font-semibold text-slate-500">Profesional: {profesional}</p>
                </div>
              ) : <p className="mt-2 text-sm text-slate-600">Sin resumen semanal registrado.</p>}
            </section>

            <section className="rounded-xl border border-violet-100 bg-violet-50/45 p-4">
              <h3 className="flex items-center gap-2 text-sm font-black text-violet-800"><Pill size={17} />Fármacos y observaciones clínicas</h3>
              {sesionesConFarmacos.length ? (
                <div className="mt-2 grid gap-1.5 text-sm text-slate-700">
                  {sesionesConFarmacos.map((sesion) => (
                    <p key={sesion.id}>• <b>{sesion.inyectable_nombre || 'Fármaco registrado'}</b>{sesion.inyectable_dosis ? ` · ${sesion.inyectable_dosis}` : ''} · {formatDate(sesion.fecha)}{sesion.observacion_farmacos ? ` — ${sesion.observacion_farmacos}` : ''}</p>
                  ))}
                </div>
              ) : <p className="mt-2 text-sm text-slate-600">No se administraron fármacos durante el periodo seleccionado.</p>}
              <p className="mt-3 border-t border-violet-100 pt-2 text-sm text-slate-700"><b>Observación clínica general:</b> {observacionesClinicas.join(' · ') || 'Sin observaciones registradas.'}</p>
            </section>
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button onClick={() => onHistory(registro)}>
            <FileText size={17} />
            Ver historia clínica
          </Button>
        </footer>
      </div>
    </Modal>
  );
}

function SesionesSemanales() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [dateRange, setDateRange] = useState(getWeekRange());
  const [registros, setRegistros] = useState([]);
  const [selectedRegistro, setSelectedRegistro] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    query: '',
    estado: 'Todos',
    deuda: 'Todos',
    farmacos: 'Todos'
  });

  const load = async (range = dateRange) => {
    setLoading(true);
    setError('');
    try {
      const data = await getRegistrosSemanales({
        fecha_inicio: range.inicio,
        fecha_fin: range.fin
      });
      setRegistros(data);
      setSelectedRegistro((current) => {
        if (!current) return null;
        const matching = data.find((item) => (
          String(item.paciente_id) === String(current.paciente_id)
          && String(item.historia_clinica_id || '') === String(current.historia_clinica_id || '')
        ));
        return matching || {
          ...current,
          semana_inicio: range.inicio,
          semana_fin: range.fin,
          sesiones_resumen: {},
          total_sesiones: 0
        };
      });
    } catch (err) {
      setRegistros([]);
      setError(`No se pudo cargar el resumen semanal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(dateRange);
  }, [dateRange.inicio, dateRange.fin]);

  const groupedRegistros = useMemo(() => [...registros.reduce((map, registro) => {
    const key = `${registro.paciente_id}:${registro.historia_clinica_id || 'sin-historia'}`;
    const current = map.get(key);
    const combined = [
      ...(current ? sesionesSincronizadas(current, dateRange) : []),
      ...sesionesSincronizadas(registro, dateRange)
    ];
    const unique = [...new Map(combined.map((sesion) => [String(sesion.id), sesion])).values()];
    map.set(key, { ...(current || registro), sesiones_resumen: { rango: unique }, total_sesiones: unique.length });
    return map;
  }, new Map()).values()], [registros, dateRange]);

  const filteredRegistros = useMemo(() => {
    return groupedRegistros.filter((registro) => {
      const stats = conteos(registro, dateRange);
      const estado = estadoRegistro(registro, dateRange);
      const estadoHistoria = registro.historia_clinica?.estado;
      const text = [
        nombrePaciente(registro.paciente),
        registro.paciente?.ci,
        registro.paciente?.telefono,
        registro.telefono,
        registro.diagnostico,
        registro.historia_clinica?.motivo_consulta
      ].filter(Boolean).join(' ');

      if (stats.total === 0) return false;
      if (registro.historia_clinica?.anulada || ['anulada', 'inactiva'].includes(estadoHistoria)) return false;
      if (!matchesSearch(text, filters.query)) return false;
      if (filters.estado !== 'Todos' && estado !== filters.estado) return false;
      if (isAdmin && filters.deuda === 'Con deuda' && stats.deuda <= 0) return false;
      if (isAdmin && filters.deuda === 'Sin deuda' && stats.deuda > 0) return false;
      if (filters.farmacos === 'Si' && !stats.farmacos) return false;
      if (filters.farmacos === 'No' && stats.farmacos) return false;
      return true;
    });
  }, [groupedRegistros, filters, dateRange, isAdmin]);

  const onDateChange = (field, value) => {
    setDateRange((current) => {
      const next = { ...current, [field]: value };
      if (next.inicio > next.fin) {
        return field === 'inicio' ? { ...next, fin: value } : { ...next, inicio: value };
      }
      return next;
    });
    setMessage('');
  };

  const refreshWeek = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await recalcularRegistrosSemanales({
        fecha_inicio: dateRange.inicio,
        fecha_fin: dateRange.fin
      });
      await load(dateRange);
      setMessage('Resumen actualizado desde sesiones diarias.');
    } catch (err) {
      setError(`No se pudo actualizar el resumen semanal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportGeneral = async () => {
    const confirmation = await Swal.fire({
      title: 'Exportar sesiones a Excel',
      html: `
        <p style="margin:0 0 16px;color:#64748b;font-size:14px">Selecciona el rango que deseas incluir. Se exportará una fila por cada sesión registrada.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;text-align:left">
          <label style="font-size:13px;font-weight:700;color:#334155">Desde
            <input id="excel-fecha-desde" type="date" value="${dateRange.inicio}" class="swal2-input" style="width:100%;height:42px;margin:6px 0 0;padding:0 10px;font-size:14px" />
          </label>
          <label style="font-size:13px;font-weight:700;color:#334155">Hasta
            <input id="excel-fecha-hasta" type="date" value="${dateRange.fin}" class="swal2-input" style="width:100%;height:42px;margin:6px 0 0;padding:0 10px;font-size:14px" />
          </label>
        </div>`,
      showCancelButton: true,
      reverseButtons: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Exportar en Excel',
      confirmButtonColor: '#0F766E',
      cancelButtonColor: '#64748B',
      focusConfirm: false,
      preConfirm: () => {
        const inicio = document.getElementById('excel-fecha-desde')?.value;
        const fin = document.getElementById('excel-fecha-hasta')?.value;
        if (!inicio || !fin) {
          Swal.showValidationMessage('Debes seleccionar las fechas desde y hasta.');
          return false;
        }
        if (inicio > fin) {
          Swal.showValidationMessage('La fecha desde no puede ser posterior a la fecha hasta.');
          return false;
        }
        return { inicio, fin };
      }
    });
    if (!confirmation.isConfirmed) return;
    const exportRange = confirmation.value;

    setExporting(true);
    Swal.fire({ title: 'Generando archivo...', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      const freshData = await getRegistrosSemanales({ fecha_inicio: exportRange.inicio, fecha_fin: exportRange.fin });
      const exportable = freshData.filter((registro) => {
        const estadoHistoria = registro.historia_clinica?.estado;
        return conteos(registro, exportRange).total > 0
          && !registro.historia_clinica?.anulada
          && !['anulada', 'inactiva'].includes(estadoHistoria);
      });
      if (!exportable.length) {
        await Swal.fire({ icon: 'info', title: 'Sin sesiones registradas', text: 'No existen sesiones registradas en el rango seleccionado.', confirmButtonColor: '#0F766E' });
        return;
      }
      const generatedBy = user?.nombre_mostrado
        || user?.ficha_personal?.nombre_mostrado
        || user?.nombre
        || user?.usuario
        || 'Usuario autenticado';
      await exportSesionesSemanalesExcel({ registros: exportable, range: exportRange, generatedBy, includeFinancial: isAdmin });
      await Swal.fire({ icon: 'success', title: 'Archivo Excel generado correctamente.', confirmButtonColor: '#0F766E' });
    } catch (err) {
      await Swal.fire({ icon: 'error', title: 'No se pudo generar el archivo Excel.', text: 'Inténtalo nuevamente.', confirmButtonColor: '#0F766E' });
    } finally {
      setExporting(false);
    }
  };

  const openHistory = (registro) => {
    if (!registro.historia_clinica_id) return;
    navigate(`/historias-clinicas/${registro.historia_clinica_id}`);
  };

  const changeDetailWeek = (value) => {
    const nextRange = getWeekRange(typeof value === 'number' ? new Date(value) : value);
    setDateRange(nextRange);
    setMessage('');
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-lg border border-white/60 bg-white shadow-soft">
        <div className="module-hero">
          <div>
            <p className="text-sm font-bold text-brand-50">Planificacion semanal</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Sesiones Semanales</h2>
            <span className="mt-2 block text-sm text-brand-50">Resumen semanal de asistencia, continuidad, pagos y evolucion del tratamiento.</span>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-lg border border-white/25 bg-white/15 shadow-sm backdrop-blur">
            <CalendarRange size={30} className="text-brand-50" />
          </div>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="rounded-lg border border-white/70 bg-white/95 p-3 shadow-soft backdrop-blur">
        <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-10">
          {isAdmin && <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Desde</span>
            <input type="date" value={dateRange.inicio} onChange={(event) => onDateChange('inicio', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold shadow-sm focus:border-brand-500 focus:ring-brand-500" />
          </label>}
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Hasta</span>
            <input type="date" value={dateRange.fin} onChange={(event) => onDateChange('fin', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold shadow-sm focus:border-brand-500 focus:ring-brand-500" />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-700 xl:col-span-2">
            <span>Buscar paciente</span>
            <span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Search size={17} className="shrink-0 text-slate-500" />
              <input
                className="w-full border-0 bg-transparent p-0 text-sm text-ink shadow-none placeholder:text-slate-400 focus:ring-0"
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Nombre, CI o telefono"
              />
            </span>
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Estado</span>
            <select value={filters.estado} onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold shadow-sm focus:border-brand-500 focus:ring-brand-500">
              {['Todos', 'En tratamiento', 'Finalizado', 'Pendiente', 'Con faltas'].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Con deuda</span>
            <select value={filters.deuda} onChange={(event) => setFilters((current) => ({ ...current, deuda: event.target.value }))} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold shadow-sm focus:border-brand-500 focus:ring-brand-500">
              {['Todos', 'Con deuda', 'Sin deuda'].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Con farmacos</span>
            <select value={filters.farmacos} onChange={(event) => setFilters((current) => ({ ...current, farmacos: event.target.value }))} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold shadow-sm focus:border-brand-500 focus:ring-brand-500">
              {['Todos', 'Si', 'No'].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <div className="md:col-span-2 xl:col-span-1">
            <Button onClick={refreshWeek} className="min-h-10 w-full px-3 xl:whitespace-nowrap">
              <CalendarSync size={17} />
              Actualizar
            </Button>
          </div>
          <div className="md:col-span-2 xl:col-span-2">
            <button type="button" disabled={exporting} onClick={exportGeneral} className="group flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-4 text-sm font-black text-brand-800 shadow-sm transition hover:border-brand-500 hover:bg-brand-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 xl:whitespace-nowrap">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-white text-brand-700 shadow-sm transition group-hover:bg-brand-700 group-hover:text-white"><FileSpreadsheet size={16} /></span>
              {exporting ? 'Generando archivo...' : 'Exportar en Excel'}
            </button>
            <span className="mt-1 block text-center text-[11px] font-semibold text-slate-500">Elige las fechas y exporta todas las sesiones del periodo.</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/70 bg-white/90 p-4 shadow-soft backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Resumen por paciente e historia</h3>
            <p className="text-sm text-slate-500">Solo pacientes con sesiones registradas entre {formatDate(dateRange.inicio)} y {formatDate(dateRange.fin)}.</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{filteredRegistros.length} resultados</span>
        </div>

        <div className="hidden xl:block">
          <Table
            columns={[
              'Paciente', 'Historia clínica', 'Última sesión', 'Sesiones registradas', 'Asistió', 'Pendiente', 'Faltó',
              ...(isAdmin ? ['Deuda semanal'] : []),
              'Fármacos', 'Estado', 'Profesional', 'Acciones'
            ]}
            rows={filteredRegistros.map((registro) => {
              const stats = conteos(registro, dateRange);
              const estado = estadoRegistro(registro, dateRange);
              return [
                <PatientCell registro={registro} />,
                <HistoriaCell registro={registro} />,
                <span className="max-w-[170px] text-sm font-semibold text-slate-700">{ultimaFechaSesion(registro, dateRange)}</span>,
                <span className="font-semibold text-slate-700">{stats.total}</span>,
                <CountBadge value={stats.asistio} tone="bg-emerald-50 text-emerald-700" />,
                <CountBadge value={stats.pendiente} tone="bg-amber-50 text-amber-700" />,
                <CountBadge value={stats.falto} tone="bg-red-50 text-red-700" />,
                ...(isAdmin ? [<span className={`font-black ${stats.deuda > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{money(stats.deuda)}<br /><small>{stats.deuda > 0 ? 'deuda' : 'sin deuda'}</small></span>] : []),
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${stats.farmacos ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>{stats.farmacos ? 'Si' : 'No'}</span>,
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusClass(estado)}`}>{estado}</span>,
                <span className="max-w-[170px] text-xs font-semibold text-slate-600">{profesionalRegistro(registro, dateRange)}</span>,
                <div className="flex gap-2">
                  <ActionButton label="Ver detalle semanal" icon={Eye} tone="view" onClick={() => setSelectedRegistro(registro)} />
                  <ActionButton label="Ver historia clinica" icon={ClipboardList} tone="edit" onClick={() => openHistory(registro)} disabled={!registro.historia_clinica_id} />
                </div>
              ];
            })}
            empty="No hay sesiones registradas en el rango seleccionado."
          />
        </div>

        <div className="grid gap-3 xl:hidden">
          {filteredRegistros.map((registro) => {
            const stats = conteos(registro, dateRange);
            const estado = estadoRegistro(registro, dateRange);
            return (
              <article key={registro.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <PatientCell registro={registro} />
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusClass(estado)}`}>{estado}</span>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <HistoriaCell registro={registro} />
                  <p className="mt-2 text-xs font-bold text-slate-500">Fecha sesion: {fechasSesion(registro, dateRange)}</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-cyan-50 p-2"><span className="block text-[11px] font-bold text-cyan-600">Sesiones</span><strong>{stats.total}</strong></div>
                  <div className="rounded-lg bg-slate-50 p-2"><span className="block text-[11px] font-bold text-slate-600">Debe</span><strong>{sesionesRestantes(registro, dateRange)}</strong></div>
                  <div className="rounded-lg bg-emerald-50 p-2"><span className="block text-[11px] font-bold text-emerald-600">Asistio</span><strong>{stats.asistio}</strong></div>
                  <div className="rounded-lg bg-amber-50 p-2"><span className="block text-[11px] font-bold text-amber-600">Pendiente</span><strong>{stats.pendiente}</strong></div>
                  <div className="rounded-lg bg-red-50 p-2"><span className="block text-[11px] font-bold text-red-600">Falto</span><strong>{stats.falto}</strong></div>
                  {isAdmin && <div className="rounded-lg bg-red-50 p-2"><span className="block text-[11px] font-bold text-red-600">Deuda</span><strong>{money(stats.deuda)}</strong></div>}
                  <div className="rounded-lg bg-violet-50 p-2"><span className="block text-[11px] font-bold text-violet-600">Farmacos</span><strong>{stats.farmacos ? 'Si' : 'No'}</strong></div>
                </div>
                <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <ActionButton label="Ver detalle semanal" icon={Eye} tone="view" className="h-9 w-9" onClick={() => setSelectedRegistro(registro)} />
                  <ActionButton label="Ver historia clinica" icon={ClipboardList} tone="edit" className="h-9 w-9" onClick={() => openHistory(registro)} disabled={!registro.historia_clinica_id} />
                </div>
              </article>
            );
          })}
          {filteredRegistros.length === 0 && <p className="empty-state">No hay sesiones registradas en el rango seleccionado.</p>}
        </div>
      </div>

      {selectedRegistro && (
        <DetailModal
          registro={selectedRegistro}
          dateRange={dateRange}
          onClose={() => setSelectedRegistro(null)}
          onHistory={openHistory}
          onSession={(sesion) => navigate('/sesiones', { state: { verSesionId: sesion.id } })}
          onWeekChange={changeDetailWeek}
          canViewFinancial={isAdmin}
        />
      )}
    </section>
  );
}

export default SesionesSemanales;

