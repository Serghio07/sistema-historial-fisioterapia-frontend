import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

function SearchableSelect({ options, value, onChange, className, disabled, placeholder, ...props }) {
  const hasValue = value !== '' && value !== null && value !== undefined;
  const selected = hasValue ? options.find((option) => String(option.value) === String(value)) : null;
  const [query, setQuery] = useState(selected?.label || '');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);

  useEffect(() => {
    clearTimeout(blurTimer.current);
    setQuery(selected?.label || '');
  }, [selected?.label]);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const filtered = options.filter((option, index) => {
    if (index === 0 && !option.value) return !query.trim();
    return String(option.label).toLocaleLowerCase('es-BO').includes(query.trim().toLocaleLowerCase('es-BO'));
  });
  const choose = (option) => {
    clearTimeout(blurTimer.current);
    setQuery(option.value === '' ? '' : option.label);
    setOpen(false);
    onChange?.({ target: { value: option.value, name: props.name } });
  };

  return <div className="relative">
    <input
      {...props}
      className={className}
      disabled={disabled}
      autoComplete="off"
      placeholder={placeholder || options[0]?.label || 'Escriba para buscar'}
      value={query}
      onFocus={() => { if (!hasValue) setQuery(''); setOpen(true); }}
      onBlur={() => { blurTimer.current = setTimeout(() => { setOpen(false); setQuery(selected?.label || ''); }, 120); }}
      onChange={(event) => {
        setQuery(event.target.value);
        setOpen(true);
        if (hasValue) onChange?.({ target: { value: '', name: props.name } });
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && open && filtered.length) { event.preventDefault(); choose(filtered[0]); }
        if (event.key === 'Escape') setOpen(false);
      }}
      role="combobox"
      aria-expanded={open}
      aria-autocomplete="list"
    />
    {open && !disabled && <div role="listbox" className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
      {filtered.length ? filtered.map((option) => <button key={option.value} type="button" role="option" aria-selected={String(option.value) === String(value)} onPointerDown={(event) => { event.preventDefault(); clearTimeout(blurTimer.current); }} onClick={() => choose(option)} className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium ${String(option.value) === String(value) ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50'}`}>{option.label}</button>) : <p className="px-3 py-3 text-sm font-medium text-slate-500">No se encontraron resultados.</p>}
    </div>}
  </div>;
}

function Input({ label, multiline = false, options, searchable, compact = false, className = '', error = '', ...props }) {
  const { isAdmin } = useAuth();
  const normalizedLabel = String(label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isFinancialField = /monto|saldo|pago|costo|precio|recibo|comprobante|^metodo$/.test(normalizedLabel);
  const isNameSelector = searchable ?? /paciente|profesional|doctor|responsable|personal/.test(normalizedLabel);
  if (!isAdmin && isFinancialField) return null;

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
      {options && isNameSelector ? (
        <SearchableSelect options={options} className={controlClass} {...accessibilityProps} {...props} />
      ) : options ? (
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
