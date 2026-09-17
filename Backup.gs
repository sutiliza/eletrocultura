/**
 * ==============================================================================
 * COMPONENTE: Backup.gs
 * TÍTULO: Backup Automatizado
 * FUNCIONALIDADES:
 *   - Copia os dados da planilha principal para uma planilha de backup semanalmente.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Triggers_Native.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function executeBackup() {
  try {
    const source = SpreadsheetApp.openById(SPREADSHEETS_ID);
    source.makeCopy('Backup_Eletrocultura_' + new Date().toISOString());
  } catch (error) {
    Logger.log("Erro em executeBackup: " + error.message);
    throw error;
  }
}
