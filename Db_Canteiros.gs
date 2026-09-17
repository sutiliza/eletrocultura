/**
 * ==============================================================================
 * COMPONENTE: Db_Canteiros.gs
 * TÍTULO: Gerenciamento de Canteiros
 * FUNCIONALIDADES:
 *   - CRUD específico para a tabela de canteiros (Controle, Cobre Passivo, PEMF Ativo).
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Dashboard.html, Canteiros_List.html, Canteiros_Form.html.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function getCanteiros() {
  try {
    const data = getRows(SHEETS.CANTEIROS);
    if (!data || data.length === 0 || data[0].every(cell => cell === '')) {
      return [];
    }
    const headers = data[0];
    return data.slice(1).filter(row => row.some(cell => cell !== '')).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
  } catch (error) {
    Logger.log("Erro em getCanteiros: " + error.message);
    throw error;
  }
}
