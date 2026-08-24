import { useEffect, useState } from 'react';
import { Activity, BriefcaseBusiness, Home, Save, UserRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ProfilePhotoInput from '../../components/common/ProfilePhoto';
import { boliviaDate } from '../../utils/boliviaDateTime';
import { isMinorByBirthDate } from '../../utils/patientAge';
import ContactosPaciente, { ContactosPreparados } from './ContactosPaciente';

const civilStatusOptions = [
  { value: '', label: 'SELECCIONAR' },
  { value: 'SOLTERO/A', label: 'SOLTERO/A' },
  { value: 'CASADO/A', label: 'CASADO/A' },
  { value: 'DIVORCIADO/A', label: 'DIVORCIADO/A' },
  { value: 'VIUDO/A', label: 'VIUDO/A' },
  { value: 'CONCUBINO/A', label: 'CONCUBINO/A' },
  { value: 'OTRO', label: 'OTRO' }
];
const documentTypeOptions = [
  { value: 'CI', label: 'CI' },
  { value: 'DNI', label: 'DNI' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'CEDULA', label: 'Cédula' },
  { value: 'CARNET_EXTRANJERIA', label: 'Carné de extranjería' },
  { value: 'OTRO', label: 'Otro' }
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
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-teal-50 text-teal-700"><Icon size={14} /></span>
        <h3 className="text-xs font-black uppercase tracking-wide text-teal-700">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function PacienteForm({ form, setForm, onSubmit, onCancel, submitting = false, ciError = '', pacienteId = null, preparedContacts = [], onPreparedContactsChange, onLinkedContactsChange }) {
  const [linkedContacts, setLinkedContacts] = useState([]);
  useEffect(() => setLinkedContacts([]), [pacienteId]);
  const update = (key, rawValue) => {
    let value = upperFields.has(key) ? rawValue.toLocaleUpperCase('es-BO') : rawValue;
    if (key === 'telefono') value = rawValue.replace(/\D/g, '');
    if (key === 'numero_documento') value = rawValue.toLocaleUpperCase('es-BO');
    const next = { ...form, [key]: value };
    if (key === 'tipo_documento' && value !== 'OTRO') next.nombre_documento_otro = '';
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
  const isMinor = isMinorByBirthDate(form.fecha_nacimiento, today);
  const availableContacts = pacienteId ? linkedContacts.filter((item) => item.estado !== false) : preparedContacts;
  const administrativeRelation = availableContacts.find((item) => item.es_contacto_principal) || availableContacts[0] || null;
  const administrativeContact = administrativeRelation?.contacto || null;
  const relationshipLabel = administrativeRelation?.parentesco === 'OTRO'
    ? administrativeRelation.parentesco_otro || 'Otro'
    : ({ PADRE: 'Padre', MADRE: 'Madre', TUTOR_LEGAL: 'Tutor legal', ABUELO: 'Abuelo', ABUELA: 'Abuela', HERMANO: 'Hermano', HERMANA: 'Hermana', CUIDADOR: 'Cuidador', APODERADO: 'Apoderado' }[administrativeRelation?.parentesco] || 'Responsable');
  const hasTutor = isMinor && Boolean(administrativeContact);
  const updateLinkedContacts = (items) => {
    setLinkedContacts(items);
    onLinkedContactsChange?.(items);
  };
  const guardianBlock = pacienteId
    ? <section className="overflow-hidden rounded-xl border border-teal-200 bg-teal-50/30"><ContactosPaciente paciente={{ id: pacienteId, telefono: form.telefono }} required={isMinor} onItemsChange={updateLinkedContacts} /></section>
    : <ContactosPreparados items={preparedContacts} onChange={onPreparedContactsChange} required={isMinor} />;

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <ProfilePhotoInput compact value={form.foto} name={`${form.nombres || ''} ${form.apellidos || ''}`} label="Foto del paciente" onChange={(foto) => update('foto', foto)} />

      <Section icon={UserRound} title="Datos personales">
        <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
          <Input required label="Nombres *" value={form.nombres} onChange={(e) => update('nombres', e.target.value)} placeholder="Nombres del paciente" />
          <Input required label="Apellidos *" value={form.apellidos} onChange={(e) => update('apellidos', e.target.value)} placeholder="Apellidos del paciente" />
          <Input required label="Tipo de documento *" value={form.tipo_documento} onChange={(e) => update('tipo_documento', e.target.value)} options={documentTypeOptions} />
          {form.tipo_documento === 'OTRO' && <Input required label="Nombre del documento *" value={form.nombre_documento_otro || ''} onChange={(e) => update('nombre_documento_otro', e.target.value)} placeholder="EJ. CARNÉ DIPLOMÁTICO" />}
          <Input required name="numero_documento" label="Número de documento *" value={form.numero_documento} onChange={(e) => update('numero_documento', e.target.value)} placeholder={form.tipo_documento === 'CI' ? 'Solo números' : 'Letras, números, -, / o .'} error={ciError} />
          <Input label="Fecha de nacimiento" type="date" max={today} value={form.fecha_nacimiento || ''} onChange={(e) => update('fecha_nacimiento', e.target.value)} />
          <Input label="Lugar de nacimiento" value={form.lugar_nacimiento || ''} onChange={(e) => update('lugar_nacimiento', e.target.value)} placeholder="Ciudad o municipio" />
          <Input label="Edad" value={form.edad === '' || form.edad == null ? '' : `${form.edad} años`} readOnly className="[&_input]:bg-slate-50" placeholder="Edad en años" />
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

      {isMinor && <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3"><p className="text-sm font-black text-teal-800">Paciente menor de 18 años</p><p className="text-xs text-teal-700">Debe registrar un responsable o tutor. El teléfono administrativo proviene de ese contacto.</p></div>}
      {isMinor && <div className="[&>section>div:first-child>div>p]:hidden">{guardianBlock}</div>}
      <Section icon={BriefcaseBusiness} title="Contacto y perfil">
        <div className="grid gap-3 md:grid-cols-3">
          {hasTutor && <div className="rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2"><span className="text-[10px] font-black uppercase text-teal-700">Teléfono administrativo</span><strong className="mt-1 block text-sm text-slate-800">{administrativeContact.telefono}</strong><small className="mt-1 block text-xs text-slate-600">Proviene de {`${administrativeContact.nombres || ''} ${administrativeContact.apellidos || ''}`.trim()} — {relationshipLabel}</small></div>}
          <div><Input required={!isMinor} label={isMinor ? 'Teléfono personal (opcional)' : 'Teléfono *'} inputMode="numeric" minLength={7} maxLength={8} value={form.telefono} onChange={(e) => update('telefono', e.target.value)} placeholder={isMinor ? 'Teléfono propio del menor, si tiene' : '7 U 8 DÍGITOS'} />{hasTutor && <p className="mt-1 text-xs text-slate-500">Este teléfono es personal. El contacto administrativo se obtiene del tutor asignado.</p>}</div>
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
        <Button type="submit" disabled={submitting || Boolean(ciError)}><Save size={17} />{submitting ? 'GUARDANDO...' : 'GUARDAR PACIENTE'}</Button>
      </div>
    </form>
  );
}

export default PacienteForm;
