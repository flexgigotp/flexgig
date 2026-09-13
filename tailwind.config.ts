import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        secondary: '#5AC8FA',
        danger: '#FF3B30',
        success: '#34C759',
        warning: '#FF9500',
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
}

export default config
