const variants = {
  primary: 'border border-[#0F766E] bg-[#0F766E] text-white shadow-sm hover:border-[#115E59] hover:bg-[#115E59] focus:ring-4 focus:ring-[#0F766E]/20',
  secondary: 'border border-[#CBD5E1] bg-white text-[#475569] shadow-sm hover:border-[#94A3B8] hover:bg-[#F8FAFC]',
  ghost: 'border border-[#CBD5E1] bg-white text-[#475569] hover:border-[#94A3B8] hover:bg-[#F8FAFC]',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100'
};

function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
