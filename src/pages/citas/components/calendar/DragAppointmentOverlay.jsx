export default function DragAppointmentOverlay({ drag }) {
  if (!drag) return null;
  return <div className="pointer-events-none fixed z-[100] w-52 -translate-x-1/2 -translate-y-full rounded-lg border-2 border-dashed border-brand-400 bg-white/95 p-2 shadow-xl" style={{ left: drag.x, top: drag.y - 10 }}>
    <strong className="block text-xs font-black text-brand-700">+ Nueva cita</strong>
    <span className="mt-1 block truncate text-xs font-bold text-slate-800">{drag.patientName}</span>
    <span className="block text-[10px] text-slate-500">La cita original permanecerá intacta</span>
  </div>;
}
