import Input from '../../../components/common/Input';

function DatosPacienteSection({ form, setForm, pacientes, profesionales }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  const formatBirthData = (paciente) => {
    const fecha = paciente?.fecha_nacimiento
      ? new Intl.DateTimeFormat('es-BO', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
        .format(new Date(`${paciente.fecha_nacimiento}T00:00:00Z`))
      : '';
    return [paciente?.lugar_nacimiento, fecha].filter(Boolean).join(', ');
  };
  const selectPaciente = (pacienteId) => {
    const paciente = pacientes.find((item) => String(item.id) === String(pacienteId));
    const historiaReciente = paciente?.historias_clinicas?.[0];
    setForm({
      ...form,
      paciente_id: pacienteId,
      lugar_fecha_nacimiento: paciente
        ? formatBirthData(paciente) || historiaReciente?.lugar_fecha_nacimiento || ''
        : '',
      peso: paciente?.peso ?? historiaReciente?.peso ?? '',
      talla: paciente?.talla ?? historiaReciente?.talla ?? '',
      imc: paciente?.imc ?? historiaReciente?.imc ?? ''
    });
  };
  const updateMeasurement = (key, value) => {
    const next = { ...form, [key]: value };
    const peso = Number(next.peso);
    const talla = Number(next.talla);
    next.imc = peso > 0 && talla > 0 ? (peso / (talla * talla)).toFixed(2) : '';
    setForm(next);
  };
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
          onChange={(e) => selectPaciente(e.target.value)}
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
        <Input label="Peso (kg)" type="number" step="0.01" value={form.peso} onChange={(e) => updateMeasurement('peso', e.target.value)} />
        <Input label="Talla (m)" type="number" step="0.01" value={form.talla} onChange={(e) => updateMeasurement('talla', e.target.value)} />
        <Input label="IMC" type="number" value={form.imc} disabled />
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
