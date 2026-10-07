# Explorações temporárias de marca

Esta pasta guarda as páginas de estudo que levaram à marca final **ora / ori** (direção G2).
Elas **não fazem parte do produto** e podem ser removidas por inteiro quando você quiser.

O nome `(exploracoes)` entre parênteses é um "grupo de rotas" do Next.js: serve só para organizar,
e **não muda os endereços** (continuam `/branding-ora`, `/branding-ora-d`, etc.).

| Página | O que mostra |
|---|---|
| `/branding-ora` | As 3 direções iniciais (A minimal, B editorial tech, C experimental) |
| `/branding-ora-d` | Direção D, a híbrida (descartada por legibilidade) |
| `/branding-ora-d2` | D2-A, D2-B e D2-C (legibilidade primeiro) |
| `/branding-ora-final` | O híbrido D2-A + D2-B |
| `/branding-ora-corte` | G1 e G2: o corte como parentesco (**G2 foi a escolhida**) |

Os componentes que o app realmente usa estão em `src/components/brand/logo.tsx`.
Nada do app importa esta pasta. Para remover: apagar `src/app/(exploracoes)/`.
