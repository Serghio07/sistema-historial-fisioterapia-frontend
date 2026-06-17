import { Eye, EyeOff, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function UsuarioForm({ form, setForm, editing, onSubmit, onCancel }) {
  const [showPassword, setShowPassword] = useState(false);

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
          <label className="grid w-full self-start gap-1 text-sm font-bold text-slate-700">
            <span>Password</span>
            <span className="flex items-center rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm text-ink shadow-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <input
                className="w-full border-0 bg-transparent p-0 text-sm shadow-none placeholder:text-slate-400 focus:ring-0"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                placeholder={editing ? 'Nueva contrasena o dejar vacio' : ''}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editing}
              />
              <button
                type="button"
                className="ml-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? 'Ocultar contrasena' : 'Ver contrasena'}
                aria-label={showPassword ? 'Ocultar contrasena' : 'Ver contrasena'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
            {editing && <span className="text-xs font-semibold text-slate-500">Por seguridad no se muestra la contrasena actual. Escribe una nueva solo si deseas cambiarla.</span>}
          </label>
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
              { value: 'inactivo', label: 'Inactivo' },
              { value: 'bloqueado', label: 'Bloqueado' }
            ]}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
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

export default UsuarioForm;
