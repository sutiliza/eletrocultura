/**
 * ==============================================================================
 * COMPONENTE: Sensors_Soil.gs
 * TÍTULO: Processamento de Sensores de Solo
 * FUNCIONALIDADES:
 *   - Lê e calibra os dados de sensores de umidade do substrato (capacitivos).
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Db_Leituras.gs, Actuators_Irrigation.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

// Constantes de calibração para sensores capacitivos v1.2
var SOIL_CALIBRATION = {
  // Valores típicos para sensor capacitivo em ESP32 (12-bit ADC)
  AIR_VALUE: 3200,      // Valor em ar seco (0% umidade)
  WATER_VALUE: 1200,    // Valor em água (100% umidade)
  
  // Limites de validação
  MIN_RAW: 800,
  MAX_RAW: 4095,
  
  // Limites de umidade recomendados para PANCs
  CRITICAL_LOW: 20,     // Abaixo disso: estresse hídrico severo
  WARNING_LOW: 35,      // Abaixo disso: necessita irrigação
  OPTIMAL_MIN: 45,      // Faixa ótima mínima
  OPTIMAL_MAX: 70,      // Faixa ótima máxima
  WARNING_HIGH: 80,     // Acima disso: saturação preocupante
  CRITICAL_HIGH: 90,    // Acima disso: risco de asfixia radicular
  
  // Coeficientes para correção de temperatura
  TEMP_COEFFICIENT: 0.0015,  // Variação por °C
  REF_TEMP: 25               // Temperatura de referência (°C)
};

/**
 * Calibra leitura do sensor de umidade do solo com correção não-linear.
 * @param {number} rawVal - Valor bruto do ADC (0-4095)
 * @param {number} soilTemp - Temperatura do solo em °C (opcional)
 * @param {string} canteiroId - Identificador do canteiro (opcional)
 * @returns {Object} Dados calibrados e diagnóstico
 */
function calibrateSoilMoisture_(rawVal, soilTemp, canteiroId) {
  try {
    // Validação de entrada
    if (typeof rawVal !== 'number' || !isFinite(rawVal)) {
      return {
        success: false,
        error: 'Valor bruto inválido',
        raw: rawVal
      };
    }
    
    if (rawVal < SOIL_CALIBRATION.MIN_RAW || rawVal > SOIL_CALIBRATION.MAX_RAW) {
      return {
        success: false,
        error: 'Valor fora dos limites do ADC',
        raw: rawVal,
        limits: { min: SOIL_CALIBRATION.MIN_RAW, max: SOIL_CALIBRATION.MAX_RAW }
      };
    }
    
    // Obter calibração específica do canteiro se disponível
    var calibration = getCanteiroCalibration_(canteiroId);
    
    // Aplicar mapeamento não-linear (curva característica do sensor capacitivo)
    var moisturePercent = mapSoilMoistureNonLinear_(rawVal, calibration);
    
    // Aplicar compensação de temperatura se disponível
    var hasValidSoilTemp = typeof soilTemp === 'number' && isFinite(soilTemp);
    if (hasValidSoilTemp) {
      moisturePercent = compensateTemperature_(moisturePercent, soilTemp);
    }
    
    // Limitar valores ao range 0-100%
    moisturePercent = Math.max(0, Math.min(100, moisturePercent));

    // O intertravamento da irrigação consulta a última leitura por canteiro.
    // Persistir esse snapshot evita que a ausência de integração seja tratada
    // como umidade segura.
    if (canteiroId) {
      CacheService.getScriptCache().put(
        'soil_current_' + canteiroId,
        JSON.stringify({ moisture: moisturePercent, timestamp: new Date().getTime() }),
        21600
      );
    }
    
    // Classificar estado da umidade
    var status = classifySoilMoisture_(moisturePercent);
    
    // Gerar alertas se necessário
    var alerts = generateSoilMoistureAlerts_(moisturePercent, status);
    
    // Calcular tendência se há histórico
    var trend = calculateMoistureTrend_(canteiroId, moisturePercent);
    
    return {
      success: true,
      raw: rawVal,
      calibrated: Math.round(moisturePercent * 100) / 100,
      status: status,
      alerts: alerts,
      trend: trend,
      temperatureCorrected: hasValidSoilTemp,
      soilTemp: hasValidSoilTemp ? soilTemp : null,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em calibrateSoilMoisture_: ' + error.message);
    return {
      success: false,
      error: error.message,
      raw: rawVal
    };
  }
}

/**
 * Mapeia valor bruto para porcentagem usando curva não-linear.
 * Sensores capacitivos não têm resposta linear.
 * @private
 */
function mapSoilMoistureNonLinear_(rawVal, calibration) {
  var airVal = calibration.airValue || SOIL_CALIBRATION.AIR_VALUE;
  var waterVal = calibration.waterValue || SOIL_CALIBRATION.WATER_VALUE;
  
  // Mapeamento linear básico
  var linearPercent = ((airVal - rawVal) / (airVal - waterVal)) * 100;
  
  // Aplicar correção não-linear (curva exponencial suave)
  // Sensores capacitivos tendem a ter melhor resolução no meio da faixa
  var normalized = linearPercent / 100;
  var corrected = Math.pow(normalized, 0.9) * 100; // Expoente < 1 suaviza a curva
  
  return corrected;
}

/**
 * Compensa efeito da temperatura na leitura.
 * Capacitância varia com temperatura.
 * @private
 */
function compensateTemperature_(moisturePercent, soilTemp) {
  var tempDiff = soilTemp - SOIL_CALIBRATION.REF_TEMP;
  var correction = moisturePercent * SOIL_CALIBRATION.TEMP_COEFFICIENT * tempDiff;
  
  return moisturePercent - correction;
}

/**
 * Classifica o estado da umidade do solo.
 * @private
 */
function classifySoilMoisture_(moisturePercent) {
  if (moisturePercent < SOIL_CALIBRATION.CRITICAL_LOW) {
    return {
      level: 'critical_low',
      label: 'Estresse hídrico severo',
      color: '#dc2626',
      priority: 5
    };
  }
  
  if (moisturePercent < SOIL_CALIBRATION.WARNING_LOW) {
    return {
      level: 'warning_low',
      label: 'Necessita irrigação',
      color: '#f59e0b',
      priority: 4
    };
  }
  
  if (moisturePercent < SOIL_CALIBRATION.OPTIMAL_MIN) {
    return {
      level: 'below_optimal',
      label: 'Abaixo do ótimo',
      color: '#eab308',
      priority: 3
    };
  }
  
  if (moisturePercent <= SOIL_CALIBRATION.OPTIMAL_MAX) {
    return {
      level: 'optimal',
      label: 'Faixa ótima',
      color: '#22c55e',
      priority: 1
    };
  }
  
  if (moisturePercent <= SOIL_CALIBRATION.WARNING_HIGH) {
    return {
      level: 'above_optimal',
      label: 'Acima do ótimo',
      color: '#eab308',
      priority: 3
    };
  }
  
  if (moisturePercent <= SOIL_CALIBRATION.CRITICAL_HIGH) {
    return {
      level: 'warning_high',
      label: 'Saturação preocupante',
      color: '#f59e0b',
      priority: 4
    };
  }
  
  return {
    level: 'critical_high',
    label: 'Risco de asfixia radicular',
    color: '#dc2626',
    priority: 5
  };
}

/**
 * Gera alertas baseados no estado da umidade.
 * @private
 */
function generateSoilMoistureAlerts_(moisturePercent, status) {
  var alerts = [];
  
  if (status.priority >= 4) {
    alerts.push({
      level: status.priority === 5 ? 'critical' : 'warning',
      type: status.level,
      message: status.label + ': ' + moisturePercent.toFixed(1) + '%',
      value: moisturePercent,
      recommendedAction: getRecommendedAction_(status.level)
    });
  }
  
  return alerts;
}

/**
 * Recomenda ação baseada no estado da umidade.
 * @private
 */
function getRecommendedAction_(level) {
  var actions = {
    critical_low: 'IRRIGAR IMEDIATAMENTE - Risco de perda de plantas',
    warning_low: 'Programar irrigação nas próximas 2 horas',
    below_optimal: 'Monitorar de perto, considerar irrigação preventiva',
    above_optimal: 'Suspender irrigação temporariamente',
    warning_high: 'Verificar drenagem, suspender irrigação',
    critical_high: 'EMERGÊNCIA - Melhorar drenagem urgentemente'
  };
  
  return actions[level] || 'Monitorar';
}

/**
 * Calcula tendência de mudança na umidade.
 * @private
 */
function calculateMoistureTrend_(canteiroId, currentMoisture) {
  if (!canteiroId) return null;
  
  try {
    var cache = CacheService.getScriptCache();
    var key = 'soil_history_' + canteiroId;
    var historyJson = cache.get(key);
    var history = historyJson ? JSON.parse(historyJson) : [];
    
    // Adicionar leitura atual
    history.push({
      moisture: currentMoisture,
      timestamp: new Date().getTime()
    });
    
    // Manter apenas últimas 6 leituras (aprox. 1 hora se lido a cada 10 min)
    if (history.length > 6) {
      history = history.slice(-6);
    }
    
    // Salvar histórico atualizado
    cache.put(key, JSON.stringify(history), 21600);
    
    // Calcular tendência se houver pelo menos 3 pontos
    if (history.length < 3) {
      return { trend: 'insufficient_data', rate: 0 };
    }
    
    // Regressão linear simples
    var n = history.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (var i = 0; i < n; i++) {
      sumX += i;
      sumY += history[i].moisture;
      sumXY += i * history[i].moisture;
      sumX2 += i * i;
    }
    
    var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var avgRate = slope; // Taxa de mudança por leitura
    
    // Classificar tendência
    var trend;
    if (Math.abs(avgRate) < 0.5) {
      trend = 'stable';
    } else if (avgRate > 0) {
      trend = avgRate > 2 ? 'increasing_fast' : 'increasing';
    } else {
      trend = avgRate < -2 ? 'decreasing_fast' : 'decreasing';
    }
    
    return {
      trend: trend,
      rate: Math.round(avgRate * 100) / 100,
      dataPoints: n,
      timeSpanMinutes: Math.round((history[n-1].timestamp - history[0].timestamp) / 60000)
    };
    
  } catch (error) {
    Logger.log('Erro em calculateMoistureTrend_: ' + error.message);
    return { trend: 'error', rate: 0 };
  }
}

/**
 * Obtém calibração específica do canteiro.
 * @private
 */
function getCanteiroCalibration_(canteiroId) {
  if (!canteiroId) {
    return {
      airValue: SOIL_CALIBRATION.AIR_VALUE,
      waterValue: SOIL_CALIBRATION.WATER_VALUE
    };
  }
  
  try {
    // Tentar recuperar calibração específica das propriedades
    var props = PropertiesService.getScriptProperties();
    var calibKey = 'soil_calib_' + canteiroId;
    var calibJson = props.getProperty(calibKey);
    
    if (calibJson) {
      var calib = JSON.parse(calibJson);
      return {
        airValue: calib.airValue || SOIL_CALIBRATION.AIR_VALUE,
        waterValue: calib.waterValue || SOIL_CALIBRATION.WATER_VALUE
      };
    }
  } catch (error) {
    Logger.log('Aviso: calibração personalizada não encontrada para ' + canteiroId);
  }
  
  // Retornar valores padrão
  return {
    airValue: SOIL_CALIBRATION.AIR_VALUE,
    waterValue: SOIL_CALIBRATION.WATER_VALUE
  };
}

/**
 * Define calibração personalizada para um canteiro.
 * @param {string} canteiroId - Identificador do canteiro
 * @param {number} airValue - Valor ADC em ar seco
 * @param {number} waterValue - Valor ADC em água
 * @returns {Object} Resultado da operação
 */
function setCanteiroSoilCalibration_(canteiroId, airValue, waterValue) {
  try {
    if (!canteiroId) {
      return { success: false, error: 'canteiroId obrigatório' };
    }
    
    if (typeof airValue !== 'number' || !isFinite(airValue) ||
        typeof waterValue !== 'number' || !isFinite(waterValue)) {
      return { success: false, error: 'Valores de calibração inválidos' };
    }
    
    if (airValue <= waterValue) {
      return { success: false, error: 'airValue deve ser maior que waterValue' };
    }
    
    var calibration = {
      airValue: airValue,
      waterValue: waterValue,
      calibratedAt: new Date().toISOString()
    };
    
    var props = PropertiesService.getScriptProperties();
    var calibKey = 'soil_calib_' + canteiroId;
    props.setProperty(calibKey, JSON.stringify(calibration));
    
    return {
      success: true,
      message: 'Calibração salva para ' + canteiroId,
      calibration: calibration
    };
    
  } catch (error) {
    Logger.log('Erro em setCanteiroSoilCalibration_: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtém histórico de umidade de um canteiro.
 * @param {string} canteiroId - Identificador do canteiro
 * @returns {Object} Histórico de leituras
 */
function getSoilMoistureHistory(canteiroId) {
  try {
    if (!canteiroId) {
      return { success: false, error: 'canteiroId obrigatório' };
    }
    
    var cache = CacheService.getScriptCache();
    var key = 'soil_history_' + canteiroId;
    var historyJson = cache.get(key);
    
    if (!historyJson) {
      return {
        success: true,
        history: [],
        message: 'Nenhum histórico disponível'
      };
    }
    
    var history = JSON.parse(historyJson);
    
    return {
      success: true,
      history: history.map(function(h) {
        return {
          moisture: h.moisture,
          timestamp: new Date(h.timestamp).toISOString()
        };
      }),
      count: history.length
    };
    
  } catch (error) {
    Logger.log('Erro em getSoilMoistureHistory: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
