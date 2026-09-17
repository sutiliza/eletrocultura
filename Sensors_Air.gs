/**
 * ==============================================================================
 * COMPONENTE: Sensors_Air.gs
 * TÍTULO: Processamento de Sensores de Ar
 * FUNCIONALIDADES:
 *   - Calibração, filtragem e médias móveis para temperatura e umidade relativa do ar.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Db_Leituras.gs, Leituras_Chart.html.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

// Constantes de validação
var AIR_SENSOR_LIMITS = {
  temp: { min: -10, max: 60, alert_min: 5, alert_max: 45 },
  humidity: { min: 0, max: 100, alert_min: 20, alert_max: 90 }
};

// Buffer circular para médias móveis (armazenado em cache)
var AIR_BUFFER_SIZE = 10;
var EXPONENTIAL_ALPHA = 0.3; // Peso para filtro exponencial

/**
 * Processa leitura de sensores de ar com filtros, validação e detecção de anomalias.
 * @param {number} temp - Temperatura em °C
 * @param {number} humidity - Umidade relativa em %
 * @param {string} canteiroId - Identificador do canteiro
 * @returns {Object} Dados filtrados e alertas
 */
function filterAirData_(temp, humidity, canteiroId) {
  try {
    var cache = CacheService.getScriptCache();
    var bufferKey = 'air_buffer_' + (canteiroId || 'global');
    var lastKey = 'air_last_' + (canteiroId || 'global');
    
    // Validação de entrada
    var validation = validateAirSensorData_(temp, humidity);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        raw: { temp: temp, humidity: humidity }
      };
    }
    
    // Recuperar buffer circular do cache
    var buffer = getAirSensorBuffer_(cache, bufferKey);
    
    // Adicionar nova leitura ao buffer
    buffer.push({ temp: temp, humidity: humidity, timestamp: new Date().getTime() });
    if (buffer.length > AIR_BUFFER_SIZE) {
      buffer.shift();
    }
    
    // Salvar buffer atualizado
    cache.put(bufferKey, JSON.stringify(buffer), 21600); // 6 horas
    
    // Calcular média móvel simples
    var sma = calculateSimpleMovingAverage_(buffer);
    
    // Recuperar última leitura filtrada para filtro exponencial
    var lastFiltered = getLastFilteredReading_(cache, lastKey);
    
    // Aplicar filtro exponencial
    var ema = {
      temp: lastFiltered ? 
        (EXPONENTIAL_ALPHA * temp + (1 - EXPONENTIAL_ALPHA) * lastFiltered.temp) : temp,
      humidity: lastFiltered ? 
        (EXPONENTIAL_ALPHA * humidity + (1 - EXPONENTIAL_ALPHA) * lastFiltered.humidity) : humidity
    };
    
    // Salvar leitura filtrada
    cache.put(lastKey, JSON.stringify(ema), 21600);
    
    // Detectar anomalias
    var anomalies = detectAirAnomalies_(temp, humidity, sma, buffer);
    
    // Gerar alertas se necessário
    var alerts = generateAirAlerts_(temp, humidity, anomalies);
    
    return {
      success: true,
      raw: { temp: temp, humidity: humidity },
      filtered: {
        sma: sma,
        ema: ema
      },
      anomalies: anomalies,
      alerts: alerts,
      bufferSize: buffer.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em filterAirData_: ' + error.message);
    return {
      success: false,
      error: error.message,
      raw: { temp: temp, humidity: humidity }
    };
  }
}

/**
 * Valida dados do sensor de ar.
 * @private
 */
function validateAirSensorData_(temp, humidity) {
  if (typeof temp !== 'number' || !isFinite(temp)) {
    return { valid: false, error: 'Temperatura inválida' };
  }
  if (typeof humidity !== 'number' || !isFinite(humidity)) {
    return { valid: false, error: 'Umidade inválida' };
  }
  if (temp < AIR_SENSOR_LIMITS.temp.min || temp > AIR_SENSOR_LIMITS.temp.max) {
    return { valid: false, error: 'Temperatura fora dos limites físicos' };
  }
  if (humidity < AIR_SENSOR_LIMITS.humidity.min || humidity > AIR_SENSOR_LIMITS.humidity.max) {
    return { valid: false, error: 'Umidade fora dos limites físicos' };
  }
  return { valid: true };
}

/**
 * Recupera buffer de leituras do cache.
 * @private
 */
function getAirSensorBuffer_(cache, key) {
  try {
    var cached = cache.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    Logger.log('Erro ao recuperar buffer: ' + error.message);
  }
  return [];
}

/**
 * Recupera última leitura filtrada do cache.
 * @private
 */
function getLastFilteredReading_(cache, key) {
  try {
    var cached = cache.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    Logger.log('Erro ao recuperar última leitura: ' + error.message);
  }
  return null;
}

/**
 * Calcula média móvel simples.
 * @private
 */
function calculateSimpleMovingAverage_(buffer) {
  if (buffer.length === 0) {
    return { temp: null, humidity: null };
  }
  
  var sum = buffer.reduce(function(acc, reading) {
    return {
      temp: acc.temp + reading.temp,
      humidity: acc.humidity + reading.humidity
    };
  }, { temp: 0, humidity: 0 });
  
  return {
    temp: Math.round((sum.temp / buffer.length) * 100) / 100,
    humidity: Math.round((sum.humidity / buffer.length) * 100) / 100
  };
}

/**
 * Detecta anomalias comparando com histórico.
 * @private
 */
function detectAirAnomalies_(temp, humidity, sma, buffer) {
  var anomalies = [];
  
  if (buffer.length < 3) {
    return anomalies; // Não há histórico suficiente
  }
  
  // Calcular desvio padrão
  var tempStdDev = calculateStdDev_(buffer.map(function(r) { return r.temp; }));
  var humidityStdDev = calculateStdDev_(buffer.map(function(r) { return r.humidity; }));
  
  // Detectar outliers (mais de 2 desvios padrão da média)
  if (sma.temp !== null && Math.abs(temp - sma.temp) > 2 * tempStdDev) {
    anomalies.push({
      type: 'outlier',
      sensor: 'temperatura',
      value: temp,
      mean: sma.temp,
      stdDev: tempStdDev,
      severity: Math.abs(temp - sma.temp) > 3 * tempStdDev ? 'high' : 'medium'
    });
  }
  
  if (sma.humidity !== null && Math.abs(humidity - sma.humidity) > 2 * humidityStdDev) {
    anomalies.push({
      type: 'outlier',
      sensor: 'umidade',
      value: humidity,
      mean: sma.humidity,
      stdDev: humidityStdDev,
      severity: Math.abs(humidity - sma.humidity) > 3 * humidityStdDev ? 'high' : 'medium'
    });
  }
  
  // Detectar mudanças bruscas (comparar com leitura anterior)
  if (buffer.length >= 2) {
    var prev = buffer[buffer.length - 2];
    var tempChange = Math.abs(temp - prev.temp);
    var humidityChange = Math.abs(humidity - prev.humidity);
    
    if (tempChange > 5) {
      anomalies.push({
        type: 'sudden_change',
        sensor: 'temperatura',
        change: tempChange,
        severity: tempChange > 10 ? 'high' : 'medium'
      });
    }
    
    if (humidityChange > 15) {
      anomalies.push({
        type: 'sudden_change',
        sensor: 'umidade',
        change: humidityChange,
        severity: humidityChange > 25 ? 'high' : 'medium'
      });
    }
  }
  
  return anomalies;
}

/**
 * Calcula desvio padrão.
 * @private
 */
function calculateStdDev_(values) {
  if (values.length === 0) return 0;
  
  var mean = values.reduce(function(sum, val) { return sum + val; }, 0) / values.length;
  var variance = values.reduce(function(sum, val) {
    return sum + Math.pow(val - mean, 2);
  }, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Gera alertas baseados nos limites e anomalias.
 * @private
 */
function generateAirAlerts_(temp, humidity, anomalies) {
  var alerts = [];
  
  // Alertas de limites
  if (temp < AIR_SENSOR_LIMITS.temp.alert_min) {
    alerts.push({
      level: 'warning',
      type: 'low_temperature',
      message: 'Temperatura abaixo do ideal: ' + temp + '°C',
      threshold: AIR_SENSOR_LIMITS.temp.alert_min
    });
  }
  
  if (temp > AIR_SENSOR_LIMITS.temp.alert_max) {
    alerts.push({
      level: 'warning',
      type: 'high_temperature',
      message: 'Temperatura acima do ideal: ' + temp + '°C',
      threshold: AIR_SENSOR_LIMITS.temp.alert_max
    });
  }
  
  if (humidity < AIR_SENSOR_LIMITS.humidity.alert_min) {
    alerts.push({
      level: 'warning',
      type: 'low_humidity',
      message: 'Umidade baixa: ' + humidity + '%',
      threshold: AIR_SENSOR_LIMITS.humidity.alert_min
    });
  }
  
  if (humidity > AIR_SENSOR_LIMITS.humidity.alert_max) {
    alerts.push({
      level: 'warning',
      type: 'high_humidity',
      message: 'Umidade alta: ' + humidity + '%',
      threshold: AIR_SENSOR_LIMITS.humidity.alert_max
    });
  }
  
  // Alertas de anomalias de alta severidade
  anomalies.forEach(function(anomaly) {
    if (anomaly.severity === 'high') {
      alerts.push({
        level: 'alert',
        type: 'anomaly_detected',
        message: 'Anomalia detectada: ' + anomaly.type + ' em ' + anomaly.sensor,
        anomaly: anomaly
      });
    }
  });
  
  return alerts;
}

/**
 * Obtém estatísticas do buffer de ar de um canteiro.
 * @param {string} canteiroId - Identificador do canteiro
 * @returns {Object} Estatísticas do buffer
 */
function getAirSensorStats(canteiroId) {
  try {
    var cache = CacheService.getScriptCache();
    var bufferKey = 'air_buffer_' + (canteiroId || 'global');
    var buffer = getAirSensorBuffer_(cache, bufferKey);
    
    if (buffer.length === 0) {
      return {
        success: false,
        message: 'Nenhum dado disponível'
      };
    }
    
    var temps = buffer.map(function(r) { return r.temp; });
    var humidities = buffer.map(function(r) { return r.humidity; });
    
    return {
      success: true,
      count: buffer.length,
      temperature: {
        min: Math.min.apply(null, temps),
        max: Math.max.apply(null, temps),
        mean: temps.reduce(function(sum, v) { return sum + v; }, 0) / temps.length,
        stdDev: calculateStdDev_(temps)
      },
      humidity: {
        min: Math.min.apply(null, humidities),
        max: Math.max.apply(null, humidities),
        mean: humidities.reduce(function(sum, v) { return sum + v; }, 0) / humidities.length,
        stdDev: calculateStdDev_(humidities)
      },
      oldestReading: new Date(buffer[0].timestamp).toISOString(),
      newestReading: new Date(buffer[buffer.length - 1].timestamp).toISOString()
    };
  } catch (error) {
    Logger.log('Erro em getAirSensorStats: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
