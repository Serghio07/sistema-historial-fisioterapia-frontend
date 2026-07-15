import { Printer } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import logo from '../../assets/logos/logo.png';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

export default function EvolutivosDocumento({ historia, onClose }) {
  if (!historia) return null;
  const evolutions = Array.isArray(historia.evolutivo) ? historia.evolutivo : [];
  const contracted = Number(historia.evaluacion_final?.sesiones_contratadas || evolutions.length || 1);
  const rows = Array.from({ length: Math.max(contracted, evolutions.length) }, (_, index) => evolutions.find((item) => Number(item.numero_sesion || item.numero) === index + 1) || evolutions[index]);
  return <Modal open title="Evolutivos y plan de tratamiento" subtitle={`${nombrePaciente(historia.paciente)} · ${evolutions.length} evolutivos registrados`} onClose={onClose} size="lg">
    <div className="grid gap-3">
      <div className="flex justify-end"><Button onClick={() => window.print()}><Printer size={16} />Imprimir / Guardar PDF</Button></div>
      <div className="max-h-[68vh] overflow-auto bg-slate-100 p-4">
        <article className="mx-auto min-h-[270mm] w-full max-w-[210mm] bg-white p-7 text-slate-900 shadow-sm print:shadow-none">
          <header className="grid grid-cols-[90px_1fr_90px] items-center border-b border-slate-700 pb-4"><img src={logo} alt="Physio Active" className="h-16 w-24 object-contain" /><div className="text-center"><h1 className="text-lg font-black uppercase">Sesiones y plan de tratamiento</h1><p className="mt-1 text-sm font-bold uppercase">{nombrePaciente(historia.paciente)}</p></div><span className="text-right text-xs">{formatDate(new Date().toISOString().slice(0, 10))}</span></header>
          <table className="mt-5 w-full table-fixed border-collapse text-xs"><thead><tr className="bg-slate-100"><th className="w-12 border border-slate-700 p-2">N.º</th><th className="w-28 border border-slate-700 p-2">Fecha</th><th className="border border-slate-700 p-2">Aplicación de medios físicos y técnicas manuales</th><th className="w-36 border border-slate-700 p-2">Inyectables</th></tr></thead><tbody>{rows.map((evolution, index) => <tr key={evolution?.id || index} className="h-20 align-top"><td className="border border-slate-700 p-2 text-center font-black">{index + 1}</td><td className="border border-slate-700 p-2">{evolution ? formatDate(evolution.fecha_sesion || evolution.fecha) : ''}</td><td className="border border-slate-700 p-2"><strong>{evolution?.procedimiento_realizado || evolution?.aplicacion || ''}</strong>{evolution?.observaciones && <p className="mt-2 text-[10px] text-slate-600">{evolution.observaciones}</p>}{evolution && <p className="mt-2 text-[10px] text-slate-500">Dolor: {evolution.dolor_inicial ?? '-'} → {evolution.dolor_final ?? '-'}</p>}</td><td className="border border-slate-700 p-2">{evolution?.inyectables || ''}</td></tr>)}</tbody></table>
        </article>
      </div>
    </div>
  </Modal>;
}
