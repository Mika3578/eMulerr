import type { Config } from "tailwindcss";
import * as colors from "tailwindcss/colors";
import * as defaultTheme from "tailwindcss/defaultTheme";
import { tailwindcssPaletteGenerator as palette } from '@bobthered/tailwindcss-palette-generator'
import plugin from "tailwindcss/plugin"

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        radarr: palette('#ffc230').primary!,
        sonarr: palette('#35c5f4').primary!,
        primary: palette('#5c6ac4').primary!,
        upload: colors.blue[400],
        download: colors.green[400],
        buffer: colors.purple[300],
        transfer: colors.teal[400],
        ratio: colors.amber[400],
        error: colors.red[500],
        status: {
          downloading: colors.lime[800],
          stalled: '#3f3714',
          completing: colors.purple[900],
          downloaded: colors.sky[950]
        }
      },
      fontFamily: {
        title: ['Impact', ...defaultTheme.fontFamily.sans],
        body: ['Roboto', ...defaultTheme.fontFamily.sans]
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'progress-pulse': 'progress-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'progress-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(74, 222, 128, 0.15)',
        'glow-primary': '0 0 20px rgba(92, 106, 196, 0.2)',
        'inner-lg': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.15)',
      },
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant("hover", [
        "@media (hover: hover) { &:hover }",
        "@media (hover: none) { &:active }",
      ])
    }),
  ],
} satisfies Config;
