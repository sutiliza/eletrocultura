/**
 * ==============================================================================
 * COMPONENTE: Stats_Anova.gs
 * TÍTULO: Análise Estatística ANOVA
 * FUNCIONALIDADES:
 *   - Calcula médias, variâncias e uma comparação ANOVA exploratória para a eletrocultura.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Dashboard_Data.gs, Biomassa_Chart.html.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

// Níveis de significância estatística
var SIGNIFICANCE_LEVELS = {
  ALPHA_001: 0.01,
  ALPHA_005: 0.05,
  ALPHA_010: 0.10
};

var ANOVA_INFERENCE_POLICY = {
  analysisType: 'exploratory',
  requiresIndependentReplication: true,
  minimumIndependentReplicatesPerGroup: 2,
  note: 'Uma observação por canteiro/condição não constitui replicação independente e não sustenta inferência de superioridade.'
};

/**
 * Resolve a declaração da unidade experimental sem confundir observações
 * repetidas no mesmo canteiro com réplicas independentes.
 * @private
 */
function resolveANOVAReplicationDesign_(groups, options) {
  options = options || {};
  var declared = options.independentReplicates || options.replicationCounts || options.independentUnits;
  if (!declared && Array.isArray(options.groupMetadata)) {
    declared = options.groupMetadata.map(function (item) {
      item = item || {};
      return item.independentReplicates || item.independentUnits || item.nIndependent;
    });
  }

  var counts = null;
  if (Array.isArray(declared) && declared.length === (Array.isArray(groups) ? groups.length : 0)) {
    counts = declared.map(function (value) {
      var number = Number(value);
      return isFinite(number) ? number : 0;
    });
  }

  var verified = options.independentReplicationVerified === true || options.independentReplication === true;
  if (counts && counts.length && counts.every(function (count) { return count >= ANOVA_INFERENCE_POLICY.minimumIndependentReplicatesPerGroup; })) {
    verified = true;
  }
  if (!counts && verified && Array.isArray(groups)) {
    // Só usa o tamanho dos grupos quando o chamador declarou explicitamente
    // que cada valor representa uma unidade experimental independente.
    counts = groups.map(function (group) { return Array.isArray(group) ? group.length : 0; });
  }

  var minimum = counts && counts.length ? Math.min.apply(null, counts) : 0;
  var eligible = verified && minimum >= ANOVA_INFERENCE_POLICY.minimumIndependentReplicatesPerGroup;
  return {
    counts: counts,
    verified: verified,
    eligible: eligible,
    minimum: minimum,
    status: eligible ? 'verified' : (counts && minimum < ANOVA_INFERENCE_POLICY.minimumIndependentReplicatesPerGroup
      ? 'insufficient_independent_replication' : 'not_verified'),
    note: ANOVA_INFERENCE_POLICY.note
  };
}

function descriptiveOnlyANOVAResult_(groups, groupNames, alpha, replication) {
  var descriptives = (groups || []).map(function (group, index) {
    var values = Array.isArray(group) ? group.filter(function (value) {
      return typeof value === 'number' && isFinite(value);
    }) : [];
    var mean = values.length ? calculateMean_(values) : 0;
    var variance = values.length > 1 ? calculateVariance_(values, mean) : 0;
    var stdDev = Math.sqrt(variance);
    return {
      name: groupNames[index],
      n: values.length,
      independentUnits: replication.counts ? replication.counts[index] : null,
      mean: Math.round(mean * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: values.length ? Math.round(Math.min.apply(null, values) * 100) / 100 : null,
      max: values.length ? Math.round(Math.max.apply(null, values) * 100) / 100 : null,
      sem: null
    };
  });
  return {
    success: true,
    test: 'One-Way ANOVA',
    alpha: alpha,
    analysisType: 'descriptive_only',
    status: 'blocked_for_inference',
    groups: descriptives,
    anova: null,
    significant: false,
    rawSignificant: false,
    inferenceEligible: false,
    independentReplicationVerified: replication.verified,
    independentReplicates: replication.counts,
    replicationStatus: replication.status,
    replicationNote: replication.note,
    effectSize: null,
    power: null,
    conclusion: 'Comparação apenas descritiva: há menos de duas réplicas independentes por condição. A maior média observada não demonstra superioridade nem causalidade.',
    timestamp: new Date().toISOString()
  };
}

/**
 * Calcula ANOVA de fator único (One-Way ANOVA).
 * Compara médias de 2+ condições. A inferência só é elegível quando as
 * unidades experimentais independentes foram declaradas e replicadas.
 * 
 * @param {Array} groups - Array de grupos, cada grupo é um array de valores numéricos
 *                         Ex: [[20, 22, 19], [25, 27, 26], [18, 20, 17]]
 * @param {Object} options - Opções: { alpha, groupNames, postHoc,
 *   independentReplicationVerified, independentReplicates }
 * @returns {Object} Resultado completo da ANOVA
 */
function calculateANOVA(groups, options) {
  try {
    options = options || {};
    var alpha = options.alpha || SIGNIFICANCE_LEVELS.ALPHA_005;
    var groupNames = options.groupNames || (Array.isArray(groups) ? groups : []).map(function(g, i) { return 'Grupo ' + (i + 1); });
    var replication = resolveANOVAReplicationDesign_(groups, options);

    // Singleton groups can still be summarized, but never devem seguir para
    // um teste inferencial como se fossem réplicas independentes.
    if (Array.isArray(groups) && groups.length >= 2 && groups.every(function (group) { return Array.isArray(group); }) &&
        groups.some(function (group) { return group.length < 2; })) {
      var invalidSingletonValue = groups.some(function (group) {
        return group.some(function (value) { return typeof value !== 'number' || !isFinite(value); });
      });
      if (invalidSingletonValue) {
        return { success: false, error: 'Grupos contêm valores não numéricos' };
      }
      return descriptiveOnlyANOVAResult_(groups, groupNames, alpha, replication);
    }
    
    // Validação de entrada
    var validation = validateANOVAInput_(groups);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    // Calcular estatísticas descritivas por grupo
    var descriptives = calculateGroupDescriptives_(groups, groupNames);
    
    // Calcular ANOVA
    var anova = performOneWayANOVA_(groups);
    
    // Determinar significância
    var rawSignificant = isFinite(anova.p_value) && anova.p_value < alpha;
    var significant = rawSignificant && replication.eligible;
    
    // Interpretar tamanho do efeito (eta squared)
    var effectSize = interpretEffectSize_(anova.eta_squared);
    
    // Calcular poder estatístico (aproximado)
    var power = estimateStatisticalPower_(anova.f_stat, anova.df_between, anova.df_within, alpha);
    
    var result = {
      success: true,
      test: 'One-Way ANOVA',
      alpha: alpha,
      analysisType: replication.eligible ? 'inferential' : 'exploratory',
      status: replication.eligible ? 'inferentially_eligible' : 'exploratory_only',
      groups: descriptives,
      anova: {
        f_stat: Math.round(anova.f_stat * 1000) / 1000,
        p_value: Math.round(anova.p_value * 10000) / 10000,
        df_between: anova.df_between,
        df_within: anova.df_within,
        df_total: anova.df_total,
        ss_between: Math.round(anova.ss_between * 100) / 100,
        ss_within: Math.round(anova.ss_within * 100) / 100,
        ss_total: Math.round(anova.ss_total * 100) / 100,
        ms_between: Math.round(anova.ms_between * 100) / 100,
        ms_within: Math.round(anova.ms_within * 100) / 100
      },
      significant: significant,
      rawSignificant: rawSignificant,
      inferenceEligible: replication.eligible,
      independentReplicationVerified: replication.verified,
      independentReplicates: replication.counts,
      replicationStatus: replication.status,
      replicationNote: replication.note,
      effectSize: {
        eta_squared: Math.round(anova.eta_squared * 10000) / 10000,
        interpretation: effectSize
      },
      power: Math.round(power * 100) / 100,
      conclusion: significant ?
        'Há diferença estatística entre os grupos (p < ' + alpha + '); a interpretação não demonstra causalidade por si só.' :
        (replication.eligible
          ? 'Não foi detectada diferença estatística entre os grupos (p >= ' + alpha + '); isso não demonstra equivalência.'
          : 'ANOVA exploratório: o p-valor observado requer confirmação de réplicas independentes e não sustenta uma conclusão de superioridade.'),
      timestamp: new Date().toISOString()
    };
    
    // Teste post-hoc se significativo e solicitado
    if (significant && options.postHoc) {
      result.postHoc = performTukeyHSD_(groups, groupNames, anova.ms_within, anova.df_within, alpha);
    }
    
    return result;
    
  } catch (error) {
    Logger.log('Erro em calculateANOVA: ' + error.message);
    return {
      success: false,
      error: 'Erro no cálculo ANOVA: ' + error.message
    };
  }
}

/**
 * Valida entrada para ANOVA.
 * @private
 */
function validateANOVAInput_(groups) {
  if (!Array.isArray(groups)) {
    return { valid: false, error: 'groups deve ser um array' };
  }
  
  if (groups.length < 2) {
    return { valid: false, error: 'São necessários pelo menos 2 grupos' };
  }
  
  for (var i = 0; i < groups.length; i++) {
    if (!Array.isArray(groups[i])) {
      return { valid: false, error: 'Grupo ' + i + ' não é um array' };
    }
    
    if (groups[i].length < 2) {
      return { valid: false, error: 'Grupo ' + i + ' precisa de pelo menos 2 observações' };
    }
    
    for (var j = 0; j < groups[i].length; j++) {
      if (typeof groups[i][j] !== 'number' || !isFinite(groups[i][j])) {
        return { valid: false, error: 'Grupo ' + i + ' contém valores não numéricos' };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Calcula estatísticas descritivas para cada grupo.
 * @private
 */
function calculateGroupDescriptives_(groups, groupNames) {
  return groups.map(function(group, index) {
    var mean = calculateMean_(group);
    var variance = calculateVariance_(group, mean);
    var stdDev = Math.sqrt(variance);
    
    return {
      name: groupNames[index],
      n: group.length,
      mean: Math.round(mean * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.round(Math.min.apply(null, group) * 100) / 100,
      max: Math.round(Math.max.apply(null, group) * 100) / 100,
      sem: Math.round((stdDev / Math.sqrt(group.length)) * 100) / 100
    };
  });
}

/**
 * Executa ANOVA de fator único.
 * @private
 */
function performOneWayANOVA_(groups) {
  // Calcular média geral (grand mean)
  var allValues = [];
  groups.forEach(function(group) {
    allValues = allValues.concat(group);
  });
  var grandMean = calculateMean_(allValues);
  var n_total = allValues.length;
  
  // Calcular soma de quadrados entre grupos (SS_between)
  var ss_between = 0;
  groups.forEach(function(group) {
    var groupMean = calculateMean_(group);
    var n = group.length;
    ss_between += n * Math.pow(groupMean - grandMean, 2);
  });
  
  // Calcular soma de quadrados dentro dos grupos (SS_within)
  var ss_within = 0;
  groups.forEach(function(group) {
    var groupMean = calculateMean_(group);
    group.forEach(function(value) {
      ss_within += Math.pow(value - groupMean, 2);
    });
  });
  
  // Calcular soma de quadrados total (SS_total)
  var ss_total = 0;
  allValues.forEach(function(value) {
    ss_total += Math.pow(value - grandMean, 2);
  });
  
  // Graus de liberdade
  var k = groups.length;  // número de grupos
  var df_between = k - 1;
  var df_within = n_total - k;
  var df_total = n_total - 1;
  
  // Quadrados médios (Mean Squares)
  var ms_between = ss_between / df_between;
  var ms_within = ss_within / df_within;
  
  // Estatística F. Sem variação total não há diferença observável; não deixe
  // 0/0 virar NaN e depois ser interpretado como p=0/significativo.
  var f_stat;
  var p_value;
  if (ss_total === 0) {
    f_stat = 0;
    p_value = 1;
  } else if (ss_within === 0) {
    f_stat = ss_between > 0 ? Infinity : 0;
    p_value = ss_between > 0 ? 0 : 1;
  } else {
    f_stat = ms_between / ms_within;
    p_value = calculateFPValue_(f_stat, df_between, df_within);
  }
  
  // Eta squared (tamanho do efeito)
  var eta_squared = ss_total === 0 ? 0 : ss_between / ss_total;
  
  return {
    f_stat: f_stat,
    p_value: p_value,
    df_between: df_between,
    df_within: df_within,
    df_total: df_total,
    ss_between: ss_between,
    ss_within: ss_within,
    ss_total: ss_total,
    ms_between: ms_between,
    ms_within: ms_within,
    eta_squared: eta_squared
  };
}

/**
 * Calcula média de um array.
 * @private
 */
function calculateMean_(values) {
  var sum = values.reduce(function(acc, val) { return acc + val; }, 0);
  return sum / values.length;
}

/**
 * Calcula variância de um array.
 * @private
 */
function calculateVariance_(values, mean) {
  if (mean === undefined) {
    mean = calculateMean_(values);
  }
  var sumSquaredDiff = values.reduce(function(acc, val) {
    return acc + Math.pow(val - mean, 2);
  }, 0);
  return sumSquaredDiff / (values.length - 1);  // variância amostral
}

/**
 * Calcula p-value para distribuição F.
 * Usa aproximação de Hastings para função beta incompleta.
 * @private
 */
function calculateFPValue_(f, df1, df2) {
  if (f <= 0) return 1;
  if (!isFinite(f)) return 0;
  
  // Transformar para distribuição beta
  var x = df2 / (df2 + df1 * f);
  
  // Calcular função beta incompleta regularizada
  // Isso é uma aproximação - para produção, usar biblioteca estatística
  var p = incompleteBetaApprox_(x, df2/2, df1/2);
  
  return Math.max(0, Math.min(1, p));
}

/**
 * Aproximação da função beta incompleta regularizada.
 * @private
 */
function incompleteBetaApprox_(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  
  // Aproximação simples usando série de potências
  // Para valores de p próximos, essa aproximação é razoável
  var bt = Math.exp(
    logGamma_(a + b) - logGamma_(a) - logGamma_(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaContinuedFraction_(x, a, b) / a;
  } else {
    return 1 - bt * betaContinuedFraction_(1 - x, b, a) / b;
  }
}

/**
 * Fração continuada para beta incompleta.
 * @private
 */
function betaContinuedFraction_(x, a, b) {
  var maxIterations = 100;
  var epsilon = 1e-10;
  
  var qab = a + b;
  var qap = a + 1;
  var qam = a - 1;
  var c = 1;
  var d = 1 - qab * x / qap;
  
  if (Math.abs(d) < epsilon) d = epsilon;
  d = 1 / d;
  var h = d;
  
  for (var m = 1; m <= maxIterations; m++) {
    var m2 = 2 * m;
    var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    h *= d * c;
    
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    var del = d * c;
    h *= del;
    
    if (Math.abs(del - 1) < epsilon) break;
  }
  
  return h;
}

/**
 * Log da função Gamma (Stirling's approximation).
 * @private
 */
function logGamma_(z) {
  if (z <= 0) return Infinity;
  
  // Coeficientes de Lanczos
  var g = 7;
  var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
           771.32342877765313, -176.61502916214059, 12.507343278686905,
           -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma_(1 - z);
  }
  
  z -= 1;
  var x = c[0];
  for (var i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  
  var t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Executa teste post-hoc de Tukey HSD.
 * Comparações múltiplas par a par.
 * @private
 */
function performTukeyHSD_(groups, groupNames, ms_within, df_within, alpha) {
  var comparisons = [];
  var k = groups.length;
  
  // Calcular médias
  var means = groups.map(function(group) {
    return calculateMean_(group);
  });
  
  // Calcular todas as comparações par a par
  for (var i = 0; i < k; i++) {
    for (var j = i + 1; j < k; j++) {
      var n_i = groups[i].length;
      var n_j = groups[j].length;
      var mean_diff = Math.abs(means[i] - means[j]);
      
      // Erro padrão da diferença
      var se_diff = Math.sqrt(ms_within * (1/n_i + 1/n_j));
      
      // Estatística q de Tukey
      var q_stat = mean_diff / se_diff;
      
      // Valor crítico aproximado (simplificado)
      var q_critical = approximateTukeyCritical_(k, df_within, alpha);
      
      var significant = q_stat > q_critical;
      
      comparisons.push({
        group1: groupNames[i],
        group2: groupNames[j],
        mean1: Math.round(means[i] * 100) / 100,
        mean2: Math.round(means[j] * 100) / 100,
        difference: Math.round(mean_diff * 100) / 100,
        q_stat: Math.round(q_stat * 100) / 100,
        q_critical: Math.round(q_critical * 100) / 100,
        significant: significant
      });
    }
  }
  
  return {
    test: 'Tukey HSD',
    alpha: alpha,
    comparisons: comparisons
  };
}

/**
 * Aproxima valor crítico de Tukey.
 * @private
 */
function approximateTukeyCritical_(k, df, alpha) {
  // Aproximação conservadora baseada em tabelas comuns
  // Para alpha = 0.05
  if (alpha > 0.04 && alpha < 0.06) {
    if (k === 3) {
      if (df >= 20) return 3.58;
      if (df >= 10) return 3.88;
      return 4.50;
    }
    if (k === 4) {
      if (df >= 20) return 3.96;
      if (df >= 10) return 4.33;
      return 5.04;
    }
    if (k >= 5) {
      if (df >= 20) return 4.23;
      if (df >= 10) return 4.65;
      return 5.43;
    }
  }
  
  // Aproximação geral
  return 2.8 + (k - 2) * 0.4 + (1 / Math.sqrt(df)) * 2;
}

/**
 * Interpreta tamanho do efeito (eta squared).
 * @private
 */
function interpretEffectSize_(eta_squared) {
  if (eta_squared < 0.01) return 'negligível';
  if (eta_squared < 0.06) return 'pequeno';
  if (eta_squared < 0.14) return 'médio';
  return 'grande';
}

/**
 * Estima poder estatístico (aproximado).
 * @private
 */
function estimateStatisticalPower_(f_stat, df1, df2, alpha) {
  // Aproximação simplificada do poder
  // Em produção, usar bibliotecas especializadas
  
  var noncentrality = f_stat * df1;
  
  // Valor crítico F
  var f_critical = approximateFCritical_(df1, df2, alpha);
  
  // Estimativa do poder baseada em não-centralidade
  var power = 1 - Math.exp(-noncentrality / (2 * f_critical));
  
  return Math.max(0, Math.min(1, power));
}

/**
 * Aproxima valor crítico F.
 * @private
 */
function approximateFCritical_(df1, df2, alpha) {
  // Aproximações para alpha = 0.05
  if (alpha > 0.04 && alpha < 0.06) {
    if (df1 === 1) return 4.00;
    if (df1 === 2) return 3.15;
    if (df1 === 3) return 2.76;
    if (df1 === 4) return 2.53;
    return 2.37;
  }
  
  // Aproximação geral
  return 3.0 - (df1 / 20) + (1 / Math.sqrt(df2));
}

/**
 * Calcula teste t independente entre dois grupos.
 * @param {Array} group1 - Primeiro grupo de valores
 * @param {Array} group2 - Segundo grupo de valores
 * @param {Object} options - Opções: { alpha, paired }
 * @returns {Object} Resultado do teste t
 */
function calculateTTest(group1, group2, options) {
  try {
    options = options || {};
    var alpha = options.alpha || SIGNIFICANCE_LEVELS.ALPHA_005;
    
    if (!Array.isArray(group1) || !Array.isArray(group2)) {
      return { success: false, error: 'Ambos os grupos devem ser arrays' };
    }
    
    if (group1.length < 2 || group2.length < 2) {
      return { success: false, error: 'Cada grupo precisa de pelo menos 2 observações' };
    }

    var invalidValue = group1.concat(group2).some(function (value) {
      return typeof value !== 'number' || !isFinite(value);
    });
    if (invalidValue) {
      return { success: false, error: 'Os grupos contêm valores não numéricos ou infinitos' };
    }
    
    var mean1 = calculateMean_(group1);
    var mean2 = calculateMean_(group2);
    var var1 = calculateVariance_(group1, mean1);
    var var2 = calculateVariance_(group2, mean2);
    var n1 = group1.length;
    var n2 = group2.length;
    
    // Variância combinada (pooled variance)
    var pooled_var = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    
    // Erro padrão da diferença
    var se_diff = Math.sqrt(pooled_var * (1/n1 + 1/n2));
    
    // Estatística t; grupos constantes idênticos não são uma diferença
    // significativa e não podem produzir NaN por divisão 0/0.
    var t_stat;
    if (pooled_var === 0) {
      t_stat = mean1 === mean2 ? 0 : (mean1 > mean2 ? Infinity : -Infinity);
    } else {
      t_stat = (mean1 - mean2) / se_diff;
    }
    
    // Graus de liberdade
    var df = n1 + n2 - 2;
    
    // P-value (aproximado, bilateral)
    var p_value = calculateTPValue_(Math.abs(t_stat), df);
    
    var significant = p_value < alpha;
    
    // Cohen's d (tamanho do efeito)
    var cohens_d = pooled_var === 0
      ? (mean1 === mean2 ? 0 : (mean1 > mean2 ? Infinity : -Infinity))
      : (mean1 - mean2) / Math.sqrt(pooled_var);
    
    return {
      success: true,
      test: 'Independent t-test',
      alpha: alpha,
      group1: {
        n: n1,
        mean: Math.round(mean1 * 100) / 100,
        variance: Math.round(var1 * 100) / 100,
        stdDev: Math.round(Math.sqrt(var1) * 100) / 100
      },
      group2: {
        n: n2,
        mean: Math.round(mean2 * 100) / 100,
        variance: Math.round(var2 * 100) / 100,
        stdDev: Math.round(Math.sqrt(var2) * 100) / 100
      },
      t_stat: Math.round(t_stat * 1000) / 1000,
      df: df,
      p_value: Math.round(p_value * 10000) / 10000,
      significant: significant,
      effectSize: {
        cohens_d: Math.round(cohens_d * 1000) / 1000,
        interpretation: interpretCohensD_(Math.abs(cohens_d))
      },
      conclusion: significant ?
        'Há diferença significativa entre os grupos (p < ' + alpha + ')' :
        'Não há diferença significativa entre os grupos (p >= ' + alpha + ')',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em calculateTTest: ' + error.message);
    return {
      success: false,
      error: 'Erro no teste t: ' + error.message
    };
  }
}

/**
 * Calcula p-value para distribuição t.
 * @private
 */
function calculateTPValue_(t, df) {
  // Aproximação usando distribuição normal para df > 30
  if (df > 30) {
    return 2 * (1 - normalCDF_(t));
  }
  
  // Aproximação para df menor
  var x = df / (df + t * t);
  var p = incompleteBetaApprox_(x, df/2, 0.5);
  
  return p;
}

/**
 * CDF da distribuição normal padrão.
 * @private
 */
function normalCDF_(z) {
  return 0.5 * (1 + erf_(z / Math.sqrt(2)));
}

/**
 * Função erro (error function).
 * @private
 */
function erf_(x) {
  // Aproximação de Abramowitz e Stegun
  var sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  
  var a1 = 0.254829592;
  var a2 = -0.284496736;
  var a3 = 1.421413741;
  var a4 = -1.453152027;
  var a5 = 1.061405429;
  var p = 0.3275911;
  
  var t = 1.0 / (1.0 + p * x);
  var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return sign * y;
}

/**
 * Interpreta Cohen's d.
 * @private
 */
function interpretCohensD_(d) {
  if (d < 0.2) return 'negligível';
  if (d < 0.5) return 'pequeno';
  if (d < 0.8) return 'médio';
  return 'grande';
}
