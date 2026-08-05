import { ArrowLeft, ArrowRight, BriefcaseBusiness, Clock3, Eye, EyeOff, KeyRound, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ProfilePhotoInput from '../../components/common/ProfilePhoto';

const DIAS = [
  ['lunes', 'Lun'], ['martes', 'Mar'], ['miercoles', 'Mie'], ['jueves', 'Jue'],
  ['viernes', 'Vie'], ['sabado', 'Sab'], ['domingo', 'Dom']
];
const TITULOS = ['', 'Doc.', 'Dr.', 'Dra.', 'Lic.', 'Tec. Sup.', 'Sr.', 'Sra.'];
const CARGOS_SUGERIDOS = ['Ft.', 'Kine.', 'Enfermera', 'Adm.', 'Rec.', 'Aux.', 'Pas.'];

const STEPS = [
  { title: 'Datos personales', description: 'Identidad, contacto y fotografía.', icon: UserRound },
  { title: 'Datos laborales', description: 'Cargo, ingreso y forma de pago.', icon: BriefcaseBusiness },
  { title: 'Horario laboral', description: 'Días y horarios de ingreso y salida.', icon: Clock3 },
  { title: 'Acceso', description: 'Usuario, contraseña y estado.', icon: ShieldCheck }
];

function PasswordField({ label = 'Contraseña', value, onChange, required, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <span className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        <KeyRound size={17} className="mr-2 text-brand-600" />
        <input className="w-full border-0 bg-transparent p-0 text-sm focus:ring-0" type={visible ? 'text' : 'password'} value={value} placeholder={placeholder} onChange={onChange} required={required} />
        <button type="button" className="ml-2 text-slate-400 hover:text-brand-700" onClick={() => setVisible(!visible)} aria-label="Mostrar u ocultar contraseña">
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

function UsuarioForm({ form, setForm, editing, onSubmit, onCancel }) {
  const [step, setStep] = useState(0);
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const update = (key, value) => setForm({ ...form, [key]: value });
  const updateUppercase = (key, value) => update(key, String(value || '').toLocaleUpperCase('es-BO'));
  const nombreCompleto = [form.nombres, form.apellido_paterno, form.apellido_materno]
    .filter(Boolean)
    .join(' ')
    .trim();
  const cargoMostrado = String(form.cargo || '').trim().toLocaleUpperCase('es-BO') === 'ENFERMERA'
    ? 'Enf.'
    : form.cargo;
  const nombreMostrado = [form.titulo_profesional, cargoMostrado, nombreCompleto]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    setStep(0);
    setError('');
    setConfirmarPassword('');
  }, [editing]);

  const toggleDia = (dia) => update('dias_trabajo', form.dias_trabajo.includes(dia)
    ? form.dias_trabajo.filter((item) => item !== dia)
    : [...form.dias_trabajo, dia]);

  const validateStep = () => {
    if (step === 0 && (!form.nombres?.trim() || !form.apellido_paterno?.trim() || !form.ci?.trim() || !form.email?.trim())) {
      return 'Completa nombres, apellido paterno, cédula y correo.';
    }
    if (step === 1 && (!form.cargo?.trim() || !form.fecha_ingreso || (form.tipo_pago === 'mensual' && form.sueldo_base === ''))) {
      return 'Completa cargo, fecha de ingreso y sueldo.';
    }
    if (step === 2 && (!form.dias_trabajo.length || !form.hora_entrada || !form.hora_salida)) {
      return 'Selecciona los días y el horario de trabajo.';
    }
    if (step === 2 && form.hora_salida <= form.hora_entrada) return 'La hora de salida debe ser posterior a la entrada.';
    if (step === 3 && !form.usuario?.trim()) return 'Ingresa el nombre de usuario.';
    if (step === 3 && !editing && (!form.password || form.password !== confirmarPassword)) return 'Las contraseñas son obligatorias y deben coincidir.';
    return '';
  };

  const next = () => {
    const validation = validateStep();
    setError(validation);
    if (!validation) setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const submit = (event) => {
    event.preventDefault();
    const validation = validateStep();
    setError(validation);
    if (!validation) onSubmit(event);
  };

  const CurrentIcon = STEPS[step].icon;
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><CurrentIcon size={19} /></span>
            <div><h3 className="font-black text-slate-900">{STEPS[step].title}</h3><p className="text-xs text-slate-500">{STEPS[step].description}</p></div>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">Paso {step + 1} de {STEPS.length}</span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {STEPS.map((item, index) => <button key={item.title} type="button" onClick={() => index < step && setStep(index)} className={`h-2 rounded-full ${index <= step ? 'bg-brand-600' : 'bg-slate-200'}`} aria-label={item.title} />)}
        </div>
      </div>

      <div className="max-h-[52vh] overflow-y-auto pr-1">
        {step === 0 && <div className="grid gap-4">
          <ProfilePhotoInput value={form.foto} name={`${form.nombres || ''} ${form.apellido_paterno || ''}`} label="Foto del personal" onChange={(foto) => update('foto', foto)} />
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombres" value={form.nombres} onChange={(e) => updateUppercase('nombres', e.target.value)} className="[&_input]:uppercase" required />
              <Input label="Apellido paterno" value={form.apellido_paterno} onChange={(e) => updateUppercase('apellido_paterno', e.target.value)} className="[&_input]:uppercase" required />
              <Input label="Apellido materno" value={form.apellido_materno} onChange={(e) => updateUppercase('apellido_materno', e.target.value)} className="[&_input]:uppercase" />
              <Input label="Cédula de identidad" value={form.ci} onChange={(e) => updateUppercase('ci', e.target.value)} className="[&_input]:uppercase" required />
              <Input label="Correo electrónico" type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} required />
              <Input label="Teléfono" value={form.telefono || ''} onChange={(e) => update('telefono', e.target.value)} />
            </div>
          </section>
        </div>}

        {step === 1 && <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Título profesional (opcional)"
              value={form.titulo_profesional || ''}
              onChange={(e) => update('titulo_profesional', e.target.value)}
              options={TITULOS.map((value) => ({ value, label: value || 'Sin título' }))}
            />
            <div>
              <Input
                label="Cargo / Área"
                value={form.cargo}
                onChange={(e) => updateUppercase('cargo', e.target.value)}
                className="[&_input]:uppercase"
                list="cargo-area-options"
                placeholder="Selecciona o escribe uno"
                required
              />
              <datalist id="cargo-area-options">
                {CARGOS_SUGERIDOS.map((cargo) => <option key={cargo} value={cargo} />)}
              </datalist>
            </div>
            <Input label="Nombre completo" value={nombreCompleto} disabled />
            <Input label="Nombre mostrado" value={nombreMostrado} disabled />
            <Input label="Fecha de ingreso" type="date" value={form.fecha_ingreso} onChange={(e) => update('fecha_ingreso', e.target.value)} required />
            <Input label="Tipo de pago" value={form.tipo_pago} onChange={(e) => update('tipo_pago', e.target.value)} options={[{ value: 'mensual', label: 'Mensual' }, { value: 'por_servicio', label: 'Por servicio' }]} />
            <Input label="Sueldo base (Bs.)" type="number" min="0" step="0.01" value={form.sueldo_base} onChange={(e) => update('sueldo_base', e.target.value)} disabled={form.tipo_pago === 'por_servicio'} />
            <Input label="Dirección" value={form.direccion} onChange={(e) => updateUppercase('direccion', e.target.value)} multiline className="sm:col-span-2 [&_textarea]:uppercase" />
          </div>
        </section>}

        {step === 2 && <section className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
          <div className="mb-4 rounded-xl border border-cyan-200 bg-white p-3 text-xs leading-5 text-slate-600">
            <strong className="block text-sm text-brand-700">Horario de atención del centro</strong>
            <span className="mt-1 block">LUNES A VIERNES: 09:00–12:30 Y 15:00–19:30</span>
            <span className="block">SÁBADOS: 09:00–12:30</span>
          </div>
          <p className="mb-3 text-sm font-bold text-slate-700">Días de trabajo del personal</p>
          <div className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {DIAS.map(([value, label]) => <button key={value} type="button" onClick={() => toggleDia(value)} className={`rounded-xl border px-2 py-3 text-xs font-black transition ${form.dias_trabajo.includes(value) ? 'border-brand-600 bg-brand-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'}`}>{label}</button>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Hora de ingreso" type="time" value={form.hora_entrada} onChange={(e) => update('hora_entrada', e.target.value)} required />
            <Input label="Hora de salida" type="time" value={form.hora_salida} onChange={(e) => update('hora_salida', e.target.value)} required />
          </div>
        </section>}

        {step === 3 && <div className="grid gap-4">
          <section className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Usuario" value={form.usuario} onChange={(e) => update('usuario', e.target.value)} required />
              {editing
                ? <PasswordField value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Nueva contraseña (opcional)" />
                : <>
                  <PasswordField value={form.password} onChange={(e) => update('password', e.target.value)} required placeholder="Contraseña" />
                  <PasswordField label="Confirmar contraseña" value={confirmarPassword} onChange={(e) => setConfirmarPassword(e.target.value)} required placeholder="Repite la contraseña" />
                </>}
            </div>
          </section>
          <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Tipo de usuario" value={form.rol === 'admin' ? 'Doctor / Administrador' : 'Personal'} disabled />
              <Input label="Estado de cuenta" value={form.estado} onChange={(e) => update('estado', e.target.value)} options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }, { value: 'bloqueado', label: 'Bloqueado' }]} />
            </div>
          </section>
        </div>}
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Button variant="ghost" onClick={step === 0 ? onCancel : () => { setError(''); setStep(step - 1); }}>
          {step > 0 && <ArrowLeft size={17} />}{step === 0 ? 'Cancelar' : 'Anterior'}
        </Button>
        {step < STEPS.length - 1
          ? <Button onClick={next}>Siguiente<ArrowRight size={17} /></Button>
          : <Button type="submit"><Save size={17} />{editing ? 'Guardar cambios' : 'Crear personal'}</Button>}
      </div>
    </form>
  );
}

export default UsuarioForm;
