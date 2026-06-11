import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardCheck, Eye, FileText, Plus } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Table from '../../components/common/Table';
import { getPaciente } from '../../services/pacienteService';
import { getPlanillasAtencionPaciente } from '../../services/planillaAtencionService';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

function PacienteDetalle() {
  const { id } = useParams();
  const [paciente, setPaciente] = useState(null);
  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [pacienteData, planillasData] = await Promise.all([getPaciente(id), getPlanillasAtencionPaciente(id)]);
        setPaciente(pacienteData);
        setPlanillas(planillasData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-4 bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Paciente</p>
            <h2 className="mt-2 text-3xl font-black">{paciente ? nombrePaciente(paciente) : `Detalle #${id}`}</h2>
            <span className="mt-2 block text-sm text-brand-50">
              {paciente?.ci || 'Sin CI'} - {paciente?.telefono || 'Sin telefono'} - {paciente?.edad ? `${paciente.edad} anios` : 'Sin edad'}
            </span>
          </div>
          <ClipboardCheck size={54} className="self-center text-brand-50" />
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Planilla de Atencion y Asistencia</h3>
            <p className="text-sm text-slate-500">Planillas anteriores vinculadas a este paciente.</p>
          </div>
          <Link to={`/planillas-atencion?paciente_id=${id}`}>
            <Button>
              <Plus size={17} />
              Nueva planilla
            </Button>
          </Link>
        </div>
        <Table
          columns={['Inicio', 'Fin', 'Dx', 'Sesiones', 'Acciones']}
          rows={planillas.map((planilla) => [
            formatDate(planilla.fecha_inicio),
            formatDate(planilla.fecha_fin),
            planilla.diagnostico || 'Sin diagnostico',
            planilla.sesiones?.length || 0,
            <div className="flex gap-2">
              <Link to={`/planillas-atencion?paciente_id=${id}`}>
                <ActionButton label="Abrir modulo" icon={Eye} tone="view" />
              </Link>
            </div>
          ])}
          empty="Este paciente todavia no tiene planillas de atencion."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/pacientes">
          <Button variant="ghost">Volver</Button>
        </Link>
        <Link to={`/planillas-atencion?paciente_id=${id}`}>
          <Button variant="secondary">
            <FileText size={17} />
            Ver modulo de planillas
          </Button>
        </Link>
      </div>
    </section>
  );
}

export default PacienteDetalle;
