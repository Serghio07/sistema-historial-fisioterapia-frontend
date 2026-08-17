import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Clock3, Eye, FilePenLine, Plus, Stethoscope, TableProperties, UserRound, XCircle } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { PatientIdentity } from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { createCita, deleteCita, getCitas, updateCita, updateCitaEstado } from '../../services/citaService';
import { getPacientes } from '../../services/pacienteService';
import { getPersonal } from '../../services/personalService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import { matchesSearch } from '../../utils/search';
import { BOLIVIA_TIME_ZONE, boliviaDate, boliviaTime } from '../../utils/boliviaDateTime';
import ListadoCitasAgrupado from './components/ListadoCitasAgrupado';
import { agruparCitasPorPacienteEHistoria } from './utils/agruparCitas';
import CalendarHeader from './components/calendar/CalendarHeader';
import { MonthView, TimeGridView } from './components/calendar/CalendarViews';
import DragAppointmentOverlay from './components/calendar/DragAppointmentOverlay';
import QuickCreateAppointmentModal from './components/calendar/QuickCreateAppointmentModal';
import { appendCreatedAppointment, createNewAppointment, draftFromAppointmentDrop, emptySlotDraft, sortAppointments } from './utils/appointmentCreation';

const ESTADOS = ['Pendiente', 'Programada', 'Confirmada', 'Atendida', 'Cancelada', 'Reprogramada', 'No asistio', 'Falto'];
const TIPOS = ['Primera consulta', 'Sesion de fisioterapia', 'Sesion de tratamiento', 'Evaluacion', 'Control', 'Rehabilitacion', 'Otro'];
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
  cita?.sesion_clinica?.asistencia === 'asistio' || cita?.estado === 'Atendida'
    ? 'Atendida'
    : cita?.estado === 'No asistio' ? 'No asistió' : cita?.estado;

const getPacienteStyle = (pacienteId) => pacienteStyles[Math.abs(Number(pacienteId || 0)) % pacienteStyles.length];

function CitaForm({ form, setForm, pacientes, onSubmit, onCancel, editing, error, errors, registeredBy, saving }) {
  const pacienteOptions = [
    { value: '', label: 'Seleccionar paciente' },
    ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))
  ];
  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div><h3 className="text-sm font-black text-slate-800">Información de la cita</h3><p className="mt-0.5 text-xs text-slate-500">Selecciona el paciente y el tipo de atención.</p></div>
        <Input id="cita-paciente" label="Paciente" options={pacienteOptions} value={form.paciente_id || ''} error={errors.paciente_id} onChange={change('paciente_id')} />
        <Input id="cita-tipo" label="Tipo de atención" options={[{ value: '', label: 'Seleccionar tipo de atención' }, ...TIPOS.map((tipo) => ({ value: tipo, label: tipo }))]} value={form.tipo_atencion || ''} error={errors.tipo_atencion} onChange={change('tipo_atencion')} className="[&_select]:min-h-11 [&_select]:rounded-xl [&_select]:border-brand-200 [&_select]:font-semibold" />
        {registeredBy && <p className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs text-slate-500"><span className="font-bold text-brand-700">Registrado por:</span> {registeredBy}</p>}
      </section>
      <section className="grid gap-3 rounded-xl border border-slate-200 p-4">
        <div><h3 className="text-sm font-black text-slate-800">Fecha y horario</h3><p className="mt-0.5 text-xs text-slate-500">Define cuándo se realizará la atención.</p></div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input id="cita-fecha" label="Fecha" type="date" value={form.fecha || ''} error={errors.fecha} onChange={change('fecha')} />
          <Input id="cita-inicio" label="Hora de inicio" type="time" value={form.hora_inicio || ''} error={errors.hora_inicio} onChange={change('hora_inicio')} />
          <Input id="cita-fin" label="Hora de fin" type="time" value={form.hora_fin || ''} error={errors.hora_fin} onChange={change('hora_fin')} />
        </div>
      </section>
      <section className="grid gap-3 rounded-xl border border-slate-200 p-4">
        <div><h3 className="text-sm font-black text-slate-800">Observación</h3><p className="mt-0.5 text-xs text-slate-500">Información adicional para la atención.</p></div>
        <Input id="cita-observacion" label="Observación" multiline rows={3} placeholder="Añade información adicional sobre la cita..." value={form.observacion || ''} onChange={change('observacion')} className="[&_textarea]:min-h-24" />
      </section>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} className="sm:min-w-28" disabled={saving}>Cancelar</Button>
        <Button type="submit" className="sm:min-w-36" disabled={saving}>
          <CalendarClock size={17} />
          {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar cita'}
        </Button>
      </div>
    </form>
  );
}

function EventCard({ cita, compact = false, onClick }) {
  const paciente = nombrePaciente(cita.paciente);
  const profesional = cita.profesional?.nombre || cita.registrado_por?.nombre || 'Sin profesional asignado';
  const estado = estadoVisible(cita);
  const tipo = cita.tipo_atencion || cita.motivo || 'Atención sin especificar';
  return (
    <div className="group relative min-w-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Ver cita de ${paciente} a las ${cita.hora_inicio?.slice(0, 5)}`}
        className={`relative grid w-full min-w-0 gap-1 overflow-hidden rounded-xl border px-2.5 py-2 text-left text-xs font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${getPacienteStyle(cita.paciente_id || cita.paciente?.id)}`}
      >
        <span className="absolute inset-y-0 left-0 w-1 bg-current opacity-50" />
        <span className="flex items-center justify-between gap-1 pl-1">
          <span className="inline-flex items-center gap-1 font-black"><Clock3 size={12} />{cita.hora_inicio?.slice(0, 5)}</span>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
        </span>
        <span className="truncate pl-1 font-black uppercase tracking-tight">{paciente}</span>
        {!compact && <span className="truncate pl-1 text-[10px] font-bold opacity-75">{estado} · {tipo}</span>}
      </button>

      <div role="tooltip" className="pointer-events-none invisible absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 translate-y-1 rounded-2xl border border-slate-200 bg-slate-900 p-3.5 text-left text-white opacity-0 shadow-2xl transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-slate-900" />
        <span className="block truncate text-sm font-black">{paciente}</span>
        <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-cyan-200"><Clock3 size={13} />{cita.hora_inicio?.slice(0, 5)} – {cita.hora_fin?.slice(0, 5) || 'Sin hora final'}</span>
        <span className="mt-3 grid gap-2 border-t border-white/10 pt-3 text-xs text-slate-200">
          <span className="flex items-start gap-2"><CalendarClock className="mt-0.5 shrink-0 text-cyan-300" size={14} /><span><b className="text-white">Estado:</b> {estado}</span></span>
          <span className="flex items-start gap-2"><Stethoscope className="mt-0.5 shrink-0 text-cyan-300" size={14} /><span><b className="text-white">Atención:</b> {tipo}</span></span>
          <span className="flex items-start gap-2"><UserRound className="mt-0.5 shrink-0 text-cyan-300" size={14} /><span><b className="text-white">Profesional:</b> {profesional}</span></span>
        </span>
        <span className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Haz clic para ver el detalle completo</span>
      </div>
    </div>
  );
}

const citasVisiblesEnAgenda = (items = []) => items.filter((cita) => !(
  cita.paciente?.registro_pendiente === true && cita.paciente?.estado === false
));

function Citas() {
  const { isAdmin, user } = useAuth();
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
  const [expandedPatients, setExpandedPatients] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [quickDraft, setQuickDraft] = useState(null);
  const [quickError, setQuickError] = useState('');
  const [dragOverlay, setDragOverlay] = useState(null);
  const suppressAppointmentOpenUntil = useRef(0);
  const quickSaveInFlight = useRef(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pacientesData, citasData, personalData] = await Promise.all([getPacientes(), getCitas(), getPersonal()]);
      setPacientes(pacientesData);
      setCitas(citasVisiblesEnAgenda(citasData));
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
    if (!message) return undefined;
    const timeoutId = window.setTimeout(() => setMessage(''), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    const actualizarEstados = async () => {
      try {
        const citasData = await getCitas();
        const visibles = citasVisiblesEnAgenda(citasData);
        setCitas(visibles);
        setSelected((actual) => actual
          ? visibles.find((item) => Number(item.id) === Number(actual.id)) || null
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
    const today = boliviaDate();
    const currentTime = boliviaTime();
    return filteredCitas.filter((cita) => (
      cita.fecha !== today || String(cita.hora_inicio || '').slice(0, 5) >= currentTime
    )).reduce((data, cita) => {
      data[cita.fecha] = data[cita.fecha] || [];
      data[cita.fecha].push(cita);
      return data;
    }, {});
  }, [filteredCitas]);

  const groupedPatients = useMemo(() => agruparCitasPorPacienteEHistoria(filteredCitas), [filteredCitas]);

  const validate = () => {
    const errors = {};
    if (!form.paciente_id) errors.paciente_id = 'Selecciona un paciente.';
    if (!form.tipo_atencion) errors.tipo_atencion = 'Selecciona un tipo de atención.';
    if (!form.fecha) errors.fecha = 'La fecha es obligatoria.';
    if (!form.hora_inicio) errors.hora_inicio = 'La hora de inicio es obligatoria.';
    if (!form.hora_fin) errors.hora_fin = 'La hora de fin es obligatoria.';
    else if (form.hora_inicio && form.hora_fin <= form.hora_inicio) errors.hora_fin = 'La hora de fin debe ser posterior a la hora de inicio.';
    return errors;
  };

  const resetForm = () => {
    setForm({ ...emptyForm, paciente_id: pacienteInicial });
    setEditing(null);
    setError('');
    setFormErrors({});
  };

  const openNuevaCita = () => {
    resetForm();
    setShowFormModal(true);
  };

  const cambiarEstado = async (cita, estado, { closeDetail = false } = {}) => {
    setSaving(true);
    setError('');
    try {
      const actualizada = await updateCitaEstado(cita.id, estado);
      setCitas((actuales) => actuales.map((item) => (
        Number(item.id) === Number(actualizada.id) ? actualizada : item
      )));
      setSelected((actual) => {
        if (!actual || Number(actual.id) !== Number(actualizada.id)) return actual;
        return closeDetail ? null : actualizada;
      });
      setMessage(`Cita ${estado.toLowerCase()} correctamente.`);
      return actualizada;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudo actualizar la cita.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const openNuevaCitaPaciente = (patientId) => {
    resetForm();
    setForm({ ...emptyForm, paciente_id: String(patientId) });
    setShowFormModal(true);
  };

  const clearFilters = () => setFilters({ paciente: '', fecha: '', estado: '', tipo_atencion: '', profesional_id: '' });

  const togglePatient = (key) => setExpandedPatients((current) => (current[key] ? {} : { [key]: true }));

  const closeFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const openCalendarAppointment = (appointment) => {
    if (Date.now() < suppressAppointmentOpenUntil.current) return;
    setSelected(appointment);
  };

  const openQuickDraft = (draft) => {
    setQuickError('');
    setQuickDraft(draft);
  };

  const startAppointmentDrag = (pointerEvent, appointment) => {
    if (pointerEvent.button !== 0) return;
    const startX = pointerEvent.clientX;
    const startY = pointerEvent.clientY;
    let dragging = false;
    const patientName = nombrePaciente(appointment.paciente);

    const move = (event) => {
      if (!dragging && Math.hypot(event.clientX - startX, event.clientY - startY) < 7) return;
      dragging = true;
      event.preventDefault();
      setDragOverlay({ x: event.clientX, y: event.clientY, patientName });
    };
    const finish = (event) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', cancel);
      setDragOverlay(null);
      if (!dragging) return;
      suppressAppointmentOpenUntil.current = Date.now() + 400;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-calendar-drop]');
      if (!target) return;
      openQuickDraft(draftFromAppointmentDrop(appointment, { fecha: target.dataset.date, hora_inicio: target.dataset.time || '' }));
    };
    const cancel = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', cancel);
      setDragOverlay(null);
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', cancel);
  };

  const createQuickAppointment = async () => {
    if (quickSaveInFlight.current || !quickDraft) return;
    quickSaveInFlight.current = true;
    setSaving(true);
    setQuickError('');
    try {
      const created = await createNewAppointment({ draft: quickDraft, createAppointment: createCita });
      setCitas((current) => sortAppointments(citasVisiblesEnAgenda(appendCreatedAppointment(current, created))));
      setQuickDraft(null);
      setMessage(`Nueva cita creada correctamente · ${created.paciente ? nombrePaciente(created.paciente) : quickDraft.pacienteNombre} - ${formatDate(created.fecha)} a las ${String(created.hora_inicio).slice(0, 5)}`);
    } catch (err) {
      setQuickError(err.message);
    } finally {
      quickSaveInFlight.current = false;
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const validationErrors = validate();
    setFormErrors(validationErrors);
    setError('');
    if (Object.keys(validationErrors).length) return;

    setSaving(true);
    try {
      const payload = cleanPayload(form);
      if (!editing) {
        delete payload.estado;
        delete payload.profesional_id;
        delete payload.usuario_id;
      }
      const savedCita = editing ? await updateCita(editing, payload) : await createCita(payload);
      setCitas((current) => citasVisiblesEnAgenda(
        editing
          ? current.map((item) => Number(item.id) === Number(savedCita.id) ? savedCita : item)
          : [savedCita, ...current]
      ));
      resetForm();
      setShowFormModal(false);
      setMessage(editing ? 'Cita actualizada correctamente.' : 'Cita guardada correctamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
    if (view === 'mes') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1, 12));
      return;
    }
    setCursor(addDays(cursor, (view === 'dia' ? 1 : 7) * direction));
  };

  const title = view === 'mes'
    ? cursor.toLocaleDateString('es-BO', { timeZone: BOLIVIA_TIME_ZONE, month: 'long', year: 'numeric' })
    : view === 'dia'
      ? formatDate(toISODate(visibleDays[0]))
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
        <div className="panel overflow-hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-lg font-bold text-ink">Calendario de citas</h3><p className="text-sm text-slate-500">Arrastra una cita para usarla como referencia y crear otra. La original no se mueve.</p></div>
            <Button onClick={openNuevaCita}><Plus size={17} />Nueva cita</Button>
          </div>
          <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            <Input compact label="Paciente" value={filters.paciente} onChange={(event) => setFilters({ ...filters, paciente: event.target.value })} />
            <Input compact label="Fecha" type="date" value={filters.fecha} onChange={(event) => setFilters({ ...filters, fecha: event.target.value })} />
            <Input compact label="Estado" options={[{ value: '', label: 'Todos' }, ...ESTADOS.map((estado) => ({ value: estado, label: estado }))]} value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })} />
            <Input compact label="Atención" options={[{ value: '', label: 'Todos' }, ...TIPOS.map((tipo) => ({ value: tipo, label: tipo }))]} value={filters.tipo_atencion} onChange={(event) => setFilters({ ...filters, tipo_atencion: event.target.value })} />
            <Input compact label="Profesional" options={[{ value: '', label: 'Todos' }, ...profesionales.map((item) => ({ value: item.usuario_id, label: item.nombre_mostrado || [item.nombres, item.apellido_paterno].filter(Boolean).join(' ') }))]} value={filters.profesional_id} onChange={(event) => setFilters({ ...filters, profesional_id: event.target.value })} />
          </div>
          <CalendarHeader view={view} title={title} onView={setView} onMove={moveCalendar} onToday={() => setCursor(new Date(`${boliviaDate()}T12:00:00-04:00`))} />
          {view === 'mes'
            ? <MonthView days={visibleDays} cursor={cursor} appointmentsByDate={citasPorFecha} onOpen={openCalendarAppointment} onPointerDrag={startAppointmentDrag} onEmptyDay={(destination) => openQuickDraft(emptySlotDraft(destination))} />
            : <TimeGridView days={visibleDays} appointmentsByDate={citasPorFecha} onOpen={openCalendarAppointment} onPointerDrag={startAppointmentDrag} onEmptySlot={(destination) => openQuickDraft(emptySlotDraft(destination))} />}
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
        <ListadoCitasAgrupado
          groups={groupedPatients}
          expanded={expandedPatients}
          onToggle={togglePatient}
          isAdmin={isAdmin}
          onView={(cita) => setSelected(cita)}
          onEdit={editCita}
          onCancel={(cita) => cambiarEstado(cita, 'Cancelada')}
          onDelete={(cita) => deleteCita(cita.id).then(load)}
          onPatient={(patientId) => navigate(`/pacientes/${patientId}`)}
          onNewAppointment={openNuevaCitaPaciente}
          onClearFilters={clearFilters}
        />
      </div>
      )}

      <Modal open={showFormModal} title={<span className="inline-flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><CalendarClock size={19} /></span>{editing ? 'Editar cita' : 'Nueva cita'}</span>} subtitle={editing ? 'Actualiza la información de la atención' : 'Programa una atención para el paciente'} onClose={closeFormModal} size="compact">
        <CitaForm form={form} setForm={setForm} pacientes={pacientes} onSubmit={submit} onCancel={closeFormModal} editing={editing} error={error} errors={formErrors} registeredBy={user?.nombre || user?.usuario} saving={saving} />
      </Modal>

      <QuickCreateAppointmentModal
        draft={quickDraft}
        setDraft={setQuickDraft}
        patients={pacientes}
        professionalName={user?.nombre || user?.usuario}
        saving={saving}
        error={quickError}
        onCancel={() => { setQuickDraft(null); setQuickError(''); }}
        onCreate={createQuickAppointment}
      />

      <DragAppointmentOverlay drag={dragOverlay} />

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
                {selected.sesion_clinica && <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 md:col-span-2"><span className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Sesión vinculada</span><p className="mt-2 text-sm font-bold text-ink">Sesión {selected.numero_sesion || selected.sesion_clinica.numero_sesion}{selected.total_sesiones ? ` de ${selected.total_sesiones}` : ''} · {selected.sesion_clinica.asistencia === 'asistio' ? 'Realizada' : 'No asistió'}</p></section>}
              </div>
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-4">
              {location.state?.returnTo && <Button variant="secondary" onClick={() => navigate(location.state.returnTo, { state: { resumenState: location.state.resumenState } })}><ChevronLeft size={17} />Volver al resumen</Button>}
              <div className="ml-auto flex flex-wrap gap-2">
                {selected.sesion_clinica?.id && <Button variant="secondary" onClick={() => { setSelected(null); navigate('/sesiones', { state: { verSesionId: selected.sesion_clinica.id } }); }}><Eye size={17} />Ver sesión</Button>}
                {selected.origen === 'Plan de tratamiento' && ['Programada', 'Confirmada'].includes(selected.estado) && selected.sesion_clinica?.asistencia !== 'asistio' && <Button onClick={() => navigate('/sesiones', { state: { programacion: selected } })}><CalendarClock size={17} />Registrar sesión</Button>}
                {!['Atendida', 'Cancelada'].includes(selected.estado) && selected.sesion_clinica?.asistencia !== 'asistio' && <Button variant="secondary" onClick={() => editCita(selected)}><FilePenLine size={17} />{selected.origen === 'Plan de tratamiento' ? 'Reprogramar' : 'Editar cita'}</Button>}
                {!['Atendida', 'Cancelada'].includes(selected.estado) && selected.sesion_clinica?.asistencia !== 'asistio' && <Button variant="danger" disabled={saving} onClick={() => cambiarEstado(selected, 'Cancelada', { closeDetail: true })}><XCircle size={17} />{saving ? 'Cancelando...' : 'Cancelar cita'}</Button>}
              </div>
            </footer>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Citas;

