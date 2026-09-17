/**
 * ==============================================================================
 * COMPONENTE: Validador_Logico.gs
 * TÍTULO: Validador de Cadeia Lógica
 * FUNCIONALIDADES:
 *   - Verifica se os dados inseridos estão de acordo com o delineamento estatístico e científico planejado.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Dashboard.html, Stats_Anova.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function validateExperimentalLogic() {
  try {
    const canteiros = getCanteiros();
    const hasControle = canteiros.some(c => c.tipo === 'Controle');
    const hasPassivo = canteiros.some(c => c.tipo === 'Cobre Passivo');
    const hasAtivo = canteiros.some(c => c.tipo === 'PEMF Ativo');
    return { valid: hasControle && hasPassivo && hasAtivo, message: 'Delineamento experimental correto.' };
  } catch (error) {
    Logger.log("Erro em validateExperimentalLogic: " + error.message);
    throw error;
  }
}
