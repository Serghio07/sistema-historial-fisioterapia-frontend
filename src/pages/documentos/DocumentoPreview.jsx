import logo from '../../assets/logos/logo.png';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const labelTipo = {
  consentimiento: 'Consentimiento Informado',
  signos_vitales: 'Ficha de Signos Vitales',
  farmacos: 'Administracion de Farmacos'
};

const consentimientoLegalText = [
  'Manifiesto que he leido y entendido la hoja de informacion que se me ha entregado, que he hecho las preguntas que me surgieron sobre el procedimiento de Cirugia Minimo Invasiva y que he recibido informacion suficiente sobre el mismo.',
  'Comprendo que mi participacion es totalmente voluntaria, que puedo retirarme antes del procedimiento, cuando quiera sin tener que dar explicaciones y sin que esto repercuta en mis cuidados medicos.',
  'Presto libremente mi conformidad para participar en el procedimiento medico de Cirugia Minimo Invasiva.',
  'He sido tambien informado/a de que mis datos personales seran protegidos e incluidos en un fichero que debera estar sometido a y con las garantias del Reglamento General de Proteccion de Datos (RGPD), de La Paz Bolivia, que entro en vigor el 25 de mayo de 2018 que supone la derogacion de Ley Organica 15/1999, de 13 de diciembre referidos a la proteccion de las personas fisicas en lo que respecta al tratamiento de datos personales.',
  'Tomando ello en consideracion, OTORGO mi CONSENTIMIENTO para cubrir los objetivos especificados por el personal de salud.'
];

const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const longDate = (fecha, ciudad = 'La Paz') => {
  const [year, month, day] = String(fecha || '').split('-').map(Number);
  if (!year || !month || !day) return `${ciudad}, ${formatDate(fecha)}`;
  return `${ciudad}, ${day} de ${monthNames[month - 1]} de ${year}`;
};

const Cell = ({ children, className = '', ...props }) => (
  <td className={`border border-slate-700 px-2 py-1.5 align-top ${className}`} {...props}>{children || '-'}</td>
);

const DotLine = ({ children, className = '' }) => (
  <span className={`inline-block min-h-5 border-b border-dotted border-slate-500 px-2 ${className}`}>{children || ''}</span>
);

function ConsentimientoPreview({ documento }) {
  const data = documento.datos || {};
  return (
    <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-10 py-7 text-[13px] leading-6 text-slate-950 shadow-soft print:shadow-none">
      <img src={logo} alt="Physio Active" className="mb-3 h-24 w-36 object-contain" />
      <h1 className="bg-blue-700 px-3 py-1.5 text-center text-sm font-black uppercase tracking-wide text-white">Declaracion de Consentimiento Informado</h1>

      <section className="mt-6 grid gap-2 pl-3">
        <p><span className="mr-3">✓</span><strong>PACIENTE</strong> <span className="border-b border-dotted border-slate-600 px-2">{data.nombre_completo || nombrePaciente(documento.paciente) || ' '}</span> de <span className="border-b border-dotted border-slate-600 px-2">{data.edad || ' '}</span> anos de edad y con</p>
        <p className="pl-8">CI N° <span className="border-b border-dotted border-slate-600 px-2">{data.ci || ' '}</span></p>
        <p><span className="mr-3">✓</span>Tutor o Padre de familia <span className="border-b border-dotted border-slate-600 px-2">{data.tutor_nombre || ' '}</span></p>
        <p><span className="mr-3">✓</span>Diagnostico <span className="border-b border-dotted border-slate-600 px-2">{data.diagnostico || ' '}</span></p>
        <p><span className="mr-3">✓</span>Tratamiento <span className="border-b border-dotted border-slate-600 px-2">{data.tratamiento || ' '}</span></p>
      </section>

      <section className="mt-5 space-y-4 text-justify">
        {consentimientoLegalText.map((paragraph) => (
          <p key={paragraph} className="indent-8">{paragraph}</p>
        ))}
      </section>

      <p className="mt-6 italic">Firma del representante legal <span className="inline-block min-w-60 border-b border-dotted border-slate-700 px-4">{data.firma_representante || ''}</span></p>
      <p className="mt-7 text-center">{longDate(documento.fecha, data.ciudad || 'La Paz')}</p>
    </article>
  );
}

function SignosPreview({ documento }) {
  const data = documento.datos || {};
  const antecedentes = String(data.antecedentes_patologicos || '')
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
  const VitalLine = ({ label, value }) => (
    <span className="inline-flex min-w-0 items-end gap-2">
      <strong>{label}</strong>
      <DotLine className="w-28">{value}</DotLine>
    </span>
  );
  return (
    <article className="relative mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-10 py-8 font-mono text-[13px] leading-6 text-slate-950 shadow-soft print:shadow-none">
      <img src={logo} alt="Physio Active" className="absolute right-8 top-6 h-16 w-24 object-contain" />
      <h1 className="border border-slate-900 px-4 py-4 text-center text-2xl font-black uppercase tracking-wide">Ficha de Signos Vitales</h1>

      <section className="mt-8">
        <h2 className="mb-2 font-black uppercase">Datos</h2>
        <div className="grid gap-1">
          <p><strong>NOMBRE :</strong> <DotLine className="w-[calc(100%-90px)]">{data.nombre_completo || nombrePaciente(documento.paciente)}</DotLine></p>
          <p><strong>EDAD:</strong> <DotLine className="w-72">{data.edad}</DotLine></p>
          <p className="grid grid-cols-[minmax(0,1fr)_210px] gap-6">
            <span><strong>C. I.</strong> <DotLine className="w-72">{data.ci}</DotLine></span>
            <span><strong>N° CELULAR:</strong> <DotLine className="w-28">{data.celular}</DotLine></span>
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-black uppercase">Antecedentes Patologicos</h2>
        <ul className="grid min-h-32 gap-2 pl-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index} className="list-disc">
              <DotLine className="w-[85%]">{antecedentes[index]}</DotLine>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-5 font-black uppercase">Signos Vitales:</h2>
        {[
          ['PRE - PROCEDIMIENTO', data.pre],
          ['DURANTE PROCEDIMIENTO', data.durante],
          ['POST - PROCEDIMIENTO', data.post]
        ].map(([title, values]) => (
          <div key={title} className="mb-8">
            <h3 className="mb-4 font-black uppercase">{title}</h3>
            <div className="grid grid-cols-4 gap-3">
              <VitalLine label="P/A" value={values?.presion_arterial} />
              <VitalLine label="FC" value={values?.frecuencia_cardiaca} />
              <VitalLine label="FR" value={values?.frecuencia_respiratoria} />
              <VitalLine label="SpO2" value={values?.spo2} />
            </div>
          </div>
        ))}
      </section>

      <div className="absolute bottom-8 right-10 text-right text-[11px] text-slate-500">
        <p>{formatDate(documento.fecha)}</p>
        <p>{data.responsable_nombre || documento.creado_por?.nombre || ''}</p>
      </div>
    </article>
  );
}

function FarmacosPreview({ documento }) {
  const data = documento.datos || {};
  const filas = data.filas || [];
  const total = filas.reduce((sum, fila) => sum + Number(fila.monto_bs || 0), 0);
  const rows = Array.from({ length: Math.max(14, filas.length) }, (_, index) => filas[index] || {});
  return (
    <article className="relative mx-auto min-h-[210mm] w-full max-w-[297mm] bg-white px-8 py-7 text-sm text-slate-950 shadow-soft print:shadow-none">
      <img src={logo} alt="Physio Active" className="absolute right-8 top-5 h-16 w-24 object-contain" />
      <h1 className="mb-5 pr-28 text-center text-3xl font-black uppercase tracking-wide text-orange-700">Administracion de Farmacos</h1>
      <table className="w-full table-fixed border-collapse text-center text-xs">
        <thead>
          <tr>
            {['FECHA', 'PACIENTE', 'DICLO', 'DEXA', 'COM B', '3ml', '5ml', '10ml', 'Bs.', 'Qr'].map((item, index) => (
              <th
                key={item}
                className={`border border-orange-500 bg-orange-500 px-2 py-3 font-black uppercase text-white ${index === 1 ? 'w-64' : ''}`}
              >
                {item}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((fila, index) => (
            <tr key={index}>
              <td className="h-9 border border-orange-300 px-2">{fila.fecha ? formatDate(fila.fecha) : ''}</td>
              <td className="border border-orange-300 px-2 text-left">{fila.paciente_nombre || ''}</td>
              <td className="border border-orange-300 bg-amber-50 px-2 font-bold">{fila.diclo ? 'X' : ''}</td>
              <td className="border border-orange-300 bg-amber-50 px-2 font-bold">{fila.dexa ? 'X' : ''}</td>
              <td className="border border-orange-300 bg-amber-50 px-2 font-bold">{fila.com_b ? 'X' : ''}</td>
              <td className="border border-green-400 bg-green-50 px-2 font-bold">{fila.dosis_3ml ? 'X' : ''}</td>
              <td className="border border-green-400 bg-green-50 px-2 font-bold">{fila.dosis_5ml ? 'X' : ''}</td>
              <td className="border border-green-400 bg-green-50 px-2 font-bold">{fila.dosis_10ml ? 'X' : ''}</td>
              <td className="border border-green-400 bg-green-50 px-2">{fila.monto_bs || ''}</td>
              <td className="border border-green-400 bg-green-50 px-2 font-bold">{fila.qr || fila.metodo_pago === 'QR' ? 'X' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex justify-end text-sm font-black text-slate-700">
        <span className="rounded border border-orange-300 px-4 py-2">TOTAL Bs. {total.toFixed(2)}</span>
      </div>
    </article>
  );
}

function DocumentoPreview({ documento }) {
  if (!documento) return null;
  if (documento.tipo === 'consentimiento') return <ConsentimientoPreview documento={documento} />;
  if (documento.tipo === 'signos_vitales') return <SignosPreview documento={documento} />;
  if (documento.tipo === 'farmacos') return <FarmacosPreview documento={documento} />;

  return (
    <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-8 py-7 text-sm leading-5 text-slate-900 shadow-soft print:shadow-none">
      <header className="grid grid-cols-[90px_minmax(0,1fr)_90px] items-center gap-3 border-b border-slate-700 pb-3">
        <img src={logo} alt="Physio Active" className="h-16 w-24 object-contain" />
        <div className="text-center">
          <h1 className="text-base font-black uppercase">Physio Active</h1>
          <p className="text-xs font-bold uppercase text-slate-600">Fisioterapia y Kinesiologia</p>
          <h2 className="mt-2 text-lg font-black uppercase">{labelTipo[documento.tipo]}</h2>
        </div>
        <div className="text-right text-xs">
          <p><strong>Fecha</strong></p>
          <p>{formatDate(documento.fecha)}</p>
          <p className="mt-2">{documento.estado}</p>
        </div>
      </header>
      <section className="mt-5">
        {documento.tipo === 'consentimiento' && <ConsentimientoPreview documento={documento} />}
        {documento.tipo === 'signos_vitales' && <SignosPreview documento={documento} />}
        {documento.tipo === 'farmacos' && <FarmacosPreview documento={documento} />}
      </section>
      <footer className="mt-8 border-t border-slate-300 pt-2 text-xs text-slate-500">
        Generado por {documento.creado_por?.nombre || 'Usuario'} - Documento vinculado al historial del paciente.
      </footer>
    </article>
  );
}

export default DocumentoPreview;
