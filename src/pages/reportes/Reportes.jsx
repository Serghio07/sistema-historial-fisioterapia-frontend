import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import { Activity, CalendarDays, ChevronDown, ClipboardList, Download, Eye, FilePenLine, FileText, HeartPulse, Maximize2, MessageSquare, Plus, Printer, Save, Search, Stethoscope, Trash2, UserRound } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { PatientIdentity } from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { createInformeMedico, deleteInformeMedico, getInformesMedicos, updateInformeMedico } from '../../services/informeMedicoService';
import { getPacientes } from '../../services/pacienteService';
import { getHistoriasClinicas } from '../../services/historiaClinicaService';
import { getSesiones } from '../../services/sesionService';
import { formatDate } from '../../utils/formatDate';
import { matchesSearch } from '../../utils/search';
import { cleanPayload, nombrePaciente } from '../../utils/validators';
import logo from '../../assets/logos/logo.png';
import { boliviaDate } from '../../utils/boliviaDateTime';

const initialForm = {
  paciente_id: '',
  historia_clinica_id: '',
  fecha: boliviaDate(),
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

const isHistoriaActiva = (historia) => !historia?.anulada && (historia?.estado || 'activa') === 'activa';

const historiaLabel = (historia) => {
  const fecha = formatDate(historia?.fecha_evaluacion);
  const zona = historia?.condicion_actual?.zona_cuerpo || historia?.motivo_consulta || historia?.diagnostico_medico || 'Sin detalle';
  return `${fecha} - ${zona} - Activa`;
};

const isSesionRealizada = (sesion) => {
  const asistencia = String(sesion?.asistencia || '').toLowerCase();
  const descontar = sesion?.descontarSesion === true || sesion?.descontar_sesion === true;
  const anulada = sesion?.anulada === true || String(sesion?.estado || '').toLowerCase() === 'anulada';
  return !anulada && (asistencia === 'asistio' || descontar);
};

const sesionesRealizadasLabel = (cantidad) =>
  `${cantidad} ${cantidad === 1 ? 'SESION REALIZADA' : 'SESIONES REALIZADAS'}`;

const historiaToInformeFields = (historia) => {
  const antecedentes = historia?.antecedente_personal;
  const antecedentesTexto = [
    antecedentes?.patologicos ? antecedentes.detalle_patologicos || 'Antecedentes patologicos' : '',
    antecedentes?.hospitalarios ? antecedentes.detalle_hospitalarios || 'Antecedentes hospitalarios' : '',
    antecedentes?.quirurgicos ? antecedentes.detalle_quirurgicos || 'Antecedentes quirurgicos' : '',
    antecedentes?.traumaticos ? antecedentes.detalle_traumaticos || 'Antecedentes traumaticos' : '',
    antecedentes?.alergicos ? antecedentes.detalle_alergicos || 'Alergias' : '',
    antecedentes?.farmacologicos ? antecedentes.detalle_farmacologicos || 'Antecedentes farmacologicos' : '',
    antecedentes?.observaciones
  ].filter(Boolean).join('\n');

  return {
    diagnostico: historia?.diagnostico_medico || '',
    dx_cie: historia?.condicion_actual?.descripcion || historia?.enfermedad_actual || '',
    antecedentes: antecedentesTexto,
    conclusion_diagnostica: historia?.examen_kinesico?.pruebas_especificas || '',
    tratamiento_fisioterapeutico: historia?.evaluacion_final?.plan_tratamiento || '',
    medicamentos: historia?.intervencion_clinica?.observaciones || '',
    estado_actual: historia?.evaluacion_final?.diagnostico_kinesico_cif || ''
  };
};

function ReportSection({ icon: Icon, title, open, onToggle, children }) {
  return <section className="shrink-0 overflow-hidden rounded-xl border border-brand-100 bg-brand-50/20">
    <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left text-sm font-black text-brand-800">
      <span className="flex items-center gap-2"><Icon size={17} />{title}</span>
      <ChevronDown size={17} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open ? <div className="grid gap-4 border-t border-brand-100 p-4">{children}</div> : null}
  </section>;
}

function PrintableReport({ informe, pacientes }) {
  const paciente = informe?.paciente || pacientes.find((item) => Number(item.id) === Number(informe?.paciente_id));
  const sesionesRealizadas = Number(informe?.sesiones_realizadas || 0);
  const tratamientoItems = (informe?.tratamiento_fisioterapeutico || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const conclusionItems = (informe?.conclusion_diagnostica || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto min-h-[279mm] w-full max-w-[216mm] bg-white px-12 py-10 font-sans text-[15px] leading-6 text-slate-900 shadow-soft print:shadow-none">
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
            3.- Tratamiento Fisioterapeutico y de medicina fisica ({sesionesRealizadasLabel(sesionesRealizadas)}):
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
  const { isAdmin, user } = useAuth();
  const location = useLocation();
  const profesionalAutenticado = user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || '';
  const printRef = useRef(null);
  const [pacientes, setPacientes] = useState([]);
  const [historias, setHistorias] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [informes, setInformes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [selectedInforme, setSelectedInforme] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState('generados');
  const [query, setQuery] = useState('');
  const [reportSections, setReportSections] = useState({ clinical: false, evaluation: true, treatment: true, closing: true });

  const pacienteSeleccionado = useMemo(
    () => pacientes.find((item) => Number(item.id) === Number(form.paciente_id)),
    [pacientes, form.paciente_id]
  );

  const historiasPaciente = useMemo(
    () => historias
      .filter((historia) => Number(historia.paciente_id || historia.paciente?.id) === Number(form.paciente_id))
      .filter(isHistoriaActiva)
      .sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || Number(b.id || 0) - Number(a.id || 0)),
    [historias, form.paciente_id]
  );

  const historiaSeleccionada = useMemo(
    () => historiasPaciente.find((historia) => String(historia.id) === String(form.historia_clinica_id)),
    [historiasPaciente, form.historia_clinica_id]
  );

  const sesionesHistoriaSeleccionada = useMemo(
    () => sesiones.filter((sesion) => String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(form.historia_clinica_id)),
    [sesiones, form.historia_clinica_id]
  );

  const sesionesRealizadasHistoria = useMemo(
    () => form.historia_clinica_id ? sesionesHistoriaSeleccionada.filter(isSesionRealizada).length : 0,
    [form.historia_clinica_id, sesionesHistoriaSeleccionada]
  );

  const previewInforme = useMemo(
    () => ({
      ...form,
      paciente: pacienteSeleccionado,
      historia_clinica: historiaSeleccionada,
      cantidad_sesiones: sesionesRealizadasHistoria,
      sesiones_realizadas: sesionesRealizadasHistoria
    }),
    [form, pacienteSeleccionado, historiaSeleccionada, sesionesRealizadasHistoria]
  );

  const informeConSesionesRealizadas = (informe) => {
    if (!informe) return informe;
    const historiaId = informe.historia_clinica_id || informe.historia_clinica?.id;
    const sesionesRealizadas = historiaId
      ? sesiones
        .filter((sesion) => String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(historiaId))
        .filter(isSesionRealizada).length
      : Number(informe.sesiones_realizadas || informe.cantidad_sesiones || 0);
    return { ...informe, sesiones_realizadas: sesionesRealizadas };
  };

  const filteredInformes = useMemo(() => {
    return informes.filter((informe) =>
      matchesSearch(`${nombrePaciente(informe.paciente)} ${informe.fecha || ''} ${informe.diagnostico || ''} ${informe.doctor || ''}`, query)
    );
  }, [informes, query]);

  const load = async () => {
    setLoading(true);
    try {
      const [pacientesData, informesData, historiasData, sesionesData] = await Promise.all([
        getPacientes(),
        getInformesMedicos(),
        getHistoriasClinicas(),
        getSesiones()
      ]);
      setPacientes(pacientesData);
      setInformes(informesData);
      setHistorias(historiasData);
      setSesiones(sesionesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const informeId = location.state?.informeId;
    if (!informeId || !informes.length) return;
    const informe = informes.find((item) => Number(item.id) === Number(informeId));
    if (informe) {
      setSelectedInforme(informeConSesionesRealizadas(informe));
      setActivePanel('generados');
    }
  }, [informes, location.state?.informeId]);

  useEffect(() => {
    setForm((current) => ({ ...current, doctor: profesionalAutenticado }));
  }, [profesionalAutenticado]);

  const update = (key, value) => setForm({ ...form, [key]: value });

  const selectPaciente = (pacienteId) => {
    const historiasActivas = historias
      .filter((item) => Number(item.paciente_id || item.paciente?.id) === Number(pacienteId))
      .filter(isHistoriaActiva)
      .sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || Number(b.id || 0) - Number(a.id || 0));
    const historia = historiasActivas.length === 1 ? historiasActivas[0] : null;
    const camposHistoria = historiaToInformeFields(historia);

    setForm((current) => ({
      ...current,
      paciente_id: pacienteId,
      historia_clinica_id: historia?.id || '',
      diagnostico: historia ? camposHistoria.diagnostico : '',
      dx_cie: historia ? camposHistoria.dx_cie : '',
      antecedentes: historia ? camposHistoria.antecedentes : '',
      conclusion_diagnostica: historia ? camposHistoria.conclusion_diagnostica : '',
      cantidad_sesiones: historia ? sesiones.filter((sesion) => String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(historia.id)).filter(isSesionRealizada).length : 0,
      tratamiento_fisioterapeutico: historia ? camposHistoria.tratamiento_fisioterapeutico : '',
      medicamentos: historia ? camposHistoria.medicamentos : '',
      estado_actual: historia ? camposHistoria.estado_actual : '',
      doctor: profesionalAutenticado
    }));
  };

  const selectHistoria = (historiaId) => {
    const historia = historiasPaciente.find((item) => String(item.id) === String(historiaId));
    const camposHistoria = historiaToInformeFields(historia);
    const sesionesRealizadas = historiaId
      ? sesiones.filter((sesion) => String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(historiaId)).filter(isSesionRealizada).length
      : 0;

    setForm((current) => ({
      ...current,
      historia_clinica_id: historiaId,
      diagnostico: camposHistoria.diagnostico,
      dx_cie: camposHistoria.dx_cie,
      antecedentes: camposHistoria.antecedentes,
      conclusion_diagnostica: camposHistoria.conclusion_diagnostica,
      cantidad_sesiones: sesionesRealizadas,
      tratamiento_fisioterapeutico: camposHistoria.tratamiento_fisioterapeutico,
      medicamentos: camposHistoria.medicamentos,
      estado_actual: camposHistoria.estado_actual
    }));
  };

  const validate = () => {
    if (!form.paciente_id) return 'Selecciona un paciente.';
    if (!form.historia_clinica_id) return 'Selecciona una historia clinica activa.';
    if (!form.fecha) return 'La fecha es obligatoria.';
    if (!form.diagnostico) return 'El diagnostico es obligatorio.';
    return '';
  };

  const saveInforme = async (mode = 'generado') => {
    setMessage('');
    const validationError = validate();
    setError(validationError);
    if (validationError) return false;

    try {
      const payload = cleanPayload({
        ...form,
        cantidad_sesiones: sesionesRealizadasHistoria
      });
      editing ? await updateInformeMedico(editing, payload) : await createInformeMedico(payload);
      setForm({ ...initialForm, doctor: profesionalAutenticado });
      setEditing(null);
      setActivePanel('generados');
      await load();
      await Swal.fire({ icon: 'success', title: mode === 'borrador' ? 'Borrador guardado correctamente' : 'Informe generado correctamente', confirmButtonColor: '#0F766E' });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    await saveInforme('generado');
  };

  const editInforme = (informe) => {
    setEditing(informe.id);
    const historiaId = informe.historia_clinica_id || informe.historia_clinica?.id || '';
    const sesionesRealizadas = historiaId
      ? sesiones.filter((sesion) => String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(historiaId)).filter(isSesionRealizada).length
      : Number(informe.cantidad_sesiones || 0);
    setForm({
      paciente_id: informe.paciente_id || informe.paciente?.id || '',
      historia_clinica_id: historiaId,
      fecha: informe.fecha || boliviaDate(),
      doctor: profesionalAutenticado,
      diagnostico: informe.diagnostico || '',
      dx_cie: informe.dx_cie || '',
      antecedentes: informe.antecedentes || '',
      conclusion_diagnostica: informe.conclusion_diagnostica || '',
      cantidad_sesiones: sesionesRealizadas,
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
    const escapeHtml = (value) => String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
    const safe = (value) => escapeHtml(value || 'Sin dato');
    const conclusionItems = (informe?.conclusion_diagnostica || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    const tratamientoItems = (informe?.tratamiento_fisioterapeutico || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    const sesionesRealizadas = Number(informe?.sesiones_realizadas || 0);
    return `
      <article style="width: 216mm; min-height: 279mm; padding: 18mm 20mm; font-family: Arial, sans-serif; color: #0f172a; font-size: 16px; line-height: 1.42;">
        <header style="position: relative; border-bottom: 1px solid #0f172a; padding-bottom: 8px;">
          <img src="${logo}" style="position: absolute; left: 0; top: 0; height: 110px; width: 130px; object-fit: contain;" />
          <div style="padding-top: 112px; text-align: center;">
            <h1 style="font-size: 22px; margin: 0; font-weight: 900;">FISIOTERAPIA Y KINESIOLOGIA</h1>
            <p style="font-size: 21px; margin: 12px 0 0; font-weight: 900;">MEDICINA FISICA Y REHABILITACION</p>
          </div>
        </header>
        <section style="margin-top: 18px;">
          <p style="font-size: 20px; margin: 0 0 12px;"><strong>PACIENTE:</strong> ${escapeHtml(nombrePaciente(paciente).toUpperCase())}</p>
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
              ? `<ul style="margin: 8px 0 18px 48px;">${conclusionItems.map((item) => `<li style="text-transform: uppercase;">${escapeHtml(item)}</li>`).join('')}</ul>`
              : `<p style="margin: 8px 0 18px 24px;">Sin conclusion diagnostica.</p>`
          }
          <h3 style="font-weight: 900; margin: 0 0 8px;">3.- Tratamiento Fisioterapeutico y de medicina fisica (${sesionesRealizadasLabel(sesionesRealizadas)}):</h3>
          ${
            tratamientoItems.length
              ? `<ul style="margin: 8px 0 10px 48px;">${tratamientoItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
              : `<p style="margin: 8px 0 10px;">Sin tratamiento registrado.</p>`
          }
          ${informe?.medicamentos ? `<p style="white-space: pre-wrap; text-align: justify; margin: 0 0 28px;"><strong>Farmacologicamente:</strong> ${escapeHtml(informe.medicamentos)}</p>` : ''}
          <p style="white-space: pre-wrap; text-align: justify; margin: 46px 0 18px;">${escapeHtml(informe?.estado_actual || 'Paciente a la actualidad dado de alta post recuperacion funcional de su patologia.')}</p>
          <p style="margin: 0;">${escapeHtml(informe?.observacion_final || 'Es cuanto debo informar para fines del interesado')}</p>
        </section>
      </article>
    `;
  };

  const tieneHistoriaSeleccionada = (informe) => Boolean(informe?.historia_clinica_id || informe?.historia_clinica?.id);

  const printInforme = (informe = previewInforme) => {
    if (!tieneHistoriaSeleccionada(informe)) {
      setError('Selecciona una historia clinica activa antes de generar el informe.');
      return;
    }
    const html = renderPrintableHtml(informe);
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Informe medico</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; }
            @page { size: 216mm 279mm; margin: 12mm; }
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
    if (!tieneHistoriaSeleccionada(informe)) {
      setError('Selecciona una historia clinica activa antes de generar el informe.');
      return;
    }
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
    const pdf = new jsPDF('p', 'mm', [216, 279]);
    const pageWidth = 216;
    const pageHeight = 279;
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
        <div className="w-full overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
          <div className="report-module-hero">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-teal-700">INFORMES</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">Informes Médicos</h2>
              <span className="mt-2 block text-sm text-slate-600">Genera, edita, imprime y descarga informes vinculados a pacientes e historias clínicas.</span>
            </div>
            <Stethoscope size={46} className="self-center text-teal-600/80" />
          </div>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-ink">Informes generados</h3>
                <p className="text-sm text-slate-500">Registros vinculados al historial del paciente.</p>
              </div>
              <Button onClick={() => {
                setEditing(null);
                setForm({ ...initialForm, doctor: profesionalAutenticado });
                setActivePanel('generar');
              }}>
                <Plus size={17} />
                Nuevo informe
              </Button>
            </div>
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                <Search size={17} className="shrink-0 text-slate-500" />
                <input
                  className="w-full border-0 bg-transparent p-0 text-sm text-ink shadow-none placeholder:text-slate-400 focus:ring-0"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Paciente, diagnostico, doctor o fecha"
                />
              </label>
              <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">{filteredInformes.length} resultados</span>
            </div>
            <Table
              columns={['Paciente', 'Fecha', 'Diagnostico', 'Doctor', 'Acciones']}
              rows={filteredInformes.map((informe) => [
                <PatientIdentity paciente={informe.paciente} secondary={`CI: ${informe.paciente?.ci || 'Sin dato'}`} />,
                formatDate(informe.fecha),
                informe.diagnostico,
                informe.doctor || 'Sin dato',
                <div className="flex flex-wrap gap-2">
                  <ActionButton label="Ver informe" icon={Eye} tone="view" onClick={() => setSelectedInforme(informeConSesionesRealizadas(informe))} />
                  <ActionButton label="Editar informe" icon={FilePenLine} tone="edit" onClick={() => editInforme(informe)} />
                  <ActionButton label="Imprimir informe" icon={Printer} tone="print" onClick={() => printInforme(informeConSesionesRealizadas(informe))} />
                  <ActionButton label="Descargar PDF" icon={Download} tone="download" onClick={() => downloadInformePdf(informeConSesionesRealizadas(informe))} />
                  {isAdmin && (
                    <ActionButton label="Eliminar informe" icon={Trash2} tone="delete" onClick={() => deleteInformeMedico(informe.id).then(load)} />
                  )}
                </div>
              ])}
              empty="No hay informes medicos generados."
            />
          </div>
        </div>
      </div>

      <Modal
        open={activePanel === 'generar'}
        title={editing ? 'Editar informe' : 'Nuevo informe'}
        subtitle="Completa los datos vinculados del paciente y revisa el formato antes de guardar."
        onClose={() => {
          setActivePanel('generados');
          setEditing(null);
        }}
        size="report"
      >
        <form onSubmit={submit} className="new-report-form grid max-h-[78vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden">
          <div className="grid gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(190px,1fr)_minmax(280px,1.45fr)_minmax(150px,.7fr)]">
            <Input compact label="Paciente" value={form.paciente_id} onChange={(e) => selectPaciente(e.target.value)} options={[{ value: '', label: 'Seleccionar paciente' }, ...pacientes.map((paciente) => ({ value: paciente.id, label: nombrePaciente(paciente) }))]} />
            <Input compact label="Historia clínica seleccionada" value={form.historia_clinica_id} onChange={(e) => selectHistoria(e.target.value)} disabled={!form.paciente_id || historiasPaciente.length === 0} options={[{ value: '', label: form.paciente_id ? 'Seleccionar historia activa' : 'Primero selecciona paciente' }, ...historiasPaciente.map((historia) => ({ value: historia.id, label: historiaLabel(historia) }))]} />
            <Input compact label="Fecha" type="date" value={form.fecha} onChange={(e) => update('fecha', e.target.value)} />
            <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-3"><div className="linked-report-item min-w-[240px] flex-1"><UserRound size={16} /><span><small>Profesional responsable</small><strong>{profesionalAutenticado || 'Sin registrar'}</strong></span></div><div className="linked-report-item min-w-[180px]"><Activity size={16} /><span><small>Sesiones realizadas</small><strong>{sesionesRealizadasHistoria}</strong></span></div></div>
            {form.paciente_id && <p className="text-[11px] font-semibold text-slate-500 sm:col-span-2 xl:col-span-3">Datos vinculados: {historiasPaciente.length} historias clínicas activas y {sesionesRealizadasHistoria} sesiones realizadas en la historia seleccionada.</p>}
          </div>

          <div className="grid min-h-0 gap-6 overflow-y-auto overflow-x-hidden pr-1 xl:grid-cols-[minmax(0,52fr)_minmax(420px,48fr)] xl:overflow-hidden">
            <div className="grid min-w-0 auto-rows-max content-start gap-4 xl:overflow-y-auto xl:overflow-x-hidden xl:pr-2">
              <ReportSection icon={Stethoscope} title="Datos clínicos" open={reportSections.clinical} onToggle={() => setReportSections((current) => ({ ...current, clinical: !current.clinical }))}>
                <div className="grid gap-4 md:grid-cols-2"><Input compact className="[&_textarea]:min-h-24" label="Diagnóstico" placeholder="Ej.: Tendinopatía de hombro derecho" value={form.diagnostico} onChange={(e) => update('diagnostico', e.target.value)} multiline /><Input compact className="[&_textarea]:min-h-24" label="DX CIE / Descripción clínica" placeholder="Describe el diagnóstico clínico" value={form.dx_cie} onChange={(e) => update('dx_cie', e.target.value)} multiline /><Input compact className="md:col-span-2 [&_textarea]:min-h-24" label="Antecedentes" placeholder="Describe los antecedentes clínicos relevantes" value={form.antecedentes} onChange={(e) => update('antecedentes', e.target.value)} multiline /></div>
              </ReportSection>
              <ReportSection icon={HeartPulse} title="Evaluación y conclusión" open={reportSections.evaluation} onToggle={() => setReportSections((current) => ({ ...current, evaluation: !current.evaluation }))}>
                <div className="grid gap-4 md:grid-cols-2"><Input compact className="[&_textarea]:min-h-24" label="Conclusión diagnóstica" placeholder="Resume el resultado de la evaluación clínica" value={form.conclusion_diagnostica} onChange={(e) => update('conclusion_diagnostica', e.target.value)} multiline /><Input compact className="[&_textarea]:min-h-24" label="Estado actual del paciente" placeholder="Describe la evolución y condición actual del paciente" value={form.estado_actual} onChange={(e) => update('estado_actual', e.target.value)} multiline /></div>
              </ReportSection>
              <ReportSection icon={ClipboardList} title="Tratamiento" open={reportSections.treatment} onToggle={() => setReportSections((current) => ({ ...current, treatment: !current.treatment }))}>
                <div className="grid gap-4 md:grid-cols-2"><Input compact className="[&_textarea]:min-h-24" label="Tratamiento fisioterapéutico" placeholder="Describe las técnicas y sesiones realizadas" value={form.tratamiento_fisioterapeutico} onChange={(e) => update('tratamiento_fisioterapeutico', e.target.value)} multiline /><Input compact className="[&_textarea]:min-h-24" label="Medicamentos / Fármacos" placeholder="Medicamentos o fármacos administrados" value={form.medicamentos} onChange={(e) => update('medicamentos', e.target.value)} multiline /></div>
              </ReportSection>
              <ReportSection icon={MessageSquare} title="Cierre" open={reportSections.closing} onToggle={() => setReportSections((current) => ({ ...current, closing: !current.closing }))}>
                <Input compact className="[&_textarea]:min-h-24" label="Observación final" placeholder="Agrega una observación final para el informe" value={form.observacion_final} onChange={(e) => update('observacion_final', e.target.value)} multiline />
              </ReportSection>
            </div>

            <aside className="min-h-0 min-w-0 xl:sticky xl:top-0 xl:self-start xl:border-l xl:border-slate-200 xl:pl-6">
              <div className="mb-2 flex items-center justify-between gap-2"><div><h3 className="text-sm font-black text-ink">Vista previa carta</h3><p className="text-xs text-slate-500">Formato final del informe.</p></div><Button type="button" variant="secondary" onClick={() => setShowPreview(true)}><Maximize2 size={15} />Ampliar vista previa</Button></div>
              <div className="report-preview-panel max-h-[58vh] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-slate-100 p-3 shadow-inner"><div id="printable-report" ref={printRef}><PrintableReport informe={previewInforme} pacientes={pacientes} /></div></div>
            </aside>
          </div>

          <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 pt-3 backdrop-blur">
            <Button type="button" variant="ghost" onClick={() => { setEditing(null); setForm(initialForm); setActivePanel('generados'); }}>Cancelar</Button>
            <Button type="button" variant="secondary" onClick={() => saveInforme('borrador')}><Save size={16} />Guardar borrador</Button>
            <Button type="submit"><FileText size={17} />{editing ? 'Actualizar informe' : 'Generar informe'}</Button>
          </div>
        </form>
      </Modal>

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

