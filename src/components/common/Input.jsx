function Input({ label, multiline = false, options, className = '', ...props }) {
  const controlClass =
    'w-full rounded-lg border-slate-200 bg-white/95 px-3 py-2 text-sm text-ink shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

  return (
    <label className={`grid w-full self-start gap-1 text-sm font-bold text-slate-700 ${className}`}>
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
        <textarea rows={2} className={`${controlClass} min-h-16 resize-y`} {...props} />
      ) : (
        <input className={controlClass} {...props} />
      )}
    </label>
  );
}

export default Input;
