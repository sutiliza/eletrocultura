/**
 * ==============================================================================
 * COMPONENTE: Db_XAI.gs
 * TÍTULO: Banco de Explicações do World Model
 * FUNCIONALIDADES:
 *   - Registra os estados latentes 'z' calculados e as narrativas textuais de explicabilidade.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - XAI_Console.html, World_Model_Bridge.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function logXAI(data) {
  try {
    const timestamp = new Date();
    const row = [timestamp, data.canteiroId, JSON.stringify(data.z_t), JSON.stringify(data.z_next), data.explicacao];
    return insertRow(SHEETS.XAI_LOGS, row);
  } catch (error) {
    Logger.log("Erro em logXAI: " + error.message);
    throw error;
  }
}
