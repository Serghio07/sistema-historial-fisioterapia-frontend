import { Check, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SUCCESS_EVENT = 'app:success';

function SuccessToast() {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const showToast = (event, type) => {
      window.clearTimeout(timeoutRef.current);
      setToast({
        id: Date.now(),
        message: event.detail?.message || 'Operación realizada correctamente.',
        type
      });
      timeoutRef.current = window.setTimeout(() => setToast(null), 3200);
    };

    const showSuccess = (event) => showToast(event, 'success');
    const showError = (event) => showToast(event, 'error');
    window.addEventListener(SUCCESS_EVENT, showSuccess);
    window.addEventListener('app:error', showError);
    return () => {
      window.removeEventListener(SUCCESS_EVENT, showSuccess);
      window.removeEventListener('app:error', showError);
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className={`success-toast fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-xl ${toast.type === 'error' ? 'border-red-200 text-red-800' : 'border-emerald-200 text-emerald-800'}`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
        {toast.type === 'error' ? <X size={22} strokeWidth={3} /> : <Check size={22} strokeWidth={3} />}
      </span>
      <div>
        <strong className="block text-sm font-black">{toast.type === 'error' ? 'No se pudo completar' : '¡Listo!'}</strong>
        <span className="text-sm font-semibold">{toast.message}</span>
      </div>
    </div>
  );
}

export default SuccessToast;
