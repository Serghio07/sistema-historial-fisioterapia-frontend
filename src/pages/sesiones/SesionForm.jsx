import { Activity, ArrowLeft, CalendarDays, CalendarSync, Check, ChevronRight, CreditCard, Pill, Plus, Save, Trash2, UserRound } from 'lucide-react';
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
const emptyFarmaco = () => ({
  nombre: '',
  nombre_otro: '',
  presentacion_dosis: '',
  via: '',
  via_otro: '',
  cantidad: 1,
  motivo_clinico: '',
  observacion: ''
});

function SesionForm({ form, setForm, pacientes, historias, sesiones, programaciones = [], editing, onSubmit, onCancel, error, initialTab = 'session', canEditDate = false }) {
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
  const montoSesion = form.estado_pago === 'Sin costo' ? 0 : toMoney(form.monto_sesion);
  const montoPagado = ['Pendiente', 'Sin costo'].includes(form.estado_pago) && !form.monto_pagado ? '' : form.monto_pagado;
  const saldoPendiente = Math.max(montoSesion - montoPagado, 0);
  const puedeContinuar = Boolean(form.paciente_id && form.historia_clinica_id && form.fecha) && !planCompleto;
  const requiereEvolucion = form.asistencia === 'asistio';
  const programacionesPaciente = programaciones
    .filter((cita) => String(cita.paciente_id || cita.paciente?.id) === String(form.paciente_id))
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora_inicio).localeCompare(String(b.hora_inicio)));

  const dolorInicialParaHistoria = (historia, historySessions) => {
    const previousPain = [...historySessions]
      .filter((sesion) => isSesionActivaRealizada(sesion) && (!editing || String(sesion.id) !== String(editing)))
      .sort((a, b) => Number(a.numero_sesion || 0) - Number(b.numero_sesion || 0) || String(a.fecha || '').localeCompare(String(b.fecha || '')))
      .map((sesion) => sesion.dolor_despues)
      .filter((value) => value !== '' && value != null)
      .at(-1);
    return previousPain ?? historia?.intervencion_clinica?.escala_dolor ?? '';
  };

  const applyProgramacion = (cita, baseForm = form) => {
    const historia = historias.find((item) => String(item.id) === String(cita.historia_clinica_id || cita.historia_clinica?.id));
    if (!historia) return;
    const realizadasHistoria = sesiones.filter((sesion) =>
      String(sesion.historia_clinica_id || sesion.historia_clinica?.id) === String(historia.id)
      && isSesionActivaRealizada(sesion)
      && (!editing || String(sesion.id) !== String(editing))
    ).length;
    setForm({
      ...baseForm,
      cita_id: cita.id,
      paciente_id: cita.paciente_id || cita.paciente?.id,
      historia_clinica_id: historia.id,
      fecha: cita.fecha,
      numero_sesion: cita.numero_sesion,
      sesiones_debe: cita.total_sesiones || historia.evaluacion_final?.sesiones_contratadas || 0,
      sesiones_hizo: realizadasHistoria + 1,
      profesional_responsable: cita.profesional?.nombre || baseForm.profesional_responsable || '',
      dolor_antes: dolorInicialParaHistoria(historia, sesiones.filter((sesion) => String(sesion.historia_clinica_id) === String(historia.id))),
      dolor_despues: ''
    });
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

    const nextForm = {
      ...form,
      cita_id: '',
      paciente_id: pacienteId,
      historia_clinica_id: autoHistoria?.id || '',
      numero_sesion: autoHistoria ? autoRealizadas + 1 : 1,
      dolor_antes: autoHistoria ? dolorInicialParaHistoria(autoHistoria, autoSesiones) : '',
      dolor_despues: '',
      sesiones_debe: autoContratadas,
      sesiones_hizo: autoHistoria ? autoRealizadas + 1 : 0
    };
    const pendientes = programaciones
      .filter((cita) => String(cita.paciente_id || cita.paciente?.id) === String(pacienteId))
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
    const programadaHoy = pendientes.find((cita) => cita.fecha === new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' }));
    const programacionAutomatica = programadaHoy || (pendientes.length === 1 ? pendientes[0] : null);
    if (programacionAutomatica) applyProgramacion(programacionAutomatica, nextForm);
    else setForm(nextForm);
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
    const nextMontoSesion = next.estado_pago === 'Sin costo' ? 0 : toMoney(next.monto_sesion);
    const isChangingStatus = Object.prototype.hasOwnProperty.call(changes, 'estado_pago');
    const forcedPaid = isChangingStatus && next.estado_pago === 'Pagado'
      ? nextMontoSesion
      : isChangingStatus && ['Pendiente', 'Sin costo'].includes(next.estado_pago)
        ? ''
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
      saldo_pendiente: nextSaldo,
      metodo_pago: ['Pendiente', 'Sin costo'].includes(nextEstadoPago)
        ? ''
        : next.metodo_pago || (nextMontoPagado > 0 ? 'Efectivo' : ''),
      motivo_sin_costo: next.estado_pago === 'Sin costo' ? next.motivo_sin_costo : ''
    });
  };

  const updateFarmaco = (index, key, value) => {
    const farmacos = [...(form.farmacos || [])];
    farmacos[index] = { ...farmacos[index], [key]: value };
    setForm({ ...form, farmacos, aplica_farmacos: true });
  };
  const setAdministraFarmacos = (value) => {
    if (!value && form.farmacos?.length && !window.confirm('Se eliminarán los medicamentos ingresados. ¿Desea continuar?')) return;
    setForm({ ...form, aplica_farmacos: value, farmacos: value ? (form.farmacos?.length ? form.farmacos : [emptyFarmaco()]) : [] });
  };
  const evolucionCompleta = String(form.descripcion_tratamiento || '').trim()
    && String(form.evolucion_observada || form.observacion || '').trim()
    && form.dolor_despues !== '' && form.dolor_despues != null;
  const selectAsistencia = (value) => {
    if (value !== 'asistio' && form.farmacos?.length && !window.confirm('La asistencia seleccionada no permite administrar fármacos. ¿Desea eliminar los medicamentos ingresados?')) return;
    setForm({
      ...form,
      asistencia: value,
      aplica_farmacos: value === 'asistio' ? form.aplica_farmacos : false,
      farmacos: value === 'asistio' ? form.farmacos : []
    });
    if (value !== 'asistio') setTab('session');
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-h-[72vh] min-w-0 gap-3 overflow-x-hidden overflow-y-auto pr-1">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {planCompleto && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">El paciente ya completó las {contratadas} sesiones contratadas para esta historia clínica. No se pueden registrar más sesiones.</p>}

      <div className="flex items-start gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
        <CalendarSync className="mt-0.5 shrink-0" size={18} />
        Al guardar esta atencion, se reflejara automaticamente en Sesiones Semanales.
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'session'} onClick={() => setTab('session')} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${tab === 'session' ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200' : 'text-slate-500 hover:text-slate-700'}`}><CalendarDays size={15} />Datos de la sesión</button>
        <button type="button" role="tab" aria-selected={tab === 'evolution'} disabled={!puedeContinuar || !requiereEvolucion} onClick={() => setTab('evolution')} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${tab === 'evolution' ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-500' : 'text-slate-500 hover:text-slate-700'}`}><Activity size={15} />Evolución clínica</button>
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
            disabled={Boolean(form.cita_id)}
          />
          {programacionesPaciente.length > 0 && <Input
            compact
            label="Seleccionar sesión programada"
            value={form.cita_id || ''}
            onChange={(event) => {
              const cita = programacionesPaciente.find((item) => String(item.id) === String(event.target.value));
              if (cita) applyProgramacion(cita);
            }}
            options={[
              { value: '', label: 'Seleccionar fecha programada' },
              ...programacionesPaciente.map((cita) => ({
                value: cita.id,
                label: `Sesión ${cita.numero_sesion} de ${cita.total_sesiones} — ${cita.fecha} — ${cita.hora_inicio?.slice(0, 5)}`
              }))
            ]}
          />}
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
            disabled={!form.paciente_id || Boolean(form.cita_id)}
          />
          <Input compact label="Fecha" type="date" value={form.fecha} onChange={(event) => update('fecha', event.target.value)} disabled={!canEditDate} required />
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Asistencia">
          {[
            ['asistio', 'Asistió'],
            ['no_asistio', 'Faltó'],
            ['pendiente', 'Pendiente'],
            ['cancelada', 'Cancelada'],
            ['reprogramada', 'Reprogramada']
          ].map(([value, label]) => {
            const selected = form.asistencia === value;
            return <button key={value} type="button" role="radio" aria-checked={selected} onClick={() => selectAsistencia(value)} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black transition ${selected ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-blue-200 bg-white text-slate-600 hover:border-blue-400 hover:bg-blue-50'}`}>{selected && <Check size={15} />}{label}</button>;
          })}
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
              { value: '', label: 'Seleccionar método' },
              { value: 'Efectivo', label: 'Efectivo' },
              { value: 'QR', label: 'QR' },
              { value: 'Transferencia', label: 'Transferencia' },
              { value: 'Tarjeta', label: 'Tarjeta' },
              { value: 'Otro', label: 'Otro' }
            ]}
            disabled={['Pendiente', 'Sin costo'].includes(form.estado_pago)}
          />
          <Input
            compact
            label="Estado de pago"
            value={form.estado_pago}
            onChange={(event) => updatePago({ estado_pago: event.target.value })}
            options={[
              { value: 'Pendiente', label: 'Pendiente' },
              { value: 'Pagado', label: 'Pagado' },
              { value: 'Parcial', label: 'Pago parcial' },
              { value: 'Sin costo', label: 'Sin costo' }
            ]}
          />
          <Input compact label="Monto de la sesion" type="number" min="0" step="0.01" value={form.estado_pago === 'Sin costo' ? 0 : form.monto_sesion} onChange={(event) => updatePago({ monto_sesion: event.target.value })} disabled={form.estado_pago === 'Sin costo'} />
          <Input compact label="Monto pagado" type="number" min="0" step="0.01" value={montoPagado} onChange={(event) => updatePago({ monto_pagado: event.target.value })} disabled={form.estado_pago === 'Sin costo'} placeholder="0" />
          <Input compact label="Saldo pendiente" type="number" min="0" step="0.01" value={saldoPendiente} readOnly />
          <Input compact label="Observación del pago (opcional)" value={form.observacion_pago} onChange={(event) => update('observacion_pago', event.target.value.toLocaleUpperCase('es-BO'))} />
          {form.estado_pago === 'Sin costo' && <Input compact label="Motivo de la sesión sin costo" value={form.motivo_sin_costo} onChange={(event) => update('motivo_sin_costo', event.target.value.toLocaleUpperCase('es-BO'))} placeholder="Cortesía, reposición, promoción u otro" required />}
        </div>
      </Section>

      {form.asistencia !== 'asistio' && <Section title="Observación administrativa" icon={CalendarSync} tone="cyan"><Input compact label="Observación (opcional)" value={form.observacion} onChange={(event) => update('observacion', event.target.value.toLocaleUpperCase('es-BO'))} multiline placeholder="Motivo de falta, cancelación, reprogramación u otra novedad administrativa" /></Section>}
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
        {!requiereEvolucion && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">La asistencia está marcada como “{form.asistencia === 'no_asistio' ? 'Faltó' : form.asistencia === 'reprogramada' ? 'Reprogramada' : form.asistencia === 'cancelada' ? 'Cancelada' : 'Pendiente'}”. Esta sesión no requiere una evolución clínica.</div>}
        {requiereEvolucion && <>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Dolor inicial (último dolor final)" type="number" min="0" max="10" value={form.dolor_antes} readOnly />
          <Input
            key={`dolor-final-${editing || 'nueva'}-${form.historia_clinica_id || 'sin-historia'}-${form.numero_sesion || 1}`}
            label="Dolor final de esta sesión (0-10)"
            type="number"
            min="0"
            max="10"
            value={form.dolor_despues}
            onChange={(event) => update('dolor_despues', event.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <p className="-mt-2 text-[11px] text-slate-500">El dolor final de la última sesión se convierte en el dolor inicial de esta sesión. El nuevo dolor final se registra al terminar la atención.</p>
        <Input label="Procedimiento realizado" value={form.descripcion_tratamiento} onChange={(event) => update('descripcion_tratamiento', event.target.value.toLocaleUpperCase('es-BO'))} multiline required />
        <Input label="Observaciones" value={form.evolucion_observada || form.observacion} onChange={(event) => setForm({ ...form, evolucion_observada: event.target.value.toLocaleUpperCase('es-BO'), observacion: event.target.value.toLocaleUpperCase('es-BO') })} multiline />
        <Section title="Administración de fármacos según evolución" icon={Pill} tone="cyan">
          <p className="mb-3 rounded-lg border border-cyan-100 bg-white/80 px-3 py-2 text-xs text-cyan-800">Los fármacos se administran de acuerdo con la evolución clínica registrada durante la sesión.</p>
          <p className="text-xs font-black text-slate-700">¿Se administraron fármacos según la evolución del paciente?</p>
          <div className="mt-2 flex gap-2">
            {[false, true].map((value) => <button key={String(value)} type="button" onClick={() => setAdministraFarmacos(value)} disabled={value && !evolucionCompleta} className={`min-h-9 rounded-lg border px-5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${Boolean(form.aplica_farmacos) === value ? 'border-teal-600 bg-teal-600 text-white' : 'border-teal-200 bg-white text-slate-600 hover:bg-teal-50'}`}>{value ? 'Sí' : 'No'}</button>)}
          </div>
          {!evolucionCompleta && <p className="mt-2 text-xs font-semibold text-amber-700">Primero registre la evolución clínica del paciente antes de administrar fármacos.</p>}
          {form.aplica_farmacos && evolucionCompleta && <div className="mt-4 grid gap-3">
            <div className="rounded-lg border border-teal-100 bg-white px-3 py-2 text-xs text-slate-600">Vinculado a: sesión N.º {form.numero_sesion} · {form.fecha} · Historia clínica activa.</div>
            {(form.farmacos || []).map((farmaco, index) => <article key={farmaco.id || index} className="rounded-lg border border-teal-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between"><strong className="text-sm text-teal-800">Fármaco {index + 1}</strong><button type="button" onClick={() => setForm({ ...form, farmacos: form.farmacos.filter((_, current) => current !== index) })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 px-2 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={14} />Eliminar</button></div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input compact label="Fármaco" value={farmaco.nombre} onChange={(event) => updateFarmaco(index, 'nombre', event.target.value)} options={[{ value: '', label: 'Seleccionar' }, { value: 'Diclofenaco', label: 'Diclofenaco' }, { value: 'Dexametasona', label: 'Dexametasona' }, { value: 'Complejo B', label: 'Complejo B' }, { value: 'Otro', label: 'Otro' }]} required />
                {farmaco.nombre === 'Otro' && <Input compact label="Nombre del fármaco" value={farmaco.nombre_otro} onChange={(event) => updateFarmaco(index, 'nombre_otro', event.target.value.toLocaleUpperCase('es-BO'))} required />}
                <Input compact label="Presentación o dosis" value={farmaco.presentacion_dosis} onChange={(event) => updateFarmaco(index, 'presentacion_dosis', event.target.value.toLocaleUpperCase('es-BO'))} placeholder="Ej. 3 ml, 1 ampolla, 500 mg" required />
                <Input compact label="Vía de administración" value={farmaco.via} onChange={(event) => updateFarmaco(index, 'via', event.target.value)} options={[{ value: '', label: 'Seleccionar' }, { value: 'IM – Intramuscular', label: 'IM – Intramuscular' }, { value: 'IV – Intravenosa', label: 'IV – Intravenosa' }, { value: 'VO – Vía oral', label: 'VO – Vía oral' }, { value: 'SC – Subcutánea', label: 'SC – Subcutánea' }, { value: 'Tópica', label: 'Tópica' }, { value: 'Otra', label: 'Otra' }]} required />
                {farmaco.via === 'Otra' && <Input compact label="Especificar vía" value={farmaco.via_otro} onChange={(event) => updateFarmaco(index, 'via_otro', event.target.value.toLocaleUpperCase('es-BO'))} required />}
                <Input compact label="Cantidad" type="number" min="1" step="1" value={farmaco.cantidad} onChange={(event) => updateFarmaco(index, 'cantidad', event.target.value)} required />
                <Input compact label="Motivo clínico" value={farmaco.motivo_clinico} onChange={(event) => updateFarmaco(index, 'motivo_clinico', event.target.value.toLocaleUpperCase('es-BO'))} placeholder="Dolor persistente, inflamación..." required />
                <Input compact label="Observación (opcional)" value={farmaco.observacion} onChange={(event) => updateFarmaco(index, 'observacion', event.target.value.toLocaleUpperCase('es-BO'))} />
              </div>
            </article>)}
            <button type="button" onClick={() => setForm({ ...form, farmacos: [...(form.farmacos || []), emptyFarmaco()] })} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-teal-400 bg-teal-50 px-4 text-xs font-black text-teal-700 hover:bg-teal-100"><Plus size={16} />Agregar fármaco</button>
          </div>}
        </Section>
        </>}
      </div>}

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 pt-2.5 backdrop-blur">
        {error && <p className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        {tab === 'session' ? requiereEvolucion ? <Button type="button" disabled={!puedeContinuar} onClick={() => setTab('evolution')}>Siguiente <ChevronRight size={17} /></Button> : <Button type="submit" disabled={planCompleto}><Save size={17} />Guardar sesión</Button> : <>
          <Button type="button" variant="secondary" onClick={() => setTab('session')}><ArrowLeft size={17} />Atrás</Button>
          <Button type="submit" disabled={planCompleto}>
            <Save size={17} />
            {editing ? 'Actualizar sesión' : 'Guardar sesión'}
          </Button>
        </>}
      </div>
    </form>
  );
}

export default SesionForm;
