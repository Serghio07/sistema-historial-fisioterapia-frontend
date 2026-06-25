function Input({ label, multiline = false, options, compact = false, className = '', ...props }) {
  const controlClass = `w-full rounded-lg border-slate-200 bg-white/95 px-3 text-sm text-ink shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${
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
