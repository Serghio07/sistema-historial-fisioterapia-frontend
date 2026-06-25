import Input from '../../../components/common/Input';

function DatosPacienteSection({ form, setForm, pacientes, profesionales }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  const profesionalRegistrado = profesionales.some((profesional) => profesional.nombre === form.profesional_cargo);
  const updateProfesional = (value) => {
    setForm({
      ...form,
      profesional_cargo: value,
      evaluacion_final: {
        ...form.evaluacion_final,
        profesional_cargo: value
      }
    });
  };

  return (
    <section className="form-section">
      <h3>Datos del paciente</h3>
      <div className="form-grid">
        <Input
          label="Paciente"
          value={form.paciente_id}
          onChange={(e) => update('paciente_id', e.target.value)}
          options={[
            { value: '', label: 'Seleccionar' },
            ...pacientes.map((paciente) => ({ value: paciente.id, label: `${paciente.nombres} ${paciente.apellidos || ''}`.trim() }))
          ]}
        />
        <Input label="Fecha evaluación" type="date" value={form.fecha_evaluacion} onChange={(e) => update('fecha_evaluacion', e.target.value)} />
        <Input label="Lugar y nacimiento" value={form.lugar_fecha_nacimiento} onChange={(e) => update('lugar_fecha_nacimiento', e.target.value)} />
        <Input
          label="Profesional a cargo"
          value={form.profesional_cargo}
          onChange={(e) => updateProfesional(e.target.value)}
          options={[
            { value: '', label: 'Seleccionar profesional' },
            ...(!profesionalRegistrado && form.profesional_cargo
              ? [{ value: form.profesional_cargo, label: `${form.profesional_cargo} — Profesional registrado` }]
              : []),
            ...profesionales.map((profesional) => ({
              value: profesional.nombre,
              label: `${profesional.nombre} — ${profesional.rol === 'admin' ? 'Doctor / Administrador' : 'Personal'}`
            }))
          ]}
        />
        <Input label="Peso" type="number" value={form.peso} onChange={(e) => update('peso', e.target.value)} />
        <Input label="Talla" type="number" value={form.talla} onChange={(e) => update('talla', e.target.value)} />
        <Input label="IMC" type="number" value={form.imc} onChange={(e) => update('imc', e.target.value)} />
        <Input
          label="Estado"
          value={form.estado}
          onChange={(e) => update('estado', e.target.value)}
          options={[
            { value: 'activa', label: 'Activa' },
            { value: 'cerrada', label: 'Cerrada' },
            { value: 'anulada', label: 'Anulada' }
          ]}
        />
      </div>
    </section>
  );
}

export default DatosPacienteSection;
