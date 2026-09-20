/**
 * Design system do NutriMatch — a ponte entre os tokens e as classes.
 *
 * Não há hexadecimal aqui. Cada cor aponta para uma variável declarada em `app/tema.css`, que
 * é a fonte de verdade da identidade. Este arquivo só decide qual token responde por qual
 * nome de classe.
 *
 * As escalas `emerald` e `gray` do Tailwind continuam sendo REDEFINIDAS em vez de trocadas
 * componente por componente. São 589 usos de emerald e mais de dois mil de gray: reescrever
 * tudo seria um diff imenso, com risco alto e nenhum ganho. Redefinir o token move a marca
 * inteira de lugar sem tocar em componente nenhum — e é o que faz o tema escuro existir sem
 * uma única classe `dark:` no projeto.
 *
 * `white` merece explicação. Ele NÃO é branco fixo: aponta para `--c-on-accent`, que é branco
 * no tema claro e quase-preto no escuro. A razão é que `text-white` quase sempre está sobre
 * um preenchimento de acento, e no tema escuro esse preenchimento é verde claro — texto
 * branco ali dá 2,8:1 e some. Para as poucas sobreposições que precisam de branco de verdade
 * existe `glass`.
 */

/** Cor a partir de um token em canais R G B, preservando o modificador de opacidade. */
function tok(nome) {
  return ({ opacityValue }) =>
    opacityValue === undefined ? `rgb(var(${nome}))` : `rgb(var(${nome}) / ${opacityValue})`
}

/** Monta uma rampa 50–950 a partir do prefixo do token. */
function rampa(prefixo, degraus) {
  return Object.fromEntries(degraus.map((d) => [d, tok(`--c-${prefixo}-${d}`)]))
}

const COMPLETA = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const SEMANTICA = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

const verde = rampa('accent', COMPLETA)
const neutro = rampa('gray', COMPLETA)

module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],

  // O tema é escolhido por atributo, não por classe: o mesmo `data-theme` serve ao CSS, ao
  // seletor e ao script que evita o piscar. Nenhuma classe `dark:` é necessária — as rampas
  // já invertem —, mas a variante fica disponível para o caso pontual.
  darkMode: ['variant', ':root[data-theme="dark"] &'],

  theme: {
    extend: {
      colors: {
        emerald: verde,
        gray: neutro,
        brand: verde,
        ink: tok('--c-gray-900'),
        muted: tok('--c-gray-500'),

        // Superfícies. `surface` substituiu `bg-white` em todo o projeto: um cartão precisa
        // acompanhar o tema, e branco fixo não acompanha.
        surface: tok('--c-surface'),
        'surface-high': tok('--c-surface-high'),

        // Branco de verdade, que não vira nada. Só para véus sobre fundo colorido.
        glass: 'rgb(255 255 255 / <alpha-value>)',

        white: tok('--c-on-accent'),

        red: rampa('red', SEMANTICA),
        amber: rampa('amber', SEMANTICA),
        blue: rampa('blue', SEMANTICA),

        // Estrelas de avaliação. Só o 400 é redefinido: os outros tons de amarelo servem a
        // avisos, e para esses o âmbar semântico acima já responde.
        yellow: { 400: tok('--c-star') },
      },

      fontFamily: {
        // A variável é declarada por next/font em app/layout.tsx, que serve a fonte do próprio
        // domínio — sem chamada ao Google no carregamento da página.
        sans: ['var(--fonte-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      letterSpacing: {
        // A identidade pede entreletra negativa nos tamanhos grandes: -3% no display, -2% no
        // título. Sem isso, um título de 56px parece esparramado.
        display: '-0.03em',
        titulo: '-0.02em',
        tightest: '-0.03em',
        // Etiquetas em caixa alta pedem o contrário: +22%.
        etiqueta: '0.22em',
      },

      borderRadius: {
        // 8px em interface, conforme a identidade.
        DEFAULT: '8px',
        marca: '8px',
      },

      boxShadow: {
        card: 'var(--nm-shadow-card)',
      },
    },
  },

  plugins: [],
}
