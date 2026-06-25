import cicloMarcha from '../../../assets/images/ciclo-marcha.png';

const phases = [
  'Contacto inicial',
  'Respuesta de carga',
  'Apoyo medio',
  'Apoyo final',
  'Pre-balanceo',
  'Balanceo inicial',
  'Balanceo medio',
  'Balanceo final'
];

function parseSelected(value) {
  return phases.filter((phase) => value?.includes(phase));
}

function MarchaAssessment({ value, onChange }) {
  const selected = parseSelected(value);

  const toggle = (phase) => {
    const next = selected.includes(phase) ? selected.filter((item) => item !== phase) : [...selected, phase];
    onChange(next.length ? `Fases alteradas: ${next.join(', ')}` : '');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h4 className="text-base font-black text-ink">Evaluación de la marcha</h4>
        <p className="text-sm text-slate-500">Marca las fases alteradas del ciclo de marcha.</p>
      </div>
      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
        <img
          src={cicloMarcha}
          alt="Ciclo de marcha con sus fases de apoyo y balanceo"
          className="mx-auto h-auto w-full object-contain"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        {phases.map((phase) => (
          <button
            type="button"
            key={phase}
            onClick={() => toggle(phase)}
            className={`rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
              selected.includes(phase) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-100'
            }`}
          >
            {selected.includes(phase) ? '✓ ' : ''}{phase}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MarchaAssessment;
