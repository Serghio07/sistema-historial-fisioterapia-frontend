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
  estado: 'activa',
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
    tipo_lesion: 'M',
    zona_cuerpo: '',
    estudios_imagenologicos: '',
    descripcion: ''
  },
  intervencion_clinica: {
    escala_dolor: 0,
    tono: '',
    goniometria_balance_articular: '',
    balance_muscular: '',
    trofismo: 'Conservado',
    detalle_trofismo: '',
    observaciones: ''
  },
  evaluacion_final: {
    evaluacion_postura: '',
    evaluacion_marcha: '',
    diagnostico_kinesico_cif: '',
    plan_tratamiento: '',
    periodicidad: '',
    profesional_cargo: ''
  }
};

function HistoriaClinicaForm({ form, setForm, pacientes, profesionales, user, isAdmin, editing, onSubmit, onCancel }) {
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
        content: <DatosPacienteSection form={form} setForm={setForm} pacientes={pacientes} profesionales={profesionales} user={user} isAdmin={isAdmin} />
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
    [form, pacientes, profesionales, user, isAdmin, setForm]
  );

  const currentStep = steps[stepIndex] || steps[steps.length - 1];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const goBack = () => setStepIndex((current) => Math.max(current - 1, 0));
  const goNext = (event) => {
    event.preventDefault();
    event.stopPropagation();
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
              onClick={() => setStepIndex(index)}
              className={`h-2 rounded-full transition ${index <= stepIndex ? 'bg-brand-600' : 'bg-slate-200 hover:bg-slate-300'}`}
              title={step.title}
              aria-label={step.title}
            />
          ))}
        </div>
      </div>

      <div key={currentStep.title} ref={contentRef} className="max-h-[62vh] overflow-y-auto pr-1">
        {currentStep.content}
      </div>

      <div className="sticky-actions justify-between">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
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
            <Button type="submit" disabled={!canSubmit}>
              <Save size={17} />
              {editing ? 'Actualizar historia' : 'Guardar historia'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

export default HistoriaClinicaForm;
