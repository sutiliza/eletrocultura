/**
 * ==============================================================================
 * COMPONENTE: Db_Biomassa.gs
 * TÍTULO: Dados de Biomassa e Produtividade
 * FUNCIONALIDADES:
 *   - CRUD de medições de crescimento (biomassa fresca, biomassa seca, área foliar).
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Biomassa_Log.html, Biomassa_Chart.html, Report_Generator.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function logBiomassa(data) {
  const timestamp = new Date();
  const row = [timestamp, data.canteiroId, data.biomassaFresca, data.biomassaSeca, data.areaFoliar];
  return insertRow(SHEETS.BIOMASSA, row);
}
