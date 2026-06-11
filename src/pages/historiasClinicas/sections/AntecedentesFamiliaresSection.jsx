import Input from '../../../components/common/Input';

const checks = ['diabetes', 'cancer', 'hipertension', 'cardiovascular', 'asma', 'trombosis_venosa', 'congenitos', 'epilepsia', 'tuberculosis', 'tabaquismo', 'alcoholismo'];

function labelize(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AntecedentesFamiliaresSection({ data, onChange }) {
  return (
    <section className="form-section">
      <h3>Antecedentes familiares</h3>
      <div className="toggle-grid">
        {checks.map((key) => (
          <label key={key} className="toggle-pill">
            <input type="checkbox" checked={Boolean(data[key])} onChange={(e) => onChange(key, e.target.checked)} />
            {labelize(key)}
          </label>
        ))}
      </div>
      <Input label="Otros" value={data.otros} onChange={(e) => onChange('otros', e.target.value)} multiline />
    </section>
  );
}

export default AntecedentesFamiliaresSection;
