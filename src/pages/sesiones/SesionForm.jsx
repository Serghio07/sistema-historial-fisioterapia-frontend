import { Activity, CalendarDays, CalendarSync, CreditCard, Pill, Save, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function Section({ title, icon: Icon, tone = 'brand', children }) {
  const colors = tone === 'blue'
    ? 'border-blue-100 bg-blue-50/45 text-blue-800'
    : tone === 'cyan'
      ? 'border-cyan-100 bg-cyan-50/45 text-cyan-800'
      : 'border-brand-100 bg-brand-50/45 text-brand-800';
  return (
    <section className={`rounded-lg border p-3 ${colors}`}>
      <div className="mb-2.5 flex items-center gap-2">
        <Icon size={16} />
        <h3 className="text-sm font-black">{title}</h3>
      </div>
      {children}
    </section>
  );
}

const toMoney = (value) => Math.max(Number(value || 0), 0);
const isSesionActivaRealizada = (sesion) =>
  !sesion?.anulada && String(sesion?.estado || '').toLowerCase() !== 'anulada' && sesion.asistencia === 'asistio';
const cleanClinicalText = (value, fallback = 'Sin dato') => {
  const text = String(value || '').trim();
  return text && text.toLowerCase() !== 'ninguna' ? text : fallback;
};
const historiaZona = (historia) =>
  cleanClinicalText(historia?.condicion_actual?.zona_cuerpo || historia?.motivo_consulta || historia?.diagnostico_medico, 'Historia activa');
const historiaDx = (historia) =>
  cleanClinicalText(historia?.diagnostico_medico || historia?.evaluacion_final?.diagnostico_kinesico_cif);
const historiaOptionLabel = (historia) =>
  `${historia?.fecha_evaluacion || 'Sin fecha'} - ${historiaZona(historia)} - Activa`;

function SesionForm({ form, setForm, pacientes, historias, sesiones, editing, onSubmit, onCancel, error, initialTab = 'session' }) {
  const [tab, setTab] = useState(initialTab);
  useEffect(() => setTab(initialTab), [initialTab, editing]);
  const update = (key, value) => setForm({ ...form, [key]: value });
  const historiasActivas = historias
    .filter((historia) => historia.estado === 'activa' && !historia.anulada && String(historia.paciente_id || historia.paciente?.id) === String(form.paciente_id))
    .sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || Number(b.id || 0) - Number(a.id || 0));
  const selectedHistoria = historias.find((historia) => String(historia.id) === String(form.historia_clinica_id));
  const selectedPaciente = pacientes.find((paciente) => String(paciente.id) === String(form.paciente_id));
  const nombreSeleccionado = selectedPaciente
    ? `${selectedPaciente.nombres || ''} ${selectedPaciente.apellidos || selectedPaciente.apellido_paterno || ''}`.trim()
    : 'Paciente sin seleccionar';
  const sesionesContratadas = Number(selectedHistoria?.evaluacion_final?.sesiones_contratadas || 0);
  const sesionesRealizadasPrevias = sesiones.filter((sesion) =>
    String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(form.historia_clinica_id)
    && isSesionActivaRealizada(sesion)
    && (!editing || String(sesion.id) !== String(editing))
  ).length;
  // La historia clínica seleccionada es la fuente de verdad. Evita reutilizar
  // el total acumulado del paciente o un valor anterior conservado en el formulario.
  const contratadas = selectedHistoria
    ? sesionesContratadas
    : Number(form.sesiones_debe || 0);
  const planCompleto = !editing && contratadas > 0 && sesionesRealizadasPrevias >= contratadas;
  const cuentaEstaSesion = form.asistencia === 'asistio' && !planCompleto ? 1 : 0;
  const realizadas = form.historia_clinica_id ? sesionesRealizadasPrevias + cuentaEstaSesion : Number(form.sesiones_hizo || 0);
  const restantes = Math.max(contratadas - realizadas, 0);
  const progress = contratadas > 0 ? Math.min((realizadas / contratadas) * 100, 100) : 0;
  const montoSesion = toMoney(form.monto_sesion);
  const montoPagado = form.estado_pago === 'Debe' ? 0 : toMoney(form.monto_pagado);
  const saldoPendiente = Math.max(montoSesion - montoPagado, 0);

  const dolorInicialParaHistoria = (historia, historySessions) => {
    const previousPain = [...historySessions]
      .filter((sesion) => isSesionActivaRealizada(sesion) && (!editing || String(sesion.id) !== String(editing)))
      .sort((a, b) => Number(a.numero_sesion || 0) - Number(b.numero_sesion || 0) || String(a.fecha || '').localeCompare(String(b.fecha || '')))
      .map((sesion) => sesion.dolor_despues)
      .filter((value) => value !== '' && value != null)
      .at(-1);
    return previousPain ?? historia?.intervencion_clinica?.escala_dolor ?? '';
  };

  const selectPaciente = (pacienteId) => {
    const activeHistories = historias
      .filter((historia) => historia.estado === 'activa' && !historia.anulada && String(historia.paciente_id || historia.paciente?.id) === String(pacienteId))
      .sort((a, b) => String(b.fecha_evaluacion || '').localeCompare(String(a.fecha_evaluacion || '')) || Number(b.id || 0) - Number(a.id || 0));
    const autoHistoria = activeHistories.length === 1 ? activeHistories[0] : null;
    const autoContratadas = Number(autoHistoria?.evaluacion_final?.sesiones_contratadas || 0);
    const autoRealizadas = autoHistoria
      ? sesiones.filter((sesion) =>
        String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(autoHistoria.id)
        && isSesionActivaRealizada(sesion)
        && (!editing || String(sesion.id) !== String(editing))
      ).length
      : 0;
    const autoSesiones = autoHistoria
      ? sesiones.filter((sesion) => String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(autoHistoria.id))
      : [];

    setForm({
      ...form,
      paciente_id: pacienteId,
      historia_clinica_id: autoHistoria?.id || '',
      numero_sesion: autoHistoria ? autoRealizadas + 1 : 1,
      dolor_antes: autoHistoria ? dolorInicialParaHistoria(autoHistoria, autoSesiones) : '',
      dolor_despues: '',
      sesiones_debe: autoContratadas,
      sesiones_hizo: autoHistoria ? autoRealizadas + 1 : 0
    });
  };

  const selectHistoria = (historiaId) => {
    const historia = historias.find((item) => String(item.id) === String(historiaId));
    const contratadasHistoria = Number(historia?.evaluacion_final?.sesiones_contratadas || 0);
    const realizadasHistoria = sesiones.filter((sesion) =>
      String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(historiaId)
      && isSesionActivaRealizada(sesion)
      && (!editing || String(sesion.id) !== String(editing))
    ).length;
    const siguiente = historiaId ? realizadasHistoria + 1 : 1;
    const sesionesHistoria = sesiones.filter((sesion) =>
      String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(historiaId)
    );

    setForm({
      ...form,
      historia_clinica_id: historiaId,
      sesiones_debe: historiaId ? contratadasHistoria : 0,
      sesiones_hizo: historiaId ? siguiente : 0,
      numero_sesion: siguiente,
      dolor_antes: historiaId ? dolorInicialParaHistoria(historia, sesionesHistoria) : '',
      dolor_despues: ''
    });
  };

  const updatePago = (changes) => {
    const next = { ...form, ...changes };
    const nextMontoSesion = toMoney(next.monto_sesion);
    const isChangingStatus = Object.prototype.hasOwnProperty.call(changes, 'estado_pago');
    const forcedPaid = isChangingStatus && next.estado_pago === 'Pagado'
      ? nextMontoSesion
      : isChangingStatus && next.estado_pago === 'Debe'
        ? 0
        : next.monto_pagado;
    const nextMontoPagado = toMoney(forcedPaid);
    const nextSaldo = Math.max(nextMontoSesion - nextMontoPagado, 0);
    const nextEstadoPago = isChangingStatus
      ? next.estado_pago
      : nextMontoSesion > 0 && nextMontoPagado >= nextMontoSesion
        ? 'Pagado'
        : nextMontoPagado > 0
          ? 'Parcial'
          : next.estado_pago === 'Debe'
            ? 'Debe'
            : 'Pendiente';

    setForm({
      ...next,
      estado_pago: nextEstadoPago,
      monto_pagado: forcedPaid,
      saldo_pendiente: nextSaldo
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid max-h-[72vh] min-w-0 gap-3 overflow-x-hidden overflow-y-auto pr-1">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {planCompleto && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">El paciente ya completó las {contratadas} sesiones contratadas para esta historia clínica. No se pueden registrar más sesiones.</p>}

      <div className="flex items-start gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
        <CalendarSync className="mt-0.5 shrink-0" size={18} />
        Al guardar esta atencion, se reflejara automaticamente en Sesiones Semanales.
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'session'} onClick={() => setTab('session')} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${tab === 'session' ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200' : 'text-slate-500 hover:text-slate-700'}`}><CalendarDays size={15} />Datos de la sesión</button>
        <button type="button" role="tab" aria-selected={tab === 'evolution'} onClick={() => setTab('evolution')} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${tab === 'evolution' ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-500' : 'text-slate-500 hover:text-slate-700'}`}><Activity size={15} />Evolutivo clínico</button>
      </div>

      {tab === 'session' && <>

      <Section title="Datos de la sesion" icon={CalendarDays}>
        <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
          <Input
            label="Paciente"
            value={form.paciente_id}
            onChange={(event) => selectPaciente(event.target.value)}
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
            label="Historia clinica activa"
            value={form.historia_clinica_id}
            onChange={(event) => selectHistoria(event.target.value)}
            options={[
              { value: '', label: form.paciente_id ? 'Seleccionar historia activa' : 'Seleccione un paciente' },
              ...historiasActivas.map((historia) => ({
                value: historia.id,
                label: historiaOptionLabel(historia)
              }))
            ]}
            required
            disabled={!form.paciente_id}
          />
          <Input compact label="Fecha" type="date" value={form.fecha} onChange={(event) => update('fecha', event.target.value)} required />
          <Input compact label="Numero de sesion siguiente" type="number" min="1" value={form.numero_sesion} readOnly />
        </div>
        {selectedHistoria && (
          <div className="mt-2 rounded-lg border border-brand-100 bg-white/80 p-3 text-xs font-semibold text-slate-600">
            <strong className="block text-sm text-brand-900">
              {historiaOptionLabel(selectedHistoria)}
            </strong>
            <span>
              Dx: {historiaDx(selectedHistoria)} | Zona: {cleanClinicalText(selectedHistoria.condicion_actual?.zona_cuerpo)}
            </span>
          </div>
        )}
      </Section>

      <Section title="Control de sesiones" icon={Activity} tone="cyan">
        <div className="grid gap-2.5 md:grid-cols-3">
          <Input compact label="Sesiones contratadas" type="number" min="0" value={contratadas} readOnly />
          <Input compact label="Realizadas al guardar" type="number" min="0" value={realizadas} readOnly />
          <label className="grid gap-0.5 text-xs font-bold text-slate-700">
            <span>Sesiones restantes</span>
            <span className="flex min-h-9 items-center rounded-lg border border-cyan-200 bg-white px-3 text-base font-black text-cyan-800 shadow-sm">
              {restantes}
            </span>
          </label>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-black uppercase text-cyan-800">
            <span>{Math.round(progress)}% completado</span>
            <span>{realizadas} / {contratadas}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-cyan-800">El numero de sesion siguiente se calcula automaticamente. Solo Asistio suma como realizada.</p>
        </div>
      </Section>

      <Section title="Asistencia" icon={CreditCard} tone="blue">
        <div className="grid gap-2.5 md:grid-cols-3">
          <Input
            compact
            label="Asistencia"
            value={form.asistencia}
            onChange={(event) => update('asistencia', event.target.value)}
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'asistio', label: 'Asistio' },
              { value: 'no_asistio', label: 'Falto' },
              { value: 'cancelada', label: 'Cancelada' },
              { value: 'reprogramada', label: 'Reprogramada' }
            ]}
          />
        </div>
      </Section>

      <Section title="Informacion de pago" icon={CreditCard} tone="blue">
        <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            compact
            label="Metodo de pago"
            value={form.metodo_pago}
            onChange={(event) => updatePago({ metodo_pago: event.target.value })}
            options={[
              { value: 'Pendiente', label: 'Pendiente' },
              { value: 'Efectivo', label: 'Efectivo' },
              { value: 'QR', label: 'QR' },
              { value: 'Transferencia', label: 'Transferencia' },
              { value: 'Otro', label: 'Otro' }
            ]}
          />
          <Input
            compact
            label="Estado de pago"
            value={form.estado_pago}
            onChange={(event) => updatePago({ estado_pago: event.target.value })}
            options={[
              { value: 'Pendiente', label: 'Pendiente' },
              { value: 'Pagado', label: 'Pagado' },
              { value: 'Parcial', label: 'Parcial' },
              { value: 'Debe', label: 'Debe' }
            ]}
          />
          <Input compact label="Monto de la sesion" type="number" min="0" step="0.01" value={form.monto_sesion} onChange={(event) => updatePago({ monto_sesion: event.target.value })} />
          <Input compact label="Monto pagado" type="number" min="0" step="0.01" value={form.estado_pago === 'Debe' ? 0 : form.monto_pagado} onChange={(event) => updatePago({ monto_pagado: event.target.value })} disabled={form.estado_pago === 'Debe'} placeholder="0" />
          <Input compact label="Saldo pendiente" type="number" min="0" step="0.01" value={saldoPendiente} readOnly />
        </div>
      </Section>

      <Section title="Farmacos" icon={Pill} tone="cyan">
        <div className="grid gap-2.5 md:grid-cols-[190px_1fr]">
          <label className={`flex min-h-9 items-center gap-2 self-start rounded-lg border px-3 text-xs font-bold ${
            form.aplica_farmacos ? 'border-violet-200 bg-violet-50 text-violet-800' : 'border-slate-200 bg-white text-slate-600'
          }`}>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              checked={Boolean(form.aplica_farmacos)}
              onChange={(event) => setForm({
                ...form,
                aplica_farmacos: event.target.checked,
                observacion_farmacos: event.target.checked ? form.observacion_farmacos : '',
                inyectable_nombre: event.target.checked ? form.inyectable_nombre : '',
                inyectable_dosis: event.target.checked ? form.inyectable_dosis : ''
              })}
            />
            Aplica farmacos
          </label>
          <Input
            compact
            label="Observacion de farmacos (opcional)"
            value={form.observacion_farmacos}
            onChange={(event) => update('observacion_farmacos', event.target.value)}
            disabled={!form.aplica_farmacos}
            placeholder={form.aplica_farmacos ? 'Ej. Se aplico antiinflamatorio topico...' : 'Activa la opcion para registrar una observacion'}
          />
          <Input compact label="Inyectable aplicado" value={form.inyectable_nombre} onChange={(event) => update('inyectable_nombre', event.target.value.toLocaleUpperCase('es-BO'))} disabled={!form.aplica_farmacos} />
          <Input compact label="Dosis o presentación" value={form.inyectable_dosis} onChange={(event) => update('inyectable_dosis', event.target.value.toLocaleUpperCase('es-BO'))} disabled={!form.aplica_farmacos} />
        </div>
      </Section>
      </>}

      {tab === 'evolution' && <div className="grid gap-3">
        <div className="rounded-lg border border-brand-100 bg-brand-50/45 px-4 py-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <UserRound size={18} className="text-brand-700" />
            <strong className="text-brand-800">Paciente: {nombreSeleccionado}</strong>
            <span>Sesión N.º {form.numero_sesion || 1}</span>
            <span>•</span>
            <span>{form.fecha || 'Sin fecha'}</span>
            <span>•</span>
            <span>{historiaZona(selectedHistoria)}</span>
            <span>• Activa</span>
          </div>
          <p className="mt-1 pl-7">Dx: {historiaDx(selectedHistoria)} | Zona: {historiaZona(selectedHistoria)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Dolor inicial (desde historia clínica)" type="number" min="0" max="10" value={form.dolor_antes} readOnly />
          <Input label="Dolor final (0-10)" type="number" min="0" max="10" value={form.dolor_despues} onChange={(event) => update('dolor_despues', event.target.value)} required />
        </div>
        <p className="-mt-2 text-[11px] text-slate-500">El dolor inicial se obtiene automáticamente del último evolutivo o de la evaluación de la historia clínica.</p>
        <Input label="Procedimiento realizado" value={form.descripcion_tratamiento} onChange={(event) => update('descripcion_tratamiento', event.target.value.toLocaleUpperCase('es-BO'))} multiline required />
        <Input label="Observaciones" value={form.evolucion_observada || form.observacion} onChange={(event) => setForm({ ...form, evolucion_observada: event.target.value.toLocaleUpperCase('es-BO'), observacion: event.target.value.toLocaleUpperCase('es-BO') })} multiline />
        <Input label="Inyectables (opcional)" value={form.inyectable_nombre} onChange={(event) => setForm({ ...form, aplica_farmacos: Boolean(event.target.value), inyectable_nombre: event.target.value.toLocaleUpperCase('es-BO') })} />
      </div>}

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 pt-2.5 backdrop-blur">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={planCompleto}>
          <Save size={17} />
          {tab === 'evolution' ? (editing ? 'Actualizar evolutivo' : 'Guardar evolutivo') : (editing ? 'Actualizar sesion' : 'Guardar sesion')}
        </Button>
      </div>
    </form>
  );
}

export default SesionForm;
