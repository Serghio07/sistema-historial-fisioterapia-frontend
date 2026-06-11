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
        <h4 className="text-base font-black text-ink">Evaluacion de la marcha</h4>
        <p className="text-sm text-slate-500">Marca las fases alteradas del ciclo de marcha.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {phases.map((phase, index) => (
          <button
            type="button"
            key={phase}
            onClick={() => toggle(phase)}
            className={`rounded-lg border p-3 text-left transition ${
              selected.includes(phase) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-200'
            }`}
          >
            <div className="mb-2 flex h-20 items-end justify-center rounded bg-white">
              <svg viewBox="0 0 60 78" className="h-16 w-14">
                <circle cx="30" cy="12" r="7" className="fill-slate-300" />
                <path d="M30 19 L30 39" className="stroke-slate-500 stroke-[3]" />
                <path d="M30 25 L20 37" className="stroke-slate-500 stroke-[3]" />
                <path d="M30 25 L42 36" className="stroke-slate-500 stroke-[3]" />
                <path d={index % 2 === 0 ? 'M30 39 L20 68 M30 39 L43 66' : 'M30 39 L41 68 M30 39 L19 62'} className="stroke-brand-600 stroke-[3]" />
              </svg>
            </div>
            <span className="block text-xs font-black uppercase">{phase}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MarchaAssessment;
