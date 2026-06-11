import { CalendarDays, Save } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function SesionSemanalForm({ form, setForm, pacientes, editing, onSubmit, onCancel, error }) {
  const update = (key, value) => setForm({ ...form, [key]: value });

  const selectedPaciente = pacientes.find((paciente) => String(paciente.id) === String(form.paciente_id));

  const fillPacienteData = (pacienteId) => {
    const paciente = pacientes.find((item) => String(item.id) === String(pacienteId));
    setForm({
      ...form,
      paciente_id: pacienteId,
      telefono: paciente?.telefono || form.telefono || '',
      edad: paciente?.edad || form.edad || '',
      sexo: paciente?.sexo || form.sexo || ''
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
        <div className="mb-4 flex items-center gap-2 text-brand-800">
          <CalendarDays size={19} />
          <h3 className="font-black">Datos de la semana</h3>
        </div>
        <div className="form-grid">
          <Input
            label="Paciente"
            value={form.paciente_id}
            onChange={(e) => fillPacienteData(e.target.value)}
            options={[
              { value: '', label: 'Seleccionar paciente' },
              ...pacientes.map((paciente) => ({ value: paciente.id, label: `${paciente.nombres} ${paciente.apellidos || ''}`.trim() }))
            ]}
          />
          <Input label="Semana inicio" type="date" value={form.semana_inicio} onChange={(e) => update('semana_inicio', e.target.value)} />
          <Input label="Semana fin" type="date" value={form.semana_fin} onChange={(e) => update('semana_fin', e.target.value)} />
          <Input label="Telefono" value={form.telefono} onChange={(e) => update('telefono', e.target.value)} />
          <Input label="Edad" type="number" min="0" value={form.edad} onChange={(e) => update('edad', e.target.value)} />
          <Input
            label="Sexo"
            value={form.sexo}
            onChange={(e) => update('sexo', e.target.value)}
            options={[
              { value: '', label: 'Seleccionar' },
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Femenino' },
              { value: 'Otro', label: 'Otro' }
            ]}
          />
          <Input label="Diagnostico" value={form.diagnostico} onChange={(e) => update('diagnostico', e.target.value)} multiline className="md:col-span-2" />
          <Input label="Debe Bs" type="number" min="0" step="0.01" value={form.debe_bs} onChange={(e) => update('debe_bs', e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-black text-ink">Control por dia</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {dias.map((dia) => (
            <label
              key={dia}
              className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={Boolean(form[dia])}
                onChange={(e) => update(dia, e.target.checked ? 'Si' : '')}
              />
              {dia.charAt(0).toUpperCase() + dia.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_2fr]">
        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={Boolean(form.aplica_farmacos)}
            onChange={(e) => update('aplica_farmacos', e.target.checked)}
          />
          Aplica farmacos
        </label>
        <Input label="Observacion" value={form.observacion} onChange={(e) => update('observacion', e.target.value)} multiline />
      </div>

      {selectedPaciente && (
        <div className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-slate-600">
          Registro asociado a <strong className="text-ink">{`${selectedPaciente.nombres} ${selectedPaciente.apellidos || ''}`.trim()}</strong>.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit">
          <Save size={17} />
          {editing ? 'Actualizar semana' : 'Guardar semana'}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

export default SesionSemanalForm;
