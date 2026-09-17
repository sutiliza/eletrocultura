/**
 * ==============================================================================
 * COMPONENTE: Db_NDVI.gs
 * TÍTULO: Índices NDVI e Cobertura de Dossel
 * FUNCIONALIDADES:
 *   - Registra os valores de NDVI calculados a partir de imagens de câmeras RGB.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - NDVI_Monitor.html, Visual_Analysis.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function logNDVI(canteiroId, ndviValue) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEETS_ID).getSheetByName('NDVI_Logs');
    sheet.appendRow([new Date(), canteiroId, ndviValue]);
  } catch (error) {
    Logger.log("Erro em logNDVI: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}
