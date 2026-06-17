import { BriefcaseBusiness, Home, Save, UserRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const civilStatusOptions = [
  { value: '', label: 'Seleccionar' },
  { value: 'Soltero', label: 'Soltero' },
  { value: 'Casado', label: 'Casado' }
];

function PacienteForm({ form, setForm, editing, onSubmit, onCancel }) {
  const update = (key, value) => setForm({ ...form, [key]: value });

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <UserRound size={18} />
          </span>
          <h4 className="text-sm font-black uppercase text-slate-700">Datos personales</h4>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nombres" value={form.nombres} onChange={(e) => update('nombres', e.target.value)} />
          <Input label="Apellidos" value={form.apellidos} onChange={(e) => update('apellidos', e.target.value)} />
          <Input label="CI" value={form.ci} onChange={(e) => update('ci', e.target.value)} />
          <Input label="Nacimiento" type="date" value={form.fecha_nacimiento} onChange={(e) => update('fecha_nacimiento', e.target.value)} />
          <Input label="Edad" type="number" value={form.edad} onChange={(e) => update('edad', e.target.value)} />
          <Input
            label="Sexo"
            value={form.sexo}
            onChange={(e) => update('sexo', e.target.value)}
            options={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Femenino' },
              { value: 'Otro', label: 'Otro' }
            ]}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <BriefcaseBusiness size={18} />
          </span>
          <h4 className="text-sm font-black uppercase text-slate-700">Contacto y perfil</h4>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Telefono" value={form.telefono} onChange={(e) => update('telefono', e.target.value)} />
          <Input label="Estado civil" value={form.estado_civil} onChange={(e) => update('estado_civil', e.target.value)} options={civilStatusOptions} />
          <Input label="Ocupacion" value={form.ocupacion} onChange={(e) => update('ocupacion', e.target.value)} className="md:col-span-2" />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <Home size={18} />
          </span>
          <h4 className="text-sm font-black uppercase text-slate-700">Direccion y referencia</h4>
        </div>
        <div className="grid gap-4">
          <Input label="Domicilio" value={form.domicilio} onChange={(e) => update('domicilio', e.target.value)} multiline />
          <Input label="Referencia" value={form.referencia} onChange={(e) => update('referencia', e.target.value)} multiline />
        </div>
      </div>

      <div className="sticky-actions">
        <Button type="submit">
          <Save size={17} />
          Guardar
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

export default PacienteForm;
