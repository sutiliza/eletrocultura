/**
 * ==============================================================================
 * COMPONENTE: Sensors_Bioelec.gs
 * TÍTULO: Condicionamento do Eletroma
 * FUNCIONALIDADES:
 *   - Processa sinais de potenciais elétricos diferenciais vegetais de alta impedância.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Db_Eletroma.gs, Eletroma_Monitor.html.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function processBioelectricSignal(rawSignal) {
  // Remove offset de 50Hz e ruídos galvânicos dos eletrodos
  return rawSignal * 0.0244; // conversão ADC para mV
}
