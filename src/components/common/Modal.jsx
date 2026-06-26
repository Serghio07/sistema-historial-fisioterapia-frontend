import { X } from 'lucide-react';

const sizes = {
  md: 'max-w-2xl',
  sessions: 'max-w-3xl',
  compact: 'max-w-4xl',
  lg: 'max-w-5xl'
};

function Modal({ open, title, subtitle, children, onClose, size = 'md' }) {
  if (!open) return null;

  return (
    <div data-modal-scroll className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4">
      <section className={`my-4 w-full overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] ${sizes[size] || sizes.md}`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-ink">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            aria-label="Cerrar modal"
            title="Cerrar"
          >
            <X size={19} />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

export default Modal;
