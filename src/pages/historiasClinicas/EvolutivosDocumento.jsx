import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import logo from '../../assets/logos/logo.png';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';
import { boliviaDate } from '../../utils/boliviaDateTime';
import { getHistoriaClinica } from '../../services/historiaClinicaService';

const numeroSesion = (evolution, index) => {
  const value = Number(evolution?.numero_sesion ?? evolution?.numero);
  return Number.isFinite(value) && value > 0 ? value : index + 1;
};

const fechaEvolucion = (evolution) => evolution?.fecha_sesion || evolution?.fecha || '';

const procedimientoEvolucion = (evolution) => {
  const partes = [
    evolution?.medios_fisicos,
    evolution?.tecnicas_manuales,
    evolution?.descripcion_tratamiento
  ].filter(Boolean);
  return partes.length
    ? partes.join(' · ')
    : evolution?.procedimiento_realizado || evolution?.aplicacion || '';
};

const farmacosEvolucion = (evolution) => {
  const farmacos = Array.isArray(evolution?.farmacos) ? evolution.farmacos : [];
  if (farmacos.length) {
    return farmacos.map((farmaco, index) => {
      const nombre = farmaco?.nombre_otro || farmaco?.nombre || farmaco?.tipo || `Fármaco ${index + 1}`;
      const detalle = [
        farmaco?.presentacion_dosis,
        farmaco?.via || farmaco?.tipo_via,
        farmaco?.cantidad ? `Cantidad: ${farmaco.cantidad}` : '',
        farmaco?.motivo_clinico ? `Motivo: ${farmaco.motivo_clinico}` : ''
      ].filter(Boolean);
      return `${nombre}${detalle.length ? ` · ${detalle.join(' · ')}` : ''}`;
    });
  }
  const detalleAnterior = [evolution?.inyectable_nombre, evolution?.inyectable_dosis].filter(Boolean);
  const textoAnterior = detalleAnterior.length ? detalleAnterior.join(' · ') : evolution?.inyectables;
  return textoAnterior ? [textoAnterior] : [];
};

export default function EvolutivosDocumento({ historia, onClose }) {
  if (!historia) return null;
  const [historiaActual, setHistoriaActual] = useState(historia);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    setHistoriaActual(historia);
    setLoading(true);
    setLoadError('');
    getHistoriaClinica(historia.id)
      .then((data) => {
        if (active) setHistoriaActual(data);
      })
      .catch(() => {
        if (active) setLoadError('No se pudo actualizar la información. Se muestran los últimos datos cargados.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [historia.id]);

  const evolutions = (Array.isArray(historiaActual.evolutivo) ? historiaActual.evolutivo : [])
    .filter((evolution) => evolution && evolution.estado !== 'anulado')
    .map((evolution, index) => ({ evolution, originalIndex: index }))
    .sort((a, b) => {
      const numberDifference = numeroSesion(a.evolution, a.originalIndex) - numeroSesion(b.evolution, b.originalIndex);
      if (numberDifference) return numberDifference;
      return String(fechaEvolucion(a.evolution)).localeCompare(String(fechaEvolucion(b.evolution)));
    });
  return <Modal open title="Evoluciones y plan de tratamiento" subtitle={`${nombrePaciente(historiaActual.paciente)} · ${evolutions.length} evoluciones registradas`} onClose={onClose} size="lg">
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs ${loadError ? 'text-amber-700' : 'text-slate-500'}`}>{loadError || (loading ? 'Actualizando datos clínicos…' : 'Datos clínicos actualizados')}</span>
        <Button onClick={() => window.print()} disabled={loading}><Printer size={16} />Imprimir / Guardar PDF</Button>
      </div>
      <div className="max-h-[68vh] overflow-auto bg-slate-100 p-4">
        <article className="mx-auto min-h-[270mm] w-full max-w-[210mm] bg-white p-7 text-slate-900 shadow-sm print:shadow-none">
          <header className="grid grid-cols-[90px_1fr_90px] items-center border-b border-slate-700 pb-4"><img src={logo} alt="Physio Active" className="h-16 w-24 object-contain" /><div className="text-center"><h1 className="text-lg font-black uppercase">Sesiones y plan de tratamiento</h1><p className="mt-1 text-sm font-bold uppercase">{nombrePaciente(historiaActual.paciente)}</p></div><span className="text-right text-xs">{formatDate(boliviaDate())}</span></header>
          <table className="mt-5 w-full table-fixed border-collapse text-xs"><thead><tr className="bg-slate-100"><th className="w-12 border border-slate-700 p-2">N.º</th><th className="w-28 border border-slate-700 p-2">Fecha</th><th className="border border-slate-700 p-2">Aplicación de medios físicos y técnicas manuales</th><th className="w-56 border border-slate-700 p-2">Fármacos administrados</th></tr></thead><tbody>{evolutions.map(({ evolution, originalIndex }) => { const farmacos = farmacosEvolucion(evolution); return <tr key={evolution.id || `${fechaEvolucion(evolution)}-${originalIndex}`} className="h-20 align-top"><td className="border border-slate-700 p-2 text-center font-black">{numeroSesion(evolution, originalIndex)}</td><td className="border border-slate-700 p-2">{fechaEvolucion(evolution) ? formatDate(fechaEvolucion(evolution)) : ''}</td><td className="border border-slate-700 p-2"><strong>{procedimientoEvolucion(evolution) || 'Sin tratamiento registrado'}</strong>{(evolution.evolucion_observada || evolution.observaciones) && <p className="mt-2 text-[10px] text-slate-600">{evolution.evolucion_observada || evolution.observaciones}</p>}<p className="mt-2 text-[10px] text-slate-500">Dolor: {evolution.dolor_inicial ?? '-'} → {evolution.dolor_final ?? '-'}</p></td><td className="border border-slate-700 p-2">{farmacos.length ? <ul className="grid gap-2">{farmacos.map((farmaco, index) => <li key={`${farmaco}-${index}`}>{farmaco}</li>)}</ul> : <span className="text-slate-400">Sin fármacos registrados</span>}</td></tr>; })}</tbody></table>
        </article>
      </div>
    </div>
  </Modal>;
}
