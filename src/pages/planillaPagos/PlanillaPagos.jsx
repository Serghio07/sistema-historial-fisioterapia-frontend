import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Banknote, CalendarRange, CheckCircle2, Clock3, CreditCard, Download, Eye, FileSpreadsheet,
  History, Landmark, Pencil, Plus, ReceiptText, RefreshCw, Search, ShieldCheck, Undo2, WalletCards, XCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { PatientIdentity } from '../../components/common/ProfilePhoto';
import { useAuth } from '../../context/AuthContext';
import { getProfesionalesActivos } from '../../services/usuarioService';
import {
  annulMovimientoPago, getArqueosPago, getMovimientoHistorial, getPlanillaPagos,
  registerMovimientoPago, reopenArqueoPago, saveArqueoPago, updateMovimientoPago
} from '../../services/planillaPagosService';
import { boliviaDate, boliviaTime, formatBoliviaDateTime } from '../../utils/boliviaDateTime';

const today = boliviaDate();
const firstDay = `${today.slice(0, 8)}01`;
const money = (value) => `${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
const date = (value) => value ? formatBoliviaDateTime(`${value}T12:00:00-04:00`, { dateStyle: 'short' }) : 'Sin fecha';
const historiaLabel = (historia) => historia?.id
  ? `Historia del ${date(historia.fecha_evaluacion)} · ${historia.diagnostico_medico?.trim() || 'Sin diagnóstico registrado'}`
  : 'Sin historia clínica vinculada';
const tabs = ['Todos', 'Pagados', 'Parciales', 'Deudores', 'Anulados'];
const moduleTabs = [
  { key: 'planilla', label: 'Planilla de pagos', icon: WalletCards },
  { key: 'deudores', label: 'Deudores', icon: Banknote },
  { key: 'arqueos', label: 'Arqueos', icon: Landmark },
  { key: 'recibos', label: 'Recibos', icon: ReceiptText },
  { key: 'comprobantes', label: 'Comprobantes', icon: FileSpreadsheet }
];
const statusClass = {
  Pagado: 'bg-emerald-50 text-emerald-700 border-emerald-200', Parcial: 'bg-amber-50 text-amber-700 border-amber-200',
  Pendiente: 'bg-red-50 text-red-700 border-red-200', Exonerado: 'bg-sky-50 text-sky-700 border-sky-200',
  Anulado: 'bg-slate-100 text-slate-600 border-slate-200', 'Saldo a favor': 'bg-violet-50 text-violet-700 border-violet-200'
};

const blankPayment = { fecha: today, hora: boliviaTime(), monto: '', metodo: 'Efectivo', numero_comprobante: '', usuario_receptor_id: '', observacion: '', archivo_comprobante: '' };
const blankClose = { fecha_desde: firstDay, fecha_hasta: today, efectivo_contado: '', qr_confirmado: '', transferencia_confirmada: '', tarjeta_confirmada: '', observacion: '' };

const downloadReceipt = async (concept, movement) => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a5' });
  const patient = `${concept.paciente?.nombres || ''} ${concept.paciente?.apellidos || ''}`.trim();
  pdf.setTextColor(15, 118, 110); pdf.setFontSize(17); pdf.text('PHYSIO ACTIVE', 18, 18);
  pdf.setTextColor(30, 41, 59); pdf.setFontSize(13); pdf.text('RECIBO DE PAGO', 18, 29);
  pdf.setFontSize(9); pdf.text(`N.º ${movement.numero_recibo || 'Sin numeración'}`, 18, 37);
  pdf.line(18, 41, 130, 41);
  const lines = [
    `Fecha y hora: ${date(movement.fecha)} ${String(movement.hora || '').slice(0, 5)}`,
    `Paciente: ${patient}`, `CI: ${concept.paciente?.ci || 'Sin dato'}`,
    `Concepto: ${concept.detalle}`, `Monto pagado: ${money(movement.monto)}`,
    `Método: ${movement.metodo}`, `Saldo restante: ${money(Math.max(Number(concept.saldo_pendiente || 0), 0))}`,
    `Recibido por: ${movement.recibido_por?.nombre || 'Sin registrar'}`
  ];
  let y = 49; lines.forEach((line) => { const wrapped = pdf.splitTextToSize(line, 110); pdf.text(wrapped, 18, y); y += wrapped.length * 5 + 2; });
  pdf.line(72, 132, 126, 132); pdf.text('Firma responsable', 83, 138);
  pdf.save(`${movement.numero_recibo || 'Recibo_Physio_Active'}.pdf`);
};

function Stat({ icon: Icon, label, value, tone = 'teal' }) {
  const colors = { teal: 'bg-teal-50 text-teal-700 border-teal-100', green: 'bg-emerald-50 text-emerald-700 border-emerald-100', red: 'bg-red-50 text-red-700 border-red-100', cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100', violet: 'bg-violet-50 text-violet-700 border-violet-100' };
  return <div className={`rounded-xl border p-3 ${colors[tone]}`}><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-black uppercase tracking-wide">{label}</span><Icon size={17}/></div><strong className="mt-2 block text-xl text-slate-900">{value}</strong></div>;
}

function ModuleTabs({ value, onChange }) {
  return <nav className="grid grid-cols-2 gap-2 rounded-xl border border-teal-100 bg-white p-2 shadow-sm sm:grid-cols-3 lg:grid-cols-5">{moduleTabs.map(({ key, label, icon: Icon })=><button key={key} type="button" onClick={()=>onChange(key)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition ${value===key?'bg-teal-600 text-white shadow-sm':'text-slate-600 hover:bg-teal-50 hover:text-teal-800'}`}><Icon size={17}/>{label}</button>)}</nav>;
}

function PaymentForm({ concept, movement, professionals, onClose, onSaved }) {
  const [form, setForm] = useState(() => movement ? { ...blankPayment, ...movement, hora: String(movement.hora || '').slice(0, 5) } : { ...blankPayment, monto: concept?.saldo_pendiente || '', usuario_receptor_id: professionals[0]?.id || '' });
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (Number(form.monto) <= 0) return Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'Ingrese un monto mayor a cero.', confirmButtonColor: '#0F766E' });
    if (!form.usuario_receptor_id) return Swal.fire({ icon: 'warning', title: 'Personal receptor obligatorio', confirmButtonColor: '#0F766E' });
    if (movement) {
      const ok = await Swal.fire({ title: '¿Actualizar este pago?', showCancelButton: true, confirmButtonText: 'Actualizar', cancelButtonText: 'Cancelar', confirmButtonColor: '#0F766E' });
      if (!ok.isConfirmed) return;
    }
    setSaving(true);
    try {
      if (movement) await updateMovimientoPago(movement.id, form); else await registerMovimientoPago(concept.id, form);
      await onSaved(); onClose();
    } catch (error) { await Swal.fire({ icon: 'error', title: 'No se pudo guardar el pago', text: error.message, confirmButtonColor: '#0F766E' }); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="grid gap-4">
    <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3 text-sm"><b>{concept?.paciente?.nombres} {concept?.paciente?.apellidos}</b><span className="block text-slate-600">{concept?.detalle}</span><div className="mt-2 grid grid-cols-3 gap-2 text-xs"><span>Total: <b>{money(concept?.monto_esperado)}</b></span><span>Pagado: <b>{money(concept?.total_pagado)}</b></span><span>Saldo: <b>{money(concept?.saldo_pendiente)}</b></span></div></div>
    <div className="grid grid-cols-2 gap-3"><Input label="Fecha" type="date" required value={form.fecha} onChange={(e)=>set('fecha',e.target.value)}/><Input label="Hora" type="time" required value={form.hora} onChange={(e)=>set('hora',e.target.value)}/><Input label="Monto (Bs)" type="number" min="0.01" step="0.01" required value={form.monto} onChange={(e)=>set('monto',e.target.value)}/><Input label="Método" options={['Efectivo','QR','Transferencia','Tarjeta','Otro'].map(v=>({value:v,label:v}))} value={form.metodo} onChange={(e)=>set('metodo',e.target.value)}/></div>
    <Input label="Número de comprobante" placeholder="Opcional" value={form.numero_comprobante || ''} onChange={(e)=>set('numero_comprobante',e.target.value)}/>
    <Input label="Personal que recibe" options={[{value:'',label:'Seleccionar personal'},...professionals.map(p=>({value:p.id,label:p.nombre || p.usuario}))]} required value={form.usuario_receptor_id} onChange={(e)=>set('usuario_receptor_id',e.target.value)}/>
    <Input label="Observación" multiline value={form.observacion || ''} onChange={(e)=>set('observacion',e.target.value)}/>
    <div className="flex justify-end gap-2 border-t pt-3"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}>{movement ? 'Actualizar pago' : 'Registrar pago'}</Button></div>
  </form>;
}

function Detail({ concept, onClose, onEdit, onAnnul, onHistory }) {
  return <div className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 overflow-y-auto p-5">
    <div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-teal-50 p-4 md:col-span-2"><span className="text-xs font-bold uppercase text-teal-700">Paciente</span><PatientIdentity className="mt-2" paciente={concept.paciente} secondary={`CI: ${concept.paciente?.ci || '-'} · Tel: ${concept.paciente?.telefono || '-'}`} /></div><div className="rounded-xl bg-slate-50 p-4"><span className="text-xs font-bold uppercase text-slate-500">Estado</span><span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass[concept.estado]}`}>{concept.estado}</span></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-4"><b>Origen de la deuda</b><p className="mt-2 text-sm text-slate-600">{concept.detalle}</p><p className="mt-1 text-xs text-slate-500">{historiaLabel(concept.historia_clinica)} · {date(concept.fecha_origen)}</p></div><div className="rounded-xl border p-4"><b>Resumen</b><div className="mt-2 grid grid-cols-3 gap-2 text-sm"><span>Esperado<br/><b>{money(concept.monto_esperado)}</b></span><span>Pagado<br/><b className="text-emerald-700">{money(concept.total_pagado)}</b></span><span>Saldo<br/><b className="text-red-700">{money(concept.saldo_pendiente)}</b></span></div></div></div>
    <h3 className="mt-5 font-bold text-slate-900">Movimientos de pago</h3><div className="mt-2 grid gap-2">{concept.movimientos.length ? concept.movimientos.map(m=><div key={m.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${m.estado==='Anulado'?'bg-slate-50 opacity-70':'bg-white'}`}><div><b>{money(m.monto)} · {m.metodo}</b><span className="block text-xs text-slate-500">{date(m.fecha)} {String(m.hora).slice(0,5)} · {m.numero_recibo}</span><span className="block text-xs text-slate-600">{m.recibido_por?.nombre || 'Sin registrar'}{m.observacion ? ` · ${m.observacion}` : ''}</span></div><div className="flex gap-1">{m.estado!=='Anulado'&&<button title="Descargar recibo PDF" className="rounded-lg border p-2 text-cyan-700" onClick={()=>downloadReceipt(concept,m)}><ReceiptText size={16}/></button>}<button title="Editar pago" className="rounded-lg border p-2 text-teal-700" onClick={()=>onEdit(m)}><Pencil size={16}/></button><button title="Ver historial" className="rounded-lg border p-2 text-slate-600" onClick={()=>onHistory(m)}><History size={16}/></button>{m.estado!=='Anulado'&&<button title="Anular" className="rounded-lg border border-red-100 p-2 text-red-600" onClick={()=>onAnnul(m)}><XCircle size={16}/></button>}</div></div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No se registraron movimientos. Debe {money(concept.saldo_pendiente)}.</p>}</div>
  </div><div className="flex shrink-0 justify-end border-t p-3"><Button variant="secondary" onClick={onClose}>Cerrar</Button></div></div>;
}

function CloseArqueo({ form, setForm, indicators, onClose, onSaved }) {
  const set=(k,v)=>setForm(o=>({...o,[k]:v})); const confirmed=Number(form.efectivo_contado||0)+Number(form.qr_confirmado||0)+Number(form.transferencia_confirmada||0)+Number(form.tarjeta_confirmada||0); const difference=confirmed-Number(indicators.total_cobrado||0);
  const save=async(cerrar)=>{try{await saveArqueoPago({...form,cerrar});await onSaved();onClose();}catch(e){Swal.fire({icon:'error',title:'No se pudo guardar el arqueo',text:e.message,confirmButtonColor:'#0F766E'});}};
  return <div className="grid gap-4"><div className="grid grid-cols-3 gap-2 rounded-xl bg-teal-50 p-3 text-sm"><span>Esperado<br/><b>{money(indicators.total_esperado)}</b></span><span>Cobrado<br/><b>{money(indicators.total_cobrado)}</b></span><span>Pendiente<br/><b>{money(indicators.total_pendiente)}</b></span></div><div className="grid grid-cols-2 gap-3"><Input label={`Efectivo contado · Sistema ${money(indicators.efectivo)}`} type="number" min="0" step="0.01" value={form.efectivo_contado} onChange={e=>set('efectivo_contado',e.target.value)}/><Input label={`QR confirmado · Sistema ${money(indicators.qr)}`} type="number" min="0" step="0.01" value={form.qr_confirmado} onChange={e=>set('qr_confirmado',e.target.value)}/><Input label={`Transferencias confirmadas · Sistema ${money(indicators.transferencia)}`} type="number" min="0" step="0.01" value={form.transferencia_confirmada} onChange={e=>set('transferencia_confirmada',e.target.value)}/><Input label={`Tarjeta confirmada · Sistema ${money(indicators.tarjeta)}`} type="number" min="0" step="0.01" value={form.tarjeta_confirmada} onChange={e=>set('tarjeta_confirmada',e.target.value)}/></div><Input label="Observación" multiline value={form.observacion} onChange={e=>set('observacion',e.target.value)}/><div className={`rounded-xl p-3 text-sm font-bold ${difference?'bg-amber-50 text-amber-800':'bg-emerald-50 text-emerald-800'}`}>Diferencia final: {money(difference)}</div><div className="flex justify-end gap-2 border-t pt-3"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="secondary" onClick={()=>save(false)}>Guardar borrador</Button><Button onClick={()=>save(true)}>Cerrar arqueo</Button></div></div>;
}

function PlanillaPagos({ section = 'planilla' }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [data,setData]=useState({items:[],indicadores:{}}); const [loading,setLoading]=useState(true); const [professionals,setProfessionals]=useState([]); const [arqueos,setArqueos]=useState([]);
  const [mainView,setMainView]=useState(section);
  const [tab,setTab]=useState('Todos');
  const [filters,setFilters]=useState({desde:firstDay,hasta:today,buscar:'',estado:'Todos',metodo:'Todos',receptor:'',deuda:''});
  const [payment,setPayment]=useState(null); const [detail,setDetail]=useState(null); const [history,setHistory]=useState(null); const [closeOpen,setCloseOpen]=useState(false); const [closeForm,setCloseForm]=useState(blankClose);
  const load=useCallback(async(override)=>{const activeFilters=override?.desde?override:filters;setLoading(true);try{const result=await getPlanillaPagos(activeFilters);setData(result);const [people,closed]=await Promise.allSettled([getProfesionalesActivos(),getArqueosPago()]);if(people.status==='fulfilled')setProfessionals(people.value);if(closed.status==='fulfilled')setArqueos(closed.value);}finally{setLoading(false);}},[filters]);
  useEffect(()=>{
    const timeoutId=window.setTimeout(()=>load(),350);
    return()=>window.clearTimeout(timeoutId);
  },[filters.buscar]); // el buscador responde al escribir; los demás filtros se aplican con el botón
  useEffect(()=>{const linkedId=location.state?.conceptoCobroId;if(!linkedId||!data.items.length)return;const linked=data.items.find(item=>String(item.id)===String(linkedId));if(linked)setDetail(linked);},[data.items,location.state?.conceptoCobroId]);
  const items=useMemo(()=>data.items.filter(i=>{
    const anulado=i.estado==='Anulado'||i.activo===false||i.sesion?.anulada===true;
    if(mainView==='deudores')return !anulado&&i.saldo_pendiente>0;
    if(mainView==='recibos')return !anulado&&i.movimientos.some(m=>m.estado==='Activo'&&m.numero_recibo);
    if(mainView==='comprobantes')return !anulado&&i.movimientos.some(m=>m.estado==='Activo'&&m.numero_comprobante);
    if(tab==='Anulados')return anulado;
    if(anulado)return false;
    return tab==='Todos'||tab==='Pagados'&&i.estado==='Pagado'||tab==='Parciales'&&i.estado==='Parcial'||tab==='Deudores'&&i.saldo_pendiente>0;
  }),[data.items,tab,mainView]);
  const annul=async(m)=>{const result=await Swal.fire({icon:'warning',title:'¿Anular movimiento de pago?',text:'El monto dejará de considerarse en el total cobrado y se recalculará la deuda del paciente.',input:'textarea',inputLabel:'Motivo obligatorio',showCancelButton:true,confirmButtonText:'Anular movimiento',cancelButtonText:'Cancelar',confirmButtonColor:'#DC2626',inputValidator:v=>!v?.trim()?'Ingrese el motivo.':undefined});if(result.isConfirmed){await annulMovimientoPago(m.id,result.value);setDetail(null);await load();}};
  const showHistory=async(m)=>{setHistory({movement:m,items:await getMovimientoHistorial(m.id)});};
  const exportExcel=async()=>{const ExcelJS=(await import('exceljs')).default;const wb=new ExcelJS.Workbook();const sheet=wb.addWorksheet('Planilla de pagos');sheet.addRow(['PLANILLA DE PAGOS - PHYSIO ACTIVE']);sheet.mergeCells('A1:N1');sheet.getCell('A1').font={bold:true,size:16,color:{argb:'FFFFFFFF'}};sheet.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F766E'}};sheet.addRow(['Fecha','Paciente','CI','Historia clínica','Concepto','Sesión','Monto esperado','Monto pagado','Saldo','Método','Estado','Comprobante','Recibido por','Observación']);items.forEach(i=>sheet.addRow([date(i.fecha_origen),`${i.paciente?.nombres||''} ${i.paciente?.apellidos||''}`,i.paciente?.ci||'',historiaLabel(i.historia_clinica),i.detalle,i.sesion?.numero_sesion||'',Number(i.monto_esperado),i.total_pagado,i.saldo_pendiente,i.ultimo_metodo,i.estado,i.movimientos[0]?.numero_comprobante||'',i.movimientos[0]?.recibido_por?.nombre||'',i.movimientos[0]?.observacion||'']));sheet.columns.forEach(c=>c.width=18);sheet.getRow(2).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(2).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF134E4A'}};sheet.autoFilter='A2:N2';sheet.views=[{state:'frozen',ySplit:2}];const summary=wb.addWorksheet('Resumen financiero');Object.entries(data.indicadores).forEach(([k,v])=>summary.addRow([k.replaceAll('_',' '),v]));const blob=new Blob([await wb.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Planilla_Pagos_${filters.desde}_al_${filters.hasta}.xlsx`;a.click();URL.revokeObjectURL(a.href);};
  if(mainView==='arqueos') return <section className="grid gap-5"><Header actions={<Button onClick={()=>setCloseOpen(true)}><ShieldCheck size={17}/>Cerrar arqueo</Button>}/><ModuleTabs value={mainView} onChange={setMainView}/><div className="panel"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Arqueos financieros</h3><p className="text-sm text-slate-500">Cierres de caja del mismo registro unificado de pagos.</p></div></div><div className="mt-4 grid gap-3">{arqueos.length?arqueos.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><b>{date(a.fecha_desde)} al {date(a.fecha_hasta)}</b><span className="block text-sm text-slate-500">{a.responsable?.nombre} · {a.cantidad_movimientos} movimientos</span></div><div className="text-right"><b>{money(a.total_cobrado)}</b><span className={`ml-3 rounded-full px-2 py-1 text-xs font-bold ${a.estado==='Cerrado'?'bg-emerald-50 text-emerald-700':'bg-violet-50 text-violet-700'}`}>{a.estado}</span>{a.estado==='Cerrado'&&isAdmin&&<button className="ml-2 text-xs font-bold text-teal-700" onClick={async()=>{const r=await Swal.fire({title:'Reabrir arqueo',input:'textarea',inputLabel:'Motivo obligatorio',showCancelButton:true,confirmButtonText:'Reabrir',confirmButtonColor:'#0F766E'});if(r.isConfirmed&&r.value){await reopenArqueoPago(a.id,r.value);load();}}}><Undo2 className="inline" size={14}/> Reabrir</button>}</div></div>):<div className="rounded-xl bg-slate-50 py-12 text-center text-slate-500">Todavía no existen arqueos registrados.</div>}</div></div><Modal open={closeOpen} title="Cerrar arqueo" subtitle="Confirma la recaudación registrada en el periodo." onClose={()=>setCloseOpen(false)} size="compact"><CloseArqueo form={closeForm} setForm={setCloseForm} indicators={data.indicadores} onClose={()=>setCloseOpen(false)} onSaved={load}/></Modal></section>;
  return <section className="grid gap-5"><Header actions={<><Button variant="secondary" onClick={load}><RefreshCw size={17}/>Actualizar</Button><Button variant="secondary" onClick={exportExcel} disabled={!items.length}><FileSpreadsheet size={17}/>Exportar Excel</Button><Button onClick={()=>setCloseOpen(true)}><ShieldCheck size={17}/>Cerrar arqueo</Button></>}/><ModuleTabs value={mainView} onChange={setMainView}/>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><Stat icon={Landmark} label="Total esperado" value={money(data.indicadores.total_esperado)}/><Stat icon={CheckCircle2} label="Total cobrado" value={money(data.indicadores.total_cobrado)} tone="green"/><Stat icon={Clock3} label="Total pendiente" value={money(data.indicadores.total_pendiente)} tone="red"/><Stat icon={Banknote} label="Efectivo" value={money(data.indicadores.efectivo)} tone="cyan"/><Stat icon={WalletCards} label="Pacientes con deuda" value={data.indicadores.pacientes_deuda||0} tone="violet"/></div>
    <div className="panel grid gap-4">{mainView==='planilla'?<div className="flex flex-wrap gap-1 border-b">{tabs.map(t=><button key={t} onClick={()=>setTab(t)} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab===t?'border-teal-600 text-teal-700':'border-transparent text-slate-500'}`}>{t}</button>)}</div>:<div className="border-b pb-3"><h2 className="text-lg font-black text-slate-900">{moduleTabs.find(item=>item.key===mainView)?.label}</h2><p className="text-sm text-slate-500">{mainView==='deudores'?'Pacientes con saldo pendiente, ordenados dentro de la misma planilla.':mainView==='recibos'?'Recibos generados por cada movimiento de pago registrado.':'Comprobantes asociados a movimientos QR, transferencias y otros métodos.'}</p></div>}
      <div className="grid gap-3 md:grid-cols-8"><label className="relative md:col-span-2"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input className="w-full rounded-lg border-slate-200 pl-10 text-sm" placeholder="Paciente, CI, diagnóstico, concepto o recibo" value={filters.buscar} onChange={e=>setFilters(f=>({...f,buscar:e.target.value}))}/></label><Input compact label="Desde" type="date" value={filters.desde} onChange={e=>setFilters(f=>({...f,desde:e.target.value}))}/><Input compact label="Hasta" type="date" value={filters.hasta} onChange={e=>setFilters(f=>({...f,hasta:e.target.value}))}/><Input compact label="Estado" options={['Todos','Pendiente','Parcial','Pagado','Exonerado','Saldo a favor','Anulado'].map(v=>({value:v,label:v}))} value={filters.estado} onChange={e=>setFilters(f=>({...f,estado:e.target.value}))}/><Input compact label="Método" options={['Todos','Efectivo','QR','Transferencia','Tarjeta','Otro'].map(v=>({value:v,label:v}))} value={filters.metodo} onChange={e=>setFilters(f=>({...f,metodo:e.target.value}))}/><Input compact label="Recibido por" options={[{value:'',label:'Todo el personal'},...professionals.map(p=>({value:p.id,label:p.nombre||p.usuario}))]} value={filters.receptor} onChange={e=>setFilters(f=>({...f,receptor:e.target.value}))}/><div className="flex items-end gap-2"><Button className="flex-1" onClick={()=>load()}>Aplicar</Button><Button variant="secondary" title="Limpiar filtros" onClick={()=>{const clean={desde:firstDay,hasta:today,buscar:'',estado:'Todos',metodo:'Todos',receptor:'',deuda:''};setFilters(clean);load(clean)}}><RefreshCw size={16}/></Button></div></div>
      {loading?<div className="py-12 text-center text-slate-500">Cargando datos financieros reales...</div>:!items.length?<div className="rounded-xl bg-slate-50 py-12 text-center text-slate-500">No existen cobros que coincidan con los filtros.</div>:<><div className="hidden overflow-x-auto lg:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr>{['Fecha','Paciente','Historia clínica','Concepto','Esperado','Pagado','Saldo','Método','Estado','Recibido por','Acciones'].map(h=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{items.map(i=><tr key={i.id} className="border-t hover:bg-teal-50/40"><td className="px-3 py-3">{date(i.fecha_origen)}</td><td className="px-3 py-3"><PatientIdentity paciente={i.paciente} secondary={`CI: ${i.paciente?.ci || '-'}`} /></td><td className="max-w-48 px-3 py-3 text-xs"><b className="block text-slate-700">{i.historia_clinica?.id ? `Historia del ${date(i.historia_clinica.fecha_evaluacion)}` : 'Sin historia clínica'}</b><span className="mt-1 block text-slate-500">{i.historia_clinica?.diagnostico_medico || (i.historia_clinica?.id ? 'Sin diagnóstico registrado' : 'No vinculada')}</span></td><td className="max-w-56 px-3 py-3"><b>{i.detalle}</b><span className="block text-xs text-slate-500">{i.total_pagado?`Pagó ${money(i.total_pagado)}. Debe ${money(i.saldo_pendiente)}.`:`No realizó pago. Debe ${money(i.saldo_pendiente)}.`}</span></td><td className="px-3 py-3">{money(i.monto_esperado)}</td><td className="px-3 py-3 font-bold text-emerald-700">{money(i.total_pagado)}</td><td className="px-3 py-3 font-bold text-red-700">{money(i.saldo_pendiente)}</td><td className="px-3 py-3">{i.ultimo_metodo}</td><td className="px-3 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass[i.estado]}`}>{i.estado}</span></td><td className="px-3 py-3 text-xs">{i.movimientos[0]?.recibido_por?.nombre||'Sin pago'}</td><td className="px-3 py-3"><div className="flex gap-1"><button className="rounded-lg border p-2 text-teal-700" title="Ver detalle" onClick={()=>setDetail(i)}><Eye size={16}/></button>{i.activo&&i.saldo_pendiente>0&&<button className="rounded-lg bg-teal-600 p-2 text-white" title="Registrar pago" onClick={()=>setPayment({concept:i})}><Plus size={16}/></button>}</div></td></tr>)}</tbody></table></div><div className="grid gap-3 lg:hidden">{items.map(i=><article key={i.id} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><div><b>{i.paciente?.nombres} {i.paciente?.apellidos}</b><span className="block text-xs text-slate-500">{historiaLabel(i.historia_clinica)}</span><span className="block text-xs text-slate-500">{i.detalle}</span></div><span className={`h-fit rounded-full border px-2 py-1 text-xs font-bold ${statusClass[i.estado]}`}>{i.estado}</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-sm"><span>Concepto<br/><b>{money(i.monto_esperado)}</b></span><span>Pagado<br/><b className="text-emerald-700">{money(i.total_pagado)}</b></span><span>Saldo<br/><b className="text-red-700">{money(i.saldo_pendiente)}</b></span></div><div className="mt-3 flex gap-2"><Button variant="secondary" onClick={()=>setDetail(i)}><Eye size={15}/>Ver</Button>{i.saldo_pendiente>0&&<Button onClick={()=>setPayment({concept:i})}><Plus size={15}/>Registrar pago</Button>}</div></article>)}</div></>}
    </div>
    <Modal open={Boolean(payment)} title={payment?.movement?'Editar pago':'Registrar pago'} subtitle="El movimiento actualizará automáticamente el saldo y el estado." onClose={()=>setPayment(null)} size="compact">{payment&&<PaymentForm concept={payment.concept} movement={payment.movement} professionals={professionals} onClose={()=>setPayment(null)} onSaved={load}/>}</Modal>
    <Modal open={Boolean(detail)} title="Detalle del pago y deuda" subtitle="Origen, saldo e historial cronológico de movimientos." onClose={()=>setDetail(null)} size="lg" patientStyle>{detail&&<Detail concept={detail} onClose={()=>setDetail(null)} onEdit={m=>{setPayment({concept:detail,movement:m});setDetail(null)}} onAnnul={annul} onHistory={showHistory}/>}</Modal>
    <Modal open={Boolean(history)} title="Historial del pago" subtitle="Registro de auditoría inalterable." onClose={()=>setHistory(null)} size="compact"><div className="grid gap-3">{history?.items.map(h=><div key={h.id} className="border-l-4 border-teal-500 bg-teal-50/50 p-3"><b>{h.accion}</b><span className="block text-xs text-slate-500">{formatBoliviaDateTime(h.created_at, { dateStyle: 'short', timeStyle: 'short' })} · {h.usuario?.nombre||h.usuario?.usuario}</span>{h.motivo&&<p className="mt-1 text-sm">Motivo: {h.motivo}</p>}</div>)}</div></Modal>
    <Modal open={closeOpen} title="Cerrar arqueo" subtitle="Confirma la recaudación registrada en el periodo." onClose={()=>setCloseOpen(false)} size="compact"><CloseArqueo form={closeForm} setForm={setCloseForm} indicators={data.indicadores} onClose={()=>setCloseOpen(false)} onSaved={load}/></Modal>
  </section>;
}

function Header({ actions }) { return <header className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-cyan-50 p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-teal-700">Control financiero</p><h1 className="mt-1 text-3xl font-black text-slate-900">Planilla de pagos</h1><p className="mt-1 text-sm text-slate-600">Control de cobros, saldos, deudas y recaudación de pacientes.</p></div><div className="flex flex-wrap gap-2">{actions}</div></div></header>; }

export default PlanillaPagos;
