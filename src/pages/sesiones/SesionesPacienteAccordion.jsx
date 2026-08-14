import {
  ArrowLeft, CalendarDays, ChevronDown, ClipboardList, Eye, FilePenLine,
  PlusCircle, Stethoscope, Trash2
} from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const attendanceLabel = { asistio: 'Asistió', no_asistio: 'Faltó', pendiente: 'Pendiente', cancelada: 'Cancelada', reprogramada: 'Reprogramada' };
const attendanceTone = { asistio: 'bg-emerald-50 text-emerald-700', no_asistio: 'bg-rose-50 text-rose-700', pendiente: 'bg-amber-50 text-amber-700', cancelada: 'bg-slate-100 text-slate-600', reprogramada: 'bg-blue-50 text-blue-700' };

export const sessionEvolution = (history, session) => {
  const evolutions = Array.isArray(history?.evolutivo) ? history.evolutivo : [];
  const linked = evolutions.find((item) => (
    String(item.sesion_id || '') === String(session.id || 'missing')
    || (Number(item.numero_sesion || item.numero) === Number(session.numero_sesion)
      && String(item.fecha_sesion || item.fecha || '') === String(session.fecha || ''))
  ));
  if (!linked || linked.estado === 'anulado') return null;
  const values = [
    session?.dolor_despues, session?.descripcion_tratamiento, session?.evolucion_observada,
    session?.medios_fisicos, session?.tecnicas_manuales, session?.inyectable_nombre,
    linked.dolor_final, linked.procedimiento_realizado, linked.aplicacion,
    linked.evolucion_observada, linked.observaciones, linked.inyectables
  ];
  return values.some((value) => value !== '' && value != null) ? linked : null;
};

function ActionButtons({ session, group, history, evolution, onViewSession, onEditSession, onAnnulSession, onRegisterEvolution, onViewEvolution }) {
  return (
    <div className="flex justify-center gap-1.5">
      <button type="button" title="Ver sesión" className="grid h-8 w-8 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600" onClick={() => onViewSession(session)}><Eye size={15} /></button>
      <button type="button" title="Editar sesión" className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700" onClick={() => onEditSession(session)}><FilePenLine size={15} /></button>
      {session.asistencia === 'asistio' && <button type="button" title={evolution ? 'Ver evolución' : 'Registrar evolución'} className="grid h-8 w-8 place-items-center rounded-lg border border-violet-100 bg-violet-50 text-violet-700" onClick={() => evolution ? onViewEvolution(group, session, evolution) : onRegisterEvolution(group, session)}><Stethoscope size={15} /></button>}
      {onAnnulSession && <button type="button" title="Anular sesión" className="grid h-8 w-8 place-items-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600" onClick={() => onAnnulSession(session)}><Trash2 size={15} /></button>}
    </div>
  );
}

function HistorySessions({ group, history, onBack, onViewHistory, onNewSession, onViewSession, onEditSession, onAnnulSession, onRegisterEvolution, onViewEvolution }) {
  const { isAdmin } = useAuth();
  const sessions = group.sesiones
    .filter((session) => String(session.historia_clinica_id || session.historia_clinica?.id) === String(history.id))
    .sort((a, b) => Number(a.numero_sesion || 0) - Number(b.numero_sesion || 0) || String(a.fecha || '').localeCompare(String(b.fecha || '')) || Number(a.id) - Number(b.id));
  const completed = sessions.filter((session) => session.asistencia === 'asistio' && !session.anulada).length;
  const contracted = Number(history.evaluacion_final?.sesiones_contratadas || 0);
  const planCompleted = contracted > 0 && completed >= contracted;

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-700"><ArrowLeft size={15} />Volver a historias</button>
      <div className="mb-3 flex flex-wrap justify-between gap-3">
        <div><h3 className="text-base font-black uppercase text-emerald-800">{history.condicion_actual?.zona_cuerpo || history.motivo_consulta || 'Historia clínica'}</h3><p className="mt-1 text-xs text-slate-500">Historia clínica: {formatDate(history.fecha_evaluacion)}</p></div>
        <div className="flex gap-5 text-xs"><span><strong>{completed} de {contracted}</strong><small className="block text-slate-500">Plan realizado</small></span><span><strong>{Math.max(contracted - completed, 0)}</strong><small className="block text-slate-500">Restantes</small></span></div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
            <tr><th className="px-3 py-2.5">Sesión</th><th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Asistencia</th>{isAdmin && <th className="px-3 py-2.5">Pago / saldo</th>}<th className="px-3 py-2.5">Dolor</th><th className="px-3 py-2.5">Evolución</th><th className="px-3 py-2.5 text-center">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((session) => {
              const evolution = sessionEvolution(history, session);
              return (
                <tr key={session.id}>
                  <td className="px-3 py-3 font-black">{session.numero_sesion || '-'}</td>
                  <td className="px-3 py-3">{formatDate(session.fecha)}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${attendanceTone[session.asistencia] || attendanceTone.pendiente}`}>{attendanceLabel[session.asistencia] || session.asistencia}</span></td>
                  {isAdmin && <td className="px-3 py-3"><strong>{session.estado_pago || 'Pendiente'}</strong><small className="ml-2 text-slate-500">Saldo: {Number(session.saldo_pendiente || 0).toFixed(0)} Bs</small></td>}
                  <td className="px-3 py-3">{session.dolor_antes ?? '—'} → {session.dolor_despues ?? '—'}</td>
                  <td className="px-3 py-3 font-bold">{session.asistencia === 'no_asistio' ? 'No aplica' : evolution ? 'Registrado' : 'Pendiente'}</td>
                  <td className="px-3 py-3"><ActionButtons session={session} group={group} history={history} evolution={evolution} onViewSession={onViewSession} onEditSession={onEditSession} onAnnulSession={onAnnulSession} onRegisterEvolution={onRegisterEvolution} onViewEvolution={onViewEvolution} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-700" onClick={() => onViewHistory(history)}><ClipboardList size={15} />Ver historia clínica</button>
        <button disabled={planCompleted} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300" onClick={() => onNewSession({ ...group, historia: history })}><PlusCircle size={15} />{planCompleted ? 'Plan completado' : 'Nueva sesión'}</button>
        <span className="inline-flex items-center gap-2 px-3 text-xs text-slate-500"><CalendarDays size={15} />{sessions.length} sesiones</span>
      </div>
    </div>
  );
}

export default function SesionesPacienteAccordion({ groups, expandedKey, onToggle, onViewHistory, onNewSession, onViewSession, onEditSession, onAnnulSession, onRegisterEvolution, onViewEvolution }) {
  const { isAdmin } = useAuth();
  const [selectedHistory, setSelectedHistory] = useState({});
  const chooseHistory = (groupKey, historyId) => setSelectedHistory((current) => ({ ...current, [groupKey]: historyId }));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="divide-y divide-slate-200">
        {groups.map((group) => {
          const expanded = expandedKey === group.key;
          const selected = group.historias.find((history) => String(history.id) === String(selectedHistory[group.key]));
          return (
            <article key={group.key} className={expanded ? 'border-l-4 border-l-teal-500 bg-teal-50/45' : 'bg-white'}>
              <button type="button" onClick={() => { onToggle(group.key); if (expanded) chooseHistory(group.key, null); }} aria-expanded={expanded} className="grid w-full items-center gap-4 px-4 py-4 text-left lg:grid-cols-[minmax(260px,1.5fr)_120px_130px_180px_30px]">
                <span className="flex min-w-0 items-center gap-3"><Avatar src={group.paciente?.foto} name={nombrePaciente(group.paciente)} size="sm" className="rounded-full" /><span className="min-w-0"><strong className="block truncate text-sm font-black uppercase text-slate-900">{nombrePaciente(group.paciente)}</strong><small className="block text-xs text-slate-500">CI: {group.paciente?.ci || 'Sin dato'} · Tel: {group.paciente?.telefono || 'Sin dato'}</small></span></span>
                <span><strong>{group.historias.length}</strong><small className="block text-xs text-slate-500">historias</small></span>
                <span><strong>{group.sesiones.length}</strong><small className="block text-xs text-slate-500">sesiones</small></span>
                <span className="text-xs font-bold">{group.ultimaSesion ? formatDate(group.ultimaSesion.fecha) : 'Sin sesiones'}</span>
                <ChevronDown size={17} className={expanded ? 'rotate-180 text-teal-700' : 'text-slate-500'} />
              </button>

              {expanded && <div className="border-t border-slate-200 bg-slate-50/70 p-4">
                {!selected ? <div className="grid gap-2">
                  {group.historias.map((history) => {
                    const sessions = group.sesiones.filter((session) => String(session.historia_clinica_id || session.historia_clinica?.id) === String(history.id));
                    const completed = sessions.filter((session) => session.asistencia === 'asistio').length;
                    const contracted = Number(history.evaluacion_final?.sesiones_contratadas || 0);
                    const balance = sessions.reduce((sum, session) => sum + Number(session.saldo_pendiente || 0), 0);
                    return (
                      <article key={history.id} className="grid items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(240px,1.4fr)_140px_150px_auto]">
                        <div className="min-w-0"><strong className="text-sm">{formatDate(history.fecha_evaluacion)}</strong><h4 className="mt-1 truncate text-sm font-black uppercase text-emerald-800">{history.condicion_actual?.zona_cuerpo || history.motivo_consulta || 'Historia clínica'}</h4><small className="flex items-center gap-1 text-slate-500"><Stethoscope size={12} />{history.profesional_cargo || 'Sin profesional'}</small></div>
                        <div><span className="text-[10px] font-black uppercase text-slate-400">Plan</span><strong className="block">{completed} de {contracted}</strong></div>
                        {isAdmin && <div><span className="text-[10px] font-black uppercase text-slate-400">Saldo</span><strong className={balance > 0 ? 'block text-amber-700' : 'block text-emerald-700'}>{balance.toFixed(0)} Bs</strong></div>}
                        <button type="button" onClick={() => chooseHistory(group.key, history.id)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-black text-white"><Eye size={15} />Ver sesiones</button>
                      </article>
                    );
                  })}
                </div> : <HistorySessions group={group} history={selected} onBack={() => chooseHistory(group.key, null)} onViewHistory={onViewHistory} onNewSession={onNewSession} onViewSession={onViewSession} onEditSession={onEditSession} onAnnulSession={onAnnulSession} onRegisterEvolution={onRegisterEvolution} onViewEvolution={onViewEvolution} />}
              </div>}
            </article>
          );
        })}
        {!groups.length && <p className="p-8 text-center text-sm text-slate-500">No hay sesiones para mostrar con estos filtros.</p>}
      </div>
    </div>
  );
}
