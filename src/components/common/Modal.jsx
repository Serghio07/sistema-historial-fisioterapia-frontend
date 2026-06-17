import Button from './Button';

const sizes = {
  md: 'max-w-2xl',
  lg: 'max-w-5xl'
};

function Modal({ open, title, children, onClose, size = 'md' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4">
      <section className={`my-4 w-full rounded-lg bg-white shadow-soft ${sizes[size] || sizes.md}`}>
        <header className="flex items-center justify-between border-b border-slate-200 p-3">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </header>
        <div className="p-3">{children}</div>
      </section>
    </div>
  );
}

export default Modal;
