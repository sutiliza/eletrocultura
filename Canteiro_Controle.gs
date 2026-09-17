/**
 * ==============================================================================
 * COMPONENTE: Canteiro_Controle.gs
 * TÍTULO: Lógica do Canteiro Controle
 * FUNCIONALIDADES:
 *   - Filtra e processa os dados do canteiro sem qualquer intervenção eletromagnética.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Canteiro_Controle_View.html.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function getControleData() {
  try {
    return getCanteiros().filter(c => c.tipo === 'Controle');
  } catch (error) {
    Logger.log("Erro em getControleData: " + error.message);
    throw error;
  }
}
