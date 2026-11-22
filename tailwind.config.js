/** Tokens del sistema visual (salida de Stitch, con contraste AA verificado). */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondo cálido tipo piedra/arcilla andina.
        sand: { DEFAULT: '#FAF7F2', 100: '#F4EFE6', 200: '#E9E1D3' },
        // Terracota de la Quebrada: solo etiquetas y acentos, nunca estados.
        // 700 es el tono para texto (5.5:1 sobre blanco).
        terracotta: { 50: '#FBF1EC', 100: '#F6DED3', DEFAULT: '#C25E3E', 700: '#A84E31' },
        // Ocre de los cerros: solo decorativo (no pasa AA como texto).
        ochre: { DEFAULT: '#D97706' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(15 23 42 / 0.05), 0 1px 2px -1px rgb(15 23 42 / 0.05)',
        raised: '0 10px 15px -3px rgb(30 41 59 / 0.08), 0 4px 6px -4px rgb(30 41 59 / 0.04)',
      },
    },
  },
  plugins: [],
}
