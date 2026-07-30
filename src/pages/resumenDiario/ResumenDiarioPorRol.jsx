import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Table from '../../components/common/Table';
import { getResumenDiario } from '../../services/resumenDiarioService';
import { boliviaDate } from '../../utils/boliviaDateTime';
import ResumenDiario from './ResumenDiario';

const clinicalTabs = [
  ['atenciones', 'Atenciones'],
  ['evolutivos', 'Evoluciones'],
  ['farmacos', 'Fármacos'],
  ['personal', 'Personal'],
  ['observaciones', 'Observaciones']
];
const allResponseKey = {
  atenciones: 'attentions',
  evolutivos: 'evolutions',
  farmacos: 'drugs',
  personal: 'personnel',
  observaciones: 'observations'
};

const blockedKeys = /pago|deuda|monto|saldo|costo|precio|recibo|comprobante|arqueo|cobro/i;
const safeKeys = (row = {}) => Object.keys(row).filter((key) => (
  !blockedKeys.test(key) && !['id', 'paciente_id', 'historia_id', 'concepto_id', 'actividades'].includes(key)
));

function ResumenDiarioClinico() {
  const [fecha, setFecha] = useState(boliviaDate());
  const [tab, setTab] = useState('atenciones');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const rows = Array.isArray(data?.[tab]) ? data[tab] : [];

  const load = async () => {
    setLoading(true);
    try {
      setData(await getResumenDiario(fecha, tab));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [fecha, tab]);

  const columns = useMemo(() => safeKeys(rows[0]), [rows]);

  const exportClinical = async () => {
    const all = await getResumenDiario(fecha, 'todo');
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    clinicalTabs.forEach(([key, label]) => {
      const source = Array.isArray(all[allResponseKey[key]]) ? all[allResponseKey[key]] : [];
      const sheet = workbook.addWorksheet(label);
      const keys = safeKeys(source[0]);
      sheet.addRow(keys.map((item) => item.replaceAll('_', ' ').toUpperCase()));
      source.forEach((row) => sheet.addRow(keys.map((item) => (
        typeof row[item] === 'object' ? JSON.stringify(row[item]) : row[item] ?? ''
      ))));
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      sheet.columns.forEach((column) => { column.width = 22; });
    });
    const blob = new Blob([await workbook.xlsx.writeBuffer()]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Resumen_Clinico_${fecha}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="grid min-w-0 gap-5">
      {loading && <Loader />}
      <header className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-teal-700">Control diario clínico</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Resumen diario de actividades</h1>
            <p className="mt-1 text-sm text-slate-600">Atenciones y actividad clínica del día seleccionado.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input compact label="Fecha seleccionada" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
            <Button variant="secondary" onClick={() => setFecha(boliviaDate())}><CalendarDays size={16} />Hoy</Button>
            <Button variant="secondary" onClick={load}><RefreshCw size={16} />Actualizar</Button>
            <Button onClick={exportClinical}><Download size={16} />Exportar resumen clínico</Button>
          </div>
        </div>
      </header>

      <nav className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {clinicalTabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-3 text-sm font-bold ${tab === key ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-teal-50'}`}>
            {label}
          </button>
        ))}
      </nav>

      <div className="panel">
        <h2 className="mb-4 text-xl font-black text-slate-900">{clinicalTabs.find(([key]) => key === tab)?.[1]}</h2>
        <Table
          columns={columns.map((key) => key.replaceAll('_', ' '))}
          rows={rows.map((row) => columns.map((key) => (
            typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key] ?? 'Sin registrar'
          )))}
          empty="No existen registros clínicos para esta fecha."
        />
      </div>
    </section>
  );
}

function ResumenDiarioPorRol() {
  const { isAdmin } = useAuth();
  return isAdmin ? <ResumenDiario /> : <ResumenDiarioClinico />;
}

export default ResumenDiarioPorRol;
