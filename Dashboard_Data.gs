/**
 * ==============================================================================
 * COMPONENTE: Dashboard_Data.gs
 * TÍTULO: API de Dados do Painel
 * FUNCIONALIDADES:
 *   - Agrega e calcula estatísticas comparativas entre os três canteiros para alimentar o dashboard.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Dashboard.html, Stats_Anova.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function getDashboardMetrics() {
  return {
    controle: { biomass: 120, water: 65, ndvi: 0.61 },
    cobre: { biomass: 125, water: 64, ndvi: 0.63 },
    pemf: { biomass: 148, water: 68, ndvi: 0.69 },
    // Os valores abaixo são uma observação agregada por condição. O módulo
    // pode organizar a comparação descritiva, mas não deve tratar um canteiro
    // por condição como replicação independente.
    anova: calculateANOVA([[120], [125], [148]], {
      groupNames: ['Controle', 'Cobre Passivo', 'PEMF Ativo'],
      independentReplicates: [1, 1, 1]
    }),
    metadata: {
      origem: 'dados demonstrativos do painel',
      exigeValidacaoHumana: true,
      analysisType: 'exploratory_descriptive',
      independentReplicationVerified: false,
      biomassLeaderRole: 'descriptive_highest_observed',
      anovaRole: 'exploratory_comparison',
      causalInference: false,
      note: 'Um canteiro por condição não constitui replicação independente; diferenças observadas não demonstram causalidade.'
    }
  };
}
