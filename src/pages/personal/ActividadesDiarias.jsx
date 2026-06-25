import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarClock, CalendarDays, CheckCircle2, FilePenLine, ListTodo, Plus, Search, Trash2 } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { getCitas } from '../../services/citaService';
import { getPacientes } from '../../services/pacienteService';
import { getSesiones } from '../../services/sesionService';
import { createTareaPersonal, deleteTareaPersonal, getTareasPersonal, updateTareaEstado, updateTareaPersonal } from '../../services/tareaPersonalService';
import { nombrePaciente } from '../../utils/validators';

const today = () => new Date().toISOString().slice(0, 10);
const initialTask = { paciente_id: '', titulo: '', descripcion: '', fecha: today(), hora: '08:00', prioridad: 'media', estado: 'pendiente' };
const stateLabel = { pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada', cancelada: 'Cancelada' };
const stateTone = { pendiente: 'bg-amber-50 text-amber-700', en_progreso: 'bg-blue-50 text-blue-700', completada: 'bg-emerald-50 text-emerald-700', cancelada: 'bg-slate-100 text-slate-600' };

function TaskForm({ form, setForm, pacientes, onSubmit, onCancel, editing }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Paciente" value={form.paciente_id} onChange={(e) => update('paciente_id', e.target.value)} options={[
            { value: '', label: 'Seleccionar paciente' },
            ...pacientes.filter((item) => item.estado !== false).map((item) => ({ value: item.id, label: nombrePaciente(item) }))
          ]} required />
          <Input label="Título de la tarea extra" value={form.titulo} onChange={(e) => update('titulo', e.target.value)} required />
          <Input label="Fecha" type="date" value={form.fecha} onChange={(e) => update('fecha', e.target.value)} required />
          <Input label="Hora" type="time" value={form.hora} onChange={(e) => update('hora', e.target.value)} />
          <Input label="Prioridad" value={form.prioridad} onChange={(e) => update('prioridad', e.target.value)} options={[
            { value: 'baja', label: 'Baja' }, { value: 'media', label: 'Media' }, { value: 'alta', label: 'Alta' }
          ]} />
          <Input label="Estado" value={form.estado} onChange={(e) => update('estado', e.target.value)} options={Object.entries(stateLabel).map(([value, label]) => ({ value, label }))} />
          <Input label="Descripción" value={form.descripcion} onChange={(e) => update('descripcion', e.target.value)} multiline className="sm:col-span-2" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{editing ? 'Guardar cambios' : 'Registrar tarea extra'}</Button>
      </div>
    </form>
  );
}

function ActividadesDiarias() {
  const [fecha, setFecha] = useState(today());
  const [query, setQuery] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [citas, setCitas] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [form, setForm] = useState(initialTask);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [pacientesData, sesionesData, citasData, tareasData] = await Promise.all([getPacientes(), getSesiones(), getCitas(), getTareasPersonal()]);
      setPacientes(pacientesData);
      setSesiones(sesionesData);
      setCitas(citasData);
      setTareas(tareasData);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const actividades = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = [
      ...tareas.map((item) => ({
        id: `tarea-${item.id}`, raw: item, source: 'task', fecha: item.fecha, hora: item.hora?.slice(0, 5) || '',
        tipo: 'Tarea extra', responsable: item.creado_por?.nombre || 'Usuario no disponible',
        paciente: nombrePaciente(item.paciente), estado: item.estado, detalle: item.titulo
      })),
      ...citas.map((item) => ({
        id: `cita-${item.id}`, source: 'clinical', fecha: item.fecha, hora: item.hora_inicio?.slice(0, 5) || '',
        tipo: 'Cita', responsable: item.registrado_por?.nombre || 'Registro anterior',
        paciente: nombrePaciente(item.paciente), detalle: item.tipo_atencion || item.motivo || ''
      })),
      ...sesiones.map((item) => ({
        id: `sesion-${item.id}`, source: 'clinical', fecha: item.fecha, hora: '',
        tipo: 'Sesión', responsable: item.registrado_por?.nombre || 'Registro anterior',
        paciente: nombrePaciente(item.paciente), detalle: item.observacion || `Asistencia: ${item.asistencia}`
      }))
    ];
    return rows
      .filter((item) => (!fecha || item.fecha === fecha) && (!term || `${item.responsable} ${item.paciente} ${item.tipo} ${item.detalle}`.toLowerCase().includes(term)))
      .sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  }, [tareas, citas, sesiones, fecha, query]);

  const openNew = () => { setEditing(null); setForm({ ...initialTask, fecha }); setShowForm(true); };
  const openEdit = (task) => { setEditing(task.id); setForm({ ...initialTask, ...task, hora: task.hora?.slice(0, 5) || '' }); setShowForm(true); };
  const submit = async (event) => {
    event.preventDefault();
    try {
      editing ? await updateTareaPersonal(editing, form) : await createTareaPersonal(form);
      setShowForm(false);
      setMessage(editing ? 'Tarea extra actualizada.' : 'Tarea extra registrada correctamente.');
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#123f3f] via-brand-800 to-cyan-700 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-brand-100">Seguimiento clínico</p>
            <h2 className="mt-1 text-3xl font-black">Actividades Diarias</h2>
            <p className="mt-2 text-sm text-brand-50">Citas, sesiones y tareas adicionales registradas para cada paciente.</p>
          </div>
          <Button onClick={openNew} className="min-h-11 bg-white !text-brand-800 hover:bg-brand-50"><Plus size={18} />Nueva tarea extra</Button>
        </div>
      </header>
      {message && <p className="notice">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Activity, actividades.length, 'Actividades', 'text-brand-600'],
          [ListTodo, actividades.filter((i) => i.source === 'task').length, 'Tareas extra', 'text-violet-600'],
          [CalendarDays, actividades.filter((i) => i.tipo === 'Sesión').length, 'Sesiones', 'text-emerald-600'],
          [CalendarClock, actividades.filter((i) => i.tipo === 'Cita').length, 'Citas', 'text-sky-600']
        ].map(([Icon, value, label, color]) => (
          <article key={label} className="rounded-xl border border-white bg-white p-4 shadow-sm">
            <Icon className={color} /><strong className="mt-3 block text-3xl">{value}</strong><span className="text-sm text-slate-500">{label}</span>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-[240px_1fr_auto]">
          <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            <span>Buscar</span>
            <span className="flex min-h-11 items-center rounded-lg border border-slate-200 px-3">
              <Search size={17} className="mr-2 text-slate-400" />
              <input className="w-full border-0 p-0 text-sm focus:ring-0" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Paciente, actividad o usuario" />
            </span>
          </label>
          <div className="flex items-end"><Button onClick={openNew}><Plus size={17} />Añadir tarea extra</Button></div>
        </div>
        <Table
          columns={['Hora', 'Registrado por', 'Actividad', 'Paciente', 'Estado', 'Detalle', 'Acciones']}
          rows={actividades.map((item) => [
            item.hora || '—',
            item.responsable,
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.source === 'task' ? 'bg-violet-50 text-violet-700' : item.tipo === 'Cita' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.tipo}</span>,
            item.paciente,
            item.source === 'task' ? <span className={`rounded-full px-2.5 py-1 text-xs font-black ${stateTone[item.estado]}`}>{stateLabel[item.estado]}</span> : '—',
            item.detalle,
            item.source === 'task' ? <div className="flex gap-2">
              {item.raw.estado !== 'completada' && <ActionButton label="Completar" icon={CheckCircle2} tone="edit" onClick={() => updateTareaEstado(item.raw.id, 'completada').then(load)} />}
              <ActionButton label="Editar" icon={FilePenLine} tone="edit" onClick={() => openEdit(item.raw)} />
              <ActionButton label="Eliminar" icon={Trash2} tone="delete" onClick={() => deleteTareaPersonal(item.raw.id).then(load)} />
            </div> : '—'
          ])}
          empty="No hay actividades registradas para la fecha seleccionada."
        />
      </div>

      <Modal open={showForm} title={editing ? 'Editar tarea extra' : 'Nueva tarea extra'} subtitle="Registra una actividad adicional vinculada al paciente." onClose={() => setShowForm(false)} size="md">
        <TaskForm form={form} setForm={setForm} pacientes={pacientes} editing={editing} onSubmit={submit} onCancel={() => setShowForm(false)} />
      </Modal>
    </section>
  );
}

export default ActividadesDiarias;
