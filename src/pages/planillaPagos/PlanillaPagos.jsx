import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowLeftRight, Banknote, CalendarRange, CheckCircle2, Clock3, CreditCard, Download, Eye, FileSpreadsheet, History, Landmark, Pencil, Plus, QrCode, ReceiptText, RefreshCw, Search, ShieldCheck, Undo2, WalletCards, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { PatientIdentity } from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { getProfesionalesActivos } from '../../services/usuarioService';
import { annulMovimientoPago, annulOperacionPago, getArqueosPago, getMovimientoHistorial, getOperacionPago, getPlanillaPagos, payHistoriaDebt, previewPagoDeuda, registerMovimientoPago, reopenArqueoPago, saveArqueoPago, updateMovimientoPago } from '../../services/planillaPagosService';
import { boliviaDate, boliviaTime, formatBoliviaDateTime } from '../../utils/boliviaDateTime';
import { formatPatientDocument } from '../../utils/validators';
import { getDisplayPhoneText, getResponsibleSummary } from '../../utils/patientContact';
import ResumenFinancieroPacienteModal from './ResumenFinancieroPacienteModal';

const today = boliviaDate();
const firstDay = `${today.slice(0, 8)}01`;
const isoDate = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const monthOptions = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((label,index)=>({value:String(index+1).padStart(2,'0'),label}));
const yearOptions = Array.from({length:23},(_,index)=>{const value=String(new Date().getFullYear()+2-index);return {value,label:value};});
const rangeForPeriod = (period, anchor = today) => {
  const selected = new Date(`${anchor}T12:00:00`);
  if (period === 'dia') return { desde: anchor, hasta: anchor };
  if (period === 'semana') { const start=new Date(selected);start.setDate(selected.getDate()-((selected.getDay()+6)%7));const end=new Date(start);end.setDate(start.getDate()+6);return {desde:isoDate(start),hasta:isoDate(end)}; }
  return { desde: isoDate(new Date(selected.getFullYear(),selected.getMonth(),1)), hasta: isoDate(new Date(selected.getFullYear(),selected.getMonth()+1,0)) };
};
const money = (value) => `${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
const date = (value) => (value ? formatBoliviaDateTime(`${value}T12:00:00-04:00`, { dateStyle: 'short' }) : 'Sin fecha');
const historiaLabel = (historia) => (historia?.id ? `Historia del ${date(historia.fecha_evaluacion)} · ${historia.diagnostico_medico?.trim() || 'Sin diagnóstico registrado'}` : 'Sin historia clínica vinculada');
const conceptoClinicoActual = (concepto) => concepto.historia_clinica?.diagnostico_medico?.trim() || concepto.detalle?.trim() || 'Sin detalle registrado';
const tabs = ['Todos', 'Pagados', 'Parciales', 'Deudores', 'Anulados'];
const moduleTabs = [
  { key: 'planilla', label: 'Planilla de pagos', icon: WalletCards },
  { key: 'deudores', label: 'Deudores', icon: Banknote },
  { key: 'recibos', label: 'Recibos', icon: ReceiptText },
  { key: 'comprobantes', label: 'Comprobantes', icon: FileSpreadsheet },
];
const statusClass = {
  Pagado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Parcial: 'bg-amber-50 text-amber-700 border-amber-200',
  Pendiente: 'bg-red-50 text-red-700 border-red-200',
  Exonerado: 'bg-sky-50 text-sky-700 border-sky-200',
  Anulado: 'bg-slate-100 text-slate-600 border-slate-200',
  'Saldo a favor': 'bg-violet-50 text-violet-700 border-violet-200',
};
const operationType = (type) => type === 'DEUDA_HISTORIA' ? 'Pago de deuda' : type === 'ESPECIFICO' ? 'Pago específico' : 'Pago histórico';

const blankPayment = {
  fecha: today,
  hora: boliviaTime(),
  monto: '',
  metodo: 'Efectivo',
  numero_comprobante: '',
  usuario_receptor_id: '',
  observacion: '',
  archivo_comprobante: '',
};
const blankClose = {
  fecha_desde: firstDay,
  fecha_hasta: today,
  efectivo_contado: '',
  qr_confirmado: '',
  transferencia_confirmada: '',
  tarjeta_confirmada: '',
  observacion: '',
};

const downloadReceipt = async (concept, movement) => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const patient = `${concept.paciente?.nombres || ''} ${concept.paciente?.apellidos || ''}`.trim();
  pdf.setTextColor(15, 118, 110);
  pdf.setFontSize(17);
  pdf.text('PHYSIO ACTIVE', 18, 18);
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(13);
  pdf.text('RECIBO DE PAGO', 18, 29);
  pdf.setFontSize(9);
  const receiptNumber = movement.operacion_pago?.numero_recibo || movement.numero_recibo;
  pdf.text(`N.º ${receiptNumber || 'Sin numeración'}`, 18, 37);
  pdf.line(18, 41, 130, 41);
  const lines = [`Fecha y hora: ${date(movement.fecha)} ${String(movement.hora || '').slice(0, 5)}`, `Paciente: ${patient}`, `Documento: ${formatPatientDocument(concept.paciente)}`, `Concepto: ${concept.detalle}`, `Monto pagado: ${money(movement.monto)}`, `Método: ${movement.metodo}`, `Saldo restante: ${money(Math.max(Number(concept.saldo_pendiente || 0), 0))}`, `Recibido por: ${movement.recibido_por?.nombre || 'Sin registrar'}`];
  let y = 49;
  lines.forEach((line) => {
    const wrapped = pdf.splitTextToSize(line, 110);
    pdf.text(wrapped, 18, y);
    y += wrapped.length * 5 + 2;
  });
  pdf.line(118, 270, 192, 270);
  pdf.text('Firma responsable', 136, 276);
  pdf.save(`${receiptNumber || 'Recibo_Physio_Active'}.pdf`);
};

const downloadOperationReceipt = async (concept, operation, distribution) => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const patient = `${concept.paciente?.nombres || ''} ${concept.paciente?.apellidos || ''}`.trim();
  pdf.setTextColor(15, 118, 110); pdf.setFontSize(17); pdf.text('PHYSIO ACTIVE', 18, 18);
  pdf.setTextColor(30, 41, 59); pdf.setFontSize(13); pdf.text('RECIBO DE PAGO', 18, 29);
  pdf.setFontSize(9); pdf.text(`N.º ${operation.numero_recibo}`, 18, 37); pdf.line(18, 41, 192, 41);
  const lines = [`Fecha y hora: ${date(operation.fecha)} ${String(operation.hora || '').slice(0, 5)}`, `Paciente: ${patient}`, `Historia: ${operation.historia_clinica_id}`, `Método: ${operation.metodo}`, `Monto total: ${money(operation.monto_total)}`];
  let y = 49; lines.forEach((line) => { pdf.text(line, 18, y); y += 7; });
  pdf.setFont('helvetica', 'bold'); pdf.text('Aplicaciones', 18, y + 2); y += 10;
  distribution.filter((item) => Number(item.aplicado) > 0).forEach((item) => {
    const label = item.sesion ? `Sesión ${item.sesion}` : (item.detalle || `Concepto ${item.concepto_id}`);
    pdf.setFont('helvetica', 'normal'); pdf.text(pdf.splitTextToSize(label, 120), 18, y);
    pdf.setFont('helvetica', 'bold'); pdf.text(money(item.aplicado), 192, y, { align: 'right' }); y += 7;
  });
  pdf.line(18, y, 192, y); pdf.text('TOTAL', 18, y + 7); pdf.text(money(operation.monto_total), 192, y + 7, { align: 'right' });
  pdf.save(`${operation.numero_recibo}.pdf`);
};

const downloadArqueoPdf = async (arqueo) => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const responsible = arqueo.responsable?.nombre || 'Sin registrar';
  const rows = [
    ['Total esperado', arqueo.total_esperado],
    ['Total cobrado', arqueo.total_cobrado],
    ['Total pendiente', arqueo.total_pendiente],
    ['Efectivo (sistema)', arqueo.efectivo_sistema],
    ['Efectivo contado', arqueo.efectivo_contado],
    ['QR (sistema)', arqueo.qr_sistema],
    ['QR confirmado', arqueo.qr_confirmado],
    ['Transferencia (sistema)', arqueo.transferencia_sistema],
    ['Transferencia confirmada', arqueo.transferencia_confirmada],
    ['Tarjeta (sistema)', arqueo.tarjeta_sistema],
    ['Tarjeta confirmada', arqueo.tarjeta_confirmada],
    ['Diferencia de efectivo', arqueo.diferencia],
  ];

  pdf.setTextColor(15, 118, 110);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PHYSIO ACTIVE', 18, 18);
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(14);
  pdf.text('REPORTE DE ARQUEO FINANCIERO', 18, 29);
  pdf.setDrawColor(15, 118, 110);
  pdf.line(18, 34, 192, 34);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const header = [
    `Arqueo N.º: ${arqueo.id}`,
    `Período: ${date(arqueo.fecha_desde)} al ${date(arqueo.fecha_hasta)}`,
    `Responsable: ${responsible}`,
    `Estado: ${arqueo.estado || 'Sin estado'}`,
    `Movimientos incluidos: ${arqueo.cantidad_movimientos || 0}`,
    `Pacientes con deuda: ${arqueo.pacientes_deuda || 0}`,
  ];
  let y = 43;
  header.forEach((line) => {
    pdf.text(line, 18, y);
    y += 6;
  });

  y += 3;
  pdf.setFillColor(241, 245, 249);
  pdf.rect(18, y, 174, 9, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalle financiero', 22, y + 6);
  y += 15;
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(18, y - 4.5, 174, 7, 'F');
    }
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, 22, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(money(value), 188, y, { align: 'right' });
    y += 7;
  });

  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Observación', 18, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(pdf.splitTextToSize(arqueo.observacion?.trim() || 'Sin observaciones.', 174), 18, y + 6);
  pdf.setDrawColor(100, 116, 139);
  pdf.line(112, 265, 192, 265);
  pdf.setFontSize(9);
  pdf.text(responsible, 152, 271, { align: 'center' });
  pdf.text('Responsable del arqueo', 152, 276, { align: 'center' });
  pdf.save(`Arqueo_${arqueo.id}_${arqueo.fecha_desde}_al_${arqueo.fecha_hasta}.pdf`);
};

function Stat({ icon: Icon, label, value, tone = 'teal' }) {
  const colors = {
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-wide">{label}</span>
        <Icon size={17} />
      </div>
      <strong className="mt-2 block text-xl text-slate-900">{value}</strong>
    </div>
  );
}

function ModuleTabs({ value, onChange }) {
  return (
    <nav className="grid grid-cols-2 gap-2 rounded-xl border border-teal-100 bg-white p-2 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
      {moduleTabs.map(({ key, label, icon: Icon }) => (
        <button key={key} type="button" onClick={() => onChange(key)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition ${value === key ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-teal-50 hover:text-teal-800'}`}>
          <Icon size={17} />
          {label}
        </button>
      ))}
    </nav>
  );
}

function PaymentForm({ concept, movement, professionals, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    movement
      ? {
          ...blankPayment,
          ...movement,
          hora: String(movement.hora || '').slice(0, 5),
        }
      : {
          ...blankPayment,
          monto: concept?.saldo_pendiente || '',
          usuario_receptor_id: professionals[0]?.id || '',
        },
  );
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (Number(form.monto) <= 0)
      return Swal.fire({
        icon: 'warning',
        title: 'Monto inválido',
        text: 'Ingrese un monto mayor a cero.',
        confirmButtonColor: '#0F766E',
      });
    if (!movement && Number(form.monto) > Number(concept.saldo_pendiente)) return Swal.fire({ icon: 'warning', title: 'El monto supera el saldo pendiente de este concepto.', confirmButtonColor: '#0F766E' });
    if (!form.usuario_receptor_id)
      return Swal.fire({
        icon: 'warning',
        title: 'Personal receptor obligatorio',
        confirmButtonColor: '#0F766E',
      });
    if (movement) {
      const ok = await Swal.fire({
        title: '¿Actualizar este pago?',
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#0F766E',
      });
      if (!ok.isConfirmed) return;
    }
    setSaving(true);
    try {
      if (movement) await updateMovimientoPago(movement.id, form);
      else await registerMovimientoPago(concept.id, form);
      await onSaved();
      onClose();
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo guardar el pago',
        text: error.message,
        confirmButtonColor: '#0F766E',
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3 text-sm">
        <b>
          {concept?.paciente?.nombres} {concept?.paciente?.apellidos}
        </b>
        <span className="block text-slate-600">{concept?.detalle}</span>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <span>
            Total: <b>{money(concept?.monto_esperado)}</b>
          </span>
          <span>
            Pagado: <b>{money(concept?.total_pagado)}</b>
          </span>
          <span>
            Saldo: <b>{money(concept?.saldo_pendiente)}</b>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Fecha" type="date" required value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
        <Input label="Hora" type="time" required value={form.hora} onChange={(e) => set('hora', e.target.value)} />
        <Input label="Monto (Bs)" type="number" min="0.01" max={concept.saldo_pendiente} step="0.01" required value={form.monto} onChange={(e) => set('monto', e.target.value)} />
        <Input label="Método" options={['Efectivo', 'QR', 'Transferencia', 'Tarjeta', 'Otro'].map((v) => ({ value: v, label: v }))} value={form.metodo} onChange={(e) => set('metodo', e.target.value)} />
      </div>
      <Input label="Número de comprobante" placeholder="Opcional" value={form.numero_comprobante || ''} onChange={(e) => set('numero_comprobante', e.target.value)} />
      <Input
        label="Personal que recibe"
        options={[
          { value: '', label: 'Seleccionar personal' },
          ...professionals.map((p) => ({
            value: p.id,
            label: p.nombre || p.usuario,
          })),
        ]}
        required
        value={form.usuario_receptor_id}
        onChange={(e) => set('usuario_receptor_id', e.target.value)}
      />
      <Input label="Observación" multiline value={form.observacion || ''} onChange={(e) => set('observacion', e.target.value)} />
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {movement ? 'Actualizar pago' : 'Registrar pago'}
        </Button>
      </div>
    </form>
  );
}

function DebtPaymentForm({ concept, onClose, onSaved }) {
  const [form,setForm]=useState({ fecha:today,hora:boliviaTime(),monto:'',metodo:'Efectivo',numero_comprobante:'',observacion:'' });
  const [preview,setPreview]=useState(null); const [saving,setSaving]=useState(false);
  useEffect(()=>{if(!(Number(form.monto)>0)){setPreview(null);return undefined}const timer=setTimeout(async()=>{try{setPreview(await previewPagoDeuda(concept.historia_clinica_id,form))}catch{setPreview(null)}},250);return()=>clearTimeout(timer)},[concept.historia_clinica_id,form]);
  const submit=async(e)=>{e.preventDefault();if(!preview)return Swal.fire({icon:'warning',title:'El monto supera la deuda total o no es válido.'});setSaving(true);try{const result=await payHistoriaDebt(concept.historia_clinica_id,form);const notice=await Swal.fire({icon:'success',title:'El pago fue aplicado correctamente.',text:`Recibo ${result.operacion.numero_recibo}`,showCancelButton:true,confirmButtonText:'Descargar recibo',cancelButtonText:'Cerrar'});if(notice.isConfirmed)await downloadOperationReceipt(concept,result.operacion,preview.distribucion);await onSaved();onClose()}catch(error){Swal.fire({icon:'error',title:'No se pudo aplicar el pago',text:error.message})}finally{setSaving(false)}};
  return <form onSubmit={submit} className="grid gap-4"><div className="rounded-xl bg-teal-50 p-3 text-sm"><b>{concept.paciente?.nombres} {concept.paciente?.apellidos}</b><span className="block">Historia {concept.historia_clinica_id}</span>{preview&&<b className="mt-2 block">Deuda total: {money(preview.deuda_total)}</b>}</div>
    <div className="grid grid-cols-2 gap-3"><Input label="Monto recibido *" type="number" min="0.01" step="0.01" required value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})}/><Input label="Método *" options={['Efectivo','QR','Transferencia','Tarjeta','Otro'].map(value=>({value,label:value}))} value={form.metodo} onChange={e=>setForm({...form,metodo:e.target.value})}/><Input label="Fecha *" type="date" required value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/><Input label="Hora" type="time" value={form.hora} onChange={e=>setForm({...form,hora:e.target.value})}/></div>
    <Input label="Número de comprobante" value={form.numero_comprobante} onChange={e=>setForm({...form,numero_comprobante:e.target.value})}/><Input label="Observación" multiline value={form.observacion} onChange={e=>setForm({...form,observacion:e.target.value})}/>
    {preview&&<div className="rounded-xl border p-3"><b>Distribución automática FIFO</b>{preview.distribucion.map(item=><div key={item.concepto_id} className="mt-2 flex justify-between text-sm"><span>{item.sesion?`Sesión ${item.sesion}`:item.detalle}</span><b>{money(item.aplicado)}</b></div>)}<div className="mt-3 border-t pt-2 font-bold">{preview.saldo_restante===0?'Con este pago la deuda quedará cancelada.':`Después del pago quedará una deuda de ${money(preview.saldo_restante)}.`}</div></div>}
    <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving||!preview}>{saving?'Procesando…':'Registrar pago de deuda'}</Button></div></form>;
}

function OperationDetail({ operation, onClose, onAnnul }) {
  const applications = operation.aplicaciones || [];
  const applied = applications.reduce((sum, item) => sum + Number(item.monto || 0), 0);
  const mismatch = Math.abs(applied - Number(operation.monto_total || 0)) > 0.009;
  return <div className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 overflow-y-auto p-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
      ['Número de recibo',operation.numero_recibo],['Paciente',`${operation.paciente?.nombres||''} ${operation.paciente?.apellidos||''}`.trim()],['Historia',operation.historia_clinica?.id||operation.historia_clinica_id],
      ['Fecha',`${date(operation.fecha)} ${String(operation.hora||'').slice(0,5)}`],['Monto total',money(operation.monto_total)],['Método',operation.metodo],['Tipo',operationType(operation.tipo)],
      ['Recibido por',operation.recibido_por?.nombre],['Número de comprobante',operation.numero_comprobante],['Observación',operation.observacion],['Estado',operation.estado],
      ['Anulado',operation.anulado_en&&formatBoliviaDateTime(operation.anulado_en,{dateStyle:'short',timeStyle:'short'})],['Motivo de anulación',operation.motivo_anulacion],['Anulado por',operation.anulado_por?.nombre]
    ].filter(([,value])=>value).map(([label,value])=><div key={label} className="rounded-xl border bg-slate-50 p-3"><span className="text-[10px] font-black uppercase text-slate-500">{label}</span><b className="block break-words text-sm">{value}</b></div>)}</div>
    {operation.archivo_comprobante&&<a className="mt-3 inline-flex text-sm font-bold text-teal-700 underline" href={operation.archivo_comprobante} target="_blank" rel="noreferrer">Ver comprobante</a>}
    <h3 className="mt-5 font-black">Aplicaciones de la operación</h3><div className="mt-2 grid gap-2">{applications.map(item=><div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-xl border p-3"><span><b>{item.concepto?.sesion?.numero_sesion?`Sesión ${item.concepto.sesion.numero_sesion}`:item.concepto?.detalle||`Concepto ${item.concepto_cobro_id}`}</b><small className="block text-slate-500">{item.concepto?.detalle} · {item.estado}{item.arqueo?` · Arqueo ${item.arqueo.numero_arqueo||item.arqueo.id} (${item.arqueo.estado})`:''}</small></span><b>{money(item.monto)}</b></div>)}</div>
    <div className={`mt-3 rounded-xl border p-3 text-sm ${mismatch?'border-amber-300 bg-amber-50 text-amber-800':'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><b>Suma de aplicaciones: {money(applied)}</b>{mismatch&&<span className="block">Advertencia: no coincide con el monto de la operación.</span>}</div>
  </div><div className="flex shrink-0 justify-end gap-2 border-t p-3">{!operation.legacy&&operation.estado==='ACTIVA'&&<Button variant="danger" onClick={()=>onAnnul(operation)}>Anular operación</Button>}<Button variant="secondary" onClick={onClose}>Cerrar</Button></div></div>;
}

function Detail({ concept, onClose, onEdit, onAnnul, onHistory, onOperation }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-teal-50 p-4 md:col-span-2">
            <span className="text-xs font-bold uppercase text-teal-700">Paciente</span>
            <PatientIdentity className="mt-2" paciente={concept.paciente} secondary={`Documento: ${formatPatientDocument(concept.paciente)} · Tel: ${getDisplayPhoneText(concept.paciente)}${getResponsibleSummary(concept.paciente) ? ` · ${getResponsibleSummary(concept.paciente)}` : ''}`} />
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <span className="text-xs font-bold uppercase text-slate-500">Estado</span>
            <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass[concept.estado]}`}>{concept.estado}</span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-4">
            <b>Origen de la deuda</b>
            <p className="mt-2 text-sm text-slate-600">{concept.detalle}</p>
            <p className="mt-1 text-xs text-slate-500">
              {historiaLabel(concept.historia_clinica)} · {date(concept.fecha_origen)}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <b>Resumen</b>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <span>
                Esperado
                <br />
                <b>{money(concept.monto_esperado)}</b>
              </span>
              <span>
                Pagado
                <br />
                <b className="text-emerald-700">{money(concept.total_pagado)}</b>
              </span>
              <span>
                Saldo
                <br />
                <b className="text-red-700">{money(concept.saldo_pendiente)}</b>
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <h3 className="font-bold text-slate-900">Movimientos de pago</h3>
          <p className="mt-1 text-xs text-slate-500">Solo los movimientos activos se consideran en el total pagado.</p>
        </div>
        <div className="mt-2 grid gap-2">
          {concept.movimientos.length ? (
            concept.movimientos.map((m) => (
              <div key={m.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${m.estado === 'Anulado' ? 'border-slate-200 bg-slate-50 text-slate-500' : 'bg-white'}`}>
                <div>
                  <b className={m.estado === 'Anulado' ? 'line-through decoration-slate-400' : ''}>
                    {money(m.monto)} · {m.metodo}
                  </b>
                  <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${m.estado === 'Anulado' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>{m.estado === 'Anulado' ? 'Anulado' : 'Activo'}</span>
                    {m.estado === 'Activo' && !m.operacion_pago_id && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-700">Pago histórico</span>}
                    {m.operacion_pago_id && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-700">{m.operacion_pago?.tipo === 'DEUDA_HISTORIA' ? 'Pago de deuda' : 'Pago específico'}</span>}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {date(m.fecha)} {String(m.hora).slice(0, 5)} · {m.operacion_pago?.numero_recibo || m.numero_recibo}
                  </span>
                  <span className="block text-xs text-slate-600">
                    {m.recibido_por?.nombre || 'Sin registrar'}
                    {m.observacion ? ` · ${m.observacion}` : ''}
                  </span>
                  {m.estado === 'Anulado' && m.anulado_en && <span className="block text-xs text-slate-500">Anulado: {formatBoliviaDateTime(m.anulado_en, { dateStyle: 'short', timeStyle: 'short' })}</span>}
                  {m.estado === 'Anulado' && m.motivo_anulacion && <span className="block text-xs font-medium text-slate-600">Motivo: {m.motivo_anulacion}</span>}
                  {(m.operacion_pago?.numero_comprobante || m.numero_comprobante) && <span className="block text-xs text-slate-600">Comprobante: {m.operacion_pago?.numero_comprobante || m.numero_comprobante}</span>}
                  {m.arqueo && <span className="block text-xs text-slate-600">Arqueo: {m.arqueo.numero_arqueo || m.arqueo.id} · {m.arqueo.estado}</span>}
                </div>
                <div className="flex gap-1">
                  {m.operacion_pago_id && <button title="Ver operación" className="rounded-lg border p-2 text-violet-700" onClick={()=>onOperation(m.operacion_pago_id)}><Eye size={16}/></button>}
                  {m.estado !== 'Anulado' && (
                    <button title="Descargar recibo PDF" className="rounded-lg border p-2 text-cyan-700" onClick={() => downloadReceipt(concept, m)}>
                      <ReceiptText size={16} />
                    </button>
                  )}
                  {m.estado !== 'Anulado' && !m.operacion_pago_id && <button title="Editar pago" className="rounded-lg border p-2 text-teal-700" onClick={() => onEdit(m)}><Pencil size={16} /></button>}
                  <button title="Ver historial" className="rounded-lg border p-2 text-slate-600" onClick={() => onHistory(m)}>
                    <History size={16} />
                  </button>
                  {m.estado !== 'Anulado' && !m.operacion_pago_id && (
                    <button title="Anular" className="rounded-lg border border-red-100 p-2 text-red-600" onClick={() => onAnnul(m)}>
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No se registraron movimientos. Debe {money(concept.saldo_pendiente)}.</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 justify-end border-t p-3">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}

function CloseArqueo({ form, setForm, indicators, onClose, onSaved }) {
  const set = (k, v) => setForm((o) => ({ ...o, [k]: v }));
  const confirmed = Number(form.efectivo_contado || 0) + Number(form.qr_confirmado || 0) + Number(form.transferencia_confirmada || 0) + Number(form.tarjeta_confirmada || 0);
  const difference = confirmed - Number(indicators.total_cobrado || 0);
  const save = async (cerrar) => {
    try {
      await saveArqueoPago({ ...form, cerrar });
      await onSaved();
      onClose();
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo guardar el arqueo',
        text: e.message,
        confirmButtonColor: '#0F766E',
      });
    }
  };
  const methodFields = [
    { key: 'efectivo_contado', label: 'Efectivo contado', system: indicators.efectivo, icon: WalletCards },
    { key: 'qr_confirmado', label: 'QR confirmado', system: indicators.qr, icon: QrCode },
    { key: 'transferencia_confirmada', label: 'Transferencias confirmadas', system: indicators.transferencia, icon: ArrowLeftRight },
    { key: 'tarjeta_confirmada', label: 'Tarjeta confirmada', system: indicators.tarjeta, icon: CreditCard },
  ];
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Esperado', value: indicators.total_esperado, icon: Banknote, tone: 'border-cyan-100 bg-cyan-50 text-cyan-800' },
          { label: 'Cobrado', value: indicators.total_cobrado, icon: WalletCards, tone: 'border-emerald-100 bg-emerald-50 text-emerald-800' },
          { label: 'Pendiente', value: indicators.total_pendiente, icon: Clock3, tone: 'border-amber-100 bg-amber-50 text-amber-800' },
        ].map(({ label, value, icon: Icon, tone }) => <div key={label} className={`flex items-center gap-2 rounded-xl border p-3 ${tone}`}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/70"><Icon size={17}/></span><span className="min-w-0 text-xs text-slate-600">{label}<b className="mt-0.5 block truncate text-sm text-current">{money(value)}</b></span></div>)}
      </div>
      <div className="flex items-center gap-2 border-b pb-2 text-sm font-black text-slate-800"><CreditCard size={16} className="text-teal-700"/>Confirmación por método de pago</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {methodFields.map(({ key, label, system, icon: Icon }) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-3"><div className="mb-2 flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-teal-50 text-teal-700"><Icon size={15}/></span><span className="text-xs font-black text-slate-700">{label}<small className="block font-medium text-slate-500">Sistema: {money(system)}</small></span></div><div className="relative"><input aria-label={label} className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-bold text-slate-700 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10" type="number" min="0" step="0.01" placeholder="Ingresa el monto" value={form[key]} onChange={(e)=>set(key,e.target.value)}/><span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">Bs</span></div></div>)}
      </div>
      <Input compact label="Observación" multiline placeholder="Agrega una observación (opcional)" value={form.observacion} onChange={(e) => set('observacion', e.target.value)} />
      <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm font-bold ${difference ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><span className="flex items-center gap-2"><AlertTriangle size={20}/>Diferencia final</span><b className="text-base">{money(difference)}</b><span className={`rounded-full px-2 py-1 text-[10px] font-black ${difference ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{difference ? (difference < 0 ? 'Faltante' : 'Sobrante') : 'Cuadrado'}</span></div>
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="secondary" onClick={() => save(false)}>
          Guardar borrador
        </Button>
        <Button onClick={() => save(true)}>Cerrar arqueo</Button>
      </div>
    </div>
  );
}

function PlanillaPagos({ section = 'planilla' }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [data, setData] = useState({ items: [], operaciones: [], indicadores: {} });
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState([]);
  const [arqueos, setArqueos] = useState([]);
  const [mainView, setMainView] = useState(section);
  const [filterPeriod, setFilterPeriod] = useState('mes');
  const [filterAnchor, setFilterAnchor] = useState(today);
  const [tab, setTab] = useState('Todos');
  const [filters, setFilters] = useState({
    desde: firstDay,
    hasta: today,
    buscar: '',
    estado: 'Todos',
    metodo: 'Todos',
    receptor: '',
    deuda: '',
  });
  const [payment, setPayment] = useState(null); const [debtPayment,setDebtPayment]=useState(null);
  const [detail, setDetail] = useState(null);
  const [operationDetail, setOperationDetail] = useState(null);
  const [history, setHistory] = useState(null);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeForm, setCloseForm] = useState(blankClose);
  useEffect(() => { setMainView(section); }, [section]);
  const load = useCallback(
    async (override) => {
      const activeFilters = override?.desde ? override : filters;
      setLoading(true);
      try {
        const result = await getPlanillaPagos(activeFilters);
        setData(result);
        const [people] = await Promise.allSettled([getProfesionalesActivos()]);
        if (people.status === 'fulfilled') setProfessionals(people.value);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );
  useEffect(() => {
    const timeoutId = window.setTimeout(() => load(), 350);
    return () => window.clearTimeout(timeoutId);
  }, [filters.buscar]); // el buscador responde al escribir; los demás filtros se aplican con el botón
  useEffect(() => {
    const linkedId = location.state?.conceptoCobroId;
    if (!linkedId || !data.items.length) return;
    const linked = data.items.find((item) => String(item.id) === String(linkedId));
    if (linked) setDetail(linked);
  }, [data.items, location.state?.conceptoCobroId]);
  useEffect(() => {
    if (location.state?.tab) setTab(location.state.tab);
  }, [location.state?.tab]);
  const applyPeriod = (period, anchor = filterAnchor) => {
    setFilterPeriod(period);
    if (period === 'personalizado') return;
    setFilterAnchor(anchor);
    const range = rangeForPeriod(period, anchor);
    const next = { ...filters, ...range };
    setFilters(next);
    load(next);
  };
  const items = useMemo(
    () =>
      data.items.filter((i) => {
        const anulado = i.estado === 'Anulado' || i.activo === false || i.sesion?.anulada === true;
        const sinActividadFinanciera = Number(i.monto_esperado || 0) <= 0 && !i.movimientos.some((m) => m.estado === 'Activo');
        if (mainView === 'deudores') return !anulado && i.saldo_pendiente > 0;
        if (mainView === 'recibos') return !anulado && i.movimientos.some((m) => m.estado === 'Activo' && m.numero_recibo);
        if (mainView === 'comprobantes') return !anulado && i.movimientos.some((m) => m.estado === 'Activo' && m.numero_comprobante);
        if (tab === 'Anulados') return false;
        if (anulado) return false;
        if (sinActividadFinanciera) return false;
        return tab === 'Todos' || (tab === 'Pagados' && i.estado === 'Pagado') || (tab === 'Parciales' && i.estado === 'Parcial') || (tab === 'Deudores' && i.saldo_pendiente > 0);
      }),
    [data.items, tab, mainView],
  );
  const operationItems = useMemo(() => (data.operaciones || []).filter((operation) => {
    if (mainView === 'recibos') return Boolean(operation.numero_recibo);
    if (mainView === 'comprobantes') return Boolean(operation.numero_comprobante || operation.archivo_comprobante);
    return mainView === 'planilla' && tab === 'Anulados' && operation.estado === 'ANULADA';
  }), [data.operaciones, mainView, tab]);
  const operationMode = mainView === 'recibos' || mainView === 'comprobantes' || (mainView === 'planilla' && tab === 'Anulados');
  const debtGroups = useMemo(() => {
    const groups=new Map();
    for(const concept of data.items||[]){if(Number(concept.saldo_pendiente)<=0||!concept.historia_clinica_id)continue;const key=`${concept.paciente_id}:${concept.historia_clinica_id}`;const current=groups.get(key)||{concept,deuda:0};current.deuda+=Number(concept.saldo_pendiente);groups.set(key,current)}
    return [...groups.values()];
  },[data.items]);
  const openOperation = async (operationOrId) => {
    const listed = typeof operationOrId === 'object' ? operationOrId : (data.operaciones || []).find((item) => String(item.id) === String(operationOrId));
    if (listed?.legacy) return setOperationDetail(listed);
    setOperationDetail(await getOperacionPago(listed?.id || operationOrId));
  };
  const openSummaryReceipt = async (payment) => {
    setFinancialSummary(null);
    if (!payment.legacy) return openOperation(payment.id);
    const linked = (data.items || []).find((concept) => concept.movimientos?.some((movement) => String(movement.id) === String(payment.movimiento_id)));
    if (linked) setDetail(linked);
  };
  const annulOperation = async (operation) => {
    const result = await Swal.fire({ icon:'warning', title:'Anular operación de pago', html:`<b>${operation.numero_recibo}</b><br>${money(operation.monto_total)} · ${operation.metodo}<br>${operation.aplicaciones?.length||0} aplicación(es)`, input:'textarea', inputLabel:'Motivo de anulación *', showCancelButton:true, confirmButtonText:'Anular operación', cancelButtonText:'Cancelar', confirmButtonColor:'#DC2626', inputValidator:(value)=>!value?.trim()?'Ingrese el motivo.':undefined });
    if (!result.isConfirmed) return;
    try { await annulOperacionPago(operation.id,result.value); setOperationDetail(null); setDetail(null); await load(); Swal.fire({icon:'success',title:'Operación anulada correctamente.'}); }
    catch(error){ Swal.fire({icon:'error',title:'No se pudo anular',text:error.message}); }
  };
  const annul = async (m) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Anular movimiento de pago?',
      text: 'El monto dejará de considerarse en el total cobrado y se recalculará la deuda del paciente.',
      input: 'textarea',
      inputLabel: 'Motivo obligatorio',
      showCancelButton: true,
      confirmButtonText: 'Anular movimiento',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DC2626',
      inputValidator: (v) => (!v?.trim() ? 'Ingrese el motivo.' : undefined),
    });
    if (result.isConfirmed) {
      await annulMovimientoPago(m.id, result.value);
      setDetail(null);
      await load();
    }
  };
  const showHistory = async (m) => {
    setHistory({ movement: m, items: await getMovimientoHistorial(m.id) });
  };
  const exportExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Planilla de pagos');
    sheet.addRow(['PLANILLA DE PAGOS - PHYSIO ACTIVE']);
    sheet.mergeCells('A1:S1');
    sheet.getCell('A1').font = {
      bold: true,
      size: 16,
      color: { argb: 'FFFFFFFF' },
    };
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    sheet.addRow(['Fecha concepto', 'Paciente', 'Documento', 'Historia clínica', 'Concepto', 'Sesión', 'Monto esperado', 'Pagado período', 'Pagado acumulado', 'Saldo', 'Estado concepto', 'Fecha último pago', 'Método', 'Tipo operación', 'Recibo', 'Comprobante', 'Recibido por', 'Estado operación', 'Observación']);
    items.forEach((i) => { const last=i.ultimo_pago_periodo;const operation=last?.operacion_pago;sheet.addRow([date(i.fecha_origen), `${i.paciente?.nombres || ''} ${i.paciente?.apellidos || ''}`, formatPatientDocument(i.paciente), historiaLabel(i.historia_clinica), i.detalle, i.sesion?.numero_sesion || '', Number(i.monto_esperado), i.pagado_periodo, i.total_pagado, i.saldo_pendiente, i.estado, last?`${date(last.fecha)} ${String(last.hora||'').slice(0,5)}`:'', last?.metodo||'', operationType(operation?.tipo||(last?'LEGACY':'')), operation?.numero_recibo||last?.numero_recibo||'', operation?.numero_comprobante||last?.numero_comprobante||'', last?.recibido_por?.nombre||'', operation?.estado||(last?.estado||''), operation?.observacion||last?.observacion||'']); });
    sheet.columns.forEach((c) => (c.width = 18));
    sheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF134E4A' },
    };
    sheet.autoFilter = 'A2:S2';
    sheet.views = [{ state: 'frozen', ySplit: 2 }];
    const summary = wb.addWorksheet('Resumen financiero');
    Object.entries(data.indicadores).forEach(([k, v]) => summary.addRow([k.replaceAll('_', ' '), v]));
    const operationsSheet=wb.addWorksheet('Operaciones de pago');
    operationsSheet.addRow(['Fecha','Recibo','Paciente','Historia','Tipo','Monto','Método','Receptor','Estado','Comprobante']);
    (data.operaciones||[]).forEach(operation=>operationsSheet.addRow([date(operation.fecha),operation.numero_recibo,`${operation.paciente?.nombres||''} ${operation.paciente?.apellidos||''}`.trim(),operation.historia_clinica?.id||'',operationType(operation.tipo),Number(operation.monto_total),operation.metodo,operation.recibido_por?.nombre||'',operation.estado,operation.numero_comprobante||'']));
    operationsSheet.columns.forEach(column=>{column.width=20});operationsSheet.views=[{state:'frozen',ySplit:1}];operationsSheet.autoFilter='A1:J1';
    const blob = new Blob([await wb.xlsx.writeBuffer()], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Planilla_Pagos_${filters.desde}_al_${filters.hasta}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  if (mainView === 'arqueos')
    return (
      <section className="grid gap-5">
        <Header actions={null} />
        <ModuleTabs value={mainView} onChange={setMainView} />
        <div className="panel">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Arqueos financieros</h3>
              <p className="text-sm text-slate-500">Cierres de caja del mismo registro unificado de pagos.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {arqueos.length ? (
              arqueos.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <b>
                      {date(a.fecha_desde)} al {date(a.fecha_hasta)}
                    </b>
                    <span className="block text-sm text-slate-500">
                      {a.responsable?.nombre} · {a.cantidad_movimientos} movimientos
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 text-right">
                    <b className="mr-1">{money(a.total_cobrado)}</b>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${a.estado === 'Cerrado' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>{a.estado}</span>
                    <Button className="min-h-9 px-3" variant="secondary" onClick={() => downloadArqueoPdf(a)}>
                      <Download size={15} /> Descargar PDF
                    </Button>
                    {a.estado === 'Cerrado' && isAdmin && (
                      <button
                        className="text-xs font-bold text-teal-700"
                        onClick={async () => {
                          const r = await Swal.fire({
                            title: 'Reabrir arqueo',
                            input: 'textarea',
                            inputLabel: 'Motivo obligatorio',
                            showCancelButton: true,
                            confirmButtonText: 'Reabrir',
                            confirmButtonColor: '#0F766E',
                          });
                          if (r.isConfirmed && r.value) {
                            await reopenArqueoPago(a.id, r.value);
                            load();
                          }
                        }}
                      >
                        <Undo2 className="inline" size={14} /> Reabrir
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-slate-50 py-12 text-center text-slate-500">Todavía no existen arqueos registrados.</div>
            )}
          </div>
        </div>
        <Modal open={closeOpen} title="Cerrar arqueo" subtitle="Confirma la recaudación registrada en el periodo." onClose={() => setCloseOpen(false)} size="compact">
          <CloseArqueo form={closeForm} setForm={setCloseForm} indicators={data.indicadores} onClose={() => setCloseOpen(false)} onSaved={load} />
        </Modal>
      </section>
    );
  return (
    <section className="grid gap-5">
      <Header
        actions={
          <>
            <Button variant="secondary" onClick={load}>
              <RefreshCw size={17} />
              Actualizar
            </Button>
            <Button variant="secondary" onClick={exportExcel} disabled={!items.length}>
              <FileSpreadsheet size={17} />
              Exportar Excel
            </Button>
          </>
        }
      />
      <ModuleTabs value={mainView} onChange={setMainView} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat icon={Landmark} label="Total esperado por servicios" value={money(data.indicadores.total_esperado)} />
        <Stat icon={CalendarRange} label="Cobrado en período" value={money(data.indicadores.cobrado_periodo)} tone="cyan" />
        <Stat icon={CheckCircle2} label="Pagado acumulado de conceptos" value={money(data.indicadores.total_cobrado)} tone="green" />
        <Stat icon={Clock3} label="Deuda vigente por servicios" value={money(data.indicadores.total_pendiente)} tone="red" />
        <Stat icon={Banknote} label="Efectivo acumulado" value={money(data.indicadores.efectivo)} tone="cyan" />
        <Stat icon={WalletCards} label="Pacientes con deuda" value={data.indicadores.pacientes_deuda || 0} tone="violet" />
      </div>
      <p title="Este valor corresponde al acumulado histórico de los conceptos actualmente visibles, no únicamente al período seleccionado." className="-mt-1 text-xs text-slate-500">Métodos acumulados: corresponden al historial de pagos de los conceptos visibles, no únicamente al período seleccionado.</p>
      <div className="panel grid gap-4">
        {mainView === 'planilla' ? (
          <div className="flex flex-wrap gap-1 border-b">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'}`}>
                {t}
              </button>
            ))}
          </div>
        ) : (
          <div className="border-b pb-3">
            <h2 className="text-lg font-black text-slate-900">{moduleTabs.find((item) => item.key === mainView)?.label}</h2>
            <p className="text-sm text-slate-500">{mainView === 'deudores' ? 'Pacientes con saldo pendiente, ordenados dentro de la misma planilla.' : mainView === 'recibos' ? 'Recibos generados por cada movimiento de pago registrado.' : 'Comprobantes asociados a movimientos QR, transferencias y otros métodos.'}</p>
          </div>
        )}
        <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3">
          <div className="flex flex-wrap gap-2">
            {[['dia','Día'],['semana','Semana'],['mes','Mes']].map(([key,label])=><button type="button" key={key} aria-pressed={filterPeriod===key} onClick={()=>applyPeriod(key)} className={`min-h-9 rounded-lg px-5 py-2 text-sm font-black transition ${filterPeriod===key?'bg-teal-600 text-white shadow-sm':'bg-white text-slate-600 hover:bg-teal-50'}`}>{label}</button>)}
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            {filterPeriod === 'mes' ? (
              <><Input compact className="max-w-[190px]" label="Mes" value={filterAnchor.slice(5,7)} options={monthOptions} onChange={(e)=>applyPeriod('mes',`${filterAnchor.slice(0,4)}-${e.target.value}-01`)}/><Input compact className="max-w-[110px]" label="Año" value={filterAnchor.slice(0,4)} options={yearOptions} onChange={(e)=>applyPeriod('mes',`${e.target.value}-${filterAnchor.slice(5,7)}-01`)}/></>
            ) : (
              <Input compact className="max-w-[230px]" label={filterPeriod==='semana'?'Fecha de referencia':'Fecha'} type="date" value={filterAnchor} onChange={(e)=>applyPeriod(filterPeriod,e.target.value)}/>
            )}
            <span className="mb-px rounded-lg bg-white px-3 py-2 text-xs font-black text-teal-700">{date(filters.desde)} — {date(filters.hasta)}</span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-8">
          <label className="grid self-start gap-0.5 text-xs font-bold text-slate-700 md:col-span-2">
            <span>Buscar</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input className="min-h-9 w-full rounded-lg border-slate-200 pl-10 text-sm" placeholder="Paciente, CI, diagnóstico, concepto o recibo" value={filters.buscar} onChange={(e) => setFilters((f) => ({ ...f, buscar: e.target.value }))} />
            </span>
          </label>
          <Input compact label="Método" options={['Todos', 'Efectivo', 'QR', 'Transferencia', 'Tarjeta', 'Otro'].map((v) => ({ value: v, label: v }))} value={filters.metodo} onChange={(e) => setFilters((f) => ({ ...f, metodo: e.target.value }))} />
          <Input
            compact
            label="Recibido por"
            options={[
              { value: '', label: 'Todo el personal' },
              ...professionals.map((p) => ({
                value: p.id,
                label: p.nombre || p.usuario,
              })),
            ]}
            value={filters.receptor}
            onChange={(e) => setFilters((f) => ({ ...f, receptor: e.target.value }))}
          />
          <div className="flex items-end gap-2">
            <Button className="flex-1" onClick={() => load()}>
              Aplicar
            </Button>
            <Button
              variant="secondary"
              title="Limpiar filtros"
              onClick={() => {
                const clean = {
                  desde: firstDay,
                  hasta: today,
                  buscar: '',
                  estado: 'Todos',
                  metodo: 'Todos',
                  receptor: '',
                  deuda: '',
                };
                setFilterPeriod('mes');
                setFilterAnchor(today);
                setFilters(clean);
                load(clean);
              }}
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
        {!operationMode&&debtGroups.length>0&&<div className="grid gap-2 md:grid-cols-2">{debtGroups.map(({concept,deuda})=><div key={`${concept.paciente_id}:${concept.historia_clinica_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3"><span><b>{concept.paciente?.nombres} {concept.paciente?.apellidos}</b><small className="block text-slate-600">Historia {concept.historia_clinica_id} · Deuda total: {money(deuda)}</small></span><Button variant="secondary" onClick={()=>setDebtPayment(concept)}>Pagar deuda</Button></div>)}</div>}
        {loading ? (
          <div className="py-12 text-center text-slate-500">Cargando datos financieros reales...</div>
        ) : operationMode ? (
          !operationItems.length ? <div className="rounded-xl bg-slate-50 py-12 text-center text-slate-500">{mainView==='recibos'?'No existen recibos para los filtros seleccionados.':mainView==='comprobantes'?'No existen comprobantes para los filtros seleccionados.':'No existen pagos anulados para los filtros seleccionados.'}</div> :
          <div className="grid gap-3">{operationItems.map(operation=><article key={`${operation.legacy?'legacy':'operation'}-${operation.id}`} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center"><div><b>{operation.numero_recibo}</b><span className="block text-xs text-slate-500">{date(operation.fecha)} {String(operation.hora||'').slice(0,5)} · {operationType(operation.tipo)}</span></div><div><b>{operation.paciente?.nombres} {operation.paciente?.apellidos}</b><span className="block text-xs text-slate-500">Historia {operation.historia_clinica?.id||'—'} · {operation.recibido_por?.nombre||'Sin registrar'}</span></div><div><b>{money(operation.monto_total)} · {operation.metodo}</b><span className="block text-xs text-slate-500">{operation.numero_comprobante?`Comprobante ${operation.numero_comprobante}`:'Sin comprobante'} · {operation.estado}</span></div><div className="flex gap-2"><Button variant="secondary" onClick={()=>openOperation(operation)}><Eye size={15}/>Ver operación</Button></div></article>)}</div>
        ) : !items.length ? (
          <div className="rounded-xl bg-slate-50 py-12 text-center text-slate-500">{mainView==='deudores'||tab==='Deudores'?'No existen deudas vigentes para los filtros seleccionados.':'No existen conceptos ni cobros que coincidan con los filtros seleccionados.'}</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    {['Fecha concepto', 'Paciente', 'Historia / detalle', 'Esperado', 'Pagado en período', 'Pagado acumulado', 'Saldo', 'Estado', 'Último pago', 'Acciones'].map((h) => (
                      <th key={h} className="px-3 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-t hover:bg-teal-50/40">
                      <td className="px-3 py-3">{date(i.fecha_origen)}</td>
                      <td className="px-3 py-3">
                        <PatientIdentity paciente={i.paciente} />
                      </td>
                      <td className="w-48 max-w-48 px-3 py-3">
                        {i.sesion?.numero_sesion&&<span className="mb-1 inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-700">Sesión {i.sesion.numero_sesion}</span>}
                        <b className="block truncate text-xs" title={conceptoClinicoActual(i)}>{conceptoClinicoActual(i)}</b>
                        <span className="mt-1 block truncate text-[11px] text-slate-500">{i.historia_clinica?.id ? `Historia ${date(i.historia_clinica.fecha_evaluacion)}` : 'Sin historia clínica'}</span>
                      </td>
                      <td className="px-3 py-3">{money(i.monto_esperado)}</td>
                      <td className="px-3 py-3"><b className="text-cyan-700">{money(i.pagado_periodo)}</b><span className="block text-[11px] text-slate-500">{i.ultimo_pago_periodo?`${i.ultimo_pago_periodo.metodo} · ${date(i.ultimo_pago_periodo.fecha)}`:'Sin movimientos en el período'}</span></td>
                      <td className="px-3 py-3"><b className="text-emerald-700">{money(i.total_pagado)}</b><span className="block text-[11px] text-slate-500">{i.ultimo_metodo}</span></td>
                      <td className="px-3 py-3 font-bold text-red-700">{money(i.saldo_pendiente)}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass[i.estado]}`}>{i.estado}</span>
                      </td>
                      <td className="px-3 py-3 text-xs">{i.ultimo_pago_periodo?<><b>{date(i.ultimo_pago_periodo.fecha)} {String(i.ultimo_pago_periodo.hora||'').slice(0,5)}</b><span className="block text-slate-500">{i.ultimo_pago_periodo.recibido_por?.nombre||'Sin registrar'}</span></>:'—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button className="rounded-lg border p-2 text-teal-700" title="Ver detalle" onClick={() => setDetail(i)}>
                            <Eye size={16} />
                          </button>
                          <button type="button" className="rounded-lg border border-sky-200 p-2 text-sky-700 hover:bg-sky-50" title="Ver resumen financiero del paciente" aria-label="Ver resumen financiero del paciente" onClick={() => setFinancialSummary({ pacienteId: i.paciente_id, historiaId: i.historia_clinica_id })}>
                            <WalletCards size={16} />
                          </button>
                          {i.activo && i.saldo_pendiente > 0 && (
                            <button className="rounded-lg bg-teal-600 p-2 text-white" title="Registrar pago de este concepto" onClick={() => setPayment({ concept: i })}>
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 lg:hidden">
              {items.map((i) => (
                <article key={i.id} className="rounded-xl border p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <b>
                        {i.paciente?.nombres} {i.paciente?.apellidos}
                      </b>
                      {i.sesion?.numero_sesion&&<span className="mt-1 inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-700">Sesión {i.sesion.numero_sesion}</span>}
                      <span className="mt-1 block max-w-64 truncate text-xs font-semibold text-slate-700" title={conceptoClinicoActual(i)}>{conceptoClinicoActual(i)}</span>
                      <span className="block text-[11px] text-slate-500">{i.historia_clinica?.id ? `Historia ${date(i.historia_clinica.fecha_evaluacion)}` : 'Sin historia clínica'}</span>
                      <span className="mt-1 block text-xs font-bold text-teal-700">Fecha concepto: {date(i.fecha_origen)}</span>
                    </div>
                    <span className={`h-fit rounded-full border px-2 py-1 text-xs font-bold ${statusClass[i.estado]}`}>{i.estado}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <span>
                      Concepto
                      <br />
                      <b>{money(i.monto_esperado)}</b>
                    </span>
                    <span>
                      Período
                      <br />
                      <b className="text-cyan-700">{money(i.pagado_periodo)}</b>
                    </span>
                    <span>
                      Pagado
                      <br />
                      <b className="text-emerald-700">{money(i.total_pagado)}</b>
                    </span>
                    <span>
                      Saldo
                      <br />
                      <b className="text-red-700">{money(i.saldo_pendiente)}</b>
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" onClick={() => setDetail(i)}>
                      <Eye size={15} />
                      Ver
                    </Button>
                    <Button variant="secondary" aria-label="Ver resumen financiero del paciente" onClick={() => setFinancialSummary({ pacienteId: i.paciente_id, historiaId: i.historia_clinica_id })}>
                      <WalletCards size={15} />
                      Resumen financiero
                    </Button>
                    {i.saldo_pendiente > 0 && (
                      <Button onClick={() => setPayment({ concept: i })}>
                        <Plus size={15} />
                        Pagar concepto
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
      <Modal open={Boolean(payment)} title={payment?.movement ? 'Editar pago' : 'Registrar pago de este concepto'} subtitle="El movimiento actualizará automáticamente el saldo y el estado." onClose={() => setPayment(null)} size="compact">
        {payment && <PaymentForm concept={payment.concept} movement={payment.movement} professionals={professionals} onClose={() => setPayment(null)} onSaved={load} />}
      </Modal>
      <Modal open={Boolean(debtPayment)} title="Registrar pago de deuda" subtitle="El backend distribuirá el monto entre los conceptos más antiguos." onClose={()=>setDebtPayment(null)} size="compact">{debtPayment&&<DebtPaymentForm concept={debtPayment} onClose={()=>setDebtPayment(null)} onSaved={load}/>}</Modal>
      <Modal open={Boolean(detail)} title="Detalle del pago y deuda" subtitle="Origen, saldo e historial cronológico de movimientos." onClose={() => setDetail(null)} size="lg" patientStyle>
        {detail && (
          <Detail
            concept={detail}
            onClose={() => setDetail(null)}
            onEdit={(m) => {
              setPayment({ concept: detail, movement: m });
              setDetail(null);
            }}
            onAnnul={annul}
            onHistory={showHistory}
            onOperation={openOperation}
          />
        )}
      </Modal>
      <Modal open={Boolean(operationDetail)} title="Detalle de operación de pago" subtitle="Recibo único, comprobante y aplicaciones contables." onClose={()=>setOperationDetail(null)} size="lg">
        {operationDetail&&<OperationDetail operation={operationDetail} onClose={()=>setOperationDetail(null)} onAnnul={annulOperation}/>} 
      </Modal>
      <Modal open={Boolean(history)} title="Historial del pago" subtitle="Registro de auditoría inalterable." onClose={() => setHistory(null)} size="compact">
        <div className="grid gap-3">
          {history?.items.map((h) => (
            <div key={h.id} className="border-l-4 border-teal-500 bg-teal-50/50 p-3">
              <b>{h.accion}</b>
              <span className="block text-xs text-slate-500">
                {formatBoliviaDateTime(h.created_at, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}{' '}
                · {h.usuario?.nombre || h.usuario?.usuario}
              </span>
              {h.motivo && <p className="mt-1 text-sm">Motivo: {h.motivo}</p>}
            </div>
          ))}
        </div>
      </Modal>
      <ResumenFinancieroPacienteModal open={Boolean(financialSummary)} pacienteId={financialSummary?.pacienteId} historiaIdInicial={financialSummary?.historiaId} onClose={() => setFinancialSummary(null)} onOpenReceipt={openSummaryReceipt}/>
    </section>
  );
}

function Header({ actions }) {
  return (
    <header className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-cyan-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-teal-700">Control financiero</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Planilla de pagos</h1>
          <p className="mt-1 text-sm text-slate-600">Control de cobros, saldos, deudas y recaudación de pacientes.</p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </header>
  );
}

export default PlanillaPagos;
