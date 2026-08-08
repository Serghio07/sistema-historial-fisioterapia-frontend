import Input from '../../../components/common/Input';
import MarchaAssessment from './MarchaAssessment';

function EvaluacionFinalSection({ data, onChange }) {
  const upper = (key, value) => onChange(key, value.toLocaleUpperCase('es-BO'));

  return (
    <section className="form-section">
      <div className="mb-4">
        <h3 className="mb-1">Evaluacion final</h3>
        <p className="text-sm text-slate-500">Postura, marcha, diagnostico CIF y plan de tratamiento.</p>
      </div>
      <MarchaAssessment value={data.evaluacion_marcha} onChange={(value) => onChange('evaluacion_marcha', value)} />
      <div className="form-grid">
        <Input label="Evaluacion postura" value={data.evaluacion_postura} onChange={(e) => upper('evaluacion_postura', e.target.value)} multiline />
        <Input label="Evaluacion marcha" value={data.evaluacion_marcha} onChange={(e) => upper('evaluacion_marcha', e.target.value)} multiline />
        <Input label="Diagnostico kinesico CIF" value={data.diagnostico_kinesico_cif} onChange={(e) => upper('diagnostico_kinesico_cif', e.target.value)} multiline />
        <Input label="Plan tratamiento *" value={data.plan_tratamiento} onChange={(e) => upper('plan_tratamiento', e.target.value)} multiline placeholder="DESCRIBA EL PLAN DE TRATAMIENTO INDICADO" />
        <Input
          label="Periodicidad"
          value={data.periodicidad || ''}
          onChange={(e) => upper('periodicidad', e.target.value)}
          placeholder="EJ.: 3 VECES POR SEMANA"
        />
        <Input
          label="Sesiones indicadas *"
          type="number"
          min="1"
          step="1"
          value={data.sesiones_contratadas || ''}
          onChange={(e) => onChange('sesiones_contratadas', e.target.value)}
          required
        />
        <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-sm text-slate-600">
          El profesional a cargo se selecciona en el primer paso y se mostrara en la impresion.
        </div>
      </div>
    </section>
  );
}

export default EvaluacionFinalSection;
