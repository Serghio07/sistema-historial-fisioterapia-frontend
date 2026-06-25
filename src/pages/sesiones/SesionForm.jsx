import { Activity, CalendarDays, CalendarSync, ClipboardPlus, CreditCard, Pill, Save } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function Section({ title, icon: Icon, tone = 'brand', children }) {
  const colors = tone === 'blue'
    ? 'border-blue-100 bg-blue-50/45 text-blue-800'
    : tone === 'cyan'
      ? 'border-cyan-100 bg-cyan-50/45 text-cyan-800'
      : 'border-brand-100 bg-brand-50/45 text-brand-800';
  return (
    <section className={`rounded-lg border p-3 ${colors}`}>
      <div className="mb-2.5 flex items-center gap-2">
        <Icon size={16} />
        <h3 className="text-sm font-black">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SesionForm({ form, setForm, pacientes, editing, onSubmit, onCancel, error }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  const contratadas = Number(form.sesiones_debe || 0);
  const realizadas = Number(form.sesiones_hizo || 0);
  const restantes = Math.max(contratadas - realizadas, 0);

  return (
    <form onSubmit={onSubmit} className="grid max-h-[68vh] gap-2.5 overflow-y-auto pr-1">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="flex items-start gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
        <CalendarSync className="mt-0.5 shrink-0" size={18} />
        Al guardar esta atención, se reflejará automáticamente en Sesiones Semanales.
      </div>

      <Section title="Datos de la sesión" icon={CalendarDays}>
        <div className="grid gap-2.5 md:grid-cols-3">
          <Input
            label="Paciente"
            value={form.paciente_id}
            onChange={(event) => update('paciente_id', event.target.value)}
            options={[
              { value: '', label: 'Seleccionar paciente' },
              ...pacientes.map((paciente) => ({
                value: paciente.id,
                label: `${paciente.nombres} ${paciente.apellidos || ''}`.trim()
              }))
            ]}
            required
            compact
          />
          <Input compact label="Fecha" type="date" value={form.fecha} onChange={(event) => update('fecha', event.target.value)} required />
          <Input
            compact
            label="Número de sesión"
            type="number"
            min="1"
            value={form.numero_sesion}
            onChange={(event) => update('numero_sesion', event.target.value)}
          />
        </div>
      </Section>

      <Section title="Control de sesiones" icon={Activity} tone="cyan">
        <div className="grid gap-2.5 md:grid-cols-3">
          <Input
            compact
            label="Sesiones contratadas"
            type="number"
            min="0"
            value={form.sesiones_debe}
            onChange={(event) => update('sesiones_debe', event.target.value)}
          />
          <Input
            compact
            label="Sesiones realizadas"
            type="number"
            min="0"
            value={form.sesiones_hizo}
            onChange={(event) => update('sesiones_hizo', event.target.value)}
          />
          <label className="grid gap-0.5 text-xs font-bold text-slate-700">
            <span>Sesiones restantes</span>
            <span className="flex min-h-9 items-center rounded-lg border border-cyan-200 bg-white px-3 text-base font-black text-cyan-800 shadow-sm">
              {restantes}
            </span>
          </label>
        </div>
      </Section>

      <Section title="Asistencia y pago" icon={CreditCard} tone="blue">
        <div className="grid gap-2.5 md:grid-cols-3">
          <Input
            compact
            label="Asistencia"
            value={form.asistencia}
            onChange={(event) => update('asistencia', event.target.value)}
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'asistio', label: 'Asistió' },
              { value: 'no_asistio', label: 'Faltó' },
              { value: 'cancelada', label: 'Cancelada' },
              { value: 'reprogramada', label: 'Reprogramada' }
            ]}
          />
          <Input
            compact
            label="Método de pago"
            value={form.metodo_pago}
            onChange={(event) => update('metodo_pago', event.target.value)}
            options={[
              { value: 'Pendiente', label: 'Pendiente' },
              { value: 'Efectivo', label: 'Efectivo' },
              { value: 'QR', label: 'QR' },
              { value: 'Transferencia', label: 'Transferencia' }
            ]}
          />
          <Input
            compact
            label="Estado de pago"
            value={form.estado_pago}
            onChange={(event) => update('estado_pago', event.target.value)}
            options={[
              { value: 'Pendiente', label: 'Pendiente' },
              { value: 'Pagado', label: 'Pagado' },
              { value: 'Parcial', label: 'Parcial' }
            ]}
          />
        </div>
      </Section>

      <Section title="Fármacos" icon={Pill} tone="cyan">
        <div className="grid gap-2.5 md:grid-cols-[190px_1fr]">
          <label className={`flex min-h-9 items-center gap-2 self-start rounded-lg border px-3 text-xs font-bold ${
            form.aplica_farmacos ? 'border-violet-200 bg-violet-50 text-violet-800' : 'border-slate-200 bg-white text-slate-600'
          }`}>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              checked={Boolean(form.aplica_farmacos)}
              onChange={(event) => setForm({
                ...form,
                aplica_farmacos: event.target.checked,
                observacion_farmacos: event.target.checked ? form.observacion_farmacos : ''
              })}
            />
            ¿Aplica fármacos?
          </label>
          <Input
            compact
            label="Observación de fármacos (opcional)"
            value={form.observacion_farmacos}
            onChange={(event) => update('observacion_farmacos', event.target.value)}
            disabled={!form.aplica_farmacos}
            placeholder={form.aplica_farmacos ? 'Ej.: Refiere medicamento para el dolor' : 'Activa la opción para registrar una observación'}
          />
        </div>
      </Section>

      <Section title="Observación clínica" icon={ClipboardPlus}>
        <Input
          label="Evolución, atención o recomendaciones"
          value={form.observacion}
          onChange={(event) => update('observacion', event.target.value)}
          multiline
          rows={2}
          compact
          placeholder="Describe brevemente la atención realizada..."
        />
      </Section>

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 pt-2.5 backdrop-blur">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">
          <Save size={17} />
          {editing ? 'Actualizar sesión' : 'Guardar sesión'}
        </Button>
      </div>
    </form>
  );
}

export default SesionForm;
