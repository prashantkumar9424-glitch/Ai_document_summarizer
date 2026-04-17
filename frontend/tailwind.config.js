/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg: {
          primary: '#0E1117',
          secondary: '#161B22',
          elevated: '#1F2633',
        },
        // Text
        text: {
          primary: '#E6EDF3',
          secondary: '#9BA3AF',
          muted: '#6B7280',
        },
        // Accent (Purple - AI Premium)
        accent: {
          primary: '#8B5CF6',
          hover: '#7C3AED',
          soft: '#312E81',
          bg: 'rgba(139, 92, 246, 0.12)',
        },
        // Status
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#38BDF8',
        // Borders
        border: {
          default: '#2A2F3A',
          subtle: '#1F2937',
        },
        // Chat
        chat: {
          user: '#1F2633',
          ai: '#111827',
          input: '#0B1220',
        }
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.3)',
        'panel': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'elevated': '0 20px 50px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'xl': '24px',
        '2xl': '28px',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
