import { Activity, CalendarDays, ClipboardList, FilePenLine, FileText, MapPin, MoreHorizontal, Ruler, Scale, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import { useState } from 'react';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const value = (data, fallback = 'Sin dato') => data === undefined || data === null || data === '' ? fallback : data;

function Stat({ icon: Icon, label, children, tone = 'text-brand-700' }) {
  return <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
    <Icon size={20} className={`shrink-0 ${tone}`} strokeWidth={1.8} />
    <div className="min-w-0"><span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">{label}</span><strong className="mt-0.5 block truncate text-xs text-slate-800">{children}</strong></div>
  </div>;
}

function Row({ label, children }) {
  return <div className="grid gap-1 border-b border-slate-100 py-1.5 last:border-0 sm:grid-cols-[145px_1fr]"><dt className="text-[11px] font-bold text-slate-600">{label}</dt><dd className="text-[11px] text-slate-700">{value(children, '-')}</dd></div>;
}

function Card({ title, icon: Icon, color = 'text-brand-700', children, className = '' }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-3 ${className}`}><h3 className={`mb-2 flex items-center gap-2 text-xs font-black ${color}`}><Icon size={17} />{title}</h3><dl>{children}</dl></section>;
}

export default function HistoriaDetalleProfesional({ historia, onClose, onEvolutivo, onPreview, onPatient, onEdit, onPrint, onAnular, isAdmin }) {
  const [showActions, setShowActions] = useState(false);
  if (!historia) return null;
  const condicion = historia.condicion_actual || {};
  const examen = historia.examen_kinesico || {};
  const intervencion = historia.intervencion_clinica || {};
  const evaluacion = historia.evaluacion_final || {};
  const sessions = Array.isArray(historia.evolutivo) ? historia.evolutivo : [];
  const active = historia.estado === 'activa';

  return <Modal open title={`Historia clínica  |  ${nombrePaciente(historia.paciente)}`} subtitle={`${active ? 'Activa' : historia.estado} · ${formatDate(historia.fecha_evaluacion)} · ${historia.profesional_cargo || 'Sin profesional'}`} onClose={onClose} size="lg">
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${active ? 'bg-emerald-50 text-emerald-700' : historia.estado === 'borrador' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}><i className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : historia.estado === 'borrador' ? 'bg-amber-400' : 'bg-rose-400'}`} />{historia.estado}</span>
        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Sesiones indicadas: {value(evaluacion.sesiones_contratadas, 0)}</span>
      </div>

      <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40 sm:grid-cols-2 lg:grid-cols-6 lg:divide-x lg:divide-slate-200">
        <Stat icon={CalendarDays} label="Fecha">{formatDate(historia.fecha_evaluacion)}</Stat>
        <Stat icon={ShieldCheck} label="Estado">{historia.estado}</Stat>
        <Stat icon={Scale} label="Peso">{historia.peso ? `${historia.peso} kg` : 'Sin dato'}</Stat>
        <Stat icon={Ruler} label="Talla">{historia.talla ? `${historia.talla} m` : 'Sin dato'}</Stat>
        <Stat icon={Activity} label="IMC">{value(historia.imc)}</Stat>
        <Stat icon={MapPin} label="Lugar de nacimiento">{value(historia.lugar_fecha_nacimiento)}</Stat>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-black text-emerald-700"><Stethoscope size={17} />Datos clínicos principales</h3>
        <div className="grid overflow-hidden rounded-lg border border-emerald-100 bg-emerald-50/40 sm:grid-cols-3 sm:divide-x sm:divide-emerald-100">
          <Stat icon={UserRound} label="Zona corporal">{value(condicion.zona_cuerpo)}</Stat>
          <Stat icon={Activity} label="Tipo de lesión">{value(condicion.tipo_lesion)}</Stat>
          <Stat icon={Activity} label="Escala de dolor" tone={Number(intervencion.escala_dolor) >= 7 ? 'text-red-500' : 'text-emerald-600'}>{intervencion.escala_dolor === undefined || intervencion.escala_dolor === '' ? 'Sin dato' : `${intervencion.escala_dolor}/10`}</Stat>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Motivo y diagnóstico" icon={Stethoscope} color="text-emerald-700"><Row label="Motivo de consulta">{historia.motivo_consulta}</Row><Row label="Diagnóstico médico">{historia.diagnostico_medico}</Row></Card>
        <Card title="Evaluación clínica" icon={ClipboardList} color="text-violet-700"><Row label="Enfermedad actual">{historia.enfermedad_actual}</Row><Row label="Condición actual">{condicion.descripcion}</Row><Row label="Estudios imagenológicos">{condicion.estudios_imagenologicos}</Row></Card>
        <Card title="Examen kinésico" icon={FileText} color="text-blue-700"><Row label="Observación">{examen.observacion}</Row><Row label="Inspección">{examen.inspeccion}</Row><Row label="Palpación">{examen.palpacion}</Row><Row label="Pruebas">{examen.pruebas_especificas}</Row></Card>
        <Card title="Intervención clínica" icon={Activity} color="text-cyan-700"><Row label="Tono">{intervencion.tono}</Row><Row label="Goniometría">{intervencion.goniometria_balance_articular}</Row><Row label="Balance muscular">{intervencion.balance_muscular}</Row><Row label="Trofismo">{intervencion.trofismo}</Row><Row label="Observaciones">{intervencion.observaciones}</Row></Card>
        <Card title="Evaluación final" icon={Activity} color="text-violet-700" className="md:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[['Postura', evaluacion.evaluacion_postura], ['Marcha', evaluacion.evaluacion_marcha], ['Diagnóstico CIF', evaluacion.diagnostico_kinesico_cif], ['Plan de tratamiento', evaluacion.plan_tratamiento], ['Sesiones indicadas', evaluacion.sesiones_contratadas]].map(([label, content]) => <div key={label} className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5"><span className="block text-[10px] font-black uppercase text-slate-500">{label}</span><p className="mt-1 break-words text-[11px] leading-5 text-slate-700">{value(content, '-')}</p></div>)}
          </div>
        </Card>
        <Card title="Evolución y plan de tratamiento" icon={ClipboardList} color="text-amber-700" className="md:col-span-2">{sessions.length ? sessions.map((session, index) => <Row key={index} label={`Sesión ${index + 1}`}>{`${formatDate(session.fecha)} · ${value(session.aplicacion)}`}</Row>) : <p className="text-xs text-slate-500">Sin sesiones evolutivas registradas.</p>}</Card>
      </div>

      <footer className="sticky bottom-0 flex flex-wrap gap-2 border-t border-slate-200 bg-white pt-3">
        {active && <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-black text-white hover:bg-emerald-800" onClick={() => onEvolutivo(historia)}><FilePenLine size={16} />Registrar evolución</button>}
        {historia.estado !== 'anulada' && <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 px-4 text-xs font-bold text-emerald-700 hover:bg-emerald-50" onClick={() => onEdit(historia)}><FilePenLine size={16} />Editar historia</button>}
        <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 px-4 text-xs font-bold text-blue-700 hover:bg-blue-50" onClick={() => onPreview(historia)}><FileText size={16} />Vista previa PDF</button>
        <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-violet-200 px-4 text-xs font-bold text-violet-700 hover:bg-violet-50" onClick={onPatient}><UserRound size={16} />Datos del paciente</button>
        <div className="relative ml-auto">
          <button type="button" onClick={() => setShowActions((current) => !current)} aria-expanded={showActions} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"><MoreHorizontal size={17} />Más acciones</button>
          {showActions && <div className="absolute bottom-full right-0 z-30 mb-2 grid w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            <button className="menu-action" onClick={() => { setShowActions(false); onPrint(historia); }}><FileText size={15} />Imprimir historia</button>
            {isAdmin && historia.estado !== 'anulada' && <button className="menu-action text-red-600 hover:bg-red-50" onClick={() => { setShowActions(false); onAnular(historia); }}>Anular historia</button>}
          </div>}
        </div>
      </footer>
    </div>
  </Modal>;
}
