/**
 * ==============================================================================
 * COMPONENTE: Db_Leituras.gs
 * TÍTULO: Histórico de Leituras de Sensores
 * FUNCIONALIDADES:
 *   - CRUD para leituras ambientais tradicionais (temperatura, umidade do ar, umidade do solo, luz).
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Leituras_List.html, Leituras_Chart.html, ESP32-S3 syncing.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function insertLeitura(sensorData) {
  const timestamp = new Date();
  const row = [timestamp, sensorData.canteiroId, sensorData.temp, sensorData.umidAr, sensorData.umidSolo, sensorData.luz];
  return insertRow(SHEETS.LEITURAS, row);
}
