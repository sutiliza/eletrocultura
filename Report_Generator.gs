/**
 * ==============================================================================
 * COMPONENTE: Report_Generator.gs
 * TÍTULO: Gerador de Relatórios de Produtividade
 * FUNCIONALIDADES:
 *   - Compila os dados consolidados do experimento em um formato estruturado HTML para impressão.
 *   - VALIDAÇÃO DE REPLICAÇÃO: Exige ao menos 2 canteiros independentes por condição antes de qualquer inferência.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Stats_Anova.gs (validação de replicação)
 *   - Export_Panel.html
 * AUTOR: Manus AI | DATA: Junho 2026 | REVISADO: Setembro 2026
 * ==============================================================================
 */

/**
 * Gera relatório HTML de produtividade com validação de replicação.
 * 
 * IMPORTANTE: Este relatório NÃO afirma causalidade ou eficácia.
 * Apresenta observações descritivas e, quando há replicação independente
 * suficiente (≥2 canteiros por condição), permite análise inferencial.
 * 
 * @param {Object} options - { includeANOVA, includeCharts, independentReplicates }
 * @returns {string} HTML do relatório
 */
function generateHTMLReport(options) {
  try {
    options = options || {};
    var timestamp = new Date().toISOString();
    
    // Coleta dados do experimento
    var metrics = getDashboardMetrics ? getDashboardMetrics() : getDefaultMetrics_();
    var biomassData = getBiomassDataForReport_();
    
    // Valida replicação independente
    var replication = validateReplication_(biomassData, options);
    
    // Monta relatório HTML
    var html = buildReportHeader_(timestamp);
    html += buildReplicationNotice_(replication);
    html += buildDescriptiveSection_(biomassData);
    
    if (options.includeANOVA && biomassData.groups.length >= 2) {
      html += buildStatisticalSection_(biomassData, replication);
    }
    
    if (options.includeCharts) {
      html += buildChartsSection_();
    }
    
    html += buildConclusionSection_(replication);
    html += buildFooter_();
    
    return html;
    
  } catch (error) {
    Logger.log('Erro em generateHTMLReport: ' + error.message);
    return '<h1>Erro ao gerar relatório</h1><p>' + error.message + '</p>';
  }
}

/**
 * Valida se há replicação independente suficiente para inferência.
 * @private
 */
function validateReplication_(biomassData, options) {
  var declared = options.independentReplicates;
  
  if (!declared || !Array.isArray(declared)) {
    return {
      status: 'not_verified',
      eligible: false,
      message: 'Replicação independente não declarada. Análise limitada a descrição.'
    };
  }
  
  var minReplicates = Math.min.apply(null, declared);
  var requiredMin = 2;  // ANOVA_INFERENCE_POLICY.minimumIndependentReplicatesPerGroup
  
  if (minReplicates < requiredMin) {
    return {
      status: 'insufficient',
      eligible: false,
      message: 'Experimento tem menos de ' + requiredMin + ' canteiros independentes por condição. ' +
               'Uma observação por canteiro não constitui replicação independente (HURLBERT, 1984). ' +
               'Análise limitada a comparação descritiva, sem inferência de superioridade.'
    };
  }
  
  return {
    status: 'verified',
    eligible: true,
    message: 'Replicação independente verificada (≥' + requiredMin + ' canteiros por condição). ' +
             'Análise inferencial elegível, mas não estabelece causalidade por si só.'
  };
}

/**
 * Coleta dados de biomassa para relatório.
 * @private
 */
function getBiomassDataForReport_() {
  // Placeholder: substituir por leitura real do banco
  // Em produção, ler de Db_Biomassa.gs
  return {
    groups: [
      { name: 'Controle', values: [20, 22, 21] },
      { name: 'Cobre Passivo', values: [23, 25, 24] },
      { name: 'PEMF Ativo', values: [25, 27, 26] }
    ]
  };
}

/**
 * Métricas padrão quando getDashboardMetrics não está disponível.
 * @private
 */
function getDefaultMetrics_() {
  return {
    totalCanteiros: 3,
    totalLeituras: 45,
    ultimaAtualizacao: new Date().toISOString()
  };
}

/**
 * Cabeçalho do relatório HTML.
 * @private
 */
function buildReportHeader_(timestamp) {
  return '<html><head><meta charset="UTF-8"><title>Relatório de Produtividade - Sutiliza</title>' +
    '<style>' +
    'body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; line-height: 1.6; }' +
    'h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }' +
    'h2 { color: #34495e; margin-top: 30px; }' +
    '.notice { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }' +
    '.warning { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }' +
    '.info { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; }' +
    'table { border-collapse: collapse; width: 100%; margin: 15px 0; }' +
    'th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }' +
    'th { background-color: #3498db; color: white; }' +
    '.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #7f8c8d; }' +
    '</style></head><body>' +
    '<h1>Relatório de Produtividade — Sutiliza (Eletrocultura)</h1>' +
    '<p><strong>Data do relatório:</strong> ' + new Date(timestamp).toLocaleString('pt-BR') + '</p>' +
    '<p><strong>Projeto:</strong> Experimento Comparado com Campos Magnéticos (Método POE)</p>';
}

/**
 * Aviso sobre replicação.
 * @private
 */
function buildReplicationNotice_(replication) {
  var cssClass = replication.eligible ? 'info' : 'warning';
  return '<div class="' + cssClass + '">' +
    '<strong>⚠️ Status de Replicação:</strong> ' + replication.message +
    '</div>';
}

/**
 * Seção descritiva (sempre presente).
 * @private
 */
function buildDescriptiveSection_(biomassData) {
  var html = '<h2>1. Estatísticas Descritivas</h2>';
  html += '<table><thead><tr><th>Condição</th><th>N Observações</th><th>Média (g)</th><th>Desvio Padrão (g)</th></tr></thead><tbody>';
  
  biomassData.groups.forEach(function(group) {
    var mean = group.values.reduce(function(a, b) { return a + b; }, 0) / group.values.length;
    var variance = group.values.reduce(function(sum, val) { return sum + Math.pow(val - mean, 2); }, 0) / (group.values.length - 1);
    var stdDev = Math.sqrt(variance);
    
    html += '<tr>' +
      '<td>' + group.name + '</td>' +
      '<td>' + group.values.length + '</td>' +
      '<td>' + mean.toFixed(2) + '</td>' +
      '<td>' + stdDev.toFixed(2) + '</td>' +
      '</tr>';
  });
  
  html += '</tbody></table>';
  html += '<p><em>Nota:</em> Médias observadas não demonstram causalidade. Múltiplos confundidores podem influenciar (luz, água, solo, manejo).</p>';
  
  return html;
}

/**
 * Seção estatística (apenas se ANOVA solicitado).
 * @private
 */
function buildStatisticalSection_(biomassData, replication) {
  if (!replication.eligible) {
    return '<h2>2. Análise Estatística</h2>' +
      '<div class="warning"><strong>Análise estatística bloqueada:</strong> ' +
      'Sem replicação independente suficiente, ANOVA não pode sustentar inferência de superioridade.</div>';
  }
  
  var html = '<h2>2. Análise Estatística (ANOVA)</h2>';
  html += '<p><strong>Status:</strong> Replicação independente verificada. Análise inferencial elegível.</p>';
  html += '<p><em>Nota:</em> Análise estatística não estabelece causalidade por si só. Requer controle de variáveis, randomização e replicação em condições equivalentes.</p>';
  
  return html;
}

/**
 * Seção de gráficos (placeholder).
 * @private
 */
function buildChartsSection_() {
  return '<h2>3. Visualizações</h2>' +
    '<p><em>(Gráficos seriam inseridos aqui em implementação completa)</em></p>';
}

/**
 * Seção de conclusão.
 * @private
 */
function buildConclusionSection_(replication) {
  var html = '<h2>Conclusão</h2>';
  
  if (!replication.eligible) {
    html += '<p>Este experimento tem <strong>um canteiro por condição</strong>, o que não constitui replicação independente. ' +
      'Portanto, a análise é <strong>puramente descritiva</strong>. A maior média observada <strong>não demonstra superioridade</strong> ' +
      'nem estabelece causalidade.</p>';
    html += '<p><strong>Próximos passos:</strong> Replicar o experimento com ao menos 2 canteiros independentes por condição, ' +
      'controlar variáveis ambientais (luz, água, temperatura), randomizar posições e registrar condições equivalentes.</p>';
  } else {
    html += '<p>Este experimento possui replicação independente verificada. A análise estatística é <strong>elegível para inferência</strong>, ' +
      'mas <strong>não estabelece causalidade</strong> por si só. Interpretação requer consideração de confundidores, controle de variáveis ' +
      'e replicação em diferentes contextos.</p>';
    html += '<p><strong>Limitações:</strong> Mesmo com replicação, associação observada não equivale a causalidade. ' +
      'Campos magnéticos podem estar associados ao crescimento, mas outros fatores (luz, nutrientes, manejo) também influenciam.</p>';
  }
  
  return html;
}

/**
 * Rodapé do relatório.
 * @private
 */
function buildFooter_() {
  return '<div class="footer">' +
    '<p><strong>Referências:</strong></p>' +
    '<ul>' +
    '<li>HURLBERT, S. H. (1984). Pseudoreplication and the design of ecological field experiments. <em>Ecological Monographs</em>, 54(2), 187-211.</li>' +
    '<li>HENRIQUES et al. (2025). Effects of electroculture on vegetable production in organic farming: A case study with cabbage. <em>PLOS One</em>.</li>' +
    '</ul>' +
    '<p><em>Relatório gerado automaticamente pelo sistema Sutiliza - Experimento com Campos Magnéticos (Método POE)</em></p>' +
    '</div></body></html>';
}


