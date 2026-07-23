function Input({ label, multiline = false, options, compact = false, className = '', ...props }) {
  const controlClass = `w-full rounded-lg border-[#CBD5E1] bg-white px-3 text-sm text-[#334155] shadow-sm transition placeholder:text-[#94A3B8] hover:border-[#94A3B8] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/[0.12] ${
    compact ? 'min-h-9 py-1.5' : 'py-2'
  }`;

  return (
    <label className={`grid w-full self-start ${compact ? 'gap-0.5 text-xs' : 'gap-1 text-sm'} font-bold text-slate-700 ${className}`}>
      {label && <span>{label}</span>}
      {options ? (
        <select className={controlClass} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea rows={compact ? 1 : 2} className={`${controlClass} ${compact ? 'min-h-11' : 'min-h-16'} resize-y`} {...props} />
      ) : (
        <input className={controlClass} {...props} />
      )}
    </label>
  );
}

export default Input;
