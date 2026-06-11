import { Link, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';

function PacienteDetalle() {
  const { id } = useParams();

  return (
    <section className="panel">
      <p className="text-sm font-bold uppercase text-brand-600">Paciente</p>
      <h2 className="mt-1 text-2xl font-black text-ink">Detalle #{id}</h2>
      <p className="mt-3 text-slate-600">Vista preparada para ampliar datos clinicos, historias, sesiones y pagos del paciente.</p>
      <Link to="/pacientes" className="mt-5 inline-block">
        <Button variant="ghost">Volver</Button>
      </Link>
    </section>
  );
}

export default PacienteDetalle;
