/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0B0F14',
        darkSurface: '#151C24',
        accent: '#3B82F6',
        danger: '#EF4444',
        success: '#22C55E',
        textMain: '#E5E7EB',
        textMuted: '#94A3B8',
        borderSubtle: '#1E293B',
      },
    },
  },
  plugins: [],
};
