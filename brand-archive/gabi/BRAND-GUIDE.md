# gabi — guia da marca

> **Marca arquivada em 2026-10-07.** Esta é a identidade "gabi" exatamente como ela estava no aplicativo de agenda,
> preservada para uso futuro como **marca pessoal / profissional de designer**.
> O aplicativo passa a ter outra identidade; **esta pasta não deve ser alterada** (ver `LEIA-ME-PRIMEIRO.md`).
> Nada aqui foi redesenhado: os arquivos são cópias fiéis ou exportações diretas dos vetores originais.

---

## 1. Conceito

- **Nome:** gabi, sempre em minúsculas.
- **Símbolo:** o pingo do "i" é substituído por uma estrela de quatro pontas **✦** (pontas curvas, estilo "sparkle").
  É o único elemento de cor da marca: o texto fica em tinta neutra e a estrela em rosa/vinho.
- **Tom:** minimalista, editorial, calmo; geométrico e arredondado, com um toque alternativo (a estrela).
- **Letras:** wordmark em linha única "gabi" com letras largas e geométricas (o "g" tem rabo aberto, em "S" achatado),
  desenhado em curvas (não depende de fonte instalada).

## 2. Logotipos

Todos os vetores usam o mesmo desenho; mudam só as cores. Em `logo/svg/` (vetor, preferido) e `logo/png/` (raster).

| Arquivo | Uso |
|---|---|
| `logo/svg/gabi-wordmark-fundo-claro.svg` | Wordmark principal para fundos **claros** (tinta `#161A18`, estrela `#7A3347`) |
| `logo/svg/gabi-wordmark-fundo-escuro.svg` | Wordmark para fundos **escuros** (tinta `#E9EDE8`, estrela `#D9A0B6`) |
| `logo/svg/gabi-wordmark-currentcolor.svg` | Wordmark cuja tinta segue a cor do texto (`currentColor`); estrela fixa `#7A3347` |
| `logo/svg/gabi-compacta-fundo-claro.svg` | Versão **compacta** empilhada "ga / bi", fundos claros |
| `logo/svg/gabi-compacta-fundo-escuro.svg` | Versão compacta, fundos escuros |
| `logo/svg/gabi-favicon-icon.svg` | **Favicon / ícone do app** (compacta sobre quadrado arredondado verde) |
| `logo/svg/gabi-app-icon-512.svg` | O mesmo ícone, com tamanho 512 declarado |
| `logo/png/gabi-wordmark-*-1200.png` | Wordmark em PNG de 1200 px (transparente, sobre branco, sobre escuro) |
| `logo/png/gabi-compacta-*-800.png` | Compacta em PNG de 800 px (transparente) |
| `logo/png/gabi-favicon-icon-512.png`, `gabi-favicon-32.png`, `gabi-favicon-16.png` | Ícone/favicon rasterizado |
| `logo/png/gabi-apple-touch-icon-180.png` | Ícone do iPhone ("adicionar à tela inicial") — arquivo original do app |
| `logo/png/gabi-avatar-512.png` | Avatar quadrado — arquivo original do app |

**Origem dos arquivos:** os wordmarks "fundo claro/escuro", o favicon, o ícone 512, o apple-touch e o avatar são **cópias
byte a byte** dos arquivos que já existiam no projeto (`public/brand/`, `src/app/icon.svg`, `src/app/apple-icon.png`).
A versão compacta e o `currentcolor` foram montados com os **mesmos caminhos vetoriais** do componente original
(`source/logo.tsx.txt`); os PNGs são exportações desses SVGs.

### Geometria (para reconstruir ou aplicar sem erro)

- **Wordmark:** `viewBox="2.6 -79.7 236.7 101.1"` (proporção ≈ 2,34 : 1). A linha de base das letras está em y = 0;
  a altura-x é 50,8 un.; a estrela ocupa de y ≈ −78,7 a −52,6 (≈ 26 un. de diâmetro) e fica **acima do "i"**, centrada em x ≈ 225,25.
- **Compacta:** `viewBox="1.6 -52.8 125.6 153.1"` (proporção ≈ 0,82 : 1). "ga" na linha de cima, "bi" embaixo,
  com a mesma estrela entre as duas linhas, à direita do "b".
- **Ícone:** `viewBox="0 0 100 100"`; quadrado com cantos `rx=22` (22% do lado); a versão compacta entra com
  `transform="translate(23.92 40.38) scale(0.405)"` (ocupa ≈ 51% da largura; centrada).

## 3. Cores

### Cores fixas da marca (logotipos e ícone)

| Função | HEX |
|---|---|
| Tinta do wordmark em fundo claro | `#161A18` |
| Estrela em fundo claro (vinho) | `#7A3347` |
| Tinta do wordmark em fundo escuro | `#E9EDE8` |
| Estrela em fundo escuro (rosa) | `#D9A0B6` |
| Fundo do ícone/favicon (verde-musgo) | `#21362B` |
| Tinta no ícone | `#F2F4F0` |
| Estrela no ícone | `#D9A0B6` |

> Dentro do app a estrela usava o token `personal` da paleta (classe `fill-personal`), então a cor variava um pouco com a
> paleta e o tema (ex.: `#7A4058` no claro e `#D69FB6` no escuro, na paleta padrão).
> Para uso fora do app, use as cores fixas da tabela acima.

### Paleta padrão do app: Oliva + Vinho

_Sofisticada, alternativa, natural_ · id `oliva-vinho`. Valores HSL originais em `colors/palettes.json`.

**Modo claro**

| Token | Função | HEX |
|---|---|---|
| `background` | Fundo da página | `#F6F7F5` |
| `surface` | Superfícies (cards, painéis) | `#FFFFFF` |
| `sidebar` | Fundo da sidebar | `#E3E7E2` |
| `foreground` | Texto principal | `#161A18` |
| `mutedForeground` | Texto secundário | `#545F5A` |
| `border` | Bordas e divisores | `#D5DBD6` |
| `primary` | Botão principal e item ativo | `#21362B` |
| `primaryForeground` | Texto sobre o botão principal | `#FFFFFF` |
| `work` | Contexto Trabalho | `#4F6652` |
| `workSoft` | Trabalho (fundo suave) | `#E8EEE8` |
| `personal` | Contexto Pessoal (cor da estrela ✦ no app) | `#7A4058` |
| `personalSoft` | Pessoal (fundo suave) | `#F2E8ED` |
| `cool` | Apoio (horas da timeline) | `#707F89` |
| `waiting` | Aviso / aguardando | `#825D30` |
| `urgent` | Urgente / perigo | `#9F4832` |
| `done` | Concluído | `#436046` |

**Modo escuro**

| Token | Função | HEX |
|---|---|---|
| `background` | Fundo da página | `#0F1311` |
| `surface` | Superfícies (cards, painéis) | `#161B18` |
| `sidebar` | Fundo da sidebar | `#0B0E0D` |
| `foreground` | Texto principal | `#E9EDE8` |
| `mutedForeground` | Texto secundário | `#98A49C` |
| `border` | Bordas e divisores | `#2D3430` |
| `primary` | Botão principal e item ativo | `#C0D8C8` |
| `primaryForeground` | Texto sobre o botão principal | `#101814` |
| `work` | Contexto Trabalho | `#8BBB92` |
| `workSoft` | Trabalho (fundo suave) | `#1F2920` |
| `personal` | Contexto Pessoal (cor da estrela ✦ no app) | `#D69FB6` |
| `personalSoft` | Pessoal (fundo suave) | `#2F2228` |
| `cool` | Apoio (horas da timeline) | `#95ACBB` |
| `waiting` | Aviso / aguardando | `#CFA86E` |
| `urgent` | Urgente / perigo | `#DC816A` |
| `done` | Concluído | `#85B78A` |

### Todas as paletas

O app tinha **6 paletas**, cada uma com versão clara e escura: Oliva + Vinho · Vinho + Azul · Preto + Creme · Verde + Lilás escuro · Petróleo + Terracota · Monochrome.
HEX completos em `colors/PALETTES.md`, dados em `colors/palettes.json` e visão geral em `colors/paletas-swatches.png`.
Screenshots de cada paleta em `screenshots/paletas/`.

## 4. Tipografia

| Papel | Fonte | Observação |
|---|---|---|
| Wordmark "gabi" | **Syne**, **convertida em curvas** | Não depende da fonte; o desenho está nos SVGs. O código registra apenas "Syne, desenhado em curvas" (o peso exato não foi anotado). Syne é gratuita (OFL). |
| Interface e títulos | **Geist** (Google Fonts, variável) | Carregada com `next/font/google` como `--font-sans`. Fallback: `system-ui, sans-serif`. |
| Horários, rótulos, atalhos | **Geist Mono** (Google Fonts) | `--font-mono`. Rótulos em **CAIXA ALTA**, `letter-spacing: 0.18em`, peso 500. |

Escala usada na interface (referência; tamanhos em rem, base 16 px, que cresce no desktop):

- **Data grande do dia:** Geist, peso 700, ≈ 84 px (mobile) a 152 px (desktop largo), `line-height: 0.82`, `letter-spacing: -0.065em`.
- **Títulos de tela:** ≈ 30 px, peso 600, `letter-spacing: -0.04em`.
- **Texto de interface:** 14 a 17 px; metadados 12 a 14 px; rótulos mono 11 a 12 px.
- **Títulos de tarefa/evento:** 15 a 16 px, peso 500 a 600.

As fontes são gratuitas (OFL): https://fonts.google.com/specimen/Geist · https://fonts.google.com/specimen/Geist+Mono · https://fonts.google.com/specimen/Syne

## 5. Espaçamento e forma

**Área de proteção do logotipo (regra recomendada, derivada da construção):** deixe ao redor do wordmark pelo menos a
largura da estrela (≈ 26 un. do viewBox, ou ≈ 11% da largura do wordmark). Os SVGs vêm "justos" (sem margem embutida),
então a margem deve ser aplicada pelo layout.

**Tamanho mínimo (o que o app usava):** wordmark a partir de **22–24 px de altura**; versão compacta a partir de **34 px**
de altura; ícone a partir de **16 px** (favicon).

**Regras de espaçamento e forma do sistema (como estavam no app):**

- Grade de **4 px** (escala padrão do Tailwind). Componentes respiram com 8, 12, 16, 24 e 32 px.
- **Raios:** 8 px (botões, itens), 10–12 px (cards de evento, painéis), pílula total (filtros), **22%** no ícone do app.
- **Sombras:** suaves e de baixa opacidade (`soft`, `btn`, `pop`), sempre tingidas com a cor `shadow` da paleta.
- **Layout desktop:** sidebar de 248 a 288 px; conteúdo central com largura máxima de 1040 a 1400 px, margens laterais de 32 a 48 px.
- **Layout mobile:** margens de 16 px; menu em gaveta; botão flutuante de adicionar no canto inferior direito.
- **Bordas:** 1 px, cor `border` da paleta; linhas da timeline com 45% de opacidade.
- **Movimento:** transições de 150–280 ms, curva `cubic-bezier(.2,.8,.2,1)`.

## 6. Versões clara e escura

- **Claro:** `gabi-wordmark-fundo-claro.svg` / `gabi-compacta-fundo-claro.svg` (tinta escura + estrela vinho).
- **Escuro:** `gabi-wordmark-fundo-escuro.svg` / `gabi-compacta-fundo-escuro.svg` (tinta clara + estrela rosa).
- **Ícone:** uma única versão (fundo verde-musgo com tinta clara e estrela rosa), usada tanto no favicon quanto no iPhone.

## 7. Screenshots

Em `screenshots/` (agenda com dados de exemplo; nada foi gravado em banco):

- `app-desktop-claro.png` · `app-desktop-escuro.png` · `app-desktop-1920-claro.png` · `app-desktop-pagina-inteira-claro.png`
- `app-mobile-claro.png` · `app-mobile-escuro.png`
- `paletas/` — a mesma tela em cada uma das outras 5 paletas, claro e escuro.

> A bolinha preta com "N" no canto inferior esquerdo das capturas é o indicador de desenvolvimento do Next.js; não faz parte da marca.

## 8. Código-fonte de referência

Em `source/` (extensão `.txt` de propósito, para não entrar na compilação do projeto): o componente do logotipo
(`logo.tsx.txt`), as paletas (`palettes.ts.txt`, `theme-css.ts.txt`), a configuração do Tailwind, o CSS global e o layout
(que carrega as fontes). Servem para reconstruir qualquer detalhe tal como estava.

## 9. Inventário

```
brand-archive/gabi/
├── BRAND-GUIDE.md          (este arquivo)
├── LEIA-ME-PRIMEIRO.md     (regra de preservação)
├── logo/svg/               (7 vetores: wordmark claro/escuro/currentcolor, compacta claro/escuro, favicon, ícone 512)
├── logo/png/               (PNGs do wordmark, da compacta, do favicon 16/32/512, apple-touch 180, avatar 512)
├── colors/                 (palettes.json, PALETTES.md, paletas-swatches.png)
├── screenshots/            (app desktop/mobile, claro/escuro, e as outras paletas)
└── source/                 (código de referência .txt)
```
