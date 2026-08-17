import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useLocation, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ClipboardCheck, Download, Eye, FilePenLine, Maximize2, Plus, Printer, Save, Search, Trash2 } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { PatientIdentity } from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { getHistoriasClinicas } from '../../services/historiaClinicaService';
import { getPacientes } from '../../services/pacienteService';
import { createPlanillaAtencion, deletePlanillaAtencion, getPlanillasAtencion, updatePlanillaAtencion } from '../../services/planillaAtencionService';
import { getSesiones } from '../../services/sesionService';
import { formatDate } from '../../utils/formatDate';
import { matchesSearch } from '../../utils/search';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import PlanillaDocumento from './PlanillaDocumento';
import { boliviaDate } from '../../utils/boliviaDateTime';
import { addCanvasToA4Pdf } from '../../utils/pdfPagination';

const today = boliviaDate();

const initialForm = {
  paciente_id: '',
  historia_clinica_id: '',
  fecha_inicio: today,
  fecha_fin: today,
  diagnostico: '',
  observacion: '',
  sesiones: [{ sesion_id: '', fecha: today, numero_sesion: 1, firma_paciente: '', firma_profesional: '', observacion: '' }]
};

function PlanillasAtencion() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const printRef = useRef(null);
  const [searchParams] = useSearchParams();
  const [pacientes, setPacientes] = useState([]);
  const [historias, setHistorias] = useState([]);
  const [sesionesRegistradas, setSesionesRegistradas] = useState([]);
  const [planillas, setPlanillas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [activePanel, setActivePanel] = useState('listado');
  const [selectedPlanilla, setSelectedPlanilla] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const pacienteInicialId = searchParams.get('paciente_id');

  const pacienteSeleccionado = useMemo(
    () => pacientes.find((paciente) => Number(paciente.id) === Number(form.paciente_id)),
    [pacientes, form.paciente_id]
  );

  const historiasPaciente = useMemo(() => historias
    .filter((historia) => Number(historia.paciente_id || historia.paciente?.id) === Number(form.paciente_id))
    .sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || Number(b.id || 0) - Number(a.id || 0)),
  [historias, form.paciente_id]);

  const previewPlanilla = useMemo(() => ({ ...form, paciente: pacienteSeleccionado }), [form, pacienteSeleccionado]);

  const filteredPlanillas = useMemo(() => {
    return planillas
      .filter((planilla) => !pacienteInicialId || Number(planilla.paciente_id || planilla.paciente?.id) === Number(pacienteInicialId))
      .filter((planilla) => {
        return matchesSearch(`${nombrePaciente(planilla.paciente)} ${planilla.diagnostico || ''} ${planilla.fecha_inicio || ''} ${planilla.fecha_fin || ''}`, query);
      });
  }, [planillas, pacienteInicialId, query]);

  const sesionesPacienteSeleccionado = useMemo(() => {
    return sesionesRegistradas
      .filter((sesion) => Number(sesion.paciente_id || sesion.paciente?.id) === Number(form.paciente_id))
      .filter((sesion) => !form.historia_clinica_id || Number(sesion.historia_clinica_id || sesion.historia_clinica?.id) === Number(form.historia_clinica_id))
      .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
  }, [sesionesRegistradas, form.paciente_id, form.historia_clinica_id]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pacientesData, historiasData, planillasData, sesionesData] = await Promise.all([getPacientes(), getHistoriasClinicas(), getPlanillasAtencion(), getSesiones()]);
      setPacientes(pacientesData);
      setHistorias(historiasData);
      setPlanillas(planillasData);
      setSesionesRegistradas(sesionesData);
      if (pacienteInicialId && !form.paciente_id) {
        const paciente = pacientesData.find((item) => Number(item.id) === Number(pacienteInicialId));
        const sesionesPaciente = sesionesDesdePaciente(pacienteInicialId, sesionesData);
        setForm((current) => ({
          ...current,
          paciente_id: pacienteInicialId,
          diagnostico: current.diagnostico || paciente?.referencia || '',
          fecha_inicio: sesionesPaciente[0]?.fecha || current.fecha_inicio,
          fecha_fin: sesionesPaciente.at(-1)?.fecha || current.fecha_fin,
          sesiones: sesionesPaciente.length ? sesionesPaciente : current.sesiones
        }));
      }
    } catch (err) {
      setError(`${err.message}. Si la tabla no existe, ejecuta backend/docs/planillas-atencion-migration.sql.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const planillaId = location.state?.planillaId;
    if (!planillaId || !planillas.length) return;
    const planilla = planillas.find((item) => Number(item.id) === Number(planillaId));
    if (planilla) {
      setSelectedPlanilla(planilla);
      setActivePanel('listado');
    }
  }, [planillas, location.state?.planillaId]);

  const update = (key, value) => setForm({ ...form, [key]: value });

  const sesionesDesdePaciente = (pacienteId, source = sesionesRegistradas, historiaId = form.historia_clinica_id) => {
    const sesionesPaciente = source
      .filter((sesion) => Number(sesion.paciente_id || sesion.paciente?.id) === Number(pacienteId))
      .filter((sesion) => !historiaId || Number(sesion.historia_clinica_id || sesion.historia_clinica?.id) === Number(historiaId))
      .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));

    return sesionesPaciente.map((sesion, index) => ({
      sesion_id: sesion.id,
      fecha: sesion.fecha || today,
      numero_sesion: index + 1,
      firma_paciente: '',
      firma_profesional: '',
      observacion: sesion.observacion || ''
    }));
  };

  const selectPaciente = (pacienteId) => {
    const paciente = pacientes.find((item) => Number(item.id) === Number(pacienteId));
    const historiasDelPaciente = historias.filter((historia) => Number(historia.paciente_id || historia.paciente?.id) === Number(pacienteId));
    const historiaUnica = historiasDelPaciente.length === 1 ? historiasDelPaciente[0] : null;
    const sesionesPaciente = sesionesDesdePaciente(pacienteId, sesionesRegistradas, historiaUnica?.id || '');
    setForm({
      ...form,
      paciente_id: pacienteId,
      historia_clinica_id: historiaUnica?.id || '',
      diagnostico: historiaUnica?.diagnostico_medico || paciente?.referencia || '',
      fecha_inicio: sesionesPaciente[0]?.fecha || form.fecha_inicio,
      fecha_fin: sesionesPaciente.at(-1)?.fecha || form.fecha_fin,
      sesiones: sesionesPaciente.length ? sesionesPaciente : form.sesiones
    });
  };

  const selectHistoria = (historiaId) => {
    const historia = historias.find((item) => Number(item.id) === Number(historiaId));
    const sesionesHistoria = sesionesDesdePaciente(form.paciente_id, sesionesRegistradas, historiaId);
    setForm({
      ...form,
      historia_clinica_id: historiaId,
      diagnostico: historia?.diagnostico_medico || historia?.evaluacion_final?.diagnostico_kinesico_cif || '',
      fecha_inicio: sesionesHistoria[0]?.fecha || historia?.fecha_evaluacion || form.fecha_inicio,
      fecha_fin: sesionesHistoria.at(-1)?.fecha || form.fecha_fin,
      sesiones: sesionesHistoria.length ? sesionesHistoria : [{ sesion_id: '', fecha: historia?.fecha_evaluacion || today, numero_sesion: 1, firma_paciente: '', firma_profesional: '', observacion: '' }]
    });
  };

  const cargarSesionesPaciente = () => {
    const sesionesPaciente = sesionesDesdePaciente(form.paciente_id);
    if (!sesionesPaciente.length) return;
    setForm({
      ...form,
      fecha_inicio: sesionesPaciente[0].fecha,
      fecha_fin: sesionesPaciente.at(-1).fecha,
      sesiones: sesionesPaciente
    });
  };

  const updateSesion = (index, key, value) => {
    const sesiones = form.sesiones.map((sesion, currentIndex) => (currentIndex === index ? { ...sesion, [key]: value } : sesion));
    setForm({ ...form, sesiones });
  };

  const addSesion = () => {
    const last = form.sesiones.at(-1);
    const nextNumber = Math.max(0, ...form.sesiones.map((sesion) => Number(sesion.numero_sesion || 0))) + 1;
    setForm({
      ...form,
      sesiones: [...form.sesiones, { sesion_id: '', fecha: last?.fecha || today, numero_sesion: nextNumber, firma_paciente: '', firma_profesional: '', observacion: '' }]
    });
  };

  const removeSesion = (index) => {
    setForm({ ...form, sesiones: form.sesiones.filter((_, currentIndex) => currentIndex !== index) });
  };

  const validate = () => {
    if (!form.paciente_id) return 'Selecciona un paciente.';
    if (!form.historia_clinica_id) return 'Selecciona la historia clínica relacionada.';
    const usados = new Set();
    for (const sesion of form.sesiones) {
      if (!sesion.fecha) return 'Cada sesion debe tener fecha.';
      if (!sesion.numero_sesion) return 'Cada sesion debe tener numero.';
      if (usados.has(Number(sesion.numero_sesion))) return 'No se permiten numeros de sesion duplicados.';
      usados.add(Number(sesion.numero_sesion));
    }
    return '';
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    try {
      const payload = cleanPayload({
        ...form,
        sesiones: form.sesiones.map((sesion) => ({ ...sesion, numero_sesion: Number(sesion.numero_sesion) }))
      });
      editing ? await updatePlanillaAtencion(editing, payload) : await createPlanillaAtencion(payload);
      setForm(initialForm);
      setEditing(null);
      setActivePanel('listado');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const editPlanilla = (planilla) => {
    setEditing(planilla.id);
    setForm({
      paciente_id: planilla.paciente_id || planilla.paciente?.id || '',
      historia_clinica_id: planilla.historia_clinica_id || planilla.historia_clinica?.id || '',
      fecha_inicio: planilla.fecha_inicio || today,
      fecha_fin: planilla.fecha_fin || today,
      diagnostico: planilla.diagnostico || '',
      observacion: planilla.observacion || '',
      sesiones: (planilla.sesiones || []).map((sesion) => ({
        sesion_id: sesion.sesion_id || sesion.sesion_registrada?.id || '',
        fecha: sesion.fecha || today,
        numero_sesion: sesion.numero_sesion || '',
        firma_paciente: sesion.firma_paciente || '',
        firma_profesional: sesion.firma_profesional || '',
        observacion: sesion.observacion || ''
      }))
    });
    setSelectedPlanilla(null);
    setActivePanel('crear');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const printPlanilla = (planilla = previewPlanilla) => {
    setSelectedPlanilla(planilla);
    setTimeout(() => window.print(), 100);
  };

  const downloadPdf = async (planilla = previewPlanilla) => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-10000px';
    wrapper.style.top = '0';
    wrapper.style.background = '#fff';
    document.body.appendChild(wrapper);

    const root = document.createElement('div');
    wrapper.appendChild(root);

    const pdfRoot = createRoot(root);
    pdfRoot.render(<PlanillaDocumento planilla={planilla} paciente={planilla?.paciente || pacienteSeleccionado} />);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const canvas = await html2canvas(root.firstElementChild, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    addCanvasToA4Pdf({ canvas, pdf });
    pdf.save(`planilla-atencion-${nombrePaciente(planilla?.paciente || pacienteSeleccionado).replaceAll(' ', '-') || 'paciente'}.pdf`.toLowerCase());
    pdfRoot.unmount();
    document.body.removeChild(wrapper);
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="module-hero">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-brand-700">Control de firmas</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">Planilla de Atención y Asistencia</h2>
            <span className="mt-2 block text-sm font-medium text-slate-600">Crea, edita, imprime y descarga la planilla individual del paciente.</span>
          </div>
          <span className="grid h-14 w-14 place-items-center self-center rounded-xl border border-brand-200 bg-white/75 text-brand-700 shadow-sm">
            <ClipboardCheck size={30} />
          </span>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-ink">Planillas generadas</h3>
                <p className="text-sm text-slate-500">Registros vinculados al historial del paciente.</p>
              </div>
              <Button onClick={() => {
                setEditing(null);
                setForm(initialForm);
                setActivePanel('crear');
              }}>
                <Plus size={17} />
                Crear planilla
              </Button>
            </div>
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                <Search size={17} className="shrink-0 text-slate-500" />
                <input
                  className="w-full border-0 bg-transparent p-0 text-sm text-ink shadow-none placeholder:text-slate-400 focus:ring-0"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por paciente, diagnostico o fecha"
                />
              </label>
              <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{filteredPlanillas.length} resultados</span>
            </div>
            <Table
              columns={['Paciente', 'Inicio', 'Fin', 'Dx', 'Sesiones', 'Acciones']}
              rows={filteredPlanillas.map((planilla) => [
                <PatientIdentity paciente={planilla.paciente} secondary={`CI: ${planilla.paciente?.ci || 'Sin dato'}`} />,
                formatDate(planilla.fecha_inicio),
                formatDate(planilla.fecha_fin),
                planilla.diagnostico || 'Sin diagnostico',
                planilla.sesiones?.length || 0,
                <div className="flex flex-wrap gap-2">
                  <ActionButton label="Ver planilla" icon={Eye} tone="view" onClick={() => setSelectedPlanilla(planilla)} />
                  <ActionButton label="Editar planilla" icon={FilePenLine} tone="edit" onClick={() => editPlanilla(planilla)} />
                  <ActionButton label="Imprimir planilla" icon={Printer} tone="print" onClick={() => printPlanilla(planilla)} />
                  <ActionButton label="Descargar PDF" icon={Download} tone="download" onClick={() => downloadPdf(planilla)} />
                  {isAdmin && <ActionButton label="Eliminar planilla" icon={Trash2} tone="delete" onClick={() => deletePlanillaAtencion(planilla.id).then(load)} />}
                </div>
              ])}
              empty="No hay planillas registradas."
            />
          </div>
        </div>
      </div>

      <Modal
        open={activePanel === 'crear'}
        title={editing ? 'Editar planilla' : 'Nueva planilla'}
        subtitle="Completa las sesiones vinculadas y revisa el documento antes de guardar."
        onClose={() => {
          setActivePanel('listado');
          setEditing(null);
        }}
        size="planilla"
      >
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[55%_45%] lg:overflow-hidden">
            <div className="grid content-start gap-3 overflow-y-auto border-r border-slate-200 p-3 lg:p-4">
              <section className="rounded-lg border border-brand-100 bg-brand-50/30 p-3">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-ink"><ClipboardCheck size={16} className="text-brand-700" />Datos del paciente y planilla</h3>
                <div className="grid gap-2 md:grid-cols-6">
                  <Input compact className="md:col-span-3" label="Paciente" value={form.paciente_id} onChange={(e) => selectPaciente(e.target.value)} options={[{ value: '', label: 'Seleccionar paciente' }, ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))]} />
                  <Input compact className="md:col-span-3" label="Historia clínica" value={form.historia_clinica_id} onChange={(e) => selectHistoria(e.target.value)} options={[{ value: '', label: historiasPaciente.length ? `Seleccionar entre ${historiasPaciente.length} historias` : 'Sin historias clínicas' }, ...historiasPaciente.map((historia) => ({ value: historia.id, label: `${formatDate(historia.fecha_evaluacion)} · ${historia.condicion_actual?.zona_cuerpo || historia.motivo_consulta || historia.diagnostico_medico || 'Historia clínica'}` }))]} disabled={!form.paciente_id || !historiasPaciente.length} />
                  <Input compact className="md:col-span-2" label="Edad" value={pacienteSeleccionado?.edad || ''} disabled />
                  <Input compact className="md:col-span-2" label="Fecha inicio" type="date" value={form.fecha_inicio} onChange={(e) => update('fecha_inicio', e.target.value)} />
                  <Input compact className="md:col-span-2" label="Fecha fin" type="date" value={form.fecha_fin} onChange={(e) => update('fecha_fin', e.target.value)} />
                  <Input compact className="md:col-span-6" label="Diagnóstico / Dx" value={form.diagnostico} onChange={(e) => update('diagnostico', e.target.value)} />
                  <Input compact label="Observación" value={form.observacion} onChange={(e) => update('observacion', e.target.value)} multiline className="md:col-span-6" />
                </div>
              </section>

              {form.paciente_id && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs font-semibold text-slate-600">
                  <span>Sesiones registradas vinculadas: <strong className="text-ink">{sesionesPacienteSeleccionado.length}</strong></span>
                  <Button className="min-h-8 px-2 text-xs" variant="ghost" onClick={cargarSesionesPaciente} disabled={sesionesPacienteSeleccionado.length === 0}>Usar fechas registradas</Button>
                </div>
              )}

              <section className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                  <h4 className="text-sm font-black text-ink">Sesiones</h4>
                  <Button className="min-h-8 px-2 text-xs" variant="ghost" onClick={addSesion}><Plus size={15} />Agregar sesión</Button>
                </div>
                <div className="max-h-[225px] overflow-y-auto overflow-x-hidden">
                  <table className="w-full table-fixed border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] font-black uppercase text-slate-500">
                      <tr>
                        <th className="w-[25%] border-b border-slate-200 px-2 py-2 text-left">Fecha</th>
                        <th className="w-[14%] border-b border-slate-200 px-2 py-2 text-left">N.º sesión</th>
                        <th className="w-[25%] border-b border-slate-200 px-2 py-2 text-left">Firma paciente</th>
                        <th className="w-[28%] border-b border-slate-200 px-2 py-2 text-left">Firma profesional</th>
                        <th className="w-[8%] border-b border-slate-200 px-1 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.sesiones.map((sesion, index) => (
                        <tr key={index} className="hover:bg-brand-50/30">
                          <td className="p-1"><input aria-label={`Fecha sesión ${index + 1}`} className="h-8 w-full min-w-0 rounded-md border border-slate-200 px-1.5 text-[11px]" type="date" value={sesion.fecha} onChange={(e) => updateSesion(index, 'fecha', e.target.value)} /></td>
                          <td className="p-1"><input aria-label={`Número sesión ${index + 1}`} className="h-8 w-full min-w-0 rounded-md border border-slate-200 px-1 text-center" type="number" min="1" value={sesion.numero_sesion} onChange={(e) => updateSesion(index, 'numero_sesion', e.target.value)} /></td>
                          <td className="p-1"><input aria-label={`Firma paciente sesión ${index + 1}`} className="h-8 w-full min-w-0 rounded-md border border-slate-200 px-1.5" value={sesion.firma_paciente} onChange={(e) => updateSesion(index, 'firma_paciente', e.target.value)} placeholder="________" /></td>
                          <td className="p-1"><input aria-label={`Firma profesional sesión ${index + 1}`} className="h-8 w-full min-w-0 rounded-md border border-slate-200 px-1.5" value={sesion.firma_profesional} onChange={(e) => updateSesion(index, 'firma_profesional', e.target.value)} placeholder="________" /></td>
                          <td className="p-1 text-center"><ActionButton label="Eliminar fila" icon={Trash2} tone="delete" className="h-7 w-7" onClick={() => removeSesion(index)} /></td>
                        </tr>
                      ))}
                      {form.sesiones.length === 0 && <tr><td colSpan="5" className="px-3 py-5 text-center font-semibold text-slate-400">Agrega una sesión para comenzar.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <Button className="lg:hidden" variant="secondary" onClick={() => setShowPreview(true)}><Eye size={16} />Ver vista previa</Button>
            </div>

            <aside className="hidden min-h-0 flex-col bg-slate-50 p-3 lg:flex">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div><h3 className="text-sm font-black text-ink">Vista tipo documento</h3><p className="text-xs text-slate-500">Formato listo para imprimir o descargar.</p></div>
                <Button className="min-h-8 px-2 text-xs" variant="secondary" onClick={() => setShowPreview(true)}><Maximize2 size={14} />Ampliar vista previa</Button>
              </div>
              <div className="relative min-h-[420px] max-h-[620px] flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-slate-200/60 p-2">
                <div className="relative mx-auto h-[552px] w-full overflow-hidden">
                  <div ref={printRef} className="absolute left-1/2 top-0 w-[210mm] origin-top -translate-x-1/2 scale-[0.52]">
                    <PlanillaDocumento planilla={previewPlanilla} paciente={pacienteSeleccionado} />
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-2.5">
            <Button className="min-h-9" variant="ghost" onClick={() => { setEditing(null); setForm(initialForm); setActivePanel('listado'); }}>Cancelar</Button>
            <Button className="min-h-9" variant="ghost" onClick={() => printPlanilla()}><Printer size={16} />Imprimir</Button>
            <Button className="min-h-9" variant="ghost" onClick={() => downloadPdf()}><Download size={16} />Descargar PDF</Button>
            <Button className="min-h-9" type="submit"><Save size={16} />Guardar planilla</Button>
          </footer>
        </form>
      </Modal>

      <Modal open={showPreview} title="Vista previa de planilla" onClose={() => setShowPreview(false)} size="lg">
        <div ref={printRef} className="max-h-[75vh] overflow-auto bg-slate-100 p-4">
          <PlanillaDocumento planilla={previewPlanilla} paciente={pacienteSeleccionado} />
        </div>
      </Modal>

      <Modal open={Boolean(selectedPlanilla)} title="Planilla de atencion" onClose={() => setSelectedPlanilla(null)} size="lg">
        <div data-clinical-print className="max-h-[75vh] overflow-auto bg-slate-100 p-4">
          <PlanillaDocumento planilla={selectedPlanilla} />
        </div>
      </Modal>
    </section>
  );
}

export default PlanillasAtencion;

