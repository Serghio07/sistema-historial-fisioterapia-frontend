import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Save } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { expandirSesionesHistoria } from '../../services/historiaClinicaService';

export default function AmpliarSesionesModal({ open, onClose, historia, totalActual = 0, onExpanded }) {
  const [incremento, setIncremento] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(null);
  const nuevoTotal = useMemo(() => Number(totalActual || 0) + Number(incremento || 0), [incremento, totalActual]);

  useEffect(() => {
    if (!open) return;
    setIncremento(1); setMotivo(''); setError(''); setSaving(false);
    requestId.current = crypto.randomUUID();
  }, [open, historia?.id]);

  const save = async () => {
    if (!Number.isInteger(Number(incremento)) || Number(incremento) <= 0) return setError('Ingrese una cantidad entera mayor que cero.');
    setSaving(true); setError('');
    try {
      const result = await expandirSesionesHistoria(historia.id, { incremento: Number(incremento), motivo: motivo.trim() }, requestId.current);
      await onExpanded?.(result);
      onClose?.();
    } catch (e) { setError(e.response?.data?.message || 'No se pudo ampliar el plan de tratamiento.'); }
    finally { setSaving(false); }
  };

  return <Modal open={open} onClose={saving ? undefined : onClose} title="Ampliar sesiones" subtitle="El cambio quedará registrado en el historial del plan." size="sm">
    <div className="grid gap-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-teal-100 bg-teal-50 p-4 text-center">
        <div><small className="font-bold text-slate-500">Total actual</small><strong className="block text-2xl text-slate-900">{totalActual}</strong></div>
        <ArrowRight className="text-teal-600" />
        <div><small className="font-bold text-slate-500">Nuevo total</small><strong className="block text-2xl text-teal-700">{nuevoTotal}</strong></div>
      </div>
      <Input label="Sesiones adicionales *" type="number" min="1" step="1" value={incremento} onChange={(e) => setIncremento(e.target.value)} disabled={saving} />
      <Input label="Motivo de la ampliación (opcional)" multiline rows="4" maxLength="500" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: el profesional indica continuar el tratamiento..." disabled={saving} />
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button><Button onClick={save} disabled={saving}><Save size={16} />{saving ? 'Guardando…' : 'Confirmar ampliación'}</Button></div>
    </div>
  </Modal>;
}
