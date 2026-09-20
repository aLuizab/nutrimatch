# Identidade visual NutriMatch

Vale para **todos os projetos NutriMatch**: a plataforma, a landing de captação, os vídeos e
qualquer peça nova. Quando este arquivo e o código discordarem, este arquivo está certo.

- **Essência:** ponte, não plataforma fria. Gente que entende gente.
- **Promessa:** seu nutricionista ideal em 3 minutos. Sem cadastro, sem app.
- **Assinatura:** Deu match? Conectou.

## Onde cada coisa mora

| Arquivo | Papel |
| --- | --- |
| `app/tema.css` | **Fonte de verdade da cor.** Todos os tokens, nos dois temas. Nenhum outro lugar declara hexadecimal. |
| `tailwind.config.js` | Só a ponte: aponta cada classe do Tailwind para um token. Sem hexadecimal. |
| `app/components/Logo.tsx` | O símbolo Elo e o wordmark. |
| `app/components/SeletorDeTema.tsx` | A escolha claro / escuro / sistema, e o script anti-piscada. |

A landing (`nutrimatch-captacao`) carrega cópias de `tema.css`, `tailwind.config.js` e
`Logo.tsx`. São cópias e não um pacote porque os dois projetos sobem separados e um pacote
compartilhado custaria mais do que resolve — mas **mudança em um exige mudança no outro**.

## Claro e escuro

A plataforma tem os dois, com a opção no cabeçalho e no rodapé de cada barra lateral. O padrão
é seguir o sistema operacional: quem nunca escolheu nada não quer escolher, quer que o aparelho
decida. `data-theme="light" | "dark"` no `<html>`; ausente significa "o sistema manda".

A landing e os vídeos são **peças de marca** e ficam sempre escuros, conforme a identidade.
Uma página de vendas não tem sessão nem preferência guardada para respeitar.

### Como o tema funciona sem uma única classe `dark:`

As rampas de cor **invertem** entre os temas. No claro, `gray-50` é o fundo mais claro e
`gray-900` o texto. No escuro, `gray-50` vira `#141a17` e `gray-900` vira `#e9ede9`. Assim
`bg-gray-50` continua querendo dizer "fundo da página" e `text-gray-900` continua querendo
dizer "texto principal" nos dois temas, e os ~2.300 usos de cor nos 97 componentes acompanham
sem serem tocados.

Os tokens são canais `R G B` separados por espaço, não hexadecimal. É o que permite ao Tailwind
escrever `rgb(var(--tok) / 0.1)` e manter `bg-white/10` funcionando.

### Três armadilhas

**`bg-white` não existe mais** — use `bg-surface`. Um cartão precisa acompanhar o tema, e
branco fixo não acompanha. Se precisar de branco de verdade (véu sobre fundo colorido), use
`glass`.

**`text-white` não é branco** — aponta para `--c-on-accent`, que é branco no claro e
`#0d1f17` no escuro. A razão: `text-white` quase sempre está sobre preenchimento de acento, e
no tema escuro esse preenchimento é verde claro — branco ali dá 2,8:1 e some.

**Sombra não pode usar a rampa.** `shadow-gray-900/5` parece certo e inverte junto com tudo:
no tema escuro o degrau 900 é quase branco, e a sombra vira um **halo luminoso** em volta do
elemento. Sombra usa `shadow-black/N`, que não é redefinido e portanto não inverte. Sobre
fundo escuro ela quase não aparece, o que é o comportamento correto — profundidade ali vem da
borda, não da sombra.

A regra geral por trás das três: **um token que inverte só serve onde a inversão é desejada.**
Fundo, texto e borda invertem de propósito. Sombra, véu e "texto sobre acento" não.

## Cor

Escuro como base, verde como sinal. O verde aparece em linhas, marcas curtas e brilhos — nunca
preenchendo grandes áreas, com uma exceção: o campo profundo (`#143d2c`), para faixas e capas.

### Escala do acento (100 → 900)

`#eefaf1` · `#d4f2de` · `#a9e3bf` · `#7fd0a0` · `#57b881` · `#45996a` · `#357a54` · `#27593e` · `#1d3329`

Igual nos dois temas — é a identidade, não o tema. O que muda é qual degrau responde por qual
papel.

### Contraste, que decidiu alguns valores

O acento puro `#57b881` **reprova como texto sobre branco**: 2,4:1. Por isso o tema claro
ancora o degrau 500 em `#357a54` (4,7:1), que a própria identidade já indica como a versão do
verde sobre fundo claro. Conferido em AA da WCAG (4,5:1 para texto normal):

| | claro | escuro |
| --- | --- | --- |
| `emerald-500` | `#357a54` · 4,7:1 | `#57b881` · 6,9:1 |
| `emerald-600` (74 usos de texto) | `#2d6a49` · 5,9:1 | `#7fd0a0` · 10,2:1 |
| `gray-500` (239 usos de texto) | `#5B7668` · 4,9:1 | `#aab5ae` · 7,9:1 |
| `gray-400` (146 usos, texto tênue) | `#86A294` | `#7d8a82` · 4,6:1 |

Os neutros do tema claro vieram do sistema anterior sem alteração: já tinham passado por
conferência e trocá-los por trocar seria reabrir questão resolvida.

### Cor semântica não é cor de marca

Vermelho de erro, âmbar de aviso e azul informativo **não pertencem à paleta**. São um sistema
à parte, com rampa própria em cada tema. Idem a estrela de avaliação (`#FFB800` no claro,
`#FFC94D` no escuro): uma estrela verde deixaria de ser lida como estrela.

## Logotipo

Proposta **Elo**: dois arcos que se atravessam — paciente e nutricionista ocupando o mesmo
espaço. O arco da frente é acento, o de trás é a cor do texto.

Wordmark em **caixa baixa, peso 500, entreletra −3,5%**. `nutri` em texto padrão, `match` em
acento (`#357a54` sobre claro, `#7fd0a0` sobre escuro).

| Regra | Valor |
| --- | --- |
| Área de proteção | margem livre = altura do símbolo, nos quatro lados |
| Tamanho mínimo | 120px em tela · 24mm impresso — abaixo disso, só o símbolo |
| Sobre foto | apenas em área escura e limpa, versão monocromática clara |

**Não:** alterar o peso do wordmark, inclinar, aplicar sombra, trocar a cor de `match`, usar o
símbolo com um arco só. `Logo.tsx` não aceita propriedade de peso de propósito — um componente
que aceita `bold` acaba recebendo `bold`.

## Tipografia

Uma família só: **Inter** (300, 400, 500, 600), servida pelo próprio domínio. Hierarquia vem de
tamanho e espaço, não de peso — **títulos param no 500**.

| Estilo | Tamanho | Peso | Entreletra | Entrelinha |
| --- | --- | --- | --- | --- |
| Display | 56px | 500 | −3% | 1.05 |
| Título | 34px | 500 | −2% | 1.1 |
| Corpo | 17px | 400 | 0 | 1.6 |
| Etiqueta | 12px | 500 | +22%, caixa alta | 1 |

Em peças 1080×1080 a escala sobe: display 80–104px, título 66–74px, corpo 27–30px. Nunca abaixo
de 24px em arte de post.

## Elementos gráficos

- **Fio esmaecido** — separador que desaparece nas pontas:
  `linear-gradient(90deg, transparent, #333d36 48px, #333d36 calc(100% - 48px), transparent)`
- **Marca curta** — traço de acento abrindo blocos: 72×4px, raio 2px (48×3px em interface)
- **Brilho de fundo** — profundidade por gradiente, nunca cor chapada:
  `radial-gradient(120% 130% at 12% 0%, #1d3329 0%, #141a17 62%)`
- **Fotografia** — retratos em fundo escuro, mesclados por `mix-blend-mode: lighten`
- **Raio** — 8px em interface; arte de post é sem raio, corte reto
- **Ícones** — Phosphor, traço regular *(o código usa lucide-react hoje; ver pendências)*

## Interação

Hover tinge com `--nm-accent-600`; pressionado usa `--nm-accent-400`; foco de teclado é
`outline: 2px solid var(--nm-accent)` com `outline-offset: 2px` — já aplicado globalmente em
`globals.css`, para valer inclusive onde ninguém lembrou de estilizar.

**Ação primária é contorno de acento sobre transparente, nunca preenchimento sólido.**

## Voz

Acolhedora e direta.

Falamos assim:
- "A consulta é cobrada pela nutricionista. A conexão com a gente é sem taxa."
- "Não se identificou? Pede outro match."
- "A gente acompanha você até a primeira consulta."

Não falamos assim:
- "Emagreça 10kg em 30 dias."
- "A melhor plataforma do Brasil."
- "Solução end-to-end de health tech."

Regras fixas:
- **Nunca prometer resultado de saúde.** Quem trata é o nutricionista.
- Preço sempre explícito: a NutriMatch não cobra do paciente.
- Sem antes e depois, sem culpa, sem linguagem de dieta restritiva.
- CRN do profissional visível em qualquer peça que o mostre.

## Pendências

O que ainda não foi feito, para não parecer esquecimento:

1. **Os vídeos.** As 16 cenas dos dois projetos HyperFrames usam hexadecimal fixo do sistema
   antigo, sobre fundo claro. Migrar exige inverter o fundo e decidir substituto para o âmbar
   e o vermelho, que não existem na paleta nova — e depois re-renderizar os dois vídeos.
2. **Ações primárias sólidas.** 68 botões usam `bg-emerald-500` preenchido, e a identidade pede
   contorno sobre transparente. Funciona e tem contraste nos dois temas, mas está fora da regra.
3. **Ícones.** A identidade pede Phosphor; o código usa lucide-react em todo lugar.
