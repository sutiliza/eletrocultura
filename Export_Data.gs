/**
 * ==============================================================================
 * COMPONENTE: Export_Data.gs
 * TÍTULO: Exportador de Dados de Pesquisa
 * FUNCIONALIDADES:
 *   - Gera arquivos CSV/JSON para análise externa em Python ou R.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Export_Panel.html.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function exportToCSV(sheetName) {
  try {
    const data = getRows(sheetName);
    return data.map(row => row.map(csvEscapeValue_).join(',')).join('\r\n');
  } catch (error) {
    Logger.log("Erro em exportToCSV: " + error.message);
    throw error;
  }
}

function csvEscapeValue_(value) {
  try {
    const text = Object.prototype.toString.call(value) === '[object Date]'
      ? Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss")
      : String(value == null ? '' : value);
    return /[",\r\n]/.test(text)
      ? '"' + text.replace(/"/g, '""') + '"'
      : text;
  } catch (error) {
    Logger.log("Erro em csvEscapeValue_: " + error.message);
    throw error;
  }
}
