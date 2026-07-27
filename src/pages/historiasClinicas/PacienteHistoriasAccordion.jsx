import {
  Activity, Ban, CalendarDays, ChevronDown, ClipboardList, ClipboardPlus,
  FilePenLine, FileText, FolderOpen, MoreHorizontal, Stethoscope,
  UserRound
} from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';
import { Avatar } from '../../components/common/ProfilePhoto';

const isCompleted = (session) => !session?.anulada
  && String(session?.estado || '').toLowerCase() !== 'anulada'
  && String(session?.asistencia || '').toLowerCase() === 'asistio';

const tones = {
  activa: { text: 'text-emerald-700', dot: 'bg-emerald-500', avatar: 'bg-emerald-50 ring-emerald-100', label: 'activa' },
  borrador: { text: 'text-amber-700', dot: 'bg-amber-400', avatar: 'bg-amber-50 ring-amber-100', label: 'en borrador' },
  anulada: { text: 'text-rose-700', dot: 'bg-rose-400', avatar: 'bg-rose-50 ring-rose-100', label: 'anulada' }
};

function Metric({ icon: Icon, label, value, hint, separated }) {
  return <div className={`flex min-w-0 items-center gap-3 px-4 py-3 ${separated ? 'border-t border-slate-100 sm:border-l sm:border-t-0' : ''}`}>
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"><Icon size={19} strokeWidth={1.8} /></span>
    <span className="min-w-0">
      <small className="block truncate text-[11px] font-semibold text-slate-500">{label}</small>
      <strong className="mt-0.5 block truncate text-xs font-black uppercase text-slate-800" title={value}>{value}</strong>
      {hint && <small className="mt-0.5 block text-[10px] text-slate-400">{hint}</small>}
    </span>
  </div>;
}

function Action({ icon: Icon, children, tone = 'slate', onClick }) {
  const styles = {
    blue: 'border-blue-200 text-blue-700 hover:bg-blue-50',
    green: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    violet: 'border-violet-200 text-violet-700 hover:bg-violet-50',
    slate: 'border-slate-200 text-slate-600 hover:bg-slate-50'
  };
  return <button type="button" onClick={onClick} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold transition ${styles[tone]}`}><Icon size={16} />{children}</button>;
}

export default function PacienteHistoriasAccordion({
  group, sesiones, expanded, onToggle, onShowHistory, onNew, onViewPatient,
  onView, onEdit, onPreview, onViewEvolutions, onAnular, isAdmin
}) {
  const { paciente, allHistorias } = group;
  const latest = group.historias[0] || allHistorias[0];
  const [showMenu, setShowMenu] = useState(false);
  const tone = tones[latest.estado] || tones.borrador;
  const initials = nombrePaciente(paciente).split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('');
  const sessionStory = latest.estado === 'activa' ? latest : allHistorias.find((story) => story.estado === 'activa' && Number(story.evaluacion_final?.sesiones_contratadas || 0));
  const contracted = Number(sessionStory?.evaluacion_final?.sesiones_contratadas || 0);
  const completed = sessionStory ? sesiones.filter((session) => String(session.historia_clinica_id || session.historia_clinica?.id) === String(sessionStory.id) && isCompleted(session)).length : 0;
  const remaining = Math.max(contracted - completed, 0);
  const progress = contracted ? Math.min(100, completed / contracted * 100) : 0;
  const pain = latest.intervencion_clinica?.escala_dolor;
  const dateLabel = formatDate(latest.fecha_evaluacion);
  const activateRow = (event) => {
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    if (event.type === 'keydown') event.preventDefault();
    onToggle();
  };
  const runMenuAction = (callback) => { callback(); setShowMenu(false); };

  return <article className={`border transition-all duration-300 ${expanded ? 'border-teal-200 border-l-4 border-l-teal-500 bg-teal-50/55 shadow-[0_3px_12px_rgba(15,118,110,0.06)]' : 'border-transparent bg-white hover:bg-teal-50/25'}`}>
    <div role="button" tabIndex={0} aria-expanded={expanded} onClick={activateRow} onKeyDown={activateRow} className={`group grid cursor-pointer items-center gap-4 px-4 py-4 outline-none transition-colors duration-300 md:grid-cols-[minmax(240px,1.55fr)_minmax(175px,.9fr)_minmax(140px,.7fr)_minmax(165px,.8fr)_32px] md:px-5 ${expanded ? 'bg-teal-50/70' : 'bg-white hover:bg-teal-50/30'}`}>
      <span className="flex min-w-0 items-center gap-3">
        <Avatar src={paciente?.foto} name={nombrePaciente(paciente)} size="sm" className="rounded-full" />
        <span className="min-w-0"><strong className={`block truncate text-sm font-black uppercase transition-colors duration-300 ${expanded ? 'text-teal-900' : 'text-slate-900'}`}>{nombrePaciente(paciente)}</strong><small className="mt-1 block text-xs text-slate-500">CI: {paciente?.ci || 'Sin dato'}</small></span>
      </span>
      <span><span className={`inline-flex items-center gap-2 text-xs font-bold ${tone.text}`}><i className={`h-2 w-2 rounded-full ${tone.dot}`} />Historia {tone.label}</span><small className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13} />{dateLabel}</small></span>
      <span className="flex items-center gap-2.5"><ClipboardList size={22} className="text-slate-400" /><span><strong className="block text-xs text-slate-700">{allHistorias.length} {allHistorias.length === 1 ? 'historia' : 'historias'}</strong>{allHistorias.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); onShowHistory(); }} className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-800">Ver historial</button>}</span></span>
      <span>{contracted > 0 ? <><strong className="text-sm text-slate-900">{completed} de {contracted}</strong><small className="mt-1 block text-xs text-slate-500">{remaining} restantes</small><span className="mt-2 block h-1 overflow-hidden rounded-full bg-slate-200"><i className="block h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} /></span></> : <small className="text-xs font-semibold text-slate-500">Sin sesiones</small>}</span>
      <span className={`grid h-8 w-8 place-items-center transition-colors duration-300 ${expanded ? 'text-teal-700' : 'text-slate-500'}`}><ChevronDown size={18} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} /></span>
    </div>

    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="overflow-hidden">
        <div className="relative mx-2 mb-2 rounded-xl border border-teal-200 bg-teal-50/45 p-4 pl-6 shadow-[0_1px_3px_rgba(15,118,110,.05)] transition-colors duration-300 md:mx-4 md:p-5 md:pl-7">
          <span className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl bg-teal-500" />
          <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[.08em] text-emerald-700"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50"><CalendarDays size={14} /></span>Última historia clínica</div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_285px]">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="grid sm:grid-cols-2 xl:grid-cols-4">
                <Metric icon={CalendarDays} label="Fecha" value={dateLabel} hint="Última historia" />
                <Metric icon={Stethoscope} label="Motivo de consulta" value={latest.motivo_consulta || 'Sin registrar'} separated />
                <Metric icon={UserRound} label="Zona afectada" value={latest.condicion_actual?.zona_cuerpo || 'Sin especificar'} separated />
                <Metric icon={Activity} label="Nivel de dolor" value={pain === '' || pain == null ? 'No evaluado' : `${pain}/10`} separated />
              </div>
              <dl className="border-t border-slate-100 text-xs">
                <div className="grid gap-2 px-4 py-3 sm:grid-cols-[210px_1fr]"><dt className="flex items-center gap-2 text-slate-500"><FileText size={15} className="text-slate-400" />Diagnóstico</dt><dd className="font-black uppercase text-slate-800">{latest.diagnostico_medico || 'Sin registrar'}</dd></div>
                <div className="grid gap-2 border-t border-slate-100 px-4 py-3 sm:grid-cols-[210px_1fr]"><dt className="flex items-center gap-2 text-slate-500"><UserRound size={15} className="text-slate-400" />Profesional responsable</dt><dd className="font-black uppercase text-slate-800">{latest.profesional_cargo || 'Sin profesional registrado'}</dd></div>
              </dl>
            </section>

            <aside className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.06em] text-emerald-700"><Activity size={16} />Progreso de sesiones</h3>
              {contracted > 0 ? <><div className="mt-5 flex items-end gap-1.5"><strong className="text-3xl font-black text-slate-900">{completed}</strong><span className="pb-1 text-base font-bold text-slate-700">de {contracted}</span></div><p className="mt-1 text-xs text-slate-500">sesiones realizadas</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} /></div><div className="mt-3 flex justify-between text-[11px] font-bold"><span className="text-emerald-600">{Math.round(progress)}% completado</span><span className="text-slate-500">{remaining} restantes</span></div></> : <p className="mt-5 text-sm text-slate-500">Sin sesiones contratadas.</p>}
            </aside>
          </div>

          <div className={`mt-4 grid gap-2 border-t border-slate-200 pt-4 ${allHistorias.length > 1 ? 'sm:grid-cols-2 xl:grid-cols-6' : 'sm:grid-cols-2 xl:grid-cols-5'}`}>
            <Action icon={FilePenLine} tone="blue" onClick={() => onView(latest)}>Ver historia</Action>
            <Action icon={FileText} tone="violet" onClick={() => onPreview(latest)}>Vista previa PDF</Action>
            <Action icon={ClipboardList} tone="green" onClick={() => onViewEvolutions(latest)}>Ver evolucións</Action>
            <Action icon={UserRound} onClick={onViewPatient}>Datos del paciente</Action>
            {allHistorias.length > 1 && <Action icon={FolderOpen} onClick={onShowHistory}>Ver historial completo ({allHistorias.length})</Action>}
            <div className="relative"><Action icon={MoreHorizontal} onClick={() => setShowMenu(!showMenu)}>Más acciones</Action>{showMenu && <div className="absolute bottom-full right-0 z-20 mb-1 grid min-w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{latest.estado !== 'anulada' && <button className="menu-action" onClick={() => runMenuAction(() => onEdit(latest))}><FilePenLine size={15} />Editar historia</button>}<button className="menu-action" onClick={() => runMenuAction(onNew)}><ClipboardPlus size={15} />Nueva evaluación</button>{isAdmin && latest.estado !== 'anulada' && <button className="menu-action text-red-600 hover:bg-red-50" onClick={() => runMenuAction(() => onAnular(latest))}><Ban size={15} />Anular historia</button>}</div>}</div>
          </div>
        </div>
      </div>
    </div>
  </article>;
}
