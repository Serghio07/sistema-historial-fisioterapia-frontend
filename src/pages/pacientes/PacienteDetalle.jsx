import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, IdCard, Phone, UserRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { Avatar } from '../../components/common/ProfilePhoto';
import { getPaciente } from '../../services/pacienteService';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const sexoLabel = (value) => ({ M: 'MASCULINO', F: 'FEMENINO' }[value] || value);

function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm uppercase text-ink">{value || 'SIN DATO'}</strong>
    </div>
  );
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
          <div className="rounded-xl bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar src={paciente.foto} name={nombrePaciente(paciente)} size="lg" className="ring-4 ring-white/20" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-brand-50">Datos del paciente</p>
                <h1 className="mt-1 truncate text-2xl font-black uppercase">{nombrePaciente(paciente)}</h1>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-brand-50">
                  <span className="inline-flex items-center gap-1"><IdCard size={15} />CI: {paciente.ci}</span>
                  <span className="inline-flex items-center gap-1"><Phone size={15} />{paciente.telefono}</span>
                  <span className="inline-flex items-center gap-1"><UserRound size={15} />{paciente.estado ? 'ACTIVO' : 'INACTIVO'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="panel grid gap-4">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
              <Field label="Fecha de nacimiento" value={formatDate(paciente.fecha_nacimiento)} />
              <Field label="Lugar de nacimiento" value={paciente.lugar_nacimiento} />
              <Field label="Edad" value={paciente.edad != null ? `${paciente.edad} AÑOS` : ''} />
              <Field label="Sexo" value={sexoLabel(paciente.sexo)} />
              <Field label="Estado civil" value={paciente.estado_civil} />
              <Field label="Ocupación" value={paciente.ocupacion} />
              <Field label="Peso" value={paciente.peso ? `${paciente.peso} KG` : ''} />
              <Field label="Talla" value={paciente.talla ? `${paciente.talla} M` : ''} />
              <Field label="IMC" value={paciente.imc} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Domicilio" value={paciente.domicilio} />
              <Field label="Punto de referencia" value={paciente.referencia} />
            </div>
          </div>
        </>
      )}
      <div><Link to="/pacientes"><Button variant="ghost"><ArrowLeft size={17} />VOLVER A PACIENTES</Button></Link></div>
    </section>
  );
}

export default PacienteDetalle;
