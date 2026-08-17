import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock3, GripVertical } from 'lucide-react';
import { canDragAppointment } from '../../utils/appointmentCreation';

const tones = {
  Pendiente: 'border-amber-300 bg-amber-50 text-amber-900', Programada: 'border-blue-300 bg-blue-50 text-blue-900',
  Confirmada: 'border-emerald-300 bg-emerald-50 text-emerald-900', Atendida: 'border-teal-300 bg-teal-50 text-teal-900',
  Cancelada: 'border-red-200 bg-red-50 text-red-800', Reprogramada: 'border-violet-300 bg-violet-50 text-violet-900',
  'No asistio': 'border-rose-300 bg-rose-50 text-rose-900', Falto: 'border-slate-300 bg-slate-100 text-slate-700'
};

const patientName = (cita) => [cita.paciente?.nombres, cita.paciente?.apellidos].filter(Boolean).join(' ').trim() || 'Paciente';

export default function AppointmentCard({ appointment, compact = false, onOpen, onPointerDrag }) {
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const draggable = canDragAppointment(appointment);
  const name = patientName(appointment);
  const professional = appointment.profesional?.nombre || appointment.registrado_por?.nombre || 'Sin profesional';
  const start = String(appointment.hora_inicio || '').slice(0, 5);
  const end = String(appointment.hora_fin || '').slice(0, 5) || 'Sin hora final';
  const showTooltip = (element) => {
    const rect = element.getBoundingClientRect();
    const below = rect.top < 220;
    setTooltipPosition({
      left: Math.max(128, Math.min(window.innerWidth - 128, rect.left + rect.width / 2)),
      top: below ? rect.bottom + 10 : rect.top - 10,
      below
    });
  };
  const tooltip = tooltipPosition && createPortal(
    <span
      role="tooltip"
      className="pointer-events-none fixed z-[100] block w-60 rounded-xl bg-slate-950 p-3 text-left text-white shadow-2xl"
      style={{ left: tooltipPosition.left, top: tooltipPosition.top, transform: tooltipPosition.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)' }}
    >
      <span className="block truncate text-xs font-black uppercase">{name}</span>
      <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-cyan-300"><Clock3 size={11} />{start} – {end}</span>
      <span className="my-2 block border-t border-slate-700" />
      <span className="block text-[10px] leading-5"><b className="text-cyan-300">Estado:</b> {appointment.estado}</span>
      <span className="block truncate text-[10px] leading-5"><b className="text-cyan-300">Atención:</b> {appointment.tipo_atencion || 'Sin tipo'}</span>
      <span className="block truncate text-[10px] leading-5"><b className="text-cyan-300">Profesional:</b> {professional}</span>
      {appointment.numero_sesion && <span className="block text-[10px] leading-5"><b className="text-cyan-300">Sesión:</b> {appointment.numero_sesion}{appointment.total_sesiones ? ` de ${appointment.total_sesiones}` : ''}</span>}
      <span className="mt-2 block border-t border-slate-700 pt-2 text-center text-[9px] font-black uppercase tracking-wide text-slate-300">Haz clic para ver el detalle completo</span>
      <span className={`absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-x-transparent ${tooltipPosition.below ? 'bottom-full border-b-[7px] border-b-slate-950' : 'top-full border-t-[7px] border-t-slate-950'}`} />
    </span>,
    document.body
  );
  return <>
    <button
    type="button"
    onMouseEnter={(event) => showTooltip(event.currentTarget)}
    onMouseLeave={() => setTooltipPosition(null)}
    onFocus={(event) => showTooltip(event.currentTarget)}
    onBlur={() => setTooltipPosition(null)}
    onClick={(event) => { event.stopPropagation(); onOpen(appointment); }}
    onPointerDown={(event) => { event.stopPropagation(); if (draggable) onPointerDrag(event, appointment); }}
    className={`group relative flex min-w-0 items-start gap-1 rounded-md border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight transition hover:brightness-95 ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer opacity-75'} ${tones[appointment.estado] || tones.Pendiente}`}
    aria-label={`${draggable ? 'Arrastrar para crear nueva cita o abrir' : 'Abrir cita'} de ${name}`}
  >
    {draggable && <GripVertical size={12} className="mt-0.5 shrink-0 opacity-45" />}
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1 font-black"><Clock3 size={11} />{String(appointment.hora_inicio || '').slice(0, 5)}</span>
      <span className="block truncate font-bold">{name}</span>
      {!compact && <span className="block truncate opacity-70">{appointment.estado} · {appointment.tipo_atencion || 'Sin tipo'}</span>}
    </span>
    </button>
    {tooltip}
  </>;
}
