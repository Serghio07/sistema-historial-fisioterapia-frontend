import Input from '../../../components/common/Input';

const fields = ['observacion', 'inspeccion', 'palpacion', 'pruebas_especificas'];

function labelize(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ExamenKinesicoSection({ data, onChange }) {
  return (
    <section className="form-section">
      <h3>Examen kinesico</h3>
      <div className="form-grid">
        {fields.map((key) => (
          <Input key={key} label={labelize(key)} value={data[key]} onChange={(e) => onChange(key, e.target.value.toLocaleUpperCase('es-BO'))} multiline />
        ))}
      </div>
    </section>
  );
}

export default ExamenKinesicoSection;
