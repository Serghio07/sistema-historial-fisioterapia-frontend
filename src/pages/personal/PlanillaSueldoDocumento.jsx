import logo from '../../assets/logos/logo.png';
import { MESES } from '../../utils/exportPlanillaExcel';

const money = (value) => `${Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
const amount = (item) => item.tipo_pago === 'por_servicio' ? Number(item.monto_servicio || 0) : Number(item.sueldo_base || 0);

function PlanillaSueldoDocumento({ planilla }) {
  const detalles = planilla?.detalles || [];
  const total = detalles.reduce((sum, item) => sum + amount(item), 0);
  return (
    <article className="mx-auto min-h-[210mm] w-full max-w-[297mm] bg-white px-7 py-6 text-[11px] text-slate-900 shadow-soft print:shadow-none">
      <header className="grid grid-cols-[90px_1fr_90px] items-center border-b-2 border-teal-700 pb-3">
        <img src={logo} alt="Physio Active" className="h-16 w-20 object-contain" />
        <div className="text-center"><h1 className="text-base font-black uppercase">Centro de Fisioterapia y Kinesiología Integral</h1><p className="mt-1 font-black uppercase text-teal-700">Planilla de sueldos — {MESES[planilla?.mes]} {planilla?.anio}</p></div><div />
      </header>
      <table className="mt-5 w-full table-fixed border-collapse">
        <thead><tr className="bg-teal-800 text-white">{['N.º', 'Ap. paterno', 'Ap. materno', 'Nombres', 'CI', 'Cargo', 'Horario', 'Sueldo', 'Firma'].map((head) => <th key={head} className="border border-teal-900 px-1 py-2">{head}</th>)}</tr></thead>
        <tbody>{detalles.map((item, index) => <tr key={item.personal_id || index}><td className="border p-1.5 text-center">{index + 1}</td><td className="border p-1.5">{item.apellido_paterno}</td><td className="border p-1.5">{item.apellido_materno}</td><td className="border p-1.5">{item.nombres}</td><td className="border p-1.5">{item.ci}</td><td className="border p-1.5">{item.cargo}</td><td className="border p-1.5">{item.horario}</td><td className="border p-1.5 text-right">{item.tipo_pago === 'por_servicio' && !item.monto_servicio ? 'Por servicio' : money(amount(item))}</td><td className="border p-1.5">{item.firma || '____________'}</td></tr>)}</tbody>
      </table>
      <div className="mt-4 flex justify-between rounded border border-teal-200 bg-teal-50 px-3 py-2 font-black"><span>Total personal: {detalles.length}</span><span>Total sueldos: {money(total)}</span></div>
      {planilla?.observaciones && <p className="mt-4 rounded border p-3"><b>Observación:</b> {planilla.observaciones}</p>}
      <footer className="mt-20 grid grid-cols-2 gap-20 text-center"><div className="border-t pt-2">Firma responsable</div><div className="border-t pt-2">Administración / Contabilidad</div></footer>
    </article>
  );
}

export default PlanillaSueldoDocumento;
