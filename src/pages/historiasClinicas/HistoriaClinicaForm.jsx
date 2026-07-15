import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../components/common/Button';
import AnamnesisSection from './sections/AnamnesisSection';
import AntecedentesFamiliaresSection from './sections/AntecedentesFamiliaresSection';
import AntecedentesPersonalesSection from './sections/AntecedentesPersonalesSection';
import CondicionActualSection from './sections/CondicionActualSection';
import DatosPacienteSection from './sections/DatosPacienteSection';
import EvaluacionFinalSection from './sections/EvaluacionFinalSection';
import ExamenKinesicoSection from './sections/ExamenKinesicoSection';
import IntervencionClinicaSection from './sections/IntervencionClinicaSection';

export const initialHistoria = {
  paciente_id: '',
  usuario_id: '',
  fecha_evaluacion: new Date().toISOString().slice(0, 10),
  lugar_fecha_nacimiento: '',
  peso: '',
  talla: '',
  imc: '',
  diagnostico_medico: '',
  motivo_consulta: '',
  enfermedad_actual: '',
  profesional_cargo: '',
  estado: 'borrador',
  evolutivo: [],
  antecedente_personal: {
    patologicos: false,
    hospitalarios: false,
    quirurgicos: false,
    traumaticos: false,
    alergicos: false,
    farmacologicos: false,
    detalle_patologicos: '',
    detalle_hospitalarios: '',
    detalle_quirurgicos: '',
    detalle_traumaticos: '',
    detalle_alergicos: '',
    detalle_farmacologicos: '',
    observaciones: ''
  },
  antecedente_familiar: {
    diabetes: false,
    cancer: false,
    hipertension: false,
    cardiovascular: false,
    asma: false,
    trombosis_venosa: false,
    congenitos: false,
    epilepsia: false,
    tuberculosis: false,
    tabaquismo: false,
    alcoholismo: false,
    otros: ''
  },
  examen_kinesico: {
    observacion: '',
    inspeccion: '',
    palpacion: '',
    pruebas_especificas: ''
  },
  condicion_actual: {
    tipo_lesion: [],
    zona_cuerpo: '',
    estudios_imagenologicos: '',
    descripcion: ''
  },
  intervencion_clinica: {
    escala_dolor: '',
    tono: '',
    goniometria_balance_articular: '',
    balance_muscular: '',
    trofismo: 'CONSERVADO',
    detalle_trofismo: '',
    observaciones: ''
  },
  evaluacion_final: {
    evaluacion_postura: '',
    evaluacion_marcha: '',
    diagnostico_kinesico_cif: '',
    plan_tratamiento: '',
    sesiones_contratadas: '',
    periodicidad: '',
    profesional_cargo: ''
  }
};

function HistoriaClinicaForm({ form, setForm, pacientes, user, editing, onSubmit, onCancel }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    setStepIndex(0);
  }, [editing]);

  useEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.scrollTop = 0;
    contentRef.current.closest('[data-modal-scroll]')?.scrollTo({ top: 0 });
    setCanSubmit(false);
    const timer = window.setTimeout(() => setCanSubmit(true), 300);
    return () => window.clearTimeout(timer);
  }, [stepIndex]);

  const setNested = (section, key, value) => {
    setForm({
      ...form,
      [section]: {
        ...form[section],
        [key]: value
      }
    });
  };

  const steps = useMemo(
    () => [
      {
        title: 'Datos del paciente',
        description: 'Identificacion, fecha, profesional y datos antropometricos.',
        content: <DatosPacienteSection form={form} setForm={setForm} pacientes={pacientes} user={user} />
      },
      {
        title: 'Anamnesis',
        description: 'Diagnostico medico, motivo de consulta y enfermedad actual.',
        content: <AnamnesisSection form={form} setForm={setForm} />
      },
      {
        title: 'Antecedentes personales',
        description: 'Patologias, cirugias, alergias y otros antecedentes.',
        content: <AntecedentesPersonalesSection data={form.antecedente_personal} onChange={(key, value) => setNested('antecedente_personal', key, value)} />
      },
      {
        title: 'Antecedentes familiares',
        description: 'Registro de enfermedades y antecedentes familiares relevantes.',
        content: <AntecedentesFamiliaresSection data={form.antecedente_familiar} onChange={(key, value) => setNested('antecedente_familiar', key, value)} />
      },
      {
        title: 'Examen kinesico',
        description: 'Observacion, inspeccion, palpacion y pruebas especificas.',
        content: <ExamenKinesicoSection data={form.examen_kinesico} onChange={(key, value) => setNested('examen_kinesico', key, value)} />
      },
      {
        title: 'Condicion actual',
        description: 'Mapa corporal, tipo de lesion y descripcion actual.',
        content: <CondicionActualSection data={form.condicion_actual} onChange={(key, value) => setNested('condicion_actual', key, value)} />
      },
      {
        title: 'Intervencion clinica',
        description: 'Escala de dolor, tono, goniometria y balance muscular.',
        content: <IntervencionClinicaSection data={form.intervencion_clinica} onChange={(key, value) => setNested('intervencion_clinica', key, value)} />
      },
      {
        title: 'Evaluacion final',
        description: 'Postura, marcha, diagnostico kinesico y plan de tratamiento.',
        content: <EvaluacionFinalSection data={form.evaluacion_final} onChange={(key, value) => setNested('evaluacion_final', key, value)} />
      }
    ],
    [form, pacientes, user, setForm]
  );

  const currentStep = steps[stepIndex] || steps[steps.length - 1];
  const paciente = pacientes.find((item) => String(item.id) === String(form.paciente_id));
  const sexLabel = { M: 'MASCULINO', F: 'FEMENINO' }[paciente?.sexo] || paciente?.sexo || 'SIN DATO';
  const completed = [
    Boolean(form.paciente_id && form.fecha_evaluacion),
    Boolean(form.motivo_consulta || form.diagnostico_medico || form.enfermedad_actual),
    Object.values(form.antecedente_personal || {}).some(Boolean),
    Object.values(form.antecedente_familiar || {}).some(Boolean),
    Object.values(form.examen_kinesico || {}).some(Boolean),
    Boolean(form.condicion_actual?.zona_cuerpo),
    form.intervencion_clinica?.escala_dolor !== '' && form.intervencion_clinica?.escala_dolor != null,
    Boolean(form.evaluacion_final?.plan_tratamiento && Number(form.evaluacion_final?.sesiones_contratadas || 0) > 0)
  ];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const goBack = () => setStepIndex((current) => Math.max(current - 1, 0));
  const goNext = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!form.paciente_id) return;
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-ink">{currentStep.title}</h3>
            <p className="text-sm text-slate-500">{currentStep.description}</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">
            Paso {stepIndex + 1} de {steps.length}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 md:grid-cols-8">
          {steps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => (index === 0 || form.paciente_id) && setStepIndex(index)}
              disabled={index > 0 && !form.paciente_id}
              className={`grid min-h-12 place-items-center rounded-lg border px-1 text-[10px] font-black uppercase transition ${
                index === stepIndex ? 'border-brand-600 bg-brand-600 text-white' : completed[index] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
              } disabled:cursor-not-allowed disabled:opacity-45`}
              title={step.title}
              aria-label={step.title}
            >
              <span>{index + 1}. {step.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div key={currentStep.title} ref={contentRef} className="max-h-[62vh] overflow-y-auto pr-1">
        {stepIndex > 0 && paciente && (
          <div className="sticky top-0 z-10 mb-3 flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-brand-100 bg-brand-50/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
            <span>PACIENTE: <strong>{`${paciente.nombres} ${paciente.apellidos || ''}`.trim().toUpperCase()}</strong></span>
            <span>CI: <strong>{paciente.ci || 'SIN DATO'}</strong></span>
            <span>EDAD: <strong>{paciente.edad != null ? `${paciente.edad} AÑOS` : 'SIN DATO'}</strong></span>
            <span>SEXO: <strong>{sexLabel}</strong></span>
            <span>FECHA: <strong>{form.fecha_evaluacion || 'SIN FECHA'}</strong></span>
          </div>
        )}
        {currentStep.content}
      </div>

      <div className="sticky-actions justify-between">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={(event) => onSubmit(event, 'borrador')}>
            <Save size={17} />Guardar borrador
          </Button>
          <Button type="button" variant="ghost" onClick={goBack} disabled={isFirst}>
            <ArrowLeft size={17} />
            Atras
          </Button>
          {!isLast ? (
            <Button type="button" onClick={goNext}>
              Siguiente
              <ArrowRight size={17} />
            </Button>
          ) : (
            <>
              <Button type="submit" disabled={!canSubmit}>
                <Save size={17} />{editing ? 'Actualizar historia' : 'Guardar historia'}
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}

export default HistoriaClinicaForm;
