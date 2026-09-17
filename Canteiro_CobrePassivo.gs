/**
 * ==============================================================================
 * COMPONENTE: Canteiro_CobrePassivo.gs
 * TÍTULO: Lógica do Canteiro Cobre Passivo
 * FUNCIONALIDADES:
 *   - Processa os dados do canteiro com bobinas de cobre não alimentadas (efeito antena passivo).
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Canteiro_CobrePassivo_View.html.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function getCobrePassivoData() {
  try {
    return getCanteiros().filter(c => c.tipo === 'Cobre Passivo');
  } catch (error) {
    Logger.log("Erro em getCobrePassivoData: " + error.message);
    throw error;
  }
}
