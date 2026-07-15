import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarCheck,
  CalendarRange,
  CalendarSync,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Pill,
  Search,
  WalletCards,
  XCircle
} from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import {
  getRegistrosSemanales,
  recalcularRegistrosSemanales
} from '../../services/registroSemanalService';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekRange = (value = new Date()) => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : new Date(value);
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

const weekDays = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mie' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sab' },
  { key: 'domingo', label: 'Dom' }
];

const asistenciaLabel = {
  pendiente: 'Pendiente',
  asistio: 'Asistio',
  no_asistio: 'Falto',
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
  .filter((sesion) => isSessionInRange(sesion, range));

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

const dayDate = (weekStart, index) => {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + index);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
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
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-black text-brand-700">
        {initials(paciente)}
      </span>
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

function DetailModal({ registro, dateRange, onClose, onHistory }) {
  const stats = conteos(registro, dateRange);
  const estado = estadoRegistro(registro, dateRange);
  const historia = registro.historia_clinica;
  const observacionesClinicas = stats.sesiones.map((sesion) => sesion.observacion).filter(Boolean);
  const observacionesFarmacos = stats.sesiones.map((sesion) => sesion.observacion_farmacos).filter(Boolean);

  return (
    <Modal
      open={Boolean(registro)}
      title="Detalle de sesiones"
      subtitle="Resumen de asistencia, pagos, farmacos y evolucion del paciente en el rango seleccionado."
      onClose={onClose}
      size="xl"
    >
      <div className="grid max-h-[72vh] gap-4 overflow-y-auto pr-1">
        <section className="rounded-lg border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-ink">{nombrePaciente(registro.paciente)}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                CI: {registro.paciente?.ci || 'Sin dato'} | TEL: {registro.paciente?.telefono || registro.telefono || 'Sin dato'}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Historia clinica: {historia?.fecha_evaluacion ? `${formatDate(historia.fecha_evaluacion)} - ` : ''}{historia?.motivo_consulta || 'Sin motivo registrado'}
              </p>
              <p className="text-sm text-slate-700">Dx: {registro.diagnostico || historia?.diagnostico_medico || 'Sin diagnostico'}</p>
              <p className="text-sm text-slate-700">Rango: {formatDate(dateRange.inicio)} al {formatDate(dateRange.fin)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(estado)}`}>{estado}</span>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label="Sesiones" value={stats.total} icon={CalendarCheck} tone="border-cyan-100 bg-cyan-50 text-cyan-700" />
          <StatCard label="Asistio" value={stats.asistio} icon={CheckCircle2} tone="border-emerald-100 bg-emerald-50 text-emerald-700" />
          <StatCard label="Pendiente" value={stats.pendiente} icon={Activity} tone="border-amber-100 bg-amber-50 text-amber-700" />
          <StatCard label="Falto" value={stats.falto} icon={XCircle} tone="border-red-100 bg-red-50 text-red-700" />
          <StatCard label="Deuda semanal" value={money(stats.deuda)} icon={WalletCards} tone="border-red-100 bg-red-50 text-red-700" />
          <StatCard label="Farmacos" value={stats.farmacos ? 'Si' : 'No'} icon={Pill} tone="border-violet-100 bg-violet-50 text-violet-700" />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-base font-black text-ink">Detalle por dia</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {weekDays.map((day, index) => {
              const sesionesDia = (registro.sesiones_resumen?.[day.key] || []).filter((sesion) => isSessionInRange(sesion, dateRange));
              return (
                <article key={day.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm text-ink">{day.label} {dayDate(registro.semana_inicio, index)}</strong>
                    {!sesionesDia.length && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">Sin sesion</span>}
                  </div>
                  {sesionesDia.length ? (
                    <div className="mt-3 grid gap-2">
                      {sesionesDia.map((sesion) => (
                        <div key={sesion.id} className="rounded-lg border border-white bg-white p-3 text-sm text-slate-700 shadow-sm">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${asistenciaTone[sesion.asistencia] || asistenciaTone.pendiente}`}>
                            {asistenciaLabel[sesion.asistencia] || sesion.asistencia}
                          </span>
                          <p className="mt-2 font-semibold text-slate-700">{sesion.metodo_pago || 'Pendiente'} / {sesion.estado_pago || 'Pendiente'}</p>
                          <p className="text-xs text-slate-500">Pagado: {money(sesion.monto_pagado)}</p>
                          <p className="text-xs text-slate-500">Saldo: {money(sesion.saldo_pendiente)}</p>
                          <p className="text-xs text-slate-500">Farmacos: {sesion.aplica_farmacos ? 'Si' : 'No'}</p>
                          <p className="mt-1 text-xs text-slate-500">Obs: {sesion.observacion || 'Sin observacion'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">Sin sesion</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
          <h3 className="font-black text-emerald-800">Evolucion semanal</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {registro.observacion || observacionesClinicas.join(' ') || 'Sin evolucion semanal registrada.'}
          </p>
        </section>

        <section className="rounded-lg border border-violet-100 bg-violet-50/60 p-4">
          <h3 className="font-black text-violet-800">Farmacos y observaciones</h3>
          <p className="mt-2 text-sm text-slate-700">Farmacos: {stats.farmacos ? 'Si' : 'No'}</p>
          <p className="text-sm text-slate-700">Observacion de farmacos: {observacionesFarmacos.join(' ') || 'Sin registro.'}</p>
          <p className="text-sm text-slate-700">Observacion clinica: {observacionesClinicas.join(' ') || 'Sin observaciones relevantes.'}</p>
        </section>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button onClick={() => onHistory(registro)}>
            <FileText size={17} />
            Ver historia clinica
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SesionesSemanales() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(getWeekRange());
  const [registros, setRegistros] = useState([]);
  const [selectedRegistro, setSelectedRegistro] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const filteredRegistros = useMemo(() => {
    const term = filters.query.trim().toLowerCase();
    return registros.filter((registro) => {
      const stats = conteos(registro, dateRange);
      const estado = estadoRegistro(registro, dateRange);
      const text = [
        nombrePaciente(registro.paciente),
        registro.paciente?.ci,
        registro.paciente?.telefono,
        registro.telefono,
        registro.diagnostico,
        registro.historia_clinica?.motivo_consulta
      ].filter(Boolean).join(' ').toLowerCase();

      if (stats.total === 0) return false;
      if (term && !text.includes(term)) return false;
      if (filters.estado !== 'Todos' && estado !== filters.estado) return false;
      if (filters.deuda === 'Con deuda' && stats.deuda <= 0) return false;
      if (filters.deuda === 'Sin deuda' && stats.deuda > 0) return false;
      if (filters.farmacos === 'Si' && !stats.farmacos) return false;
      if (filters.farmacos === 'No' && stats.farmacos) return false;
      return true;
    });
  }, [registros, filters, dateRange]);

  const resumen = useMemo(() => {
    const pacientesUnicos = new Set(filteredRegistros.map((registro) => registro.paciente_id)).size;
    return filteredRegistros.reduce((acc, registro) => {
      const stats = conteos(registro, dateRange);
      acc.sesiones += stats.total;
      acc.asistidas += stats.asistio;
      acc.pendientes += stats.pendiente;
      acc.faltas += stats.falto;
      acc.deuda += stats.deuda;
      return acc;
    }, { pacientes: pacientesUnicos, sesiones: 0, asistidas: 0, pendientes: 0, faltas: 0, deuda: 0 });
  }, [filteredRegistros, dateRange]);

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

  const openHistory = (registro) => {
    if (!registro.historia_clinica_id) return;
    navigate(`/historias-clinicas/${registro.historia_clinica_id}`);
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-lg border border-white/60 bg-white shadow-soft">
        <div className="grid gap-3 bg-gradient-to-r from-[#123f3f] via-brand-700 to-teal-500 p-4 text-white md:grid-cols-[1fr_auto]">
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
        <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-8">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Desde</span>
            <input type="date" value={dateRange.inicio} onChange={(event) => onDateChange('inicio', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold shadow-sm focus:border-brand-500 focus:ring-brand-500" />
          </label>
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
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Pacientes atendidos" value={resumen.pacientes} icon={Activity} tone="border-brand-100 bg-brand-50 text-brand-700" />
        <StatCard label="Sesiones registradas" value={resumen.sesiones} icon={CalendarCheck} tone="border-cyan-100 bg-cyan-50 text-cyan-700" />
        <StatCard label="Asistidas" value={resumen.asistidas} icon={CheckCircle2} tone="border-emerald-100 bg-emerald-50 text-emerald-700" />
        <StatCard label="Pendientes" value={resumen.pendientes} icon={Activity} tone="border-amber-100 bg-amber-50 text-amber-700" />
        <StatCard label="Faltas" value={resumen.faltas} icon={XCircle} tone="border-red-100 bg-red-50 text-red-700" />
        <StatCard label="Deuda total semanal" value={money(resumen.deuda)} icon={WalletCards} tone="border-red-100 bg-red-50 text-red-700" />
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
            columns={['Paciente', 'Historia clinica', 'Fecha sesion', 'Sesiones debe', 'Asistio', 'Pendiente', 'Falto', 'Deuda semanal', 'Farmacos', 'Estado', 'Acciones']}
            rows={filteredRegistros.map((registro) => {
              const stats = conteos(registro, dateRange);
              const estado = estadoRegistro(registro, dateRange);
              return [
                <PatientCell registro={registro} />,
                <HistoriaCell registro={registro} />,
                <span className="max-w-[170px] text-sm font-semibold text-slate-700">{fechasSesion(registro, dateRange)}</span>,
                <span className="font-semibold text-slate-700">{sesionesRestantes(registro, dateRange)}</span>,
                <CountBadge value={stats.asistio} tone="bg-emerald-50 text-emerald-700" />,
                <CountBadge value={stats.pendiente} tone="bg-amber-50 text-amber-700" />,
                <CountBadge value={stats.falto} tone="bg-red-50 text-red-700" />,
                <span className={`font-black ${stats.deuda > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{money(stats.deuda)}<br /><small>{stats.deuda > 0 ? 'deuda' : 'sin deuda'}</small></span>,
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${stats.farmacos ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>{stats.farmacos ? 'Si' : 'No'}</span>,
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusClass(estado)}`}>{estado}</span>,
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
                  <div className="rounded-lg bg-red-50 p-2"><span className="block text-[11px] font-bold text-red-600">Deuda</span><strong>{money(stats.deuda)}</strong></div>
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
        />
      )}
    </section>
  );
}

export default SesionesSemanales;
