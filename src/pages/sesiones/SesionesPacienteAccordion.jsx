import { ArrowLeft, CalendarDays, ChevronDown, ClipboardList, Eye, FilePenLine, PlusCircle, Stethoscope, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';
import { Avatar } from '../../components/common/ProfilePhoto';

const initials = (patient) => nombrePaciente(patient).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PA';
const attendanceLabel = { asistio: 'Asistió', no_asistio: 'Faltó', pendiente: 'Pendiente', cancelada: 'Cancelada', reprogramada: 'Reprogramada' };
const attendanceTone = { asistio: 'bg-emerald-50 text-emerald-700', no_asistio: 'bg-rose-50 text-rose-700', pendiente: 'bg-amber-50 text-amber-700', cancelada: 'bg-slate-100 text-slate-600', reprogramada: 'bg-blue-50 text-blue-700' };

export const sessionEvolution = (history, session) => {
  const evolutions = Array.isArray(history?.evolutivo) ? history.evolutivo : [];
  const linked = evolutions.find((item) => String(item.sesion_id || '') === String(session.id || 'missing') || Number(item.numero_sesion || item.numero) === Number(session.numero_sesion) && String(item.fecha_sesion || item.fecha || '') === String(session.fecha || ''));
  if (!linked || linked.estado === 'anulado') return null;
  const values = [
    session?.dolor_despues, session?.descripcion_tratamiento, session?.evolucion_observada,
    session?.medios_fisicos, session?.tecnicas_manuales, session?.inyectable_nombre,
    linked.dolor_final, linked.procedimiento_realizado, linked.aplicacion,
    linked.evolucion_observada, linked.observaciones, linked.inyectables
  ];
  return values.some((value) => value !== '' && value != null) ? linked : null;
};

const sessionMoney = (session, key) => Number(session?.[key] || 0);

function PainValue({ value }) {
  if (value === '' || value == null) return <span className="text-[10px] font-semibold text-slate-400">Sin registrar</span>;
  const number = Number(value);
  const tone = number >= 7 ? 'bg-rose-50 text-rose-700 ring-rose-200' : number >= 4 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-teal-50 text-teal-700 ring-teal-200';
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ring-1 ${tone}`}>{number}/10</span>;
}

function SessionsClinicalTable({ sessions, history, group, onViewSession, onEditSession, onAnnulSession, onRegisterEvolution, onViewEvolution }) {
  return <div className="sessions-clinical-table overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table className="w-full min-w-[980px] text-left text-xs">
      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="px-3 py-2.5">Sesión</th><th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Asistencia</th><th className="px-3 py-2.5">Pago / saldo</th><th className="px-3 py-2.5">Dolor inicial</th><th className="px-3 py-2.5">Dolor final</th><th className="px-3 py-2.5">Evolución</th><th className="sticky right-0 z-10 border-l border-slate-200 bg-slate-50 px-3 py-2.5 text-center">Acciones</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{sessions.map((session) => {
        const evolution = sessionEvolution(history, session);
        const attended = session.asistencia === 'asistio';
        const absent = session.asistencia === 'no_asistio';
        const initialPain = evolution ? session.dolor_antes ?? evolution.dolor_inicial : null;
        const finalPain = evolution ? session.dolor_despues ?? evolution.dolor_final : null;
        return <tr key={session.id} className="hover:bg-teal-50/20"><td className="px-3 py-3 font-black">{session.numero_sesion || '-'}</td><td className="px-3 py-3">{formatDate(session.fecha)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${attendanceTone[session.asistencia] || attendanceTone.pendiente}`}>{attendanceLabel[session.asistencia] || session.asistencia}</span></td><td className="px-3 py-3"><strong>{session.estado_pago || 'Pendiente'}</strong><small className="ml-2 text-slate-500">Saldo: {sessionMoney(session, 'saldo_pendiente').toFixed(0)} Bs</small></td><td className="px-3 py-3"><PainValue value={initialPain} /></td><td className="px-3 py-3"><PainValue value={finalPain} /></td><td className="px-3 py-3"><strong className={evolution ? 'text-emerald-700' : absent ? 'text-slate-400' : 'text-amber-700'}>{absent ? 'No aplica' : evolution ? 'Registrado' : 'Pendiente'}</strong>{attended && <button onClick={() => evolution ? onViewEvolution(group, session, evolution) : onRegisterEvolution(group, session)} className="ml-2 text-[10px] font-black text-blue-600">{evolution ? 'Ver evolución' : 'Registrar evolución'}</button>}</td><td className="sticky right-0 z-[1] border-l border-slate-100 bg-white px-3 py-3"><div className="flex justify-center gap-1.5"><button type="button" title="Ver sesión" className="grid h-8 w-8 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600" onClick={() => onViewSession(session)}><Eye size={15} /></button><button type="button" title="Editar sesión" className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700" onClick={() => onEditSession(session)}><FilePenLine size={15} /></button>{onAnnulSession && <button type="button" title="Eliminar sesión" className="grid h-8 w-8 place-items-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600" onClick={() => onAnnulSession(session)}><Trash2 size={15} /></button>}</div></td></tr>;
      })}</tbody>
    </table>
  </div>;
}

export default function SesionesPacienteAccordion({ groups, expandedKey, onToggle, onViewHistory, onNewSession, onViewSession, onEditSession, onAnnulSession, onRegisterEvolution, onViewEvolution }) {
  const [selectedHistory, setSelectedHistory] = useState({});
  const chooseHistory = (groupKey, historyId) => setSelectedHistory((current) => ({ ...current, [groupKey]: historyId }));

  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="hidden grid-cols-[minmax(240px,1.5fr)_120px_130px_180px_130px_30px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500 lg:grid"><span>Paciente</span><span>Historias clínicas</span><span>Sesiones</span><span>Evoluciones</span><span>Última sesión</span><span /></div>
    <div className="divide-y divide-slate-200">{groups.map((group) => {
      const expanded = expandedKey === group.key;
      const historyFor = (session) => session.historia_clinica || group.historias.find((history) => String(history.id) === String(session.historia_clinica_id)) || group.historia;
      const registered = group.sesiones.filter((session) => sessionEvolution(historyFor(session), session)).length;
      const pending = group.sesiones.filter((session) => session.asistencia === 'asistio' && !sessionEvolution(historyFor(session), session)).length;
      const selected = group.historias.find((history) => String(history.id) === String(selectedHistory[group.key]));
      return <article key={group.key} className={`border transition-all duration-300 ${expanded ? 'border-teal-200 border-l-4 border-l-teal-500 bg-teal-50/45' : 'border-transparent bg-white hover:bg-teal-50/20'}`}>
        <button type="button" onClick={() => { onToggle(group.key); if (expanded) chooseHistory(group.key, null); }} aria-expanded={expanded} className="grid w-full items-center gap-4 px-4 py-4 text-left lg:grid-cols-[minmax(240px,1.5fr)_120px_130px_180px_130px_30px] lg:px-5">
          <span className="flex min-w-0 items-center gap-3"><Avatar src={group.paciente?.foto} name={nombrePaciente(group.paciente)} size="sm" className="rounded-full" /><span className="min-w-0"><strong className={`block truncate text-sm font-black uppercase ${expanded ? 'text-teal-900' : 'text-slate-900'}`}>{nombrePaciente(group.paciente)}</strong><small className="mt-1 block text-xs text-slate-500">CI: {group.paciente?.ci || 'Sin dato'} · Tel: {group.paciente?.telefono || 'Sin dato'}</small></span></span>
          <span><strong className="text-sm text-slate-900">{group.historias.length}</strong><small className="block text-xs text-slate-500">{group.historias.length === 1 ? 'historia' : 'historias'}</small></span>
          <span><strong className="text-sm text-slate-900">{group.sesiones.length}</strong><small className="block text-xs text-slate-500">registradas</small></span>
          <span><strong className="block text-xs text-emerald-700">{registered} registrados</strong><small className={`mt-1 block text-xs ${pending ? 'font-bold text-amber-700' : 'text-slate-500'}`}>{pending} pendientes</small></span>
          <span className="text-xs font-bold text-slate-800">{group.ultimaSesion ? formatDate(group.ultimaSesion.fecha) : '-'}</span>
          <ChevronDown size={17} className={`transition-transform duration-300 ${expanded ? 'rotate-180 text-teal-700' : 'text-slate-500'}`} />
        </button>

        <div className={`grid transition-[grid-template-rows] duration-300 ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden"><div className="border-t border-slate-200 bg-slate-50/70 p-4">
          {!selected ? <>
            <div className="mb-3"><h3 className="text-sm font-black uppercase text-slate-900">Historias clínicas del paciente</h3><p className="mt-1 text-xs text-slate-500">Selecciona una historia para ver sus sesiones.</p></div>
            <div className="grid gap-2">{group.historias.map((history) => {
              const sessions = group.sesiones.filter((session) => String(session.historia_clinica_id || session.historia_clinica?.id) === String(history.id));
              const completed = sessions.filter((session) => session.asistencia === 'asistio').length;
              const contracted = Number(history.evaluacion_final?.sesiones_contratadas || 0);
              const historyRegistered = sessions.filter((session) => sessionEvolution(history, session)).length;
              const historyPending = sessions.filter((session) => session.asistencia === 'asistio' && !sessionEvolution(history, session)).length;
              const balance = sessions.reduce((sum, session) => sum + sessionMoney(session, 'saldo_pendiente'), 0);
              const paid = sessions.reduce((sum, session) => sum + sessionMoney(session, 'monto_pagado'), 0);
              const payment = balance > 0 && paid > 0 ? 'Parcial' : balance > 0 ? 'Pendiente' : sessions.length ? 'Pagado' : 'Sin pagos';
              return <article key={history.id} className="grid items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1.4fr)_140px_130px_150px_auto]">
                <div className="min-w-0"><strong className="block text-sm text-slate-900">{formatDate(history.fecha_evaluacion)}</strong><h4 className="mt-1 truncate text-sm font-black uppercase text-emerald-800">{history.condicion_actual?.zona_cuerpo || history.motivo_consulta || 'Historia clínica'}</h4><small className="mt-1 flex items-center gap-1 truncate text-slate-500"><Stethoscope size={12} />{history.profesional_cargo || 'Sin profesional'}</small></div>
                <div><span className="text-[10px] font-black uppercase text-slate-400">Plan de sesiones</span><strong className="mt-1 block text-sm text-slate-800">{completed} de {contracted}</strong><small className="text-slate-500">{Math.max(contracted - completed, 0)} restantes</small></div>
                <div><span className="text-[10px] font-black uppercase text-slate-400">Pago</span><strong className={balance > 0 ? 'mt-1 block text-amber-700' : 'mt-1 block text-emerald-700'}>{payment}</strong><small className="text-slate-500">Saldo: {balance.toFixed(0)} Bs</small></div>
                <div><span className="text-[10px] font-black uppercase text-slate-400">Evoluciones</span><strong className="mt-1 block text-xs text-emerald-700">{historyRegistered} registrados</strong><small className={historyPending ? 'text-amber-700' : 'text-slate-500'}>{historyPending} pendientes</small></div>
                <button type="button" onClick={() => chooseHistory(group.key, history.id)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-black text-white hover:bg-emerald-800"><Eye size={15} />Ver sesiones</button>
              </article>;
            })}</div>
          </> : <HistorySessions group={group} history={selected} onBack={() => chooseHistory(group.key, null)} onViewHistory={onViewHistory} onNewSession={onNewSession} onViewSession={onViewSession} onEditSession={onEditSession} onAnnulSession={onAnnulSession} onRegisterEvolution={onRegisterEvolution} onViewEvolution={onViewEvolution} />}
        </div></div></div>
      </article>;
    })}{!groups.length && <p className="p-8 text-center text-sm text-slate-500">No hay sesiones para mostrar con estos filtros.</p>}</div>
  </div>;
}

function HistorySessions({ group, history, onBack, onViewHistory, onNewSession, onViewSession, onEditSession, onAnnulSession, onRegisterEvolution, onViewEvolution }) {
  const sessions = group.sesiones.filter((session) => String(session.historia_clinica_id || session.historia_clinica?.id) === String(history.id));
  const completed = sessions.filter((session) => session.asistencia === 'asistio' && !session.anulada).length;
  const contracted = Number(history.evaluacion_final?.sesiones_contratadas || 0);
  const planCompleted = contracted > 0 && completed >= contracted;
  return <div className="history-sessions-detail"><button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-700"><ArrowLeft size={15} />Volver a historias</button><div className="mb-3 flex flex-wrap justify-between gap-3"><div><h3 className="text-base font-black uppercase text-emerald-800">{history.condicion_actual?.zona_cuerpo || history.motivo_consulta || 'Historia clínica'}</h3><p className="mt-1 text-xs text-slate-500">Historia clínica: {formatDate(history.fecha_evaluacion)}</p></div><div className="flex gap-5 text-xs"><span><strong>{completed} de {contracted}</strong><small className="block text-slate-500">Plan realizado</small></span><span><strong>{Math.max(contracted - completed, 0)}</strong><small className="block text-slate-500">Restantes</small></span></div></div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="px-3 py-2.5">Sesión</th><th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Asistencia</th><th className="px-3 py-2.5">Pago / saldo</th><th className="px-3 py-2.5">Evolución</th><th className="sticky right-0 z-10 border-l border-slate-200 bg-slate-50 px-3 py-2.5 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{sessions.map((session) => { const evolution = sessionEvolution(history, session); const attended = session.asistencia === 'asistio'; const absent = session.asistencia === 'no_asistio'; return <tr key={session.id}><td className="px-3 py-3 font-black">{session.numero_sesion || '-'}</td><td className="px-3 py-3">{formatDate(session.fecha)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${attendanceTone[session.asistencia] || attendanceTone.pendiente}`}>{attendanceLabel[session.asistencia] || session.asistencia}</span></td><td className="px-3 py-3"><strong>{session.estado_pago || 'Pendiente'}</strong><small className="ml-2 text-slate-500">Saldo: {sessionMoney(session, 'saldo_pendiente').toFixed(0)} Bs</small></td><td className="px-3 py-3"><strong className={evolution ? 'text-emerald-700' : absent ? 'text-slate-400' : 'text-amber-700'}>{absent ? 'No aplica' : evolution ? 'Registrado' : 'Pendiente'}</strong>{attended && <button onClick={() => evolution ? onViewEvolution(group, session, evolution) : onRegisterEvolution(group, session)} className="ml-2 text-[10px] font-black text-blue-600">{evolution ? 'Ver evolución' : 'Registrar evolución'}</button>}</td><td className="sticky right-0 z-[1] border-l border-slate-100 bg-white px-3 py-3 shadow-[-8px_0_14px_-14px_rgba(15,23,42,.6)]"><div className="flex justify-center gap-1.5"><button type="button" title="Ver sesión" className="grid h-8 w-8 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => onViewSession(session)}><Eye size={15} /></button><button type="button" title="Editar sesión" className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => onEditSession(session)}><FilePenLine size={15} /></button>{onAnnulSession && <button type="button" title="Anular sesión" className="grid h-8 w-8 place-items-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100" onClick={() => onAnnulSession(session)}><Trash2 size={15} /></button>}</div></td></tr>; })}</tbody></table></div>
    <SessionsClinicalTable sessions={sessions} history={history} group={group} onViewSession={onViewSession} onEditSession={onEditSession} onAnnulSession={onAnnulSession} onRegisterEvolution={onRegisterEvolution} onViewEvolution={onViewEvolution} />
    <div className="mt-3 flex flex-wrap gap-2"><button className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-700" onClick={() => onViewHistory(history)}><ClipboardList size={15} />Ver historia clínica</button><button disabled={planCompleted} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300" onClick={() => onNewSession({ ...group, historia: history })}><PlusCircle size={15} />{planCompleted ? 'Plan completado' : 'Nueva sesión'}</button><span className="inline-flex items-center gap-2 px-3 text-xs text-slate-500"><CalendarDays size={15} />{sessions.length} sesiones</span></div>
  </div>;
}
