import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays, ClipboardList, Download, Eye, FileSpreadsheet, FileText,
  History, Printer, Search, Stethoscope, UserRound, WalletCards
} from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Table from '../../components/common/Table';
import { Avatar, PatientIdentity } from '../../components/common/ProfilePhoto';
import { auditResumenPaciente, getPacientes, getResumenPaciente } from '../../services/pacienteService';
import { formatDate } from '../../utils/formatDate';
import { matchesSearch } from '../../utils/search';
import { nombrePaciente } from '../../utils/validators';
import { boliviaDate } from '../../utils/boliviaDateTime';
import { useAuth } from '../../context/AuthContext';
import { buildAttendanceSummary } from '../../utils/attendanceSummary';

const allTabs = ['Resumen', 'Sesiones', 'Asistencias', 'Pagos y deudas', 'Historias clínicas', 'Citas', 'Documentos'];
const money = (value) => `${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
const today = () => boliviaDate();
const activeMovement = (item) => item.estado !== 'Anulado';
const validSession = (item) => !item.anulada;
const attended = (item) => item.asistencia === 'asistio' && !item.anulada && String(item.estado || '').toLowerCase() !== 'anulada';
const absent = (item) => item.asistencia === 'no_asistio' && !item.anulada;
const historyName = (item) => item?.diagnostico_medico || item?.motivo_consulta || `Historia del ${formatDate(item?.fecha_evaluacion)}`;

const rangeFor = (period, from, to) => {
  const now = new Date(`${today()}T12:00:00`);
  const iso = (date) => boliviaDate(date);
  const startWeek = (date) => { const copy = new Date(date); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); return copy; };
  if (period === 'all') return ['', ''];
  if (period === 'custom') return [from, to];
  if (period === 'week') return [iso(startWeek(now)), today()];
  if (period === 'previous_week') { const end = startWeek(now); end.setDate(end.getDate() - 1); const start = new Date(end); start.setDate(start.getDate() - 6); return [iso(start), iso(end)]; }
  if (period === 'previous_month') { const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); return [iso(start), iso(new Date(now.getFullYear(), now.getMonth(), 0))]; }
  if (period === 'three_months') { const start = new Date(now); start.setMonth(start.getMonth() - 3); return [iso(start), today()]; }
  if (period === 'year') return [`${now.getFullYear()}-01-01`, today()];
  return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), today()];
};

function Metric({ title, value, detail, tone = 'slate' }) {
  const tones = { green: 'border-emerald-100 bg-emerald-50/60 text-emerald-800', amber: 'border-amber-100 bg-amber-50/60 text-amber-800', red: 'border-red-100 bg-red-50/60 text-red-800', slate: 'border-slate-200 bg-white text-slate-800' };
  return <article className={`rounded-xl border p-4 shadow-sm ${tones[tone]}`}><span className="text-[10px] font-black uppercase tracking-wide opacity-70">{title}</span><strong className="mt-1 block text-xl">{value}</strong><small className="mt-1 block opacity-75">{detail}</small></article>;
}

function Empty({ children }) {
  return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">{children}</p>;
}

export default function ResumenPacientes() {
  const { isAdmin } = useAuth();
  const tabs = isAdmin ? allTabs : allTabs.filter((item) => item !== 'Pagos y deudas');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const restored = location.state?.resumenState || JSON.parse(sessionStorage.getItem('resumen-paciente-state') || '{}');
  const [patients, setPatients] = useState([]);
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [patientId, setPatientId] = useState(searchParams.get('paciente') || restored.patientId || '');
  const [period, setPeriod] = useState(restored.period || 'month');
  const [from, setFrom] = useState(restored.from || '');
  const [to, setTo] = useState(restored.to || '');
  const [recordQuery, setRecordQuery] = useState(restored.recordQuery || '');
  const [historyId, setHistoryId] = useState(restored.historyId || 'active');
  const [tab, setTab] = useState(restored.tab || 'Resumen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin && tab === 'Pagos y deudas') setTab('Resumen');
  }, [isAdmin, tab]);

  useEffect(() => { getPacientes().then(setPatients).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (!patientId) { setData(null); return; }
    setLoading(true);
    setError('');
    getResumenPaciente(patientId).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
    setSearchParams({ paciente: patientId }, { replace: true });
  }, [patientId]);
  useEffect(() => {
    sessionStorage.setItem('resumen-paciente-state', JSON.stringify({ patientId, period, from, to, historyId, tab, recordQuery }));
  }, [patientId, period, from, to, historyId, tab, recordQuery]);

  const suggestions = useMemo(() => query.trim() ? patients.filter((p) => matchesSearch(`${nombrePaciente(p)} ${p.ci || ''} ${p.telefono || ''}`, query)).slice(0, 8) : [], [patients, query]);
  const [dateFrom, dateTo] = rangeFor(period, from, to);
  const inPeriod = (date) => (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
  const activeHistoryId = (data?.historias || []).find((item) => item.estado === 'activa' && !item.anulada)?.id;
  const selectedHistoryId = historyId === 'active' ? activeHistoryId : historyId;
  const sameHistory = (item) => !selectedHistoryId || String(item.historia_clinica_id || item.historia_clinica?.id || item.id) === String(selectedHistoryId);
  const sessions = useMemo(() => (data?.sesiones || []).filter((s) => validSession(s) && inPeriod(s.fecha) && sameHistory(s) && matchesSearch(`${s.fecha} ${s.numero_sesion || ''} ${s.asistencia || ''} ${s.estado_pago || ''} ${s.profesional_responsable || s.registrado_por?.nombre || ''} ${historyName(s.historia_clinica)} ${s.descripcion_tratamiento || ''} ${s.observacion || ''}`, recordQuery)), [data, dateFrom, dateTo, historyId, recordQuery]);
  const concepts = useMemo(() => (data?.conceptos || []).filter((c) => inPeriod(c.fecha_origen) && sameHistory(c) && matchesSearch(`${c.fecha_origen} ${c.detalle || ''} ${c.estado || ''} ${historyName(c.historia_clinica)} ${(c.movimientos || []).map((m) => `${m.metodo || ''} ${m.numero_recibo || ''}`).join(' ')}`, recordQuery)), [data, dateFrom, dateTo, historyId, recordQuery]);
  const citas = useMemo(() => (data?.citas || []).filter((c) => inPeriod(c.fecha) && sameHistory(c) && matchesSearch(`${c.fecha} ${c.motivo || ''} ${c.tipo_atencion || ''} ${c.estado || ''} ${c.registrado_por?.nombre || ''}`, recordQuery)), [data, dateFrom, dateTo, historyId, recordQuery]);
  const histories = useMemo(() => (data?.historias || []).filter((h) => !h.anulada && h.estado !== 'anulada'), [data]);
  const documents = useMemo(() => [
    ...(data?.documentos || []).filter((d) => inPeriod(d.fecha) && !d.eliminado).map((d) => ({ ...d, source: 'documento', typeLabel: ({ consentimiento: 'Consentimiento informado', signos_vitales: 'Signos vitales', farmacos: 'Administración de fármacos' }[d.tipo] || d.tipo) })),
    ...(data?.informes || []).filter((d) => inPeriod(d.fecha) && sameHistory(d)).map((d) => ({ ...d, source: 'informe', typeLabel: 'Informe médico' })),
    ...(data?.planillas || []).filter((d) => inPeriod(d.fecha_inicio) && sameHistory(d)).map((d) => ({ ...d, fecha: d.fecha_inicio, source: 'planilla', typeLabel: 'Planilla de atención' }))
  ].filter((d) => matchesSearch(`${d.fecha || ''} ${d.typeLabel || ''} ${d.titulo || ''} ${d.descripcion || ''} ${d.estado || ''} ${d.creado_por?.nombre || d.doctor || ''}`, recordQuery)).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))), [data, dateFrom, dateTo, historyId, recordQuery]);

  const allAttended = (data?.sesiones || []).filter((session) => validSession(session) && attended(session));
  const attendedRows = sessions.filter(attended);
  const absences = sessions.filter(absent);
  const attendanceSummary = useMemo(() => buildAttendanceSummary(sessions, citas), [sessions, citas]);
  const activeConcepts = concepts.filter((c) => c.activo !== false && c.estado !== 'Anulado');
  const movements = activeConcepts.flatMap((c) => (c.movimientos || [])
    .filter((movement) => activeMovement(movement) && inPeriod(movement.fecha))
    .map((movement) => ({ ...movement, concepto: c })));
  const paid = movements.reduce((sum, m) => sum + Number(m.monto || 0), 0);
  const total = activeConcepts.reduce((sum, c) => sum + Number(c.monto_esperado || 0), 0);
  const appliedToConcepts = activeConcepts.reduce((sum, concept) => (
    sum + (concept.movimientos || [])
      .filter(activeMovement)
      .reduce((movementSum, movement) => movementSum + Number(movement.monto || 0), 0)
  ), 0);
  const balance = Math.max(0, total - appliedToConcepts);
  const debtCount = activeConcepts.filter((c) => Number(c.monto_esperado || 0) > (c.movimientos || []).filter(activeMovement).reduce((s, m) => s + Number(m.monto || 0), 0)).length;
  const economic = isAdmin
    ? (balance <= 0 ? (total ? 'Pagado' : 'Sin deuda') : paid > 0 ? 'Parcial' : 'Pendiente')
    : 'Perfil clínico';
  const economicTone = economic === 'Pagado' ? 'green' : economic === 'Parcial' ? 'amber' : economic === 'Pendiente' ? 'red' : 'slate';
  const lastVisit = [...allAttended].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];
  const nextAppointment = (data?.citas || []).filter((c) => c.fecha >= today() && !['Cancelada', 'Atendida'].includes(c.estado)).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))[0];

  const stateForReturn = { resumenState: { patientId, period, from, to, historyId, tab, recordQuery } };
  const go = (path, state = {}) => navigate(path, { state: { ...state, ...stateForReturn, returnTo: `/resumen-pacientes?paciente=${patientId}` } });
  const historyById = (id) => histories.find((h) => String(h.id) === String(id));

  const exportExcel = async () => {
    await auditResumenPaciente(patientId, 'Excel');
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Resumen');
    sheet.addRows([
      ['RESUMEN DE PACIENTE'], ['Paciente', nombrePaciente(data.paciente)], ['Documento', data.paciente.ci || ''], ['Teléfono', data.paciente.telefono || ''],
      ['Periodo', `${dateFrom || 'Inicio'} al ${dateTo || 'Actualidad'}`], ['Visitas', attendedRows.length], ['Faltas', absences.length],
      ...(isAdmin ? [['Total facturado', total], ['Total pagado', paid], ['Saldo pendiente', balance], ['Estado económico', economic]] : [])
    ]);
    const sessionsSheet = workbook.addWorksheet('Sesiones');
    sessionsSheet.addRow(['Fecha', 'Historia', 'Sesión', 'Asistencia', 'Profesional', ...(isAdmin ? ['Estado de pago'] : [])]);
    sessions.forEach((s) => sessionsSheet.addRow([s.fecha, historyName(s.historia_clinica), s.numero_sesion, s.asistencia, s.profesional_responsable || s.registrado_por?.nombre, ...(isAdmin ? [s.estado_pago] : [])]));
    const blob = new Blob([await workbook.xlsx.writeBuffer()]);
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Resumen_${nombrePaciente(data.paciente).replaceAll(' ', '_')}.xlsx`; link.click(); URL.revokeObjectURL(link.href);
  };
  const printPdf = async () => { await auditResumenPaciente(patientId, 'PDF'); window.print(); };

  return <section className="grid gap-4">
    {loading && <Loader />}
    <div className="module-hero rounded-xl">
      <div><p className="text-sm font-bold text-brand-50">Consulta integral</p><h1 className="mt-1 text-2xl font-black">Resumen de Pacientes</h1><p className="mt-2 text-sm text-brand-50">{isAdmin ? 'Información clínica, asistencial y económica en una sola pantalla.' : 'Información clínica y asistencial del paciente.'}</p></div>
      {data && <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={exportExcel}><FileSpreadsheet size={16} />Excel</Button><Button variant="secondary" onClick={printPdf}><Printer size={16} />Imprimir / PDF</Button></div>}
    </div>

    <div className="panel relative">
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-brand-500"><Search size={19} className="text-slate-400" /><input className="w-full border-0 p-0 text-sm focus:ring-0" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, apellido, documento o teléfono..." /></label>
      {suggestions.length > 0 && <div className="absolute left-4 right-4 z-30 mt-1 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{suggestions.map((p) => <button key={p.id} className="flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left hover:bg-teal-50" onClick={() => { setPatientId(String(p.id)); setQuery(''); setHistoryId('active'); setTab('Resumen'); }}><PatientIdentity paciente={p} secondary={`CI: ${p.ci || 'Sin dato'} · Tel: ${p.telefono || 'Sin dato'}`} /><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${p.estado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.estado ? 'ACTIVO' : 'INACTIVO'}</span></button>)}</div>}
    </div>

    {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!data && !loading && <Empty>Busca y selecciona un paciente para visualizar su resumen clínico{isAdmin ? ' y económico' : ''}.</Empty>}

    {data && <>
      <div className="panel grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 items-center gap-4"><Avatar src={data.paciente.foto} name={nombrePaciente(data.paciente)} size="lg" className="rounded-full" /><div className="min-w-0"><h2 className="truncate text-xl font-black uppercase text-slate-900">{nombrePaciente(data.paciente)}</h2><p className="mt-1 text-sm text-slate-500">CI: {data.paciente.ci || 'Sin dato'} · Tel: {data.paciente.telefono || 'Sin dato'} · {data.paciente.edad ?? '—'} años · {data.paciente.sexo || 'Sin sexo'}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="detail-chip">Última visita: {formatDate(lastVisit?.fecha)}</span><span className="detail-chip">Próxima cita: {formatDate(nextAppointment?.fecha)}</span><span className="detail-chip">{histories.length} historias clínicas</span><span className={`rounded-full px-3 py-1 font-bold ${economicTone === 'green' ? 'bg-emerald-50 text-emerald-700' : economicTone === 'amber' ? 'bg-amber-50 text-amber-700' : economicTone === 'red' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{economic}</span></div></div></div>
        <div className="flex flex-wrap items-center gap-2"><Button variant="secondary" onClick={() => go(`/pacientes/${patientId}`)}><UserRound size={16} />Perfil</Button><Button variant="secondary" onClick={() => go('/sesiones', { pacienteId: patientId })}><Stethoscope size={16} />Sesiones</Button>{isAdmin && <Button onClick={() => go('/control-financiero/planilla-pagos', { pacienteId: patientId })}><WalletCards size={16} />Pagos y deudas</Button>}</div>
      </div>

      <div className="panel grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1 text-xs font-bold text-slate-600 xl:col-span-2">Buscar en los registros<span className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-500"><Search size={16} className="text-slate-400" /><input value={recordQuery} onChange={(e) => setRecordQuery(e.target.value)} className="w-full border-0 p-0 text-sm focus:ring-0" placeholder={isAdmin ? 'Sesión, profesional, pago, estado o documento...' : 'Sesión, profesional, estado o documento...'} /></span></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">Periodo<select value={period} onChange={(e) => { setPeriod(e.target.value); if (e.target.value !== 'custom') { setFrom(''); setTo(''); } }} className="rounded-lg border-slate-200 text-sm"><option value="week">Esta semana</option><option value="previous_week">Semana anterior</option><option value="month">Este mes</option><option value="previous_month">Mes anterior</option><option value="three_months">Últimos tres meses</option><option value="year">Este año</option><option value="all">Todo el historial</option><option value="custom">Rango personalizado</option></select></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">Desde<span className="relative"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input type="date" value={dateFrom} onChange={(e) => { setPeriod('custom'); setFrom(e.target.value); setTo(to || dateTo || today()); }} className="w-full rounded-lg border-slate-200 pl-9 text-sm" /></span></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">Hasta<span className="relative"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input type="date" min={dateFrom || undefined} value={dateTo} onChange={(e) => { setPeriod('custom'); setFrom(from || dateFrom); setTo(e.target.value); }} className="w-full rounded-lg border-slate-200 pl-9 text-sm" /></span></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600 xl:col-span-2">Historia clínica<select value={historyId} onChange={(e) => setHistoryId(e.target.value)} className="rounded-lg border-slate-200 text-sm"><option value="active">Historia activa</option><option value="">Todas las historias</option>{histories.map((h) => <option key={h.id} value={h.id}>{historyName(h)}</option>)}</select></label>
        <div className="flex items-end"><Button variant="secondary" onClick={() => { setRecordQuery(''); setPeriod('month'); setFrom(''); setTo(''); setHistoryId('active'); }}><Search size={15} />Limpiar filtros</Button></div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric title="Visitas" value={attendedRows.length} detail={`${allAttended.length} históricas · Última ${formatDate(lastVisit?.fecha)}`} tone="green" /><Metric title="Sesiones" value={attendedRows.length} detail={`${Math.max(0, histories.reduce((s, h) => s + Number(h.evaluacion_final?.sesiones_contratadas || 0), 0) - allAttended.length)} pendientes · ${absences.length} faltas`} />{isAdmin && <Metric title="Pagado" value={money(paid)} detail={`${movements.length} movimientos en el periodo`} tone="green" />}{isAdmin && <Metric title="Saldo pendiente" value={money(balance)} detail={`${debtCount} deudas activas · ${economic}`} tone={economicTone} />}</div>

      <div className="panel overflow-hidden p-0">
        <div className="flex overflow-x-auto border-b border-slate-200 p-2">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-lg px-4 py-2 text-xs font-black ${tab === item ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{item}</button>)}</div>
        <div className="p-4">
          {tab === 'Resumen' && <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border border-slate-200 p-4"><h3 className="font-black text-slate-800">Actividad clínica</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Visitas</dt><dd className="font-black">{attendedRows.length}</dd></div><div><dt className="text-slate-500">Faltas</dt><dd className="font-black">{absences.length}</dd></div><div><dt className="text-slate-500">Última atención</dt><dd className="font-black">{formatDate(lastVisit?.fecha)}</dd></div><div><dt className="text-slate-500">Próxima cita</dt><dd className="font-black">{formatDate(nextAppointment?.fecha)}</dd></div></dl></section>{isAdmin && <section className="rounded-xl border border-slate-200 p-4"><h3 className="font-black text-slate-800">Actividad económica</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Facturado</dt><dd className="font-black">{money(total)}</dd></div><div><dt className="text-slate-500">Pagado</dt><dd className="font-black text-emerald-700">{money(paid)}</dd></div><div><dt className="text-slate-500">Pendiente</dt><dd className="font-black text-red-700">{money(balance)}</dd></div><div><dt className="text-slate-500">Último método</dt><dd className="font-black">{movements[0]?.metodo || 'Sin pagos'}</dd></div></dl></section>}</div>}
          {tab === 'Sesiones' && <Table columns={['Fecha', 'Historia', 'Sesión', 'Asistencia', ...(isAdmin ? ['Pago'] : []), 'Profesional', 'Acciones']} rows={sessions.map((s) => [formatDate(s.fecha), historyName(s.historia_clinica), `N.º ${s.numero_sesion || '-'}`, s.asistencia || 'Pendiente', ...(isAdmin ? [s.estado_pago || 'Pendiente'] : []), s.profesional_responsable || s.registrado_por?.nombre || 'Sin dato', <div className="flex gap-1"><ActionButton label="Ver sesión" icon={Eye} tone="view" onClick={() => go('/sesiones', { verSesionId: s.id })} />{s.historia_clinica_id && <ActionButton label="Ver historia" icon={ClipboardList} tone="edit" onClick={() => go(`/historias-clinicas/${s.historia_clinica_id}`)} />}</div>])} empty="No se encontraron sesiones para el periodo seleccionado." />}
          {tab === 'Asistencias' && <div className="grid gap-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><Metric title="Asistencias" value={attendanceSummary.attended.length} detail="Visitas realizadas" tone="green" /><Metric title="Faltas" value={attendanceSummary.missed.length} detail="No asistió o faltó" tone="red" /><Metric title="Reprogramadas" value={attendanceSummary.rescheduled.length} detail="Citas o sesiones reprogramadas" tone="amber" /><Metric title="Pendientes" value={attendanceSummary.pending.length} detail="Sesiones sin atención registrada" tone="amber" /><Metric title="% asistencia" value={`${attendanceSummary.attendancePercent}%`} detail="Sobre asistencias y faltas" /></div><div className="flex flex-wrap gap-2">{[...attendanceSummary.attended, ...attendanceSummary.missed, ...attendanceSummary.rescheduled, ...attendanceSummary.pending].sort((a, b) => String(b.date).localeCompare(String(a.date))).map((item) => <span key={item.id} className={`rounded-lg border px-3 py-2 text-xs font-bold ${item.status === 'asistio' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : ['no_asistio', 'falto'].includes(item.status) ? 'border-red-100 bg-red-50 text-red-700' : item.status.startsWith('reprogramad') ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{formatDate(item.date)} · {item.status.replaceAll('_', ' ')}</span>)}</div></div>}
          {isAdmin && tab === 'Pagos y deudas' && <Table columns={['Fecha', 'Concepto', 'Historia', 'Total', 'Pagado', 'Saldo', 'Estado', 'Acciones']} rows={activeConcepts.map((c) => { const cPaid = (c.movimientos || []).filter(activeMovement).reduce((s, m) => s + Number(m.monto || 0), 0); const cBalance = Math.max(0, Number(c.monto_esperado || 0) - cPaid); return [formatDate(c.fecha_origen), c.detalle, historyName(c.historia_clinica), money(c.monto_esperado), money(cPaid), money(cBalance), cBalance <= 0 ? 'Pagado' : cPaid ? 'Parcial' : 'Pendiente', <ActionButton label="Ver pago o deuda" icon={Eye} tone="view" onClick={() => go('/control-financiero/planilla-pagos', { conceptoCobroId: c.id })} />]; })} empty="No se encontraron pagos o deudas para el periodo seleccionado." />}
          {tab === 'Historias clínicas' && <div className="grid gap-3">{histories.map((h) => { const hs = (data.sesiones || []).filter((s) => String(s.historia_clinica_id) === String(h.id) && !s.anulada); const done = hs.filter(attended).length; const contracted = Number(h.evaluacion_final?.sesiones_contratadas || 0); return <article key={h.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-black uppercase text-brand-700">{h.estado}</span><h3 className="mt-1 font-black text-slate-900">{historyName(h)}</h3><p className="mt-1 text-xs text-slate-500">{formatDate(h.fecha_evaluacion)} · {done} realizadas · {Math.max(0, contracted - done)} pendientes de {contracted}</p></div><Button variant="secondary" onClick={() => go(`/historias-clinicas/${h.id}`)}><Eye size={15} />Ver historia</Button></div></article>; })}{!histories.length && <Empty>No existen historias clínicas disponibles.</Empty>}</div>}
          {tab === 'Citas' && <Table columns={['Fecha', 'Hora', 'Motivo', 'Estado', 'Profesional', 'Acciones']} rows={citas.map((c) => [formatDate(c.fecha), `${c.hora_inicio?.slice(0, 5) || '-'} - ${c.hora_fin?.slice(0, 5) || '-'}`, c.motivo || c.tipo_atencion || 'Sin motivo', c.estado, c.registrado_por?.nombre || 'Sin dato', <ActionButton label="Ver cita" icon={Eye} tone="view" onClick={() => go('/citas', { verCitaId: c.id })} />])} empty="No se encontraron citas para el periodo seleccionado." />}
          {tab === 'Documentos' && <Table columns={['Fecha', 'Tipo', 'Historia', 'Profesional', 'Estado', 'Acciones']} rows={documents.map((d) => [formatDate(d.fecha), d.typeLabel, historyName(historyById(d.historia_clinica_id) || d.historia_clinica), d.creado_por?.nombre || d.doctor || 'Sin dato', d.estado || 'Registrado', <ActionButton label="Ver documento" icon={Eye} tone="view" onClick={() => d.source === 'informe' ? go('/informes-medicos', { informeId: d.id }) : d.source === 'planilla' ? go('/planillas-atencion', { planillaId: d.id }) : go(`/documentos/${d.tipo === 'consentimiento' ? 'consentimiento-informado' : d.tipo === 'signos_vitales' ? 'signos-vitales' : 'administracion-farmacos'}`, { documentoId: d.id })} />])} empty="No se encontraron documentos para el periodo seleccionado." />}
        </div>
      </div>
    </>}
  </section>;
}
