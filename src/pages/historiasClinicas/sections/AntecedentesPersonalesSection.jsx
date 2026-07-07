import Input from '../../../components/common/Input';

const checks = ['patologicos', 'hospitalarios', 'quirurgicos', 'traumaticos', 'alergicos', 'farmacologicos'];
const labelize = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function AntecedentesPersonalesSection({ data, onChange }) {
  const toggleNone = (checked) => {
    if (checked && checks.some((key) => data[`detalle_${key}`]?.trim()) && !window.confirm('Se limpiarán los detalles registrados. ¿Desea continuar?')) return;
    checks.forEach((key) => {
      onChange(key, false);
      if (checked) onChange(`detalle_${key}`, '');
    });
    onChange('sin_antecedentes', checked);
  };
  const toggle = (key, checked) => {
    if (checked) onChange('sin_antecedentes', false);
    onChange(key, checked);
  };

  return (
    <section className="form-section">
      <h3>Antecedentes personales</h3>
      <div className="toggle-grid">
        <label className="toggle-pill"><input type="checkbox" checked={Boolean(data.sin_antecedentes)} onChange={(e) => toggleNone(e.target.checked)} />Sin antecedentes relevantes</label>
        {checks.map((key) => <label key={key} className="toggle-pill"><input type="checkbox" checked={Boolean(data[key])} onChange={(e) => toggle(key, e.target.checked)} />{labelize(key)}</label>)}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {checks.filter((key) => data[key]).map((key) => (
          <Input key={key} label={`Detalle ${labelize(key)}`} value={data[`detalle_${key}`] || ''} onChange={(e) => onChange(`detalle_${key}`, e.target.value.toLocaleUpperCase('es-BO'))} multiline />
        ))}
      </div>
      <Input className="mt-4" label="Observaciones" value={data.observaciones || ''} onChange={(e) => onChange('observaciones', e.target.value.toLocaleUpperCase('es-BO'))} multiline />
    </section>
  );
}

export default AntecedentesPersonalesSection;
