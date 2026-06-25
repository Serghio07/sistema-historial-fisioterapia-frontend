import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarClock, CalendarDays, Search } from 'lucide-react';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Table from '../../components/common/Table';
import { getCitas } from '../../services/citaService';
import { getPersonal } from '../../services/personalService';
import { getSesiones } from '../../services/sesionService';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const nombrePersonal = (item) => `${item.apellido_paterno || ''} ${item.apellido_materno || ''} ${item.nombres || ''}`.trim();

function ActividadesDiarias() {
  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(today);
  const [query, setQuery] = useState('');
  const [personal, setPersonal] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [personalData, sesionesData, citasData] = await Promise.all([getPersonal(), getSesiones(), getCitas()]);
        setPersonal(personalData);
        setSesiones(sesionesData);
        setCitas(citasData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const actividades = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = [
      ...sesiones.map((item) => ({
        id: `sesion-${item.id}`,
        fecha: item.fecha,
        tipo: 'Sesion',
        usuario_id: item.usuario_id || item.registrado_por?.id,
        responsable: item.registrado_por?.nombre || 'Registro anterior',
        paciente: nombrePaciente(item.paciente),
        detalle: item.observacion || `Asistencia: ${item.asistencia}`
      })),
      ...citas.map((item) => ({
        id: `cita-${item.id}`,
        fecha: item.fecha,
        tipo: 'Cita',
        usuario_id: item.usuario_id || item.registrado_por?.id,
        responsable: item.registrado_por?.nombre || 'Registro anterior',
        paciente: nombrePaciente(item.paciente),
        detalle: `${item.hora_inicio?.slice(0, 5) || ''} ${item.tipo_atencion || item.motivo || ''}`.trim()
      }))
    ];
    return rows
      .map((item) => {
        const ficha = personal.find((persona) => String(persona.usuario_id) === String(item.usuario_id));
        return { ...item, responsable: ficha ? nombrePersonal(ficha) : item.responsable, cargo: ficha?.cargo || '' };
      })
      .filter((item) => (!fecha || item.fecha === fecha) && (!term || `${item.responsable} ${item.cargo} ${item.paciente} ${item.tipo}`.toLowerCase().includes(term)))
      .sort((a, b) => a.tipo.localeCompare(b.tipo));
  }, [sesiones, citas, personal, fecha, query]);

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <header className="rounded-xl bg-gradient-to-r from-brand-900 to-cyan-700 p-5 text-white">
        <p className="text-xs font-black uppercase text-brand-100">Seguimiento del equipo</p>
        <h2 className="mt-1 text-3xl font-black">Actividades Diarias</h2>
        <p className="mt-2 text-sm text-brand-50">Citas y sesiones registradas por cada miembro del personal.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel"><Activity className="text-brand-600" /><strong className="mt-2 block text-3xl">{actividades.length}</strong><span className="text-sm text-slate-500">Actividades</span></div>
        <div className="panel"><CalendarDays className="text-emerald-600" /><strong className="mt-2 block text-3xl">{actividades.filter((item) => item.tipo === 'Sesion').length}</strong><span className="text-sm text-slate-500">Sesiones</span></div>
        <div className="panel"><CalendarClock className="text-sky-600" /><strong className="mt-2 block text-3xl">{actividades.filter((item) => item.tipo === 'Cita').length}</strong><span className="text-sm text-slate-500">Citas</span></div>
      </div>

      <div className="panel">
        <div className="mb-4 grid gap-3 md:grid-cols-[240px_1fr]">
          <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <label className="grid gap-1 text-sm font-bold text-slate-700"><span>Buscar</span><span className="flex min-h-11 items-center rounded-lg border border-slate-200 px-3"><Search size={17} className="mr-2 text-slate-400" /><input className="w-full border-0 p-0 text-sm focus:ring-0" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Personal, cargo o paciente" /></span></label>
        </div>
        <Table
          columns={['Fecha', 'Personal', 'Cargo', 'Actividad', 'Paciente', 'Detalle']}
          rows={actividades.map((item) => [
            formatDate(item.fecha),
            item.responsable,
            item.cargo || 'Sin ficha vinculada',
            item.tipo,
            item.paciente,
            item.detalle
          ])}
          empty="No hay actividades registradas para la fecha seleccionada."
        />
      </div>
    </section>
  );
}

export default ActividadesDiarias;
