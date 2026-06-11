import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, ClipboardPlus, Eye, FilePenLine, HeartPulse, Search, Stethoscope, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { createHistoriaClinica, deleteHistoriaClinica, getHistoriasClinicas, updateHistoriaClinica } from '../../services/historiaClinicaService';
import { getPacientes } from '../../services/pacienteService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import HistoriaClinicaForm, { initialHistoria } from './HistoriaClinicaForm';
import logo from '../../assets/logos/logo.png';

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
      <div className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1">
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

function HistoriasClinicas() {
  const { isAdmin } = useAuth();
  const [historias, setHistorias] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [form, setForm] = useState(initialHistoria);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [activePanel, setActivePanel] = useState('datos');
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [selectedHistoria, setSelectedHistoria] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [historiasData, pacientesData] = await Promise.all([getHistoriasClinicas(), getPacientes()]);
      setHistorias(historiasData);
      setPacientes(pacientesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const payload = cleanPayload(form);
      editing ? await updateHistoriaClinica(editing, payload) : await createHistoriaClinica(payload);
      setForm(initialHistoria);
      setEditing(null);
      setMessage('Historia guardada correctamente.');
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const historiasPorPaciente = useMemo(
    () =>
      pacientes.map((paciente) => ({
        paciente,
        historias: historias.filter((historia) => Number(historia.paciente_id || historia.paciente?.id) === Number(paciente.id))
      })),
    [pacientes, historias]
  );

  const pacientesFiltrados = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return historiasPorPaciente;
    return historiasPorPaciente.filter(({ paciente }) =>
      `${paciente.nombres || ''} ${paciente.apellidos || ''} ${paciente.ci || ''} ${paciente.telefono || ''}`.toLowerCase().includes(term)
    );
  }, [historiasPorPaciente, query]);

  const historiasPacienteSeleccionado = selectedPaciente
    ? historias.filter((historia) => Number(historia.paciente_id || historia.paciente?.id) === Number(selectedPaciente.id))
    : [];

  return (
    <section className="grid gap-5">
      {loading && <Loader />}

      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="relative grid gap-5 overflow-hidden bg-gradient-to-r from-brand-900 via-brand-700 to-brand-500 p-6 text-white lg:grid-cols-[1fr_auto]">
          <img src={logo} alt="" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/90 object-contain p-5 opacity-10" />
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Evaluacion kinesica traumatologica</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Historias clinicas</h2>
            <span className="mt-2 block max-w-2xl text-sm leading-6 text-brand-50">
              Registro completo con mapa corporal, escala de dolor, marcha, antecedentes e intervencion clinica.
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/15 p-3">
              <HeartPulse className="mx-auto mb-1" size={20} />
              <strong>{pacientes.length}</strong>
              <span className="block text-xs text-brand-50">Pacientes</span>
            </div>
            <div className="rounded-lg bg-white/15 p-3">
              <Stethoscope className="mx-auto mb-1" size={20} />
              <strong>{historias.length}</strong>
              <span className="block text-xs text-brand-50">Historias</span>
            </div>
            <div className="rounded-lg bg-white/15 p-3">
              <ClipboardPlus className="mx-auto mb-1" size={20} />
              <strong>{editing ? 'Edit' : 'Nuevo'}</strong>
              <span className="block text-xs text-brand-50">Modo</span>
            </div>
          </div>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => setActivePanel('datos')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activePanel === 'datos' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <HeartPulse size={17} />
            Datos del paciente
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('historias')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activePanel === 'historias' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <ClipboardList size={17} />
            Historias por paciente
          </button>
        </div>

        <div className="p-4">
          {activePanel === 'datos' ? (
            <HistoriaClinicaForm
              form={form}
              setForm={setForm}
              pacientes={pacientes}
              editing={editing}
              onSubmit={submit}
              onCancel={() => {
                setEditing(null);
                setForm(initialHistoria);
              }}
            />
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-ink">Historias por paciente</h3>
                  <p className="text-sm text-slate-500">Busca un paciente y revisa sus historias clinicas registradas.</p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{pacientes.length} pacientes</span>
              </div>
              <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
                <Search size={18} className="text-slate-500" />
                <input
                  className="w-full rounded-lg border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar paciente"
                />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {pacientesFiltrados.map(({ paciente, historias: historiasPaciente }) => (
                  <article key={paciente.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <strong className="block text-sm text-ink">{nombrePaciente(paciente)}</strong>
                        <span className="text-sm text-slate-500">
                          {paciente.ci || 'Sin CI'} - {paciente.telefono || 'Sin telefono'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-flex min-h-10 items-center rounded-lg bg-white px-3 text-sm font-bold text-brand-700">
                          {historiasPaciente.length} historias
                        </span>
                        <Button variant="ghost" className="w-10 px-0" onClick={() => setSelectedPaciente(paciente)}>
                          <Eye size={17} />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
                {pacientesFiltrados.length === 0 && <p className="empty-state lg:col-span-2">No se encontraron pacientes.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Historias registradas</h3>
            <p className="text-sm text-slate-500">Evaluaciones guardadas en el sistema.</p>
          </div>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {historias.map((historia) => (
            <article key={historia.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-300 hover:bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="block text-base text-ink">{nombrePaciente(historia.paciente)}</strong>
                  <span className="text-sm text-slate-500">
                    {formatDate(historia.fecha_evaluacion)} - {historia.diagnostico_medico || 'Sin diagnostico'}
                  </span>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{historia.estado || 'activa'}</span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                <span className="rounded-lg bg-white px-3 py-2">Zona: {historia.condicion_actual?.zona_cuerpo || 'Sin dato'}</span>
                <span className="rounded-lg bg-white px-3 py-2">Dolor: {historia.intervencion_clinica?.escala_dolor ?? '-'}/10</span>
                <span className="rounded-lg bg-white px-3 py-2">Lesion: {historia.condicion_actual?.tipo_lesion || '-'}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="w-10 px-0" onClick={() => setSelectedHistoria(historia)}>
                  <Eye size={17} />
                </Button>
                <Button
                  variant="ghost"
                  className="w-10 px-0"
                  onClick={() => {
                    setEditing(historia.id);
                    setForm(mergeHistoria(historia));
                    setActivePanel('datos');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <FilePenLine size={17} />
                </Button>
                {isAdmin && (
                  <Button variant="danger" className="w-10 px-0" onClick={() => deleteHistoriaClinica(historia.id).then(load)}>
                    <Trash2 size={17} />
                  </Button>
                )}
              </div>
            </article>
          ))}
          {historias.length === 0 && <p className="empty-state xl:col-span-2">No hay historias clinicas registradas.</p>}
        </div>
      </div>

      <Modal open={Boolean(selectedPaciente)} title={selectedPaciente ? `Historias de ${nombrePaciente(selectedPaciente)}` : 'Historias del paciente'} onClose={() => setSelectedPaciente(null)} size="lg">
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
          {historiasPacienteSeleccionado.map((historia) => (
            <article key={historia.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="block text-sm text-ink">{formatDate(historia.fecha_evaluacion)}</strong>
                  <span className="text-sm text-slate-500">{historia.diagnostico_medico || 'Sin diagnostico'}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedPaciente(null);
                      setSelectedHistoria(historia);
                    }}
                  >
                    <Eye size={17} />
                    Ver
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedPaciente(null);
                      setEditing(historia.id);
                      setForm(mergeHistoria(historia));
                      setActivePanel('datos');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <FilePenLine size={17} />
                    Editar
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <span className="rounded-lg bg-white px-3 py-2">Zona: {historia.condicion_actual?.zona_cuerpo || 'Sin dato'}</span>
                <span className="rounded-lg bg-white px-3 py-2">Dolor: {historia.intervencion_clinica?.escala_dolor ?? '-'}/10</span>
                <span className="rounded-lg bg-white px-3 py-2">Lesion: {historia.condicion_actual?.tipo_lesion || '-'}</span>
              </div>
            </article>
          ))}
          {historiasPacienteSeleccionado.length === 0 && (
            <div className="empty-state">
              <ClipboardList className="mx-auto mb-2 text-slate-400" size={28} />
              Este paciente todavia no tiene historias clinicas registradas.
            </div>
          )}
        </div>
      </Modal>

      <HistoriaDetalleModal historia={selectedHistoria} onClose={() => setSelectedHistoria(null)} />
    </section>
  );
}

export default HistoriasClinicas;
