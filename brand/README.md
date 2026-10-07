# Marcas do projeto: o que é cada pasta

| Pasta | O que é | Pode mexer? |
|---|---|---|
| `brand/ora/` | **Marca em uso**: ora (app) + ori (assistente), sistema G2. Guia, SVGs e PNGs finais. | Sim, é a marca viva |
| `src/components/brand/logo.tsx` | Os componentes da marca que o app usa (fonte única do desenho). | Sim |
| `brand-archive/gabi/` | **Marca "gabi" arquivada** para uso futuro como marca pessoal de design. Somente leitura. | **Não** |
| `src/app/(exploracoes)/` | Páginas temporárias de estudo que levaram à G2. Nada do app depende delas. | Podem ser removidas |

Regra: o app **não** importa nada de `brand-archive/` nem de `src/app/(exploracoes)/`.
