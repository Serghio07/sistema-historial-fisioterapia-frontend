import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import Button from '../../../components/common/Button';
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
  const [motivoPendiente, setMotivoPendiente] = useState('');
  const update = (key, value) => setForm({ ...form, [key]: value.toLocaleUpperCase('es-BO') });
  const motivosSeleccionados = String(form.motivo_consulta || '')
    .split(';')
    .map((motivo) => motivo.trim())
    .filter(Boolean);
  const guardarMotivos = (values) => update('motivo_consulta', values.join('; '));
  const agregarMotivo = () => {
    const motivo = motivoPendiente.trim().toLocaleUpperCase('es-BO');
    if (!motivo || motivo === 'OTRO MOTIVO') return;
    if (!motivosSeleccionados.includes(motivo)) guardarMotivos([...motivosSeleccionados, motivo]);
    setMotivoPendiente('');
  };
  const quitarMotivo = (motivo) => guardarMotivos(motivosSeleccionados.filter((item) => item !== motivo));

  return (
    <section className="form-section">
      <h3>Anamnesis</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Diagnóstico médico" value={form.diagnostico_medico} onChange={(e) => update('diagnostico_medico', e.target.value)} multiline placeholder="DIAGNÓSTICO MÉDICO O DERIVACIÓN, SI EXISTE" />
        <div className="grid self-start gap-2 text-sm font-bold text-slate-700">
          <span>Motivos de consulta *</span>
          <div className="flex gap-2">
            <input
              list="motivos-consulta"
              className="min-w-0 flex-1 rounded-lg border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              value={motivoPendiente}
              onChange={(event) => setMotivoPendiente(event.target.value.toLocaleUpperCase('es-BO'))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  agregarMotivo();
                }
              }}
              placeholder="BUSCAR O ESCRIBIR UN MOTIVO"
            />
            <Button type="button" variant="secondary" onClick={agregarMotivo} disabled={!motivoPendiente.trim() || motivoPendiente.trim() === 'OTRO MOTIVO'}>
              <Plus size={16} />Agregar
            </Button>
          </div>
          <datalist id="motivos-consulta">{motivos.filter((motivo) => motivo !== 'OTRO MOTIVO').map((motivo) => <option key={motivo} value={motivo} />)}</datalist>
          <span className="text-xs font-normal text-slate-500">Puedes seleccionar varios motivos o escribir uno que no aparezca en la lista.</span>
          {motivosSeleccionados.length > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
              {motivosSeleccionados.map((motivo) => (
                <span key={motivo} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">
                  {motivo}
                  <button type="button" onClick={() => quitarMotivo(motivo)} className="rounded-full p-0.5 text-emerald-600 hover:bg-red-50 hover:text-red-600" title={`Quitar ${motivo}`} aria-label={`Quitar ${motivo}`}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          ) : <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Agrega al menos un motivo de consulta.</span>}
        </div>
        <Input className="md:col-span-2" label="Enfermedad actual" value={form.enfermedad_actual} onChange={(e) => update('enfermedad_actual', e.target.value)} multiline placeholder="DESCRIBA LA EVOLUCIÓN ACTUAL DEL PROBLEMA" />
      </div>
    </section>
  );
}

export default AnamnesisSection;
