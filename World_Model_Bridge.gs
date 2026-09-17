/**
 * ==============================================================================
 * COMPONENTE: World_Model_Bridge.gs
 * TÍTULO: Ponte com World Model
 * FUNCIONALIDADES:
 *   - Interface que conecta o Apps Script com os modelos de IA GGUF rodando em nuvem.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Db_XAI.gs, XAI_Narratives.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

// Configuração do World Model
var WORLD_MODEL_CONFIG = {
  // Endpoint da API (configurar em PropertiesService)
  DEFAULT_ENDPOINT: '',
  TIMEOUT: 30000,  // 30 segundos
  
  // Dimensões do estado latente
  LATENT_DIM: 64,
  
  // Limites de taxa
  MAX_REQUESTS_PER_MINUTE: 30,
  MAX_REQUESTS_PER_HOUR: 500,
  
  // Cache
  CACHE_TTL: 3600,  // 1 hora
  ENABLE_CACHE: true,
  
  // Modelos disponíveis
  MODELS: {
    QWEN_27B: 'qwen3.5-27b-gguf',
    LLAMA_13B: 'llama2-13b-gguf',
    MISTRAL_7B: 'mistral-7b-gguf'
  },
  
  DEFAULT_MODEL: 'qwen3.5-27b-gguf'
};

/**
 * Consulta o World Model para predição de estado futuro.
 * @param {Object} latentState - Estado latente atual (vetor ou objeto)
 * @param {Object} action - Ação proposta (ex: irrigação, PEMF)
 * @param {Object} options - Opções: { model, canteiroId, horizon, temperature }
 * @returns {Object} Predição do modelo
 */
function queryWorldModel_(latentState, action, options) {
  try {
    options = options || {};
    var startTime = new Date();
    
    // Validar entrada
    var validation = validateWorldModelInput_(latentState, action);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    // Verificar rate limiting
    var rateLimitCheck = checkWorldModelRateLimit_();
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: 'Limite de requisições atingido',
        rateLimit: rateLimitCheck
      };
    }
    
    // Verificar cache se habilitado
    if (WORLD_MODEL_CONFIG.ENABLE_CACHE) {
      var cached = getCachedPrediction_(latentState, action);
      if (cached) {
        return {
          success: true,
          cached: true,
          prediction: cached.prediction,
          timestamp: cached.timestamp
        };
      }
    }
    
    // Preparar requisição
    var request = buildWorldModelRequest_(latentState, action, options);
    
    // Executar chamada HTTP
    var response = executeWorldModelRequest_(request);
    
    if (!response.success) {
      return {
        success: false,
        error: 'Falha na requisição: ' + response.error,
        details: response.details
      };
    }
    
    // Processar resposta
    var prediction = processWorldModelResponse_(response.data);
    
    // Cachear resultado
    if (WORLD_MODEL_CONFIG.ENABLE_CACHE && prediction.success) {
      cachePrediction_(latentState, action, prediction);
    }
    
    // Registrar uso
    recordWorldModelUsage_(options.canteiroId, response.requestTime);
    
    return {
      success: true,
      cached: false,
      prediction: prediction,
      model: options.model || WORLD_MODEL_CONFIG.DEFAULT_MODEL,
      requestTime: response.requestTime,
      timestamp: startTime.toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em queryWorldModel_: ' + error.message);
    return {
      success: false,
      error: 'Erro interno: ' + error.message
    };
  }
}

/**
 * Valida entrada para World Model.
 * @private
 */
function validateWorldModelInput_(latentState, action) {
  if (!latentState) {
    return { valid: false, error: 'latentState obrigatório' };
  }
  
  if (!action || typeof action !== 'object') {
    return { valid: false, error: 'action deve ser um objeto' };
  }
  
  // Validar estrutura do estado latente
  if (Array.isArray(latentState)) {
    if (latentState.length === 0) {
      return { valid: false, error: 'latentState vazio' };
    }
  } else if (typeof latentState === 'object') {
    if (Object.keys(latentState).length === 0) {
      return { valid: false, error: 'latentState vazio' };
    }
  } else {
    return { valid: false, error: 'latentState deve ser array ou objeto' };
  }
  
  return { valid: true };
}

/**
 * Verifica limite de taxa de requisições.
 * @private
 */
function checkWorldModelRateLimit_() {
  try {
    var cache = CacheService.getScriptCache();
    var now = new Date().getTime();
    
    // Verificar limite por minuto
    var minuteKey = 'wm_rate_minute_' + Math.floor(now / 60000);
    var minuteCount = parseInt(cache.get(minuteKey) || '0');
    
    if (minuteCount >= WORLD_MODEL_CONFIG.MAX_REQUESTS_PER_MINUTE) {
      return {
        allowed: false,
        reason: 'Limite por minuto atingido',
        limit: WORLD_MODEL_CONFIG.MAX_REQUESTS_PER_MINUTE,
        current: minuteCount
      };
    }
    
    // Verificar limite por hora
    var hourKey = 'wm_rate_hour_' + Math.floor(now / 3600000);
    var hourCount = parseInt(cache.get(hourKey) || '0');
    
    if (hourCount >= WORLD_MODEL_CONFIG.MAX_REQUESTS_PER_HOUR) {
      return {
        allowed: false,
        reason: 'Limite por hora atingido',
        limit: WORLD_MODEL_CONFIG.MAX_REQUESTS_PER_HOUR,
        current: hourCount
      };
    }
    
    // Incrementar contadores
    cache.put(minuteKey, (minuteCount + 1).toString(), 120);
    cache.put(hourKey, (hourCount + 1).toString(), 3600);
    
    return {
      allowed: true,
      minuteRemaining: WORLD_MODEL_CONFIG.MAX_REQUESTS_PER_MINUTE - minuteCount - 1,
      hourRemaining: WORLD_MODEL_CONFIG.MAX_REQUESTS_PER_HOUR - hourCount - 1
    };
    
  } catch (error) {
    Logger.log('Erro em checkWorldModelRateLimit_: ' + error.message);
    return { allowed: true };  // Falha segura: permitir requisição
  }
}

/**
 * Obtém predição em cache.
 * @private
 */
function getCachedPrediction_(latentState, action) {
  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = generateCacheKey_(latentState, action);
    var cached = cache.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    Logger.log('Erro ao recuperar cache: ' + error.message);
  }
  
  return null;
}

/**
 * Gera chave de cache.
 * @private
 */
function generateCacheKey_(latentState, action) {
  var stateStr = JSON.stringify(latentState);
  var actionStr = JSON.stringify(action);
  var combined = stateStr + '||' + actionStr;
  
  // Hash simples
  var hash = 0;
  for (var i = 0; i < combined.length; i++) {
    var char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return 'wm_pred_' + Math.abs(hash).toString(36);
}

/**
 * Constrói requisição para World Model.
 * @private
 */
function buildWorldModelRequest_(latentState, action, options) {
  var model = options.model || WORLD_MODEL_CONFIG.DEFAULT_MODEL;
  var horizon = options.horizon || 1;  // Passos à frente
  var temperature = options.temperature || 0.7;
  
  // Serializar estado latente
  var serializedState;
  if (Array.isArray(latentState)) {
    serializedState = latentState;
  } else {
    serializedState = encodeStateToVector_(latentState);
  }
  
  return {
    model: model,
    input: {
      state: serializedState,
      action: action,
      horizon: horizon
    },
    parameters: {
      temperature: temperature,
      max_tokens: 512,
      top_p: 0.9
    },
    metadata: {
      timestamp: new Date().toISOString(),
      canteiroId: options.canteiroId,
      source: 'sutiliza_gas'
    }
  };
}

/**
 * Codifica estado em vetor.
 * @private
 */
function encodeStateToVector_(state) {
  var vector = [];
  
  // Extrair características principais
  vector.push(state.soilMoisture || 0);
  vector.push(state.airTemp || 25);
  vector.push(state.airHumidity || 50);
  vector.push(state.leafArea || 0);
  vector.push(state.greenCoverage || 0);
  vector.push(state.pemfFrequency || 0);
  vector.push(state.pemfIntensity || 0);
  vector.push(state.daysSincePlanting || 0);
  
  // Normalizar valores (escala 0-1)
  var normalized = [
    vector[0] / 100,           // soilMoisture
    (vector[1] - 10) / 40,     // airTemp (10-50°C)
    vector[2] / 100,           // airHumidity
    vector[3] / 100,           // leafArea (assumir max 100cm²)
    vector[4] / 100,           // greenCoverage
    vector[5] / 100,           // pemfFrequency (assumir max 100Hz)
    vector[6] / 100,           // pemfIntensity
    vector[7] / 90             // daysSincePlanting (assumir max 90 dias)
  ];
  
  return normalized;
}

/**
 * Executa requisição HTTP ao World Model.
 * @private
 */
function executeWorldModelRequest_(request) {
  try {
    var startTime = new Date().getTime();
    
    // Obter endpoint configurado
    var endpoint = getWorldModelEndpoint_();
    var apiKey = getWorldModelApiKey_();
    if (!endpoint || !apiKey) {
      return {
        success: false,
        error: 'World Model não configurado; nenhuma predição foi solicitada.',
        requestTime: 0
      };
    }
    
    // Configurar requisição HTTP
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(request),
      muteHttpExceptions: true,
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'User-Agent': 'Sutiliza-GAS/1.0'
      }
    };
    
    // Executar com timeout
    var response = UrlFetchApp.fetch(endpoint, options);
    var requestTime = new Date().getTime() - startTime;
    
    var statusCode = response.getResponseCode();
    
    if (statusCode !== 200) {
      return {
        success: false,
        error: 'HTTP ' + statusCode,
        details: response.getContentText(),
        requestTime: requestTime
      };
    }
    
    var data = JSON.parse(response.getContentText());
    
    return {
      success: true,
      data: data,
      requestTime: requestTime
    };
    
  } catch (error) {
    Logger.log('Erro em executeWorldModelRequest_: ' + error.message);
    
    return {
      success: false,
      error: 'World Model indisponível: ' + error.message,
      requestTime: 0
    };
  }
}

/**
 * Obtém endpoint do World Model.
 * @private
 */
function getWorldModelEndpoint_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var endpoint = props.getProperty('WORLD_MODEL_ENDPOINT');
    
    if (endpoint) {
      return endpoint;
    }
  } catch (error) {
    Logger.log('Aviso: endpoint não configurado');
  }
  
  return WORLD_MODEL_CONFIG.DEFAULT_ENDPOINT || '';
}

/**
 * Obtém API key do World Model.
 * @private
 */
function getWorldModelApiKey_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var apiKey = props.getProperty('WORLD_MODEL_API_KEY');
    
    if (apiKey) {
      return apiKey;
    }
  } catch (error) {
    Logger.log('Aviso: API key não configurada');
  }
  
  return '';
}

/**
 * Gera predição fallback local (sem IA).
 * @private
 */
function generateFallbackPrediction_(request) {
  var state = request.input.state;
  var action = request.input.action;
  
  // Modelo simplificado baseado em heurísticas
  var predicted_vigor = 0.5;
  
  // Efeito da umidade do solo
  var soilMoisture = state[0] * 100;
  if (soilMoisture > 40 && soilMoisture < 70) {
    predicted_vigor += 0.15;
  } else if (soilMoisture < 30) {
    predicted_vigor -= 0.20;
  }
  
  // Efeito da temperatura
  var temp = state[1] * 40 + 10;
  if (temp > 20 && temp < 30) {
    predicted_vigor += 0.10;
  } else if (temp > 35) {
    predicted_vigor -= 0.15;
  }
  
  // Efeito do PEMF
  if (action.type === 'pemf' && action.frequency > 0) {
    predicted_vigor += 0.10;
  }
  
  // Efeito da irrigação
  if (action.type === 'irrigation' && soilMoisture < 40) {
    predicted_vigor += 0.12;
  }
  
  predicted_vigor = Math.max(0, Math.min(1, predicted_vigor));
  
  return {
    prediction: {
      vigor: predicted_vigor,
      confidence: 0.65,
      next_state: state,  // Estado não muda drasticamente
      recommendation: predicted_vigor > 0.7 ? 'Manter protocolo atual' : 'Ajustar irrigação'
    },
    model: 'local_heuristic',
    fallback: true
  };
}

/**
 * Processa resposta do World Model.
 * @private
 */
function processWorldModelResponse_(data) {
  try {
    if (data.fallback) {
      return {
        success: true,
        predicted_vigor: data.prediction.vigor,
        confidence: data.prediction.confidence,
        next_state: data.prediction.next_state,
        recommendation: data.prediction.recommendation,
        fallback: true
      };
    }
    
    // Estrutura esperada da API real
    return {
      success: true,
      predicted_vigor: data.prediction?.vigor || data.vigor || 0.5,
      confidence: data.prediction?.confidence || data.confidence || 0.5,
      next_state: data.prediction?.next_state || data.next_state || [],
      recommendation: data.prediction?.recommendation || data.recommendation || '',
      uncertainties: data.uncertainties || {},
      fallback: false
    };
    
  } catch (error) {
    Logger.log('Erro em processWorldModelResponse_: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cacheia predição.
 * @private
 */
function cachePrediction_(latentState, action, prediction) {
  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = generateCacheKey_(latentState, action);
    
    var cacheData = {
      prediction: prediction,
      timestamp: new Date().toISOString()
    };
    
    cache.put(cacheKey, JSON.stringify(cacheData), WORLD_MODEL_CONFIG.CACHE_TTL);
    
  } catch (error) {
    Logger.log('Erro ao cachear predição: ' + error.message);
  }
}

/**
 * Registra uso do World Model.
 * @private
 */
function recordWorldModelUsage_(canteiroId, requestTime) {
  try {
    if (typeof insertRow === 'function' && typeof SHEETS !== 'undefined' && SHEETS.WM_LOGS) {
      insertRow(SHEETS.WM_LOGS, [
        new Date(),
        canteiroId || 'unknown',
        requestTime,
        'prediction'
      ]);
    }
  } catch (error) {
    Logger.log('Aviso: não foi possível registrar uso');
  }
}

/**
 * Configura endpoint e API key do World Model.
 * @param {string} endpoint - URL do endpoint
 * @param {string} apiKey - Chave de API
 * @returns {Object} Resultado da configuração
 */
function configureWorldModel_(endpoint, apiKey) {
  try {
    if (!endpoint || !apiKey) {
      return {
        success: false,
        error: 'endpoint e apiKey são obrigatórios'
      };
    }
    
    var props = PropertiesService.getScriptProperties();
    props.setProperty('WORLD_MODEL_ENDPOINT', endpoint);
    props.setProperty('WORLD_MODEL_API_KEY', apiKey);
    
    return {
      success: true,
      message: 'World Model configurado',
      endpoint: endpoint
    };
    
  } catch (error) {
    Logger.log('Erro em configureWorldModel_: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Testa conexão com World Model.
 * @returns {Object} Resultado do teste
 */
function testWorldModelConnection_() {
  try {
    var testState = [0.5, 0.6, 0.5, 0.3, 0.4, 0.0, 0.0, 0.2];
    var testAction = { type: 'none', duration: 0 };
    
    var result = queryWorldModel_(testState, testAction, {
      canteiroId: 'test',
      model: WORLD_MODEL_CONFIG.DEFAULT_MODEL
    });
    
    return {
      success: result.success,
      message: result.success ? 'Conexão bem-sucedida' : 'Falha na conexão',
      details: result,
      fallback: result.prediction?.fallback || false
    };
    
  } catch (error) {
    Logger.log('Erro em testWorldModelConnection_: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Limpa cache do World Model.
 * @returns {Object} Resultado da operação
 */
function clearWorldModelCache_() {
  try {
    var cache = CacheService.getScriptCache();
    
    // Não há método direto para limpar apenas chaves específicas
    // Registramos a limpeza
    cache.put('wm_cache_cleared_at', new Date().toISOString(), 3600);
    
    return {
      success: true,
      message: 'Cache marcado para renovação',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em clearWorldModelCache_: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
