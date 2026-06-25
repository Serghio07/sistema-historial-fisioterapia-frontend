import { BriefcaseBusiness, Clock3, Save, UserRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const DIAS = [
  ['lunes', 'Lun'], ['martes', 'Mar'], ['miercoles', 'Mie'], ['jueves', 'Jue'],
  ['viernes', 'Vie'], ['sabado', 'Sab'], ['domingo', 'Dom']
];

function PersonalForm({ form, setForm, usuarios, editing, onSubmit, onCancel }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  const toggleDia = (dia) => update(
    'dias_trabajo',
    form.dias_trabajo.includes(dia)
      ? form.dias_trabajo.filter((item) => item !== dia)
      : [...form.dias_trabajo, dia]
  );

  return (
    <form onSubmit={onSubmit} className="grid max-h-[72vh] gap-4 overflow-y-auto pr-1">
      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex items-center gap-2"><UserRound size={18} className="text-brand-600" /><h3 className="font-black">Datos personales</h3></div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Apellido paterno" value={form.apellido_paterno} onChange={(e) => update('apellido_paterno', e.target.value)} required />
          <Input label="Apellido materno" value={form.apellido_materno} onChange={(e) => update('apellido_materno', e.target.value)} />
          <Input label="Nombres" value={form.nombres} onChange={(e) => update('nombres', e.target.value)} required />
          <Input label="Cedula de identidad" value={form.ci} onChange={(e) => update('ci', e.target.value)} required />
          <Input label="Telefono" value={form.telefono} onChange={(e) => update('telefono', e.target.value)} />
          <Input label="Fecha de ingreso" type="date" value={form.fecha_ingreso} onChange={(e) => update('fecha_ingreso', e.target.value)} required />
          <Input label="Direccion" value={form.direccion} onChange={(e) => update('direccion', e.target.value)} multiline className="md:col-span-3" />
        </div>
      </section>

      <section className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
        <div className="mb-4 flex items-center gap-2"><BriefcaseBusiness size={18} className="text-brand-700" /><h3 className="font-black">Datos laborales</h3></div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Cargo" value={form.cargo} onChange={(e) => update('cargo', e.target.value)} required />
          <Input label="Tipo de pago" value={form.tipo_pago} onChange={(e) => update('tipo_pago', e.target.value)} options={[
            { value: 'mensual', label: 'Mensual' },
            { value: 'por_servicio', label: 'Por servicio' }
          ]} />
          <Input label="Sueldo base (Bs.)" type="number" min="0" step="0.01" value={form.sueldo_base} onChange={(e) => update('sueldo_base', e.target.value)} disabled={form.tipo_pago === 'por_servicio'} />
          <Input label="Estado" value={form.estado} onChange={(e) => update('estado', e.target.value)} options={[
            { value: 'activo', label: 'Activo' },
            { value: 'inactivo', label: 'Inactivo' }
          ]} />
          <Input label="Cuenta del sistema (opcional)" value={form.usuario_id} onChange={(e) => update('usuario_id', e.target.value)} options={[
            { value: '', label: 'Sin cuenta vinculada' },
            ...usuarios.map((usuario) => ({ value: usuario.id, label: `${usuario.nombre} (@${usuario.usuario})` }))
          ]} className="md:col-span-2" />
        </div>
      </section>

      <section className="rounded-xl border border-cyan-100 bg-cyan-50/45 p-4">
        <div className="mb-4 flex items-center gap-2"><Clock3 size={18} className="text-cyan-700" /><h3 className="font-black">Horario de trabajo</h3></div>
        <div className="mb-4 flex flex-wrap gap-2">
          {DIAS.map(([value, label]) => (
            <button key={value} type="button" onClick={() => toggleDia(value)} className={`rounded-lg border px-3 py-2 text-xs font-black transition ${
              form.dias_trabajo.includes(value) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
            }`}>{label}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Hora de entrada" type="time" value={form.hora_entrada} onChange={(e) => update('hora_entrada', e.target.value)} required />
          <Input label="Hora de salida" type="time" value={form.hora_salida} onChange={(e) => update('hora_salida', e.target.value)} required />
        </div>
      </section>

      <Input label="Observaciones" value={form.observaciones} onChange={(e) => update('observaciones', e.target.value)} multiline />

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white/95 pt-3">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Save size={17} />{editing ? 'Guardar cambios' : 'Registrar personal'}</Button>
      </div>
    </form>
  );
}

export default PersonalForm;
