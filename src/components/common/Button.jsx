const variants = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-900/15 hover:bg-brand-700 hover:shadow-md',
  secondary: 'bg-blue-600 text-white shadow-sm shadow-blue-900/15 hover:bg-blue-700 hover:shadow-md',
  ghost: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100'
};

function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
