import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../../../components/common/Button';

const VIEWS = ['dia', 'semana', 'mes'];

export default function CalendarHeader({ view, title, onView, onMove, onToday }) {
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={onToday}><CalendarDays size={16} />Hoy</Button>
      <button type="button" onClick={() => onMove(-1)} aria-label="Periodo anterior" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft size={18} /></button>
      <button type="button" onClick={() => onMove(1)} aria-label="Periodo siguiente" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight size={18} /></button>
      <strong className="ml-1 min-w-48 text-sm capitalize text-slate-800">{title}</strong>
    </div>
    <div className="inline-flex rounded-lg bg-slate-100 p-1">
      {VIEWS.map((item) => <button key={item} type="button" onClick={() => onView(item)} className={`min-h-9 rounded-md px-4 text-xs font-black capitalize transition ${view === item ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{item}</button>)}
    </div>
  </div>;
}
