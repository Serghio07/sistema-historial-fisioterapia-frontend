const labels = ['Sin dolor', 'Poco dolor', 'Dolor moderado', 'Dolor fuerte', 'Muy fuerte', 'Insoportable'];

function painLabel(value) {
  const number = Number(value || 0);
  if (number === 0) return labels[0];
  if (number <= 2) return labels[1];
  if (number <= 4) return labels[2];
  if (number <= 6) return labels[3];
  if (number <= 8) return labels[4];
  return labels[5];
}

function PainScale({ value, onChange }) {
  const current = value === '' || value == null ? null : Number(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-black text-ink">Escala de dolor</h4>
          <p className="text-sm text-slate-500">Valoracion clinica de 0 a 10.</p>
        </div>
        <strong className="rounded-lg bg-slate-900 px-3 py-2 text-white">{current == null ? 'SIN SELECCIONAR' : `${current}/10 · ${painLabel(current)}`}</strong>
      </div>
      <div className="grid grid-cols-11 overflow-hidden rounded-lg border border-slate-300">
        {Array.from({ length: 11 }, (_, index) => (
          <button
            key={index}
            type="button"
            className={`min-h-14 border-r border-white text-sm font-black text-slate-900 last:border-r-0 ${current === index ? 'ring-4 ring-inset ring-slate-900' : ''}`}
            style={{ background: `linear-gradient(180deg, hsl(${195 - index * 16}, 86%, 56%), hsl(${195 - index * 16}, 78%, 46%))` }}
            onClick={() => onChange(index)}
          >
            {index}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1 text-center text-[11px] font-bold text-slate-500">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export default PainScale;
