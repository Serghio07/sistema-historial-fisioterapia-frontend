import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, CalendarDays, ClipboardList, FileText, MapPin, Ruler, Scale, ShieldCheck, Stethoscope } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { PatientIdentity } from '../../components/common/ProfilePhoto';
import { getHistoriaClinica } from '../../services/historiaClinicaService';
import { formatDate } from '../../utils/formatDate';

const show = (value, fallback = 'Sin dato') =>
  value === undefined || value === null || value === '' ? fallback : value;

function Stat({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-slate-50 p-3">
      <Icon size={19} className="shrink-0 text-brand-700" />
      <div className="min-w-0">
        <span className="block text-[10px] font-black uppercase text-slate-500">{label}</span>
        <strong className="mt-1 block break-words text-sm text-ink">{show(children)}</strong>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-2 last:border-0 sm:grid-cols-[170px_1fr]">
      <dt className="text-xs font-bold text-slate-600">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{show(children)}</dd>
    </div>
  );
}

function Card({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-brand-700">
        <Icon size={18} />{title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

function HistoriaClinicaDetalle() {
  const { id } = useParams();
  const location = useLocation();
  const [historia, setHistoria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const returnTo = location.state?.returnTo;

  useEffect(() => {
    let active = true;
    setLoading(true);
    getHistoriaClinica(id)
      .then((data) => active && setHistoria(data))
      .catch((err) => active && setError(err.message || 'No se pudo cargar la historia clínica.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  if (loading) return <Loader text="Cargando historia clínica real..." />;

  if (error || !historia) {
    return (
      <section className="panel">
        <p className="font-bold text-red-700">{error || 'Historia clínica no encontrada.'}</p>
        <Link to={returnTo || '/historias-clinicas'} className="mt-4 inline-block"><Button variant="ghost">Volver</Button></Link>
      </section>
    );
  }

  const condicion = historia.condicion_actual || {};
  const examen = historia.examen_kinesico || {};
  const intervencion = historia.intervencion_clinica || {};
  const evaluacion = historia.evaluacion_final || {};
  const antecedentes = historia.antecedente_personal || {};
  const familiares = historia.antecedente_familiar || {};
  const evoluciones = Array.isArray(historia.evoluciones)
    ? historia.evoluciones
    : Array.isArray(historia.evolutivo) ? historia.evolutivo : [];

  return (
    <section className="grid gap-4">
      <div className="panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-brand-600">Historia clínica #{historia.id}</p>
          <div className="mt-2"><PatientIdentity paciente={historia.paciente} secondary={`Evaluación: ${formatDate(historia.fecha_evaluacion)}`} /></div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1.5 text-xs font-black uppercase ${historia.estado === 'activa' ? 'bg-emerald-50 text-emerald-700' : historia.estado === 'anulada' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{historia.estado || 'Sin estado'}</span>
          <Link to={returnTo || '/historias-clinicas'} state={returnTo ? { resumenState: location.state?.resumenState } : undefined}>
            <Button variant="ghost"><ArrowLeft size={17} />{returnTo ? 'Volver al resumen' : 'Volver'}</Button>
          </Link>
        </div>
      </div>

      <div className="panel grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Stat icon={CalendarDays} label="Fecha">{formatDate(historia.fecha_evaluacion)}</Stat>
        <Stat icon={ShieldCheck} label="Profesional">{historia.profesional_cargo || historia.usuario?.nombre}</Stat>
        <Stat icon={Scale} label="Peso">{historia.peso ? `${historia.peso} kg` : ''}</Stat>
        <Stat icon={Ruler} label="Talla">{historia.talla ? `${historia.talla} m` : ''}</Stat>
        <Stat icon={Activity} label="IMC">{historia.imc}</Stat>
        <Stat icon={MapPin} label="Nacimiento">{historia.lugar_fecha_nacimiento}</Stat>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Motivo y diagnóstico" icon={Stethoscope}>
          <Row label="Motivo de consulta">{historia.motivo_consulta}</Row>
          <Row label="Diagnóstico médico">{historia.diagnostico_medico}</Row>
          <Row label="Enfermedad actual">{historia.enfermedad_actual}</Row>
        </Card>
        <Card title="Condición actual" icon={Activity}>
          <Row label="Zona corporal">{condicion.zona_cuerpo}</Row>
          <Row label="Tipo de lesión">{Array.isArray(condicion.tipo_lesion) ? condicion.tipo_lesion.join(', ') : condicion.tipo_lesion}</Row>
          <Row label="Descripción">{condicion.descripcion}</Row>
          <Row label="Estudios imagenológicos">{condicion.estudios_imagenologicos}</Row>
          <Row label="Escala de dolor">{intervencion.escala_dolor !== undefined && intervencion.escala_dolor !== '' ? `${intervencion.escala_dolor}/10` : ''}</Row>
        </Card>
        <Card title="Antecedentes" icon={ClipboardList}>
          <Row label="Personales">{antecedentes.observaciones}</Row>
          <Row label="Patológicos">{antecedentes.detalle_patologicos}</Row>
          <Row label="Quirúrgicos">{antecedentes.detalle_quirurgicos}</Row>
          <Row label="Traumáticos">{antecedentes.detalle_traumaticos}</Row>
          <Row label="Familiares">{familiares.observaciones || familiares.descripcion}</Row>
        </Card>
        <Card title="Examen kinésico" icon={FileText}>
          <Row label="Observación">{examen.observacion}</Row>
          <Row label="Inspección">{examen.inspeccion}</Row>
          <Row label="Palpación">{examen.palpacion}</Row>
          <Row label="Pruebas específicas">{examen.pruebas_especificas}</Row>
        </Card>
        <Card title="Intervención clínica" icon={Activity}>
          <Row label="Tono">{intervencion.tono}</Row>
          <Row label="Goniometría">{intervencion.goniometria_balance_articular}</Row>
          <Row label="Balance muscular">{intervencion.balance_muscular}</Row>
          <Row label="Trofismo">{intervencion.trofismo}</Row>
          <Row label="Observaciones">{intervencion.observaciones}</Row>
        </Card>
        <Card title="Evaluación final y tratamiento" icon={Stethoscope}>
          <Row label="Postura">{evaluacion.evaluacion_postura}</Row>
          <Row label="Marcha">{evaluacion.evaluacion_marcha}</Row>
          <Row label="Diagnóstico CIF">{evaluacion.diagnostico_kinesico_cif}</Row>
          <Row label="Plan de tratamiento">{evaluacion.plan_tratamiento}</Row>
          <Row label="Sesiones indicadas">{evaluacion.sesiones_contratadas}</Row>
        </Card>
        <Card title={`Evoluciones (${evoluciones.length})`} icon={ClipboardList} className="lg:col-span-2">
          {evoluciones.length ? evoluciones.map((evolucion, index) => (
            <Row key={evolucion.id || index} label={`Evolución ${index + 1} · ${formatDate(evolucion.fecha)}`}>
              {[evolucion.aplicacion, evolucion.inyectables, evolucion.observaciones].filter(Boolean).join(' · ')}
            </Row>
          )) : <p className="text-sm text-slate-500">Sin evoluciones registradas en esta historia.</p>}
        </Card>
      </div>
    </section>
  );
}

export default HistoriaClinicaDetalle;
