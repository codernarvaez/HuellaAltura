/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agrobamba: {
          forest: {
            DEFAULT: '#1b3b2b',
            dark: '#032517',
            light: '#244c38',
            tint: '#abcfb8',
          },
          coffee: {
            DEFAULT: '#4a2e18',
            light: '#79573e',
            soft: '#ffd1b1',
          },
          amber: {
            DEFAULT: '#d4a359',
            dark: '#4a3000',
            light: '#ffddb1',
            glow: '#c5964d',
          },
          surface: {
            DEFAULT: '#fdfbf7',
            canvas: '#f1fdeb',
            subtle: '#f4efe6',
            container: '#e5f1e0',
            high: '#e0ecda',
          },
          border: '#e6dfd3',
          sand: '#f4efe6',
          charcoal: '#1a1a1a',
          olive: '#4a5548',
          emerald: '#2d6a4f',
          coral: '#e76f51',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm': '0.25rem',
        'DEFAULT': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
      },
      boxShadow: {
        'agrobamba-sm': '0 4px 18px -2px rgba(74, 46, 24, 0.04)',
        'agrobamba-md': '0 10px 30px -4px rgba(27, 59, 43, 0.08)',
        'agrobamba-lg': '0 20px 40px -8px rgba(27, 59, 43, 0.14)',
        'agrobamba-amber': '0 0 0 3px rgba(212, 163, 89, 0.35)',
      }
    },
  },
  plugins: [],
}
