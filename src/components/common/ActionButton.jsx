const styles = {
  view: 'border-[#14B8A6] bg-[#14B8A6] text-white hover:border-[#0D9488] hover:bg-[#0D9488]',
  edit: 'border-[#A7F3D0] bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]',
  delete: 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]',
  print: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
  download: 'border-cyan-100 bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
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
