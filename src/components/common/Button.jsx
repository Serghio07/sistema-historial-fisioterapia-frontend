const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  secondary: 'bg-blue-600 text-white hover:bg-blue-700',
  ghost: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100'
};

function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
