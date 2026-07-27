import { CalendarDays, CalendarSync, ClipboardList, Save, UserRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const labels = {
  asistio: 'Asistió',
  no_asistio: 'Faltó',
  pendiente: 'Pendiente',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada'
};

const addDays = (value, days) => {
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
};

function SesionSemanalForm({ form, setForm, pacientes, editing, onSubmit, onCancel, error, syncedRegistro }) {
  const update = (key, value) => setForm({ ...form, [key]: value });

  const fillPacienteData = (pacienteId) => {
    const paciente = pacientes.find((item) => String(item.id) === String(pacienteId));
    setForm({
      ...form,
      paciente_id: pacienteId,
      telefono: paciente?.telefono || '',
      edad: paciente?.edad || '',
      sexo: paciente?.sexo || '',
      diagnostico: paciente?.historias_clinicas?.[0]?.diagnostico_medico || form.diagnostico || ''
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid max-h-[68vh] gap-2.5 overflow-y-auto pr-1">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex items-start gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
        <CalendarSync className="mt-0.5 shrink-0" size={18} />
        Las atenciones diarias aparecen automáticamente. Este formulario solo completa el resumen clínico y administrativo.
      </div>

      <section className="rounded-lg border border-brand-100 bg-brand-50/45 p-3">
        <div className="mb-2.5 flex items-center gap-2 text-brand-800">
          <CalendarDays size={16} />
          <h3 className="text-sm font-black">Paciente y periodo</h3>
        </div>
        <div className="grid gap-2.5 md:grid-cols-3">
          <Input
            label="Paciente"
            value={form.paciente_id}
            onChange={(event) => fillPacienteData(event.target.value)}
            options={[
              { value: '', label: 'Seleccionar paciente' },
              ...pacientes.map((paciente) => ({
                value: paciente.id,
                label: `${paciente.nombres} ${paciente.apellidos || ''}`.trim()
              }))
            ]}
            required
            compact
          />
          <Input
            compact
            label="Semana inicio"
            type="date"
            value={form.semana_inicio}
            onChange={(event) => setForm({
              ...form,
              semana_inicio: event.target.value,
              semana_fin: event.target.value ? addDays(event.target.value, 6) : ''
            })}
            required
          />
          <Input compact label="Semana fin" type="date" value={form.semana_fin} onChange={(event) => update('semana_fin', event.target.value)} required />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2.5 flex items-center gap-2 text-slate-800">
          <UserRound size={16} className="text-brand-600" />
          <h3 className="text-sm font-black">Datos del paciente</h3>
        </div>
        <div className="grid gap-2.5 md:grid-cols-3">
          <Input compact label="Teléfono" value={form.telefono} onChange={(event) => update('telefono', event.target.value)} />
          <Input compact label="Edad" type="number" min="0" value={form.edad} onChange={(event) => update('edad', event.target.value)} />
          <Input
            compact
            label="Sexo"
            value={form.sexo}
            onChange={(event) => update('sexo', event.target.value)}
            options={[
              { value: '', label: 'No registrado' },
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Femenino' },
              { value: 'Otro', label: 'Otro' }
            ]}
          />
          <Input
            label="Diagnóstico"
            value={form.diagnostico}
            onChange={(event) => update('diagnostico', event.target.value)}
            multiline
            rows={2}
            compact
            className="md:col-span-3"
          />
        </div>
      </section>

      <section className="rounded-lg border border-blue-100 bg-blue-50/45 p-3">
        <div className="mb-2.5 flex items-center gap-2 text-blue-800">
          <ClipboardList size={16} />
          <h3 className="text-sm font-black">Datos administrativos</h3>
        </div>
        <div className="grid gap-4">
          <Input compact label="Deuda Bs" type="number" min="0" step="0.01" value={form.debe_bs} onChange={(event) => update('debe_bs', event.target.value)} />
        </div>
      </section>

      <section className="rounded-lg border border-cyan-100 bg-cyan-50/45 p-3">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-cyan-800">
            <CalendarSync size={16} />
            <h3 className="text-sm font-black">Sesiones diarias sincronizadas</h3>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
            {syncedRegistro?.total_sesiones || 0} sesiones
          </span>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {dias.map((dia) => {
            const sesiones = syncedRegistro?.sesiones_resumen?.[dia] || [];
            return (
              <article key={dia} className="rounded-lg border border-white bg-white/90 p-2.5 shadow-sm">
                <strong className="text-xs capitalize text-slate-600">{dia}</strong>
                {sesiones.length ? (
                  <div className="mt-2 grid gap-2">
                    {sesiones.map((sesion) => (
                      <div key={sesion.id} className="text-xs text-slate-600">
                        <span className="font-black text-slate-800">{labels[sesion.asistencia] || sesion.asistencia}</span>
                        <span className="block">Pago: {sesion.metodo_pago || 'Pendiente'} · {sesion.estado_pago || 'Pendiente'}</span>
                        <span className={`block font-semibold ${sesion.aplica_farmacos ? 'text-violet-600' : 'text-slate-400'}`}>
                          Fármacos: {sesion.aplica_farmacos ? 'Sí' : 'No'}
                        </span>
                        {sesion.observacion_farmacos && <span className="mt-1 block truncate text-violet-500">{sesion.observacion_farmacos}</span>}
                        {sesion.observacion && <span className="mt-1 block truncate text-slate-400">{sesion.observacion}</span>}
                      </div>
                    ))}
                  </div>
                ) : <span className="mt-2 block text-xs text-slate-400">Sin atención registrada</span>}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2.5 flex items-center gap-2 text-slate-800">
          <ClipboardList size={16} className="text-brand-600" />
          <h3 className="text-sm font-black">Observación semanal</h3>
        </div>
        <Input
          label="Resumen de evolución semanal"
          value={form.observacion}
          onChange={(event) => update('observacion', event.target.value)}
          multiline
          rows={2}
          compact
          placeholder="Resume la continuidad, evolución y recomendaciones de la semana..."
        />
      </section>

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 pt-2.5 backdrop-blur">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">
          <Save size={17} />
          {editing ? 'Actualizar semana' : 'Guardar semana'}
        </Button>
      </div>
    </form>
  );
}

export default SesionSemanalForm;
