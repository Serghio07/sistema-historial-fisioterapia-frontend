function Input({ label, multiline = false, options, className = '', ...props }) {
  const controlClass =
    'w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:ring-brand-500';

  return (
    <label className={`grid gap-1.5 text-sm font-semibold text-slate-700 ${className}`}>
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
        <textarea rows={3} className={`${controlClass} min-h-24 resize-y`} {...props} />
      ) : (
        <input className={controlClass} {...props} />
      )}
    </label>
  );
}

export default Input;
