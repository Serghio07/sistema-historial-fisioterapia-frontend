import { Save } from 'lucide-react';
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

function HistoriaClinicaForm({ form, setForm, pacientes, editing, onSubmit, onCancel }) {
  const setNested = (section, key, value) => {
    setForm({
      ...form,
      [section]: {
        ...form[section],
        [key]: value
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <DatosPacienteSection form={form} setForm={setForm} pacientes={pacientes} />
      <AnamnesisSection form={form} setForm={setForm} />
      <AntecedentesPersonalesSection data={form.antecedente_personal} onChange={(key, value) => setNested('antecedente_personal', key, value)} />
      <AntecedentesFamiliaresSection data={form.antecedente_familiar} onChange={(key, value) => setNested('antecedente_familiar', key, value)} />
      <ExamenKinesicoSection data={form.examen_kinesico} onChange={(key, value) => setNested('examen_kinesico', key, value)} />
      <CondicionActualSection data={form.condicion_actual} onChange={(key, value) => setNested('condicion_actual', key, value)} />
      <IntervencionClinicaSection data={form.intervencion_clinica} onChange={(key, value) => setNested('intervencion_clinica', key, value)} />
      <EvaluacionFinalSection data={form.evaluacion_final} onChange={(key, value) => setNested('evaluacion_final', key, value)} />
      <div className="sticky-actions">
        <Button type="submit">
          <Save size={17} />
          {editing ? 'Actualizar historia' : 'Guardar historia'}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

export default HistoriaClinicaForm;
