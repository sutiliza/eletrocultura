/**
 * ==============================================================================
 * COMPONENTE: ICR_Calc.gs
 * TÍTULO: Calculadora de Ressonância Ciclotrônica
 * FUNCIONALIDADES:
 *   - Calcula as frequências de ressonância com base no campo magnético local da Terra.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - ICR_Calculator.html, Actuators_PEMF.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function getICRFrequency(ion, bField) {
  const q_m_ratios = { 'K+': 2467642.0, 'Ca2+': 4814425.0, 'Mg2+': 7936586.0 };
  const b = bField || 50e-6; // 50 uT
  return (q_m_ratios[ion] * b) / (2 * Math.PI);
}
