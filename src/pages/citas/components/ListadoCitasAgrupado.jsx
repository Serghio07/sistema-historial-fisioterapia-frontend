import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, ChevronDown, ChevronUp, ClipboardList, Eye, FilePenLine, MoreVertical, Plus, Trash2, UserRound, XCircle } from 'lucide-react';
import { Avatar } from '../../../components/common/ProfilePhoto';
import { formatDate } from '../../../utils/formatDate';
import { formatPatientDocument, nombrePaciente } from '../../../utils/validators';
import { estadoCitaVisible, progresoHistoria, tituloHistoria } from '../utils/agruparCitas';
import { getDisplayPhoneText, getResponsibleRelationship } from '../../../utils/patientContact';

const stateStyles = {
  Pendiente: 'border-amber-200 bg-amber-50 text-amber-800', Programada: 'border-orange-200 bg-orange-50 text-orange-800',
  Confirmada: 'border-blue-200 bg-blue-50 text-blue-800', Atendida: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Cancelada: 'border-red-200 bg-red-50 text-red-800', Reprogramada: 'border-violet-200 bg-violet-50 text-violet-800',
  'No asistio': 'border-slate-200 bg-slate-100 text-slate-700', Falto: 'border-red-200 bg-red-50 text-red-700'
};

function Badge({ children, className = '' }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${className}`}>{children}</span>;
}

function FloatingActionMenu({ label, buttonClassName, buttonSize = 17, children }) {
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const close = () => setPosition(null);
  const toggle = () => {
    if (position) return close();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 192;
    const estimatedHeight = 180;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = rect.bottom + estimatedHeight <= window.innerHeight - 8 ? rect.bottom + 6 : Math.max(8, rect.top - estimatedHeight - 6);
    setPosition({ left, top });
  };
  useEffect(() => {
    if (!position) return undefined;
    const outside = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) close();
    };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    document.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); document.removeEventListener('pointerdown', outside); };
  }, [position]);
  return <span className="shrink-0"><button ref={buttonRef} type="button" aria-label={label} title={label} aria-expanded={Boolean(position)} onClick={toggle} className={buttonClassName}><MoreVertical size={buttonSize} /></button>{position && createPortal(<div ref={menuRef} role="menu" style={{ left: position.left, top: position.top }} className="fixed z-[100] grid w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-2xl">{children(close)}</div>, document.body)}</span>;
}

function AppointmentMenu({ cita, canDelete, onView, onEdit, onCancel, onDelete }) {
  const action = (close, callback) => { close(); callback(cita); };
  return <FloatingActionMenu label="Acciones de la cita" buttonClassName="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50">{(close) => <>
    <button type="button" role="menuitem" className="menu-action" onClick={() => action(close, onView)}><Eye size={15} />Ver detalle</button>
    <button type="button" role="menuitem" className="menu-action" onClick={() => action(close, onEdit)}><FilePenLine size={15} />Editar</button>
    {cita.estado !== 'Cancelada' && <button type="button" role="menuitem" className="menu-action text-red-600" onClick={() => action(close, onCancel)}><XCircle size={15} />Cancelar</button>}
    {canDelete && <button type="button" role="menuitem" className="menu-action text-red-700" onClick={() => action(close, onDelete)}><Trash2 size={15} />Eliminar</button>}
  </>}</FloatingActionMenu>;
}

function AppointmentRow({ cita, canDelete, actions }) {
  const session = cita.numero_sesion ? `Sesión ${cita.numero_sesion}${cita.total_sesiones ? ` de ${cita.total_sesiones}` : ''}` : null;
  return <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm sm:grid-cols-[105px_125px_minmax(0,1fr)_auto] sm:items-center">
    <strong className="text-slate-900">{formatDate(cita.fecha)}</strong>
    <span className="font-semibold text-slate-700">{cita.hora_inicio?.slice(0, 5) || 'Sin hora'}{cita.hora_fin ? ` - ${cita.hora_fin.slice(0, 5)}` : ''}</span>
    <span className="min-w-0"><span className="block truncate font-bold text-slate-800">{session || cita.tipo_atencion || cita.motivo || 'Cita'}</span><small className="block truncate text-slate-500">{cita.profesional?.nombre || cita.registrado_por?.nombre || 'Sin asignar'}{cita.origen ? ` · ${cita.origen}` : ''}</small></span>
    <span className="flex items-center justify-between gap-2 sm:justify-end"><Badge className={stateStyles[cita.estado] || stateStyles.Pendiente}>{estadoCitaVisible(cita)}</Badge><AppointmentMenu cita={cita} canDelete={canDelete} {...actions} /></span>
  </div>;
}

function AppointmentSection({ title, appointments, initiallyVisible = true, canDelete, actions }) {
  const [open, setOpen] = useState(initiallyVisible);
  const [showAll, setShowAll] = useState(false);
  if (!appointments.length) return null;
  const visible = showAll ? appointments : appointments.slice(0, 4);
  return <section className="mt-4">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between text-left"><strong className="text-xs uppercase tracking-wide text-slate-600">{title} ({appointments.length})</strong>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
    <div className={`grid transition-[grid-template-rows] duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden"><div className="mt-2 grid gap-2">{visible.map((cita) => <AppointmentRow key={cita.id} cita={cita} canDelete={canDelete} actions={actions} />)}{appointments.length > 4 && <button type="button" className="justify-self-start text-xs font-black text-brand-700" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Ver menos' : `Ver ${appointments.length - 4} citas más`}</button>}</div></div></div>
  </section>;
}

function HistoryGroup({ section, canDelete, actions }) {
  const history = section.historia;
  const progress = progresoHistoria(section);
  return <article className="rounded-2xl border border-brand-100 bg-brand-50/20 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><span className="flex min-w-0 items-start gap-2"><ClipboardList size={18} className="mt-0.5 shrink-0 text-brand-700" /><span><strong className="block text-sm text-slate-900">{history ? tituloHistoria(history) : 'Citas sin historia clínica asociada'}</strong>{history && <small className="mt-1 block text-slate-500">{history.fecha_evaluacion ? `Iniciada: ${formatDate(history.fecha_evaluacion)}` : ''}{history.profesional_cargo ? ` · ${history.profesional_cargo}` : ''}</small>}</span></span>{history?.estado && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{history.estado}</Badge>}</div>
    {progress && <div className="mt-3"><div className="mb-1 flex justify-between text-xs font-bold text-slate-600"><span>Progreso real</span><span>{progress.completed} de {progress.contracted} sesiones</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-600" style={{ width: `${progress.percent}%` }} /></div></div>}
    <AppointmentSection title="Próximas citas" appointments={section.upcoming} canDelete={canDelete} actions={actions} />
    <AppointmentSection title="Citas anteriores" appointments={section.previous} initiallyVisible={false} canDelete={canDelete} actions={actions} />
    <AppointmentSection title="Canceladas y reprogramadas" appointments={section.cancelled} initiallyVisible={false} canDelete={canDelete} actions={actions} />
    {!section.citas.length && <p className="mt-3 text-sm text-slate-500">No existen citas para mostrar.</p>}
  </article>;
}

function PatientMenu({ patientId, onPatient, onNewAppointment }) {
  return <FloatingActionMenu label="Acciones del paciente" buttonSize={18} buttonClassName="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600">{(close) => <><button type="button" role="menuitem" className="menu-action" onClick={() => { close(); onPatient(patientId); }}><UserRound size={15} />Ver paciente</button><button type="button" role="menuitem" className="menu-action" onClick={() => { close(); onNewAppointment(patientId); }}><Plus size={15} />Agendar nueva cita</button></>}</FloatingActionMenu>;
}

export default function ListadoCitasAgrupado({ groups, expanded, onToggle, canDelete, onView, onEdit, onCancel, onDelete, onPatient, onNewAppointment, onClearFilters }) {
  if (!groups.length) return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center"><CalendarClock className="mx-auto text-slate-300" size={34} /><h4 className="mt-3 font-black text-slate-800">No se encontraron citas</h4><p className="mt-1 text-sm text-slate-500">No existen citas que coincidan con los filtros seleccionados.</p><button type="button" onClick={onClearFilters} className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-black text-white">Limpiar filtros</button></div>;
  const actions = { onView, onEdit, onCancel, onDelete };
  return <div className="grid gap-4">{groups.map((group) => {
    const sourcePatient = group.paciente || {};
    const patient = { ...sourcePatient, telefono: getDisplayPhoneText(sourcePatient) };
    const open = Boolean(expanded[group.key]); const next = group.proxima;
    return <article key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <div className="p-4 md:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3"><Avatar src={patient.foto} name={nombrePaciente(patient)} size="md" className="rounded-full" /><div className="min-w-0"><h4 className="truncate text-base font-black text-slate-900">{nombrePaciente(patient)}</h4><p className="mt-1 truncate text-xs text-slate-500">{formatPatientDocument(patient)}{patient.telefono ? ` · Tel: ${patient.telefono}` : ' · Sin teléfono'}</p><div className="mt-2 flex flex-wrap gap-2">{group.whatsapp && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">WhatsApp</Badge>}{patient.registro_pendiente === true && <Badge className="border-amber-200 bg-amber-50 text-amber-800">Registro pendiente</Badge>}</div></div></div>
        <div className="grid flex-[1.5] grid-cols-2 gap-3 md:grid-cols-4"><span><small className="block text-[10px] font-black uppercase text-slate-400">Próxima cita</small><strong className="mt-1 block text-sm text-slate-800">{next ? formatDate(next.fecha) : 'No tiene citas próximas'}</strong>{next && <small className="text-slate-500">{next.hora_inicio?.slice(0, 5)}{next.hora_fin ? ` - ${next.hora_fin.slice(0, 5)}` : ''}</small>}</span><span><small className="block text-[10px] font-black uppercase text-slate-400">Citas próximas</small><strong className="mt-1 block text-sm text-slate-800">{group.proximas}</strong><small className="text-slate-500">{group.historiasCount} historias relacionadas</small></span><span><small className="block text-[10px] font-black uppercase text-slate-400">Profesional</small><strong className="mt-1 block truncate text-sm text-slate-800">{next?.profesional?.nombre || next?.registrado_por?.nombre || 'Sin asignar'}</strong></span><span><small className="block text-[10px] font-black uppercase text-slate-400">Estado</small>{next ? <Badge className={`mt-1 ${stateStyles[next.estado] || stateStyles.Pendiente}`}>{estadoCitaVisible(next)}</Badge> : <span className="mt-1 block text-sm text-slate-500">Sin próxima cita</span>}</span></div>
        <div className="flex gap-2"><button type="button" onClick={() => onToggle(group.key)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-black text-white transition hover:bg-brand-700 xl:flex-none">{open ? 'Ocultar citas' : 'Ver citas'}{open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>{patient.id && <PatientMenu patientId={patient.id} onPatient={onPatient} onNewAppointment={onNewAppointment} />}</div>
      </div></div>
      <div className={`grid transition-[grid-template-rows] duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden"><div className="grid gap-3 border-t border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-2 md:p-5">{group.historias.map((section) => <HistoryGroup key={section.key} section={section} canDelete={canDelete} actions={actions} />)}</div></div></div>
    </article>;
  })}</div>;
}
