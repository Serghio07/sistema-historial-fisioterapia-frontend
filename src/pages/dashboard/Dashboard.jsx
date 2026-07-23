import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, CalendarCheck, CalendarClock, ClipboardPlus, FileText, HeartPulse, Plus, Sparkles, Stethoscope, UserCheck, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPacientesRecientes, getDashboardProximasCitas, getDashboardResumen, getDashboardSesionesHoy } from '../../services/dashboardService';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const emptyResumen = { totalPacientes: 0, citasHoy: 0, sesionesHoy: 0, atendidosHoy: 0, citasPendientes: 0, informesGenerados: 0 };
const statusStyles = { atendido: 'bg-emerald-50 text-emerald-700', completada: 'bg-emerald-50 text-emerald-700', confirmado: 'bg-blue-50 text-blue-700', confirmada: 'bg-blue-50 text-blue-700', pendiente: 'bg-amber-50 text-amber-700', cancelada: 'bg-red-50 text-red-700' };

function Status({ children }) {
  const value = String(children || 'pendiente').toLowerCase();
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusStyles[value] || statusStyles.pendiente}`}>{value}</span>;
}

function StatCard({ title, value, hint, icon: Icon, color, to }) {
  return <Link to={to} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-[0_16px_40px_rgba(15,23,42,0.09)]">
    <div className="flex items-start justify-between"><div className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}><Icon size={21} /></div><ArrowRight size={17} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" /></div>
    <strong className="mt-5 block text-3xl font-black tracking-tight text-slate-900">{value}</strong><span className="mt-1 block text-sm font-bold text-slate-700">{title}</span><span className="mt-1 block text-xs text-slate-400">{hint}</span>
  </Link>;
}

const EmptyState = ({ text }) => <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-400">{text}</div>;

function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumen, setResumen] = useState(emptyResumen);
  const [proximasCitas, setProximasCitas] = useState([]);
  const [sesionesHoy, setSesionesHoy] = useState([]);
  const [pacientesRecientes, setPacientesRecientes] = useState([]);

  useEffect(() => {
    Promise.all([getDashboardResumen(), getDashboardProximasCitas(), getDashboardSesionesHoy(), getDashboardPacientesRecientes()])
      .then(([r, c, s, p]) => { setResumen(r); setProximasCitas(c); setSesionesHoy(s); setPacientesRecientes(p); })
      .catch((err) => setError(`No se pudo cargar el panel principal: ${err.message}`)).finally(() => setLoading(false));
  }, []);

  const nombre = user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || user?.usuario || 'Profesional';
  const fecha = useMemo(() => new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()), []);
  const avance = resumen.citasHoy ? Math.min(100, Math.round((resumen.atendidosHoy / resumen.citasHoy) * 100)) : 0;
  const stats = [
    ['Pacientes activos', resumen.totalPacientes, 'Registrados en el sistema', Users, 'bg-teal-50 text-teal-700', '/pacientes'],
    ['Citas para hoy', resumen.citasHoy, `${resumen.citasPendientes} aún pendientes`, CalendarClock, 'bg-blue-50 text-blue-700', '/citas'],
    ['Sesiones de hoy', resumen.sesionesHoy, 'Actividad clínica diaria', Activity, 'bg-violet-50 text-violet-700', '/sesiones'],
    ['Informes emitidos', resumen.informesGenerados, 'Documentos generados', FileText, 'bg-amber-50 text-amber-700', '/informes-medicos']
  ];
  const quick = [['/pacientes', 'Paciente', UserPlus, 'bg-teal-50 text-teal-700'], ['/citas', 'Cita', CalendarClock, 'bg-blue-50 text-blue-700'], ['/sesiones', 'Sesión', HeartPulse, 'bg-rose-50 text-rose-700'], ['/informes-medicos', 'Informe', ClipboardPlus, 'bg-violet-50 text-violet-700']];

  return <section className="grid gap-6">
    {loading && <Loader />}
    <div className="dashboard-hero relative overflow-hidden rounded-2xl p-6 md:p-8"><div className="relative z-10 flex flex-wrap items-end justify-between gap-6"><div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-700/15 bg-white/30 px-3 py-1.5 text-xs font-semibold backdrop-blur"><Sparkles size={14} /> Resumen de la jornada</div><p className="text-sm font-medium capitalize text-brand-700">{fecha}</p><h2 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">Buenos días, {nombre.split(' ')[0]}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-brand-900/75">Aquí tienes el estado de la atención clínica y las actividades prioritarias de hoy.</p></div><Link to="/citas" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 bg-white/80 px-4 py-2 text-sm font-black text-brand-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-white"><Plus size={18} /> Agendar cita</Link></div></div>
    {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([title, value, hint, icon, color, to]) => <StatCard key={title} {...{ title, value, hint, icon, color, to }} />)}</div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
      <article className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">Agenda clínica</p><h3>Próximas citas</h3><span>Atenciones programadas para las siguientes horas.</span></div><Link to="/citas" className="text-link">Ver agenda <ArrowRight size={15} /></Link></div>
        {proximasCitas.length ? <div className="mt-3 grid divide-y divide-slate-100">{proximasCitas.slice(0, 5).map((cita, index) => <div key={cita.id || index} className="grid items-center gap-3 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto]"><div className="rounded-xl bg-slate-50 px-2 py-2 text-center"><strong className="block text-sm text-slate-900">{cita.hora_inicio?.slice(0, 5) || '--:--'}</strong><span className="text-[10px] font-bold uppercase text-slate-400">hora</span></div><div className="min-w-0"><strong className="block truncate text-sm text-slate-800">{nombrePaciente(cita.paciente)}</strong><span className="mt-1 block truncate text-xs text-slate-400">{cita.tipo_atencion || cita.motivo || 'Atención fisioterapéutica'} · {formatDate(cita.fecha)}</span></div><Status>{cita.estado}</Status></div>)}</div> : <EmptyState text="No hay próximas citas programadas." />}
      </article>
      <aside className="grid gap-6"><article className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">Progreso diario</p><h3>Atención de hoy</h3></div><span className="text-2xl font-black text-brand-700">{avance}%</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-teal-400" style={{ width: `${avance}%` }} /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-50 p-3"><UserCheck size={18} className="text-emerald-600" /><strong className="mt-2 block text-xl text-slate-900">{resumen.atendidosHoy}</strong><span className="text-xs text-slate-500">Atendidos</span></div><div className="rounded-xl bg-amber-50 p-3"><CalendarCheck size={18} className="text-amber-600" /><strong className="mt-2 block text-xl text-slate-900">{resumen.citasPendientes}</strong><span className="text-xs text-slate-500">Pendientes</span></div></div></article>
        <article className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">Acciones rápidas</p><h3>Crear nuevo</h3></div></div><div className="mt-4 grid grid-cols-2 gap-3">{quick.map(([to, label, Icon, color]) => <Link key={label} to={to} className="quick-action"><span className={`grid h-9 w-9 place-items-center rounded-lg ${color}`}><Icon size={18} /></span><span>{label}</span></Link>)}</div></article></aside>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <article className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">Seguimiento</p><h3>Sesiones de hoy</h3><span>Asistencia y control clínico diario.</span></div><Link to="/sesiones" className="text-link">Ver todas <ArrowRight size={15} /></Link></div>{sesionesHoy.length ? <div className="mt-3 grid gap-2">{sesionesHoy.slice(0, 4).map((s, i) => <div key={s.id || i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700"><Stethoscope size={17} /></span><div className="min-w-0"><strong className="block truncate text-sm text-slate-800">{nombrePaciente(s.paciente)}</strong><span className="text-xs text-slate-400">Sesión {s.numero_sesion || s.sesiones_hizo || '—'} · {s.metodo_pago || 'Pago pendiente'}</span></div></div><Status>{s.asistencia}</Status></div>)}</div> : <EmptyState text="No hay sesiones registradas para hoy." />}</article>
      <article className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">Nuevos ingresos</p><h3>Pacientes recientes</h3><span>Últimos registros incorporados.</span></div><Link to="/pacientes" className="text-link">Ver pacientes <ArrowRight size={15} /></Link></div>{pacientesRecientes.length ? <div className="mt-3 grid gap-2">{pacientesRecientes.slice(0, 4).map((p, i) => <Link to={`/pacientes/${p.id}`} key={p.id || i} className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-slate-100 hover:bg-slate-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-black text-white">{nombrePaciente(p).charAt(0)}</span><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-800">{nombrePaciente(p)}</strong><span className="block truncate text-xs text-slate-400">{p.historias_clinicas?.[0]?.diagnostico_medico || 'Sin diagnóstico inicial'}</span></div><span className="text-xs text-slate-400">{formatDate(p.created_at)}</span></Link>)}</div> : <EmptyState text="Todavía no hay pacientes registrados." />}</article>
    </div>
  </section>;
}

export default Dashboard;
