/**
 * Design system do NutriMatch.
 *
 * As escalas `emerald` e `gray` do Tailwind são REDEFINIDAS aqui em vez de trocadas classe por
 * classe nos componentes. São 565 usos de emerald e mais de mil de gray: reescrever tudo seria
 * um diff imenso, com risco alto e nenhum ganho — redefinir o token faz a marca inteira mudar
 * de lugar sem tocar em componente nenhum, e mantém o próximo ajuste de paleta igualmente
 * barato.
 *
 * Os nomes seguem sendo `emerald` e `gray` por isso mesmo. Os aliases semânticos (`brand`,
 * `ink`, `muted`) existem para código novo, onde o nome da cor deve dizer o papel dela.
 */
const verde = {
  50: '#E8F9F0', // greenLight — fundos suaves
  100: '#D1F2E0',
  200: '#A7EAC8', // greenMid — bordas verdes
  300: '#6FDCA6',
  400: '#3FCB86',
  500: '#1DB96B', // green — primária da marca
  600: '#0FA055', // greenDark — hover e pressionado
  700: '#0C8145',
  800: '#0A6437',
  900: '#0B3D2E', // usado no gradiente do topo do perfil
  950: '#062219',
}

/**
 * Neutros com um toque de verde, como o design system pede: o cinza puro do Tailwind ao lado
 * desta marca lê como descuido, não como neutralidade.
 *
 * O 500 é o único valor que se afasta da especificação. O `#6B8A7A` proposto dá 3,79:1 sobre
 * branco e reprova no AA da WCAG para texto normal — e é o tom de todo texto secundário do app,
 * em 228 lugares. O cinza atual do Tailwind passa (4,83:1), então adotá-lo como está seria
 * trocar uma paleta acessível por uma inacessível. Este `#5B7668` preserva o matiz proposto e
 * chega a 4,96:1.
 */
const neutro = {
  50: '#FAFCFB', // bg — fundo geral
  100: '#E2EEE8', // border
  200: '#CFE2D8',
  300: '#AFC6BA',
  400: '#86A294',
  500: '#5B7668', // textMuted, ajustado para passar em AA
  600: '#486053',
  700: '#374B41',
  800: '#22332B',
  900: '#0D1F17', // text — texto principal
  950: '#071410',
}

module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: verde,
        gray: neutro,
        brand: verde,
        ink: neutro[900],
        muted: neutro[500],
        // Estrelas de avaliação. Só o 400 é redefinido: os outros tons de amarelo servem a
        // avisos, e o amarelo do Tailwind ali já funciona.
        yellow: { 400: '#FFB800' },
      },
      fontFamily: {
        // A variável é declarada por next/font em app/layout.tsx, que serve a fonte do próprio
        // domínio — sem chamada ao Google no carregamento da página.
        sans: ['var(--fonte-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        // Títulos grandes pedem entreletra negativa para não parecerem esparramados.
        tightest: '-0.03em',
      },
    },
  },
  plugins: [],
}
