import { Activity, BriefcaseBusiness, Home, Save, UserRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ProfilePhotoInput from '../../components/common/ProfilePhoto';
import { boliviaDate } from '../../utils/boliviaDateTime';

const civilStatusOptions = [
  { value: '', label: 'SELECCIONAR' },
  { value: 'SOLTERO/A', label: 'SOLTERO/A' },
  { value: 'CASADO/A', label: 'CASADO/A' },
  { value: 'DIVORCIADO/A', label: 'DIVORCIADO/A' },
  { value: 'VIUDO/A', label: 'VIUDO/A' },
  { value: 'CONCUBINO/A', label: 'CONCUBINO/A' },
  { value: 'OTRO', label: 'OTRO' }
];

const upperFields = new Set(['nombres', 'apellidos', 'lugar_nacimiento', 'estado_civil', 'ocupacion', 'domicilio', 'referencia']);

const calculateAge = (date) => {
  if (!date) return '';
  const birth = new Date(`${date}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date(`${boliviaDate()}T12:00:00-04:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : '';
};

const bmiCategory = (value) => {
  const bmi = Number(value);
  if (!bmi) return '';
  if (bmi < 18.5) return 'BAJO PESO';
  if (bmi < 25) return 'NORMAL';
  if (bmi < 30) return 'SOBREPESO';
  return 'OBESIDAD';
};

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon size={17} /></span>
        <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function PacienteForm({ form, setForm, onSubmit, onCancel, submitting = false }) {
  const update = (key, rawValue) => {
    let value = upperFields.has(key) ? rawValue.toLocaleUpperCase('es-BO') : rawValue;
    if (key === 'ci' || key === 'telefono') value = rawValue.replace(/\D/g, '');
    const next = { ...form, [key]: value };
    if (key === 'fecha_nacimiento') next.edad = calculateAge(value);
    setForm(next);
  };

  const updateMeasurement = (key, value) => {
    const next = { ...form, [key]: value };
    const peso = Number(next.peso);
    const talla = Number(next.talla);
    next.imc = peso > 0 && talla > 0 ? (peso / (talla ** 2)).toFixed(2) : '';
    setForm(next);
  };

  const today = boliviaDate();

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <ProfilePhotoInput value={form.foto} name={`${form.nombres || ''} ${form.apellidos || ''}`} label="Foto del paciente" onChange={(foto) => update('foto', foto)} />

      <Section icon={UserRound} title="Datos personales">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Input required label="Nombres *" value={form.nombres} onChange={(e) => update('nombres', e.target.value)} placeholder="NOMBRES DEL PACIENTE" />
          <Input required label="Apellidos *" value={form.apellidos} onChange={(e) => update('apellidos', e.target.value)} placeholder="APELLIDOS DEL PACIENTE" />
          <Input required label="CI *" inputMode="numeric" value={form.ci} onChange={(e) => update('ci', e.target.value)} placeholder="SOLO NÚMEROS" />
          <Input label="Fecha de nacimiento" type="date" max={today} value={form.fecha_nacimiento || ''} onChange={(e) => update('fecha_nacimiento', e.target.value)} />
          <Input label="Lugar de nacimiento" value={form.lugar_nacimiento || ''} onChange={(e) => update('lugar_nacimiento', e.target.value)} />
          <Input label="Edad" value={form.edad === '' || form.edad == null ? '' : `${form.edad} AÑOS`} readOnly className="[&_input]:bg-slate-100" />
          <fieldset className="grid self-start gap-1 text-sm font-bold text-slate-700">
            <legend className="mb-1">SEXO *</legend>
            <div className="grid grid-cols-2 gap-2">
              {['MASCULINO', 'FEMENINO'].map((sexo) => {
                const selected = form.sexo === sexo;
                return (
                  <button
                    key={sexo}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update('sexo', sexo)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-black transition ${
                      selected
                        ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'
                    }`}
                  >
                    {sexo}
                  </button>
                );
              })}
            </div>
            <input className="sr-only" tabIndex={-1} required value={form.sexo} onChange={() => {}} aria-label="Sexo" />
          </fieldset>
        </div>
      </Section>

      <Section icon={BriefcaseBusiness} title="Contacto y perfil">
        <div className="grid gap-3 md:grid-cols-3">
          <Input required label="Teléfono *" inputMode="numeric" minLength={7} maxLength={8} value={form.telefono} onChange={(e) => update('telefono', e.target.value)} placeholder="7 U 8 DÍGITOS" />
          <Input label="Estado civil" value={form.estado_civil || ''} onChange={(e) => update('estado_civil', e.target.value)} options={civilStatusOptions} />
          <Input label="Ocupación" value={form.ocupacion || ''} onChange={(e) => update('ocupacion', e.target.value)} />
        </div>
      </Section>

      <Section icon={Home} title="Dirección y referencia">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Domicilio" value={form.domicilio || ''} onChange={(e) => update('domicilio', e.target.value)} multiline />
          <Input label="Punto de referencia" value={form.referencia || ''} onChange={(e) => update('referencia', e.target.value)} multiline />
        </div>
      </Section>

      <Section icon={Activity} title="Datos antropométricos">
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Peso (kg)" type="number" min="0.01" step="0.01" value={form.peso || ''} onChange={(e) => updateMeasurement('peso', e.target.value)} />
          <Input label="Talla (m)" type="number" min="0.01" step="0.01" value={form.talla || ''} onChange={(e) => updateMeasurement('talla', e.target.value)} />
          <Input label="IMC" value={form.imc || ''} readOnly className="[&_input]:bg-slate-100" />
        </div>
        {form.imc && <p className="mt-3 text-xs font-black text-brand-700">CLASIFICACIÓN: {bmiCategory(form.imc)}</p>}
      </Section>

      <div className="sticky -bottom-4 z-20 -mx-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_18px_rgba(15,23,42,0.06)] backdrop-blur">
        <Button type="button" variant="ghost" onClick={onCancel}>CANCELAR</Button>
        <Button type="submit" disabled={submitting}><Save size={17} />{submitting ? 'GUARDANDO...' : 'GUARDAR'}</Button>
      </div>
    </form>
  );
}

export default PacienteForm;
