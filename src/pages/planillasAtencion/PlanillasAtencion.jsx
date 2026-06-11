import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ClipboardCheck, Download, Eye, FilePenLine, Plus, Printer, Save, TableProperties, Trash2 } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { useAuth } from '../../context/AuthContext';
import { getPacientes } from '../../services/pacienteService';
import { createPlanillaAtencion, deletePlanillaAtencion, getPlanillasAtencion, updatePlanillaAtencion } from '../../services/planillaAtencionService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import PlanillaDocumento from './PlanillaDocumento';

const today = new Date().toISOString().slice(0, 10);

const initialForm = {
  paciente_id: '',
  fecha_inicio: today,
  fecha_fin: today,
  diagnostico: '',
  observacion: '',
  sesiones: [{ fecha: today, numero_sesion: 1, firma_paciente: '', firma_profesional: '', observacion: '' }]
};

function PlanillasAtencion() {
  const { isAdmin } = useAuth();
  const printRef = useRef(null);
  const [searchParams] = useSearchParams();
  const [pacientes, setPacientes] = useState([]);
  const [planillas, setPlanillas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [activePanel, setActivePanel] = useState('crear');
  const [selectedPlanilla, setSelectedPlanilla] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pacienteInicialId = searchParams.get('paciente_id');

  const pacienteSeleccionado = useMemo(
    () => pacientes.find((paciente) => Number(paciente.id) === Number(form.paciente_id)),
    [pacientes, form.paciente_id]
  );

  const previewPlanilla = useMemo(() => ({ ...form, paciente: pacienteSeleccionado }), [form, pacienteSeleccionado]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pacientesData, planillasData] = await Promise.all([getPacientes(), getPlanillasAtencion()]);
      setPacientes(pacientesData);
      setPlanillas(planillasData);
      if (pacienteInicialId && !form.paciente_id) {
        const paciente = pacientesData.find((item) => Number(item.id) === Number(pacienteInicialId));
        setForm((current) => ({
          ...current,
          paciente_id: pacienteInicialId,
          diagnostico: current.diagnostico || paciente?.referencia || ''
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

  const update = (key, value) => setForm({ ...form, [key]: value });

  const selectPaciente = (pacienteId) => {
    const paciente = pacientes.find((item) => Number(item.id) === Number(pacienteId));
    setForm({
      ...form,
      paciente_id: pacienteId,
      diagnostico: form.diagnostico || paciente?.referencia || ''
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
      sesiones: [...form.sesiones, { fecha: last?.fecha || today, numero_sesion: nextNumber, firma_paciente: '', firma_profesional: '', observacion: '' }]
    });
  };

  const removeSesion = (index) => {
    setForm({ ...form, sesiones: form.sesiones.filter((_, currentIndex) => currentIndex !== index) });
  };

  const validate = () => {
    if (!form.paciente_id) return 'Selecciona un paciente.';
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
      setMessage('Planilla guardada correctamente.');
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
      fecha_inicio: planilla.fecha_inicio || today,
      fecha_fin: planilla.fecha_fin || today,
      diagnostico: planilla.diagnostico || '',
      observacion: planilla.observacion || '',
      sesiones: (planilla.sesiones || []).map((sesion) => ({
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
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(`planilla-atencion-${nombrePaciente(planilla?.paciente || pacienteSeleccionado).replaceAll(' ', '-') || 'paciente'}.pdf`.toLowerCase());
    pdfRoot.unmount();
    document.body.removeChild(wrapper);
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="grid gap-4 bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase text-brand-50">Control de firmas</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Planilla de Atencion y Asistencia</h2>
            <span className="mt-2 block text-sm text-brand-50">Crea, edita, imprime y descarga la planilla individual del paciente.</span>
          </div>
          <ClipboardCheck size={54} className="self-center text-brand-50" />
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
          <button type="button" onClick={() => setActivePanel('crear')} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${activePanel === 'crear' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'}`}>
            <Plus size={17} />
            Crear planilla
          </button>
          <button type="button" onClick={() => setActivePanel('listado')} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${activePanel === 'listado' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'}`}>
            <TableProperties size={17} />
            Planillas generadas
          </button>
        </div>

        <div className="p-4">
          {activePanel === 'crear' ? (
            <div className="grid gap-5 xl:grid-cols-[560px_1fr]">
              <form onSubmit={submit} className="panel grid gap-4">
                <h3 className="text-lg font-bold text-ink">{editing ? 'Editar planilla' : 'Nueva planilla'}</h3>
                <div className="form-grid">
                  <Input
                    label="Paciente"
                    value={form.paciente_id}
                    onChange={(e) => selectPaciente(e.target.value)}
                    options={[{ value: '', label: 'Seleccionar paciente' }, ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))]}
                  />
                  <Input label="Edad" value={pacienteSeleccionado?.edad || ''} disabled />
                  <Input label="Fecha inicio" type="date" value={form.fecha_inicio} onChange={(e) => update('fecha_inicio', e.target.value)} />
                  <Input label="Fecha fin" type="date" value={form.fecha_fin} onChange={(e) => update('fecha_fin', e.target.value)} />
                  <Input label="Diagnostico / Dx" value={form.diagnostico} onChange={(e) => update('diagnostico', e.target.value)} multiline className="md:col-span-2" />
                  <Input label="Observacion" value={form.observacion} onChange={(e) => update('observacion', e.target.value)} multiline className="md:col-span-2" />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="font-black text-ink">Sesiones</h4>
                    <Button variant="ghost" onClick={addSesion}>
                      <Plus size={17} />
                      Agregar sesion
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {form.sesiones.map((sesion, index) => (
                      <div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_110px_1fr_1fr_auto]">
                        <Input label="Fecha" type="date" value={sesion.fecha} onChange={(e) => updateSesion(index, 'fecha', e.target.value)} />
                        <Input label="Sesion" type="number" min="1" value={sesion.numero_sesion} onChange={(e) => updateSesion(index, 'numero_sesion', e.target.value)} />
                        <Input label="Firma Paciente" value={sesion.firma_paciente} onChange={(e) => updateSesion(index, 'firma_paciente', e.target.value)} placeholder="__________" />
                        <Input label="Firma Profesional" value={sesion.firma_profesional} onChange={(e) => updateSesion(index, 'firma_profesional', e.target.value)} placeholder="__________" />
                        <div className="flex items-end">
                          <ActionButton label="Eliminar fila" icon={Trash2} tone="delete" onClick={() => removeSesion(index)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit">
                    <Save size={17} />
                    Guardar planilla
                  </Button>
                  <Button variant="ghost" onClick={() => printPlanilla()}>
                    <Printer size={17} />
                    Imprimir
                  </Button>
                  <Button variant="ghost" onClick={() => downloadPdf()}>
                    <Download size={17} />
                    Descargar PDF
                  </Button>
                </div>
              </form>

              <div className="panel overflow-auto">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-ink">Vista tipo documento</h3>
                  <p className="text-sm text-slate-500">Formato listo para imprimir o descargar.</p>
                </div>
                <div ref={printRef} className="bg-slate-100 p-4">
                  <PlanillaDocumento planilla={previewPlanilla} paciente={pacienteSeleccionado} />
                </div>
              </div>
            </div>
          ) : (
            <div className="panel">
              <h3 className="mb-4 text-lg font-bold text-ink">Planillas generadas</h3>
              <Table
                columns={['Paciente', 'Inicio', 'Fin', 'Dx', 'Sesiones', 'Acciones']}
                rows={planillas
                  .filter((planilla) => !pacienteInicialId || Number(planilla.paciente_id || planilla.paciente?.id) === Number(pacienteInicialId))
                  .map((planilla) => [
                  nombrePaciente(planilla.paciente),
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
          )}
        </div>
      </div>

      <Modal open={Boolean(selectedPlanilla)} title="Planilla de atencion" onClose={() => setSelectedPlanilla(null)} size="lg">
        <div className="max-h-[75vh] overflow-auto bg-slate-100 p-4">
          <PlanillaDocumento planilla={selectedPlanilla} />
        </div>
      </Modal>
    </section>
  );
}

export default PlanillasAtencion;
