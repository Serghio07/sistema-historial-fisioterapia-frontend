import Input from '../../../components/common/Input';

const checks = ['patologicos', 'hospitalarios', 'quirurgicos', 'traumaticos', 'alergicos', 'farmacologicos'];
const details = ['detalle_patologicos', 'detalle_hospitalarios', 'detalle_quirurgicos', 'detalle_traumaticos', 'detalle_alergicos', 'detalle_farmacologicos', 'observaciones'];

function labelize(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AntecedentesPersonalesSection({ data, onChange }) {
  return (
    <section className="form-section">
      <h3>Antecedentes personales</h3>
      <div className="toggle-grid">
        {checks.map((key) => (
          <label key={key} className="toggle-pill">
            <input type="checkbox" checked={Boolean(data[key])} onChange={(e) => onChange(key, e.target.checked)} />
            {labelize(key)}
          </label>
        ))}
      </div>
      <div className="form-grid">
        {details.map((key) => (
          <Input key={key} label={labelize(key)} value={data[key]} onChange={(e) => onChange(key, e.target.value)} multiline />
        ))}
      </div>
    </section>
  );
}

export default AntecedentesPersonalesSection;
