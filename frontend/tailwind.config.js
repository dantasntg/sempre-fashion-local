/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FAFAF9',
        surface: '#FFFFFF',
        'surface-subtle': '#F5F3F1',
        ink: '#1C1917',
        'ink-soft': '#57534E',
        'ink-faint': '#A39D97',
        line: '#E7E3DF',
        'line-soft': '#F0ECE8',
        accent: '#6B1F2A',
        'accent-soft': '#F5E9EA',
        'accent-hover': '#591821',
        positive: '#3F6B4A',
        warning: '#9A6B1E',
        critical: '#B3261E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        widest2: '0.2em',
      },
    },
  },
  plugins: [],
};
