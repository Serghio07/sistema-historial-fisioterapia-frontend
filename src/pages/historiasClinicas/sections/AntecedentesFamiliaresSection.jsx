import Input from '../../../components/common/Input';

const checks = ['diabetes', 'cancer', 'hipertension', 'cardiovascular', 'asma', 'trombosis_venosa', 'congenitos', 'epilepsia', 'tuberculosis', 'tabaquismo', 'alcoholismo'];
const labelize = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function AntecedentesFamiliaresSection({ data, onChange }) {
  const toggleNone = (checked) => {
    if (checked && data.otros?.trim() && !window.confirm('Se limpiará el campo OTROS. ¿Desea continuar?')) return;
    checks.forEach((key) => onChange(key, false));
    if (checked) onChange('otros', '');
    onChange('sin_antecedentes', checked);
  };
  return (
    <section className="form-section">
      <h3>Antecedentes familiares</h3>
      <div className="toggle-grid">
        <label className="toggle-pill"><input type="checkbox" checked={Boolean(data.sin_antecedentes)} onChange={(e) => toggleNone(e.target.checked)} />Sin antecedentes familiares relevantes</label>
        {checks.map((key) => <label key={key} className="toggle-pill"><input type="checkbox" checked={Boolean(data[key])} onChange={(e) => { if (e.target.checked) onChange('sin_antecedentes', false); onChange(key, e.target.checked); }} />{labelize(key)}</label>)}
      </div>
      <Input className="mt-4" label="Otros" value={data.otros || ''} onChange={(e) => onChange('otros', e.target.value.toLocaleUpperCase('es-BO'))} multiline placeholder="ESPECIFIQUE OTRO ANTECEDENTE FAMILIAR" />
    </section>
  );
}

export default AntecedentesFamiliaresSection;
