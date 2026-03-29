/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#1a1a2e',
        surface: '#16213e',
        border: '#2a2a4a',
        primary: '#4ecdc4',
        danger: '#E63946',
        muted: '#666',
      },
    },
  },
  plugins: [],
};
