// Utilitários de formatação compartilhados

/**
 * Formata peso no padrão do sistema: separador de milhares por ponto, SEM casas
 * decimais (arredonda) e unidade "kg" em minúsculo.
 * Ex.: 1076.64 → "1.077 kg" · 2000 → "2.000 kg"
 */
export function formatWeight(kg: number | null | undefined): string {
  const n = Number(kg) || 0
  return `${Math.round(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
}

/**
 * Formata percentual com 1 casa decimal e vírgula.
 * Ex.: 53.83 → "53,8%" · 75 → "75,0%"
 */
export function formatPercent(pct: number | null | undefined): string {
  const n = Number(pct) || 0
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}
