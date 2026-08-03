import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Clock3, Eye, FilePenLine, Plus, TableProperties, Trash2, UserRound, XCircle } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { PatientIdentity } from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { createCita, deleteCita, getCitas, updateCita, updateCitaEstado } from '../../services/citaService';
import { getPacientes } from '../../services/pacienteService';
import { getPersonal } from '../../services/personalService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import { matchesSearch } from '../../utils/search';
import { BOLIVIA_TIME_ZONE, boliviaDate } from '../../utils/boliviaDateTime';

const ESTADOS = ['Pendiente', 'Confirmada', 'Atendida', 'Cancelada', 'Reprogramada', 'No asistio'];
const TIPOS = ['Primera consulta', 'Sesion de fisioterapia', 'Evaluacion', 'Control', 'Rehabilitacion', 'Otro'];
const VISTAS = ['dia', 'semana', 'mes'];

const estadoStyles = {
  Pendiente: 'border-amber-200 bg-amber-50 text-amber-800',
  Confirmada: 'border-blue-200 bg-blue-50 text-blue-800',
  Atendida: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Realizada: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Cancelada: 'border-red-200 bg-red-50 text-red-800',
  Reprogramada: 'border-violet-200 bg-violet-50 text-violet-800',
  'No asistio': 'border-orange-200 bg-orange-50 text-orange-800',
  'No asistió': 'border-orange-200 bg-orange-50 text-orange-800'
};

const pacienteStyles = [
  'border-blue-200 bg-blue-50 text-blue-900',
  'border-emerald-200 bg-emerald-50 text-emerald-900',
  'border-violet-200 bg-violet-50 text-violet-900',
  'border-orange-200 bg-orange-50 text-orange-900',
  'border-cyan-200 bg-cyan-50 text-cyan-900',
  'border-rose-200 bg-rose-50 text-rose-900',
  'border-lime-200 bg-lime-50 text-lime-900',
  'border-indigo-200 bg-indigo-50 text-indigo-900',
  'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900',
  'border-sky-200 bg-sky-50 text-sky-900',
  'border-teal-200 bg-teal-50 text-teal-900',
  'border-yellow-200 bg-yellow-50 text-yellow-900',
  'border-pink-200 bg-pink-50 text-pink-900',
  'border-purple-200 bg-purple-50 text-purple-900',
  'border-green-200 bg-green-50 text-green-900',
  'border-red-200 bg-red-50 text-red-900'
];

const emptyForm = {
  paciente_id: '',
  fecha: boliviaDate(),
  hora_inicio: '08:00',
  hora_fin: '08:30',
  motivo: '',
  tipo_atencion: 'Sesion de fisioterapia',
  estado: 'Pendiente',
  observacion: ''
  , profesional_id: ''
};

const toISODate = (date) => boliviaDate(date);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
};

const startOfWeek = (date) => {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
};

const monthDays = (date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

function Badge({ estado }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-black ${estadoStyles[estado] || estadoStyles.Pendiente}`}>{estado}</span>;
}

const estadoVisible = (cita) =>
  cita?.origen === 'Plan de tratamiento' && cita?.estado === 'Atendida'
    ? 'Realizada'
    : cita?.estado === 'No asistio' ? 'No asistió' : cita?.estado;

const getPacienteStyle = (pacienteId) => pacienteStyles[Math.abs(Number(pacienteId || 0)) % pacienteStyles.length];

function CitaForm({ form, setForm, pacientes, profesionales, onSubmit, onCancel, editing, error }) {
  const pacienteOptions = [
    { value: '', label: 'Seleccionar paciente' },
    ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))
  ];
  const profesionalOptions = [{ value: '', label: 'Profesional que registra' }, ...profesionales.map((item) => ({ value: item.usuario_id, label: item.nombre_mostrado || [item.nombres, item.apellido_paterno].filter(Boolean).join(' ') }))];

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="form-grid">
        <Input label="Paciente" options={pacienteOptions} value={form.paciente_id || ''} onChange={(event) => setForm({ ...form, paciente_id: event.target.value })} />
        <Input label="Profesional" options={profesionalOptions} value={form.profesional_id || ''} onChange={(event) => setForm({ ...form, profesional_id: event.target.value })} />
        <Input label="Fecha" type="date" value={form.fecha || ''} onChange={(event) => setForm({ ...form, fecha: event.target.value })} />
        <Input label="Hora inicio" type="time" value={form.hora_inicio || ''} onChange={(event) => setForm({ ...form, hora_inicio: event.target.value })} />
        <Input label="Hora fin" type="time" value={form.hora_fin || ''} onChange={(event) => setForm({ ...form, hora_fin: event.target.value })} />
        <Input label="Tipo de atencion" options={TIPOS.map((tipo) => ({ value: tipo, label: tipo }))} value={form.tipo_atencion || ''} onChange={(event) => setForm({ ...form, tipo_atencion: event.target.value })} />
        <Input label="Estado" options={ESTADOS.map((estado) => ({ value: estado, label: estado }))} value={form.estado || ''} onChange={(event) => setForm({ ...form, estado: event.target.value })} />
        <Input label="Motivo" value={form.motivo || ''} onChange={(event) => setForm({ ...form, motivo: event.target.value })} />
        <Input label="Observacion" multiline value={form.observacion || ''} onChange={(event) => setForm({ ...form, observacion: event.target.value })} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">
          <CalendarClock size={17} />
          {editing ? 'Guardar cambios' : 'Guardar cita'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function EventCard({ cita, compact = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid w-full gap-1 rounded-lg border p-2 text-left text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm ${getPacienteStyle(cita.paciente_id || cita.paciente?.id)}`}
    >
      <span className="font-black">{cita.hora_inicio?.slice(0, 5)} {compact ? '' : `- ${cita.hora_fin?.slice(0, 5) || ''}`}</span>
      <span className="line-clamp-1">{nombrePaciente(cita.paciente)}</span>
      {!compact && <span className="line-clamp-1">{estadoVisible(cita)} - {cita.tipo_atencion || cita.motivo || 'Sin tipo'}</span>}
    </button>
  );
}

function Citas() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pacienteInicial = searchParams.get('paciente_id') || '';
  const [pacientes, setPacientes] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [citas, setCitas] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, paciente_id: pacienteInicial });
  const [filters, setFilters] = useState({ paciente: '', fecha: '', estado: '', tipo_atencion: '', profesional_id: '' });
  const [view, setView] = useState('semana');
  const [cursor, setCursor] = useState(() => new Date(`${boliviaDate()}T12:00:00-04:00`));
  const [activeTab, setActiveTab] = useState('listado');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pacientesData, citasData, personalData] = await Promise.all([getPacientes(), getCitas(), getPersonal()]);
      setPacientes(pacientesData);
      setCitas(citasData);
      setProfesionales(personalData.filter((item) => item.estado === 'activo' && item.usuario_id));
    } catch (err) {
      setError(`${err.message}. Si el modulo es nuevo, ejecuta backend/docs/citas-agenda-migration.sql.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const actualizarEstados = async () => {
      try {
        const citasData = await getCitas();
        setCitas(citasData);
        setSelected((actual) => actual
          ? citasData.find((item) => Number(item.id) === Number(actual.id)) || null
          : null);
      } catch {
        // La carga principal ya muestra los errores; el refresco automatico es silencioso.
      }
    };
    const intervalo = window.setInterval(actualizarEstados, 60000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const citaId = location.state?.verCitaId;
    if (!citaId || !citas.length) return;
    const cita = citas.find((item) => Number(item.id) === Number(citaId));
    if (cita) {
      setSelected(cita);
      setActiveTab('listado');
    }
  }, [citas, location.state?.verCitaId]);

  const filteredCitas = useMemo(() => {
    return citas.filter((cita) => {
      const matchPaciente = matchesSearch(nombrePaciente(cita.paciente), filters.paciente);
      const matchPacienteInicial = !pacienteInicial || String(cita.paciente_id) === String(pacienteInicial);
      const matchFecha = !filters.fecha || cita.fecha === filters.fecha;
      const matchEstado = !filters.estado || cita.estado === filters.estado;
      const matchTipo = !filters.tipo_atencion || cita.tipo_atencion === filters.tipo_atencion;
      const matchProfesional = !filters.profesional_id || String(cita.profesional_id) === String(filters.profesional_id);
      return matchPaciente && matchPacienteInicial && matchFecha && matchEstado && matchTipo && matchProfesional;
    });
  }, [citas, filters, pacienteInicial]);

  const visibleDays = useMemo(() => {
    if (view === 'dia') return [cursor];
    if (view === 'semana') return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index));
    return monthDays(cursor);
  }, [cursor, view]);

  const miniDays = useMemo(() => monthDays(cursor), [cursor]);

  const citasPorFecha = useMemo(() => {
    return filteredCitas.reduce((data, cita) => {
      data[cita.fecha] = data[cita.fecha] || [];
      data[cita.fecha].push(cita);
      return data;
    }, {});
  }, [filteredCitas]);

  const validate = () => {
    if (!form.paciente_id) return 'Selecciona un paciente.';
    if (!form.fecha) return 'La fecha es obligatoria.';
    if (!form.hora_inicio) return 'La hora de inicio es obligatoria.';
    if (form.hora_fin && form.hora_fin <= form.hora_inicio) return 'La hora de fin debe ser mayor que la hora de inicio.';
    return '';
  };

  const resetForm = () => {
    setForm({ ...emptyForm, paciente_id: pacienteInicial });
    setEditing(null);
    setError('');
  };

  const openNuevaCita = () => {
    resetForm();
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    try {
      const payload = cleanPayload(form);
      editing ? await updateCita(editing, payload) : await createCita(payload);
      resetForm();
      setShowFormModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const editCita = (cita) => {
    setEditing(cita.id);
    setForm({
      paciente_id: cita.paciente_id || cita.paciente?.id || '',
      fecha: cita.fecha || emptyForm.fecha,
      hora_inicio: cita.hora_inicio?.slice(0, 5) || '',
      hora_fin: cita.hora_fin?.slice(0, 5) || '',
      motivo: cita.motivo || '',
      tipo_atencion: cita.tipo_atencion || 'Sesion de fisioterapia',
      estado: cita.estado || 'Pendiente',
      observacion: cita.observacion || ''
      , profesional_id: cita.profesional_id || ''
    });
    setSelected(null);
    setShowFormModal(true);
  };

  const moveCalendar = (direction) => {
    const days = view === 'dia' ? 1 : view === 'semana' ? 7 : 30;
    setCursor(addDays(cursor, days * direction));
  };

  const title = view === 'mes'
    ? cursor.toLocaleDateString('es-BO', { timeZone: BOLIVIA_TIME_ZONE, month: 'long', year: 'numeric' })
    : `${formatDate(toISODate(visibleDays[0]))} - ${formatDate(toISODate(visibleDays[visibleDays.length - 1]))}`;

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="module-hero">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Agenda clinica</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Citas / Agenda</h2>
            <span className="mt-2 block text-sm text-brand-50">Gestiona las citas programadas de los pacientes.</span>
          </div>
          <CalendarClock size={42} className="self-center text-brand-50" />
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="panel">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('listado')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activeTab === 'listado' ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <TableProperties size={17} />
            Lista de citas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendario')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activeTab === 'calendario' ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <CalendarClock size={17} />
            Calendario
          </button>
        </div>
      </div>

      {activeTab === 'calendario' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="panel">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-ink">Calendario de citas</h3>
                <p className="text-sm text-slate-500">{filteredCitas.length} citas visibles.</p>
              </div>
              <Button onClick={openNuevaCita}>
                <Plus size={17} />
                Nueva cita
              </Button>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input label="Buscar por paciente" value={filters.paciente} onChange={(event) => setFilters({ ...filters, paciente: event.target.value })} />
              <Input label="Filtrar por fecha" type="date" value={filters.fecha} onChange={(event) => setFilters({ ...filters, fecha: event.target.value })} />
              <Input label="Estado" options={[{ value: '', label: 'Todos' }, ...ESTADOS.map((estado) => ({ value: estado, label: estado }))]} value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })} />
              <Input label="Tipo de atencion" options={[{ value: '', label: 'Todos' }, ...TIPOS.map((tipo) => ({ value: tipo, label: tipo }))]} value={filters.tipo_atencion} onChange={(event) => setFilters({ ...filters, tipo_atencion: event.target.value })} />
              <Input label="Profesional" options={[{ value: '', label: 'Todos' }, ...profesionales.map((item) => ({ value: item.usuario_id, label: item.nombre_mostrado || [item.nombres, item.apellido_paterno].filter(Boolean).join(' ') }))]} value={filters.profesional_id} onChange={(event) => setFilters({ ...filters, profesional_id: event.target.value })} />
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {VISTAS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                    className={`min-h-10 rounded-lg px-4 text-sm font-black capitalize transition ${view === item ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <ActionButton label="Anterior" icon={ChevronLeft} tone="print" onClick={() => moveCalendar(-1)} />
                <strong className="min-w-48 text-center text-sm capitalize text-ink">{title}</strong>
                <ActionButton label="Siguiente" icon={ChevronRight} tone="print" onClick={() => moveCalendar(1)} />
              </div>
            </div>

            <div className={`grid gap-2 ${view === 'dia' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-7'}`}>
              {visibleDays.map((day) => {
                const iso = toISODate(day);
                const dayCitas = citasPorFecha[iso] || [];
                const outsideMonth = view === 'mes' && day.getMonth() !== cursor.getMonth();
                return (
                  <div key={iso} className={`min-h-36 rounded-lg border border-slate-200 bg-white p-3 ${outsideMonth ? 'opacity-45' : ''}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <strong className="text-sm capitalize text-ink">{day.toLocaleDateString('es-BO', { timeZone: BOLIVIA_TIME_ZONE, weekday: 'short', day: '2-digit' })}</strong>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">{dayCitas.length}</span>
                    </div>
                    <div className="grid gap-2">
                      {dayCitas.slice(0, view === 'mes' ? 3 : 20).map((cita) => (
                        <EventCard key={cita.id} cita={cita} compact={view === 'mes'} onClick={() => setSelected(cita)} />
                      ))}
                      {view === 'mes' && dayCitas.length > 3 && <span className="text-xs font-bold text-slate-500">+{dayCitas.length - 3} mas</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="panel">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-ink">Calendario rapido</h3>
              <strong className="text-xs capitalize text-slate-500">{cursor.toLocaleDateString('es-BO', { timeZone: BOLIVIA_TIME_ZONE, month: 'long', year: 'numeric' })}</strong>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-500">
              {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => <span key={day}>{day}</span>)}
              {miniDays.map((day) => {
                const iso = toISODate(day);
                const dayCitas = citasPorFecha[iso] || [];
                const active = iso === toISODate(cursor);
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      setCursor(day);
                      setView('dia');
                    }}
                    className={`grid h-9 place-items-center rounded-lg text-xs font-black transition ${
                      active ? 'bg-brand-600 text-white' : dayCitas.length ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-black text-ink">Citas del dia</h4>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">{(citasPorFecha[toISODate(cursor)] || []).length}</span>
              </div>
              <div className="grid gap-2">
                {(citasPorFecha[toISODate(cursor)] || []).slice(0, 6).map((cita) => (
                  <button key={cita.id} type="button" onClick={() => setSelected(cita)} className="grid grid-cols-[52px_1fr] gap-2 rounded-lg border border-slate-200 bg-white p-2 text-left text-xs hover:bg-slate-50">
                    <strong className="text-ink">{cita.hora_inicio?.slice(0, 5)}</strong>
                    <span>
                      <strong className="block text-ink">{nombrePaciente(cita.paciente)}</strong>
                      <span className="text-slate-500">{cita.tipo_atencion || cita.motivo || 'Sin tipo'}</span>
                    </span>
                  </button>
                ))}
                {(citasPorFecha[toISODate(cursor)] || []).length === 0 && <p className="empty-state">Sin citas para este dia.</p>}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'listado' && (
        <div className="panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Listado de citas</h3>
            <p className="text-sm text-slate-500">Consulta, edicion y control de estado.</p>
          </div>
          <Button onClick={openNuevaCita}>
            <Plus size={17} />
            Nueva cita
          </Button>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Buscar por paciente" value={filters.paciente} onChange={(event) => setFilters({ ...filters, paciente: event.target.value })} />
          <Input label="Filtrar por fecha" type="date" value={filters.fecha} onChange={(event) => setFilters({ ...filters, fecha: event.target.value })} />
          <Input label="Estado" options={[{ value: '', label: 'Todos' }, ...ESTADOS.map((estado) => ({ value: estado, label: estado }))]} value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })} />
          <Input label="Tipo de atencion" options={[{ value: '', label: 'Todos' }, ...TIPOS.map((tipo) => ({ value: tipo, label: tipo }))]} value={filters.tipo_atencion} onChange={(event) => setFilters({ ...filters, tipo_atencion: event.target.value })} />
          <Input label="Profesional" options={[{ value: '', label: 'Todos' }, ...profesionales.map((item) => ({ value: item.usuario_id, label: item.nombre_mostrado || [item.nombres, item.apellido_paterno].filter(Boolean).join(' ') }))]} value={filters.profesional_id} onChange={(event) => setFilters({ ...filters, profesional_id: event.target.value })} />
        </div>
        <Table
          columns={['Paciente', 'Fecha', 'Hora', 'Profesional', 'Motivo', 'Tipo de atención', 'Estado', 'Acciones']}
          rows={filteredCitas.map((cita) => [
            <PatientIdentity paciente={cita.paciente} secondary={`CI: ${cita.paciente?.ci || 'Sin dato'}`} />,
            formatDate(cita.fecha),
            `${cita.hora_inicio?.slice(0, 5) || ''} - ${cita.hora_fin?.slice(0, 5) || ''}`,
            cita.profesional?.nombre || cita.registrado_por?.nombre || 'Sin asignar',
            cita.motivo || 'Sin motivo',
            cita.tipo_atencion || 'Sin tipo',
            <Badge estado={estadoVisible(cita)} />,
            <div className="flex gap-2">
              <ActionButton label="Ver detalle" icon={Eye} tone="view" onClick={() => setSelected(cita)} />
              <ActionButton label="Editar cita" icon={FilePenLine} tone="edit" onClick={() => editCita(cita)} />
              <ActionButton label="Cancelar cita" icon={XCircle} tone="delete" onClick={() => updateCitaEstado(cita.id, 'Cancelada').then(load)} disabled={cita.estado === 'Cancelada'} />
              {isAdmin && <ActionButton label="Eliminar cita" icon={Trash2} tone="delete" onClick={() => deleteCita(cita.id).then(load)} />}
            </div>
          ])}
          empty="No hay citas registradas."
        />
      </div>
      )}

      <Modal open={showFormModal} title={editing ? 'Editar cita' : 'Nueva cita'} onClose={closeFormModal} size="lg">
        <CitaForm form={form} setForm={setForm} pacientes={pacientes} profesionales={profesionales} onSubmit={submit} onCancel={closeFormModal} editing={editing} error={error} />
      </Modal>

      <Modal
        open={Boolean(selected)}
        title="Detalle de cita"
        subtitle={selected ? `Cita #${selected.id} · Información vinculada al paciente` : ''}
        onClose={() => setSelected(null)}
        size="lg"
        patientStyle
      >
        {selected && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="overflow-y-auto p-5">
              <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-cyan-50 p-4">
                <PatientIdentity
                  paciente={selected.paciente}
                  secondary={`CI: ${selected.paciente?.ci || 'Sin CI'} · Tel: ${selected.paciente?.telefono || 'Sin teléfono'}`}
                  className="[&_strong]:text-base [&_small]:mt-1"
                />
                <div className="flex flex-wrap items-center justify-end gap-2"><Badge estado={estadoVisible(selected)} /></div>
              </section>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><CalendarDays size={20} /></span>
                  <div><span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Fecha</span><strong className="mt-1 block text-sm text-ink">{formatDate(selected.fecha)}</strong></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Clock3 size={20} /></span>
                  <div><span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Horario</span><strong className="mt-1 block text-sm text-ink">{selected.hora_inicio?.slice(0, 5)} – {selected.hora_fin?.slice(0, 5) || ''}</strong></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRound size={20} /></span>
                  <div className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Registrado por</span><strong className="mt-1 block truncate text-sm text-ink">{selected.registrado_por?.nombre || 'Registro anterior'}</strong></div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[10px] font-black uppercase tracking-wide text-brand-700">Tipo de atención</span>
                  <p className="mt-2 text-sm font-bold text-ink">{selected.tipo_atencion || 'Sin tipo registrado'}</p>
                </section>
                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <span className="text-[10px] font-black uppercase tracking-wide text-brand-700">Motivo</span>
                  <p className="mt-2 text-sm font-bold text-ink">{selected.motivo || 'Sin motivo registrado'}</p>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-wide text-brand-700">Observación</span>
                  <p className="mt-2 min-h-10 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.observacion || 'Sin observaciones registradas para esta cita.'}</p>
                </section>
              </div>
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-4">
              {location.state?.returnTo && <Button variant="secondary" onClick={() => navigate(location.state.returnTo, { state: { resumenState: location.state.resumenState } })}><ChevronLeft size={17} />Volver al resumen</Button>}
              <div className="ml-auto flex flex-wrap gap-2">
                {selected.origen === 'Plan de tratamiento' && ['Programada', 'Confirmada'].includes(selected.estado) && <Button onClick={() => navigate('/sesiones', { state: { programacion: selected } })}><CalendarClock size={17} />Registrar sesión</Button>}
                {!['Atendida', 'Cancelada'].includes(selected.estado) && <Button variant="secondary" onClick={() => editCita(selected)}><FilePenLine size={17} />{selected.origen === 'Plan de tratamiento' ? 'Reprogramar' : 'Editar cita'}</Button>}
                {!['Atendida', 'Cancelada'].includes(selected.estado) && <Button variant="danger" onClick={() => updateCitaEstado(selected.id, 'Cancelada').then(() => { setSelected(null); load(); })}><XCircle size={17} />Cancelar cita</Button>}
              </div>
            </footer>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Citas;

