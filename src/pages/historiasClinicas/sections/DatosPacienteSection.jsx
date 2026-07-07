import { useEffect } from 'react';
import Input from '../../../components/common/Input';

function DatosPacienteSection({ form, setForm, pacientes, user }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  const profesionalAutenticado = user?.nombre_mostrado || user?.ficha_personal?.nombre_mostrado || user?.nombre || '';

  const formatBirthData = (paciente) => {
    const fecha = paciente?.fecha_nacimiento
      ? new Intl.DateTimeFormat('es-BO', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
        .format(new Date(`${paciente.fecha_nacimiento}T00:00:00Z`))
      : '';
    return [paciente?.lugar_nacimiento, fecha].filter(Boolean).join(', ');
  };

  const getPatientFormData = (pacienteId) => {
    const paciente = pacientes.find((item) => String(item.id) === String(pacienteId));
    const historiaReciente = paciente?.historias_clinicas?.[0];

    return {
      paciente,
      data: {
        lugar_fecha_nacimiento: paciente
          ? formatBirthData(paciente) || historiaReciente?.lugar_fecha_nacimiento || ''
          : '',
        peso: paciente?.peso ?? historiaReciente?.peso ?? '',
        talla: paciente?.talla ?? historiaReciente?.talla ?? '',
        imc: paciente?.imc ?? historiaReciente?.imc ?? ''
      }
    };
  };

  useEffect(() => {
    if (!form.paciente_id || pacientes.length === 0) return;
    if (form.lugar_fecha_nacimiento || form.peso || form.talla || form.imc) return;

    const { paciente, data } = getPatientFormData(form.paciente_id);
    if (!paciente) return;

    setForm((current) => ({
      ...current,
      ...data
    }));
  }, [form.paciente_id, pacientes]);

  const selectPaciente = (pacienteId) => {
    const { data } = getPatientFormData(pacienteId);
    setForm({
      ...form,
      paciente_id: pacienteId,
      ...data
    });
  };

  const updateMeasurement = (key, value) => {
    const next = { ...form, [key]: value };
    const peso = Number(next.peso);
    const talla = Number(next.talla);
    next.imc = peso > 0 && talla > 0 ? (peso / (talla * talla)).toFixed(2) : '';
    setForm(next);
  };

  return (
    <section className="form-section">
      <h3>Datos del paciente</h3>
      <div className="form-grid">
        <Input
          label="Paciente"
          value={form.paciente_id}
          onChange={(event) => selectPaciente(event.target.value)}
          options={[
            { value: '', label: 'Seleccionar' },
            ...pacientes.map((paciente) => ({
              value: paciente.id,
              label: `${paciente.nombres} ${paciente.apellidos || ''}`.trim()
            }))
          ]}
        />
        <Input label="Fecha evaluación" type="date" value={form.fecha_evaluacion} onChange={(event) => update('fecha_evaluacion', event.target.value)} />
        <Input label="Lugar y nacimiento" value={form.lugar_fecha_nacimiento} onChange={(event) => update('lugar_fecha_nacimiento', event.target.value)} />
        <Input label="Profesional a cargo" value={profesionalAutenticado} disabled />
        <Input label="Peso (kg)" type="number" step="0.01" value={form.peso} onChange={(event) => updateMeasurement('peso', event.target.value)} />
        <Input label="Talla (m)" type="number" step="0.01" value={form.talla} onChange={(event) => updateMeasurement('talla', event.target.value)} />
        <Input label="IMC" type="number" value={form.imc} disabled />
      </div>
    </section>
  );
}

export default DatosPacienteSection;
