import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity, ArrowLeft, BriefcaseBusiness, CalendarDays, Heart, Home, IdCard,
  MapPin, Navigation, Phone, Ruler, Scale, UserRound, UsersRound
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { Avatar } from '../../components/common/ProfilePhoto';
import { getPaciente } from '../../services/pacienteService';
import { formatDate } from '../../utils/formatDate';
import { formatPatientDocument } from '../../utils/validators';
import { nombrePaciente } from '../../utils/validators';
import { getDisplayPhoneText, getResponsibleSummary, isAdministrativeContactPhone } from '../../utils/patientContact';
import { isMinorByBirthDate } from '../../utils/patientAge';
import ContactosPaciente from './ContactosPaciente';

const sexoLabel = (value) => ({ M: 'MASCULINO', F: 'FEMENINO' }[value] || value);

function Field({ label, value, icon: Icon, accent = false }) {
  return (
    <div className={`flex min-h-[72px] items-center gap-3 rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-sm ${accent ? 'border-sky-200 bg-sky-50/70' : 'border-slate-200 bg-slate-50/70'}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${accent ? 'bg-sky-100 text-sky-700' : 'bg-teal-50 text-teal-700'}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span>
        <strong className={`mt-1 block break-words text-sm font-bold uppercase ${accent ? 'text-sky-800' : 'text-slate-800'}`}>{value || 'SIN DATO'}</strong>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-teal-700"><Icon size={17} /></span><div><h2 className="text-sm font-black text-slate-800">{title}</h2><p className="text-xs text-slate-500">{description}</p></div></div>;
}

function PacienteDetalle() {
  const { id } = useParams();
  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPaciente(id)
      .then(setPaciente)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {paciente && (
        <>
          <div className="relative overflow-hidden rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 p-5 shadow-sm">
            <UsersRound size={150} strokeWidth={1} className="pointer-events-none absolute -bottom-12 right-[14%] text-teal-700/[0.035]" />
            <div className="relative flex flex-wrap items-center gap-4">
              <Avatar src={paciente.foto} name={nombrePaciente(paciente)} size="lg" className="ring-4 ring-white shadow-md" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-wide text-teal-700">Ficha del paciente</p>
                <h1 className="mt-0.5 truncate text-2xl font-black uppercase text-slate-900 md:text-3xl">{nombrePaciente(paciente)}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5"><IdCard size={15} className="text-teal-700" />Documento: {formatPatientDocument(paciente) || 'Sin dato'}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5"><Phone size={15} className="text-teal-700" />{getDisplayPhoneText(paciente)}{isAdministrativeContactPhone(paciente) && <small className="font-bold text-teal-700">Tutor</small>}</span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${paciente.estado ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}><span className={`h-2 w-2 rounded-full ${paciente.estado ? 'bg-emerald-500' : 'bg-slate-400'}`} />{paciente.estado ? 'ACTIVO' : 'INACTIVO'}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <section className="p-4 md:p-5">
              <SectionTitle icon={UserRound} title="Información personal" description="Datos generales registrados del paciente." />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field icon={CalendarDays} label="Fecha de nacimiento" value={formatDate(paciente.fecha_nacimiento)} />
                <Field icon={MapPin} label="Lugar de nacimiento" value={paciente.lugar_nacimiento} />
                <Field icon={UserRound} label="Edad" value={paciente.edad != null ? `${paciente.edad} AÑOS` : ''} />
                <Field icon={UsersRound} label="Sexo" value={sexoLabel(paciente.sexo)} />
                <Field icon={Heart} label="Estado civil" value={paciente.estado_civil} />
                <Field icon={BriefcaseBusiness} label="Ocupación" value={paciente.ocupacion} />
                {isAdministrativeContactPhone(paciente) ? <>
                  <Field icon={Phone} label="Teléfono personal" value={paciente.telefono || '—'} />
                  <Field icon={Phone} label="Teléfono administrativo" value={getDisplayPhoneText(paciente)} accent />
                  <Field icon={UsersRound} label="Responsable" value={getResponsibleSummary(paciente)} />
                </> : <Field icon={Phone} label="Teléfono" value={getDisplayPhoneText(paciente)} />}
              </div>
            </section>
            <section className="border-t border-slate-100 p-4 md:p-5">
              <SectionTitle icon={Activity} title="Datos físicos" description="Medidas corporales registradas." />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field icon={Scale} label="Peso" value={paciente.peso ? `${paciente.peso} KG` : ''} />
                <Field icon={Ruler} label="Talla" value={paciente.talla ? `${paciente.talla} M` : ''} />
                <Field icon={Activity} label="IMC" value={paciente.imc} accent />
              </div>
            </section>
            <section className="border-t border-slate-100 p-4 md:p-5">
              <SectionTitle icon={MapPin} title="Ubicación y referencia" description="Información para localizar al paciente." />
              <div className="grid gap-3 md:grid-cols-2">
                <Field icon={Home} label="Domicilio" value={paciente.domicilio} />
                <Field icon={Navigation} label="Punto de referencia" value={paciente.referencia} />
              </div>
            </section>
            {isMinorByBirthDate(paciente.fecha_nacimiento) && <ContactosPaciente paciente={paciente} readOnly />}
          </div>
        </>
      )}
      <div><Link to="/pacientes"><Button variant="secondary"><ArrowLeft size={17} />Volver a pacientes</Button></Link></div>
    </section>
  );
}

export default PacienteDetalle;

