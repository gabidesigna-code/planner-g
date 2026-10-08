# ora + ori · guia da marca (sistema final G2)

> Marca em uso no aplicativo desde 2026-10-07. **ora** é o app; **ori** é a assistente da ora.
> A identidade anterior ("gabi") está arquivada em `/brand-archive/gabi` e **não** faz parte deste sistema.

---

## 1. Ideia

- **ora**: agora, hora, momento, rotina. Sem relógio, calendário ou check: a marca é só letra.
- **ori**: a assistente. Mesmas letras, mesma geometria; o que muda é o **ponto do "i"**, que carrega a cor.
- **O corte é o parentesco.** Um único gesto, igual nas duas: um entalhe horizontal, à meia altura-x, com a **mesma
  abertura (7 un.)** em todas as peças. Ele corta só **por fora** da parede do anel, então o anel nunca abre e o "o"
  nunca vira "c", mesmo em tamanho pequeno.

## 2. Peças

| Peça | Descrição |
|---|---|
| **Wordmark ora** | "ora" em uma linha, letras largas (elipses), traço 12 no "o" e no "r" e **9,5 no "a"** (de um andar, mais leve e delicado), terminais retos. Entalhe na parede direita do "o". |
| **Wordmark ori** | As mesmas letras "o" e "r" (mesmo entalhe) e o "i" com o ponto em ultramar. |
| **Ícone ora** | O "a" de um andar (anel + haste), traço **12,5**, com o entalhe na parede **esquerda** do bojo (a direita é a haste). |
| **Ícone ori** | O anel inteiro, traço 16, com o entalhe na parede **direita** (como no "o" do wordmark) e o ponto de cor no canto. |

Ícone, favicon, avatar e ícone do app são a mesma peça: o quadrado arredondado (cantos 22%) com o símbolo.

## 3. Cores

| Uso | Claro | Escuro |
|---|---|---|
| Tinta do wordmark / símbolo | `#161A18` | `#E8EEE9` |
| Quadrado do ícone | `#161A18` (símbolo `#F6F5F0`) | `#E8EEE9` (símbolo `#161A18`) |
| **Ponto da ori** (ultramar) | `#2F44FF` | `#9AA6FF` |

- No app, a tinta é a cor do texto do tema (`currentColor`) e a cor da ori é o token **`--ori`** (`hsl(234 100% 59%)` no claro,
  `hsl(233 100% 80%)` no escuro), definido em `src/app/globals.css` e exposto como `text-ori` / `bg-ori` no Tailwind.
  A cor da ori é a **mesma em todas as paletas**: o app tem 6 paletas, e a ori é o único elemento de cor fixa da marca.
- Nos arquivos exportados (`svg/`, `png/`) as cores são fixas, para funcionar fora do app.
- Ícone sobre fundo escuro usa o ponto `#9AA6FF`; sobre fundo claro, `#2F44FF`.

## 4. Construção (para reconstruir sem erro)

Grade com **altura-x = 60** e linha de base em y = 0.

- **Wordmark ora:** `viewBox="-1 -62 186 64"` · elipses de centro-linha rx 27 / ry 24 (externas 33 / 30), traço 12 ·
  haste do "r" a 9 un. do "o"; ombro em quarto de elipse 22 × 20 · "a" de um andar (bojo + haste) a 14 un. do ombro, **com traço 9,5**: as medidas externas do "a" não mudam (elipse externa 33 × 30, borda direita da haste em x = 183), então o bojo fica com centro-linha rx 28,25 / ry 25,25 e a haste em x = 178,25.
- **Wordmark ori:** `viewBox="0 -92 130 94"` · ponto do "i": círculo de raio 8,64 (0,72 × traço), centro a y = -79.
- **Entalhe do "o":** faixa horizontal de 7 un. de altura centrada em y = -30, removendo as 8 un. externas dos 12 da parede direita.
- **Ícones:** `viewBox="0 0 100 100"`, quadrado `rx=22`. Ora: anel de raio externo 30 com **traço 12,5** (centro-linha r=23,75), haste em x=53,75 (borda externa em x=60), entalhe de 7 un. removendo 7 das 12,5 un. da parede esquerda, símbolo a 82%.
  Ori: anel r=22, traço 16, entalhe na parede direita, ponto r=11 em (73, -64), símbolo a 66%.
- Fonte única da verdade: `src/components/brand/logo.tsx` (e as medidas do "a" em `src/components/brand/geometry.ts`). Os SVGs/PNGs da **ora** em `brand/ora/`, `public/brand/` e os ícones do app são reexportados com `npm run export:ora`; a ori não é tocada.
- **Refinamento do "a" (2026-10-08):** o "a" estava pesado ao lado do "o" e do "r". O traço dele caiu de 12 para 9,5 no wordmark (≈ -21%) e de 16 para 12,5 no ícone (≈ -22%), mantendo a mesma proporção, o mesmo tamanho externo e o mesmo entalhe. O "o", o "r" e a ori não mudaram (o anel da ori segue em 16).

## 5. Tamanhos e uso

- **Wordmark:** altura mínima **16 px**. O entalhe aparece de ~22 px para cima; abaixo disso o "o" segue legível (anel fechado) e o gesto some.
- **Ícone / favicon / avatar:** mínimo **16 px** (testado em 16, 24 e 32).
- **Área de proteção:** deixe ao redor do wordmark pelo menos a largura de um traço (12 un. do desenho, ≈ 20% da altura-x).
- **Ora vs. ori:** o wordmark e o ícone da **ora** representam o app; os da **ori** só aparecem onde a assistente aparece (painel "Organizar com ori", menu Adicionar, chat futuro).
- Não usar o ponto de cor em outros elementos do app: ele é a assinatura da ori.

## 6. Arquivos

```
brand/ora/
├── BRAND-GUIDE.md
├── svg/   ora-wordmark-{light,dark}.svg · ori-wordmark-{light,dark}.svg
│          ora-icon.svg · ora-icon-claro.svg · ori-icon.svg · ori-icon-claro.svg   (quadrado escuro / claro)
│          ora-symbol-{light,dark}.svg · ori-symbol-{light,dark}.svg               (símbolo solto)
└── png/   wordmarks 1200 px · símbolos 512 px
           ícones 512 · 64 · 32 · 16 · apple-touch-icon 180 (quadrado sem cantos, o iOS arredonda)
```

**No app:** `src/components/brand/logo.tsx` (componentes) · `src/app/icon.svg` (favicon) · `src/app/apple-icon.png` ·
`public/brand/ora-*.svg`, `ora-avatar.png`, `ori-avatar.png`.
