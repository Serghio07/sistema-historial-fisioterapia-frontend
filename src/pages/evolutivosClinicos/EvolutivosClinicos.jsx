import { zodResolver } from '@hookform/resolvers/zod';
import {
  Activity, ArrowLeft, Ban, CalendarDays, ChevronDown, ClipboardList, Eye, FilePenLine,
  FileText, Filter, Hash, MessageCircle, MoreHorizontal, Plus, Printer,
  Stethoscope, TrendingUp, UserRound, Users
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { z } from 'zod';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { Avatar } from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { getHistoriasClinicas, updateHistoriaClinica } from '../../services/historiaClinicaService';
import { getSesiones } from '../../services/sesionService';
import { formatDate } from '../../utils/formatDate';
import { formatPatientDocument, nombrePaciente, patientDocumentSearchText } from '../../utils/validators';
import { matchesSearch } from '../../utils/search';
import { boliviaDate } from '../../utils/boliviaDateTime';

const schema = z.object({
  paciente: z.string().min(1, 'Selecciona un paciente.'),
  historia: z.string().min(1, 'Selecciona una historia clínica.'),
  fecha: z.string().min(1, 'La fecha es obligatoria.'),
  numero: z.coerce.number().min(1, 'El número de sesión es obligatorio.'),
  dolor: z.coerce.number().min(0, 'El dolor mínimo es 0.').max(10, 'El dolor máximo es 10.'),
  descripcion: z.string().trim().min(1, 'La descripción de la evolución es obligatoria.'),
  observaciones: z.string().optional(),
  profesional: z.string().trim().min(1, 'El profesional responsable es obligatorio.')
});

const hoy = () => boliviaDate();
const evolutivosDe = (historia, incluirAnulados = false) => (Array.isArray(historia?.evolutivo) ? historia.evolutivo : [])
  .filter((item) => item.sesion_id && (incluirAnulados || item.estado !== 'anulado'))
  .sort((a, b) => String(b.fecha_sesion || b.fecha || '').localeCompare(String(a.fecha_sesion || a.fecha || '')) || Number(b.numero_sesion || b.numero || 0) - Number(a.numero_sesion || a.numero || 0));
const fechaEvolutivo = (item) => item.fecha_sesion || item.fecha || '';
const numeroEvolutivo = (item) => Number(item.numero_sesion || item.numero || 0);
const descripcionEvolutivo = (item) => item.procedimiento_realizado || item.aplicacion || item.descripcion || '';
const dolorEvolutivo = (item) => item.dolor_final ?? item.dolor_inicial ?? item.nivel_dolor ?? '';
const profesionalEvolutivo = (item, historia) => item.profesional_responsable || item.profesional || historia.profesional_cargo || 'Sin registrar';
const historiaNombre = (historia, index) => `Historia clínica ${index + 1}`;

const evolutivosDesdeSesiones = (historia, sesiones, incluirAnulados = false) => sesiones
  .filter((sesion) => String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(historia.id))
  .filter((sesion) => sesion.asistencia === 'asistio' && (incluirAnulados || !sesion.anulada))
  .map((sesion) => {
    const guardados = Array.isArray(historia.evolutivo) ? historia.evolutivo : [];
    const guardado = guardados
      .filter((item) => String(item.sesion_id || '') === String(sesion.id))
      .sort((a, b) => String(b.fecha_actualizacion || b.fecha_creacion || '').localeCompare(String(a.fecha_actualizacion || a.fecha_creacion || '')))[0] || {};
    const procedimiento = sesion.descripcion_tratamiento
      || [sesion.medios_fisicos, sesion.tecnicas_manuales].filter(Boolean).join(' · ')
      || guardado.procedimiento_realizado || guardado.aplicacion || '';
    const inyectables = [sesion.inyectable_nombre, sesion.inyectable_dosis].filter(Boolean).join(' · ') || guardado.inyectables || '';
    return {
      ...guardado,
      id: guardado.id || `sesion-${sesion.id}`,
      sesion_id: sesion.id,
      numero_sesion: sesion.numero_sesion,
      fecha_sesion: sesion.fecha,
      procedimiento_realizado: procedimiento,
      observaciones: sesion.evolucion_observada || sesion.observacion || guardado.observaciones || '',
      dolor_inicial: sesion.dolor_antes ?? guardado.dolor_inicial,
      dolor_final: sesion.dolor_despues ?? guardado.dolor_final,
      inyectables,
      profesional_responsable: sesion.profesional_responsable || guardado.profesional_responsable,
      estado: sesion.anulada ? 'anulado' : 'activo'
    };
  })
  .sort((a, b) => String(fechaEvolutivo(b)).localeCompare(String(fechaEvolutivo(a))) || numeroEvolutivo(b) - numeroEvolutivo(a));

function Field({ label, error, className = '', children }) {
  return <label className={`grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-600 ${className}`}>{label}{children}{error && <span className="text-[11px] font-semibold normal-case tracking-normal text-red-600">{error.message}</span>}</label>;
}

function Pain({ value }) {
  const number = Number(value);
  const tone = number >= 7 ? 'bg-red-50 text-red-700 ring-red-100' : number >= 4 ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-teal-50 text-teal-700 ring-teal-100';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>{value === '' || value == null ? 'Sin dato' : `${value}/10`}</span>;
}

function PainEvolutionChart({ items }) {
  const records = [...items].sort((a, b) => numeroEvolutivo(a) - numeroEvolutivo(b)).slice(-10);
  const width = 720;
  const height = 145;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 30;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const points = records.map((item, index) => ({
    x: left + (records.length === 1 ? chartWidth / 2 : (index / (records.length - 1)) * chartWidth),
    y: top + chartHeight - (Number(dolorEvolutivo(item) || 0) / 10) * chartHeight,
    value: Number(dolorEvolutivo(item) || 0),
    session: numeroEvolutivo(item)
  }));
  const path = points.map((point) => `${point.x},${point.y}`).join(' ');

  return <div className="rounded-xl border border-slate-200 bg-white p-3">
    <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700"><TrendingUp size={19} className="text-teal-600" />Evolución del dolor</h3>
    {points.length ? <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Gráfica de evolución del dolor por sesión">
      {[0, 2.5, 5, 7.5, 10].map((value) => { const y = top + chartHeight - (value / 10) * chartHeight; return <g key={value}><line x1={left} y1={y} x2={width - right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" /><text x={left - 10} y={y + 4} textAnchor="end" fontSize="9" fill="#64748b">{value}</text></g>; })}
      <polyline points={path} fill="none" stroke="#0891b2" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((point) => <g key={`${point.session}-${point.x}`}><circle cx={point.x} cy={point.y} r="5" fill="#0f766e" /><text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f4660">{point.value}/10</text><text x={point.x} y={height - 12} textAnchor="middle" fontSize="9" fill="#64748b">Sesión {point.session}</text></g>)}
    </svg> : <p className="py-8 text-center text-sm text-slate-500">Sin registros de dolor.</p>}
  </div>;
}

function EvolutivoForm({ historias, user, initial, onClose, onSaved }) {
  const profesional = user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || '';
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { paciente: '', historia: '', fecha: hoy(), numero: 1, dolor: 0, descripcion: '', observaciones: '', profesional }
  });
  const pacienteSeleccionado = watch('paciente');
  const historiaSeleccionada = watch('historia');
  const pacientes = useMemo(() => {
    const map = new Map();
    historias.filter((h) => h.estado === 'activa').forEach((h) => map.set(String(h.paciente_id || h.paciente?.id), h.paciente));
    return [...map.entries()];
  }, [historias]);
  const disponibles = useMemo(() => historias.filter((h) => h.estado === 'activa' && String(h.paciente_id || h.paciente?.id) === String(pacienteSeleccionado)), [historias, pacienteSeleccionado]);

  useEffect(() => {
    if (!initial) return;
    const evolutivo = initial.evolutivo;
    reset({
      paciente: String(initial.historia.paciente_id || initial.historia.paciente?.id), historia: String(initial.historia.id),
      fecha: evolutivo ? fechaEvolutivo(evolutivo) : hoy(), numero: evolutivo ? numeroEvolutivo(evolutivo) : evolutivosDe(initial.historia).length + 1,
      dolor: evolutivo ? dolorEvolutivo(evolutivo) : 0, descripcion: evolutivo ? descripcionEvolutivo(evolutivo) : '',
      observaciones: evolutivo?.observaciones || '', profesional: evolutivo ? profesionalEvolutivo(evolutivo, initial.historia) : profesional
    });
  }, [initial, reset]);

  useEffect(() => {
    if (initial) return;
    if (disponibles.length === 1) setValue('historia', String(disponibles[0].id), { shouldValidate: true });
    else if (!disponibles.some((h) => String(h.id) === String(historiaSeleccionada))) setValue('historia', '');
  }, [disponibles, initial]);

  useEffect(() => {
    if (initial) return;
    const historia = historias.find((h) => String(h.id) === String(historiaSeleccionada));
    if (historia) setValue('numero', evolutivosDe(historia).length + 1, { shouldValidate: true });
  }, [historiaSeleccionada, historias, initial]);

  const save = async (data) => {
    const historia = historias.find((h) => String(h.id) === String(data.historia));
    if (!historia) return;
    const anteriores = Array.isArray(historia.evolutivo) ? historia.evolutivo : [];
    const payload = {
      ...(initial?.evolutivo || {}), numero_sesion: Number(data.numero), fecha_sesion: data.fecha,
      dolor_final: Number(data.dolor), procedimiento_realizado: data.descripcion.trim().toLocaleUpperCase('es-BO'),
      observaciones: data.observaciones?.trim().toLocaleUpperCase('es-BO') || '', profesional_responsable: data.profesional.trim(), estado: 'activo'
    };
    const next = initial
      ? anteriores.map((item) => item.id === initial.evolutivo.id ? payload : item)
      : [...anteriores, payload];
    await updateHistoriaClinica(historia.id, { evolutivo: next });
    await Swal.fire({ icon: 'success', title: initial ? 'Evolución actualizado correctamente' : 'Evolución registrado correctamente', confirmButtonColor: '#0F766E' });
    onSaved();
  };

  const control = 'rounded-lg border-[#CBD5E1] bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-brand-500 focus:ring-brand-500/20';
  return <form onSubmit={handleSubmit(save)} className="grid gap-4">
    <div className="grid gap-3 sm:grid-cols-2">
        <div><input type="hidden" {...register('paciente')} /><Input label="Paciente" disabled={Boolean(initial)} value={pacienteSeleccionado} onChange={(event) => setValue('paciente', String(event.target.value), { shouldValidate: true, shouldDirty: true })} options={[{ value: '', label: 'Seleccionar paciente' }, ...pacientes.map(([id, p]) => ({ value: id, label: `${nombrePaciente(p)} · ${formatPatientDocument(p)}` }))]} error={errors.paciente?.message} /></div>
      <Field label="Historia clínica" error={errors.historia}><select className={control} disabled={!pacienteSeleccionado || Boolean(initial)} {...register('historia')}><option value="">Seleccionar historia activa</option>{disponibles.map((h, index) => <option key={h.id} value={h.id}>{historiaNombre(h, index)} · {h.diagnostico_medico || h.motivo_consulta || formatDate(h.fecha_evaluacion)}</option>)}</select></Field>
      <Field label="Fecha" error={errors.fecha}><input type="date" className={control} {...register('fecha')} /></Field>
      <Field label="Número de sesión" error={errors.numero}><input type="number" min="1" className={control} {...register('numero')} /></Field>
      <Field label="Nivel de dolor (0–10)" error={errors.dolor}><input type="number" min="0" max="10" className={control} {...register('dolor')} /></Field>
      <Field label="Profesional responsable" error={errors.profesional}><input className={control} {...register('profesional')} /></Field>
      <Field label="Descripción de la evolución" error={errors.descripcion} className="sm:col-span-2"><textarea rows="4" className={control} placeholder="Describa la evolución clínica observada" {...register('descripcion')} /></Field>
      <Field label="Observaciones" error={errors.observaciones} className="sm:col-span-2"><textarea rows="3" className={control} {...register('observaciones')} /></Field>
    </div>
    <div className="flex justify-end gap-2 border-t border-slate-200 pt-3"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{initial ? 'Actualizar evolución' : 'Guardar evolución'}</Button></div>
  </form>;
}

export default function EvolutivosClinicos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [historias, setHistorias] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ from: '', to: '', paciente: '', profesional: '', historia: '', estado: 'activo' });
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [expandedStories, setExpandedStories] = useState({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [menu, setMenu] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [linkedOpened, setLinkedOpened] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [historiasData, sesionesData] = await Promise.all([getHistoriasClinicas(), getSesiones({ incluirAnuladas: true })]);
      setHistorias(historiasData);
      setSesiones(sesionesData);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const sesionId = location.state?.sesionId;
    if (!sesionId || linkedOpened || !historias.length || !sesiones.length) return;
    const historia = historias.find((item) => String(item.id) === String(location.state?.historiaId)
      || evolutivosDesdeSesiones(item, sesiones, true).some((evolutivo) => String(evolutivo.sesion_id) === String(sesionId)));
    const evolutivo = historia && evolutivosDesdeSesiones(historia, sesiones, true)
      .find((item) => String(item.sesion_id) === String(sesionId));
    if (!historia || !evolutivo) return;
    setExpandedPatient(String(historia.paciente_id || historia.paciente?.id));
    setExpandedStories((current) => ({ ...current, [historia.id]: true }));
    setSelected({ historia, evolutivo });
    setLinkedOpened(true);
  }, [historias, sesiones, location.state, linkedOpened]);

  const evolutivosReales = (historia, incluirAnulados = false) => evolutivosDesdeSesiones(historia, sesiones, incluirAnulados);
  const professionals = useMemo(() => [...new Set(historias.flatMap((h) => evolutivosDesdeSesiones(h, sesiones, true).map((e) => profesionalEvolutivo(e, h))).filter(Boolean))].sort(), [historias, sesiones]);
  const patients = useMemo(() => {
    const map = new Map();
    historias.forEach((historia) => {
      const paciente = historia.paciente;
      const patientId = String(historia.paciente_id || paciente?.id);
      const items = evolutivosReales(historia, filters.estado === 'todos' || filters.estado === 'anulado').filter((e) => {
        const date = fechaEvolutivo(e);
        const searchable = `${nombrePaciente(paciente)} ${patientDocumentSearchText(paciente)} ${historia.diagnostico_medico || ''} ${profesionalEvolutivo(e, historia)} ${descripcionEvolutivo(e)}`;
        return matchesSearch(searchable, query) && (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to)
          && (!filters.profesional || profesionalEvolutivo(e, historia) === filters.profesional)
          && (!filters.estado || filters.estado === 'todos' || (filters.estado === 'anulado' ? e.estado === 'anulado' : e.estado !== 'anulado'));
      });
      const matchesPatient = !filters.paciente || patientId === filters.paciente;
      const matchesHistory = !filters.historia || String(historia.id) === filters.historia;
      if (!matchesPatient || !matchesHistory || !items.length) return;
      if (!map.has(patientId)) map.set(patientId, { id: patientId, paciente, historias: [] });
      map.get(patientId).historias.push({ ...historia, evolutivosFiltrados: items });
    });
    return [...map.values()].map((group) => {
      if (!filters.historia && filters.estado !== 'anulado') {
        historias
          .filter((historia) => String(historia.paciente_id || historia.paciente?.id) === group.id && !group.historias.some((item) => String(item.id) === String(historia.id)))
          .forEach((historia) => group.historias.push({ ...historia, evolutivosFiltrados: [] }));
      }
      const all = group.historias.flatMap((h) => h.evolutivosFiltrados.map((e) => ({ evolutivo: e, historia: h }))).sort((a, b) => String(fechaEvolutivo(b.evolutivo)).localeCompare(String(fechaEvolutivo(a.evolutivo))));
      return { ...group, total: all.length, latest: all[0] };
    });
  }, [historias, sesiones, query, filters]);
  useEffect(() => { setPage(1); }, [query, filters, pageSize]);
  const visible = patients.slice((page - 1) * pageSize, page * pageSize);
  const totalEvolutivos = historias.reduce((sum, h) => sum + evolutivosReales(h).length, 0);

  const openNew = () => navigate('/sesiones');
  const edit = (_historia, evolutivo) => {
    setMenu(null);
    navigate('/sesiones', { state: { editarSesionId: evolutivo.sesion_id } });
  };
  const annul = async (historia, evolutivo) => {
    setMenu(null);
    const result = await Swal.fire({ icon: 'warning', title: '¿Anular evolución?', text: `${formatDate(fechaEvolutivo(evolutivo))} · Sesión ${numeroEvolutivo(evolutivo)}. La evolución dejará de mostrarse como activa, pero permanecerá en el historial clínico.`, showCancelButton: true, reverseButtons: true, confirmButtonText: 'Anular evolución', cancelButtonText: 'Cancelar', confirmButtonColor: '#DC2626', cancelButtonColor: '#64748B' });
    if (!result.isConfirmed) return;
    await updateHistoriaClinica(historia.id, { evolutivo: historia.evolutivo.map((item) => item.id === evolutivo.id ? { ...item, estado: 'anulado', fecha_anulacion: new Date().toISOString() } : item) });
    await load();
    await Swal.fire({ icon: 'success', title: 'Evolución anulado correctamente', confirmButtonColor: '#0F766E' });
  };

  const togglePatient = (id) => { setExpandedPatient((current) => current === id ? null : id); setMenu(null); };
  const toggleStory = (id) => setExpandedStories((current) => ({ ...current, [id]: !current[id] }));
  const closeForm = () => { setFormOpen(false); setEditing(null); };
  const saved = async () => { closeForm(); await load(); };

  return <section className="evolutivos-clinicos grid gap-5">
    {loading && <Loader />}
    <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm"><div className="module-hero"><div><p className="text-sm font-bold text-brand-700">Gestión clínica</p><h1 className="mt-1 text-2xl font-bold md:text-3xl">Evoluciones clínicas</h1><p className="mt-2 text-sm text-slate-500">Seguimiento de la evolución clínica de los pacientes</p></div><div className="flex flex-wrap items-center justify-end gap-3"><div className="rounded-xl border border-brand-100 bg-white/60 px-4 py-2 text-center"><strong className="block text-xl text-brand-700">{patients.length}</strong><span className="text-[10px] font-bold uppercase text-slate-500">Pacientes</span></div><div className="rounded-xl border border-brand-100 bg-white/60 px-4 py-2 text-center"><strong className="block text-xl text-brand-700">{totalEvolutivos}</strong><span className="text-[10px] font-bold uppercase text-slate-500">Evoluciones</span></div><Button onClick={() => openNew()}><Plus size={17} />Nueva evolución</Button></div></div></div>

    <div className="panel rounded-2xl">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]"><div className="relative"><Activity size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por paciente, CI, diagnóstico, profesional o contenido de la evolución" className="w-full rounded-lg border-[#CBD5E1] bg-white py-2.5 pl-11 pr-3 text-sm focus:border-brand-500 focus:ring-brand-500/20" /></div><Button variant="secondary" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={17} />Filtros avanzados</Button></div>
      {filtersOpen && <div className="mt-3 grid gap-3 rounded-xl border border-brand-100 bg-brand-50/30 p-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Fecha desde"><input type="date" className="rounded-lg border-slate-200 px-3 py-2 text-sm" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></Field><Field label="Fecha hasta"><input type="date" className="rounded-lg border-slate-200 px-3 py-2 text-sm" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></Field><Field label="Paciente"><select className="rounded-lg border-slate-200 px-3 py-2 text-sm" value={filters.paciente} onChange={(e) => setFilters({ ...filters, paciente: e.target.value })}><option value="">Todos</option>{[...new Map(historias.map((h) => [String(h.paciente_id || h.paciente?.id), h.paciente])).entries()].map(([id, p]) => <option key={id} value={id}>{nombrePaciente(p)}</option>)}</select></Field><Field label="Profesional"><select className="rounded-lg border-slate-200 px-3 py-2 text-sm" value={filters.profesional} onChange={(e) => setFilters({ ...filters, profesional: e.target.value })}><option value="">Todos</option>{professionals.map((p) => <option key={p}>{p}</option>)}</select></Field><Field label="Historia clínica"><select className="rounded-lg border-slate-200 px-3 py-2 text-sm" value={filters.historia} onChange={(e) => setFilters({ ...filters, historia: e.target.value })}><option value="">Todas</option>{historias.map((h) => <option key={h.id} value={h.id}>{nombrePaciente(h.paciente)} · {h.diagnostico_medico || formatDate(h.fecha_evaluacion)}</option>)}</select></Field><Field label="Estado"><select className="rounded-lg border-slate-200 px-3 py-2 text-sm" value={filters.estado} onChange={(e) => setFilters({ ...filters, estado: e.target.value })}><option value="activo">Activos</option><option value="anulado">Anulados</option><option value="todos">Todos</option></select></Field><div className="sm:col-span-2 lg:col-span-3"><Button variant="secondary" onClick={() => setFilters({ from: '', to: '', paciente: '', profesional: '', historia: '', estado: 'activo' })}>Limpiar filtros</Button></div></div>}
      <p className="my-4 text-xs font-semibold text-slate-500">Mostrando {patients.length} pacientes</p>
      <div className="hidden grid-cols-[minmax(230px,1.35fr)_100px_90px_155px_minmax(150px,.8fr)_28px] gap-3 rounded-t-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase text-slate-500 md:grid"><span>Paciente</span><span>Historias clínicas</span><span>Evoluciones</span><span>Última evolución</span><span>Profesional</span><span /></div>
      <div className="divide-y divide-slate-200 rounded-b-xl border border-t-0 border-slate-200">{visible.map((group) => {
        const expanded = expandedPatient === group.id; const last = group.latest;
        return <article key={group.id} className={`border transition-all duration-300 ${expanded ? 'border-teal-200 border-l-4 border-l-teal-500 bg-teal-50/50' : 'border-transparent bg-white hover:bg-teal-50/20'}`}>
          <div role="button" tabIndex={0} onClick={() => togglePatient(group.id)} onKeyDown={(e) => ['Enter', ' '].includes(e.key) && togglePatient(group.id)} className="grid cursor-pointer items-center gap-3 px-4 py-3.5 md:grid-cols-[minmax(230px,1.35fr)_100px_90px_155px_minmax(150px,.8fr)_28px]">
            <span className="flex min-w-0 items-center gap-3"><Avatar src={group.paciente?.foto} name={nombrePaciente(group.paciente)} size="md" /><span className="min-w-0"><strong className={`block truncate text-sm font-bold uppercase ${expanded ? 'text-teal-900' : 'text-slate-900'}`}>{nombrePaciente(group.paciente)}</strong><small className="text-xs text-slate-500">{formatPatientDocument(group.paciente)}</small></span></span>
            <span className="flex items-center gap-2"><ClipboardList size={15} className="text-teal-600" /><span><strong className="block text-xs text-slate-800">{group.historias.length}</strong><small className="text-[10px] text-slate-500">{group.historias.length === 1 ? 'historia' : 'historias'}</small></span></span>
            <span className="flex items-center gap-2"><FileText size={15} className="text-teal-600" /><span><strong className="block text-xs text-slate-800">{group.total}</strong><small className="text-[10px] text-slate-500">evoluciones</small></span></span>
            <span className="flex items-start gap-2"><CalendarDays size={15} className="mt-0.5 text-teal-600" /><span><strong className="block text-xs text-slate-800">{formatDate(fechaEvolutivo(last.evolutivo))}</strong><small className="text-[10px] text-slate-500">Sesión {numeroEvolutivo(last.evolutivo)}</small></span></span>
            <span className="flex min-w-0 items-start gap-2"><UserRound size={15} className="mt-0.5 shrink-0 text-teal-600" /><span className="min-w-0"><strong className="block truncate text-xs text-slate-800">{profesionalEvolutivo(last.evolutivo, last.historia)}</strong><small className="text-[10px] text-slate-500">Profesional responsable</small></span></span>
            <ChevronDown size={18} className={`text-teal-700 transition ${expanded ? 'rotate-180' : ''}`} />
          </div>
          <div className={`grid transition-[grid-template-rows] duration-300 ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden"><div className="grid gap-2 px-3 pb-3">{group.historias.map((historia, index) => { const open = expandedStories[historia.id] !== false; const items = historia.evolutivosFiltrados; const sesionesContratadas = Number(historia.evaluacion_final?.sesiones_contratadas || 0); return <section key={historia.id} className="overflow-hidden rounded-lg border border-teal-100 bg-white"><button type="button" onClick={() => toggleStory(historia.id)} className="flex w-full items-center justify-between gap-3 bg-teal-50/25 px-4 py-3 text-left"><span className="flex min-w-0 items-start gap-2.5"><ClipboardList size={16} className="mt-0.5 shrink-0 text-teal-600" /><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="text-xs font-bold text-teal-800">{historiaNombre(historia, index)}</strong><span className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-bold text-teal-700 ring-1 ring-teal-200">{sesionesContratadas} sesiones contratadas</span></span><small className="mt-1 block truncate text-[11px] text-slate-600">Diagnóstico: {historia.diagnostico_medico || historia.motivo_consulta || 'Sin diagnóstico'}</small></span></span><ChevronDown size={16} className={`shrink-0 text-teal-700 transition ${open ? 'rotate-180' : ''}`} /></button><div className={`grid transition-[grid-template-rows] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden">{items.length ? <><div className="hidden grid-cols-[105px_95px_minmax(230px,1fr)_80px_150px_145px] gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[9px] font-bold uppercase text-slate-500 lg:grid"><span>Fecha</span><span>Sesión</span><span>Evolución</span><span>Dolor</span><span>Profesional</span><span>Acciones</span></div>{items.map((e) => <div key={e.id || `${fechaEvolutivo(e)}-${numeroEvolutivo(e)}`} className="grid gap-2 border-t border-slate-100 px-4 py-3 text-[11px] lg:grid-cols-[105px_95px_minmax(230px,1fr)_80px_150px_145px] lg:items-center"><span>{formatDate(fechaEvolutivo(e))}</span><span className="font-medium">Sesión {numeroEvolutivo(e)} de {sesionesContratadas || '?'}</span><span className="leading-5 text-slate-700">{descripcionEvolutivo(e) || 'Sin descripción'}</span><Pain value={dolorEvolutivo(e)} /><span className="text-slate-600">{profesionalEvolutivo(e, historia)}</span><span className="flex gap-1"><button title="Ver detalle" onClick={() => setSelected({ historia, evolutivo: e })} className="grid h-8 w-8 place-items-center rounded-lg border border-teal-100 text-slate-600 hover:bg-teal-50"><Eye size={14} /></button><button title="Editar" onClick={() => edit(historia, e)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50"><FilePenLine size={14} /></button><button title="Imprimir" onClick={() => { setSelected({ historia, evolutivo: e }); setTimeout(() => window.print(), 100); }} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><Printer size={14} /></button><span className="relative"><button title="Más acciones" onClick={() => setMenu(menu === e.id ? null : e.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600"><MoreHorizontal size={14} /></button>{menu === e.id && <span className="absolute bottom-full right-0 z-20 mb-1 grid w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"><button className="menu-action text-red-600" onClick={() => annul(historia, e)}><Ban size={14} />Anular evolución</button><button className="menu-action" onClick={() => navigate(`/historias-clinicas/${historia.id}`)}><ClipboardList size={14} />Ver historia clínica</button><button className="menu-action" onClick={() => { setSelected({ historia, evolutivo: e }); setTimeout(() => window.print(), 100); }}><FileText size={14} />Exportar PDF</button><button className="menu-action" onClick={() => navigate(`/pacientes/${group.id}`)}><UserRound size={14} />Datos del paciente</button></span>}</span></span></div>)}</> : <div className="border-t border-slate-100 p-5 text-center"><p className="text-sm text-slate-500">Esta historia clínica todavía no tiene evoluciones registradas.</p>{historia.estado === 'activa' && <Button className="mt-3" onClick={() => openNew(historia)}>Registrar primera evolución</Button>}</div>}</div></div></section>; })}</div></div></div>
        </article>;
      })}{!visible.length && <p className="p-8 text-center text-sm text-slate-500">No hay evoluciones clínicas para mostrar.</p>}</div>
      <Pagination total={patients.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>

    <Modal open={formOpen} title={editing?.evolutivo ? 'Editar evolución' : 'Nueva evolución'} subtitle="Registre el seguimiento sin mezclar historias clínicas." onClose={closeForm} size="lg"><EvolutivoForm historias={historias} user={user} initial={editing} onClose={closeForm} onSaved={saved} /></Modal>
    <Modal open={Boolean(selected)} title="Detalle de la evolución" subtitle="Información clínica registrada en las sesiones del paciente" onClose={() => setSelected(null)} size="lg">
      {selected && (() => {
        const patient = selected.historia.paciente;
        const current = selected.evolutivo;
        const records = evolutivosReales(selected.historia);
        const recent = [...records].sort((a, b) => numeroEvolutivo(b) - numeroEvolutivo(a)).slice(0, 6);
        return <div className="grid max-h-[72vh] gap-3 overflow-y-auto pr-1">
          <button type="button" onClick={() => setSelected(null)} className="flex w-fit items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900"><ArrowLeft size={15} />Volver</button>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex min-w-0 items-center gap-4"><Avatar src={patient?.foto} name={nombrePaciente(patient)} size="lg" /><div className="min-w-0"><h2 className="truncate text-2xl font-black uppercase text-slate-900">{nombrePaciente(patient)}</h2><span className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{formatPatientDocument(patient)}</span></div></div>
            <div className="flex flex-wrap gap-2"><span className="detail-chip"><UserRound size={14} />Sesión {numeroEvolutivo(current)}</span><span className="detail-chip"><CalendarDays size={14} />{formatDate(fechaEvolutivo(current))}</span><span className="detail-chip"><Hash size={14} />Sesión {numeroEvolutivo(current)}</span></div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid gap-3">
              <div className="detail-clinical-card"><Stethoscope size={22} /><div><span>Diagnóstico</span><strong>{selected.historia.diagnostico_medico || selected.historia.motivo_consulta || 'Sin diagnóstico registrado'}</strong></div></div>
              <div className="detail-clinical-card"><Activity size={22} /><div className="w-full"><span>Dolor (EVA)</span><div className="mt-2 flex items-center gap-5"><strong className="pain-circle">{dolorEvolutivo(current) || 0}/10</strong><div className="grid gap-2 text-sm text-slate-600"><span><CalendarDays size={14} className="mr-2 inline" />{formatDate(fechaEvolutivo(current))}</span><span><Hash size={14} className="mr-2 inline" />Sesión N.º {numeroEvolutivo(current)}</span></div></div></div></div>
              <div className="detail-clinical-card"><ClipboardList size={22} /><div><span>Evolución</span><strong>{descripcionEvolutivo(current) || 'Sin procedimiento registrado'}</strong></div></div>
            </div>
            <div className="grid content-start gap-3">
              <div className="detail-clinical-card"><MessageCircle size={22} /><div><span>Observaciones</span><strong>{current.observaciones || 'Sin observaciones'}</strong></div></div>
              <div className="detail-clinical-card"><UserRound size={22} /><div><span>Profesional</span><strong>{profesionalEvolutivo(current, selected.historia)}</strong></div></div>
              <div className="detail-clinical-card"><TrendingUp size={22} /><div className="w-full"><span>Últimos registros</span><div className="mt-3 grid grid-cols-3 gap-2">{recent.map((item) => <span key={item.id} className="rounded-full bg-teal-50 px-3 py-1 text-center text-xs font-bold text-teal-700 ring-1 ring-teal-100">{dolorEvolutivo(item) ?? '-'}/10</span>)}</div></div></div>
            </div>
          </div>
          <PainEvolutionChart items={records} />
        </div>;
      })()}
    </Modal>
  </section>;
}
