import { BriefcaseBusiness, Clock3, Eye, EyeOff, KeyRound, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ProfilePhotoInput from '../../components/common/ProfilePhoto';

const DIAS = [
  ['lunes', 'Lun'], ['martes', 'Mar'], ['miercoles', 'Mie'], ['jueves', 'Jue'],
  ['viernes', 'Vie'], ['sabado', 'Sab'], ['domingo', 'Dom']
];

function PasswordField({ label = 'Contraseña', value, onChange, required, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <span className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        <KeyRound size={17} className="mr-2 shrink-0 text-brand-600" />
        <input
          className="w-full border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0"
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          required={required}
        />
        <button
          type="button"
          className="ml-2 text-slate-400 transition hover:text-brand-700"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

function UsuarioForm({ form, setForm, editing, onSubmit, onCancel }) {
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const update = (key, value) => setForm({ ...form, [key]: value });
  const toggleDia = (dia) => update(
    'dias_trabajo',
    form.dias_trabajo.includes(dia)
      ? form.dias_trabajo.filter((item) => item !== dia)
      : [...form.dias_trabajo, dia]
  );

  const submit = (event) => {
    event.preventDefault();
    setPasswordError('');
    if (!editing && form.password !== confirmarPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }
    onSubmit(event);
  };

  return (
    <form onSubmit={submit} className="grid max-h-[72vh] gap-4 overflow-y-auto pr-1">
      <div>
        <p className="text-sm text-slate-500">
          {editing
            ? 'Actualiza los datos y el estado de esta cuenta.'
            : 'Registra una cuenta para el personal autorizado de Physio Active.'}
        </p>
      </div>

      <ProfilePhotoInput
        value={form.foto}
        name={`${form.nombres || ''} ${form.apellido_paterno || ''}`.trim() || form.nombre || form.usuario}
        label="Foto del usuario o personal"
        onChange={(foto) => setForm({ ...form, foto })}
      />

      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex items-center gap-2 text-slate-800">
          <UserRound size={19} className="text-brand-600" />
          <h3 className="font-black">Datos personales</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombres" value={form.nombres} onChange={(event) => update('nombres', event.target.value)} required />
          <Input label="Apellido paterno" value={form.apellido_paterno} onChange={(event) => update('apellido_paterno', event.target.value)} required />
          <Input label="Apellido materno" value={form.apellido_materno} onChange={(event) => update('apellido_materno', event.target.value)} />
          <Input label="Cedula de identidad" value={form.ci} onChange={(event) => update('ci', event.target.value)} required />
          <Input
            label="Correo electrónico"
            type="email"
            value={form.email || ''}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <Input
            label="Teléfono (opcional)"
            type="tel"
            value={form.telefono || ''}
            onChange={(event) => setForm({ ...form, telefono: event.target.value })}
          />
        </div>
      </section>

      <section className="rounded-xl border border-emerald-100 bg-emerald-50/55 p-4">
        <div className="mb-4 flex items-center gap-2 text-emerald-800">
          <BriefcaseBusiness size={19} />
          <h3 className="font-black">Datos laborales</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Cargo" value={form.cargo} onChange={(event) => update('cargo', event.target.value)} required />
          <Input label="Fecha de ingreso" type="date" value={form.fecha_ingreso} onChange={(event) => update('fecha_ingreso', event.target.value)} required />
          <Input label="Tipo de pago" value={form.tipo_pago} onChange={(event) => update('tipo_pago', event.target.value)} options={[
            { value: 'mensual', label: 'Mensual' },
            { value: 'por_servicio', label: 'Por servicio' }
          ]} />
          <Input label="Sueldo base (Bs.)" type="number" min="0" step="0.01" value={form.sueldo_base} onChange={(event) => update('sueldo_base', event.target.value)} disabled={form.tipo_pago === 'por_servicio'} />
          <Input label="Direccion" value={form.direccion} onChange={(event) => update('direccion', event.target.value)} multiline className="sm:col-span-2" />
          <Input label="Observaciones" value={form.observaciones} onChange={(event) => update('observaciones', event.target.value)} multiline className="sm:col-span-2" />
        </div>
      </section>

      <section className="rounded-xl border border-cyan-100 bg-cyan-50/55 p-4">
        <div className="mb-4 flex items-center gap-2 text-cyan-800">
          <Clock3 size={19} />
          <h3 className="font-black">Horario de trabajo</h3>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {DIAS.map(([value, label]) => (
            <button key={value} type="button" onClick={() => toggleDia(value)} className={`rounded-lg border px-3 py-2 text-xs font-black ${
              form.dias_trabajo.includes(value) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600'
            }`}>{label}</button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Hora de entrada" type="time" value={form.hora_entrada} onChange={(event) => update('hora_entrada', event.target.value)} required />
          <Input label="Hora de salida" type="time" value={form.hora_salida} onChange={(event) => update('hora_salida', event.target.value)} required />
        </div>
      </section>

      <section className="rounded-xl border border-brand-100 bg-brand-50/55 p-4">
        <div className="mb-4 flex items-center gap-2 text-brand-800">
          <KeyRound size={19} />
          <h3 className="font-black">Datos de acceso</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Usuario"
            value={form.usuario}
            onChange={(event) => setForm({ ...form, usuario: event.target.value })}
            required
          />
          {editing ? (
            <PasswordField
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Nueva contraseña (opcional)"
            />
          ) : (
            <>
              <PasswordField
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
                placeholder="Contraseña"
              />
              <PasswordField
                label="Confirmar contraseña"
                value={confirmarPassword}
                onChange={(event) => setConfirmarPassword(event.target.value)}
                required
                placeholder="Repite la contraseña"
              />
            </>
          )}
        </div>
        {editing && (
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Restablecer contraseña es opcional. Déjala vacía para conservar la actual.
          </p>
        )}
        {passwordError && <p className="mt-3 text-sm font-semibold text-red-600">{passwordError}</p>}
      </section>

      <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="mb-4 flex items-center gap-2 text-blue-800">
          <ShieldCheck size={19} />
          <h3 className="font-black">Acceso al sistema</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Tipo de usuario"
            value={editing && form.rol === 'admin' ? 'Doctor / Administrador' : 'Personal'}
            disabled
          />
          <Input
            label="Estado de cuenta"
            value={form.estado}
            onChange={(event) => setForm({ ...form, estado: event.target.value })}
            options={[
              { value: 'activo', label: 'Activo' },
              { value: 'inactivo', label: 'Inactivo' },
              { value: 'bloqueado', label: 'Bloqueado' }
            ]}
          />
        </div>
        <p className="mt-3 text-xs font-semibold text-blue-700">
          El personal tendrá acceso únicamente a los módulos permitidos por el administrador.
        </p>
      </section>

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 pt-4">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">
          <Save size={17} />
          {editing ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      </div>
    </form>
  );
}

export default UsuarioForm;
