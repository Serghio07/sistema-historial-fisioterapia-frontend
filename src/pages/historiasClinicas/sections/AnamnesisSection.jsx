import Input from '../../../components/common/Input';

const motivos = [
  'DOLOR CERVICAL', 'DOLOR DORSAL', 'DOLOR LUMBAR', 'DOLOR DE HOMBRO', 'DOLOR DE CODO',
  'DOLOR DE MUÑECA', 'DOLOR DE CADERA', 'DOLOR DE RODILLA', 'DOLOR DE TOBILLO', 'DOLOR DE PIE',
  'DOLOR MUSCULAR', 'DOLOR ARTICULAR', 'DOLOR POSTURAL', 'LESIÓN DEPORTIVA', 'ESGUINCE',
  'DESGARRO MUSCULAR', 'DISTENSIÓN MUSCULAR', 'CONTRACTURA MUSCULAR', 'TENDINITIS',
  'SOBRECARGA MUSCULAR', 'LESIÓN POR ENTRENAMIENTO', 'DOLOR POST EJERCICIO', 'REINTEGRO DEPORTIVO',
  'REHABILITACIÓN POST OPERATORIA', 'REHABILITACIÓN POST FRACTURA', 'REHABILITACIÓN TRAUMATOLÓGICA',
  'REHABILITACIÓN DE RODILLA', 'REHABILITACIÓN DE HOMBRO', 'REHABILITACIÓN DE COLUMNA',
  'REHABILITACIÓN DE TOBILLO', 'REHABILITACIÓN FUNCIONAL', 'RECUPERACIÓN DE MOVILIDAD',
  'RECUPERACIÓN DE FUERZA', 'LIMITACIÓN DE MOVIMIENTO', 'RIGIDEZ ARTICULAR', 'DEBILIDAD MUSCULAR',
  'ALTERACIÓN DE LA MARCHA', 'PÉRDIDA DE EQUILIBRIO', 'DISMINUCIÓN DE FLEXIBILIDAD',
  'DIFICULTAD PARA REALIZAR ACTIVIDADES DIARIAS', 'EVALUACIÓN POSTURAL', 'CORRECCIÓN POSTURAL',
  'DOLOR POR MALA POSTURA', 'ESCOLIOSIS', 'HIPERCIFOSIS', 'HIPERLORDOSIS', 'CIÁTICA',
  'HERNIA DISCAL / PROTRUSIÓN DISCAL', 'EVALUACIÓN FISIOTERAPÉUTICA INICIAL', 'CONTROL FISIOTERAPÉUTICO',
  'SEGUIMIENTO DE TRATAMIENTO', 'TERAPIA DE MANTENIMIENTO', 'PREVENCIÓN DE LESIONES',
  'ACONDICIONAMIENTO FÍSICO', 'ENTRENAMIENTO FUNCIONAL', 'OTRO MOTIVO'
];

function AnamnesisSection({ form, setForm }) {
  const update = (key, value) => setForm({ ...form, [key]: value.toLocaleUpperCase('es-BO') });

  return (
    <section className="form-section">
      <h3>Anamnesis</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Diagnóstico médico" value={form.diagnostico_medico} onChange={(e) => update('diagnostico_medico', e.target.value)} multiline placeholder="DIAGNÓSTICO MÉDICO O DERIVACIÓN, SI EXISTE" />
        <label className="grid self-start gap-1 text-sm font-bold text-slate-700">
          <span>Motivo de consulta *</span>
          <input
            list="motivos-consulta"
            className="w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            value={form.motivo_consulta}
            onChange={(e) => update('motivo_consulta', e.target.value)}
            placeholder="BUSCAR O SELECCIONAR MOTIVO"
          />
          <datalist id="motivos-consulta">{motivos.map((motivo) => <option key={motivo} value={motivo} />)}</datalist>
        </label>
        {form.motivo_consulta === 'OTRO MOTIVO' && (
          <Input label="Especifique motivo de consulta *" value={form.motivo_consulta_otro || ''} onChange={(e) => update('motivo_consulta_otro', e.target.value)} placeholder="ESPECIFIQUE EL MOTIVO DE CONSULTA" />
        )}
        <Input className="md:col-span-2" label="Enfermedad actual" value={form.enfermedad_actual} onChange={(e) => update('enfermedad_actual', e.target.value)} multiline placeholder="DESCRIBA LA EVOLUCIÓN ACTUAL DEL PROBLEMA" />
      </div>
    </section>
  );
}

export default AnamnesisSection;
