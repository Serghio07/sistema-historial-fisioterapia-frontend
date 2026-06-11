import { Link, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';

function HistoriaClinicaDetalle() {
  const { id } = useParams();

  return (
    <section className="panel">
      <p className="text-sm font-bold uppercase text-brand-600">Historia clinica</p>
      <h2 className="mt-1 text-2xl font-black text-ink">Detalle #{id}</h2>
      <p className="mt-3 text-slate-600">Vista preparada para mostrar la historia completa por secciones.</p>
      <Link to="/historias-clinicas" className="mt-5 inline-block">
        <Button variant="ghost">Volver</Button>
      </Link>
    </section>
  );
}

export default HistoriaClinicaDetalle;
