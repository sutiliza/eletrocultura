/**
 * ==============================================================================
 * COMPONENTE: Db_Core.gs
 * TÍTULO: Operações CRUD Base
 * FUNCIONALIDADES:
 *   - Abstração de baixo nível para leitura, inserção, atualização e exclusão de linhas nas planilhas.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Utilizado por todas as classes específicas de banco de dados (Db_*).
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function getRows(sheetName) {
  try {
    const sheet = getConfiguredSheet_(sheetName);
    return sheet.getDataRange().getValues();
  } catch (error) {
    Logger.log("Erro em getRows: " + error.message);
    throw error;
  }
}

function insertRow(sheetName, rowData) {
  try {
    if (!Array.isArray(rowData) || rowData.length === 0) {
      throw new Error('A linha para insercao deve conter ao menos um valor.');
    }
    const sheet = getConfiguredSheet_(sheetName);
    sheet.appendRow(rowData);
    return { success: true };
  } catch (error) {
    Logger.log("Erro em insertRow: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}

function getConfiguredSheet_(sheetName) {
  if (!SPREADSHEETS_ID || SPREADSHEETS_ID.indexOf('EXEMPLO') !== -1) {
    throw new Error('Configure SPREADSHEETS_ID nas propriedades do script.');
  }
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEETS_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('A aba "' + sheetName + '" nao foi encontrada.');
  }
  return sheet;
}
