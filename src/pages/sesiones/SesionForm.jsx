import { AlertTriangle, Save } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function SesionForm({ form, setForm, pacientes, editing, onSubmit, onCancel, error }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  const restantes = Math.max(Number(form.sesiones_debe || 0) - Number(form.sesiones_hizo || 0), 0);
  const completado = Number(form.sesiones_debe || 0) > 0 && Number(form.sesiones_hizo || 0) >= Number(form.sesiones_debe || 0);

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {completado && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          Este paciente ya completo todas sus sesiones registradas.
        </div>
      )}

      <div className="form-grid">
        <Input
          label="Paciente"
          value={form.paciente_id}
          onChange={(e) => update('paciente_id', e.target.value)}
          options={[
            { value: '', label: 'Seleccionar paciente' },
            ...pacientes.map((paciente) => ({ value: paciente.id, label: `${paciente.nombres} ${paciente.apellidos || ''}`.trim() }))
          ]}
        />
        <Input label="Fecha" type="date" value={form.fecha} onChange={(e) => update('fecha', e.target.value)} />
        <Input label="Sesiones que debe" type="number" min="0" value={form.sesiones_debe} onChange={(e) => update('sesiones_debe', e.target.value)} />
        <Input label="Sesiones que hizo" type="number" min="0" value={form.sesiones_hizo} onChange={(e) => update('sesiones_hizo', e.target.value)} />
        <Input
          label="Asistencia"
          value={form.asistencia}
          onChange={(e) => update('asistencia', e.target.value)}
          options={[
            { value: 'pendiente', label: 'Pendiente' },
            { value: 'asistio', label: 'Asistio' },
            { value: 'no_asistio', label: 'No asistio' },
            { value: 'cancelada', label: 'Cancelada' },
            { value: 'reprogramada', label: 'Reprogramada' }
          ]}
        />
        <Input
          label="Metodo de pago"
          value={form.metodo_pago}
          onChange={(e) => update('metodo_pago', e.target.value)}
          options={[
            { value: 'Pendiente', label: 'Pendiente' },
            { value: 'QR', label: 'QR' },
            { value: 'Efectivo', label: 'Efectivo' },
            { value: 'Transferencia', label: 'Transferencia' }
          ]}
        />
        <Input label="Observacion" value={form.observacion} onChange={(e) => update('observacion', e.target.value)} multiline className="md:col-span-2" />
      </div>

      <div className="grid gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 md:grid-cols-3">
        <div>
          <span className="text-xs font-black uppercase text-brand-700">Debe</span>
          <strong className="block text-2xl text-ink">{Number(form.sesiones_debe || 0)}</strong>
        </div>
        <div>
          <span className="text-xs font-black uppercase text-brand-700">Hizo</span>
          <strong className="block text-2xl text-ink">{Number(form.sesiones_hizo || 0)}</strong>
        </div>
        <div>
          <span className="text-xs font-black uppercase text-brand-700">Restantes</span>
          <strong className={`block text-2xl ${restantes === 0 && Number(form.sesiones_debe || 0) > 0 ? 'text-amber-700' : 'text-ink'}`}>{restantes}</strong>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">
          <Save size={17} />
          {editing ? 'Actualizar sesion' : 'Guardar sesion'}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

export default SesionForm;
