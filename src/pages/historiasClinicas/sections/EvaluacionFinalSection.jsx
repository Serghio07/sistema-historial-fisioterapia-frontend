import Input from '../../../components/common/Input';
import MarchaAssessment from './MarchaAssessment';

function EvaluacionFinalSection({ data, onChange }) {
  return (
    <section className="form-section">
      <div className="mb-4">
        <h3 className="mb-1">Evaluacion final</h3>
        <p className="text-sm text-slate-500">Postura, marcha, diagnostico CIF y plan de tratamiento.</p>
      </div>
      <MarchaAssessment value={data.evaluacion_marcha} onChange={(value) => onChange('evaluacion_marcha', value)} />
      <div className="form-grid">
        <Input label="Evaluacion postura" value={data.evaluacion_postura} onChange={(e) => onChange('evaluacion_postura', e.target.value)} multiline />
        <Input label="Evaluacion marcha" value={data.evaluacion_marcha} onChange={(e) => onChange('evaluacion_marcha', e.target.value)} multiline />
        <Input label="Diagnostico kinesico CIF" value={data.diagnostico_kinesico_cif} onChange={(e) => onChange('diagnostico_kinesico_cif', e.target.value)} multiline />
        <Input label="Plan tratamiento" value={data.plan_tratamiento} onChange={(e) => onChange('plan_tratamiento', e.target.value)} multiline />
        <Input label="Periodicidad" value={data.periodicidad} onChange={(e) => onChange('periodicidad', e.target.value)} />
        <Input label="Profesional cargo" value={data.profesional_cargo} onChange={(e) => onChange('profesional_cargo', e.target.value)} />
      </div>
    </section>
  );
}

export default EvaluacionFinalSection;
