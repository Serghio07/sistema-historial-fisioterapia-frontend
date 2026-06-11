import { Save, ShieldCheck, UserRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function UsuarioForm({ form, setForm, editing, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="rounded-lg border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4">
        <div className="mb-4 flex items-center gap-2 text-brand-800">
          <UserRound size={19} />
          <h3 className="font-black">Datos de acceso</h3>
        </div>
        <div className="grid gap-4">
          <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <Input label="Usuario" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} required />
          <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input
            label="Password"
            type="password"
            value={form.password}
            placeholder={editing ? 'Dejar vacio para conservar' : ''}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editing}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white/90 p-4">
        <div className="mb-4 flex items-center gap-2 text-ink">
          <ShieldCheck size={19} className="text-brand-600" />
          <h3 className="font-black">Permisos</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Rol"
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
            options={[
              { value: 'personal', label: 'Personal' },
              { value: 'admin', label: 'Admin' }
            ]}
          />
          <Input
            label="Estado"
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value })}
            options={[
              { value: 'activo', label: 'Activo' },
              { value: 'inactivo', label: 'Inactivo' }
            ]}
          />
        </div>
      </div>
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
