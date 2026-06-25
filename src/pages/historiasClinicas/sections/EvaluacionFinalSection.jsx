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
        <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-sm text-slate-600">
          El profesional a cargo se selecciona en el primer paso y se mostrará en la impresión.
        </div>
      </div>
    </section>
  );
}

export default EvaluacionFinalSection;
