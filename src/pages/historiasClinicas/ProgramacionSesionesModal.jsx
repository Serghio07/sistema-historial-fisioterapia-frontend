import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CalendarDays, CheckCircle2, IdCard, RefreshCw, RotateCcw, Save, Stethoscope, Trash2, UserRound } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { createProgramacionHistoria, getProgramacionHistoria, validarDisponibilidadCita } from '../../services/citaService';
import { nombrePaciente } from '../../utils/validators';
import { formatDate } from '../../utils/formatDate';

const emptyRow = (numero) => ({ numero_sesion: numero, fecha: '', hora_inicio: '09:00', hora_fin: '10:00', estado: 'Pendiente' });
const weekDays = [{ n: 1, l: 'Lun' }, { n: 2, l: 'Mar' }, { n: 3, l: 'Mié' }, { n: 4, l: 'Jue' }, { n: 5, l: 'Vie' }, { n: 6, l: 'Sáb' }];
const suggestions = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

export default function ProgramacionSesionesModal({ open, onClose, historia, paciente, onSaved }) {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState('individual');
  const [repeat, setRepeat] = useState({ fecha: '', dias: [], hora_inicio: '09:00', hora_fin: '10:00', cantidad: 1 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeRow, setActiveRow] = useState(0);

  const load = async () => {
    if (!historia?.id) return;
    try {
      setError('');
      const data = await getProgramacionHistoria(historia.id);
      setSummary(data);
      const used = new Set(data.programaciones.filter((x) => !['Cancelada', 'Reprogramada'].includes(x.estado)).map((x) => Number(x.numero_sesion)));
      const pending = Array.from({ length: data.indicadas }, (_, i) => i + 1).filter((n) => n > data.realizadas && !used.has(n));
      setRows(pending.map(emptyRow));
      setActiveRow(0);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo cargar la programación');
    }
  };
  useEffect(() => { if (open) load(); }, [open, historia?.id]);

  const selected = rows.filter((row) => row.fecha);
  const active = rows[activeRow] || rows[0];
  const updateRow = (index, field, value) => setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value, estado: 'Pendiente', message: '' } : row));
  const validateRow = async (index, override = {}) => {
    const row = { ...rows[index], ...override };
    if (!row?.fecha) return;
    try {
      const result = await validarDisponibilidadCita({ ...row, paciente_id: paciente.id });
      setRows((current) => current.map((item, i) => i === index ? { ...item, ...override, estado: 'Disponible', message: result.message } : item));
    } catch (e) {
      setRows((current) => current.map((item, i) => i === index ? { ...item, ...override, estado: 'No disponible', message: e.response?.data?.message || 'Horario no disponible' } : item));
    }
  };
  const generate = () => {
    if (!repeat.fecha || !repeat.dias.length) return setError('Seleccione fecha inicial y días de atención.');
    const cursor = new Date(`${repeat.fecha}T12:00:00`);
    const generated = [];
    while (generated.length < Math.min(Number(repeat.cantidad), rows.length)) {
      if (repeat.dias.includes(cursor.getDay())) generated.push(cursor.toLocaleDateString('en-CA'));
      cursor.setDate(cursor.getDate() + 1);
    }
    setRows((current) => current.map((row, i) => generated[i] ? { ...row, fecha: generated[i], hora_inicio: repeat.hora_inicio, hora_fin: repeat.hora_fin, estado: 'Pendiente' } : row));
    setError('');
  };
  const save = async () => {
    if (!selected.length) return setError('Agregue al menos una fecha.');
    setSaving(true); setError('');
    try {
      await createProgramacionHistoria(historia.id, selected);
      await load();
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo guardar la programación');
    } finally {
      setSaving(false);
    }
  };

  const next = useMemo(() => summary?.programaciones?.filter((x) => ['Programada', 'Confirmada'].includes(x.estado)).slice(0, 3) || [], [summary]);
  const calendarDate = new Date(`${active?.fecha || new Date().toLocaleDateString('en-CA')}T12:00:00`);
  const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(monthStart);
    date.setDate(index - ((monthStart.getDay() + 6) % 7) + 1);
    return { date, iso: date.toLocaleDateString('en-CA'), current: date.getMonth() === monthStart.getMonth() };
  });
  const chooseDate = (iso) => validateRow(activeRow, { fecha: iso });
  const chooseTime = (time) => {
    const hour = Number(time.slice(0, 2));
    const end = `${String(hour + 1).padStart(2, '0')}:00`;
    validateRow(activeRow, { hora_inicio: time, hora_fin: end });
  };

  const tableColumns = { gridTemplateColumns: '110px minmax(150px, 1fr) 88px 88px 105px 34px' };

  return <Modal open={open} onClose={onClose} title="Agendar sesiones del tratamiento" subtitle="La programación reserva agenda; no crea una atención clínica." size="planilla" patientStyle>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
      <section className="grid gap-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Info icon={UserRound} label="Paciente" value={nombrePaciente(paciente)} />
        <Info icon={IdCard} label="CI" value={paciente?.ci || 'Sin dato'} />
        <Info icon={CalendarClock} label="Historia clínica" value={`Evaluación del ${formatDate(historia?.fecha_evaluacion)}`} />
        <Info icon={UserRound} label="Profesional" value={historia?.profesional_cargo || 'Profesional actual'} />
        <Info icon={Stethoscope} label="Diagnóstico" value={historia?.diagnostico_medico || 'Sin registrar'} />
        <Info icon={UserRound} label="Zona afectada" value={historia?.condicion_actual?.zona_cuerpo || 'Sin registrar'} />
        <Info icon={CheckCircle2} label="Indicadas / Realizadas" value={`${summary?.indicadas || 0} / ${summary?.realizadas || 0}`} />
        <Info icon={CalendarDays} label="Programadas / Pendientes" value={`${summary?.programadas || 0} / ${summary?.pendientes_programar || 0}`} />
      </section>

      <div className="mt-4 overflow-x-auto pb-1">
      <div className="grid min-w-[930px] gap-4" style={{ gridTemplateColumns: 'minmax(0, 1fr) 270px' }}>
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
            {['individual', 'repetitiva'].map((item) => <button key={item} onClick={() => setMode(item)} className={`relative flex items-center justify-center gap-2 px-3 py-3 text-xs font-black capitalize ${mode === item ? 'bg-white text-teal-700 after:absolute after:bottom-0 after:h-0.5 after:w-1/2 after:bg-teal-500' : 'text-slate-500'}`}>{item === 'individual' ? <CalendarDays size={15} /> : <RotateCcw size={15} />}Programación {item}</button>)}
          </div>

          {mode === 'repetitiva' && <section className="grid gap-3 border-b border-slate-200 bg-teal-50/30 p-4 md:grid-cols-2 lg:grid-cols-3">
            <Input label="Fecha de inicio" type="date" value={repeat.fecha} onChange={(e) => setRepeat({ ...repeat, fecha: e.target.value })} />
            <Input label="Hora inicio" type="time" value={repeat.hora_inicio} onChange={(e) => setRepeat({ ...repeat, hora_inicio: e.target.value })} />
            <Input label="Hora final" type="time" value={repeat.hora_fin} onChange={(e) => setRepeat({ ...repeat, hora_fin: e.target.value })} />
            <Input label="Cantidad" type="number" min="1" max={rows.length} value={repeat.cantidad} onChange={(e) => setRepeat({ ...repeat, cantidad: e.target.value })} />
            <Button onClick={generate} className="self-end"><RefreshCw size={16} />Generar programación</Button>
            <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-3">{weekDays.map((day) => <button key={day.n} onClick={() => setRepeat({ ...repeat, dias: repeat.dias.includes(day.n) ? repeat.dias.filter((n) => n !== day.n) : [...repeat.dias, day.n] })} className={`rounded-full px-3 py-1.5 text-xs font-black ${repeat.dias.includes(day.n) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{day.l}</button>)}</div>
          </section>}

          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-800"><CalendarDays size={17} className="text-teal-600" />Sesiones pendientes</h3>
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black text-teal-700">{rows.length} pendientes por programar</span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[660px]">
          <div style={tableColumns} className="grid gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-[10px] font-black uppercase text-slate-500"><span>Sesión</span><span>Fecha</span><span>Inicio</span><span>Fin</span><span>Estado</span><span /></div>
          <div className="max-h-[390px] overflow-y-auto p-2">{rows.map((row, index) => <div style={tableColumns} onClick={() => setActiveRow(index)} key={row.numero_sesion} className={`mb-2 grid items-center gap-2 rounded-lg border p-2 transition ${activeRow === index ? 'border-teal-200 border-l-4 bg-teal-50/45' : 'border-slate-200 bg-white hover:border-teal-100'}`}>
            <strong className="text-xs">Sesión {row.numero_sesion} de {summary?.indicadas}</strong>
            <Input compact type="date" value={row.fecha} onChange={(e) => updateRow(index, 'fecha', e.target.value)} onBlur={() => validateRow(index)} />
            <Input compact type="time" value={row.hora_inicio} onChange={(e) => updateRow(index, 'hora_inicio', e.target.value)} onBlur={() => validateRow(index)} />
            <Input compact type="time" value={row.hora_fin} onChange={(e) => updateRow(index, 'hora_fin', e.target.value)} onBlur={() => validateRow(index)} />
            <span title={row.message} className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${row.estado === 'Disponible' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : row.estado === 'No disponible' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{row.estado}</span>
            <button aria-label="Limpiar fecha" onClick={(event) => { event.stopPropagation(); updateRow(index, 'fecha', ''); }} className="grid h-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
          </div>)}</div>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-teal-700"><CalendarClock size={17} />Asistente de programación</h3>
          <p className="mt-3 text-[11px] font-black text-slate-600">Seleccionar fecha · Sesión {active?.numero_sesion || '-'}</p>
          <div className="mt-2 rounded-lg border border-slate-200 p-2">
            <strong className="block py-1 text-center text-xs capitalize text-slate-700">{calendarDate.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}</strong>
            <div className="grid grid-cols-7 text-center text-[9px] font-black text-slate-400">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <span key={day} className="py-1">{day}</span>)}</div>
            <div className="grid grid-cols-7 gap-0.5">{calendarCells.map(({ date, iso, current }) => <button key={iso} type="button" onClick={() => chooseDate(iso)} className={`aspect-square rounded-full text-[10px] font-bold ${active?.fecha === iso ? 'bg-teal-600 text-white' : !current ? 'text-slate-300' : date.getDay() === 0 ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-teal-50'}`}>{date.getDate()}</button>)}</div>
          </div>
          <p className="mt-3 text-[11px] font-black text-slate-600">Horarios sugeridos</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">{suggestions.map((time) => <button type="button" key={time} onClick={() => chooseTime(time)} className={`rounded-md border px-2 py-1.5 text-[10px] font-bold ${active?.hora_inicio === time ? 'border-teal-500 bg-teal-600 text-white' : 'border-slate-200 text-slate-600 hover:border-teal-200 hover:bg-teal-50'}`}>{time} - {String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}:00</button>)}</div>
          <div className={`mt-3 rounded-lg border p-3 ${active?.estado === 'Disponible' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : active?.estado === 'No disponible' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}><strong className="flex items-center gap-2 text-xs"><CheckCircle2 size={17} />{active?.estado === 'Disponible' ? 'Horario disponible' : active?.estado === 'No disponible' ? 'Horario no disponible' : 'Seleccione fecha y horario'}</strong><p className="mt-1 text-[10px]">{active?.message || 'La disponibilidad se validará automáticamente.'}</p></div>
        </aside>
      </div>
      </div>

      {summary && !rows.length && !error && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="mr-2 inline" size={18} />Todas las sesiones están programadas o el tratamiento fue completado.</p>}
      {next.length > 0 && <section className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4"><h4 className="text-sm font-black text-blue-800">Próximas sesiones programadas</h4>{next.map((x) => <p key={x.id} className="mt-2 text-sm text-slate-700"><CalendarClock className="mr-2 inline text-blue-600" size={15} />{formatDate(x.fecha)} · {x.hora_inicio?.slice(0, 5)}–{x.hora_fin?.slice(0, 5)} · Sesión {x.numero_sesion}</p>)}</section>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    </div>
    <footer className="flex shrink-0 justify-between gap-2 border-t border-slate-200 bg-white p-4"><div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="secondary" onClick={() => setRows((current) => current.map((row) => ({ ...row, fecha: '', estado: 'Pendiente' })))}><Trash2 size={15} />Limpiar</Button></div><Button disabled={saving || !selected.length} onClick={save}><Save size={16} />{saving ? 'Guardando…' : 'Guardar programación'}</Button></footer>
  </Modal>;
}

function Info({ icon: Icon, label, value }) {
  return <div className="flex min-w-0 items-center gap-3 px-1 lg:border-r lg:border-slate-100 lg:last:border-r-0"><Icon size={18} className="shrink-0 text-teal-600" /><div className="min-w-0"><span className="block text-[9px] font-bold text-slate-500">{label}</span><strong className="mt-0.5 block truncate text-xs text-slate-800" title={String(value)}>{value}</strong></div></div>;
}
