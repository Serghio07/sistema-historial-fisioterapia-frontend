const styles = {
  view: 'border-blue-100 bg-blue-600 text-white hover:bg-blue-700',
  edit: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  delete: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
  print: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
  download: 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
};

function ActionButton({ label, icon: Icon, tone = 'view', className = '', ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${styles[tone] || styles.view} ${className}`}
      {...props}
    >
      <Icon size={20} strokeWidth={2.4} />
    </button>
  );
}

export default ActionButton;
