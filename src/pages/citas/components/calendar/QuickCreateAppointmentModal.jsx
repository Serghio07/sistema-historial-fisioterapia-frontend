import { CalendarPlus } from 'lucide-react';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import Modal from '../../../../components/common/Modal';
import { durationBetween, endTimeFor, validateNewAppointmentDraft, VALID_APPOINTMENT_TYPES } from '../../utils/appointmentCreation';
import { nombrePaciente } from '../../../../utils/validators';

export default function QuickCreateAppointmentModal({ draft, setDraft, patients, professionalName, saving, error, onCancel, onCreate }) {
  if (!draft) return null;
  const patientOptions = [{ value: '', label: 'Seleccionar paciente' }, ...patients.map((patient) => ({ value: patient.id, label: nombrePaciente(patient) }))];
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const updateStart = (value) => setDraft((current) => ({ ...current, hora_inicio: value, hora_fin: value && current.duration ? endTimeFor(value, current.duration) : current.hora_fin }));
  const updateEnd = (value) => setDraft((current) => ({ ...current, hora_fin: value, duration: durationBetween(current.hora_inicio, value) || '' }));
  const validationError = validateNewAppointmentDraft(draft);
  const valid = !validationError;

  return <Modal open title={<span className="inline-flex items-center gap-2"><CalendarPlus size={19} className="text-brand-700" />Nueva cita</span>} subtitle="Se creará una cita independiente; la cita original permanecerá intacta." onClose={onCancel} size="md" closeOnEscape>
    <form onSubmit={(event) => { event.preventDefault(); if (valid) onCreate(); }} className="grid gap-4">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      <section className="grid gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
        {draft.sourceAppointmentId
          ? <div><span className="text-xs font-bold text-slate-500">Paciente</span><strong className="mt-1 block text-sm text-slate-900">{draft.pacienteNombre}</strong></div>
          : <Input label="Paciente *" searchable options={patientOptions} value={draft.paciente_id} onChange={(event) => update('paciente_id', event.target.value)} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Fecha *" type="date" value={draft.fecha} onChange={(event) => update('fecha', event.target.value)} />
          <Input label="Hora de inicio *" type="time" value={draft.hora_inicio} onChange={(event) => updateStart(event.target.value)} />
          <Input label="Hora de fin *" type="time" value={draft.hora_fin} onChange={(event) => updateEnd(event.target.value)} />
        </div>
        <Input label="Tipo de atención *" options={[{ value: '', label: 'Seleccionar tipo de atención' }, ...VALID_APPOINTMENT_TYPES.map((value) => ({ value, label: value }))]} value={draft.tipo_atencion} onChange={(event) => update('tipo_atencion', event.target.value)} />
        <p className="text-xs text-slate-500"><b className="text-brand-700">Profesional:</b> {professionalName || 'Usuario autenticado'}</p>
      </section>
      <section className="grid gap-3 rounded-xl border border-slate-200 p-4">
        <Input label="Motivo (opcional)" value={draft.motivo} onChange={(event) => update('motivo', event.target.value)} />
        <Input label="Observación (opcional)" multiline value={draft.observacion} onChange={(event) => update('observacion', event.target.value)} />
      </section>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancelar</Button><Button type="submit" disabled={!valid || saving} title={!valid ? validationError : undefined}><CalendarPlus size={16} />{saving ? 'Creando cita...' : 'Crear cita'}</Button>
      </div>
    </form>
  </Modal>;
}
