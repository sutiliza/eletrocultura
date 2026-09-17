/**
 * ==============================================================================
 * COMPONENTE: Calibration.gs
 * TÍTULO: Calibração de Sensores
 * FUNCIONALIDADES:
 *   - Ajusta offsets e coeficientes de calibração para garantir precisão física entre os nós.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Calibration_Panel.html, Sensors_Soil.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function updateCalibrationOffset(sensorId, offset) {
  try {
    // Salva novos offsets de calibração nas propriedades do script
    PropertiesService.getScriptProperties().setProperty('OFFSET_' + sensorId, offset);
  } catch (error) {
    Logger.log("Erro em updateCalibrationOffset: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}
