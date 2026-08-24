import logo from '../../assets/logos/logo.png';
import { formatDate } from '../../utils/formatDate';
import { nombrePaciente } from '../../utils/validators';

const snapshotDocument = (data) => {
  const number = data.numero_documento || data.ci || '';
  const type = data.tipo_documento || (data.ci ? 'CI' : '');
  const label = type === 'OTRO' ? data.nombre_documento_otro || 'OTRO' : type;
  return [label, number].filter(Boolean).join(' ');
};

const labelTipo = {
  consentimiento: 'Consentimiento Informado',
  signos_vitales: 'Ficha de Signos Vitales',
  farmacos: 'Administracion de Farmacos'
};

const consentimientoLegalText = [
  'Declaro que el profesional me explicó de manera clara el diagnóstico, los objetivos del tratamiento de fisioterapia y kinesiología, los procedimientos propuestos, sus beneficios esperados, posibles molestias o riesgos y las alternativas disponibles.',
  'He tenido la oportunidad de realizar preguntas y considero que recibí información suficiente y comprensible para tomar una decisión libre sobre mi atención.',
  'Comprendo que mi participación es voluntaria y que puedo solicitar aclaraciones, rechazar un procedimiento o retirar este consentimiento antes o durante el tratamiento, sin perder mi derecho a recibir atención.',
  'Autorizo al personal de salud de Physio Active a realizar el tratamiento descrito, respetando el plan indicado, mi seguridad, privacidad y confidencialidad clínica.',
  'Con la información recibida, OTORGO libremente mi CONSENTIMIENTO para la evaluación y el tratamiento de fisioterapia y kinesiología señalados en este documento.'
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

function ConsentField({ label, children, checked = true }) {
  return (
    <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', margin: 0 }}>
      <tbody><tr>
        <td style={{ width: '20px', verticalAlign: 'top', padding: '1px 6px 0 0' }}>{checked ? '✓' : ''}</td>
        <td style={{ width: '180px', verticalAlign: 'top', padding: '0 10px 3px 0', fontWeight: 700 }}>{label}</td>
        <td style={{ verticalAlign: 'top', padding: '0 6px 3px', borderBottom: '1px dotted #475569', lineHeight: 1.55, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{children || ' '}</td>
      </tr></tbody>
    </table>
  );
}

function ConsentimientoPreview({ documento }) {
  const data = documento.datos || {};
  return (
    <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-8 py-6 text-[13px] leading-6 text-slate-950 shadow-soft print:shadow-none">
      <img src={logo} alt="Physio Active" className="mb-3 h-24 w-36 object-contain" />
      <h1 className="bg-blue-700 px-3 py-1.5 text-center text-sm font-black uppercase tracking-wide text-white">Declaración de Consentimiento Informado</h1>

      <section className="mt-6 grid gap-3 pl-3">
        <ConsentField label="PACIENTE">{`${data.nombre_completo || nombrePaciente(documento.paciente) || ' '}, de ${data.edad || ' '} años de edad`}</ConsentField>
        <ConsentField label="DOCUMENTO" checked={false}>{snapshotDocument(data)}</ConsentField>
        <ConsentField label="Responsable legal">{data.tutor_nombre}</ConsentField>
        {data.tutor_parentesco && <ConsentField label="Parentesco">{data.tutor_parentesco}</ConsentField>}
        {data.tutor_numero_documento && <ConsentField label="Documento del responsable">{[data.tutor_tipo_documento, data.tutor_numero_documento].filter(Boolean).join(' ')}</ConsentField>}
        <ConsentField label="Diagnóstico">{data.diagnostico}</ConsentField>
        <ConsentField label="Tratamiento">{data.tratamiento}</ConsentField>
      </section>

      <section className="mt-5 space-y-4 text-justify">
        {consentimientoLegalText.map((paragraph) => (
          <p key={paragraph} className="indent-8">{paragraph}</p>
        ))}
      </section>

      <div data-print-keep className="mt-5">
        <p className="italic">Firma del representante legal <span className="inline-block min-w-60 border-b border-dotted border-slate-700 px-4">{data.firma_representante || ''}</span></p>
        <p className="mt-5 text-center">{longDate(documento.fecha, data.ciudad || 'La Paz')}</p>
      </div>
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
    <article className="relative mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-8 py-6 font-mono text-[13px] leading-6 text-slate-950 shadow-soft print:shadow-none">
      <img src={logo} alt="Physio Active" className="absolute right-8 top-6 h-16 w-24 object-contain" />
      <h1 className="border border-slate-900 px-4 py-4 text-center text-2xl font-black uppercase tracking-wide">Ficha de Signos Vitales</h1>

      <section className="mt-8">
        <h2 className="mb-2 font-black uppercase">Datos</h2>
        <div className="grid gap-1">
          <p><strong>NOMBRE :</strong> <DotLine className="w-[calc(100%-90px)]">{data.nombre_completo || nombrePaciente(documento.paciente)}</DotLine></p>
          <p><strong>EDAD:</strong> <DotLine className="w-72">{data.edad}</DotLine></p>
          <p className="grid grid-cols-[minmax(0,1fr)_210px] gap-6">
            <span><strong>DOCUMENTO:</strong> <DotLine className="w-72">{snapshotDocument(data)}</DotLine></span>
            <span><strong>{data.tutor_nombre ? 'TELÉFONO DE CONTACTO:' : 'N° CELULAR:'}</strong> <DotLine className="w-28">{data.celular || 'Sin teléfono de contacto'}</DotLine></span>
          </p>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-3 font-black uppercase">Antecedentes Patologicos</h2>
        <ul className="grid gap-1.5 pl-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index} className="list-disc">
              <DotLine className="w-[85%]">{antecedentes[index]}</DotLine>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-4 font-black uppercase">Signos Vitales:</h2>
        {[
          ['PRE - PROCEDIMIENTO', data.pre],
          ['DURANTE PROCEDIMIENTO', data.durante],
          ['POST - PROCEDIMIENTO', data.post]
        ].map(([title, values]) => (
          <div key={title} data-print-keep className="mb-5">
            <h3 className="mb-2.5 font-black uppercase">{title}</h3>
            <div className="grid grid-cols-4 gap-3">
              <VitalLine label="P/A" value={values?.presion_arterial} />
              <VitalLine label="FC" value={values?.frecuencia_cardiaca} />
              <VitalLine label="FR" value={values?.frecuencia_respiratoria} />
              <VitalLine label="SpO2" value={values?.spo2} />
            </div>
          </div>
        ))}
      </section>

      <div data-print-keep className="mt-6 text-right text-[11px] text-slate-500">
        <p>{formatDate(documento.fecha)}</p>
        <p>{data.responsable_nombre || documento.creado_por?.nombre || ''}</p>
      </div>
    </article>
  );
}

function FarmacosPreview({ documento, canViewFinancial = false }) {
  const data = documento.datos || {};
  const filas = data.filas || [];
  const total = filas.reduce((sum, fila) => sum + Number(fila.monto_bs || 0), 0);
  const rows = Array.from({ length: Math.max(14, filas.length) }, (_, index) => filas[index] || {});
  return (
    <article className="relative mx-auto min-h-[210mm] w-full max-w-[297mm] bg-white px-7 py-6 text-sm text-slate-950 shadow-soft print:shadow-none" style={{ page: 'carta-landscape' }}>
      <img src={logo} alt="Physio Active" className="absolute right-8 top-5 h-16 w-24 object-contain" />
      <h1 className="mb-5 pr-28 text-center text-3xl font-black uppercase tracking-wide text-orange-700">Administracion de Farmacos</h1>
      <table className="w-full table-fixed border-collapse text-center text-xs">
        <thead>
          <tr>
            {['FECHA', 'PACIENTE', 'DICLO', 'DEXA', 'COM B', '3ml', '5ml', '10ml', ...(canViewFinancial ? ['Bs.', 'Qr'] : [])].map((item, index) => (
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
              {canViewFinancial && <td className="border border-green-400 bg-green-50 px-2">{fila.monto_bs || ''}</td>}
              {canViewFinancial && <td className="border border-green-400 bg-green-50 px-2 font-bold">{fila.qr || fila.metodo_pago === 'QR' ? 'X' : ''}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {canViewFinancial && <div className="mt-4 flex justify-end text-sm font-black text-slate-700">
        <span className="rounded border border-orange-300 px-4 py-2">TOTAL Bs. {total.toFixed(2)}</span>
      </div>}
    </article>
  );
}

function DocumentoPreview({ documento, canViewFinancial = false }) {
  if (!documento) return null;
  if (documento.tipo === 'consentimiento') return <ConsentimientoPreview documento={documento} />;
  if (documento.tipo === 'signos_vitales') return <SignosPreview documento={documento} />;
  if (documento.tipo === 'farmacos') return <FarmacosPreview documento={documento} canViewFinancial={canViewFinancial} />;

  return (
    <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-8 py-6 text-sm leading-5 text-slate-900 shadow-soft print:shadow-none">
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
        {documento.tipo === 'farmacos' && <FarmacosPreview documento={documento} canViewFinancial={canViewFinancial} />}
      </section>
      <footer className="mt-8 border-t border-slate-300 pt-2 text-xs text-slate-500">
        Generado por {documento.creado_por?.nombre || 'Usuario'} - Documento vinculado al historial del paciente.
      </footer>
    </article>
  );
}

export default DocumentoPreview;
