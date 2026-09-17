/**
 * ==============================================================================
 * COMPONENTE: Actuators_PEMF.gs
 * TÍTULO: Controle de Atuadores PEMF
 * FUNCIONALIDADES:
 *   - Configura o ciclo de trabalho (duty cycle) e frequências PWM das bobinas de cobre ativas.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - ICR_Calc.gs, Canteiro_PEMFAtivo.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

// Constantes de segurança e operação PEMF
var PEMF_LIMITS = {
  // Limites de frequência (Hz)
  MIN_FREQUENCY: 0.1,
  MAX_FREQUENCY: 100,
  SAFE_FREQUENCY_MAX: 50,  // Limite seguro conservador
  
  // Limites de duty cycle (%)
  MIN_DUTY: 10,
  MAX_DUTY: 90,
  DEFAULT_DUTY: 50,
  
  // Limites de intensidade (0-100)
  MIN_INTENSITY: 0,
  MAX_INTENSITY: 100,
  DEFAULT_INTENSITY: 50,
  
  // Durações (segundos)
  MIN_SESSION_DURATION: 60,      // 1 minuto
  MAX_SESSION_DURATION: 14400,   // 4 horas
  DEFAULT_SESSION_DURATION: 3600, // 1 hora
  
  // Limites de operação diária
  MAX_DAILY_HOURS: 12,
  COOLDOWN_PERIOD: 1800,  // 30 min entre sessões
  
  // Campo magnético terrestre (Tesla)
  EARTH_B_FIELD_DEFAULT: 50e-6,  // 50 µT (Brasília aprox.)
  EARTH_B_FIELD_MIN: 25e-6,
  EARTH_B_FIELD_MAX: 65e-6,
  
  // Íons biológicos suportados
  SUPPORTED_IONS: ['K+', 'Ca2+', 'Mg2+', 'Fe2+', 'Zn2+']
};

/**
 * Atualiza parâmetros PEMF com validação completa e cálculo ICR.
 * @param {string} canteiroId - Identificador do canteiro
 * @param {number} frequency - Frequência em Hz
 * @param {number} intensity - Intensidade (0-100)
 * @param {Object} options - Opções adicionais
 * @returns {Object} Resultado da operação
 */
function updatePEMFParameters_(canteiroId, frequency, intensity, options) {
  try {
    options = options || {};
    var startTime = new Date();
    
    // Validação básica
    var validation = validatePEMFRequest_(canteiroId, frequency, intensity, options);
    if (!validation.valid) {
      logPEMFEvent_(canteiroId, 'REJECTED', {
        reason: validation.error,
        frequency: frequency,
        intensity: intensity
      });
      
      return {
        success: false,
        error: validation.error,
        details: validation.details
      };
    }

    if (validation.isShutdown) {
      return stopPEMF_(canteiroId, options.userId || 'safety');
    }
    
    // Ajustar parâmetros validados
    frequency = validation.adjustedFrequency;
    intensity = validation.adjustedIntensity;
    var duty = options.duty || PEMF_LIMITS.DEFAULT_DUTY;
    duty = Math.max(PEMF_LIMITS.MIN_DUTY, Math.min(PEMF_LIMITS.MAX_DUTY, duty));
    
    // Verificar se frequência é ressonante (ICR)
    var icrAnalysis = analyzeICRResonance_(frequency, options.bField);
    
    // Verificar condições de segurança
    var safetyCheck = checkPEMFSafety_(canteiroId, frequency, intensity, options);
    // Não há override recebido do cliente: uma leitura insegura sempre bloqueia.
    if (!safetyCheck.safe) {
      logPEMFEvent_(canteiroId, 'BLOCKED_SAFETY', {
        reason: safetyCheck.reason,
        frequency: frequency,
        intensity: intensity
      });
      
      return {
        success: false,
        error: 'Bloqueado por segurança: ' + safetyCheck.reason,
        safetyCheck: safetyCheck
      };
    }
    
    // Verificar throttling
    var throttle = checkPEMFThrottle_(canteiroId);
    if (!throttle.allowed && !options.force) {
      logPEMFEvent_(canteiroId, 'THROTTLED', {
        reason: throttle.reason,
        frequency: frequency
      });
      
      return {
        success: false,
        error: 'Limite de operação: ' + throttle.reason,
        throttle: throttle
      };
    }
    
    // Calcular parâmetros PWM
    var pwmParams = calculatePWMParameters_(frequency, duty, intensity);
    
    // Executar comando
    var command = executePEMFCommand_(canteiroId, pwmParams);
    
    if (!command.success) {
      logPEMFEvent_(canteiroId, 'COMMAND_FAILED', {
        error: command.error,
        frequency: frequency
      });
      
      return {
        success: false,
        error: 'Falha ao enviar comando: ' + command.error
      };
    }
    
    // Registrar ativação
    var sessionDuration = options.duration || PEMF_LIMITS.DEFAULT_SESSION_DURATION;
    recordPEMFActivation_(canteiroId, frequency, intensity, duty, sessionDuration, options);
    
    // Log de auditoria
    logPEMFEvent_(canteiroId, 'ACTIVATED', {
      frequency: frequency,
      intensity: intensity,
      duty: duty,
      pwmParams: pwmParams,
      icrAnalysis: icrAnalysis,
      sessionDuration: sessionDuration,
      manual: options.manual || false,
      userId: options.userId
    });
    
    // Auditoria central
    if (typeof logAudit === 'function' && options.userId) {
      logAudit(
        options.userId,
        'PEMF_ACTIVATED',
        'Canteiro: ' + canteiroId + ', Freq: ' + frequency + 'Hz, Int: ' + intensity + '%'
      );
    }
    
    return {
      success: true,
      status: 'UPDATED',
      canteiroId: canteiroId,
      parameters: {
        frequency: frequency,
        intensity: intensity,
        duty: duty
      },
      pwmParams: pwmParams,
      icrAnalysis: icrAnalysis,
      sessionDuration: sessionDuration,
      estimatedEndTime: new Date(startTime.getTime() + sessionDuration * 1000).toISOString(),
      timestamp: startTime.toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em updatePEMFParameters_: ' + error.message);
    
    logPEMFEvent_(canteiroId, 'ERROR', {
      error: error.message,
      frequency: frequency,
      intensity: intensity
    });
    
    return {
      success: false,
      error: 'Erro interno: ' + error.message
    };
  }
}

/**
 * Valida requisição PEMF.
 * @private
 */
function validatePEMFRequest_(canteiroId, frequency, intensity, options) {
  // Validar canteiroId
  if (!canteiroId || typeof canteiroId !== 'string') {
    return {
      valid: false,
      error: 'canteiroId inválido ou ausente'
    };
  }
  
  // Desligamento (ALL com freq 0)
  if (canteiroId === 'ALL' && frequency === 0) {
    return {
      valid: true,
      adjustedFrequency: 0,
      adjustedIntensity: 0,
      isShutdown: true
    };
  }
  
  // Validar frequência
  if (typeof frequency !== 'number' || !isFinite(frequency)) {
    return {
      valid: false,
      error: 'Frequência inválida'
    };
  }
  
  // Validar intensidade
  if (typeof intensity !== 'number' || !isFinite(intensity)) {
    return {
      valid: false,
      error: 'Intensidade inválida'
    };
  }
  
  // Ajustar aos limites
  var adjustedFrequency = frequency;
  var adjustedIntensity = intensity;
  
  if (frequency < PEMF_LIMITS.MIN_FREQUENCY) {
    adjustedFrequency = PEMF_LIMITS.MIN_FREQUENCY;
  }
  
  if (frequency > PEMF_LIMITS.MAX_FREQUENCY) {
    adjustedFrequency = PEMF_LIMITS.MAX_FREQUENCY;
  }
  
  if (intensity < PEMF_LIMITS.MIN_INTENSITY) {
    adjustedIntensity = PEMF_LIMITS.MIN_INTENSITY;
  }
  
  if (intensity > PEMF_LIMITS.MAX_INTENSITY) {
    adjustedIntensity = PEMF_LIMITS.MAX_INTENSITY;
  }
  
  return {
    valid: true,
    adjustedFrequency: adjustedFrequency,
    adjustedIntensity: adjustedIntensity,
    wasAdjusted: adjustedFrequency !== frequency || adjustedIntensity !== intensity
  };
}

/**
 * Analisa se frequência é ressonante (ICR).
 * @private
 */
function analyzeICRResonance_(frequency, bField) {
  try {
    bField = bField || PEMF_LIMITS.EARTH_B_FIELD_DEFAULT;
    
    // Validar campo magnético
    if (bField < PEMF_LIMITS.EARTH_B_FIELD_MIN || bField > PEMF_LIMITS.EARTH_B_FIELD_MAX) {
      bField = PEMF_LIMITS.EARTH_B_FIELD_DEFAULT;
    }
    
    var resonances = {};
    var closestMatch = null;
    var minDiff = Infinity;
    
    // Calcular ICR para cada íon
    PEMF_LIMITS.SUPPORTED_IONS.forEach(function(ion) {
      if (typeof getICRFrequency === 'function') {
        try {
          var icrFreq = getICRFrequency(ion, bField);
          var diff = Math.abs(frequency - icrFreq);
          var tolerance = icrFreq * 0.05; // 5% de tolerância
          
          resonances[ion] = {
            frequency: Math.round(icrFreq * 1000) / 1000,
            difference: Math.round(diff * 1000) / 1000,
            isResonant: diff <= tolerance,
            tolerance: Math.round(tolerance * 1000) / 1000
          };
          
          if (diff < minDiff) {
            minDiff = diff;
            closestMatch = {
              ion: ion,
              frequency: icrFreq,
              difference: diff
            };
          }
        } catch (error) {
          Logger.log('Erro ao calcular ICR para ' + ion + ': ' + error.message);
        }
      }
    });
    
    return {
      bField: bField,
      requestedFrequency: frequency,
      resonances: resonances,
      closestMatch: closestMatch,
      isAnyResonant: Object.keys(resonances).some(function(ion) {
        return resonances[ion].isResonant;
      })
    };
    
  } catch (error) {
    Logger.log('Erro em analyzeICRResonance_: ' + error.message);
    return {
      error: error.message,
      requestedFrequency: frequency
    };
  }
}

/**
 * Verifica condições de segurança PEMF.
 * @private
 */
function checkPEMFSafety_(canteiroId, frequency, intensity, options) {
  var issues = [];
  
  // Verificar se frequência está em faixa segura
  if (frequency > PEMF_LIMITS.SAFE_FREQUENCY_MAX && !options.highFreqApproved) {
    issues.push('Frequência acima do limite seguro conservador (' + PEMF_LIMITS.SAFE_FREQUENCY_MAX + 'Hz)');
  }
  
  // Verificar sistema de segurança global
  if (typeof checkSafetyLimits === 'function') {
    try {
      var envData = getCanteiroEnvironment_(canteiroId);
      if (envData.temp === null || envData.moisture === null) {
        issues.push('Leituras ambientais indisponíveis - operação bloqueada');
      } else {
      var safetyOk = checkSafetyLimits(
        envData.temp || 25,
        envData.moisture || 50,
        null
      );
      
      if (!safetyOk) {
        issues.push('Sistema de segurança global bloqueou operação');
      }
      }
    } catch (error) {
      Logger.log('Aviso: checkSafetyLimits falhou: ' + error.message);
      issues.push('Não foi possível confirmar os limites de segurança');
    }
  }
  
  // Verificar se há plantas no canteiro
  var canteiroStatus = getCanteiroStatus_(canteiroId);
  if (canteiroStatus && !canteiroStatus.hasPlants) {
    issues.push('Canteiro sem plantas ativas');
  }
  
  return {
    safe: issues.length === 0,
    reason: issues.join('; '),
    issues: issues
  };
}

/**
 * Verifica throttling PEMF.
 * @private
 */
function checkPEMFThrottle_(canteiroId) {
  // Verificar cooldown
  var lastActivationKey = 'pemf_last_' + canteiroId;
  var lastActivation = getActuatorState_(lastActivationKey);
  
  if (lastActivation) {
    var timeSince = new Date().getTime() - parseInt(lastActivation);
    var cooldownRemaining = PEMF_LIMITS.COOLDOWN_PERIOD * 1000 - timeSince;
    
    if (cooldownRemaining > 0) {
      return {
        allowed: false,
        reason: 'Aguardar período de cooldown',
        cooldownRemaining: Math.ceil(cooldownRemaining / 60000) + ' minutos'
      };
    }
  }
  
  // Verificar limite diário de horas
  var today = new Date().toISOString().split('T')[0];
  var dailyHoursKey = 'pemf_hours_' + canteiroId + '_' + today;
  var dailyHours = parseFloat(getActuatorState_(dailyHoursKey) || '0');
  
  if (dailyHours >= PEMF_LIMITS.MAX_DAILY_HOURS) {
    return {
      allowed: false,
      reason: 'Limite diário de horas atingido',
      dailyHours: dailyHours,
      maxAllowed: PEMF_LIMITS.MAX_DAILY_HOURS
    };
  }
  
  return {
    allowed: true,
    dailyHours: dailyHours
  };
}

/**
 * Calcula parâmetros PWM para o ESP32.
 * @private
 */
function calculatePWMParameters_(frequency, duty, intensity) {
  // ESP32-S3 LEDC: frequência base 80MHz
  var ledc_base = 80000000;
  
  // Calcular divisor de clock para frequência desejada
  // resolution = 13 bits (8192 steps) é bom compromisso
  var resolution = 13;
  var max_count = Math.pow(2, resolution) - 1;
  
  var prescaler = Math.floor(ledc_base / (frequency * max_count));
  var actual_frequency = ledc_base / (prescaler * max_count);
  
  // Calcular duty count
  var duty_count = Math.floor((duty / 100) * max_count);
  
  // Ajustar duty por intensidade
  var intensity_factor = intensity / 100;
  var adjusted_duty_count = Math.floor(duty_count * intensity_factor);
  
  return {
    frequency: Math.round(actual_frequency * 1000) / 1000,
    duty: duty,
    intensity: intensity,
    pwm: {
      prescaler: prescaler,
      resolution: resolution,
      max_count: max_count,
      duty_count: adjusted_duty_count,
      actual_duty: Math.round((adjusted_duty_count / max_count) * 10000) / 100
    }
  };
}

/**
 * Executa comando PEMF.
 * @private
 */
function executePEMFCommand_(canteiroId, pwmParams) {
  try {
    var command = {
      type: 'PEMF_CONTROL',
      canteiroId: canteiroId,
      action: 'UPDATE',
      pwm: pwmParams.pwm,
      timestamp: new Date().toISOString()
    };
    
    var endpoint = PropertiesService.getScriptProperties().getProperty('PEMF_ENDPOINT');
    if (!endpoint) {
      return { success: false, error: 'PEMF_ENDPOINT não configurado; nenhum comando foi enviado.' };
    }
    var response = UrlFetchApp.fetch(endpoint, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(command),
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
    Logger.log('Erro ao executar comando PEMF: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Registra ativação PEMF.
 * @private
 */
function recordPEMFActivation_(canteiroId, frequency, intensity, duty, duration, options) {
  options = options || {};
  var now = new Date().getTime();
  
  // Registrar timestamp
  setActuatorState_('pemf_last_' + canteiroId, now.toString(), 21600);
  
  // Atualizar contador de horas diário
  var today = new Date().toISOString().split('T')[0];
  var dailyHoursKey = 'pemf_hours_' + canteiroId + '_' + today;
  var currentHours = parseFloat(getActuatorState_(dailyHoursKey) || '0');
  var sessionHours = duration / 3600;
  setActuatorState_(dailyHoursKey, (currentHours + sessionHours).toString(), 21600);
  
  // Adicionar ao histórico
  var historyKey = 'pemf_history_' + canteiroId;
  appendActuatorHistory_(historyKey, {
    timestamp: now,
    frequency: frequency,
    intensity: intensity,
    duty: duty,
    duration: duration,
    manual: options.manual || false,
    userId: options.userId || 'system'
  }, 20);
}

/**
 * Registra evento PEMF.
 * @private
 */
function logPEMFEvent_(canteiroId, eventType, details) {
  try {
    var logEntry = {
      timestamp: new Date().toISOString(),
      canteiroId: canteiroId,
      eventType: eventType,
      details: details
    };
    
    Logger.log('PEMFLog: ' + JSON.stringify(logEntry));
    
    if (typeof insertRow === 'function' && typeof SHEETS !== 'undefined' && SHEETS.PEMF_LOGS) {
      try {
        insertRow(SHEETS.PEMF_LOGS, [
          new Date(),
          canteiroId,
          eventType,
          JSON.stringify(details)
        ]);
      } catch (error) {
        Logger.log('Aviso: não foi possível persistir log PEMF na planilha');
      }
    }
  } catch (error) {
    Logger.log('Erro em logPEMFEvent_: ' + error.message);
  }
}

/**
 * Obtém ambiente do canteiro.
 * @private
 */
function getCanteiroEnvironment_(canteiroId) {
  try {
    var cache = CacheService.getScriptCache();
    var airKey = 'air_last_' + canteiroId;
    var soilKey = 'soil_current_' + canteiroId;
    
    var airData = cache.get(airKey);
    var soilData = cache.get(soilKey);
    
    return {
      temp: airData ? JSON.parse(airData).temp : null,
      humidity: airData ? JSON.parse(airData).humidity : null,
      moisture: soilData ? JSON.parse(soilData).moisture : null
    };
  } catch (error) {
    return { temp: null, humidity: null, moisture: null };
  }
}

/**
 * Obtém status do canteiro.
 * @private
 */
function getCanteiroStatus_(canteiroId) {
  try {
    if (typeof getCanteiros !== 'function') return { hasPlants: false, reason: 'Cadastro de canteiros indisponível' };
    var rows = getCanteiros() || [];
    var found = rows.filter(function (row) {
      return String(row.ID || row.id || row.codigo || '') === String(canteiroId);
    })[0];
    if (!found) return { hasPlants: false, reason: 'Canteiro não encontrado' };
    var status = String(found.Status || found.status || '').toLowerCase();
    var hasPlants = found.hasPlants !== false && found.plantasAtivas !== false && status !== 'inativo';
    return { hasPlants: hasPlants, status: status };
  } catch (error) {
    return { hasPlants: false, reason: 'Não foi possível confirmar o canteiro' };
  }
}

/**
 * Desliga PEMF de um canteiro.
 * @param {string} canteiroId - Identificador do canteiro
 * @param {string} userId - ID do usuário
 * @returns {Object} Resultado da operação
 */
function stopPEMF_(canteiroId, userId) {
  try {
    var endpoint = PropertiesService.getScriptProperties().getProperty('PEMF_ENDPOINT');
    if (!endpoint) {
      return { success: false, error: 'PEMF_ENDPOINT não configurado; a parada não foi confirmada.' };
    }
    var command = {
      type: 'PEMF_CONTROL',
      canteiroId: canteiroId,
      action: 'STOP',
      pwm: { duty_count: 0 },
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
    
    logPEMFEvent_(canteiroId, 'STOPPED_MANUALLY', {
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    if (typeof logAudit === 'function' && userId) {
      logAudit(userId, 'PEMF_STOPPED', 'Canteiro: ' + canteiroId);
    }
    
    return {
      success: true,
      action: 'STOP',
      canteiroId: canteiroId,
      responseCode: responseCode,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em stopPEMF_: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calcula frequência ICR para íon específico.
 * @param {string} ion - Íon (K+, Ca2+, Mg2+, etc)
 * @param {number} bField - Campo magnético (Tesla)
 * @returns {Object} Frequência calculada
 */
function calculateICRForIon(ion, bField) {
  try {
    bField = bField || PEMF_LIMITS.EARTH_B_FIELD_DEFAULT;
    
    if (PEMF_LIMITS.SUPPORTED_IONS.indexOf(ion) === -1) {
      return {
        success: false,
        error: 'Íon não suportado. Use: ' + PEMF_LIMITS.SUPPORTED_IONS.join(', ')
      };
    }
    
    if (typeof getICRFrequency !== 'function') {
      return {
        success: false,
        error: 'Função getICRFrequency não disponível'
      };
    }
    
    var frequency = getICRFrequency(ion, bField);
    
    return {
      success: true,
      ion: ion,
      bField: bField,
      frequency: Math.round(frequency * 1000) / 1000,
      unit: 'Hz'
    };
    
  } catch (error) {
    Logger.log('Erro em calculateICRForIon: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtém histórico PEMF de um canteiro.
 * @param {string} canteiroId - Identificador do canteiro
 * @returns {Object} Histórico
 */
function getPEMFHistory_(canteiroId) {
  try {
    var historyKey = 'pemf_history_' + canteiroId;
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
          frequency: h.frequency,
          intensity: h.intensity,
          duty: h.duty,
          duration: h.duration,
          manual: h.manual,
          userId: h.userId
        };
      }),
      count: history.length
    };
    
  } catch (error) {
    Logger.log('Erro em getPEMFHistory: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
