import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2933',
        brand: {
          50: '#ECFDF5',
          100: '#ccfbf1',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#0F766E',
          600: '#0F766E',
          700: '#115E59',
          800: '#115E59',
          900: '#134E4A'
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
