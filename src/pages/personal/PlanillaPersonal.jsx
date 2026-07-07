import { useEffect, useMemo, useState } from 'react';
import { Download, FilePenLine, Plus, Printer, Save, Search } from 'lucide-react';
import ActionButton from '../../components/common/ActionButton';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Table from '../../components/common/Table';
import { createPlanillaPersonal, getPlanillaPeriodo, getPlanillasPersonal, updatePlanillaPersonal } from '../../services/planillaPersonalService';
import { exportPlanillaExcel, MESES } from '../../utils/exportPlanillaExcel';
import { formatDate } from '../../utils/formatDate';

const current = new Date();
const money = (value) => Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PlanillaPersonal() {
  const [mes, setMes] = useState(current.getMonth() + 1);
  const [anio, setAnio] = useState(current.getFullYear());
  const [query, setQuery] = useState('');
  const [planilla, setPlanilla] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadHistorico = async () => setHistorico(await getPlanillasPersonal());
  useEffect(() => { loadHistorico(); }, []);

  useEffect(() => {
    const loadPeriod = async () => {
      setLoading(true);
      try {
        setPlanilla(await getPlanillaPeriodo(anio, mes));
        setEditing(false);
      } finally {
        setLoading(false);
      }
    };
    loadPeriod();
  }, [mes, anio]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (planilla?.detalles || []).filter((item) => !term || `${item.apellido_paterno} ${item.apellido_materno || ''} ${item.nombres} ${item.ci || ''} ${item.cargo || ''}`.toLowerCase().includes(term));
  }, [planilla, query]);

  const create = async () => {
    setLoading(true);
    setMessage('');
    try {
      const existing = await getPlanillaPeriodo(anio, mes);
      if (existing) {
        setPlanilla(existing);
        setMessage('La planilla de este periodo ya existe. Se abrio el historico para editarlo.');
        return;
      }
      const created = await createPlanillaPersonal({ mes, anio });
      setPlanilla(created);
      await loadHistorico();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateDetail = (id, key, value) => {
    setPlanilla({
      ...planilla,
      detalles: planilla.detalles.map((item) => item.id === id ? { ...item, [key]: value } : item)
    });
  };

  const save = async () => {
    setLoading(true);
    try {
      const updated = await updatePlanillaPersonal(planilla.id, { detalles: planilla.detalles, observaciones: planilla.observaciones });
      setPlanilla(updated);
      setEditing(false);
      await loadHistorico();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const print = () => window.print();

  return (
    <section className="grid gap-5">
      {loading && <Loader />}
      <header className="rounded-xl bg-gradient-to-r from-[#123f3f] to-brand-600 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-black uppercase text-brand-100">Administracion interna</p><h2 className="mt-1 text-3xl font-black">Planilla del Personal</h2><p className="mt-2 text-sm text-brand-50">Registro y exportacion de planilla mensual</p></div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={create}><Plus size={17} />Nueva planilla</Button>
            <Button variant="secondary" disabled={!planilla} onClick={() => exportPlanillaExcel(planilla)}><Download size={17} />Exportar Excel</Button>
          </div>
        </div>
      </header>

      {message && <p className="notice">{message}</p>}

      <div className="panel">
        <div className="grid gap-3 lg:grid-cols-[220px_180px_1fr_auto]">
          <Input label="Mes" value={mes} onChange={(e) => setMes(Number(e.target.value))} options={MESES.slice(1).map((item, index) => ({ value: index + 1, label: item }))} />
          <Input label="Ano" type="number" min="2000" max="2200" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
          <label className="grid gap-1 text-sm font-bold text-slate-700"><span>Buscar</span><span className="flex min-h-11 items-center rounded-lg border border-slate-200 px-3"><Search size={17} className="mr-2 text-slate-400" /><input className="w-full border-0 p-0 text-sm focus:ring-0" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre, cedula o cargo" /></span></label>
          <div className="flex items-end gap-2">
            {planilla && <ActionButton label="Imprimir" icon={Printer} tone="print" className="h-11 w-11" onClick={print} />}
            {planilla && !editing && <ActionButton label="Editar planilla" icon={FilePenLine} tone="edit" className="h-11 w-11" onClick={() => setEditing(true)} />}
            {planilla && editing && <ActionButton label="Guardar" icon={Save} tone="edit" className="h-11 w-11" onClick={save} />}
          </div>
        </div>
      </div>

      <div className="panel print:shadow-none" id="planilla-personal-print">
        <div className="mb-5 text-center">
          <h3 className="text-lg font-black">Centro de Fisioterapia y Kinesiología Integral</h3>
          <h4 className="mt-2 text-base font-black uppercase">PLANILLA DE SUELDOS CORRESPONDIENTE AL MES {MESES[mes]} {anio}</h4>
          {planilla && <p className="mt-1 text-xs text-slate-500">Creada el {formatDate(planilla.created_at)} por {planilla.creado_por?.nombre || 'Administrador'}</p>}
        </div>

        {!planilla ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><p className="font-bold text-slate-600">No existe una planilla para este periodo.</p><p className="mt-1 text-sm text-slate-400">Pulsa “Nueva planilla” para generarla con el personal activo.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-xs">
              <thead><tr className="bg-emerald-50">
                {['N°', 'AP. PATERNO', 'AP. MATERNO', 'NOMBRES', 'CÉDULA IDENTIDAD', 'CARGO', 'HORARIO', 'SUELDO Bs.-', 'FIRMA'].map((header) => <th key={header} className="border border-slate-700 px-2 py-3 font-black">{header}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map((item, index) => <tr key={item.id || index}>
                  <td className="border border-slate-700 px-2 py-3 text-center">{index + 1}</td>
                  {['apellido_paterno', 'apellido_materno', 'nombres', 'ci', 'cargo', 'horario'].map((key) => <td key={key} className="border border-slate-700 px-2 py-3">{editing ? <input className="w-full border-0 bg-amber-50 p-1 text-xs" value={item[key] || ''} onChange={(e) => updateDetail(item.id, key, e.target.value)} /> : item[key]}</td>)}
                  <td className="border border-slate-700 px-2 py-3 text-center">{item.tipo_pago === 'por_servicio' ? 'POR SERVICIO' : editing ? <input className="w-24 bg-amber-50 p-1 text-right" type="number" value={item.sueldo_base || ''} onChange={(e) => updateDetail(item.id, 'sueldo_base', e.target.value)} /> : money(item.sueldo_base)}</td>
                  <td className="h-16 min-w-36 border border-slate-700 px-2 py-3" />
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel print:hidden">
        <h3 className="mb-4 text-lg font-black">Historico mensual</h3>
        <Table
          columns={['Periodo', 'Fecha de creacion', 'Creado por', 'Personal', 'Acciones']}
          rows={historico.map((item) => [
            `${MESES[item.mes]} ${item.anio}`,
            formatDate(item.created_at),
            item.creado_por?.nombre || 'Administrador',
            item.detalles?.length || 0,
            <ActionButton label="Abrir" icon={FilePenLine} tone="view" onClick={() => { setMes(item.mes); setAnio(item.anio); setPlanilla(item); }} />
          ])}
          empty="No hay planillas mensuales guardadas."
        />
      </div>
    </section>
  );
}

export default PlanillaPersonal;
