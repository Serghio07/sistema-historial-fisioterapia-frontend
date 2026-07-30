import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCheck,
  CircleDot,
  Database,
  History,
  Info,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  UserCheck,
  UserRound,
  Workflow
} from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import {
  resetWhatsappSimulation,
  sendWhatsappSimulationMessage,
  startWhatsappSimulation
} from '../../services/whatsappSimulatorService';

const newMessageId = () => `sim-in-${crypto.randomUUID()}`;

const statusMeta = {
  RECIBIDO: { label: 'Recibido', className: 'text-slate-500', icon: CircleDot },
  ENVIADO: { label: 'Enviado', className: 'text-teal-700', icon: CheckCheck },
  DELIVERED: { label: 'Entregado', className: 'text-blue-700', icon: CheckCheck },
  READ: { label: 'Leído', className: 'text-blue-700', icon: CheckCheck },
  ERROR: { label: 'Error', className: 'text-red-600', icon: AlertTriangle }
};

const formatTime = (message) => {
  const value = message.fecha_recepcion || message.fecha_envio || message.created_at;
  if (!value) return '--:--';
  return new Intl.DateTimeFormat('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/La_Paz'
  }).format(new Date(value));
};

function Status({ value }) {
  const data = statusMeta[value] || statusMeta.RECIBIDO;
  const Icon = data.icon;
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${data.className}`}><Icon size={11} />{data.label}</span>;
}

function TechnicalItem({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700"><Icon size={17} /></span>
      <div className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</span>
        <strong className="mt-0.5 block break-words text-xs text-slate-800">{children}</strong>
      </div>
    </div>
  );
}

function WhatsappSimulator() {
  const [phone, setPhone] = useState('591');
  const [origin, setOrigin] = useState('WHATSAPP');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [audit, setAudit] = useState([]);
  const [options, setOptions] = useState([]);
  const [text, setText] = useState('');
  const [lastPayload, setLastPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  const canStart = /^\d{8,15}$/.test(phone.replace(/\D/g, ''));
  const active = conversation?.estado === 'ACTIVA';
  const safeData = useMemo(() => conversation?.datos_temporales || {}, [conversation]);

  const applyResult = (result) => {
    setConversation(result.conversation);
    setMessages(result.messages || []);
    setAudit(result.audit || []);
    setOptions(result.response?.opciones || []);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  };

  const start = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await startWhatsappSimulation({ telefono: phone, origen: origin });
      applyResult(result);
      setLastPayload(null);
      setText('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const send = async (content = text, duplicatePayload = null) => {
    const value = String(content || '').trim();
    if (!value || !conversation) return;
    const payload = duplicatePayload || {
      messageId: newMessageId(),
      telefono: phone,
      contenido: value,
      tipo: 'text',
      origen: origin,
      fecha: new Date().toISOString(),
      conversacionId: conversation.id
    };
    setLoading(true);
    setError('');
    try {
      const result = await sendWhatsappSimulationMessage(payload);
      applyResult(result);
      if (!duplicatePayload) setLastPayload(payload);
      setText('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!conversation) return start();
    setLoading(true);
    setError('');
    try {
      const result = await resetWhatsappSimulation({
        conversacionId: conversation.id,
        telefono: phone,
        origen: origin
      });
      applyResult(result);
      setLastPayload(null);
      setText('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-section">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-teal-700"><MessageCircle size={16} />Configuración · WhatsApp</span>
          <h1 className="mt-2 text-2xl font-black text-ink sm:text-3xl">Simulador de agendamiento</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Prueba el flujo conversacional sin enviar mensajes reales ni modificar la agenda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-800"><Database size={14} />physio_whatsapp_test</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-800"><ShieldCheck size={14} />Modo prueba</span>
        </div>
      </header>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertTriangle size={20} className="mt-0.5 shrink-0" />
        <div><strong className="block">Entorno aislado</strong><span>Este simulador utiliza physio_whatsapp_test y no envía mensajes reales.</span></div>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid items-start gap-4 xl:grid-cols-[270px_minmax(0,1fr)_330px]">
        <aside className="panel grid gap-4 xl:sticky xl:top-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-ink"><Smartphone size={18} className="text-teal-700" />Configuración de prueba</h2>
            <p className="mt-1 text-xs text-slate-500">Define el remitente simulado y su origen.</p>
          </div>
          <Input label="Número del paciente" value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^\d+ -]/g, ''))} placeholder="59170000000" disabled={active} />
          <Input
            label="Origen"
            options={[
              { value: 'WHATSAPP', label: 'WhatsApp directo' },
              { value: 'WEB_WHATSAPP', label: 'Web → WhatsApp' }
            ]}
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            disabled={active}
          />
          <div className="grid gap-2">
            <Button onClick={start} disabled={!canStart || loading}><MessageCircle size={17} />Iniciar conversación</Button>
            <Button variant="secondary" onClick={reset} disabled={!canStart || loading}><RotateCcw size={17} />Reiniciar</Button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <strong className="flex items-center gap-2 text-slate-800"><Info size={15} />Alcance actual</strong>
            <p className="mt-2 leading-5">Identificación inicial y captura temporal. No crea pacientes, citas, reservas ni pagos.</p>
          </div>
        </aside>

        <main className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-teal-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-600 text-white"><Bot size={21} /></span>
              <div><h2 className="text-sm font-black text-ink">Physio Active · Simulador</h2><p className="text-xs text-slate-500">{conversation ? `${conversation.telefono_enmascarado} · ${conversation.estado}` : 'Conversación no iniciada'}</p></div>
            </div>
            {lastPayload && <Button variant="secondary" className="min-h-9 text-xs" onClick={() => send(lastPayload.contenido, lastPayload)} disabled={loading}><RefreshCw size={14} />Reenviar como duplicado</Button>}
          </div>

          <div ref={scrollRef} className="h-[500px] overflow-y-auto bg-[#eef5f3] p-4 sm:p-5">
            {!messages.length && (
              <div className="grid h-full place-items-center text-center">
                <div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-teal-600 shadow-sm"><MessageCircle size={27} /></span><h3 className="mt-3 font-black text-slate-700">Inicia una conversación</h3><p className="mt-1 max-w-xs text-sm text-slate-500">Los mensajes simulados aparecerán aquí.</p></div>
              </div>
            )}
            <div className="grid gap-3">
              {messages.map((message) => {
                const incoming = message.direccion === 'ENTRANTE';
                return (
                  <div key={message.id} className={`flex ${incoming ? 'justify-end' : 'justify-start'}`}>
                    <article className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[75%] ${incoming ? 'rounded-br-md bg-[#d9fdd3] text-slate-800' : 'rounded-bl-md bg-white text-slate-800'}`}>
                      {!incoming && <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-teal-700">Physio Active</span>}
                      <p className="whitespace-pre-wrap text-sm leading-5">{message.contenido_resumido}</p>
                      <div className="mt-1.5 flex items-center justify-end gap-2"><span className="text-[10px] text-slate-400">{formatTime(message)}</span><Status value={message.estado_envio} /></div>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            {options.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {options.map((option) => <button key={option.id} type="button" onClick={() => send(option.id)} disabled={loading} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-800 transition hover:border-teal-400 hover:bg-teal-100 disabled:opacity-50">{option.label}</button>)}
              </div>
            )}
            <form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex items-end gap-2">
              <Input aria-label="Mensaje" value={text} onChange={(event) => setText(event.target.value)} placeholder={active ? 'Escribe un mensaje…' : 'Inicia una conversación primero'} disabled={!active || loading} className="flex-1" maxLength={500} />
              <Button type="submit" disabled={!active || !text.trim() || loading} className="h-10 w-11 shrink-0 px-0" aria-label="Enviar mensaje"><Send size={18} /></Button>
            </form>
          </div>
        </main>

        <aside className="grid gap-4 xl:sticky xl:top-4">
          <section className="panel">
            <h2 className="flex items-center gap-2 text-base font-black text-ink"><Workflow size={18} className="text-teal-700" />Información técnica</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <TechnicalItem icon={MessageCircle} label="Conversación ID">{conversation?.id || '—'}</TechnicalItem>
              <TechnicalItem icon={Smartphone} label="Teléfono">{conversation?.telefono_enmascarado || '—'}</TechnicalItem>
              <TechnicalItem icon={Workflow} label="Origen">{conversation?.origen || origin}</TechnicalItem>
              <TechnicalItem icon={CircleDot} label="Estado">{conversation?.estado || 'SIN INICIAR'}</TechnicalItem>
              <TechnicalItem icon={History} label="Paso actual">{conversation?.paso_actual || '—'}</TechnicalItem>
              <TechnicalItem icon={UserRound} label="Paciente asociado">{conversation?.paciente?.nombre || 'No asociado'}</TechnicalItem>
              <TechnicalItem icon={UserCheck} label="Paciente verificado">{conversation?.paciente_verificado ? 'Sí' : 'No'}</TechnicalItem>
              <TechnicalItem icon={ShieldCheck} label="Intentos">{conversation?.intentos_verificacion ?? 0}</TechnicalItem>
              <TechnicalItem icon={Database} label="Reserva temporal">{conversation?.reserva_temporal_activa ? `#${conversation.reserva_temporal_activa.id}` : 'Ninguna'}</TechnicalItem>
              <TechnicalItem icon={Database} label="Cita creada">{conversation?.cita_creada ? `#${conversation.cita_creada.id}` : 'Ninguna'}</TechnicalItem>
            </div>
            {Object.keys(safeData).length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-200">
                <span className="font-black uppercase tracking-wide text-teal-300">Datos temporales protegidos</span>
                <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5">{JSON.stringify(safeData, null, 2)}</pre>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-black text-ink"><ShieldCheck size={18} className="text-teal-700" />Auditoría reciente</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{audit.length}</span></div>
            <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto">
              {audit.slice(0, 12).map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2"><strong className="text-[11px] text-slate-800">{item.accion}</strong><span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${item.resultado === 'IGNORADO' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'}`}>{item.resultado}</span></div>
                  <p className="mt-1 text-[10px] text-slate-500">{item.estado_anterior || '—'} → {item.estado_nuevo || '—'}</p>
                </article>
              ))}
              {!audit.length && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">Sin eventos registrados.</p>}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default WhatsappSimulator;
