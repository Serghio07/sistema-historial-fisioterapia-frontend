import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, ChevronLeft, ChevronRight, Eye, FilePenLine, Plus, Trash2, XCircle } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { useAuth } from '../../context/AuthContext';
import { createCita, deleteCita, getCitas, updateCita, updateCitaEstado } from '../../services/citaService';
import { getPacientes } from '../../services/pacienteService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';

const ESTADOS = ['Pendiente', 'Confirmada', 'Atendida', 'Cancelada', 'Reprogramada', 'No asistio'];
const TIPOS = ['Primera consulta', 'Sesion de fisioterapia', 'Evaluacion', 'Control', 'Rehabilitacion', 'Otro'];
const VISTAS = ['dia', 'semana', 'mes'];

const estadoStyles = {
  Pendiente: 'border-amber-200 bg-amber-50 text-amber-800',
  Confirmada: 'border-blue-200 bg-blue-50 text-blue-800',
  Atendida: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Cancelada: 'border-red-200 bg-red-50 text-red-800',
  Reprogramada: 'border-violet-200 bg-violet-50 text-violet-800',
  'No asistio': 'border-orange-200 bg-orange-50 text-orange-800'
};

const pacienteStyles = [
  'border-blue-200 bg-blue-50 text-blue-900',
  'border-emerald-200 bg-emerald-50 text-emerald-900',
  'border-violet-200 bg-violet-50 text-violet-900',
  'border-orange-200 bg-orange-50 text-orange-900',
  'border-cyan-200 bg-cyan-50 text-cyan-900',
  'border-rose-200 bg-rose-50 text-rose-900',
  'border-lime-200 bg-lime-50 text-lime-900',
  'border-indigo-200 bg-indigo-50 text-indigo-900'
];

const emptyForm = {
  paciente_id: '',
  fecha: new Date().toISOString().slice(0, 10),
  hora_inicio: '08:00',
  hora_fin: '08:30',
  motivo: '',
  tipo_atencion: 'Sesion de fisioterapia',
  estado: 'Pendiente',
  observacion: ''
};

const toISODate = (date) => date.toISOString().slice(0, 10);

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

const getPacienteStyle = (pacienteId) => pacienteStyles[Math.abs(Number(pacienteId || 0)) % pacienteStyles.length];

function CitaForm({ form, setForm, pacientes, onSubmit, onCancel, editing, error }) {
  const pacienteOptions = [
    { value: '', label: 'Seleccionar paciente' },
    ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))
  ];

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="form-grid">
        <Input label="Paciente" options={pacienteOptions} value={form.paciente_id || ''} onChange={(event) => setForm({ ...form, paciente_id: event.target.value })} />
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
      {!compact && <span className="line-clamp-1">{cita.estado} - {cita.tipo_atencion || cita.motivo || 'Sin tipo'}</span>}
    </button>
  );
}

function Citas() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const pacienteInicial = searchParams.get('paciente_id') || '';
  const [pacientes, setPacientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, paciente_id: pacienteInicial });
  const [filters, setFilters] = useState({ paciente: '', fecha: '', estado: '', tipo_atencion: '' });
  const [view, setView] = useState('semana');
  const [cursor, setCursor] = useState(new Date());
  const [activeTab, setActiveTab] = useState('agendar');
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pacientesData, citasData] = await Promise.all([getPacientes(), getCitas()]);
      setPacientes(pacientesData);
      setCitas(citasData);
    } catch (err) {
      setError(`${err.message}. Si el modulo es nuevo, ejecuta backend/docs/citas-agenda-migration.sql.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredCitas = useMemo(() => {
    const pacienteText = filters.paciente.trim().toLowerCase();
    return citas.filter((cita) => {
      const matchPaciente = !pacienteText || nombrePaciente(cita.paciente).toLowerCase().includes(pacienteText);
      const matchPacienteInicial = !pacienteInicial || String(cita.paciente_id) === String(pacienteInicial);
      const matchFecha = !filters.fecha || cita.fecha === filters.fecha;
      const matchEstado = !filters.estado || cita.estado === filters.estado;
      const matchTipo = !filters.tipo_atencion || cita.tipo_atencion === filters.tipo_atencion;
      return matchPaciente && matchPacienteInicial && matchFecha && matchEstado && matchTipo;
    });
  }, [citas, filters, pacienteInicial]);

  const visibleDays = useMemo(() => {
    if (view === 'dia') return [cursor];
    if (view === 'semana') return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index));
    return monthDays(cursor);
  }, [cursor, view]);

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

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    try {
      const payload = cleanPayload(form);
      editing ? await updateCita(editing, payload) : await createCita(payload);
      setMessage('Cita guardada correctamente.');
      resetForm();
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
    });
    setSelected(null);
    setActiveTab('agendar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const moveCalendar = (direction) => {
    const days = view === 'dia' ? 1 : view === 'semana' ? 7 : 30;
    setCursor(addDays(cursor, days * direction));
  };

  const title = view === 'mes'
    ? cursor.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })
    : `${formatDate(toISODate(visibleDays[0]))} - ${formatDate(toISODate(visibleDays[visibleDays.length - 1]))}`;

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-4 bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Agenda clinica</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Citas / Agenda</h2>
            <span className="mt-2 block text-sm text-brand-50">Gestiona las citas programadas de los pacientes.</span>
          </div>
          <CalendarClock size={54} className="self-center text-brand-50" />
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="panel">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('agendar')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activeTab === 'agendar' ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <Plus size={17} />
            Agendar citas
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

      {activeTab === 'agendar' && (
        <div className="panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-ink">{editing ? 'Editar cita' : 'Agendar cita'}</h3>
              <p className="text-sm text-slate-500">Registra una nueva cita seleccionando un paciente.</p>
            </div>
            {editing && (
              <Button variant="ghost" onClick={resetForm}>
                Nueva cita
              </Button>
            )}
          </div>
          <CitaForm form={form} setForm={setForm} pacientes={pacientes} onSubmit={submit} onCancel={resetForm} editing={editing} error="" />
        </div>
      )}

      {activeTab === 'calendario' && (
        <div className="panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Calendario de citas</h3>
            <p className="text-sm text-slate-500">{filteredCitas.length} citas visibles.</p>
          </div>
          <Button onClick={() => setActiveTab('agendar')}>
            <Plus size={17} />
            Nueva cita
          </Button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Input label="Buscar por paciente" value={filters.paciente} onChange={(event) => setFilters({ ...filters, paciente: event.target.value })} />
          <Input label="Filtrar por fecha" type="date" value={filters.fecha} onChange={(event) => setFilters({ ...filters, fecha: event.target.value })} />
          <Input label="Estado" options={[{ value: '', label: 'Todos' }, ...ESTADOS.map((estado) => ({ value: estado, label: estado }))]} value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })} />
          <Input label="Tipo de atencion" options={[{ value: '', label: 'Todos' }, ...TIPOS.map((tipo) => ({ value: tipo, label: tipo }))]} value={filters.tipo_atencion} onChange={(event) => setFilters({ ...filters, tipo_atencion: event.target.value })} />
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
                  <strong className="text-sm capitalize text-ink">{day.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit' })}</strong>
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
      )}

      {activeTab === 'agendar' && (
        <div className="panel">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-ink">Listado de citas</h3>
          <p className="text-sm text-slate-500">Consulta, edicion y control de estado.</p>
        </div>
        <Table
          columns={['Paciente', 'Fecha', 'Hora', 'Motivo', 'Tipo de atencion', 'Estado', 'Observacion', 'Acciones']}
          rows={filteredCitas.map((cita) => [
            nombrePaciente(cita.paciente),
            formatDate(cita.fecha),
            `${cita.hora_inicio?.slice(0, 5) || ''} - ${cita.hora_fin?.slice(0, 5) || ''}`,
            cita.motivo || 'Sin motivo',
            cita.tipo_atencion || 'Sin tipo',
            <Badge estado={cita.estado} />,
            cita.observacion || 'Sin observacion',
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

      <Modal open={Boolean(selected)} title="Detalle de cita" onClose={() => setSelected(null)} size="lg">
        {selected && (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="block text-xs font-black uppercase text-slate-500">Paciente</span><strong className="mt-1 block text-sm text-ink">{nombrePaciente(selected.paciente)}</strong></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="block text-xs font-black uppercase text-slate-500">Fecha</span><strong className="mt-1 block text-sm text-ink">{formatDate(selected.fecha)}</strong></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="block text-xs font-black uppercase text-slate-500">Hora</span><strong className="mt-1 block text-sm text-ink">{selected.hora_inicio?.slice(0, 5)} - {selected.hora_fin?.slice(0, 5) || ''}</strong></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="block text-xs font-black uppercase text-slate-500">Estado</span><div className="mt-1"><Badge estado={selected.estado} /></div></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="block text-xs font-black uppercase text-slate-500">Motivo</span><strong className="mt-1 block text-sm text-ink">{selected.motivo || 'Sin motivo'}</strong></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="block text-xs font-black uppercase text-slate-500">Tipo</span><strong className="mt-1 block text-sm text-ink">{selected.tipo_atencion || 'Sin tipo'}</strong></div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="block text-xs font-black uppercase text-slate-500">Observacion</span><strong className="mt-1 block text-sm text-ink">{selected.observacion || 'Sin observacion'}</strong></div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => editCita(selected)}><FilePenLine size={17} />Editar</Button>
              <Button variant="danger" onClick={() => updateCitaEstado(selected.id, 'Cancelada').then(() => { setSelected(null); load(); })}><XCircle size={17} />Cancelar cita</Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Citas;
