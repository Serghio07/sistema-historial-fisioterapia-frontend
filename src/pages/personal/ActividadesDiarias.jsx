import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarClock, CalendarDays, CheckCircle2, FilePenLine, ListTodo, Plus, Search, Trash2 } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { getCitas } from '../../services/citaService';
import { getPersonal } from '../../services/personalService';
import { getSesiones } from '../../services/sesionService';
import { getUsuarios } from '../../services/usuarioService';
import { createTareaPersonal, deleteTareaPersonal, getTareasPersonal, updateTareaEstado, updateTareaPersonal } from '../../services/tareaPersonalService';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const today = () => new Date().toISOString().slice(0, 10);
const initialTask = { asignado_usuario_id: '', titulo: '', descripcion: '', fecha: today(), hora: '08:00', prioridad: 'media', estado: 'pendiente' };
const nombrePersonal = (item) => `${item.apellido_paterno || ''} ${item.apellido_materno || ''} ${item.nombres || ''}`.trim();
const stateLabel = { pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada', cancelada: 'Cancelada' };
const stateTone = { pendiente: 'bg-amber-50 text-amber-700', en_progreso: 'bg-blue-50 text-blue-700', completada: 'bg-emerald-50 text-emerald-700', cancelada: 'bg-slate-100 text-slate-600' };

function TaskForm({ form, setForm, usuarios, onSubmit, onCancel, editing }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  return <form onSubmit={onSubmit} className="grid gap-4">
    <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Asignar a" value={form.asignado_usuario_id} onChange={(e) => update('asignado_usuario_id', e.target.value)} options={[
          { value: '', label: 'Seleccionar personal' },
          ...usuarios.filter((item) => item.estado === 'activo').map((item) => ({ value: item.id, label: `${item.nombre} — ${item.rol === 'admin' ? 'Administrador' : 'Personal'}` }))
        ]} required />
        <Input label="Título de la tarea" value={form.titulo} onChange={(e) => update('titulo', e.target.value)} required />
        <Input label="Fecha" type="date" value={form.fecha} onChange={(e) => update('fecha', e.target.value)} required />
        <Input label="Hora" type="time" value={form.hora} onChange={(e) => update('hora', e.target.value)} />
        <Input label="Prioridad" value={form.prioridad} onChange={(e) => update('prioridad', e.target.value)} options={[
          { value: 'baja', label: 'Baja' }, { value: 'media', label: 'Media' }, { value: 'alta', label: 'Alta' }
        ]} />
        <Input label="Estado" value={form.estado} onChange={(e) => update('estado', e.target.value)} options={Object.entries(stateLabel).map(([value, label]) => ({ value, label }))} />
        <Input label="Descripción" value={form.descripcion} onChange={(e) => update('descripcion', e.target.value)} multiline className="sm:col-span-2" />
      </div>
    </div>
    <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit">{editing ? 'Guardar cambios' : 'Crear tarea'}</Button></div>
  </form>;
}

function ActividadesDiarias() {
  const [fecha, setFecha] = useState(today());
  const [query, setQuery] = useState('');
  const [personal, setPersonal] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
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
      const [personalData, usuariosData, sesionesData, citasData, tareasData] = await Promise.all([getPersonal(), getUsuarios(), getSesiones(), getCitas(), getTareasPersonal()]);
      setPersonal(personalData); setUsuarios(usuariosData.filter((item) => ['admin', 'personal'].includes(item.rol))); setSesiones(sesionesData); setCitas(citasData); setTareas(tareasData);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const actividades = useMemo(() => {
    const term = query.trim().toLowerCase();
    const clinical = [
      ...sesiones.map((item) => ({ id: `sesion-${item.id}`, fecha: item.fecha, tipo: 'Sesión', usuario_id: item.usuario_id || item.registrado_por?.id, responsable: item.registrado_por?.nombre || 'Registro anterior', paciente: nombrePaciente(item.paciente), detalle: item.observacion || `Asistencia: ${item.asistencia}`, hora: '', source: 'clinical' })),
      ...citas.map((item) => ({ id: `cita-${item.id}`, fecha: item.fecha, tipo: 'Cita', usuario_id: item.usuario_id || item.registrado_por?.id, responsable: item.registrado_por?.nombre || 'Registro anterior', paciente: nombrePaciente(item.paciente), detalle: item.tipo_atencion || item.motivo || '', hora: item.hora_inicio?.slice(0, 5), source: 'clinical' }))
    ].map((item) => {
      const ficha = personal.find((persona) => String(persona.usuario_id) === String(item.usuario_id));
      return { ...item, responsable: ficha ? nombrePersonal(ficha) : item.responsable, cargo: ficha?.cargo || '' };
    });
    const tasks = tareas.map((item) => ({ id: `tarea-${item.id}`, raw: item, fecha: item.fecha, tipo: 'Tarea', responsable: item.personal ? nombrePersonal(item.personal) : item.asignado_a?.nombre || 'Personal no disponible', cargo: item.personal?.cargo || (item.asignado_a?.rol === 'admin' ? 'Administrador' : 'Personal'), paciente: '—', detalle: item.titulo, hora: item.hora?.slice(0, 5), source: 'task', estado: item.estado }));
    return [...tasks, ...clinical].filter((item) => (!fecha || item.fecha === fecha) && (!term || `${item.responsable} ${item.cargo} ${item.paciente} ${item.tipo} ${item.detalle}`.toLowerCase().includes(term))).sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  }, [sesiones, citas, tareas, personal, fecha, query]);

  const openNew = () => { setEditing(null); setForm({ ...initialTask, fecha }); setShowForm(true); };
  const openEdit = (task) => { setEditing(task.id); setForm({ ...initialTask, ...task, hora: task.hora?.slice(0, 5) || '' }); setShowForm(true); };
  const submit = async (event) => {
    event.preventDefault(); setMessage('');
    try {
      editing ? await updateTareaPersonal(editing, form) : await createTareaPersonal(form);
      setShowForm(false); setMessage(editing ? 'Tarea actualizada.' : 'Tarea creada correctamente.'); await load();
    } catch (error) { setMessage(error.message); }
  };

  const taskCount = actividades.filter((item) => item.source === 'task').length;
  return <section className="grid gap-5">
    {loading && <Loader />}
    <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#123f3f] via-brand-800 to-cyan-700 p-6 text-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-wider text-brand-100">Seguimiento del equipo</p><h2 className="mt-1 text-3xl font-black">Actividades Diarias</h2><p className="mt-2 text-sm text-brand-50">Organiza tareas y revisa citas y sesiones del personal.</p></div>
        <Button onClick={openNew} className="min-h-11 bg-white !text-brand-800 hover:bg-brand-50"><Plus size={18} />Nueva tarea</Button>
      </div>
    </header>
    {message && <p className="notice">{message}</p>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        [Activity, actividades.length, 'Actividades', 'text-brand-600'],
        [ListTodo, taskCount, 'Tareas', 'text-violet-600'],
        [CalendarDays, actividades.filter((i) => i.tipo === 'Sesión').length, 'Sesiones', 'text-emerald-600'],
        [CalendarClock, actividades.filter((i) => i.tipo === 'Cita').length, 'Citas', 'text-sky-600']
      ].map(([Icon, value, label, color]) => <article key={label} className="rounded-xl border border-white bg-white p-4 shadow-sm"><Icon className={color} /><strong className="mt-3 block text-3xl">{value}</strong><span className="text-sm text-slate-500">{label}</span></article>)}
    </div>

    <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
      <div className="mb-4 grid gap-3 md:grid-cols-[240px_1fr_auto]">
        <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <label className="grid gap-1 text-sm font-bold text-slate-700"><span>Buscar</span><span className="flex min-h-11 items-center rounded-lg border border-slate-200 px-3"><Search size={17} className="mr-2 text-slate-400" /><input className="w-full border-0 p-0 text-sm focus:ring-0" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Personal, cargo, paciente o tarea" /></span></label>
        <div className="flex items-end"><Button onClick={openNew}><Plus size={17} />Añadir tarea</Button></div>
      </div>
      <Table columns={['Hora', 'Personal', 'Cargo', 'Actividad', 'Paciente / Estado', 'Detalle', 'Acciones']} rows={actividades.map((item) => [
        item.hora || '—', item.responsable, item.cargo || 'Sin ficha vinculada',
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.tipo === 'Tarea' ? 'bg-violet-50 text-violet-700' : item.tipo === 'Cita' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.tipo}</span>,
        item.source === 'task' ? <span className={`rounded-full px-2.5 py-1 text-xs font-black ${stateTone[item.estado]}`}>{stateLabel[item.estado]}</span> : item.paciente,
        item.detalle,
        item.source === 'task' ? <div className="flex gap-2">
          {item.raw.estado !== 'completada' && <ActionButton label="Completar" icon={CheckCircle2} tone="edit" onClick={() => updateTareaEstado(item.raw.id, 'completada').then(load)} />}
          <ActionButton label="Editar" icon={FilePenLine} tone="edit" onClick={() => openEdit(item.raw)} />
          <ActionButton label="Eliminar" icon={Trash2} tone="delete" onClick={() => deleteTareaPersonal(item.raw.id).then(load)} />
        </div> : '—'
      ])} empty="No hay actividades registradas para la fecha seleccionada." />
    </div>
    <Modal open={showForm} title={editing ? 'Editar tarea' : 'Nueva tarea'} subtitle="Asigna una actividad concreta a un miembro del personal." onClose={() => setShowForm(false)} size="md">
      <TaskForm form={form} setForm={setForm} usuarios={usuarios} editing={editing} onSubmit={submit} onCancel={() => setShowForm(false)} />
    </Modal>
  </section>;
}

export default ActividadesDiarias;
