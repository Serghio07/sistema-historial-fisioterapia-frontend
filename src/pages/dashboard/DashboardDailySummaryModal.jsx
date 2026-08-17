import { Activity, AlertTriangle, CalendarClock, CheckCircle2, FileText, History, Receipt, UserCheck, XCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { BOLIVIA_TIME_ZONE } from '../../utils/boliviaDateTime';

const metricStyles = [
  ['Total de citas', 'total', CalendarClock, 'bg-blue-50 text-blue-700'],
  ['Atendidas', 'atendidas', CheckCircle2, 'bg-emerald-50 text-emerald-700'],
  ['Pendientes', 'pendientes', Activity, 'bg-amber-50 text-amber-700'],
  ['No asistió', 'noAsistio', UserCheck, 'bg-rose-50 text-rose-700'],
  ['Canceladas', 'canceladas', XCircle, 'bg-slate-100 text-slate-600']
];

const readableDate = (date) => date ? new Intl.DateTimeFormat('es-BO', { timeZone: BOLIVIA_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`)) : '';

export default function DashboardDailySummaryModal({ open, onClose, loading, error, summary, onRetry }) {
  return <Modal open={open} title="Resumen de la jornada" subtitle={readableDate(summary?.fecha)} onClose={onClose} size="lg" closeOnEscape closeOnBackdrop>
    {loading && <div className="grid min-h-64 place-items-center"><Loader /><p className="mt-3 text-sm text-slate-500">Cargando resumen de la jornada...</p></div>}
    {!loading && error && <div className="grid min-h-52 place-items-center text-center"><div><AlertTriangle className="mx-auto text-red-500" /><p className="mt-3 font-bold text-slate-800">No se pudo cargar el resumen de la jornada. Intenta nuevamente.</p><Button className="mt-4" onClick={onRetry}>Reintentar</Button></div></div>}
    {!loading && !error && summary && <div className="grid gap-5">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {metricStyles.map(([label, key, Icon, color]) => <div key={key} className="rounded-xl border border-slate-200 p-3"><span className={`grid h-8 w-8 place-items-center rounded-lg ${color}`}><Icon size={16} /></span><strong className="mt-2 block text-2xl text-slate-900">{summary.citas?.[key] ?? 0}</strong><span className="text-xs font-bold text-slate-500">{label}</span></div>)}
      </section>
      {summary.citas?.total === 0 && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">Hoy todavía no existen citas registradas.</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <section><h3 className="font-black text-slate-800">Próximas citas</h3><div className="mt-2 grid gap-2">{summary.proximasCitas?.length ? summary.proximasCitas.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><strong className="text-brand-700">{item.horaInicio}</strong><span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{item.paciente}</span><span className="text-xs text-slate-500">{item.estado}</span></div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No hay más citas programadas para hoy.</p>}</div></section>
        <section><h3 className="font-black text-slate-800">Pacientes atendidos hoy</h3><div className="mt-2 grid gap-2">{summary.pacientesAtendidos?.length ? summary.pacientesAtendidos.map((item, index) => <div key={`${item.paciente}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><span className="truncate text-sm font-bold text-slate-800">{item.paciente}</span>{item.sesionActual && <span className="shrink-0 text-xs font-bold text-brand-700">Sesión {item.sesionActual}{item.totalSesiones ? `/${item.totalSesiones}` : ''}</span>}</div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Todavía no hay pacientes atendidos hoy.</p>}</div></section>
      </div>
      <section><h3 className="font-black text-slate-800">Alertas</h3><div className="mt-2 grid gap-2">{summary.alertas?.length ? summary.alertas.map((item) => <div key={item.tipo} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900"><AlertTriangle size={16} />{item.mensaje}</div>) : <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">No hay alertas pendientes para hoy.</p>}</div></section>
      <section><h3 className="font-black text-slate-800">Actividad</h3><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ActivityItem icon={CheckCircle2} label="Sesiones realizadas" value={summary.actividad?.sesionesRealizadas} />
        <ActivityItem icon={History} label="Historias actualizadas" value={summary.actividad?.historiasActualizadas} />
        <ActivityItem icon={FileText} label="Informes generados" value={summary.actividad?.informesGenerados} />
        <ActivityItem icon={Activity} label="Acciones administrativas" value={summary.actividad?.accionesAdministrativas} />
        {'pagosRegistrados' in (summary.actividad || {}) && <ActivityItem icon={Receipt} label="Pagos registrados" value={summary.actividad.pagosRegistrados} />}
      </div></section>
      <div className="flex justify-end border-t border-slate-200 pt-4"><Button variant="secondary" onClick={onClose}>Cerrar</Button></div>
    </div>}
  </Modal>;
}

function ActivityItem({ icon: Icon, label, value }) {
  return <div className="rounded-xl border border-slate-200 p-3"><Icon size={16} className="text-brand-600" /><strong className="mt-2 block text-xl text-slate-900">{value ?? 0}</strong><span className="text-xs text-slate-500">{label}</span></div>;
}
