import { useEffect, useState } from 'react';
import { ClipboardList, Plus, UserCog, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Table from '../../components/common/Table';
import { useAuth } from '../../context/AuthContext';
import { getHistoriasClinicas } from '../../services/historiaClinicaService';
import { getPacientes } from '../../services/pacienteService';
import { getUsuarios } from '../../services/usuarioService';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

function Dashboard() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState([]);
  const [historias, setHistorias] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pacientesData, historiasData, usuariosData] = await Promise.all([
        getPacientes(),
        getHistoriasClinicas(),
        isAdmin ? getUsuarios() : Promise.resolve([])
      ]);
      setPacientes(pacientesData);
      setHistorias(historiasData);
      setUsuarios(usuariosData);
      setLoading(false);
    };

    load().catch(() => setLoading(false));
  }, [isAdmin]);

  const stats = [
    { label: 'Pacientes', value: pacientes.length, icon: Users, to: '/pacientes' },
    { label: 'Historias', value: historias.length, icon: ClipboardList, to: '/historias-clinicas' },
    { label: 'Usuarios', value: usuarios.length, icon: UserCog, to: '/usuarios' }
  ];

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="page-title">
        <div>
          <p>Centro de Fisioterapia</p>
          <h2>Panel clinico</h2>
          <span>Resumen operativo del centro.</span>
        </div>
        <Link to="/historias-clinicas">
          <Button variant="secondary">
            <Plus size={17} />
            Nueva historia
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} to={stat.to} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500">
              <Icon className="text-brand-600" size={24} />
              <span className="mt-4 block text-sm text-slate-500">{stat.label}</span>
              <strong className="text-3xl text-ink">{stat.value}</strong>
            </Link>
          );
        })}
      </div>

      <div className="panel">
        <h3 className="mb-4 text-lg font-bold text-ink">Ultimas historias</h3>
        <Table
          columns={['Paciente', 'Fecha', 'Diagnostico', 'Profesional']}
          rows={historias.slice(0, 5).map((historia) => [
            nombrePaciente(historia.paciente),
            formatDate(historia.fecha_evaluacion),
            historia.diagnostico_medico || 'Sin diagnostico',
            historia.profesional_cargo || 'Sin asignar'
          ])}
          empty="Todavia no hay historias clinicas."
        />
      </div>
    </section>
  );
}

export default Dashboard;
