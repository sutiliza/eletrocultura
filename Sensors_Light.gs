/**
 * ==============================================================================
 * COMPONENTE: Sensors_Light.gs
 * TÍTULO: Processamento de Luminosidade
 * FUNCIONALIDADES:
 *   - Registra o fotoperíodo diário acumulado e radiação fotossinteticamente ativa (PAR) estimada.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Db_Leituras.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function calculatePhotoperiod(lightReadings) {
  try {
    return lightReadings.filter(l => l > 200).length * (10 / 60); // horas de sol
  } catch (error) {
    Logger.log("Erro em calculatePhotoperiod: " + error.message);
    throw error;
  }
}
