import { useState } from 'react';
import AppointmentCard from './AppointmentCard';

const START_MINUTES = 8 * 60;
const END_MINUTES = 20 * 60;
const STEP = 30;
const minutesOf = (time) => {
  const [hour, minute] = String(time || '').slice(0, 5).split(':').map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null;
};
export const timeGridSlots = (appointments = []) => {
  const starts = appointments.map((item) => minutesOf(item.hora_inicio)).filter(Number.isFinite);
  const ends = appointments.map((item) => minutesOf(item.hora_fin)).filter(Number.isFinite);
  const start = Math.max(0, Math.min(START_MINUTES, ...(starts.map((value) => Math.floor(value / STEP) * STEP))));
  const end = Math.min(24 * 60, Math.max(END_MINUTES, ...(ends.map((value) => Math.ceil(value / STEP) * STEP)), ...(starts.map((value) => Math.ceil((value + STEP) / STEP) * STEP))));
  return Array.from({ length: Math.max(1, (end - start) / STEP) }, (_, index) => {
    const value = start + index * STEP;
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  });
};
const slotFor = (time) => {
  const [hour, minute] = String(time || '').slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hour)) return '';
  const rounded = Math.floor(minute / STEP) * STEP;
  return `${String(hour).padStart(2, '0')}:${String(rounded).padStart(2, '0')}`;
};
const isoDate = (date) => {
  const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const weekday = (date) => date.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit' });

export function TimeGridView({ days, appointmentsByDate, onOpen, onPointerDrag, onEmptySlot }) {
  const visibleAppointments = days.flatMap((day) => appointmentsByDate[isoDate(day)] || []);
  const slots = timeGridSlots(visibleAppointments);
  return <div className="max-h-[68vh] overflow-auto rounded-lg border border-slate-200 bg-white">
    <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(150px, 1fr))` }}>
      <div className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-50" />
      {days.map((day) => <div key={isoDate(day)} className="sticky top-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center"><strong className="text-xs capitalize text-slate-700">{weekday(day)}</strong></div>)}
      {slots.flatMap((time) => [
        <div key={`time-${time}`} className="sticky left-0 z-10 min-h-16 border-b border-r border-slate-200 bg-slate-50 px-2 pt-1 text-right text-[10px] font-bold text-slate-400">{time}</div>,
        ...days.map((day) => {
          const date = isoDate(day);
          const appointments = (appointmentsByDate[date] || []).filter((item) => slotFor(item.hora_inicio) === time);
          return <div key={`${date}-${time}`} data-calendar-drop="time" data-date={date} data-time={time} onClick={() => onEmptySlot({ fecha: date, hora_inicio: time })} className="min-h-16 border-b border-r border-slate-200 p-1 transition hover:bg-brand-50/40">
            <div className={`grid gap-1 ${appointments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {appointments.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onOpen={onOpen} onPointerDrag={onPointerDrag} />)}
            </div>
          </div>;
        })
      ])}
    </div>
  </div>;
}

export function MonthView({ days, cursor, appointmentsByDate, onOpen, onPointerDrag, onEmptyDay }) {
  const [popover, setPopover] = useState(null);
  return <div>
    <div className="grid grid-cols-7 border-l border-t border-slate-200 text-center text-[11px] font-black uppercase text-slate-400">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((day) => <span key={day} className="border-b border-r border-slate-200 bg-slate-50 py-2">{day}</span>)}</div>
    <div className="grid grid-cols-7 border-l border-slate-200">
      {days.map((day) => {
        const date = isoDate(day); const items = appointmentsByDate[date] || []; const outside = day.getMonth() !== cursor.getMonth();
        return <div key={date} data-calendar-drop="day" data-date={date} onClick={() => onEmptyDay({ fecha: date, hora_inicio: '' })} className={`relative min-h-28 border-b border-r border-slate-200 p-1.5 hover:bg-brand-50/30 ${outside ? 'bg-slate-50/70 text-slate-400' : 'bg-white'}`}>
          <span className="mb-1 block text-right text-xs font-black">{day.getDate()}</span>
          <div className="grid gap-1">{items.slice(0, 3).map((appointment) => <AppointmentCard key={appointment.id} compact appointment={appointment} onOpen={onOpen} onPointerDrag={onPointerDrag} />)}</div>
          {items.length > 3 && <button type="button" onClick={(event) => { event.stopPropagation(); setPopover({ date, items }); }} className="mt-1 text-[11px] font-black text-brand-700">+{items.length - 3} más</button>}
        </div>;
      })}
    </div>
    {popover && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4" onMouseDown={(event) => event.target === event.currentTarget && setPopover(null)}><section className="max-h-[70vh] w-full max-w-sm overflow-auto rounded-xl bg-white p-4 shadow-2xl"><div className="mb-3 flex justify-between"><strong>Citas del {popover.date}</strong><button type="button" onClick={() => setPopover(null)}>Cerrar</button></div><div className="grid gap-2">{popover.items.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onOpen={(item) => { setPopover(null); onOpen(item); }} onPointerDrag={(event, item) => { setPopover(null); onPointerDrag(event, item); }} />)}</div></section></div>}
  </div>;
}
