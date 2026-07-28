function Input({ label, multiline = false, options, compact = false, className = '', error = '', ...props }) {
  const controlClass = `w-full rounded-lg bg-white px-3 text-sm text-[#334155] shadow-sm transition placeholder:text-[#94A3B8] ${
    error
      ? 'border-red-400 hover:border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
      : 'border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/[0.12]'
  } ${
    compact ? 'min-h-9 py-1.5' : 'py-2'
  }`;
  const accessibilityProps = error ? { 'aria-invalid': true, 'aria-describedby': `${props.id || props.name || 'field'}-error` } : {};

  return (
    <label className={`grid w-full self-start ${compact ? 'gap-0.5 text-xs' : 'gap-1 text-sm'} font-bold text-slate-700 ${className}`}>
      {label && <span>{label}</span>}
      {options ? (
        <select className={controlClass} {...accessibilityProps} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea rows={compact ? 1 : 2} className={`${controlClass} ${compact ? 'min-h-11' : 'min-h-16'} resize-y`} {...accessibilityProps} {...props} />
      ) : (
        <input className={controlClass} {...accessibilityProps} {...props} />
      )}
      {error && <span id={`${props.id || props.name || 'field'}-error`} role="alert" className="text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

export default Input;
