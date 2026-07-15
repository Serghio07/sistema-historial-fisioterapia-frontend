import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, ClipboardPlus, Eye, FilePenLine, FileText, Filter, HeartPulse, Info, List, MoreVertical, Printer, RotateCcw, Search, Star, Stethoscope, UserRound, Users } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { useAuth } from '../../context/AuthContext';
import { createHistoriaClinica, deleteHistoriaClinica, getHistoriasClinicas, restoreHistoriaClinica, updateHistoriaClinica } from '../../services/historiaClinicaService';
import { getPacientes } from '../../services/pacienteService';
import { getSesiones } from '../../services/sesionService';
import { getProfesionalesActivos } from '../../services/usuarioService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import HistoriaClinicaForm, { initialHistoria } from './HistoriaClinicaForm';
import EvolutivoSection from './sections/EvolutivoSection';
import PacienteHistoriasAccordion from './PacienteHistoriasAccordion';
import HistoriaDetalleProfesional from './HistoriaDetalleProfesional';
import EvolutivosDocumento from './EvolutivosDocumento';
import logo from '../../assets/logos/logo.png';
import cicloMarcha from '../../assets/images/ciclo-marcha.png';
import mapaCorporalAnatomico from '../../assets/images/mapa-corporal-anatomico.png';

const motivosAnulacion = [
  'Registro duplicado',
  'Error de registro',
  'Paciente equivocado',
  'Historia creada por prueba',
  'Informacion incompleta',
  'Otro'
];

const isSesionActivaRealizada = (sesion) =>
  !sesion?.anulada
  && String(sesion?.estado || '').toLowerCase() !== 'anulada'
  && String(sesion?.asistencia || '').toLowerCase() === 'asistio';

const initialAnulacionForm = {
  motivo_anulacion: motivosAnulacion[0],
  observacion_anulacion: ''
};

const formatDateTime = (date) => {
  if (!date) return 'Sin fecha';
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsedDate);
};

function mergeHistoria(historia) {
  return {
    ...initialHistoria,
    ...historia,
    paciente_id: historia.paciente_id || historia.paciente?.id || '',
    usuario_id: historia.usuario_id || historia.usuario?.id || '',
    antecedente_personal: { ...initialHistoria.antecedente_personal, ...historia.antecedente_personal },
    antecedente_familiar: { ...initialHistoria.antecedente_familiar, ...historia.antecedente_familiar },
    examen_kinesico: { ...initialHistoria.examen_kinesico, ...historia.examen_kinesico },
    condicion_actual: { ...initialHistoria.condicion_actual, ...historia.condicion_actual },
    intervencion_clinica: { ...initialHistoria.intervencion_clinica, ...historia.intervencion_clinica },
    evaluacion_final: { ...initialHistoria.evaluacion_final, ...historia.evaluacion_final }
  };
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm font-semibold text-ink">{value || 'Sin dato'}</strong>
    </div>
  );
}

function TextBlock({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <span className="block text-xs font-black uppercase text-brand-600">{label}</span>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value || 'Sin dato'}</p>
    </div>
  );
}

function HistoriaDetalleModalLegacy({ historia, onClose }) {
  if (!historia) return null;

  return (
    <Modal open={Boolean(historia)} title={`Historia clinica - ${nombrePaciente(historia.paciente)}`} onClose={onClose} size="lg">
      <div className="grid max-h-[75vh] gap-3 overflow-y-auto pr-1">
        <div className="grid gap-3 md:grid-cols-4">
          <DetailItem label="Fecha" value={formatDate(historia.fecha_evaluacion)} />
          <DetailItem label="Estado" value={historia.estado} />
          <DetailItem label="Profesional" value={historia.profesional_cargo} />
          <DetailItem label="Paciente" value={nombrePaciente(historia.paciente)} />
          <DetailItem label="Peso" value={historia.peso ? `${historia.peso} kg` : ''} />
          <DetailItem label="Talla" value={historia.talla ? `${historia.talla} m` : ''} />
          <DetailItem label="IMC" value={historia.imc} />
          <DetailItem label="Lugar nacimiento" value={historia.lugar_fecha_nacimiento} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <DetailItem label="Zona corporal" value={historia.condicion_actual?.zona_cuerpo} />
          <DetailItem label="Tipo lesion" value={historia.condicion_actual?.tipo_lesion} />
          <DetailItem label="Escala dolor" value={historia.intervencion_clinica?.escala_dolor !== undefined ? `${historia.intervencion_clinica?.escala_dolor}/10` : ''} />
        </div>
        {historia.estado === 'anulada' && (
          <div className="grid gap-3 rounded-lg border border-red-100 bg-red-50/60 p-3 md:grid-cols-2">
            <DetailItem label="Anulada por" value={historia.anulada_por} />
            <DetailItem label="Fecha de anulacion" value={formatDateTime(historia.anulada_en)} />
            <DetailItem label="Motivo de anulacion" value={historia.motivo_anulacion} />
            <DetailItem label="Observacion de anulacion" value={historia.observacion_anulacion} />
          </div>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          <TextBlock label="Diagnostico medico" value={historia.diagnostico_medico} />
          <TextBlock label="Motivo consulta" value={historia.motivo_consulta} />
          <TextBlock label="Enfermedad actual" value={historia.enfermedad_actual} />
          <TextBlock label="Estudios imagenologicos" value={historia.condicion_actual?.estudios_imagenologicos} />
          <TextBlock label="Condicion actual" value={historia.condicion_actual?.descripcion} />
          <TextBlock label="Examen kinesico" value={historia.examen_kinesico ? `Observacion: ${historia.examen_kinesico.observacion || '-'}\nInspeccion: ${historia.examen_kinesico.inspeccion || '-'}\nPalpacion: ${historia.examen_kinesico.palpacion || '-'}\nPruebas: ${historia.examen_kinesico.pruebas_especificas || '-'}` : ''} />
          <TextBlock label="Intervencion clinica" value={historia.intervencion_clinica ? `Tono: ${historia.intervencion_clinica.tono || '-'}\nGoniometria: ${historia.intervencion_clinica.goniometria_balance_articular || '-'}\nBalance muscular: ${historia.intervencion_clinica.balance_muscular || '-'}\nTrofismo: ${historia.intervencion_clinica.trofismo || '-'}\nObservaciones: ${historia.intervencion_clinica.observaciones || '-'}` : ''} />
          <TextBlock label="Evaluacion final" value={historia.evaluacion_final ? `Postura: ${historia.evaluacion_final.evaluacion_postura || '-'}\nMarcha: ${historia.evaluacion_final.evaluacion_marcha || '-'}\nDiagnostico CIF: ${historia.evaluacion_final.diagnostico_kinesico_cif || '-'}\nPlan: ${historia.evaluacion_final.plan_tratamiento || '-'}\nSesiones indicadas: ${historia.evaluacion_final.sesiones_contratadas || '-'}` : ''} />
        </div>
        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-sm font-black uppercase text-brand-700">Evolutivo y plan de tratamiento</h3>
          <div className="mt-3 grid gap-2">
            {(historia.evolutivo || []).map((session, index) => (
              <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-[70px_110px_1fr_180px]">
                <strong>Sesión {index + 1}</strong>
                <span>{session.fecha ? formatDate(session.fecha) : 'Sin fecha'}</span>
                <span>{session.aplicacion || 'Sin detalle'}</span>
                <span>{session.inyectables || 'Sin inyectables'}</span>
              </div>
            ))}
            {!historia.evolutivo?.length && <p className="text-sm text-slate-500">Sin sesiones evolutivas registradas.</p>}
          </div>
        </section>
      </div>
    </Modal>
  );
}

function HistoriaReporte({ historia }) {
  if (!historia) return null;

  const personal = historia.antecedente_personal || {};
  const familiar = historia.antecedente_familiar || {};
  const condicion = historia.condicion_actual || {};
  const examen = historia.examen_kinesico || {};
  const intervencion = historia.intervencion_clinica || {};
  const evaluacion = historia.evaluacion_final || {};
  const dolor = Number(intervencion.escala_dolor || 0);

  const Check = ({ checked }) => (
    <span className="mx-1 inline-grid h-3 w-3 place-items-center border border-slate-700 text-[9px] leading-none">
      {checked ? 'X' : ''}
    </span>
  );

  const Line = ({ children, className = '' }) => (
    <p className={`min-h-6 border-b border-dotted border-slate-500 leading-6 ${className}`}>{children}</p>
  );

  const Area = ({ children, rows = 3 }) => (
    <div className="grid gap-1">
      {Array.from({ length: rows }).map((_, index) => (
        <Line key={index}>{index === 0 ? children : null}</Line>
      ))}
    </div>
  );

  const MarchaFigure = () => {
    return (
      <div className="overflow-hidden border border-slate-500 bg-white p-1.5">
        <img
          src={cicloMarcha}
          alt="Ciclo de marcha"
          className="h-auto w-full object-contain"
        />
      </div>
    );
  };

  const evolutivo = Array.isArray(historia.evolutivo) ? historia.evolutivo : [];

  return (
    <>
    <article className="mx-auto min-h-[279mm] w-full max-w-[216mm] bg-white px-7 py-6 font-sans text-[11px] leading-tight text-slate-900 shadow-soft print:shadow-none">
      <header className="grid grid-cols-[90px_minmax(0,1fr)_90px] items-center gap-3 border-b border-slate-700 pb-3">
        <img src={logo} alt="Physio Active" className="h-16 w-24 object-contain" />
        <div className="min-w-0 text-center">
          <h1 className="text-base font-black uppercase leading-tight">Ficha de evaluacion kinesica traumatologica</h1>
          <p className="mt-1 text-[11px] font-bold uppercase text-slate-600">Physio Active - Fisioterapia y Kinesiologia</p>
        </div>
        <div />
      </header>

      <section className="mt-4">
        <h2 className="mb-2 font-black uppercase">1. Datos del paciente</h2>
        <div className="grid grid-cols-[1fr_150px] gap-x-5">
          <Line><strong>Nombres y Apellidos:</strong> {nombrePaciente(historia.paciente)}</Line>
          <Line><strong>Fecha de Evaluacion:</strong> {formatDate(historia.fecha_evaluacion)}</Line>
        </div>
        <div className="grid grid-cols-4 gap-x-4">
          <Line><strong>Edad:</strong> {historia.paciente?.edad || ''}</Line>
          <Line><strong>Genero:</strong> {historia.paciente?.sexo || ''}</Line>
          <Line><strong>Telefono:</strong> {historia.paciente?.telefono || ''}</Line>
          <Line><strong>CI:</strong> {historia.paciente?.ci || ''}</Line>
        </div>
        <div className="grid grid-cols-2 gap-x-5">
          <Line><strong>Estado civil:</strong> {historia.paciente?.estado_civil || ''}</Line>
          <Line><strong>Profesion/Ocupacion:</strong> {historia.paciente?.ocupacion || ''}</Line>
        </div>
        <Line><strong>Referencia:</strong> {historia.paciente?.referencia || ''}</Line>
      </section>

      <section className="mt-4">
        <h2 className="font-black uppercase">2. Anamnesis</h2>
        <p className="mt-1 font-bold">Antecedentes morbidos</p>
        <div className="grid grid-cols-4 gap-x-5">
          <Line><strong>Peso:</strong> {historia.peso || ''}</Line>
          <Line><strong>Talla:</strong> {historia.talla || ''}</Line>
          <Line><strong>IMC:</strong> {historia.imc || ''}</Line>
          <Line />
        </div>
        <p className="mt-2 font-black uppercase">Diagnostico medico</p>
        <Area rows={2}>{historia.diagnostico_medico}</Area>
        <p className="mt-2 font-black uppercase">Motivo de consulta y enfermedad actual</p>
        <Area rows={5}>{`${historia.motivo_consulta || ''} ${historia.enfermedad_actual || ''}`.trim()}</Area>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-black uppercase">Antecedentes personales <span className="font-normal normal-case">(En caso positivo, especifique)</span></h3>
          <div className="mt-2 border border-slate-500">
            {[
              ['Patologicos', personal.patologicos],
              ['Hospitalarios', personal.hospitalarios],
              ['Quirurgicos', personal.quirurgicos],
              ['Traumaticos', personal.traumaticos],
              ['Alergicos', personal.alergicos],
              ['Farmacologico', personal.farmacologicos]
            ].map(([label, checked]) => (
              <div key={label} className="grid grid-cols-[1fr_44px_44px] border-b border-slate-400 last:border-b-0">
                <span className="px-2 py-1">{label}</span>
                <span className="border-l border-slate-400 px-1 py-1">Si <Check checked={checked} /></span>
                <span className="border-l border-slate-400 px-1 py-1">No <Check checked={!checked} /></span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-black uppercase">Antecedentes familiares</h3>
          <div className="mt-2 grid grid-cols-2 border border-slate-500">
            {[
              ['Diabetes', familiar.diabetes],
              ['Congenitos', familiar.congenitos],
              ['Cancer', familiar.cancer],
              ['Epilepsia', familiar.epilepsia],
              ['Hipertension', familiar.hipertension],
              ['Tuberculosis', familiar.tuberculosis],
              ['Cardiovascular', familiar.cardiovascular],
              ['Tabaquismo', familiar.tabaquismo],
              ['Asma', familiar.asma],
              ['Alcoholismo', familiar.alcoholismo],
              ['Trombosis Venosa', familiar.trombosis_venosa],
              ['Otros', Boolean(familiar.otros)]
            ].map(([label, checked]) => (
              <span key={label} className="border-b border-r border-slate-400 px-2 py-1">
                <Check checked={checked} /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>
      <Area rows={2}>{personal.observaciones || familiar.otros}</Area>

      <section className="mt-4">
        <h2 className="font-black uppercase">3. Examen kinesico localizado</h2>
        <Line><strong>Observacion:</strong> {examen.observacion}</Line>
        <Line><strong>Inspeccion:</strong> {examen.inspeccion}</Line>
        <Line><strong>Palpacion:</strong> {examen.palpacion}</Line>
        <p className="mt-3 font-black">Pruebas especificas:</p>
        <Area rows={4}>{examen.pruebas_especificas}</Area>
      </section>

      <section className="mt-4">
        <h2 className="font-black uppercase">4. Condicion actual</h2>
        <p className="mt-2 font-bold uppercase">Mapa corporal:</p>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_160px] items-start gap-5">
          <div className="overflow-hidden border border-slate-500 bg-white p-1">
            <img
              src={mapaCorporalAnatomico}
              alt="Mapa corporal anatómico masculino y femenino, vistas anterior y posterior"
              className="h-auto max-h-64 w-full object-contain"
            />
          </div>
          <div className="border border-slate-500 p-2 leading-5">
            <p><strong>T</strong> = Traumatismo</p>
            <p><strong>E</strong> = Enfermedad</p>
            <p><strong>I</strong> = Intervencion Quirurgica</p>
            <p><strong>S</strong> = Sobrecarga</p>
            <p><strong>PF</strong> = Postura Forzada</p>
            <p><strong>M</strong> = Molestias</p>
          </div>
        </div>
        <Line className="mt-2"><strong>Zona:</strong> {condicion.zona_cuerpo} <span className="ml-4"><strong>Tipo:</strong> {condicion.tipo_lesion}</span></Line>
        <p className="mt-2 font-black uppercase">Estudios imagenologicos:</p>
        <Area rows={3}>{condicion.estudios_imagenologicos}</Area>
        <Area rows={3}>{condicion.descripcion}</Area>
      </section>

      <section className="mt-4">
        <h2 className="font-black uppercase">5. Intervencion clinica</h2>
        <div className="mt-2 grid grid-cols-[190px_1fr] gap-5">
          <div>
            <p className="text-center text-[10px] font-black">Escala de Dolor</p>
            <div className="h-4 rounded-sm border border-slate-500 bg-gradient-to-r from-sky-300 via-yellow-200 to-red-400" />
            <div className="grid grid-cols-11 text-center text-[8px]">
              {Array.from({ length: 11 }).map((_, item) => <span key={item}>{item}</span>)}
            </div>
          </div>
          <div>
            <Line><strong>Dolor:</strong> {dolor}/10</Line>
            <Line>{intervencion.observaciones}</Line>
            <Line />
          </div>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="font-black uppercase">6. Tono</h2>
        <Area rows={2}>{intervencion.tono}</Area>
        <h2 className="mt-3 font-black uppercase">7. Evaluacion de balance articular "Goniometria" y balance muscular</h2>
        <Area rows={5}>{`${intervencion.goniometria_balance_articular || ''} ${intervencion.balance_muscular || ''}`.trim()}</Area>
        <h2 className="mt-3 font-black uppercase">8. Trofismo <span className="ml-4 border border-slate-500 px-8 py-1 font-normal normal-case">{intervencion.trofismo || 'Conservado'}</span></h2>
        <Line><strong>Detalle:</strong> {intervencion.detalle_trofismo}</Line>
        <p className="mt-2 font-black uppercase">Observaciones:</p>
        <Area rows={3}>{intervencion.observaciones}</Area>
      </section>

      <section className="mt-4">
        <h2 className="font-black uppercase">9. Evaluacion de postura</h2>
        <Area rows={5}>{evaluacion.evaluacion_postura}</Area>
        <h2 className="mt-3 font-black uppercase">10. Evaluacion de la marcha</h2>
        <div className="grid grid-cols-[190px_1fr] gap-5">
          <MarchaFigure />
          <Area rows={4}>{evaluacion.evaluacion_marcha}</Area>
        </div>
        <h2 className="mt-3 font-black uppercase">11. Diagnostico kinesico CIF</h2>
        <Area rows={5}>{evaluacion.diagnostico_kinesico_cif}</Area>
        <h2 className="mt-3 font-black uppercase">12. Plan de tratamiento</h2>
        <Area rows={6}>{evaluacion.plan_tratamiento}</Area>
        <Line className="mt-4"><strong>Sesiones indicadas:</strong> {evaluacion.sesiones_contratadas || ''}</Line>
        <div className="mt-12 text-center">
          <strong className="mx-auto mb-1 block max-w-64 text-sm">
            {historia.usuario?.ficha_personal?.nombre_mostrado || historia.profesional_cargo || evaluacion.profesional_cargo || historia.usuario?.nombre || 'Profesional no registrado'}
          </strong>
          <span className="inline-block min-w-48 border-t border-slate-700 px-10 pt-2">Profesional a Cargo</span>
        </div>
      </section>
    </article>
    <article className="mx-auto mt-6 min-h-[279mm] w-full max-w-[216mm] break-before-page bg-white px-7 py-6 font-sans text-[11px] leading-tight text-slate-900 shadow-soft print:mt-0 print:break-before-page print:shadow-none">
      <header className="grid grid-cols-[90px_minmax(0,1fr)_90px] items-center gap-3 border-b border-slate-700 pb-3">
        <img src={logo} alt="Physio Active" className="h-16 w-24 object-contain" />
        <div className="text-center">
          <h1 className="text-base font-black uppercase">Sesiones y plan de tratamiento</h1>
          <p className="mt-1 font-bold uppercase text-slate-600">{nombrePaciente(historia.paciente)}</p>
        </div>
        <div className="text-right text-[10px]">{formatDate(historia.fecha_evaluacion)}</div>
      </header>

      <table className="mt-4 w-full table-fixed border-collapse border border-slate-700">
        <thead>
          <tr className="bg-slate-100 uppercase">
            <th className="w-10 border border-slate-700 px-1 py-2">N.º</th>
            <th className="w-24 border border-slate-700 px-2 py-2">Fecha</th>
            <th className="border border-slate-700 px-2 py-2">Aplicación de medios físicos y técnicas manuales</th>
            <th className="w-32 border border-slate-700 px-2 py-2">Inyectables</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.max(10, evolutivo.length) }, (_, index) => {
            const session = evolutivo[index] || {};
            return (
              <tr key={index} className="align-top">
                <td className="border border-slate-700 px-1 py-2 text-center font-bold">{index + 1}</td>
                <td className="border border-slate-700 px-2 py-2 text-center">{session.fecha ? formatDate(session.fecha) : ''}</td>
                <td className="h-16 whitespace-pre-wrap border border-slate-700 px-2 py-2 leading-5">{[
                  session.dolor_inicial !== '' && session.dolor_inicial != null ? `DOLOR INICIAL: ${session.dolor_inicial}/10` : '',
                  session.dolor_final !== '' && session.dolor_final != null ? `DOLOR FINAL: ${session.dolor_final}/10` : '',
                  session.aplicacion || '',
                  session.observaciones ? `OBSERVACIONES: ${session.observaciones}` : ''
                ].filter(Boolean).join('\n')}</td>
                <td className="whitespace-pre-wrap border border-slate-700 px-2 py-2 leading-5">{session.inyectables || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
    </>
  );
}

const estadoStyles = {
  activa: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  borrador: 'border-amber-200 bg-amber-50 text-amber-700',
  anulada: 'border-slate-200 bg-slate-100 text-slate-500'
};

const getMissingFields = (historia) => [
  !historia.motivo_consulta && 'MOTIVO',
  !historia.condicion_actual?.zona_cuerpo && 'ZONA',
  (historia.intervencion_clinica?.escala_dolor === '' || historia.intervencion_clinica?.escala_dolor == null) && 'ESCALA DE DOLOR',
  !historia.evaluacion_final?.plan_tratamiento && 'PLAN DE TRATAMIENTO'
].filter(Boolean);

function HistoriaCard({ historia, onView, onPrint, onEdit, onEvolutivo, onAnular, onRestore, isAdmin, compact = false }) {
  const estado = historia.estado || 'borrador';
  const missing = estado === 'borrador' ? getMissingFields(historia) : [];
  const pain = historia.intervencion_clinica?.escala_dolor;
  const isAnulada = estado === 'anulada';

  return (
    <article className={`rounded-lg border p-3 shadow-sm transition ${isAnulada ? 'border-red-100 bg-slate-50 text-slate-500' : 'border-slate-200 bg-white hover:border-brand-100 hover:shadow-md'}`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {!compact && <strong className="truncate text-base font-black uppercase text-ink">{nombrePaciente(historia.paciente)}</strong>}
            <strong className={`text-sm ${isAnulada ? 'text-slate-500' : 'text-slate-700'}`}>{formatDate(historia.fecha_evaluacion)}</strong>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-black uppercase ${estadoStyles[estado]}`}>{estado}</span>
            {estado === 'borrador' && <span className="text-xs font-black uppercase text-amber-700">Historia incompleta</span>}
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <span className="rounded-lg bg-slate-50 px-3 py-2"><strong>MOTIVO:</strong> {historia.motivo_consulta || 'SIN REGISTRAR'}</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2"><strong>DIAGNÓSTICO:</strong> {historia.diagnostico_medico || 'SIN DIAGNÓSTICO'}</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2"><strong>ZONA:</strong> {historia.condicion_actual?.zona_cuerpo || 'SIN REGISTRAR'}</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2"><strong>DOLOR:</strong> {pain === '' || pain == null ? 'SIN REGISTRAR' : `${pain}/10`} · <strong>TIPO:</strong> {historia.condicion_actual?.tipo_lesion || 'SIN REGISTRAR'}</span>
          </div>
          <p className="mt-2 text-xs font-bold uppercase text-slate-500">Profesional: {historia.profesional_cargo || 'SIN REGISTRAR'}</p>
          {isAnulada && (
            <div className="mt-3 grid gap-2 rounded-lg border border-red-100 bg-red-50/50 p-3 text-xs uppercase text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
              <span><strong>Anulada por:</strong> {historia.anulada_por || 'SIN REGISTRAR'}</span>
              <span><strong>Fecha de anulacion:</strong> {formatDateTime(historia.anulada_en)}</span>
              <span><strong>Motivo:</strong> {historia.motivo_anulacion || 'SIN REGISTRAR'}</span>
              <span><strong>Observacion:</strong> {historia.observacion_anulacion || 'SIN REGISTRAR'}</span>
            </div>
          )}
          {missing.length > 0 && <p className="mt-2 text-xs font-bold text-amber-700">FALTAN: {missing.join(', ')}</p>}
        </div>
        <div className="flex items-start gap-2 lg:justify-end">
          <ActionButton className="h-10 w-10" label={isAnulada ? 'Ver detalle' : 'Ver historia'} icon={Eye} tone="view" onClick={onView} />
          {estado === 'activa' && (
            <>
              <ActionButton className="h-10 w-10" label="Editar" icon={FilePenLine} tone="edit" onClick={onEdit} />
              <ActionButton className="h-10 w-10" label="Imprimir" icon={Printer} tone="print" onClick={onPrint} />
              <ActionButton className="h-10 w-10" label="Evolutivo" icon={ClipboardPlus} tone="edit" onClick={onEvolutivo} />
            </>
          )}
          {estado === 'borrador' && <ActionButton className="h-10 w-10" label="Continuar historia" icon={FilePenLine} tone="edit" onClick={onEdit} />}
          {estado === 'anulada' && (
            <>
              {isAdmin && <ActionButton className="h-10 w-10" label="Restaurar historia" icon={RotateCcw} tone="edit" onClick={onRestore} />}
            </>
          )}
          {isAdmin && estado !== 'anulada' && <ActionButton className="h-10 w-10" label="Anular historia" icon={Ban} tone="delete" onClick={onAnular} />}
        </div>
      </div>
    </article>
  );
}

function PacienteHistoriasCard({ group, sesiones, onShowHistory, onNew, onViewPatient, onView, onEdit, onPreview, onPrint, onEvolutivo, onAnular, isAdmin }) {
  const { paciente, allHistorias } = group;
  const latest = allHistorias.find((historia) => historia.estado !== 'anulada') || allHistorias[0];
  const draft = allHistorias.find((historia) => historia.estado === 'borrador');
  const [showMenu, setShowMenu] = useState(false);
  const initials = nombrePaciente(paciente)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  const pain = latest.intervencion_clinica?.escala_dolor;
  const historiaResumenSesiones = allHistorias.find((historia) => historia.estado === 'activa' && Number(historia.evaluacion_final?.sesiones_contratadas || 0) > 0);
  const sesionesContratadas = Number(historiaResumenSesiones?.evaluacion_final?.sesiones_contratadas || 0);
  const sesionesRealizadas = historiaResumenSesiones
    ? sesiones.filter((sesion) =>
      String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(historiaResumenSesiones.id)
      && isSesionActivaRealizada(sesion)
    ).length
    : 0;
  const sesionesRestantes = Math.max(sesionesContratadas - sesionesRealizadas, 0);

  return <article className="bg-white px-4 py-5 transition hover:bg-slate-50/40">
    <div className="grid gap-5 xl:grid-cols-[245px_minmax(350px,1fr)_190px_190px]">
      <div className="flex gap-3 xl:border-r xl:border-slate-200 xl:pr-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-black uppercase text-brand-700 ring-1 ring-brand-100">{initials || 'PA'}</div>
        <div className="min-w-0"><strong className="block truncate text-sm font-black uppercase text-slate-900">{nombrePaciente(paciente)}</strong><span className={`mt-1 inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${paciente?.estado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>Paciente {paciente?.estado ? 'activo' : 'inactivo'}</span><dl className="mt-3 grid gap-1 text-xs text-slate-500"><div><dt className="inline font-bold text-slate-700">CI: </dt><dd className="inline">{paciente?.ci || 'Sin dato'}</dd></div><div><dt className="inline font-bold text-slate-700">Tel: </dt><dd className="inline">{paciente?.telefono || 'Sin dato'}</dd></div></dl><button type="button" onClick={onViewPatient} className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><UserRound size={14} />Ver datos del paciente</button></div>
      </div>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-4"><span className={`inline-flex items-center gap-2 text-xs font-black ${latest.estado === 'borrador' ? 'text-amber-600' : latest.estado === 'anulada' ? 'text-red-600' : 'text-emerald-700'}`}><i className={`h-2 w-2 rounded-full ${latest.estado === 'borrador' ? 'bg-amber-400' : latest.estado === 'anulada' ? 'bg-red-500' : 'bg-emerald-600'}`} />Historia {latest.estado || 'borrador'}</span><span className="text-xs text-slate-500">{formatDate(latest.fecha_evaluacion)}</span></div>
        <div className="mt-4 grid gap-x-5 gap-y-3 text-xs sm:grid-cols-2"><p><strong className="mr-1 text-slate-700">Motivo:</strong>{latest.motivo_consulta || 'Sin motivo registrado'}</p><p><strong className="mr-1 text-slate-700">Diagnóstico:</strong>{latest.diagnostico_medico || 'Sin diagnóstico registrado'}</p><p><strong className="mr-1 text-slate-700">Zona:</strong>{latest.condicion_actual?.zona_cuerpo || 'Zona no especificada'}</p><p><strong className="mr-1 text-slate-700">Dolor:</strong>{pain === '' || pain == null ? 'No evaluado' : `${pain}/10`}</p><p className="sm:col-span-2"><strong className="mr-1 text-slate-700">Profesional:</strong>{latest.profesional_cargo || 'Sin profesional registrado'}</p></div>
        {draft && draft.id !== latest.id && <button type="button" onClick={() => onEdit(draft)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-700"><FilePenLine size={15} />Borrador pendiente · Continuar borrador</button>}
      </div>
      <div>{sesionesContratadas > 0 ? <div className="rounded-xl border border-slate-200 p-4"><strong className="text-sm text-slate-800">{sesionesRealizadas} de {sesionesContratadas}</strong><span className="mt-1 block text-[11px] font-bold text-slate-500">realizadas</span><div className="my-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, (sesionesRealizadas / sesionesContratadas) * 100)}%` }} /></div><span className="text-xs text-slate-500"><strong className="text-slate-700">{sesionesRestantes}</strong> restantes</span></div> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">Sin sesiones contratadas</div>}</div>
      <div className="grid content-start gap-2"><button className="clinical-action border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => onView(latest)}><Eye size={16} />Ver historia</button>{latest.estado === 'activa' && <button className="clinical-action border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => onEvolutivo(latest)}><FilePenLine size={16} />Registrar evolutivo</button>}<button className="clinical-action border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => onPreview(latest)}><FileText size={16} />Vista previa PDF</button>{allHistorias.length > 1 && <button className="clinical-action border-slate-200 bg-slate-50 text-slate-600" onClick={onShowHistory}><List size={16} />Ver historial completo ({allHistorias.length})</button>}
        <div className="relative"><button type="button" onClick={() => setShowMenu((value) => !value)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><MoreVertical size={16} />Más acciones</button>{showMenu && <div className="absolute right-0 z-20 mt-1 grid w-full min-w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{latest.estado !== 'anulada' && <button className="menu-action" onClick={() => { onEdit(latest); setShowMenu(false); }}><FilePenLine size={15} />Editar historia</button>}<button className="menu-action" onClick={() => { onNew(); setShowMenu(false); }}><ClipboardPlus size={15} />Nueva evaluación</button><button className="menu-action" onClick={() => { onPrint(latest); setShowMenu(false); }}><Printer size={15} />Imprimir historia</button>{isAdmin && latest.estado !== 'anulada' && <button className="menu-action text-red-600 hover:bg-red-50" onClick={() => { onAnular(latest); setShowMenu(false); }}><Ban size={15} />Anular historia</button>}</div>}</div>
      </div>
    </div>
  </article>;
}

function PatientHistoryModal({ group, onClose, onView, onEdit, onEvolutivo, onPrint, onAnular, isAdmin }) {
  const [filter, setFilter] = useState('todos');
  const [order, setOrder] = useState('recent');
  if (!group) return null;
  const items = group.allHistorias
    .filter((historia) => filter === 'todos' || historia.estado === filter)
    .sort((a, b) => {
      const comparison = String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || Number(b.id) - Number(a.id);
      return order === 'recent' ? comparison : -comparison;
    });
  const newestId = [...group.allHistorias].sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || Number(b.id) - Number(a.id))[0]?.id;
  const statusClass = (status) => status === 'activa' ? 'bg-emerald-50 text-emerald-700' : status === 'borrador' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
  const HistoryAction = ({ icon: Icon, label, tone = 'slate', onClick }) => {
    const styles = { blue: 'border-blue-200 text-blue-600 hover:bg-blue-50', green: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50', red: 'border-rose-200 text-rose-600 hover:bg-rose-50', slate: 'border-slate-200 text-slate-600 hover:bg-slate-50' };
    return <button type="button" onClick={onClick} className="group grid w-[62px] justify-items-center gap-1.5 text-center text-[9px] font-semibold leading-tight text-slate-600"><span className={`grid h-10 w-10 place-items-center rounded-lg border bg-white transition ${styles[tone]}`}><Icon size={19} /></span>{label}</button>;
  };

  return <Modal open title={`Historias clínicas de ${nombrePaciente(group.paciente)}`} subtitle={`CI: ${group.paciente?.ci || 'Sin dato'} · ${group.allHistorias.length} historias registradas`} onClose={onClose} size="lg">
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">{[['todos', 'Todos'], ['activa', 'Activas'], ['borrador', 'Borradores'], ['anulada', 'Anuladas']].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${filter === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}</div>
        <select value={order} onChange={(event) => setOrder(event.target.value)} className="rounded-lg border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm"><option value="recent">Más recientes primero</option><option value="oldest">Más antiguas primero</option></select>
      </div>

      <div className="grid max-h-[58vh] gap-3 overflow-y-auto pr-1">
        {items.map((historia) => {
          const latest = historia.id === newestId;
          const pain = historia.intervencion_clinica?.escala_dolor;
          return <article key={historia.id} className={`relative grid gap-4 rounded-xl border p-4 transition lg:grid-cols-[115px_minmax(0,1fr)_auto] ${latest ? 'border-emerald-200 bg-emerald-50/25 shadow-sm' : 'border-slate-200 bg-white'}`}>
            {latest && <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl bg-emerald-500" />}
            <div className="border-b border-slate-100 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
              {latest && <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700"><Star size={11} />Más reciente</span>}
              <strong className="block text-sm font-black text-slate-800">{formatDate(historia.fecha_evaluacion)}</strong>
              <span className="mt-1 block text-[10px] text-slate-400">{historia.created_at ? formatDateTime(historia.created_at).split(',').pop()?.trim() : ''}</span>
              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(historia.estado)}`}>{historia.estado}</span>
            </div>
            <div className="min-w-0 self-center text-xs text-slate-600">
              <p className="flex flex-wrap gap-x-2 gap-y-1"><span><strong className="text-slate-700">Motivo:</strong> {historia.motivo_consulta || 'Sin registrar'}</span><i className="text-slate-300">•</i><span><strong className="text-slate-700">Diagnóstico:</strong> {historia.diagnostico_medico || 'Sin registrar'}</span></p>
              <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1"><span><strong className="text-slate-700">Zona:</strong> {historia.condicion_actual?.zona_cuerpo || 'Sin registrar'}</span><i className="text-slate-300">•</i><span><strong className="text-slate-700">Dolor:</strong> {pain === undefined || pain === '' ? 'Sin registrar' : `${pain}/10`}</span><i className="text-slate-300">•</i><span><strong className="text-slate-700">Tipo:</strong> {historia.condicion_actual?.tipo_lesion || 'Sin registrar'}</span></p>
              <p className="mt-3 text-[11px] text-slate-500"><strong>Profesional:</strong> {historia.profesional_cargo || 'Sin registrar'}</p>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              <HistoryAction icon={Eye} label="Ver" tone="blue" onClick={() => onView(historia)} />
              {historia.estado !== 'anulada' && <HistoryAction icon={FilePenLine} label="Editar" tone="blue" onClick={() => onEdit(historia)} />}
              {historia.estado === 'activa' && <HistoryAction icon={FilePenLine} label="Registrar evolutivo" tone="green" onClick={() => onEvolutivo(historia)} />}
              <HistoryAction icon={Printer} label="Imprimir" onClick={() => onPrint(historia)} />
              {historia.estado !== 'anulada' && <HistoryAction icon={ClipboardPlus} label="Evolutivo y plan de tratamiento" tone="green" onClick={() => onEvolutivo(historia)} />}
              {isAdmin && historia.estado !== 'anulada' && <HistoryAction icon={Ban} label="Anular historia" tone="red" onClick={() => onAnular(historia)} />}
            </div>
          </article>;
        })}
        {!items.length && <p className="empty-state">No hay historias en este estado.</p>}
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-700"><Info size={18} className="shrink-0" />Aquí puedes ver y administrar todas las historias clínicas registradas para este paciente.</div>
      <div className="flex justify-end border-t border-slate-100 pt-3"><Button variant="ghost" onClick={onClose}>Cerrar</Button></div>
    </div>
  </Modal>;
}

function HistoriasClinicas() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const profesionalAutenticado = user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || '';
  const [historias, setHistorias] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [form, setForm] = useState(initialHistoria);
  const [editing, setEditing] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [viewMode, setViewMode] = useState('grouped');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [professionalFilter, setProfessionalFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [painFilter, setPainFilter] = useState('');
  const [lesionFilter, setLesionFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [historyGroup, setHistoryGroup] = useState(null);
  const [selectedHistoria, setSelectedHistoria] = useState(null);
  const [previewHistoria, setPreviewHistoria] = useState(null);
  const [evolutivoHistoria, setEvolutivoHistoria] = useState(null);
  const [evolutivoData, setEvolutivoData] = useState([]);
  const [historiaAAnular, setHistoriaAAnular] = useState(null);
  const [historiaARestaurar, setHistoriaARestaurar] = useState(null);
  const [anulacionForm, setAnulacionForm] = useState(initialAnulacionForm);
  const [evolutivosPreview, setEvolutivosPreview] = useState(null);
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    setLoading(true);
    try {
      const [historiasData, pacientesData, profesionalesData, sesionesData] = await Promise.all([
        getHistoriasClinicas(),
        getPacientes(),
        getProfesionalesActivos(),
        getSesiones()
      ]);
      setHistorias(historiasData);
      setPacientes(pacientesData);
      setProfesionales(profesionalesData);
      setSesiones(sesionesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statusCounts = useMemo(() => historias.reduce((counts, historia) => {
    if (historia.estado !== 'anulada') counts.todos += 1;
    counts[historia.estado || 'borrador'] += 1;
    return counts;
  }, { todos: 0, activa: 0, borrador: 0, anulada: 0 }), [historias]);

  const filteredHistorias = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es-BO');
    return [...historias]
      .filter((historia) => {
        const searchable = [
          nombrePaciente(historia.paciente),
          historia.paciente?.ci,
          historia.paciente?.telefono,
          historia.motivo_consulta,
          historia.diagnostico_medico,
          historia.condicion_actual?.zona_cuerpo,
          historia.condicion_actual?.tipo_lesion,
          historia.estado,
          historia.profesional_cargo,
          historia.anulada_por,
          historia.motivo_anulacion,
          historia.observacion_anulacion
        ].filter(Boolean).join(' ').toLocaleLowerCase('es-BO');
        const pain = Number(historia.intervencion_clinica?.escala_dolor);
        const matchesPain = !painFilter
          || (painFilter === 'none' && pain === 0)
          || (painFilter === 'mild' && pain >= 1 && pain <= 3)
          || (painFilter === 'moderate' && pain >= 4 && pain <= 6)
          || (painFilter === 'strong' && pain >= 7 && pain <= 10);

        return (!term || searchable.includes(term))
          && (statusFilter === 'todos' ? historia.estado !== 'anulada' : historia.estado === statusFilter)
          && (!dateFrom || historia.fecha_evaluacion >= dateFrom)
          && (!dateTo || historia.fecha_evaluacion <= dateTo)
          && (!professionalFilter || historia.profesional_cargo === professionalFilter)
          && (!zoneFilter || historia.condicion_actual?.zona_cuerpo?.includes(zoneFilter))
          && (!lesionFilter || historia.condicion_actual?.tipo_lesion?.includes(lesionFilter))
          && matchesPain;
      })
      .sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || b.id - a.id);
  }, [historias, query, statusFilter, dateFrom, dateTo, professionalFilter, zoneFilter, painFilter, lesionFilter]);

  const groupedHistorias = useMemo(() => {
    const groups = new Map();
    filteredHistorias.forEach((historia) => {
      const patientId = historia.paciente_id || historia.paciente?.id;
      if (!groups.has(patientId)) {
        const allHistorias = historias
          .filter((item) => String(item.paciente_id || item.paciente?.id) === String(patientId))
          .sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || b.id - a.id);
        groups.set(patientId, { paciente: historia.paciente, historias: [], allHistorias });
      }
      groups.get(patientId).historias.push(historia);
    });
    return Array.from(groups.values());
  }, [filteredHistorias, historias]);

  const displayItems = viewMode === 'grouped' ? groupedHistorias : filteredHistorias;
  const paginatedItems = displayItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
    setExpandedPatientId(null);
  }, [query, statusFilter, dateFrom, dateTo, professionalFilter, zoneFilter, painFilter, lesionFilter, viewMode, pageSize]);

  const existingPatientStories = useMemo(() => {
    if (editing || !form.paciente_id) return [];
    return historias
      .filter((historia) => String(historia.paciente_id || historia.paciente?.id) === String(form.paciente_id))
      .sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || b.id - a.id);
  }, [editing, form.paciente_id, historias]);

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditing(null);
    setForm(initialHistoria);
  };

  const openNewHistoria = (patientId = '') => {
    setEditing(null);
    setForm({
      ...initialHistoria,
      paciente_id: patientId,
      usuario_id: user?.id || '',
      profesional_cargo: profesionalAutenticado,
      evaluacion_final: {
        ...initialHistoria.evaluacion_final,
        profesional_cargo: profesionalAutenticado
      }
    });
    setShowFormModal(true);
  };

  const editHistoria = (historia) => {
    setEditing(historia.id);
    const merged = mergeHistoria(historia);
    setForm({
      ...merged,
      usuario_id: user?.id || '',
      profesional_cargo: profesionalAutenticado,
      evaluacion_final: {
        ...merged.evaluacion_final,
        profesional_cargo: profesionalAutenticado
      }
    });
    setSelectedHistoria(null);
    setShowFormModal(true);
  };

  const submit = async (event, requestedState = 'activa') => {
    event.preventDefault();
    setMessage('');
    try {
      const payload = cleanPayload({ ...form, estado: requestedState });
      editing ? await updateHistoriaClinica(editing, payload) : await createHistoriaClinica(payload);
      closeFormModal();
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const openEvolutivo = (historia) => {
    setEvolutivoHistoria(historia);
    setEvolutivoData(Array.isArray(historia.evolutivo) ? historia.evolutivo : []);
  };

  const saveEvolutivo = async () => {
    try {
      await updateHistoriaClinica(evolutivoHistoria.id, { evolutivo: evolutivoData });
      setEvolutivoHistoria(null);
      setEvolutivoData([]);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const printHistoria = (historia) => {
    setPreviewHistoria(historia);
    window.setTimeout(() => window.print(), 100);
  };

  const restoreHistoria = async () => {
    try {
      await restoreHistoriaClinica(historiaARestaurar.id);
      setHistoriaARestaurar(null);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const anularHistoria = async () => {
    if (!anulacionForm.motivo_anulacion) {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'El motivo de anulación es obligatorio.' } }));
      return;
    }

    try {
      await deleteHistoriaClinica(historiaAAnular.id, anulacionForm);
      setHistoriaAAnular(null);
      setAnulacionForm(initialAnulacionForm);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const renderHistoria = (historia, compact = false) => (
    <HistoriaCard
      key={historia.id}
      historia={historia}
      compact={compact}
      onView={() => setSelectedHistoria(historia)}
      onPrint={() => printHistoria(historia)}
      onEdit={() => editHistoria(historia)}
      onEvolutivo={() => openEvolutivo(historia)}
      onAnular={() => setHistoriaAAnular(historia)}
      onRestore={() => setHistoriaARestaurar(historia)}
      isAdmin={isAdmin}
    />
  );

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('todos');
    setDateFrom('');
    setDateTo('');
    setProfessionalFilter('');
    setZoneFilter('');
    setPainFilter('');
    setLesionFilter('');
  };

  return (
    <section className="grid gap-4">
      {loading && <Loader />}

      <div className="panel rounded-2xl p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ClipboardPlus size={23} /></span><div><h2 className="text-xl font-black text-slate-900">Historias clínicas</h2><p className="text-xs text-slate-500">Pacientes agrupados con sus evaluaciones clínicas</p></div></div>
          <Button onClick={() => openNewHistoria()}>
            <ClipboardPlus size={17} />
            Nueva historia clinica
          </Button>
        </div>

        <div className="mb-4 grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(300px,1fr)_auto_auto]">
            <div className="relative"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border-slate-200 bg-white py-2.5 pl-11 pr-3 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por paciente, CI, teléfono, motivo, diagnóstico, zona o profesional..."
            />
            </div>
            <Button variant="ghost" onClick={() => setShowAdvancedFilters((current) => !current)}><Filter size={17} />Filtros avanzados</Button>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => setViewMode('grouped')} className={`inline-flex items-center gap-1 rounded-md px-4 py-1.5 text-xs font-black ${viewMode === 'grouped' ? 'bg-emerald-50 text-brand-700 shadow-sm ring-1 ring-brand-100' : 'text-slate-500'}`}><Users size={15} />Agrupado</button><button type="button" onClick={() => setViewMode('all')} className={`inline-flex items-center gap-1 rounded-md px-4 py-1.5 text-xs font-black ${viewMode === 'all' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}><List size={15} />Listado</button></div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                ['todos', 'Todos'],
                ['activa', 'Activas'],
                ['borrador', 'Borradores'],
                ['anulada', 'Anuladas']
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${statusFilter === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'}`}
                >
                  {label} ({statusCounts[value]})
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-500">{viewMode === 'grouped' ? `${groupedHistorias.length} pacientes encontrados` : `${filteredHistorias.length} registros`} <span className="mx-2">·</span> {filteredHistorias.length} historias clínicas</p>
          </div>

          {showAdvancedFilters && (
            <div className="grid gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1 text-xs font-black uppercase text-slate-600">Desde<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-lg border-slate-200 bg-white px-3 py-2 text-sm" /></label>
              <label className="grid gap-1 text-xs font-black uppercase text-slate-600">Hasta<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-lg border-slate-200 bg-white px-3 py-2 text-sm" /></label>
              <label className="grid gap-1 text-xs font-black uppercase text-slate-600">Profesional
                <select value={professionalFilter} onChange={(event) => setProfessionalFilter(event.target.value)} className="rounded-lg border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">TODOS</option>
                  {[...new Set(historias.map((historia) => historia.profesional_cargo).filter(Boolean))].sort().map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-slate-600">Zona
                <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)} className="rounded-lg border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">TODAS</option>
                  {['CERVICAL', 'DORSAL', 'LUMBAR', 'HOMBRO', 'CODO', 'MUÑECA', 'CADERA', 'RODILLA', 'TOBILLO', 'PIE'].map((zone) => <option key={zone}>{zone}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-slate-600">Escala de dolor
                <select value={painFilter} onChange={(event) => setPainFilter(event.target.value)} className="rounded-lg border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">TODAS</option><option value="none">SIN DOLOR: 0</option><option value="mild">LEVE: 1-3</option><option value="moderate">MODERADO: 4-6</option><option value="strong">FUERTE: 7-10</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-slate-600">Tipo de lesión
                <select value={lesionFilter} onChange={(event) => setLesionFilter(event.target.value)} className="rounded-lg border-slate-200 bg-white px-3 py-2 text-sm">
                  <option value="">TODOS</option>
                  {['TRAUMATISMO', 'ENFERMEDAD', 'INTERVENCIÓN QUIRÚRGICA', 'SOBRECARGA', 'POSTURA FORZADA', 'MOLESTIAS'].map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <div className="flex items-end sm:col-span-2"><Button variant="ghost" onClick={clearFilters}>LIMPIAR FILTROS</Button></div>
            </div>
          )}

        </div>

        {viewMode === 'grouped' && <div className="hidden grid-cols-[minmax(240px,1.55fr)_minmax(175px,.9fr)_minmax(140px,.7fr)_minmax(165px,.8fr)_32px] gap-4 rounded-t-xl border border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500 md:grid"><span>Paciente</span><span>Última historia</span><span>Historias</span><span>Sesiones</span><span aria-hidden="true" /></div>}
        <div className={`grid overflow-visible ${viewMode === 'grouped' ? 'divide-y divide-slate-200 rounded-b-xl border border-t-0 border-slate-200' : 'gap-3'}`}>
          {viewMode === 'grouped'
            ? paginatedItems.map((group) => {
                const patientId = group.paciente?.id || group.historias[0]?.paciente_id;
                return (
                  <PacienteHistoriasAccordion
                    key={patientId}
                    group={group}
                    sesiones={sesiones}
                    expanded={String(expandedPatientId) === String(patientId)}
                    onToggle={() => setExpandedPatientId((current) => String(current) === String(patientId) ? null : patientId)}
                    onShowHistory={() => setHistoryGroup(group)}
                    onNew={() => openNewHistoria(patientId)}
                    onViewPatient={() => navigate(`/pacientes/${patientId}`)}
                    onView={(historia) => setSelectedHistoria(historia)}
                    onEdit={editHistoria}
                    onPreview={setPreviewHistoria}
                    onPrint={printHistoria}
                    onEvolutivo={openEvolutivo}
                    onViewEvolutions={setEvolutivosPreview}
                    onAnular={setHistoriaAAnular}
                    isAdmin={isAdmin}
                  />
                );
              })
            : paginatedItems.map((historia) => renderHistoria(historia))}
          {filteredHistorias.length === 0 && <p className="empty-state">No hay historias clinicas para mostrar.</p>}
        </div>
        <Pagination total={displayItems.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <PatientHistoryModal
        group={historyGroup}
        onClose={() => setHistoryGroup(null)}
        onView={(historia) => { setHistoryGroup(null); setSelectedHistoria(historia); }}
        onEdit={(historia) => { setHistoryGroup(null); editHistoria(historia); }}
        onEvolutivo={(historia) => { setHistoryGroup(null); openEvolutivo(historia); }}
        onPrint={(historia) => { setHistoryGroup(null); printHistoria(historia); }}
        onAnular={(historia) => { setHistoryGroup(null); setHistoriaAAnular(historia); }}
        isAdmin={isAdmin}
      />

      <Modal open={showFormModal} title={editing ? 'Editar historia clinica' : 'Nueva historia clinica'} onClose={closeFormModal} size="lg">
        {existingPatientStories.length > 0 && (
          <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <strong className="block font-black uppercase">Este paciente ya tiene {existingPatientStories.length} {existingPatientStories.length === 1 ? 'historia clínica registrada' : 'historias clínicas registradas'}.</strong>
            <p className="mt-1">Se creará una nueva historia independiente. Si continúa el mismo tratamiento, use EVOLUTIVO en la historia correspondiente.</p>
            <div className="mt-3 grid gap-1 rounded-lg bg-white/70 p-3 text-xs uppercase sm:grid-cols-4">
              <span><strong>Última fecha:</strong> {formatDate(existingPatientStories[0].fecha_evaluacion)}</span>
              <span><strong>Motivo:</strong> {existingPatientStories[0].motivo_consulta || 'SIN REGISTRAR'}</span>
              <span><strong>Zona:</strong> {existingPatientStories[0].condicion_actual?.zona_cuerpo || 'SIN REGISTRAR'}</span>
              <span><strong>Dolor:</strong> {existingPatientStories[0].intervencion_clinica?.escala_dolor == null || existingPatientStories[0].intervencion_clinica?.escala_dolor === '' ? 'SIN REGISTRAR' : `${existingPatientStories[0].intervencion_clinica.escala_dolor}/10`}</span>
            </div>
          </div>
        )}
        <HistoriaClinicaForm
          form={form}
          setForm={setForm}
          pacientes={pacientes}
          profesionales={profesionales}
          user={user}
          isAdmin={isAdmin}
          editing={editing}
          onSubmit={submit}
          onCancel={closeFormModal}
        />
      </Modal>

      <HistoriaDetalleProfesional
        historia={selectedHistoria}
        onClose={() => setSelectedHistoria(null)}
        onEvolutivo={(historia) => { setSelectedHistoria(null); openEvolutivo(historia); }}
        onPreview={(historia) => { setSelectedHistoria(null); setPreviewHistoria(historia); }}
        onPatient={() => { const patientId = selectedHistoria?.paciente_id || selectedHistoria?.paciente?.id; setSelectedHistoria(null); navigate(`/pacientes/${patientId}`); }}
        onEdit={(historia) => { setSelectedHistoria(null); editHistoria(historia); }}
        onPrint={(historia) => { setSelectedHistoria(null); printHistoria(historia); }}
        onAnular={(historia) => { setSelectedHistoria(null); setHistoriaAAnular(historia); }}
        isAdmin={isAdmin}
      />
      <EvolutivosDocumento historia={evolutivosPreview} onClose={() => setEvolutivosPreview(null)} />

      <Modal
        open={Boolean(historiaAAnular)}
        title="Anular historia clinica"
        onClose={() => { setHistoriaAAnular(null); setAnulacionForm(initialAnulacionForm); }}
        size="sm"
      >
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-slate-600">
            Esta accion no eliminara la historia clinica. Solo se marcara como anulada y quedara guardada para auditoria.
          </p>
          <label className="grid gap-1 text-xs font-black uppercase text-slate-600">
            Motivo de anulacion
            <select
              value={anulacionForm.motivo_anulacion}
              onChange={(event) => setAnulacionForm((current) => ({ ...current, motivo_anulacion: event.target.value }))}
              className="rounded-lg border-slate-200 bg-white px-3 py-2 text-sm"
              required
            >
              {motivosAnulacion.map((motivo) => <option key={motivo} value={motivo}>{motivo}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black uppercase text-slate-600">
            Observacion
            <textarea
              value={anulacionForm.observacion_anulacion}
              onChange={(event) => setAnulacionForm((current) => ({ ...current, observacion_anulacion: event.target.value }))}
              className="min-h-24 rounded-lg border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Detalle opcional para auditoria"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <Button variant="ghost" onClick={() => { setHistoriaAAnular(null); setAnulacionForm(initialAnulacionForm); }}>Cancelar</Button>
            <Button variant="danger" onClick={anularHistoria}><Ban size={17} />Anular historia</Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(historiaARestaurar)} title="Restaurar historia clinica" onClose={() => setHistoriaARestaurar(null)} size="sm">
        <p className="text-sm leading-6 text-slate-600">Esta historia volvera a estar disponible como historia activa del paciente.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setHistoriaARestaurar(null)}>Cancelar</Button>
          <Button onClick={restoreHistoria}><RotateCcw size={17} />Restaurar historia</Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(evolutivoHistoria)}
        title="Evolutivo y plan de tratamiento"
        subtitle={`${nombrePaciente(evolutivoHistoria?.paciente)} · Registro independiente de sesiones realizadas.`}
        onClose={() => setEvolutivoHistoria(null)}
        size="lg"
      >
        <div className="grid gap-3">
          <div className="max-h-[68vh] overflow-y-auto pr-1">
            <EvolutivoSection data={evolutivoData} onChange={setEvolutivoData} />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white pt-3">
            <Button variant="ghost" onClick={() => setEvolutivoHistoria(null)}>Cancelar</Button>
            <Button onClick={saveEvolutivo}>Guardar evolutivo</Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(previewHistoria)} title="Vista previa de historia clinica" onClose={() => setPreviewHistoria(null)} size="lg">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm text-slate-500">Revise el documento antes de imprimirlo o guardarlo como PDF.</p>
            <Button onClick={() => window.print()}><Printer size={17} />Imprimir / Guardar PDF</Button>
          </div>
          <div className="max-h-[68vh] overflow-auto bg-slate-100 p-4">
            <div data-historia-print={previewHistoria?.id}>
              <HistoriaReporte historia={previewHistoria} />
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default HistoriasClinicas;
