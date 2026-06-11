import { Save } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function UsuarioForm({ form, setForm, editing, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
      <Input label="Usuario" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
      <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Input
        label="Password"
        type="password"
        value={form.password}
        placeholder={editing ? 'Dejar vacio para conservar' : ''}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <Input
        label="Rol"
        value={form.rol}
        onChange={(e) => setForm({ ...form, rol: e.target.value })}
        options={[
          { value: 'personal', label: 'Personal' },
          { value: 'admin', label: 'Admin' }
        ]}
      />
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={Boolean(form.estado)} onChange={(e) => setForm({ ...form, estado: e.target.checked })} />
        Activo
      </label>
      <div className="flex flex-wrap gap-2">
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

export default UsuarioForm;
