import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, ClipboardPlus, Eye, FilePenLine, HeartPulse, Printer, Search, Stethoscope, Trash2 } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { createHistoriaClinica, deleteHistoriaClinica, getHistoriasClinicas, updateHistoriaClinica } from '../../services/historiaClinicaService';
import { getPacientes } from '../../services/pacienteService';
import { getProfesionalesActivos } from '../../services/usuarioService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import HistoriaClinicaForm, { initialHistoria } from './HistoriaClinicaForm';
import logo from '../../assets/logos/logo.png';
import cicloMarcha from '../../assets/images/ciclo-marcha.png';
import mapaCorporalAnatomico from '../../assets/images/mapa-corporal-anatomico.png';

function mergeHistoria(historia) {
  return {
    ...initialHistoria,
    ...historia,
    paciente_id: historia.paciente_id || historia.paciente?.id || '',
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

function HistoriaDetalleModal({ historia, onClose }) {
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
        <div className="grid gap-3 lg:grid-cols-2">
          <TextBlock label="Diagnostico medico" value={historia.diagnostico_medico} />
          <TextBlock label="Motivo consulta" value={historia.motivo_consulta} />
          <TextBlock label="Enfermedad actual" value={historia.enfermedad_actual} />
          <TextBlock label="Estudios imagenologicos" value={historia.condicion_actual?.estudios_imagenologicos} />
          <TextBlock label="Condicion actual" value={historia.condicion_actual?.descripcion} />
          <TextBlock label="Examen kinesico" value={historia.examen_kinesico ? `Observacion: ${historia.examen_kinesico.observacion || '-'}\nInspeccion: ${historia.examen_kinesico.inspeccion || '-'}\nPalpacion: ${historia.examen_kinesico.palpacion || '-'}\nPruebas: ${historia.examen_kinesico.pruebas_especificas || '-'}` : ''} />
          <TextBlock label="Intervencion clinica" value={historia.intervencion_clinica ? `Tono: ${historia.intervencion_clinica.tono || '-'}\nGoniometria: ${historia.intervencion_clinica.goniometria_balance_articular || '-'}\nBalance muscular: ${historia.intervencion_clinica.balance_muscular || '-'}\nTrofismo: ${historia.intervencion_clinica.trofismo || '-'}\nObservaciones: ${historia.intervencion_clinica.observaciones || '-'}` : ''} />
          <TextBlock label="Evaluacion final" value={historia.evaluacion_final ? `Postura: ${historia.evaluacion_final.evaluacion_postura || '-'}\nMarcha: ${historia.evaluacion_final.evaluacion_marcha || '-'}\nDiagnostico CIF: ${historia.evaluacion_final.diagnostico_kinesico_cif || '-'}\nPlan: ${historia.evaluacion_final.plan_tratamiento || '-'}\nPeriodicidad: ${historia.evaluacion_final.periodicidad || '-'}` : ''} />
        </div>
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

  return (
    <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-7 py-6 font-sans text-[11px] leading-tight text-slate-900 shadow-soft print:shadow-none">
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
        <Line className="mt-4"><strong>Periodicidad:</strong> {evaluacion.periodicidad}</Line>
        <div className="mt-12 text-center">
          <strong className="mx-auto mb-1 block max-w-64 text-sm">
            {historia.profesional_cargo || evaluacion.profesional_cargo || historia.usuario?.nombre || 'Profesional no registrado'}
          </strong>
          <span className="inline-block min-w-48 border-t border-slate-700 px-10 pt-2">Profesional a Cargo</span>
        </div>
      </section>
    </article>
  );
}

function HistoriaCard({ historia, onView, onPreview, onPrint, onEdit, onDelete, canDelete }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-md">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-base font-black text-ink">{nombrePaciente(historia.paciente)}</strong>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-black uppercase text-brand-700">{historia.estado || 'activa'}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(historia.fecha_evaluacion)} - {historia.diagnostico_medico || 'Sin diagnostico'}
          </p>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
            <span className="rounded-lg bg-slate-50 px-3 py-2">Zona: {historia.condicion_actual?.zona_cuerpo || 'Sin dato'}</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2">Dolor: {historia.intervencion_clinica?.escala_dolor ?? '-'}/10</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2">Lesion: {historia.condicion_actual?.tipo_lesion || '-'}</span>
          </div>
        </div>
        <div className="flex items-start gap-2 lg:justify-end">
          <ActionButton className="h-10 w-10" label="Ver historia" icon={Eye} tone="view" onClick={onView} />
          <ActionButton className="h-10 w-10" label="Vista previa del documento" icon={ClipboardList} tone="download" onClick={onPreview} />
          <ActionButton className="h-10 w-10" label="Imprimir reporte" icon={Printer} tone="print" onClick={onPrint} />
          <ActionButton className="h-10 w-10" label="Editar historia" icon={FilePenLine} tone="edit" onClick={onEdit} />
          {canDelete && <ActionButton className="h-10 w-10" label="Eliminar historia" icon={Trash2} tone="delete" onClick={onDelete} />}
        </div>
      </div>
    </article>
  );
}

function HistoriasClinicas() {
  const { isAdmin, user } = useAuth();
  const [historias, setHistorias] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [form, setForm] = useState(initialHistoria);
  const [editing, setEditing] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [selectedHistoria, setSelectedHistoria] = useState(null);
  const [previewHistoria, setPreviewHistoria] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [historiasData, pacientesData, profesionalesData] = await Promise.all([
        getHistoriasClinicas(),
        getPacientes(),
        getProfesionalesActivos()
      ]);
      setHistorias(historiasData);
      setPacientes(pacientesData);
      setProfesionales(profesionalesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredHistorias = useMemo(() => {
    const term = query.trim().toLowerCase();
    return historias.filter((historia) =>
      `${nombrePaciente(historia.paciente)} ${historia.diagnostico_medico || ''} ${historia.condicion_actual?.zona_cuerpo || ''} ${historia.estado || ''}`.toLowerCase().includes(term)
    );
  }, [historias, query]);

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditing(null);
    setForm(initialHistoria);
  };

  const openNewHistoria = () => {
    setEditing(null);
    setForm({
      ...initialHistoria,
      profesional_cargo: user?.nombre || '',
      evaluacion_final: {
        ...initialHistoria.evaluacion_final,
        profesional_cargo: user?.nombre || ''
      }
    });
    setShowFormModal(true);
  };

  const editHistoria = (historia) => {
    setEditing(historia.id);
    setForm(mergeHistoria(historia));
    setSelectedHistoria(null);
    setShowFormModal(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const payload = cleanPayload(form);
      editing ? await updateHistoriaClinica(editing, payload) : await createHistoriaClinica(payload);
      setMessage('Historia guardada correctamente.');
      closeFormModal();
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <section className="grid gap-4">
      {loading && <Loader />}

      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="relative grid gap-3 overflow-hidden bg-gradient-to-r from-brand-900 via-brand-700 to-brand-500 p-4 text-white lg:grid-cols-[1fr_auto]">
          <img src={logo} alt="" className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/90 object-contain p-5 opacity-10" />
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Evaluacion kinesica traumatologica</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Historias clinicas</h2>
            <span className="mt-1 block max-w-2xl text-sm leading-5 text-brand-50">
              Registro por secciones con antecedentes, condicion actual, intervencion y evaluacion final.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-white/15 p-2">
              <HeartPulse className="mx-auto mb-1" size={18} />
              <strong>{pacientes.length}</strong>
              <span className="block text-xs text-brand-50">Pacientes</span>
            </div>
            <div className="rounded-lg bg-white/15 p-2">
              <Stethoscope className="mx-auto mb-1" size={18} />
              <strong>{historias.length}</strong>
              <span className="block text-xs text-brand-50">Historias</span>
            </div>
          </div>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Historias registradas</h3>
            <p className="text-sm text-slate-500">Lista de evaluaciones guardadas.</p>
          </div>
          <Button onClick={openNewHistoria}>
            <ClipboardPlus size={17} />
            Nueva historia
          </Button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <Search size={18} className="shrink-0 text-slate-500" />
          <input
            className="w-full rounded-lg border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por paciente, diagnostico, zona o estado"
          />
          <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{filteredHistorias.length} resultados</span>
        </div>

        <div className="grid gap-3">
          {filteredHistorias.map((historia) => (
            <HistoriaCard
              key={historia.id}
              historia={historia}
              onView={() => setSelectedHistoria(historia)}
              onPreview={() => setPreviewHistoria(historia)}
              onPrint={() => {
                setPreviewHistoria(historia);
                setTimeout(() => window.print(), 100);
              }}
              onEdit={() => editHistoria(historia)}
              onDelete={() => deleteHistoriaClinica(historia.id).then(load)}
              canDelete={isAdmin}
            />
          ))}
          {filteredHistorias.length === 0 && <p className="empty-state">No hay historias clinicas para mostrar.</p>}
        </div>
      </div>

      <Modal open={showFormModal} title={editing ? 'Editar historia clinica' : 'Nueva historia clinica'} onClose={closeFormModal} size="lg">
        <HistoriaClinicaForm
          form={form}
          setForm={setForm}
          pacientes={pacientes}
          profesionales={profesionales}
          editing={editing}
          onSubmit={submit}
          onCancel={closeFormModal}
        />
      </Modal>

      <HistoriaDetalleModal historia={selectedHistoria} onClose={() => setSelectedHistoria(null)} />

      <Modal open={Boolean(previewHistoria)} title="Vista previa de historia clinica" onClose={() => setPreviewHistoria(null)} size="lg">
        <div className="max-h-[75vh] overflow-auto bg-slate-100 p-4">
          <div data-historia-print={previewHistoria?.id}>
            <HistoriaReporte historia={previewHistoria} />
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default HistoriasClinicas;
