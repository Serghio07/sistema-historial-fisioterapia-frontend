import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2933',
        brand: {
          50: '#e9f6f3',
          100: '#cfeae4',
          500: '#1f8a70',
          600: '#176f5d',
          700: '#14594e',
          900: '#183b3d'
        },
        coral: '#d85f45',
        gold: '#b7791f'
      },
      boxShadow: {
        soft: '0 14px 40px rgba(15, 23, 42, 0.10)'
      }
    }
  },
  plugins: [forms]
};
