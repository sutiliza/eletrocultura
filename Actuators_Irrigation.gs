/**
 * ==============================================================================
 * COMPONENTE: Actuators_Irrigation.gs
 * TÍTULO: Controle de Atuadores de Irrigação
 * FUNCIONALIDADES:
 *   - Comanda o acionamento de válvulas solenoides baseado em regras de segurança e World Model.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Sensors_Soil.gs, Safety_Core.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

// Constantes de segurança para irrigação
var IRRIGATION_LIMITS = {
  MIN_DURATION: 5,           // Duração mínima (segundos)
  MAX_DURATION: 600,         // Duração máxima (10 minutos)
  DEFAULT_DURATION: 60,      // Duração padrão (1 minuto)
  
  COOLDOWN_PERIOD: 1800,     // Período de espera entre acionamentos (30 min)
  MAX_DAILY_ACTIVATIONS: 6,  // Máximo de acionamentos por dia
  
  MIN_SOIL_MOISTURE: 15,     // Não irrigar se umidade abaixo disso (sensor defeituoso?)
  MAX_SOIL_MOISTURE: 85,     // Não irrigar se umidade acima disso
  
  RAIN_THRESHOLD_MM: 5,      // Não irrigar se choveu mais que isso nas últimas horas
  
  NIGHT_MODE_START: 20,      // Hora de início do modo noturno (20h)
  NIGHT_MODE_END: 6,         // Hora de fim do modo noturno (6h)
  NIGHT_MODE_MAX_DURATION: 300  // Duração máxima no período noturno (5 min)
};

/**
 * Aciona irrigação com validações de segurança completas.
 * @param {string} canteiroId - Identificador do canteiro
 * @param {number} durationSeconds - Duração em segundos
 * @param {Object} options - Opções adicionais (manual, force, userId)
 * @returns {Object} Resultado da operação
 */
function triggerIrrigation_(canteiroId, durationSeconds, options) {
  try {
    options = options || {};
    var startTime = new Date();
    
    // Validação básica
    var validation = validateIrrigationRequest_(canteiroId, durationSeconds, options);
    if (!validation.valid) {
      logIrrigationEvent_(canteiroId, 'REJECTED', {
        reason: validation.error,
        duration: durationSeconds,
        userId: options.userId
      });
      
      return {
        success: false,
        error: validation.error,
        details: validation.details
      };
    }
    
    // Ajustar duração validada
    durationSeconds = validation.adjustedDuration;
    
    // Verificar condições de segurança
    var safetyCheck = checkIrrigationSafety_(canteiroId, durationSeconds, options);
    // Um override vindo do cliente não pode contornar o intertravamento.
    // Liberações excepcionais devem ser implementadas numa rotina administrativa
    // autenticada, com auditoria própria.
    if (!safetyCheck.safe) {
      logIrrigationEvent_(canteiroId, 'BLOCKED_SAFETY', {
        reason: safetyCheck.reason,
        duration: durationSeconds,
        userId: options.userId
      });
      
      return {
        success: false,
        error: 'Bloqueado por segurança: ' + safetyCheck.reason,
        safetyCheck: safetyCheck,
        canOverride: safetyCheck.canOverride
      };
    }
    
    // Verificar cooldown e limites diários
    var throttle = checkIrrigationThrottle_(canteiroId);
    if (!throttle.allowed && !options.force) {
      logIrrigationEvent_(canteiroId, 'THROTTLED', {
        reason: throttle.reason,
        duration: durationSeconds,
        userId: options.userId
      });
      
      return {
        success: false,
        error: 'Limite de acionamento: ' + throttle.reason,
        throttle: throttle
      };
    }
    
    // Executar acionamento
    var command = executeIrrigationCommand_(canteiroId, durationSeconds);
    
    if (!command.success) {
      logIrrigationEvent_(canteiroId, 'COMMAND_FAILED', {
        error: command.error,
        duration: durationSeconds,
        userId: options.userId
      });
      
      return {
        success: false,
        error: 'Falha ao enviar comando: ' + command.error
      };
    }
    
    // Registrar acionamento bem-sucedido
    recordIrrigationActivation_(canteiroId, durationSeconds, options);
    
    // Programar verificação de timeout
    scheduleIrrigationTimeout_(canteiroId, durationSeconds);
    
    // Log de auditoria
    logIrrigationEvent_(canteiroId, 'ACTIVATED', {
      duration: durationSeconds,
      manual: options.manual || false,
      userId: options.userId,
      forced: options.force || false,
      executionTime: new Date().getTime() - startTime.getTime()
    });
    
    // Enviar para auditoria central se disponível
    if (typeof logAudit === 'function' && options.userId) {
      logAudit(
        options.userId,
        'IRRIGATION_ACTIVATED',
        'Canteiro: ' + canteiroId + ', Duração: ' + durationSeconds + 's'
      );
    }
    
    return {
      success: true,
      action: 'IRRIGATE',
      canteiroId: canteiroId,
      duration: durationSeconds,
      estimatedStopTime: new Date(startTime.getTime() + durationSeconds * 1000).toISOString(),
      command: command,
      timestamp: startTime.toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em triggerIrrigation_: ' + error.message);
    
    logIrrigationEvent_(canteiroId, 'ERROR', {
      error: error.message,
      duration: durationSeconds
    });
    
    return {
      success: false,
      error: 'Erro interno: ' + error.message
    };
  }
}

/**
 * Valida requisição de irrigação.
 * @private
 */
function validateIrrigationRequest_(canteiroId, durationSeconds, options) {
  // Validar canteiroId
  if (!canteiroId || typeof canteiroId !== 'string') {
    return {
      valid: false,
      error: 'canteiroId inválido ou ausente'
    };
  }
  
  // Validar duração
  if (typeof durationSeconds !== 'number' || !isFinite(durationSeconds)) {
    return {
      valid: false,
      error: 'Duração inválida'
    };
  }
  
  // Ajustar duração aos limites
  var adjustedDuration = durationSeconds;
  var nightMode = isNightMode_();
  
  if (durationSeconds < IRRIGATION_LIMITS.MIN_DURATION) {
    adjustedDuration = IRRIGATION_LIMITS.MIN_DURATION;
  }
  
  var maxDuration = nightMode ? 
    IRRIGATION_LIMITS.NIGHT_MODE_MAX_DURATION : 
    IRRIGATION_LIMITS.MAX_DURATION;
  
  if (durationSeconds > maxDuration) {
    adjustedDuration = maxDuration;
  }
  
  return {
    valid: true,
    adjustedDuration: adjustedDuration,
    wasAdjusted: adjustedDuration !== durationSeconds,
    nightMode: nightMode
  };
}

/**
 * Verifica condições de segurança para irrigação.
 * @private
 */
function checkIrrigationSafety_(canteiroId, durationSeconds, options) {
  var issues = [];
  var canOverride = true;
  
  // Obter leitura atual de umidade do solo
  var soilMoisture = getCurrentSoilMoisture_(canteiroId);
  
  if (soilMoisture !== null) {
    // Umidade muito baixa - sensor pode estar com defeito
    if (soilMoisture < IRRIGATION_LIMITS.MIN_SOIL_MOISTURE) {
      issues.push('Umidade do solo muito baixa (' + soilMoisture + '%) - verificar sensor');
      canOverride = false; // Crítico, não pode sobrescrever
    }
    
    // Umidade já alta - risco de saturação
    if (soilMoisture > IRRIGATION_LIMITS.MAX_SOIL_MOISTURE) {
      issues.push('Solo já saturado (' + soilMoisture + '%) - risco de asfixia radicular');
    }
  } else {
    issues.push('Leitura de umidade indisponível - operação bloqueada até validar o sensor');
    canOverride = false;
  }
  
  // Verificar se há função de verificação de segurança global
  if (typeof checkSafetyLimits === 'function') {
    try {
      var tempData = getCanteiroTemperature_(canteiroId);
      var safetyOk = checkSafetyLimits(
        tempData.airTemp || 25,
        soilMoisture || 50,
        null
      );
      
      if (!safetyOk) {
        issues.push('Sistema de segurança global bloqueou operação');
        canOverride = false;
      }
    } catch (error) {
      Logger.log('Aviso: checkSafetyLimits falhou: ' + error.message);
    }
  }
  
  // Verificar precipitação recente (se disponível)
  var recentRain = getRecentRainfall_(canteiroId);
  if (recentRain > IRRIGATION_LIMITS.RAIN_THRESHOLD_MM) {
    issues.push('Chuva recente detectada (' + recentRain + 'mm)');
  }
  
  return {
    safe: issues.length === 0,
    reason: issues.join('; '),
    issues: issues,
    canOverride: canOverride,
    soilMoisture: soilMoisture
  };
}

/**
 * Verifica throttling (limites de frequência).
 * @private
 */
function checkIrrigationThrottle_(canteiroId) {
  // Verificar cooldown
  var lastActivationKey = 'irrig_last_' + canteiroId;
  var lastActivation = getActuatorState_(lastActivationKey);
  
  if (lastActivation) {
    var timeSince = new Date().getTime() - parseInt(lastActivation);
    var cooldownRemaining = IRRIGATION_LIMITS.COOLDOWN_PERIOD * 1000 - timeSince;
    
    if (cooldownRemaining > 0) {
      return {
        allowed: false,
        reason: 'Aguardar período de cooldown',
        cooldownRemaining: Math.ceil(cooldownRemaining / 60000) + ' minutos'
      };
    }
  }
  
  // Verificar limite diário
  var today = new Date().toISOString().split('T')[0];
  var dailyCountKey = 'irrig_count_' + canteiroId + '_' + today;
  var dailyCount = parseInt(getActuatorState_(dailyCountKey) || '0');
  
  if (dailyCount >= IRRIGATION_LIMITS.MAX_DAILY_ACTIVATIONS) {
    return {
      allowed: false,
      reason: 'Limite diário de acionamentos atingido',
      dailyCount: dailyCount,
      maxAllowed: IRRIGATION_LIMITS.MAX_DAILY_ACTIVATIONS
    };
  }
  
  return {
    allowed: true,
    dailyCount: dailyCount
  };
}

/**
 * Executa comando de irrigação (interface com hardware).
 * @private
 */
function executeIrrigationCommand_(canteiroId, durationSeconds) {
  try {
    var command = {
      type: 'SOLENOID_CONTROL',
      canteiroId: canteiroId,
      action: 'OPEN',
      duration: durationSeconds,
      timestamp: new Date().toISOString()
    };
    
    var endpoint = PropertiesService.getScriptProperties().getProperty('IRRIGATION_ENDPOINT');
    if (!endpoint) {
      return { success: false, error: 'IRRIGATION_ENDPOINT não configurado; nenhum comando foi enviado.' };
    }
    var response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(command),
      muteHttpExceptions: true
    });
    var responseCode = response.getResponseCode();
    if (responseCode < 200 || responseCode >= 300) {
      return { success: false, error: 'Controlador respondeu HTTP ' + responseCode, responseCode: responseCode };
    }
    return {
      success: true,
      command: command,
      responseCode: responseCode
    };
    
  } catch (error) {
    Logger.log('Erro ao executar comando: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Registra ativação de irrigação em cache e histórico.
 * @private
 */
function recordIrrigationActivation_(canteiroId, durationSeconds, options) {
  options = options || {};
  var now = new Date().getTime();
  
  // Registrar timestamp da última ativação
  setActuatorState_('irrig_last_' + canteiroId, now.toString(), 21600);
  
  // Incrementar contador diário
  var today = new Date().toISOString().split('T')[0];
  var dailyCountKey = 'irrig_count_' + canteiroId + '_' + today;
  var currentCount = parseInt(getActuatorState_(dailyCountKey) || '0');
  setActuatorState_(dailyCountKey, (currentCount + 1).toString(), 21600);
  
  // Adicionar ao histórico
  var historyKey = 'irrig_history_' + canteiroId;
  appendActuatorHistory_(historyKey, {
    timestamp: now,
    duration: durationSeconds,
    manual: options.manual || false,
    userId: options.userId || 'system'
  }, 20);
}

/**
 * Programa desligamento automático por timeout.
 * @private
 */
function scheduleIrrigationTimeout_(canteiroId, durationSeconds) {
  // Em produção, isso seria feito pelo próprio ESP32-S3
  // Aqui registramos para monitoramento
  
  var cache = CacheService.getScriptCache();
  var timeoutKey = 'irrig_timeout_' + canteiroId;
  var timeoutAt = new Date().getTime() + (durationSeconds * 1000);
  
  cache.put(timeoutKey, timeoutAt.toString(), durationSeconds + 60);
}

/**
 * Registra evento de irrigação.
 * @private
 */
function logIrrigationEvent_(canteiroId, eventType, details) {
  try {
    var logEntry = {
      timestamp: new Date().toISOString(),
      canteiroId: canteiroId,
      eventType: eventType,
      details: details
    };
    
    Logger.log('IrrigationLog: ' + JSON.stringify(logEntry));
    
    // Persistir em planilha se função disponível
    if (typeof insertRow === 'function' && typeof SHEETS !== 'undefined' && SHEETS.IRRIGATION_LOGS) {
      try {
        insertRow(SHEETS.IRRIGATION_LOGS, [
          new Date(),
          canteiroId,
          eventType,
          JSON.stringify(details)
        ]);
      } catch (error) {
        Logger.log('Aviso: não foi possível persistir log na planilha');
      }
    }
  } catch (error) {
    Logger.log('Erro em logIrrigationEvent_: ' + error.message);
  }
}

/**
 * Obtém umidade atual do solo.
 * @private
 */
function getCurrentSoilMoisture_(canteiroId) {
  try {
    // Tentar obter do cache (última leitura)
    var cache = CacheService.getScriptCache();
    var key = 'soil_current_' + canteiroId;
    var cached = cache.get(key);
    
    if (cached) {
      var data = JSON.parse(cached);
      return data.moisture;
    }
  } catch (error) {
    Logger.log('Aviso: não foi possível obter umidade atual');
  }
  
  return null;
}

/**
 * Obtém temperatura do canteiro.
 * @private
 */
function getCanteiroTemperature_(canteiroId) {
  try {
    var cache = CacheService.getScriptCache();
    var airKey = 'air_last_' + canteiroId;
    var cached = cache.get(airKey);
    
    if (cached) {
      var data = JSON.parse(cached);
      return {
        airTemp: data.temp,
        humidity: data.humidity
      };
    }
  } catch (error) {
    Logger.log('Aviso: não foi possível obter temperatura');
  }
  
  return { airTemp: null, humidity: null };
}

/**
 * Obtém precipitação recente.
 * @private
 */
function getRecentRainfall_(canteiroId) {
  // TODO: Integrar com sensor de chuva quando disponível
  return 0;
}

/**
 * Verifica se está em modo noturno.
 * @private
 */
function isNightMode_() {
  var hour = new Date().getHours();
  return hour >= IRRIGATION_LIMITS.NIGHT_MODE_START || 
         hour < IRRIGATION_LIMITS.NIGHT_MODE_END;
}

/**
 * Desliga irrigação manualmente.
 * @param {string} canteiroId - Identificador do canteiro
 * @param {string} userId - ID do usuário
 * @returns {Object} Resultado da operação
 */
function stopIrrigation_(canteiroId, userId) {
  try {
    var endpoint = PropertiesService.getScriptProperties().getProperty('IRRIGATION_ENDPOINT');
    if (!endpoint) {
      return { success: false, error: 'IRRIGATION_ENDPOINT não configurado; a parada não foi confirmada.' };
    }
    var command = {
      type: 'SOLENOID_CONTROL', canteiroId: canteiroId, action: 'CLOSE',
      timestamp: new Date().toISOString()
    };
    var response = UrlFetchApp.fetch(endpoint, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(command),
      muteHttpExceptions: true
    });
    var responseCode = response.getResponseCode();
    if (responseCode < 200 || responseCode >= 300) {
      return { success: false, error: 'Controlador respondeu HTTP ' + responseCode, responseCode: responseCode };
    }
    
    logIrrigationEvent_(canteiroId, 'STOPPED_MANUALLY', {
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    if (typeof logAudit === 'function' && userId) {
      logAudit(userId, 'IRRIGATION_STOPPED', 'Canteiro: ' + canteiroId);
    }
    
    return {
      success: true,
      action: 'STOP',
      canteiroId: canteiroId,
      responseCode: responseCode,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em stopIrrigation_: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtém histórico de irrigação de um canteiro.
 * @param {string} canteiroId - Identificador do canteiro
 * @returns {Object} Histórico
 */
function getIrrigationHistory_(canteiroId) {
  try {
    var historyKey = 'irrig_history_' + canteiroId;
    var historyJson = getActuatorState_(historyKey);
    
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
          timestamp: new Date(h.timestamp).toISOString(),
          duration: h.duration,
          manual: h.manual,
          userId: h.userId
        };
      }),
      count: history.length
    };
    
  } catch (error) {
    Logger.log('Erro em getIrrigationHistory_: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
