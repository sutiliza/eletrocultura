/**
 * ==============================================================================
 * COMPONENTE: Canteiro_PEMFAtivo.gs
 * TÍTULO: Lógica do Canteiro PEMF Ativo
 * FUNCIONALIDADES:
 *   - Controla os parâmetros de frequência e intensidade do canteiro estimulado ativamente.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Canteiro_PEMFAtivo_View.html, Actuators_PEMF.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function getPEMFAtivoData() {
  try {
    return getCanteiros().filter(c => c.tipo === 'PEMF Ativo');
  } catch (error) {
    Logger.log("Erro em getPEMFAtivoData: " + error.message);
    throw error;
  }
}
