import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarClock, CalendarDays, CheckCircle2, Eye, FilePenLine, ListTodo, Plus, Search, Trash2 } from 'lucide-react';
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
import { getActividades } from '../../services/actividadService';
import { getProfesionalesActivos } from '../../services/usuarioService';
import { nombrePaciente } from '../../utils/validators';
import { useAuth } from '../../context/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);
const initialTask = { paciente_id: '', titulo: '', descripcion: '', fecha: today(), hora: '08:00', prioridad: 'media', estado: 'pendiente' };
const stateLabel = { pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada', cancelada: 'Cancelada' };
const fieldLabels = {
  titulo: 'Título', descripcion: 'Descripción', diagnostico: 'Diagnóstico',
  diagnostico_medico: 'Diagnóstico médico', motivo: 'Motivo',
  tipo_atencion: 'Tipo de atención', asistencia: 'Asistencia',
  observacion: 'Observación', estado: 'Estado', fecha: 'Fecha',
  hora: 'Hora', cantidad_sesiones: 'Cantidad de sesiones',
  nombres: 'Nombres', apellidos: 'Apellidos', ci: 'Cédula de identidad',
  fecha_nacimiento: 'Fecha de nacimiento', lugar_nacimiento: 'Lugar de nacimiento',
  edad: 'Edad', sexo: 'Sexo', telefono: 'Teléfono', domicilio: 'Domicilio',
  estado_civil: 'Estado civil', ocupacion: 'Ocupación', referencia: 'Referencia',
  peso: 'Peso (kg)', talla: 'Talla (m)', imc: 'IMC',
  sesiones_debe: 'Sesiones contratadas', sesiones_hizo: 'Sesiones realizadas',
  numero_sesion: 'Número de sesión', metodo_pago: 'Método de pago',
  estado_pago: 'Estado del pago', fecha_evaluacion: 'Fecha de evaluación',
  dx_cie: 'Diagnóstico CIE', antecedentes: 'Antecedentes',
  conclusion_diagnostica: 'Conclusión diagnóstica',
  tratamiento_fisioterapeutico: 'Tratamiento fisioterapéutico',
  medicamentos: 'Medicamentos', estado_actual: 'Estado actual',
  observacion_final: 'Observación final', prioridad: 'Prioridad',
  fecha_inicio: 'Fecha de inicio', fecha_fin: 'Fecha de finalización'
};
const printableValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
const shownName = (usuario) => {
  const ficha = usuario?.ficha_personal;
  return ficha?.nombre_mostrado
    || [ficha?.titulo_profesional, ficha?.cargo, ficha?.nombres, ficha?.apellido_paterno, ficha?.apellido_materno].filter(Boolean).join(' ')
    || usuario?.nombre
    || 'Usuario no disponible';
};
const boliviaDateTime = (value, fallbackDate = '', fallbackTime = '') => {
  if (!value) return { fecha: fallbackDate, hora: fallbackTime };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { fecha: fallbackDate, hora: fallbackTime };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    fecha: `${get('year')}-${get('month')}-${get('day')}`,
    hora: `${get('hour')}:${get('minute')}`
  };
};
const detailKeys = {
  Paciente: ['ci', 'telefono', 'edad', 'sexo', 'domicilio', 'ocupacion'],
  'Historia clínica': ['diagnostico_medico', 'fecha_evaluacion', 'motivo', 'observacion'],
  Sesión: ['numero_sesion', 'asistencia', 'metodo_pago', 'estado_pago', 'observacion'],
  Cita: ['tipo_atencion', 'motivo', 'fecha', 'hora', 'estado'],
  'Informe médico': ['diagnostico', 'dx_cie', 'cantidad_sesiones', 'estado_actual'],
  'Documento clínico': ['tipo', 'titulo', 'fecha', 'estado', 'descripcion'],
  'Tarea extra': ['titulo', 'descripcion', 'prioridad', 'fecha', 'hora', 'estado'],
  'Planilla de atención': ['diagnostico', 'fecha_inicio', 'fecha_fin', 'observacion']
};
const activityDetails = (activity) => {
  const data = activity.source === 'audit'
    ? { ...(activity.raw.paciente || {}), ...(activity.raw.datos || {}) }
    : activity.raw || {};
  const moduleName = activity.raw?.modulo
    || (activity.source === 'task' ? 'Tarea extra'
      : activity.tipo.toLowerCase().includes('cita') ? 'Cita'
        : activity.tipo.toLowerCase().includes('sesión') ? 'Sesión'
          : activity.tipo);
  const preferred = detailKeys[moduleName] || Object.keys(fieldLabels);
  return preferred
    .filter((key) => fieldLabels[key] && data[key] !== null && data[key] !== undefined && data[key] !== '')
    .slice(0, 5)
    .map((key) => [key, data[key]]);
};

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
  const { user, isAdmin } = useAuth();
  const [fecha, setFecha] = useState(today());
  const [query, setQuery] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [citas, setCitas] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [form, setForm] = useState(initialTask);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [pacientesData, sesionesData, citasData, tareasData, bitacoraData, profesionalesData] = await Promise.all([
        getPacientes(),
        getSesiones(),
        getCitas(),
        getTareasPersonal(),
        getActividades(fecha),
        getProfesionalesActivos()
      ]);
      setPacientes(pacientesData);
      setSesiones(sesionesData);
      setCitas(citasData);
      setTareas(tareasData);
      setBitacora(bitacoraData);
      setProfesionales(profesionalesData);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [fecha]);

  const actividades = useMemo(() => {
    const term = query.trim().toLowerCase();
    const responsibleName = (actorId, fallback) => {
      const profesional = profesionales.find((item) => String(item.id) === String(actorId));
      return profesional ? (profesional.nombre_mostrado || shownName(profesional)) : shownName(fallback);
    };
    const rows = [
      ...bitacora
        .filter((item) => !(item.accion === 'Creó' && ['Cita', 'Sesión', 'Tarea extra'].includes(item.modulo)))
        .map((item) => ({
          id: `bitacora-${item.id}`,
          raw: item,
          actorId: item.usuario_id || item.usuario?.id,
          source: 'audit',
          fecha: item.fecha,
          hora: item.hora?.slice(0, 5) || '',
          tipo: `${item.accion} ${item.modulo}`,
          responsable: responsibleName(item.usuario_id || item.usuario?.id, item.usuario),
          paciente: item.paciente ? nombrePaciente(item.paciente) : 'Sin paciente',
          estado: '',
          detalle: item.detalle || `${item.accion} ${item.modulo.toLowerCase()}`
        })),
      ...tareas.map((item) => ({
        id: `tarea-${item.id}`, raw: item, source: 'task',
        ...boliviaDateTime(item.created_at || item.createdAt, item.fecha, item.hora?.slice(0, 5) || ''),
        actorId: item.usuario_id || item.creado_por?.id,
        tipo: 'Creó tarea extra', responsable: responsibleName(item.usuario_id || item.creado_por?.id, item.creado_por),
        paciente: nombrePaciente(item.paciente), estado: item.estado, detalle: item.titulo
      })),
      ...citas.map((item) => ({
        id: `cita-${item.id}`, raw: item, source: 'clinical',
        ...boliviaDateTime(item.created_at || item.createdAt, item.fecha, item.hora_inicio?.slice(0, 5) || ''),
        actorId: item.usuario_id || item.registrado_por?.id,
        tipo: 'Creó cita', responsable: responsibleName(item.usuario_id || item.registrado_por?.id, item.registrado_por),
        paciente: nombrePaciente(item.paciente), detalle: item.tipo_atencion || item.motivo || ''
      })),
      ...sesiones.map((item) => ({
        id: `sesion-${item.id}`, raw: item, source: 'clinical',
        ...boliviaDateTime(item.created_at || item.createdAt, item.fecha, ''),
        actorId: item.usuario_id || item.registrado_por?.id,
        tipo: 'Creó sesión', responsable: responsibleName(item.usuario_id || item.registrado_por?.id, item.registrado_por),
        paciente: nombrePaciente(item.paciente), detalle: item.observacion || `Asistencia: ${item.asistencia}`
      }))
    ];
    return rows
      .filter((item) =>
        (isAdmin || String(item.actorId) === String(user?.id))
        && (!fecha || item.fecha === fecha)
        && (!term || `${item.responsable} ${item.paciente} ${item.tipo} ${item.detalle}`.toLowerCase().includes(term))
      )
      .sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  }, [tareas, citas, sesiones, bitacora, profesionales, fecha, query, isAdmin, user?.id]);

  const openNew = () => { setEditing(null); setForm({ ...initialTask, fecha }); setShowForm(true); };
  const openEdit = (task) => { setEditing(task.id); setForm({ ...initialTask, ...task, hora: task.hora?.slice(0, 5) || '' }); setShowForm(true); };
  const submit = async (event) => {
    event.preventDefault();
    try {
      editing ? await updateTareaPersonal(editing, form) : await createTareaPersonal(form);
      setShowForm(false);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-3 bg-gradient-to-r from-brand-900 to-brand-600 p-4 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold text-brand-50">Bitácora clínica</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Actividades Diarias</h2>
            <span className="mt-2 block text-sm text-brand-50">
              {isAdmin
                ? 'Resumen de creaciones, ediciones, cambios y eliminaciones realizadas por todo el equipo.'
                : 'Resumen de las creaciones, ediciones, cambios y eliminaciones realizadas por tu cuenta.'}
            </span>
          </div>
          <Activity size={42} className="self-center text-brand-50" />
        </div>
      </div>
      {message && <p className="notice">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Activity, actividades.length, 'Actividades', 'text-brand-600'],
          [ListTodo, actividades.filter((i) => i.source === 'task').length, 'Tareas extra', 'text-violet-600'],
          [CalendarDays, actividades.filter((i) => i.tipo.toLowerCase().includes('sesión')).length, 'Sesiones', 'text-emerald-600'],
          [CalendarClock, actividades.filter((i) => i.tipo.toLowerCase().includes('cita')).length, 'Citas', 'text-sky-600']
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
          columns={['Hora', 'Registrado por', 'Actividad', 'Paciente', 'Detalle', 'Acciones']}
          rows={actividades.map((item) => [
            item.hora || '—',
            item.responsable,
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.source === 'task' ? 'bg-violet-50 text-violet-700' : item.source === 'audit' ? 'bg-amber-50 text-amber-700' : item.tipo.toLowerCase().includes('cita') ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.tipo}</span>,
            item.paciente,
            item.detalle,
            <div className="flex gap-2">
              <ActionButton label={item.source === 'task' ? 'Ver tarea' : 'Ver actividad'} icon={Eye} tone="view" onClick={() => setSelectedActivity(item)} />
              {item.source === 'task' && (isAdmin || String(item.raw.usuario_id) === String(user?.id)) && (
                <>
                  {item.raw.estado !== 'completada' && <ActionButton label="Completar" icon={CheckCircle2} tone="edit" onClick={() => updateTareaEstado(item.raw.id, 'completada').then(load)} />}
                  <ActionButton label="Editar" icon={FilePenLine} tone="edit" onClick={() => openEdit(item.raw)} />
                  <ActionButton label="Eliminar" icon={Trash2} tone="delete" onClick={() => deleteTareaPersonal(item.raw.id).then(load)} />
                </>
              )}
            </div>
          ])}
          empty="No hay actividades registradas para la fecha seleccionada."
        />
      </div>

      <Modal open={showForm} title={editing ? 'Editar tarea extra' : 'Nueva tarea extra'} subtitle="Registra una actividad adicional vinculada al paciente." onClose={() => setShowForm(false)} size="md">
        <TaskForm form={form} setForm={setForm} pacientes={pacientes} editing={editing} onSubmit={submit} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal
        open={Boolean(selectedActivity)}
        title={selectedActivity?.source === 'task' ? 'Detalle de la tarea' : 'Detalle de la actividad'}
        subtitle="Resumen de lo que realizó el usuario."
        onClose={() => setSelectedActivity(null)}
        size="sm"
      >
        {selectedActivity && (
          <div className="grid gap-3">
            <section className="rounded-lg border border-brand-100 bg-brand-50/60 p-3">
              <span className="text-xs font-black uppercase text-brand-600">{selectedActivity.tipo}</span>
              <h3 className="mt-1 text-base font-black text-slate-900">{selectedActivity.detalle}</h3>
              <p className="mt-1 text-xs text-slate-600">
                <strong>{selectedActivity.responsable}</strong> · {selectedActivity.fecha} · {selectedActivity.hora || 'Sin hora'}
              </p>
            </section>
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-3">
              <div className="grid grid-cols-[105px_1fr] gap-2 py-2 text-sm">
                <dt className="font-bold text-slate-500">Paciente</dt>
                <dd className="font-bold text-slate-900">{selectedActivity.paciente}</dd>
              </div>
              {activityDetails(selectedActivity).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[105px_1fr] gap-2 py-2 text-sm">
                  <dt className="font-bold text-slate-500">{fieldLabels[key]}</dt>
                  <dd className="whitespace-pre-wrap font-semibold text-slate-900">{printableValue(value)}</dd>
                </div>
              ))}
            </dl>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setSelectedActivity(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default ActividadesDiarias;
