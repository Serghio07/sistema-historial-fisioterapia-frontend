const zones = [
  { id: 'Cabeza', label: 'Cabeza', x: 50, y: 11 },
  { id: 'Cervical', label: 'Cervical', x: 50, y: 22 },
  { id: 'Hombro derecho', label: 'Hombro D', x: 29, y: 29 },
  { id: 'Hombro izquierdo', label: 'Hombro I', x: 71, y: 29 },
  { id: 'Dorsal', label: 'Dorsal', x: 50, y: 35 },
  { id: 'Lumbar', label: 'Lumbar', x: 50, y: 47 },
  { id: 'Cadera', label: 'Cadera', x: 50, y: 58 },
  { id: 'Rodilla derecha', label: 'Rodilla D', x: 40, y: 76 },
  { id: 'Rodilla izquierda', label: 'Rodilla I', x: 60, y: 76 },
  { id: 'Tobillo derecho', label: 'Tobillo D', x: 38, y: 93 },
  { id: 'Tobillo izquierdo', label: 'Tobillo I', x: 62, y: 93 }
];

function Figure({ title, selected, onSelect, mirrored = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-center text-xs font-black uppercase text-slate-500">{title}</p>
      <svg viewBox="0 0 100 150" className="mx-auto h-72 w-full max-w-[220px]">
        <rect x="7" y="4" width="86" height="142" rx="6" className="fill-slate-50 stroke-slate-300" />
        <g transform={mirrored ? 'translate(100 0) scale(-1 1)' : undefined} className="fill-none stroke-slate-500 stroke-[2.2]">
          <circle cx="50" cy="19" r="11" />
          <path d="M50 30 C45 41 43 56 44 70 C45 82 55 82 56 70 C57 56 55 41 50 30Z" />
          <path d="M42 39 C32 45 25 55 20 72" />
          <path d="M58 39 C68 45 75 55 80 72" />
          <path d="M20 72 C18 84 22 95 27 104" />
          <path d="M80 72 C82 84 78 95 73 104" />
          <path d="M44 70 C39 89 35 111 34 137" />
          <path d="M56 70 C61 89 65 111 66 137" />
          <path d="M34 137 C39 141 44 141 48 137" />
          <path d="M66 137 C61 141 56 141 52 137" />
        </g>
        {zones.map((zone) => (
          <g key={`${title}-${zone.id}`} className="cursor-pointer" onClick={() => onSelect(zone.id)}>
            <circle
              cx={zone.x}
              cy={zone.y * 1.42}
              r={selected === zone.id ? 6.8 : 5.2}
              className={selected === zone.id ? 'fill-coral stroke-white stroke-[2]' : 'fill-brand-500/75 stroke-white stroke-[2] hover:fill-coral'}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

function BodyMap({ value, onChange }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-black text-ink">Mapa corporal</h4>
          <p className="text-sm text-slate-500">Selecciona la zona principal de dolor o lesion.</p>
        </div>
        <span className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-brand-700 shadow-sm">{value || 'Sin zona seleccionada'}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Figure title="Anterior" selected={value} onSelect={onChange} />
        <Figure title="Posterior" selected={value} onSelect={onChange} mirrored />
      </div>
    </div>
  );
}

export default BodyMap;
