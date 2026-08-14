import { useEffect } from 'react';
import { X } from 'lucide-react';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  sessions: 'max-w-2xl',
  compact: 'max-w-3xl',
  lg: 'max-w-4xl',
  patient: 'max-w-[900px]',
  planilla: 'max-w-[1100px]',
  report: 'max-w-5xl',
  xl: 'max-w-6xl'
};

function Modal({ open, title, subtitle, children, onClose, size = 'md', patientStyle = false, closeOnBackdrop = false, closeOnEscape = false }) {
  useEffect(() => {
    if (!open || !closeOnEscape) return undefined;
    const close = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [closeOnEscape, onClose, open]);

  if (!open) return null;
  const structuredBody = patientStyle || size === 'planilla';
  const compactPlanilla = size === 'planilla';

  return (
    <div data-modal-scroll onMouseDown={(event) => { if (closeOnBackdrop && event.target === event.currentTarget) onClose?.(); }} className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-3">
      <section className={`my-3 flex w-full flex-col overflow-hidden border border-white/80 bg-white ${compactPlanilla ? 'max-h-[85vh] rounded-xl shadow-[0_24px_60px_rgba(15,23,42,0.22)]' : patientStyle ? 'max-h-[90vh] rounded-2xl shadow-[0_24px_60px_rgba(15,23,42,0.22)]' : 'max-h-[92vh] rounded-xl shadow-[0_18px_55px_rgba(15,23,42,0.18)]'} ${sizes[size] || sizes.md}`}>
        <header className={`flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 ${compactPlanilla ? 'px-5 py-3' : patientStyle ? 'px-6 py-5' : 'px-4 py-3'}`}>
          <div className="min-w-0">
            <h2 className={`truncate font-bold text-[#1E293B] ${patientStyle ? 'text-lg' : 'text-base'}`}>{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#94A3B8] transition hover:bg-[#F1F5F9] hover:text-[#334155] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            aria-label="Cerrar modal"
            title="Cerrar"
          >
            <X size={19} />
          </button>
        </header>
        <div className={`min-h-0 ${structuredBody ? 'flex flex-1 flex-col overflow-hidden p-0' : 'overflow-y-auto p-4'}`}>{children}</div>
      </section>
    </div>
  );
}

export default Modal;
