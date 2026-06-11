import { Save } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function PacienteForm({ form, setForm, editing, onSubmit, onCancel }) {
  const update = (key, value) => setForm({ ...form, [key]: value });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
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
          { value: 'M', label: 'M' },
          { value: 'F', label: 'F' },
          { value: 'Otro', label: 'Otro' }
        ]}
      />
      <Input label="Telefono" value={form.telefono} onChange={(e) => update('telefono', e.target.value)} />
      <Input label="Estado civil" value={form.estado_civil} onChange={(e) => update('estado_civil', e.target.value)} />
      <Input label="Ocupacion" value={form.ocupacion} onChange={(e) => update('ocupacion', e.target.value)} />
      <Input label="Domicilio" value={form.domicilio} onChange={(e) => update('domicilio', e.target.value)} multiline />
      <Input label="Referencia" value={form.referencia} onChange={(e) => update('referencia', e.target.value)} multiline className="md:col-span-2" />
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button type="submit">
          <Save size={17} />
          Guardar
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

export default PacienteForm;
