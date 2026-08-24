import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarClock, CalendarDays, CheckCircle2, Eye, FilePenLine, ListTodo, Search, Trash2, UserRound } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { getCitas } from '../../services/citaService';
import { getPacientes } from '../../services/pacienteService';
import { getSesiones } from '../../services/sesionService';
import { createTareaPersonal, deleteTareaPersonal, getTareasPersonal, updateTareaEstado, updateTareaPersonal } from '../../services/tareaPersonalService';
import { getActividades } from '../../services/actividadService';
import { getProfesionalesActivos } from '../../services/usuarioService';
import { nombrePaciente } from '../../utils/validators';
import { useAuth } from '../../context/AuthContext';
import { matchesSearch } from '../../utils/search';
import { boliviaDate, formatBoliviaDateTime } from '../../utils/boliviaDateTime';

const today = () => boliviaDate();
const initialTask = { paciente_id: '', titulo: '', descripcion: '', fecha: today(), hora: '08:00', prioridad: 'media', estado: 'pendiente' };
const stateLabel = { pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada', cancelada: 'Cancelada' };
const activityKind = (item) => {
  if (item.source === 'task') return 'tarea';
  if (item.source === 'audit') return 'cambio';
  return item.tipo.toLowerCase().includes('cita') ? 'cita' : 'sesion';
};
const activityStyles = {
  tarea: {
    label: 'Tareas extra',
    icon: ListTodo,
    iconClass: 'bg-violet-50 text-violet-700 ring-violet-200',
    badgeClass: 'bg-violet-50 text-violet-700 ring-violet-200'
  },
  cambio: {
    label: 'Cambios',
    icon: FilePenLine,
    iconClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    badgeClass: 'bg-amber-50 text-amber-800 ring-amber-200'
  },
  sesion: {
    label: 'Sesiones',
    icon: Activity,
    iconClass: 'bg-teal-50 text-teal-700 ring-teal-200',
    badgeClass: 'bg-teal-50 text-teal-700 ring-teal-200'
  },
  cita: {
    label: 'Citas',
    icon: CalendarClock,
    iconClass: 'bg-sky-50 text-sky-700 ring-sky-200',
    badgeClass: 'bg-sky-50 text-sky-700 ring-sky-200'
  }
};
const activityVisual = (item) => {
  const action = String(item.tipo || '').toLocaleLowerCase('es');

  if (action.includes('elimin') || action.includes('borr')) {
    return {
      icon: Trash2,
      iconClass: 'bg-rose-50 text-rose-700 ring-rose-200',
      badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200'
    };
  }
  if (action.includes('anul') || action.includes('cancel')) {
    return {
      icon: Trash2,
      iconClass: 'bg-slate-100 text-slate-600 ring-slate-200',
      badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200'
    };
  }
  if (action.includes('edit') || action.includes('actualiz') || action.includes('modific')) {
    return {
      icon: FilePenLine,
      iconClass: 'bg-amber-50 text-amber-700 ring-amber-200',
      badgeClass: 'bg-amber-50 text-amber-800 ring-amber-200'
    };
  }
  if (action.includes('complet') || action.includes('finaliz')) {
    return {
      icon: CheckCircle2,
      iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    };
  }

  return activityStyles[activityKind(item)];
};
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
  const [activityFilter, setActivityFilter] = useState('todas');
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
        && matchesSearch(`${item.responsable} ${item.paciente} ${item.tipo} ${item.detalle}`, query)
      )
      .sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  }, [tareas, citas, sesiones, bitacora, profesionales, fecha, query, isAdmin, user?.id]);
  const visibleActivities = useMemo(
    () => activityFilter === 'todas'
      ? actividades
      : actividades.filter((item) => activityKind(item) === activityFilter),
    [actividades, activityFilter]
  );
  const activityCounts = useMemo(() => actividades.reduce((counts, item) => {
    const kind = activityKind(item);
    counts[kind] += 1;
    return counts;
  }, { tarea: 0, cambio: 0, sesion: 0, cita: 0 }), [actividades]);

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
    <section className="grid gap-4">
      {loading && <Loader />}
      <header className="rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-sky-50/60 p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-brand-100 bg-white text-brand-700 shadow-sm">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-brand-700">Bitácora clínica</p>
              <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-900">Actividades diarias</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {isAdmin
                ? 'Resumen de creaciones, ediciones, cambios y eliminaciones realizadas por todo el equipo.'
                : 'Resumen de las creaciones, ediciones, cambios y eliminaciones realizadas por tu cuenta.'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-lg border border-brand-100 bg-white px-4 py-2.5 shadow-sm">
            <CalendarDays size={19} className="text-brand-700" />
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Fecha seleccionada</span>
              <strong className="text-sm capitalize text-slate-800">{formatBoliviaDateTime(`${fecha}T12:00:00-04:00`, { weekday: 'long', day: '2-digit', month: 'long' })}</strong>
            </div>
          </div>
        </div>
      </header>
      {message && <p className="notice">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Activity, actividades.length, 'Actividad total', 'bg-slate-100 text-slate-700 ring-slate-200'],
          [ListTodo, activityCounts.tarea, 'Tareas extra', 'bg-violet-50 text-violet-700 ring-violet-200'],
          [CalendarDays, activityCounts.sesion, 'Sesiones', 'bg-teal-50 text-teal-700 ring-teal-200'],
          [CalendarClock, activityCounts.cita, 'Citas', 'bg-sky-50 text-sky-700 ring-sky-200']
        ].map(([Icon, value, label, iconClass]) => (
          <article key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ${iconClass}`}><Icon size={19} /></span>
            <div><strong className="block text-2xl font-black leading-none text-slate-900">{value}</strong><span className="mt-1 block text-xs font-bold text-slate-500">{label}</span></div>
          </article>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[210px_1fr_auto]">
            <Input label="Fecha de actividad" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              <span>Buscar en la bitácora</span>
              <span className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 shadow-sm focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10">
              <Search size={17} className="mr-2 text-slate-400" />
                <input className="w-full border-0 bg-transparent p-0 text-sm focus:ring-0" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Paciente, profesional o detalle de la actividad" />
              </span>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['todas', 'Todas', actividades.length],
              ['cambio', 'Cambios', activityCounts.cambio],
              ['sesion', 'Sesiones', activityCounts.sesion],
              ['cita', 'Citas', activityCounts.cita],
              ['tarea', 'Tareas extra', activityCounts.tarea]
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActivityFilter(value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${activityFilter === value ? 'border-teal-600 bg-teal-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700'}`}
              >
                {label} <span className="ml-1 opacity-75">{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <h2 className="font-black text-slate-900">Registro de actividades</h2>
              <p className="text-xs text-slate-500">{visibleActivities.length} registros encontrados</p>
            </div>
            <span className="hidden text-xs font-bold text-slate-400 sm:inline-flex">Orden cronológico</span>
          </div>

          {visibleActivities.length ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="hidden grid-cols-[72px_190px_minmax(260px,1fr)_250px_118px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-slate-500 lg:grid">
                <span>Hora</span>
                <span>Actividad</span>
                <span>Paciente y detalle</span>
                <span>Registrado por</span>
                <span className="text-right">Acciones</span>
              </div>
              {visibleActivities.map((item) => {
                const style = activityVisual(item);
                const Icon = style.icon;
                return (
                  <article key={item.id} className="grid gap-3 border-b border-slate-100 bg-white px-4 py-3 last:border-b-0 hover:bg-brand-50/25 lg:grid-cols-[72px_190px_minmax(260px,1fr)_250px_118px] lg:items-center">
                    <time className="text-xs font-black text-slate-700">{item.hora || '—'}</time>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${style.iconClass}`}><Icon size={15} /></span>
                      <div className="min-w-0">
                        <span className={`inline-flex max-w-full truncate rounded-md px-2 py-1 text-[11px] font-black ring-1 ${style.badgeClass}`}>{item.tipo}</span>
                        {item.estado && <span className="mt-1 block text-[11px] font-bold text-slate-500">{stateLabel[item.estado] || item.estado}</span>}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{item.paciente}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-600">{item.detalle}</p>
                    </div>
                    <p className="flex min-w-0 items-center gap-2 truncate text-xs font-semibold text-slate-600"><UserRound size={14} className="shrink-0 text-brand-600" /><span className="truncate">{item.responsable}</span></p>
                    <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2 lg:border-0 lg:pt-0">
                      <ActionButton label={item.source === 'task' ? 'Ver tarea' : 'Ver actividad'} icon={Eye} tone="view" onClick={() => setSelectedActivity(item)} />
                      {item.source === 'task' && (isAdmin || String(item.raw.usuario_id) === String(user?.id)) && (
                        <>
                          {item.raw.estado !== 'completada' && <ActionButton label="Completar" icon={CheckCircle2} tone="edit" onClick={() => updateTareaEstado(item.raw.id, 'completada').then(load)} />}
                          <ActionButton label="Editar" icon={FilePenLine} tone="edit" onClick={() => openEdit(item.raw)} />
                          <ActionButton label="Eliminar" icon={Trash2} tone="delete" onClick={() => deleteTareaPersonal(item.raw.id).then(load)} />
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-slate-400 shadow-sm"><Activity size={22} /></span>
                <h3 className="mt-3 font-black text-slate-700">No hay actividades para mostrar</h3>
                <p className="mt-1 text-sm text-slate-500">Prueba otra fecha, búsqueda o categoría.</p>
              </div>
            </div>
          )}
        </div>
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

