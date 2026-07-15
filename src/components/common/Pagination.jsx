import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange, pageSizes = [10, 20, 50] }) {
  if (!total) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((item) => item === 1 || item === totalPages || Math.abs(item - safePage) <= 1);
  const visible = [];
  pages.forEach((item, index) => {
    if (index && item - pages[index - 1] > 1) visible.push(`gap-${item}`);
    visible.push(item);
  });

  return <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row">
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
      Mostrar
      <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="h-10 rounded-lg border-slate-200 bg-white px-3 pr-8 text-sm font-bold text-slate-700 shadow-sm focus:border-brand-500 focus:ring-brand-500/20">
        {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
      por página
    </label>
    <nav className="flex items-center gap-2" aria-label="Paginación">
      <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage === 1} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft size={17} /></button>
      {visible.map((item) => typeof item === 'string'
        ? <span key={item} className="px-1 text-slate-400">…</span>
        : <button key={item} type="button" onClick={() => onPageChange(item)} className={`h-9 min-w-9 rounded-lg border px-3 text-sm font-bold transition ${item === safePage ? 'border-brand-600 bg-brand-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{item}</button>)}
      <button type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage === totalPages} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"><ChevronRight size={17} /></button>
    </nav>
  </div>;
}
