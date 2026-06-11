import { useEffect, useState } from 'react';
import {
  Activity,
  CalendarCheck,
  CalendarClock,
  ClipboardPlus,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Plus,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Table from '../../components/common/Table';
import {
  getDashboardPacientesRecientes,
  getDashboardProximasCitas,
  getDashboardResumen,
  getDashboardSesionesHoy
} from '../../services/dashboardService';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const emptyResumen = {
  totalPacientes: 0,
  citasHoy: 0,
  sesionesHoy: 0,
  atendidosHoy: 0,
  citasPendientes: 0,
  informesGenerados: 0
};

function StatCard({ title, value, description, icon: Icon, tone }) {
  return (
    <article className={`rounded-lg border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase">{title}</span>
          <strong className="mt-3 block text-3xl text-ink">{value}</strong>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-white/80 shadow-sm">
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 text-sm opacity-80">{description}</p>
    </article>
  );
}

function QuickLink({ to, title, icon: Icon, variant = 'ghost' }) {
  return (
    <Link to={to}>
      <Button variant={variant} className="w-full justify-start">
        <Icon size={17} />
        {title}
      </Button>
    </Link>
  );
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumen, setResumen] = useState(emptyResumen);
  const [proximasCitas, setProximasCitas] = useState([]);
  const [sesionesHoy, setSesionesHoy] = useState([]);
  const [pacientesRecientes, setPacientesRecientes] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [resumenData, citasData, sesionesData, pacientesData] = await Promise.all([
          getDashboardResumen(),
          getDashboardProximasCitas(),
          getDashboardSesionesHoy(),
          getDashboardPacientesRecientes()
        ]);
        setResumen(resumenData);
        setProximasCitas(citasData);
        setSesionesHoy(sesionesData);
        setPacientesRecientes(pacientesData);
      } catch (err) {
        setError(`No se pudo cargar el panel principal: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = [
    {
      title: 'Total Pacientes',
      value: resumen.totalPacientes,
      description: 'Pacientes registrados en el sistema',
      icon: Users,
      tone: 'border-emerald-100 bg-emerald-50/80 text-emerald-700'
    },
    {
      title: 'Citas Hoy',
      value: resumen.citasHoy,
      description: 'Citas programadas para hoy',
      icon: CalendarClock,
      tone: 'border-blue-100 bg-blue-50/80 text-blue-700'
    },
    {
      title: 'Sesiones Hoy',
      value: resumen.sesionesHoy,
      description: 'Sesiones diarias registradas hoy',
      icon: Activity,
      tone: 'border-cyan-100 bg-cyan-50/80 text-cyan-700'
    },
    {
      title: 'Atendidos Hoy',
      value: resumen.atendidosHoy,
      description: 'Pacientes con asistencia marcada',
      icon: UserCheck,
      tone: 'border-teal-100 bg-teal-50/80 text-teal-700'
    },
    {
      title: 'Citas Pendientes',
      value: resumen.citasPendientes,
      description: 'Pendientes o confirmadas',
      icon: CalendarCheck,
      tone: 'border-amber-100 bg-amber-50/80 text-amber-700'
    },
    {
      title: 'Informes',
      value: resumen.informesGenerados,
      description: 'Informes fisioterapeuticos generados',
      icon: FileText,
      tone: 'border-indigo-100 bg-indigo-50/80 text-indigo-700'
    }
  ];

  return (
    <section className="grid gap-5">
      {loading && <Loader />}

      <div className="overflow-hidden rounded-lg border border-white/60 bg-white shadow-soft">
        <div className="grid gap-4 bg-gradient-to-r from-[#123f3f] via-brand-700 to-teal-500 p-6 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Centro de Fisioterapia</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Panel Principal</h2>
            <span className="mt-2 block text-sm text-brand-50">Resumen general del sistema.</span>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-lg border border-white/25 bg-white/15 shadow-sm backdrop-blur">
            <LayoutDashboard size={42} className="text-brand-50" />
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <div className="panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-ink">Proximas citas</h3>
              <p className="text-sm text-slate-500">Agenda cercana del consultorio.</p>
            </div>
            <Link to="/citas">
              <Button variant="ghost">
                <CalendarClock size={17} />
                Ver agenda
              </Button>
            </Link>
          </div>
          <Table
            columns={['Paciente', 'Fecha', 'Hora', 'Tipo de atencion', 'Estado']}
            rows={proximasCitas.map((cita) => [
              nombrePaciente(cita.paciente),
              formatDate(cita.fecha),
              `${cita.hora_inicio?.slice(0, 5) || ''}${cita.hora_fin ? ` - ${cita.hora_fin.slice(0, 5)}` : ''}`,
              cita.tipo_atencion || cita.motivo || 'Sin tipo',
              cita.estado
            ])}
            empty="No hay proximas citas programadas."
          />
        </div>

        <div className="panel">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-ink">Accesos rapidos</h3>
            <p className="text-sm text-slate-500">Funciones usadas con frecuencia.</p>
          </div>
          <div className="grid gap-3">
            <QuickLink to="/pacientes" title="Nuevo paciente" icon={UserPlus} />
            <QuickLink to="/citas" title="Nueva cita" icon={CalendarClock} />
            <QuickLink to="/sesiones" title="Nueva sesion" icon={HeartPulse} />
            <QuickLink to="/informes-medicos" title="Crear informe" icon={ClipboardPlus} />
            <QuickLink to="/citas" title="Ver agenda" icon={CalendarCheck} variant="secondary" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="panel">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-ink">Sesiones de hoy</h3>
            <p className="text-sm text-slate-500">Control diario de asistencia y pago.</p>
          </div>
          <Table
            columns={['Paciente', 'Sesion', 'Asistencia', 'Metodo pago', 'Observacion']}
            rows={sesionesHoy.map((sesion) => [
              nombrePaciente(sesion.paciente),
              sesion.numero_sesion || sesion.sesiones_hizo || 'Sin dato',
              sesion.asistencia || 'pendiente',
              sesion.metodo_pago || 'Pendiente',
              sesion.observacion || 'Sin observacion'
            ])}
            empty="No hay sesiones registradas para hoy."
          />
        </div>

        <div className="panel">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-ink">Ultimos pacientes registrados</h3>
            <p className="text-sm text-slate-500">Pacientes agregados recientemente.</p>
          </div>
          <Table
            columns={['Nombre', 'Telefono', 'Diagnostico inicial', 'Fecha registro']}
            rows={pacientesRecientes.map((paciente) => [
              nombrePaciente(paciente),
              paciente.telefono || 'Sin telefono',
              paciente.historias_clinicas?.[0]?.diagnostico_medico || 'Sin diagnostico',
              formatDate(paciente.created_at)
            ])}
            empty="Todavia no hay pacientes registrados."
          />
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
