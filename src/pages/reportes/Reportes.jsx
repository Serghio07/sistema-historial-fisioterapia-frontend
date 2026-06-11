import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Eye, FilePenLine, FileText, Printer, Save, TableProperties, Trash2 } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { useAuth } from '../../context/AuthContext';
import { createInformeMedico, deleteInformeMedico, getInformesMedicos, updateInformeMedico } from '../../services/informeMedicoService';
import { getPacientes } from '../../services/pacienteService';
import { formatDate } from '../../utils/formatDate';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import logo from '../../assets/logos/logo.png';

const initialForm = {
  paciente_id: '',
  fecha: new Date().toISOString().slice(0, 10),
  doctor: '',
  diagnostico: '',
  dx_cie: '',
  antecedentes: '',
  conclusion_diagnostica: '',
  cantidad_sesiones: '',
  tratamiento_fisioterapeutico: '',
  medicamentos: '',
  estado_actual: '',
  observacion_final: ''
};

function PrintableReport({ informe, pacientes }) {
  const paciente = informe?.paciente || pacientes.find((item) => Number(item.id) === Number(informe?.paciente_id));
  const tratamientoItems = (informe?.tratamiento_fisioterapeutico || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const conclusionItems = (informe?.conclusion_diagnostica || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-12 py-10 font-sans text-[15px] leading-6 text-slate-900 shadow-soft print:shadow-none">
      <header className="relative border-b border-slate-900 pb-2">
        <img src={logo} alt="Physio Active" className="absolute left-0 top-0 h-28 w-32 object-contain" />
        <div className="pt-28 text-center">
          <h1 className="text-xl font-black uppercase">FISIOTERAPIA Y KINESIOLOGIA</h1>
          <p className="mt-3 text-xl font-black uppercase">MEDICINA FISICA Y REHABILITACION</p>
        </div>
      </header>

      <section className="mt-5 grid gap-4">
        <p className="text-xl"><strong>PACIENTE:</strong> {nombrePaciente(paciente).toUpperCase()}</p>
        <p className="text-xl"><strong>FECHA:</strong> <span className="ml-4">{formatDate(informe?.fecha)}</span></p>
        <p className="text-xl font-black">{informe?.doctor || 'Doctor / Fisioterapeuta'}</p>
        <p className="text-xl"><strong>DX:</strong> <strong>{informe?.diagnostico || 'Sin diagnostico'}</strong></p>
        <p className="text-justify text-lg leading-7">
          <span className="font-bold underline">Dx&nbsp;&nbsp;Cif.</span>
          <span className="ml-4">{informe?.dx_cie || 'Sin descripcion clinica'}</span>
        </p>
      </section>

      <section className="mt-5 grid gap-5 text-lg leading-7">
        <div>
          <h3 className="font-black underline">1.- ANTECEDENTES:</h3>
          <p className="mt-3 whitespace-pre-wrap text-justify">{informe?.antecedentes || 'Sin antecedentes registrados.'}</p>
        </div>

        <div>
          <h3 className="font-black">
            2.- <span className="underline">Conclusion Diagnostica:</span>
            <span className="font-normal"> A las pruebas semiologicas se evidencia lo siguiente.</span>
          </h3>
          {conclusionItems.length ? (
            <ul className="ml-12 mt-2 list-disc">
              {conclusionItems.map((item) => (
                <li key={item} className="uppercase">{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 ml-6">Sin conclusion diagnostica.</p>
          )}
        </div>

        <div>
          <h3 className="font-black">
            3.- Tratamiento Fisioterapeutico y de medicina fisica
            {informe?.cantidad_sesiones ? <span> ( <span className="underline">{informe.cantidad_sesiones} sesiones</span> )</span> : null}
          </h3>
          {tratamientoItems.length ? (
            <ul className="ml-12 mt-2 list-disc">
              {tratamientoItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">Sin tratamiento registrado.</p>
          )}
          {informe?.medicamentos ? (
            <p className="mt-2 whitespace-pre-wrap text-justify">
              <strong>Farmacologicamente:</strong> {informe.medicamentos}
            </p>
          ) : null}
        </div>

        <p className="mt-8 whitespace-pre-wrap text-justify">{informe?.estado_actual || 'Paciente a la actualidad dado de alta post recuperacion funcional de su patologia.'}</p>
        <p>{informe?.observacion_final || 'Es cuanto debo informar para fines del interesado'}</p>
      </section>
    </article>
  );
}

function Reportes() {
  const { isAdmin } = useAuth();
  const printRef = useRef(null);
  const [pacientes, setPacientes] = useState([]);
  const [informes, setInformes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [selectedInforme, setSelectedInforme] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState('generar');

  const previewInforme = useMemo(() => ({ ...form, paciente: pacientes.find((item) => Number(item.id) === Number(form.paciente_id)) }), [form, pacientes]);

  const load = async () => {
    setLoading(true);
    try {
      const [pacientesData, informesData] = await Promise.all([getPacientes(), getInformesMedicos()]);
      setPacientes(pacientesData);
      setInformes(informesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key, value) => setForm({ ...form, [key]: value });

  const validate = () => {
    if (!form.paciente_id) return 'Selecciona un paciente.';
    if (!form.fecha) return 'La fecha es obligatoria.';
    if (!form.diagnostico) return 'El diagnostico es obligatorio.';
    return '';
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    try {
      const payload = cleanPayload(form);
      editing ? await updateInformeMedico(editing, payload) : await createInformeMedico(payload);
      setForm(initialForm);
      setEditing(null);
      setMessage('Informe medico guardado correctamente.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const editInforme = (informe) => {
    setEditing(informe.id);
    setForm({
      paciente_id: informe.paciente_id || informe.paciente?.id || '',
      fecha: informe.fecha || new Date().toISOString().slice(0, 10),
      doctor: informe.doctor || '',
      diagnostico: informe.diagnostico || '',
      dx_cie: informe.dx_cie || '',
      antecedentes: informe.antecedentes || '',
      conclusion_diagnostica: informe.conclusion_diagnostica || '',
      cantidad_sesiones: informe.cantidad_sesiones || '',
      tratamiento_fisioterapeutico: informe.tratamiento_fisioterapeutico || '',
      medicamentos: informe.medicamentos || '',
      estado_actual: informe.estado_actual || '',
      observacion_final: informe.observacion_final || ''
    });
    setActivePanel('generar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPrintableHtml = (informe) => {
    const paciente = informe?.paciente || pacientes.find((item) => Number(item.id) === Number(informe?.paciente_id));
    const safe = (value) => value || 'Sin dato';
    const conclusionItems = (informe?.conclusion_diagnostica || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    const tratamientoItems = (informe?.tratamiento_fisioterapeutico || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    return `
      <article style="width: 210mm; min-height: 297mm; padding: 18mm 20mm; font-family: Arial, sans-serif; color: #0f172a; font-size: 16px; line-height: 1.42;">
        <header style="position: relative; border-bottom: 1px solid #0f172a; padding-bottom: 8px;">
          <img src="${logo}" style="position: absolute; left: 0; top: 0; height: 110px; width: 130px; object-fit: contain;" />
          <div style="padding-top: 112px; text-align: center;">
            <h1 style="font-size: 22px; margin: 0; font-weight: 900;">FISIOTERAPIA Y KINESIOLOGIA</h1>
            <p style="font-size: 21px; margin: 12px 0 0; font-weight: 900;">MEDICINA FISICA Y REHABILITACION</p>
          </div>
        </header>
        <section style="margin-top: 18px;">
          <p style="font-size: 20px; margin: 0 0 12px;"><strong>PACIENTE:</strong> ${nombrePaciente(paciente).toUpperCase()}</p>
          <p style="font-size: 20px; margin: 0 0 18px;"><strong>FECHA:</strong><span style="margin-left: 20px;">${formatDate(informe?.fecha)}</span></p>
          <p style="font-size: 20px; font-weight: 900; margin: 0 0 18px;">${safe(informe?.doctor)}</p>
          <p style="font-size: 20px; margin: 0 0 14px;"><strong>DX:</strong> <strong>${safe(informe?.diagnostico)}</strong></p>
          <p style="font-size: 18px; text-align: justify; margin: 0 0 18px;"><strong><u>Dx&nbsp;&nbsp;Cif.</u></strong><span style="margin-left: 16px;">${safe(informe?.dx_cie)}</span></p>
        </section>
        <section style="font-size: 18px;">
          <h3 style="font-weight: 900; text-decoration: underline; margin: 0 0 12px;">1.- ANTECEDENTES:</h3>
          <p style="white-space: pre-wrap; text-align: justify; margin: 0 0 18px;">${safe(informe?.antecedentes)}</p>
          <h3 style="font-weight: 900; margin: 0 0 8px;">2.- <span style="text-decoration: underline;">Conclusion Diagnostica:</span> <span style="font-weight: 400;">A las pruebas semiologicas se evidencia lo siguiente.</span></h3>
          ${
            conclusionItems.length
              ? `<ul style="margin: 8px 0 18px 48px;">${conclusionItems.map((item) => `<li style="text-transform: uppercase;">${item}</li>`).join('')}</ul>`
              : `<p style="margin: 8px 0 18px 24px;">Sin conclusion diagnostica.</p>`
          }
          <h3 style="font-weight: 900; margin: 0 0 8px;">3.- Tratamiento Fisioterapeutico y de medicina fisica ${
            informe?.cantidad_sesiones ? `( <u>${informe.cantidad_sesiones} sesiones</u> )` : ''
          }</h3>
          ${
            tratamientoItems.length
              ? `<ul style="margin: 8px 0 10px 48px;">${tratamientoItems.map((item) => `<li>${item}</li>`).join('')}</ul>`
              : `<p style="margin: 8px 0 10px;">Sin tratamiento registrado.</p>`
          }
          ${informe?.medicamentos ? `<p style="white-space: pre-wrap; text-align: justify; margin: 0 0 28px;"><strong>Farmacologicamente:</strong> ${informe.medicamentos}</p>` : ''}
          <p style="white-space: pre-wrap; text-align: justify; margin: 46px 0 18px;">${informe?.estado_actual || 'Paciente a la actualidad dado de alta post recuperacion funcional de su patologia.'}</p>
          <p style="margin: 0;">${informe?.observacion_final || 'Es cuanto debo informar para fines del interesado'}</p>
        </section>
      </article>
    `;
  };

  const printInforme = (informe = previewInforme) => {
    const html = renderPrintableHtml(informe);
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Informe medico</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; }
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const downloadInformePdf = async (informe = previewInforme) => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-10000px';
    wrapper.style.top = '0';
    wrapper.style.background = '#ffffff';
    wrapper.innerHTML = renderPrintableHtml(informe);
    document.body.appendChild(wrapper);

    const reportElement = wrapper.firstElementChild;
    const canvas = await html2canvas(reportElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const paciente = informe?.paciente || pacientes.find((item) => Number(item.id) === Number(informe?.paciente_id));
    const fileName = `informe-${nombrePaciente(paciente).replaceAll(' ', '-') || 'paciente'}.pdf`.toLowerCase();
    pdf.save(fileName);
    document.body.removeChild(wrapper);
  };

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <div className="page-title">
        <div>
          <p>Informes</p>
          <h2>Informes Medicos</h2>
          <span>Plantilla rapida para fisioterapia y rehabilitacion.</span>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => setActivePanel('generar')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activePanel === 'generar' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <FileText size={17} />
            Para generar
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('generados')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
              activePanel === 'generados' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            <TableProperties size={17} />
            Informes generados
          </button>
        </div>

        <div className="p-4">
          {activePanel === 'generar' ? (
            <div className="grid gap-5 xl:grid-cols-[520px_1fr]">
              <form onSubmit={submit} className="panel grid gap-4">
                <h3 className="text-lg font-bold text-ink">{editing ? 'Editar informe' : 'Nuevo informe'}</h3>
                <div className="form-grid">
                  <Input
                    label="Paciente"
                    value={form.paciente_id}
                    onChange={(e) => update('paciente_id', e.target.value)}
                    options={[
                      { value: '', label: 'Seleccionar paciente' },
                      ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))
                    ]}
                  />
                  <Input label="Fecha" type="date" value={form.fecha} onChange={(e) => update('fecha', e.target.value)} />
                  <Input label="Doctor / Fisioterapeuta" value={form.doctor} onChange={(e) => update('doctor', e.target.value)} />
                  <Input label="Cantidad de sesiones" type="number" min="0" value={form.cantidad_sesiones} onChange={(e) => update('cantidad_sesiones', e.target.value)} />
                  <Input label="Diagnostico" value={form.diagnostico} onChange={(e) => update('diagnostico', e.target.value)} multiline className="md:col-span-2" />
                  <Input label="DX CIE / Descripcion clinica" value={form.dx_cie} onChange={(e) => update('dx_cie', e.target.value)} multiline className="md:col-span-2" />
                  <Input label="Antecedentes" value={form.antecedentes} onChange={(e) => update('antecedentes', e.target.value)} multiline className="md:col-span-2" />
                  <Input label="Conclusion diagnostica" value={form.conclusion_diagnostica} onChange={(e) => update('conclusion_diagnostica', e.target.value)} multiline className="md:col-span-2" />
                  <Input label="Tratamiento fisioterapeutico" value={form.tratamiento_fisioterapeutico} onChange={(e) => update('tratamiento_fisioterapeutico', e.target.value)} multiline className="md:col-span-2" />
                  <Input label="Medicamentos / Farmacos" value={form.medicamentos} onChange={(e) => update('medicamentos', e.target.value)} multiline className="md:col-span-2" />
                  <Input label="Estado actual del paciente" value={form.estado_actual} onChange={(e) => update('estado_actual', e.target.value)} multiline className="md:col-span-2" />
                  <Input label="Observacion final" value={form.observacion_final} onChange={(e) => update('observacion_final', e.target.value)} multiline className="md:col-span-2" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">
                    <Save size={17} />
                    Guardar informe
                  </Button>
                  <Button variant="secondary" onClick={() => setShowPreview(true)}>
                    <Eye size={17} />
                    Vista previa
                  </Button>
                  <Button variant="ghost" onClick={() => printInforme()}>
                    <Printer size={17} />
                    Imprimir
                  </Button>
                  <Button variant="ghost" onClick={() => downloadInformePdf()}>
                    <Download size={17} />
                    Descargar PDF
                  </Button>
                  {editing && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing(null);
                        setForm(initialForm);
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>

              <div className="panel overflow-auto">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-ink">Vista previa A4</h3>
                    <p className="text-sm text-slate-500">Asi se vera al imprimir o guardar como PDF.</p>
                  </div>
                </div>
                <div id="printable-report" ref={printRef} className="bg-slate-100 p-4">
                  <PrintableReport informe={previewInforme} pacientes={pacientes} />
                </div>
              </div>
            </div>
          ) : (
            <div className="panel">
              <h3 className="mb-4 text-lg font-bold text-ink">Informes generados</h3>
              <Table
                columns={['Paciente', 'Fecha', 'Diagnostico', 'Doctor', 'Acciones']}
                rows={informes.map((informe) => [
                  nombrePaciente(informe.paciente),
                  formatDate(informe.fecha),
                  informe.diagnostico,
                  informe.doctor || 'Sin dato',
                  <div className="flex flex-wrap gap-2">
                    <ActionButton label="Ver informe" icon={Eye} tone="view" onClick={() => setSelectedInforme(informe)} />
                    <ActionButton label="Editar informe" icon={FilePenLine} tone="edit" onClick={() => editInforme(informe)} />
                    <ActionButton label="Imprimir informe" icon={Printer} tone="print" onClick={() => printInforme(informe)} />
                    <ActionButton label="Descargar PDF" icon={Download} tone="download" onClick={() => downloadInformePdf(informe)} />
                    {isAdmin && (
                      <ActionButton label="Eliminar informe" icon={Trash2} tone="delete" onClick={() => deleteInformeMedico(informe.id).then(load)} />
                    )}
                  </div>
                ])}
                empty="No hay informes medicos generados."
              />
            </div>
          )}
        </div>
      </div>

      <Modal open={showPreview} title="Vista previa del informe" onClose={() => setShowPreview(false)} size="lg">
        <div className="max-h-[75vh] overflow-auto bg-slate-100 p-4">
          <PrintableReport informe={previewInforme} pacientes={pacientes} />
        </div>
      </Modal>

      <Modal open={Boolean(selectedInforme)} title="Informe medico" onClose={() => setSelectedInforme(null)} size="lg">
        <div className="max-h-[75vh] overflow-auto bg-slate-100 p-4">
          <PrintableReport informe={selectedInforme} pacientes={pacientes} />
        </div>
      </Modal>
    </section>
  );
}

export default Reportes;
