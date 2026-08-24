const zones = [
  { id: 'Cabeza', label: 'Cabeza', x: 50, y: 17 },
  { id: 'Cervical', label: 'Cervical', x: 50, y: 32 },
  { id: 'Hombro derecho', label: 'Hombro D', x: 34, y: 40 },
  { id: 'Hombro izquierdo', label: 'Hombro I', x: 66, y: 40 },
  { id: 'Dorsal', label: 'Dorsal', x: 50, y: 48 },
  { id: 'Lumbar', label: 'Lumbar', x: 50, y: 60 },
  { id: 'Cadera', label: 'Cadera', x: 50, y: 72 },
  { id: 'Rodilla derecha', label: 'Rodilla D', x: 41, y: 107 },
  { id: 'Rodilla izquierda', label: 'Rodilla I', x: 59, y: 107 },
  { id: 'Tobillo derecho', label: 'Tobillo D', x: 36, y: 134 },
  { id: 'Tobillo izquierdo', label: 'Tobillo I', x: 64, y: 134 }
];

const anteriorZones = [
  ...zones,
  { id: 'Pecho derecho', label: 'Pecho D', x: 44, y: 45 },
  { id: 'Pecho izquierdo', label: 'Pecho I', x: 56, y: 45 },
  { id: 'Abdomen', label: 'Abdomen', x: 50, y: 55 },
  { id: 'Brazo derecho anterior', label: 'Brazo anterior D', x: 29, y: 52 },
  { id: 'Brazo izquierdo anterior', label: 'Brazo anterior I', x: 71, y: 52 },
  { id: 'Codo derecho anterior', label: 'Codo anterior D', x: 25, y: 64 },
  { id: 'Codo izquierdo anterior', label: 'Codo anterior I', x: 75, y: 64 },
  { id: 'Antebrazo derecho anterior', label: 'Antebrazo anterior D', x: 22, y: 73 },
  { id: 'Antebrazo izquierdo anterior', label: 'Antebrazo anterior I', x: 78, y: 73 },
  { id: 'Muñeca derecha anterior', label: 'Muñeca anterior D', x: 20, y: 80 },
  { id: 'Muñeca izquierda anterior', label: 'Muñeca anterior I', x: 80, y: 80 },
  { id: 'Mano derecha anterior', label: 'Mano anterior D', x: 19, y: 85 },
  { id: 'Mano izquierda anterior', label: 'Mano anterior I', x: 81, y: 85 },
  { id: 'Muslo derecho anterior', label: 'Muslo anterior D', x: 42, y: 88 },
  { id: 'Muslo izquierdo anterior', label: 'Muslo anterior I', x: 58, y: 88 },
  { id: 'Pie derecho anterior', label: 'Pie anterior D', x: 39, y: 140 },
  { id: 'Pie izquierdo anterior', label: 'Pie anterior I', x: 61, y: 140 }
];

const posteriorZones = [
  ...zones,
  { id: 'Occipital', label: 'Occipital', x: 50, y: 11 },
  { id: 'Brazo derecho posterior', label: 'Brazo posterior D', x: 29, y: 52 },
  { id: 'Brazo izquierdo posterior', label: 'Brazo posterior I', x: 71, y: 52 },
  { id: 'Codo derecho posterior', label: 'Codo posterior D', x: 25, y: 64 },
  { id: 'Codo izquierdo posterior', label: 'Codo posterior I', x: 75, y: 64 },
  { id: 'Antebrazo derecho posterior', label: 'Antebrazo posterior D', x: 22, y: 73 },
  { id: 'Antebrazo izquierdo posterior', label: 'Antebrazo posterior I', x: 78, y: 73 },
  { id: 'Muñeca derecha posterior', label: 'Muñeca posterior D', x: 20, y: 80 },
  { id: 'Muñeca izquierda posterior', label: 'Muñeca posterior I', x: 80, y: 80 },
  { id: 'Mano derecha posterior', label: 'Mano posterior D', x: 19, y: 85 },
  { id: 'Mano izquierda posterior', label: 'Mano posterior I', x: 81, y: 85 },
  { id: 'Muslo derecho posterior', label: 'Muslo posterior D', x: 42, y: 88 },
  { id: 'Muslo izquierdo posterior', label: 'Muslo posterior I', x: 58, y: 88 },
  { id: 'Pantorrilla derecha', label: 'Pantorrilla D', x: 38, y: 119 },
  { id: 'Pantorrilla izquierda', label: 'Pantorrilla I', x: 62, y: 119 },
  { id: 'Talón derecho', label: 'Talón D', x: 36, y: 138 },
  { id: 'Talón izquierdo', label: 'Talón I', x: 64, y: 138 }
];

function Figure({ title, zones: figureZones, selected, onSelect, posterior = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-center text-xs font-black uppercase text-slate-500">{title}</p>
      <svg viewBox="0 0 100 150" className="mx-auto h-72 w-full max-w-[220px]">
        <rect x="7" y="4" width="86" height="142" rx="6" className="fill-slate-50 stroke-slate-300" />
        <g className="fill-white stroke-slate-500 stroke-[0.85]" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="50" cy="17" rx="8" ry="11" />
          <path d="M42 16 C39 15 39 22 43 23 M58 16 C61 15 61 22 57 23" />
          <path d="M46 27 L45 34 M54 27 L55 34" />
          <path d="M45 33 C38 35 32 37 29 42 C26 50 24 58 21 67 L17 82 C16 86 19 88 22 85 L28 70 L33 53" />
          <path d="M55 33 C62 35 68 37 71 42 C74 50 76 58 79 67 L83 82 C84 86 81 88 78 85 L72 70 L67 53" />
          <path d="M45 34 C42 43 41 55 43 68 C44 73 43 77 41 84 L36 108 L35 136" />
          <path d="M55 34 C58 43 59 55 57 68 C56 73 57 77 59 84 L64 108 L65 136" />
          <path d="M43 68 C46 73 48 76 50 78 C52 76 54 73 57 68" />
          <path d="M50 78 L48 105 L46 134 M50 78 L52 105 L54 134" />
          <path d="M35 136 C34 140 37 142 46 141 L47 138 M65 136 C66 140 63 142 54 141 L53 138" />
          {posterior ? <>
            <path d="M46 35 C47 39 48 41 50 43 C52 41 53 39 54 35" />
            <path d="M36 42 C40 39 44 40 47 46 M64 42 C60 39 56 40 53 46" />
            <path d="M50 34 L50 68" />
            <path d="M43 66 C46 63 48 65 50 69 C52 65 54 63 57 66" />
          </> : <>
            <path d="M43 16 Q46 14 48 16 M52 16 Q54 14 57 16 M48 22 Q50 23 52 22" />
            <path d="M38 43 Q44 38 49 44 M62 43 Q56 38 51 44" />
            <path d="M50 43 L50 66 M46 54 Q50 56 54 54 M47 62 Q50 64 53 62" />
          </>}
        </g>
        {figureZones.map((zone) => (
          <g key={`${title}-${zone.id}`} className="cursor-pointer" onClick={() => onSelect(zone.id)}>
            <circle cx={zone.x} cy={zone.y} r="5" className="fill-transparent stroke-transparent" />
            <circle
              cx={zone.x}
              cy={zone.y}
              r={selected.includes(zone.id.toUpperCase()) ? 3 : 2.15}
              className={selected.includes(zone.id.toUpperCase()) ? 'fill-coral stroke-white stroke-[1.2]' : 'fill-white stroke-brand-500 stroke-[1.35] hover:fill-brand-100 hover:stroke-coral'}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

function BodyMap({ value, onChange }) {
  const selected = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  const toggle = (zone) => {
    const normalized = zone.toUpperCase();
    onChange(selected.includes(normalized) ? selected.filter((item) => item !== normalized).join(', ') : [...selected, normalized].join(', '));
  };
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
        <Figure title="Anterior" zones={anteriorZones} selected={selected} onSelect={toggle} />
        <Figure title="Posterior" zones={posteriorZones} selected={selected} onSelect={toggle} posterior />
      </div>
    </div>
  );
}

export default BodyMap;
