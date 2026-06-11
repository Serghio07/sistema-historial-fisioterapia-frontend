import Input from '../../../components/common/Input';

function AnamnesisSection({ form, setForm }) {
  const update = (key, value) => setForm({ ...form, [key]: value });

  return (
    <section className="form-section">
      <h3>Anamnesis</h3>
      <div className="form-grid">
        <Input label="Diagnostico medico" value={form.diagnostico_medico} onChange={(e) => update('diagnostico_medico', e.target.value)} multiline />
        <Input label="Motivo consulta" value={form.motivo_consulta} onChange={(e) => update('motivo_consulta', e.target.value)} multiline />
        <Input label="Enfermedad actual" value={form.enfermedad_actual} onChange={(e) => update('enfermedad_actual', e.target.value)} multiline />
      </div>
    </section>
  );
}

export default AnamnesisSection;
