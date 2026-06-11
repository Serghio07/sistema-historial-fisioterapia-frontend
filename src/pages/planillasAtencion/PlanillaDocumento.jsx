import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';
import logo from '../../assets/logos/logo.png';

function PlanillaDocumento({ planilla, paciente }) {
  const pacienteActual = planilla?.paciente || paciente;
  const sesiones = [...(planilla?.sesiones || [])].sort((a, b) => Number(a.numero_sesion || 0) - Number(b.numero_sesion || 0));

  return (
    <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-10 py-8 font-sans text-[15px] text-slate-900 shadow-soft print:shadow-none">
      <header className="relative border-b-2 border-slate-800 pb-4">
        <img src={logo} alt="Physio Active" className="absolute left-0 top-0 h-24 w-28 object-contain" />
        <div className="pt-12 text-center">
          <h1 className="text-2xl font-black uppercase tracking-normal">PLANILLA DE ATENCION Y ASISTENCIA</h1>
          <p className="mt-2 text-sm font-bold uppercase text-slate-600">Fisioterapia y Kinesiologia</p>
        </div>
      </header>

      <section className="mt-6 rounded-lg border border-slate-800">
        <h2 className="border-b border-slate-800 bg-slate-100 px-3 py-2 text-sm font-black uppercase">Datos del Paciente</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-base">
          <p><strong>Nombre y apellidos:</strong> {nombrePaciente(pacienteActual)}</p>
          <p><strong>Edad:</strong> {pacienteActual?.edad || 'Sin dato'}</p>
          <p className="col-span-2"><strong>Dx:</strong> {planilla?.diagnostico || 'Sin diagnostico'}</p>
          <p><strong>Fecha inicio:</strong> {formatDate(planilla?.fecha_inicio)}</p>
          <p><strong>Fecha fin:</strong> {formatDate(planilla?.fecha_fin)}</p>
        </div>
      </section>

      <section className="mt-6">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-800 px-3 py-2 text-left">Fecha</th>
              <th className="border border-slate-800 px-3 py-2 text-left">Sesion</th>
              <th className="border border-slate-800 px-3 py-2 text-left">Firma Paciente</th>
              <th className="border border-slate-800 px-3 py-2 text-left">Firma Profesional</th>
            </tr>
          </thead>
          <tbody>
            {sesiones.map((sesion) => (
              <tr key={`${sesion.numero_sesion}-${sesion.fecha}`}>
                <td className="border border-slate-800 px-3 py-4">{formatDate(sesion.fecha)}</td>
                <td className="border border-slate-800 px-3 py-4">{sesion.numero_sesion}</td>
                <td className="border border-slate-800 px-3 py-4">{sesion.firma_paciente || '____________________'}</td>
                <td className="border border-slate-800 px-3 py-4">{sesion.firma_profesional || '____________________'}</td>
              </tr>
            ))}
            {sesiones.length === 0 && (
              <tr>
                <td className="border border-slate-800 px-3 py-6 text-center" colSpan="4">
                  Sin sesiones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {planilla?.observacion && (
        <section className="mt-6 rounded-lg border border-slate-800 p-4">
          <strong>Observacion:</strong>
          <p className="mt-2 whitespace-pre-wrap">{planilla.observacion}</p>
        </section>
      )}
    </article>
  );
}

export default PlanillaDocumento;
