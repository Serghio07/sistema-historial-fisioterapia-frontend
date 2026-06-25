import { BriefcaseBusiness, Home, Save, UserRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ProfilePhotoInput from '../../components/common/ProfilePhoto';

const civilStatusOptions = [
  { value: '', label: 'Seleccionar' },
  { value: 'Soltero', label: 'Soltero' },
  { value: 'Casado', label: 'Casado' }
];

function PacienteForm({ form, setForm, editing, onSubmit, onCancel }) {
  const update = (key, value) => setForm({ ...form, [key]: value });

  return (
    <form onSubmit={onSubmit} className="grid max-h-[72vh] gap-2.5 overflow-y-auto pr-1">
      <ProfilePhotoInput
        value={form.foto}
        name={`${form.nombres || ''} ${form.apellidos || ''}`}
        label="Foto del paciente"
        onChange={(foto) => update('foto', foto)}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <UserRound size={16} />
          </span>
          <h4 className="text-xs font-black uppercase text-slate-700">Datos personales</h4>
        </div>
        <div className="grid gap-2.5 md:grid-cols-3">
          <Input compact label="Nombres" value={form.nombres} onChange={(e) => update('nombres', e.target.value)} />
          <Input compact label="Apellidos" value={form.apellidos} onChange={(e) => update('apellidos', e.target.value)} />
          <Input compact label="CI" value={form.ci} onChange={(e) => update('ci', e.target.value)} />
          <Input compact label="Nacimiento" type="date" value={form.fecha_nacimiento} onChange={(e) => update('fecha_nacimiento', e.target.value)} />
          <Input compact label="Edad" type="number" value={form.edad} onChange={(e) => update('edad', e.target.value)} />
          <Input
            compact
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

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <BriefcaseBusiness size={16} />
          </span>
          <h4 className="text-xs font-black uppercase text-slate-700">Contacto y perfil</h4>
        </div>
        <div className="grid gap-2.5 md:grid-cols-3">
          <Input compact label="Teléfono" value={form.telefono} onChange={(e) => update('telefono', e.target.value)} />
          <Input compact label="Estado civil" value={form.estado_civil} onChange={(e) => update('estado_civil', e.target.value)} options={civilStatusOptions} />
          <Input compact label="Ocupación" value={form.ocupacion} onChange={(e) => update('ocupacion', e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <Home size={16} />
          </span>
          <h4 className="text-xs font-black uppercase text-slate-700">Dirección y referencia</h4>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2">
          <Input compact label="Domicilio" value={form.domicilio} onChange={(e) => update('domicilio', e.target.value)} multiline />
          <Input compact label="Referencia" value={form.referencia} onChange={(e) => update('referencia', e.target.value)} multiline />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 pt-2.5 backdrop-blur">
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
