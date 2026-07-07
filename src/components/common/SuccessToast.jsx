import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SUCCESS_EVENT = 'app:success';

function SuccessToast() {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const showToast = (event) => {
      window.clearTimeout(timeoutRef.current);
      setToast({
        id: Date.now(),
        message: event.detail?.message || 'Operación realizada correctamente.'
      });
      timeoutRef.current = window.setTimeout(() => setToast(null), 3200);
    };

    window.addEventListener(SUCCESS_EVENT, showToast);
    return () => {
      window.removeEventListener(SUCCESS_EVENT, showToast);
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="success-toast fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-emerald-800 shadow-xl"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
        <Check size={22} strokeWidth={3} />
      </span>
      <div>
        <strong className="block text-sm font-black uppercase">¡Listo!</strong>
        <span className="text-sm font-semibold">{toast.message}</span>
      </div>
    </div>
  );
}

export default SuccessToast;
