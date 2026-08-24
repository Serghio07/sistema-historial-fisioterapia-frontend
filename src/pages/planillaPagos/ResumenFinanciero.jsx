import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownCircle, ArrowUpCircle, Banknote, Download, Eye, Landmark, RefreshCw, WalletCards } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Table from '../../components/common/Table';
import { getResumenFinanciero } from '../../services/planillaPagosService';
import { boliviaDate } from '../../utils/boliviaDateTime';
import { formatDate } from '../../utils/formatDate';

const money = (value) => `Bs ${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const resultMoney = (value) => Number(value || 0) < 0 ? `-Bs ${Math.abs(Number(value)).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : money(value);
const monthOptions = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((label,index)=>({value:String(index+1).padStart(2,'0'),label}));
const yearOptions = Array.from({ length: 23 }, (_, index) => { const value = String(new Date().getFullYear() + 2 - index); return { value, label: value }; });
const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const rangeFor = (mode, anchor) => {
  const value = new Date(`${anchor}T12:00:00`);
  if (mode === 'hoy') return { fecha_inicio: anchor, fecha_fin: anchor };
  if (mode === 'semana') { const start = new Date(value); start.setDate(value.getDate() - ((value.getDay() + 6) % 7)); const end = new Date(start); end.setDate(start.getDate() + 6); return { fecha_inicio: iso(start), fecha_fin: iso(end) }; }
  if (mode === 'mes') return { fecha_inicio: iso(new Date(value.getFullYear(), value.getMonth(), 1)), fecha_fin: iso(new Date(value.getFullYear(), value.getMonth() + 1, 0)) };
  return null;
};

function Card({ label, value, icon: Icon, tone, tooltip }) { return <article title={tooltip} className={`rounded-xl border p-4 ${tone}`}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wide">{label}</span><Icon size={19}/></div><strong className="mt-3 block text-2xl text-slate-900">{value}</strong></article>; }

const cashTypeNames = { INGRESO_EXTRAORDINARIO: 'Ingreso extraordinario', EGRESO: 'Egreso operativo', APORTE_CAJA: 'Aporte a caja', RETIRO_CAJA: 'Retiro de caja', AJUSTE_POSITIVO: 'Ajuste positivo', AJUSTE_NEGATIVO: 'Ajuste negativo' };
const cashIncomeTypes = new Set(['INGRESO_EXTRAORDINARIO', 'APORTE_CAJA', 'AJUSTE_POSITIVO']);
const detailIcons = { Paciente: '👤', Historia: '📋', Concepto: '📝', Sesión: '🩺', Esperado: '🎯', Pagado: '✅', Saldo: '⚖️', Método: '💳', Responsable: '🙋', Arqueo: '🏦', Observación: '💬', Comprobante: '🧾', Tipo: '🔄' };

function MovementDetail({ detail }) {
  const isCash = detail.origen === 'MOVIMIENTO_CAJA';
  const isAnnulled = String(detail.estado).toUpperCase().includes('ANUL');
  const isIncome = !isCash || cashIncomeTypes.has(detail.tipo_movimiento);
  const fields = isCash
    ? [['Tipo', cashTypeNames[detail.tipo_movimiento] || detail.tipo_movimiento], ['Concepto', detail.concepto], ['Método', detail.metodo], ['Responsable', detail.recibido_por], ['Arqueo', detail.arqueo?.estado], ['Observación', detail.observacion], ['Comprobante', detail.comprobante]]
    : [['Paciente', detail.paciente], ['Historia', detail.historia], ['Concepto', detail.concepto], ['Sesión', detail.sesion], ['Esperado', money(detail.esperado)], ['Pagado', money(detail.pagado)], ['Saldo', money(detail.saldo)], ['Método', detail.metodo], ['Responsable', detail.recibido_por], ['Arqueo', detail.arqueo?.estado], ['Observación', detail.observacion], ['Comprobante', detail.comprobante]];
  return <div className="grid gap-4">
    <div className={`relative overflow-hidden rounded-2xl border p-5 ${isAnnulled ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50' : isIncome ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50' : 'border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50'}`}>
      <div className="absolute -right-5 -top-7 text-8xl opacity-10" aria-hidden="true">{isAnnulled ? '🚫' : isIncome ? '💰' : '💸'}</div>
      <div className="relative flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-slate-500">{isCash ? 'Movimiento manual de caja' : 'Cobro de paciente'}</p><strong className="mt-1 block text-2xl text-slate-900">{isIncome ? '+' : '−'} {money(detail.monto)}</strong><p className="mt-1 text-sm font-semibold text-slate-600">{detail.concepto}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-black ${isAnnulled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{isAnnulled ? '🚫 ANULADO' : '✅ ACTIVO'}</span></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{fields.filter(([,value])=>value!==null&&value!==undefined&&value!=='').map(([label,value])=><div key={label} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-lg" aria-hidden="true">{detailIcons[label] || '📌'}</span><div className="min-w-0"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span><b className="mt-0.5 block break-words text-sm text-slate-800">{value}</b></div></div></div>)}</div>
  </div>;
}

export default function ResumenFinanciero() {
  const navigate = useNavigate(); const today = boliviaDate();
  const [mode,setMode]=useState('hoy'); const [anchor,setAnchor]=useState(today); const [custom,setCustom]=useState({fecha_inicio:today,fecha_fin:today});
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [detail,setDetail]=useState(null);
  const range=useMemo(()=>mode==='personalizado'?custom:rangeFor(mode,anchor),[mode,anchor,custom]);
  const load=useCallback(async()=>{if(!range||range.fecha_inicio>range.fecha_fin)return;setLoading(true);try{setData(await getResumenFinanciero(range));}finally{setLoading(false);}},[range]);
  useEffect(()=>{load();},[load]);
  const exportCsv=()=>{const rows=data?.movimientos_recientes||[];const content=[['Fecha','Paciente','Concepto','Método','Monto','Estado'],...rows.map(x=>[x.fecha,x.paciente,x.concepto,x.metodo,x.monto,x.estado])].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+content],{type:'text/csv;charset=utf-8'}));a.download=`Resumen_financiero_${range.fecha_inicio}_${range.fecha_fin}.csv`;a.click();URL.revokeObjectURL(a.href);};
  return <section className="grid gap-5">{loading&&<Loader/>}
    <header className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase text-teal-700">Control financiero</p><h1 className="mt-1 text-3xl font-black">Resumen financiero</h1><p className="mt-1 text-sm text-slate-600">Vista ejecutiva de cobros, deuda y caja.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={load}><RefreshCw size={16}/>Actualizar</Button><Button variant="secondary" onClick={exportCsv}><Download size={16}/>Exportar</Button><Button onClick={()=>navigate('/control-financiero/arqueos')}><Landmark size={16}/>Gestionar arqueo</Button></div></div>
      <div className="mt-4 rounded-xl border border-teal-100 bg-white/80 p-3 shadow-sm"><div className="flex flex-wrap gap-2">{[['hoy','Día'],['semana','Semana'],['mes','Mes'],['personalizado','Personalizado']].map(([key,label])=><button type="button" key={key} aria-pressed={mode===key} onClick={()=>setMode(key)} className={`min-h-10 flex-1 rounded-lg px-4 py-2 text-sm font-black transition sm:flex-none ${mode===key?'bg-teal-600 text-white shadow-sm':'bg-slate-50 text-slate-600 hover:bg-teal-50'}`}>{label}</button>)}</div><div className="mt-3 flex flex-wrap items-end gap-3">{mode==='mes'?<><Input compact className="min-w-[190px] flex-1" label="Mes a consultar" value={anchor.slice(5,7)} options={monthOptions} onChange={e=>setAnchor(`${anchor.slice(0,4)}-${e.target.value}-01`)}/><Input compact className="min-w-[130px] sm:max-w-[180px]" label="Año" value={anchor.slice(0,4)} options={yearOptions} onChange={e=>setAnchor(`${e.target.value}-${anchor.slice(5,7)}-01`)}/></>:mode!=='personalizado'?<Input compact className="min-w-[260px] flex-1" label={mode==='semana'?'Fecha dentro de la semana':'Fecha a consultar'} type="date" value={anchor} onChange={e=>setAnchor(e.target.value)}/>:<><Input compact className="min-w-[220px] flex-1" label="Desde" type="date" value={custom.fecha_inicio} onChange={e=>setCustom({...custom,fecha_inicio:e.target.value})}/><Input compact className="min-w-[220px] flex-1" label="Hasta" type="date" value={custom.fecha_fin} onChange={e=>setCustom({...custom,fecha_fin:e.target.value})}/></>}<span className="min-w-fit rounded-lg border border-teal-100 bg-teal-50 px-4 py-2.5 text-xs font-black text-teal-700">{formatDate(range?.fecha_inicio)} — {formatDate(range?.fecha_fin)}</span></div></div>
    </header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6"><Card label="Cobros de pacientes del período" value={money(data?.total_cobrado)} icon={Banknote} tone="border-emerald-100 bg-emerald-50 text-emerald-700"/><Card label="Deuda vigente por servicios" value={money(data?.total_pendiente)} icon={WalletCards} tone="border-red-100 bg-red-50 text-red-700"/><Card label="Ingresos extraordinarios" value={money(data?.ingresos_extraordinarios)} icon={ArrowUpCircle} tone="border-sky-100 bg-sky-50 text-sky-700"/><Card label="Egresos operativos" value={money(data?.egresos)} icon={ArrowDownCircle} tone="border-orange-100 bg-orange-50 text-orange-700"/><Card label="Resultado neto operativo" value={resultMoney(data?.resultado_neto_operativo)} tooltip="Cobros de pacientes + ingresos extraordinarios - egresos operativos." icon={Landmark} tone={Number(data?.resultado_neto_operativo||0)<0?'border-red-100 bg-red-50 text-red-700':'border-teal-100 bg-teal-50 text-teal-700'}/><Card label="Efectivo esperado en caja" value={`${data?.apertura_pendiente?'Pendiente de definir apertura':money(data?.saldo_caja)} · ${data?.estado_arqueo||'Sin iniciar'}`} icon={Landmark} tone="border-amber-100 bg-amber-50 text-amber-700"/></div>
    <div className="grid gap-5 xl:grid-cols-2"><section className="panel"><h2 className="text-lg font-black">Métodos de pago</h2><div className="mt-4 grid gap-3">{(data?.metodos_pago||[]).map(x=><div key={x.metodo}><div className="mb-1 flex justify-between text-sm"><b>{x.metodo}</b><span>{money(x.monto)} · {x.porcentaje}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{width:`${Math.min(x.porcentaje,100)}%`}}/></div></div>)}</div></section><section className="panel"><div className="flex justify-between"><h2 className="text-lg font-black">Deuda por paciente</h2><button className="text-sm font-black text-teal-700" onClick={()=>navigate('/control-financiero/planilla',{state:{tab:'Deudores'}})}>Ver todos</button></div><div className="mt-3"><Table columns={['Paciente','Historia','Esperado','Pagado','Saldo']} rows={(data?.deuda_por_paciente||[]).map(x=>[x.paciente,x.historia,money(x.esperado),money(x.pagado),money(x.saldo)])} empty="No existen deudas pendientes."/></div></section></div>
    <section className="panel"><h2 className="text-lg font-black">Movimientos recientes</h2><div className="mt-3"><Table columns={['Fecha','Paciente','Concepto','Método','Monto','Estado','Acción']} rows={(data?.movimientos_recientes||[]).map(x=>[formatDate(x.fecha),x.paciente,x.concepto,x.metodo,money(x.monto),x.estado,<ActionButton label="Ver movimiento" icon={Eye} tone="view" onClick={()=>setDetail(x)}/>])} empty="No existen movimientos en el período."/></div></section>
    <Modal open={Boolean(detail)} title="✨ Detalle del movimiento" subtitle={detail?`📅 ${formatDate(detail.fecha)} · 🕐 ${String(detail.hora||'').slice(0,5)}`:''} onClose={()=>setDetail(null)} size="compact">{detail&&<MovementDetail detail={detail}/>}</Modal>
  </section>;
}
