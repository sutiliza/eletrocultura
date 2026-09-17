/**
 * ==============================================================================
 * COMPONENTE: XAI_Narratives.gs
 * TÍTULO: Gerador de Narrativas de Explicabilidade
 * FUNCIONALIDADES:
 *   - Compõe textos explicativos claros a partir dos vetores de transição latente calculados pela IA.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Db_XAI.gs, XAI_Console.html.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

// Templates de narrativas por tipo de transição
var NARRATIVE_TEMPLATES = {
  GROWTH_POSITIVE: {
    title: 'Crescimento Favorável Detectado',
    patterns: [
      'O World Model prevê {vigor_change}% de aumento no vigor vegetativo nas próximas {horizon} horas.',
      'Condições ambientais favoráveis: {key_factors}.',
      'Recomendação: {recommendation}.'
    ]
  },
  
  GROWTH_NEGATIVE: {
    title: 'Estresse Detectado',
    patterns: [
      'O modelo identifica {vigor_change}% de redução no vigor previsto.',
      'Fatores limitantes: {key_factors}.',
      'Ação sugerida: {recommendation}.'
    ]
  },
  
  IRRIGATION_RESPONSE: {
    title: 'Resposta à Irrigação',
    patterns: [
      'Irrigação de {duration}s aplicada com umidade inicial de {initial_moisture}%.',
      'Previsão: recuperação de {vigor_change}% em {horizon} horas.',
      'Efetividade estimada: {effectiveness}.',
      '{recommendation}'
    ]
  },
  
  PEMF_RESPONSE: {
    title: 'Efeito de Estimulação PEMF',
    patterns: [
      'PEMF ativado a {frequency}Hz (ressonância ICR para {target_ion}).',
      'Intensidade: {intensity}%, ciclo de trabalho: {duty}%.',
      'Resposta prevista: {vigor_change}% de variação no vigor.',
      'Confiança: {confidence}%. {recommendation}'
    ]
  },
  
  STRESS_RECOVERY: {
    title: 'Recuperação de Estresse Hídrico',
    patterns: [
      'Planta em recuperação após período de baixa umidade.',
      'Umidade atual: {current_moisture}% (ótimo: 45-70%).',
      'Tempo estimado para recuperação completa: {recovery_time}.',
      '{recommendation}'
    ]
  },
  
  STEADY_STATE: {
    title: 'Estado Estável Mantido',
    patterns: [
      'Condições ambientais estáveis com vigor em {vigor_level}%.',
      'Variação prevista: ±{vigor_change}% (dentro da normalidade).',
      'Protocolo atual: {current_protocol}.',
      '{recommendation}'
    ]
  },
  
  COMPARATIVE_ANALYSIS: {
    title: 'Análise Comparativa entre Condições',
    patterns: [
      'Grupo {group_name}: vigor médio de {mean_vigor}% (±{std_dev}%).',
      'Diferença estatística: {statistical_result}.',
      'Tamanho do efeito: {effect_size} ({interpretation}).',
      '{recommendation}'
    ]
  }
};

function anovaInferenceEligible_(anovaResult) {
  return !!(anovaResult && anovaResult.inferenceEligible === true &&
    anovaResult.independentReplicationVerified === true &&
    anovaResult.replicationStatus === 'verified');
}

function anovaPValue_(anovaResult) {
  return anovaResult && anovaResult.anova && anovaResult.anova.p_value !== undefined
    ? anovaResult.anova.p_value
    : 'indisponível';
}

/**
 * Gera narrativa explicativa a partir de estados latentes.
 * @param {Object} z_t - Estado latente atual
 * @param {Object} z_next - Estado latente futuro previsto
 * @param {Object} options - Opções: { action, metrics, canteiroId, context }
 * @returns {Object} Narrativa estruturada
 */
function generateNarrative(z_t, z_next, options) {
  try {
    options = options || {};
    
    // Detectar tipo de transição
    var transitionType = detectTransitionType_(z_t, z_next, options);
    
    // Calcular métricas de mudança
    var metrics = calculateTransitionMetrics_(z_t, z_next, options);
    
    // Selecionar template apropriado
    var template = selectNarrativeTemplate_(transitionType, metrics);
    
    // Preencher template com dados contextuais
    var narrative = fillNarrativeTemplate_(template, metrics, options);
    
    // Adicionar explicações técnicas se solicitado
    if (options.includeTechnical) {
      narrative.technicalDetails = generateTechnicalExplanation_(z_t, z_next, metrics);
    }
    
    // Gerar visualização de dados
    var visualization = generateVisualizationData_(metrics, options);
    
    return {
      success: true,
      type: transitionType,
      narrative: narrative,
      metrics: metrics,
      visualization: visualization,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em generateNarrative: ' + error.message);
    return {
      success: false,
      error: error.message,
      fallback: 'Análise indisponível no momento.'
    };
  }
}

/**
 * Detecta tipo de transição de estado.
 * @private
 */
function detectTransitionType_(z_t, z_next, options) {
  var action = options.action || {};
  
  // Se há ação explícita
  if (action.type === 'irrigation') {
    return 'IRRIGATION_RESPONSE';
  }
  
  if (action.type === 'pemf') {
    return 'PEMF_RESPONSE';
  }
  
  // Analisar mudança de vigor
  var vigorChange = calculateVigorChange_(z_t, z_next);
  
  if (Math.abs(vigorChange) < 5) {
    return 'STEADY_STATE';
  }
  
  if (vigorChange > 0) {
    // Verificar se é recuperação de estresse
    var currentMoisture = extractMetric_(z_t, 'soilMoisture');
    var previouslyStressed = options.context?.wasStressed || currentMoisture < 35;
    
    if (previouslyStressed && currentMoisture > 40) {
      return 'STRESS_RECOVERY';
    }
    
    return 'GROWTH_POSITIVE';
  }
  
  return 'GROWTH_NEGATIVE';
}

/**
 * Calcula métricas de transição.
 * @private
 */
function calculateTransitionMetrics_(z_t, z_next, options) {
  var vigorChange = calculateVigorChange_(z_t, z_next);
  var currentMoisture = extractMetric_(z_t, 'soilMoisture');
  var nextMoisture = extractMetric_(z_next, 'soilMoisture');
  var currentTemp = extractMetric_(z_t, 'airTemp');
  var leafArea = extractMetric_(z_t, 'leafArea');
  
  // Identificar fatores-chave
  var keyFactors = identifyKeyFactors_(z_t, z_next, options);
  
  // Calcular confiança
  var confidence = options.worldModelPrediction?.confidence || 0.75;
  
  // Calcular efetividade da ação
  var effectiveness = calculateActionEffectiveness_(vigorChange, options.action);
  
  return {
    vigorChange: Math.round(vigorChange * 10) / 10,
    vigorLevel: Math.round(extractMetric_(z_t, 'vigor') * 100),
    currentMoisture: Math.round(currentMoisture * 10) / 10,
    nextMoisture: Math.round(nextMoisture * 10) / 10,
    moistureChange: Math.round((nextMoisture - currentMoisture) * 10) / 10,
    currentTemp: Math.round(currentTemp * 10) / 10,
    leafArea: Math.round(leafArea * 10) / 10,
    keyFactors: keyFactors,
    confidence: Math.round(confidence * 100),
    effectiveness: effectiveness,
    horizon: options.horizon || 24
  };
}

/**
 * Calcula mudança de vigor entre estados.
 * @private
 */
function calculateVigorChange_(z_t, z_next) {
  var vigor_t = extractMetric_(z_t, 'vigor') || 0.5;
  var vigor_next = extractMetric_(z_next, 'vigor') || 0.5;
  
  return ((vigor_next - vigor_t) / vigor_t) * 100;
}

/**
 * Extrai métrica de estado latente.
 * @private
 */
function extractMetric_(state, metricName) {
  // Se o estado é um objeto com propriedades nomeadas
  if (state && typeof state === 'object' && !Array.isArray(state)) {
    return state[metricName] || 0;
  }
  
  // Se o estado é um array (vetor latente)
  if (Array.isArray(state)) {
    var index = {
      soilMoisture: 0,
      airTemp: 1,
      airHumidity: 2,
      leafArea: 3,
      greenCoverage: 4,
      pemfFrequency: 5,
      pemfIntensity: 6,
      vigor: 0  // Aproximar pelo primeiro componente
    }[metricName];
    
    if (index !== undefined && state[index] !== undefined) {
      // Desnormalizar valores
      if (metricName === 'soilMoisture' || metricName === 'airHumidity') {
        return state[index] * 100;
      }
      if (metricName === 'airTemp') {
        return state[index] * 40 + 10;
      }
      return state[index] * 100;
    }
  }
  
  return 0;
}

/**
 * Identifica fatores-chave da transição.
 * @private
 */
function identifyKeyFactors_(z_t, z_next, options) {
  var factors = [];
  var action = options.action || {};
  
  var moisture = extractMetric_(z_t, 'soilMoisture');
  var temp = extractMetric_(z_t, 'airTemp');
  var humidity = extractMetric_(z_t, 'airHumidity');
  
  // Umidade do solo
  if (moisture < 35) {
    factors.push('umidade do solo baixa (' + Math.round(moisture) + '%)');
  } else if (moisture > 70) {
    factors.push('solo saturado (' + Math.round(moisture) + '%)');
  } else if (moisture >= 45 && moisture <= 70) {
    factors.push('umidade ótima (' + Math.round(moisture) + '%)');
  }
  
  // Temperatura
  if (temp < 18) {
    factors.push('temperatura baixa (' + Math.round(temp) + '°C)');
  } else if (temp > 32) {
    factors.push('temperatura alta (' + Math.round(temp) + '°C)');
  } else if (temp >= 20 && temp <= 28) {
    factors.push('temperatura ideal (' + Math.round(temp) + '°C)');
  }
  
  // Umidade do ar
  if (humidity < 40) {
    factors.push('ar seco (' + Math.round(humidity) + '%)');
  } else if (humidity > 80) {
    factors.push('umidade do ar alta (' + Math.round(humidity) + '%)');
  }
  
  // Ação aplicada
  if (action.type === 'irrigation') {
    factors.push('irrigação aplicada (' + action.duration + 's)');
  }
  
  if (action.type === 'pemf' && action.frequency > 0) {
    factors.push('PEMF ativo (' + action.frequency + 'Hz)');
  }
  
  return factors.length > 0 ? factors.join(', ') : 'condições estáveis';
}

/**
 * Calcula efetividade da ação.
 * @private
 */
function calculateActionEffectiveness_(vigorChange, action) {
  if (!action || !action.type) {
    return 'N/A';
  }
  
  if (vigorChange > 10) {
    return 'muito efetiva';
  } else if (vigorChange > 5) {
    return 'efetiva';
  } else if (vigorChange > 0) {
    return 'moderadamente efetiva';
  } else if (vigorChange > -5) {
    return 'efeito neutro';
  } else {
    return 'efeito negativo detectado';
  }
}

/**
 * Seleciona template de narrativa.
 * @private
 */
function selectNarrativeTemplate_(transitionType, metrics) {
  return NARRATIVE_TEMPLATES[transitionType] || NARRATIVE_TEMPLATES.STEADY_STATE;
}

/**
 * Preenche template com dados.
 * @private
 */
function fillNarrativeTemplate_(template, metrics, options) {
  var action = options.action || {};
  var context = options.context || {};
  
  // Gerar recomendação
  var recommendation = generateRecommendation_(metrics, action, context);
  
  // Preparar dados para substituição
  var data = {
    vigor_change: Math.abs(metrics.vigorChange),
    vigor_level: metrics.vigorLevel,
    horizon: metrics.horizon,
    key_factors: metrics.keyFactors,
    recommendation: recommendation,
    initial_moisture: metrics.currentMoisture,
    current_moisture: metrics.currentMoisture,
    duration: action.duration || 0,
    frequency: action.frequency || 0,
    intensity: action.intensity || 0,
    duty: action.duty || 50,
    target_ion: action.targetIon || 'K+',
    confidence: metrics.confidence,
    effectiveness: metrics.effectiveness,
    recovery_time: estimateRecoveryTime_(metrics),
    current_protocol: describeCurrentProtocol_(action, metrics)
  };
  
  // Substituir placeholders nos patterns
  var filledPatterns = template.patterns.map(function(pattern) {
    var filled = pattern;
    Object.keys(data).forEach(function(key) {
      var placeholder = '{' + key + '}';
      filled = filled.replace(new RegExp(placeholder, 'g'), data[key]);
    });
    return filled;
  });
  
  return {
    title: template.title,
    text: filledPatterns.join(' '),
    sections: filledPatterns,
    data: data
  };
}

/**
 * Gera recomendação baseada em métricas.
 * @private
 */
function generateRecommendation_(metrics, action, context) {
  var recommendations = [];
  
  // Baseado na umidade
  if (metrics.currentMoisture < 35) {
    recommendations.push('Irrigar nas próximas 2 horas');
  } else if (metrics.currentMoisture > 75) {
    recommendations.push('Suspender irrigação temporariamente');
  }
  
  // Baseado na mudança de vigor
  if (metrics.vigorChange < -10) {
    recommendations.push('Investigar fatores de estresse');
  } else if (metrics.vigorChange > 15) {
    recommendations.push('Manter protocolo atual');
  }
  
  // Baseado na efetividade
  if (metrics.effectiveness === 'efeito negativo detectado') {
    recommendations.push('Reavaliar parâmetros de intervenção');
  }
  
  // Recomendação padrão
  if (recommendations.length === 0) {
    recommendations.push('Continuar monitoramento');
  }
  
  return recommendations.join('. ');
}

/**
 * Estima tempo de recuperação.
 * @private
 */
function estimateRecoveryTime_(metrics) {
  var moistureDeficit = Math.max(0, 50 - metrics.currentMoisture);
  
  if (moistureDeficit > 20) {
    return '24-48 horas';
  } else if (moistureDeficit > 10) {
    return '12-24 horas';
  } else {
    return '6-12 horas';
  }
}

/**
 * Descreve protocolo atual.
 * @private
 */
function describeCurrentProtocol_(action, metrics) {
  var parts = [];
  
  if (metrics.currentMoisture >= 45 && metrics.currentMoisture <= 70) {
    parts.push('irrigação adequada');
  }
  
  if (action.type === 'pemf' && action.frequency > 0) {
    parts.push('PEMF ativo');
  } else {
    parts.push('sem estimulação');
  }
  
  return parts.length > 0 ? parts.join(', ') : 'protocolo padrão';
}

/**
 * Gera explicação técnica detalhada.
 * @private
 */
function generateTechnicalExplanation_(z_t, z_next, metrics) {
  return {
    stateTransition: {
      from: z_t,
      to: z_next,
      changeVector: calculateChangeVector_(z_t, z_next)
    },
    metricsBreakdown: metrics,
    confidenceFactors: {
      dataQuality: 'alta',
      modelUncertainty: (100 - metrics.confidence) + '%',
      historicalAccuracy: 'não disponível'
    },
    methodology: 'Predição baseada em World Model treinado com séries temporais de crescimento de PANCs'
  };
}

/**
 * Calcula vetor de mudança.
 * @private
 */
function calculateChangeVector_(z_t, z_next) {
  if (Array.isArray(z_t) && Array.isArray(z_next)) {
    return z_t.map(function(val, i) {
      return Math.round((z_next[i] - val) * 1000) / 1000;
    });
  }
  return [];
}

/**
 * Gera dados para visualização.
 * @private
 */
function generateVisualizationData_(metrics, options) {
  return {
    charts: {
      vigorTrend: {
        type: 'line',
        data: [
          { time: 'atual', value: metrics.vigorLevel },
          { time: 'previsto', value: metrics.vigorLevel + metrics.vigorChange }
        ]
      },
      moistureTrend: {
        type: 'line',
        data: [
          { time: 'atual', value: metrics.currentMoisture },
          { time: 'previsto', value: metrics.nextMoisture }
        ]
      }
    },
    gauges: {
      vigor: {
        value: metrics.vigorLevel,
        min: 0,
        max: 100,
        zones: [
          { from: 0, to: 40, color: 'red' },
          { from: 40, to: 70, color: 'yellow' },
          { from: 70, to: 100, color: 'green' }
        ]
      },
      confidence: {
        value: metrics.confidence,
        label: metrics.confidence + '% confiança'
      }
    }
  };
}

/**
 * Gera narrativa comparativa entre grupos experimentais.
 * @param {Array} groups - Array de grupos com estatísticas
 * @param {Object} anovaResult - Resultado do teste ANOVA
 * @returns {Object} Narrativa comparativa
 */
function generateComparativeNarrative(groups, anovaResult) {
  try {
    if (!groups || !Array.isArray(groups) || groups.length < 2) {
      return {
        success: false,
        error: 'São necessários pelo menos 2 grupos para comparação'
      };
    }

    anovaResult = anovaResult || {};
    var inferenceEligible = anovaInferenceEligible_(anovaResult);
    var pValue = anovaPValue_(anovaResult);
    
    var template = NARRATIVE_TEMPLATES.COMPARATIVE_ANALYSIS;
    var narratives = [];
    
    // Narrativa para cada grupo
    groups.forEach(function(group) {
      var data = {
        group_name: group.name,
        mean_vigor: Math.round(group.mean * 10) / 10,
        std_dev: Math.round(group.stdDev * 10) / 10,
        statistical_result: !inferenceEligible
          ? 'exploratória (p=' + pValue + '; sem réplicas independentes verificadas)'
          : (anovaResult.significant
            ? 'diferença estatística (p=' + pValue + ')'
            : 'não detectada (p=' + pValue + '; não implica equivalência)'),
        effect_size: anovaResult.effectSize && anovaResult.effectSize.eta_squared !== undefined
          ? anovaResult.effectSize.eta_squared : 'indisponível',
        interpretation: anovaResult.effectSize && anovaResult.effectSize.interpretation
          ? anovaResult.effectSize.interpretation : 'não estimado para inferência',
        recommendation: generateGroupRecommendation_(group, anovaResult)
      };
      
      var filled = template.patterns.map(function(pattern) {
        var text = pattern;
        Object.keys(data).forEach(function(key) {
          text = text.replace(new RegExp('{' + key + '}', 'g'), data[key]);
        });
        return text;
      }).join(' ');
      
      narratives.push({
        group: group.name,
        text: filled,
        data: data
      });
    });
    
    // Conclusão geral
    var conclusion = generateComparativeConclusion_(groups, anovaResult);
    
    return {
      success: true,
      type: 'COMPARATIVE_ANALYSIS',
      narratives: narratives,
      conclusion: conclusion,
      statisticalSummary: anovaResult,
      inferenceScope: inferenceEligible ? 'independent_replicates_verified' : 'exploratory_descriptive_only',
      causalInference: false,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em generateComparativeNarrative: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gera recomendação para grupo experimental.
 * @private
 */
function generateGroupRecommendation_(group, anovaResult) {
  if (!anovaInferenceEligible_(anovaResult)) {
    return 'Maior média observada nesta condição; não permite afirmar superioridade, eficácia ou causalidade.';
  }
  if (!anovaResult.significant) {
    return 'Não foi detectada diferença estatística entre as condições; isso não demonstra equivalência.';
  }
  
  // Encontrar melhor grupo
  var bestMean = Math.max.apply(null, anovaResult.groups.map(function(g) { return g.mean; }));
  
  if (group.mean >= bestMean * 0.95) {
    return 'Condição apresenta média observada superior ou próxima às demais; a diferença não prova causalidade.';
  } else if (group.mean >= bestMean * 0.85) {
    return 'Média observada dentro da faixa dos demais grupos';
  } else {
    return 'Considerar novas medições e revisão dos confundidores desta condição';
  }
}

/**
 * Gera conclusão comparativa.
 * @private
 */
function generateComparativeConclusion_(groups, anovaResult) {
  var bestGroup = groups.reduce(function(best, current) {
    return current.mean > best.mean ? current : best;
  });

  if (!anovaInferenceEligible_(anovaResult)) {
    return 'Comparação exploratória: ' + bestGroup.name + ' teve a maior média observada (' +
           Math.round(bestGroup.mean * 10) / 10 + '), mas a análise não demonstra superioridade ou causalidade. ' +
           'Uma condição com um único canteiro não constitui replicação independente.';
  }
  
  if (anovaResult.significant) {
    return 'A análise encontrou diferença estatística entre as condições (F=' + 
           anovaResult.anova.f_stat + ', p=' + anovaResult.anova.p_value + '). ' +
           'A maior média observada foi a do grupo ' + bestGroup.name + ' (' + 
           Math.round(bestGroup.mean * 10) / 10 + ' unidades).';
  } else {
    return 'Não foi detectada diferença estatística entre as condições ' +
           '(F=' + anovaResult.anova.f_stat + ', p=' + anovaResult.anova.p_value + '). ' +
           'Isso não demonstra equivalência entre os grupos.';
  }
}
