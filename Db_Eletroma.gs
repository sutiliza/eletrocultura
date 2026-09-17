/**
 * ==============================================================================
 * COMPONENTE: Db_Eletroma.gs
 * TÍTULO: Registros do Eletroma Vegetal
 * FUNCIONALIDADES:
 *   - Armazena o potencial bioelétrico diferencial (mV) e a capacitância foliar (pF).
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Eletroma_Monitor.html, Eletroma_PSD.html, Sensors_Bioelec.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function logEletroma(data) {
  const timestamp = new Date();
  const row = [timestamp, data.plantaId, data.potencial, data.capacitancia];
  return insertRow(SHEETS.ELETROMA, row);
}
