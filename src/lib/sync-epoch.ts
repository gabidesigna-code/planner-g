/**
 * Relógio de mudanças locais. Toda edição feita neste aparelho (e o fim de cada gravação) avança o
 * contador. Uma atualização vinda do servidor que COMEÇOU antes de uma mudança local é descartada,
 * para não desfazer, com dados velhos, o que a pessoa acabou de fazer.
 */
let epoch = 0;

export const bumpEpoch = () => {
  epoch += 1;
};
export const currentEpoch = () => epoch;
