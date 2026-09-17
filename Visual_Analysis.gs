/**
 * ==============================================================================
 * COMPONENTE: Visual_Analysis.gs
 * TÍTULO: Análise de Imagens RGB
 * FUNCIONALIDADES:
 *   - Estima cobertura foliar e área foliar projetada através de segmentação de cor verde (HSV).
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Db_NDVI.gs, Foliage_Growth.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

// Constantes para segmentação HSV
var HSV_SEGMENTATION = {
  // Faixas HSV para detecção de vegetação verde saudável
  GREEN_HUE_MIN: 35,        // Graus (amarelo-verde)
  GREEN_HUE_MAX: 85,        // Graus (verde-azulado)
  MIN_SATURATION: 25,       // % - evita tons acinzentados
  MIN_VALUE: 20,            // % - evita áreas muito escuras
  MAX_VALUE: 95,            // % - evita superexposição
  
  // Faixas alternativas para vegetação em estresse
  STRESSED_HUE_MIN: 20,
  STRESSED_HUE_MAX: 35,
  
  // Parâmetros de análise
  SAMPLE_POINTS: 1000,      // Pontos de amostragem para análise rápida
  MIN_GREEN_CLUSTER: 5,     // Mínimo de pixels conectados para ser folha
  
  // Calibração física
  REFERENCE_AREA_CM2: 100,  // Área de referência conhecida na imagem (cm²)
  PIXEL_TO_CM_RATIO: 0.1    // Conversão pixel para cm (ajustar por calibração)
};

/**
 * Processa imagem de dossel e calcula métricas de cobertura.
 * @param {string} base64Image - Imagem codificada em base64 (PNG ou JPEG)
 * @param {Object} options - Opções: { canteiroId, referenceArea, calibration }
 * @returns {Object} Métricas de cobertura foliar
 */
function processCanopyImage_(base64Image, options) {
  try {
    options = options || {};
    var startTime = new Date();
    
    // Validar entrada
    if (!base64Image || typeof base64Image !== 'string') {
      return {
        success: false,
        error: 'Imagem base64 inválida ou ausente'
      };
    }
    
    // Decodificar imagem
    var imageData = decodeBase64Image_(base64Image);
    if (!imageData.success) {
      return {
        success: false,
        error: 'Falha ao decodificar imagem: ' + imageData.error
      };
    }
    
    // Segmentação HSV
    var segmentation = performHSVSegmentation_(imageData);
    
    // Calcular cobertura verde
    var greenCoverage = calculateGreenCoverage_(segmentation);
    
    // Estimar área foliar
    var leafArea = estimateLeafArea_(greenCoverage, imageData, options);
    
    // Análise de distribuição espacial
    var spatialAnalysis = analyzeSpatialDistribution_(segmentation);
    
    // Detecção de estresse visual
    var stressIndicators = detectVisualStress_(segmentation);
    
    // Calcular índices de vegetação
    var vegetationIndices = calculateVegetationIndices_(segmentation, imageData);
    
    // Comparar com histórico se disponível
    var trend = compareWithHistory_(options.canteiroId, greenCoverage.ratio);
    
    var result = {
      success: true,
      canteiroId: options.canteiroId || null,
      imageMetadata: {
        width: imageData.width,
        height: imageData.height,
        totalPixels: imageData.totalPixels,
        format: imageData.format
      },
      greenCoverage: {
        ratio: Math.round(greenCoverage.ratio * 10000) / 100,  // Porcentagem
        pixels: greenCoverage.greenPixels,
        healthyPixels: greenCoverage.healthyGreenPixels,
        stressedPixels: greenCoverage.stressedPixels
      },
      leafArea: {
        estimated_cm2: Math.round(leafArea.area_cm2 * 100) / 100,
        confidence: leafArea.confidence,
        method: leafArea.method
      },
      spatialAnalysis: spatialAnalysis,
      stressIndicators: stressIndicators,
      vegetationIndices: vegetationIndices,
      trend: trend,
      processingTime: new Date().getTime() - startTime.getTime(),
      timestamp: startTime.toISOString()
    };
    
    // Salvar no histórico
    if (options.canteiroId) {
      saveCanopyAnalysisHistory_(options.canteiroId, result);
    }
    
    return result;
    
  } catch (error) {
    Logger.log('Erro em processCanopyImage_: ' + error.message);
    return {
      success: false,
      error: 'Erro no processamento: ' + error.message
    };
  }
}

/**
 * Decodifica imagem base64 e extrai metadados.
 * @private
 */
function decodeBase64Image_(base64String) {
  try {
    // HtmlService/GAS não expõe um decodificador de pixels. Não invente
    // dimensões ou métricas: até a integração com Vision/Cloud Run existir,
    // a análise deve falhar de forma explícita.
    if (!/^data:image\/(png|jpeg|jpg);base64,/.test(base64String) && !/^[A-Za-z0-9+/]+=*$/.test(base64String)) {
      return { success: false, error: 'Imagem base64 inválida.' };
    }
    return {
      success: false,
      error: 'Processamento de pixels não configurado. Conecte um analisador de imagem antes de usar métricas de cobertura.'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ponto de extensão para segmentação HSV real.
 * O projeto não mascara a ausência de um decodificador de pixels com dados sintéticos.
 * @private
 */
function performHSVSegmentation_(imageData) {
  throw new Error('Segmentação HSV indisponível sem um decodificador de pixels configurado.');
}

/**
 * Calcula cobertura verde.
 * @private
 */
function calculateGreenCoverage_(segmentation) {
  var greenPixels = segmentation.healthyGreenPixels + segmentation.stressedPixels;
  var ratio = greenPixels / segmentation.totalPixels;
  
  return {
    greenPixels: greenPixels,
    healthyGreenPixels: segmentation.healthyGreenPixels,
    stressedPixels: segmentation.stressedPixels,
    ratio: ratio,
    healthRatio: segmentation.healthyGreenPixels / Math.max(greenPixels, 1)
  };
}

/**
 * Estima área foliar em cm².
 * @private
 */
function estimateLeafArea_(greenCoverage, imageData, options) {
  var pixelToCmRatio = options.calibration?.pixelToCm || HSV_SEGMENTATION.PIXEL_TO_CM_RATIO;
  var referenceArea = options.referenceArea || HSV_SEGMENTATION.REFERENCE_AREA_CM2;
  
  // Método 1: Proporção direta de pixels
  var pixelArea_cm2 = Math.pow(pixelToCmRatio, 2);
  var directArea = greenCoverage.greenPixels * pixelArea_cm2;
  
  // Método 2: Calibração por área de referência
  var calibratedArea = (greenCoverage.greenPixels / imageData.totalPixels) * referenceArea * 
                       (imageData.totalPixels / 1000000); // Normalizar por megapixel
  
  // Média ponderada dos métodos
  var estimatedArea = (directArea * 0.6 + calibratedArea * 0.4);
  
  // Confiança baseada na proporção de pixels verdes
  var confidence = greenCoverage.ratio > 0.1 ? 
    (greenCoverage.ratio > 0.3 ? 'high' : 'medium') : 'low';
  
  return {
    area_cm2: estimatedArea,
    confidence: confidence,
    method: 'hybrid_pixel_calibration',
    directEstimate: Math.round(directArea * 100) / 100,
    calibratedEstimate: Math.round(calibratedArea * 100) / 100
  };
}

/**
 * Analisa distribuição espacial da vegetação.
 * @private
 */
function analyzeSpatialDistribution_(segmentation) {
  throw new Error('Distribuição espacial indisponível sem pixels segmentados.');
}

/**
 * Detecta indicadores visuais de estresse.
 * @private
 */
function detectVisualStress_(segmentation) {
  var totalGreen = segmentation.healthyGreenPixels + segmentation.stressedPixels;
  var stressRatio = totalGreen > 0 ? segmentation.stressedPixels / totalGreen : 0;
  
  var indicators = [];
  var overallStress = 'low';
  
  if (stressRatio > 0.3) {
    indicators.push({
      type: 'chlorosis',
      severity: 'high',
      description: 'Amarelecimento significativo detectado'
    });
    overallStress = 'high';
  } else if (stressRatio > 0.15) {
    indicators.push({
      type: 'chlorosis',
      severity: 'medium',
      description: 'Amarelecimento moderado detectado'
    });
    overallStress = 'medium';
  }
  
  if (segmentation.healthyGreenPixels / segmentation.totalPixels < 0.2) {
    indicators.push({
      type: 'low_coverage',
      severity: 'medium',
      description: 'Cobertura foliar abaixo do esperado'
    });
  }
  
  return {
    overallLevel: overallStress,
    stressRatio: Math.round(stressRatio * 1000) / 1000,
    indicators: indicators,
    healthy: indicators.length === 0
  };
}

/**
 * Calcula índices de vegetação aproximados.
 * @private
 */
function calculateVegetationIndices_(segmentation, imageData) {
  var greenRatio = (segmentation.healthyGreenPixels + segmentation.stressedPixels) / 
                   segmentation.totalPixels;
  
  // ExG (Excess Green Index) - aproximado
  var exg = 2 * greenRatio - 0.5;
  
  // GLI (Green Leaf Index) - aproximado
  var gli = (2 * greenRatio - 1) / (2 * greenRatio + 1);
  
  // VARI (Visible Atmospherically Resistant Index) - aproximado
  var vari = greenRatio * 0.8;
  
  return {
    exg: Math.round(exg * 1000) / 1000,
    gli: Math.round(gli * 1000) / 1000,
    vari: Math.round(vari * 1000) / 1000,
    note: 'Índices aproximados por modelo RGB'
  };
}

/**
 * Compara com histórico.
 * @private
 */
function compareWithHistory_(canteiroId, currentRatio) {
  if (!canteiroId) return null;
  
  try {
    var cache = CacheService.getScriptCache();
    var historyKey = 'canopy_history_' + canteiroId;
    var historyJson = cache.get(historyKey);
    
    if (!historyJson) {
      return { trend: 'insufficient_data', message: 'Primeira análise' };
    }
    
    var history = JSON.parse(historyJson);
    
    if (history.length < 2) {
      return { trend: 'insufficient_data', message: 'Histórico insuficiente' };
    }
    
    // Calcular tendência
    var previousRatio = history[history.length - 1].ratio;
    var change = currentRatio - previousRatio;
    var percentChange = (change / previousRatio) * 100;
    
    var trend;
    if (Math.abs(percentChange) < 5) {
      trend = 'stable';
    } else if (percentChange > 0) {
      trend = percentChange > 15 ? 'increasing_fast' : 'increasing';
    } else {
      trend = percentChange < -15 ? 'decreasing_fast' : 'decreasing';
    }
    
    return {
      trend: trend,
      change: Math.round(change * 10000) / 100,
      percentChange: Math.round(percentChange * 100) / 100,
      previousRatio: Math.round(previousRatio * 10000) / 100,
      dataPoints: history.length
    };
    
  } catch (error) {
    Logger.log('Erro em compareWithHistory_: ' + error.message);
    return { trend: 'error' };
  }
}

/**
 * Salva análise no histórico.
 * @private
 */
function saveCanopyAnalysisHistory_(canteiroId, result) {
  try {
    var historyKey = 'canopy_history_' + canteiroId;
    appendActuatorHistory_(historyKey, {
      timestamp: new Date().getTime(),
      ratio: result.greenCoverage.ratio / 100,
      leafArea: result.leafArea.estimated_cm2,
      stressLevel: result.stressIndicators.overallLevel
    }, 30);
    
  } catch (error) {
    Logger.log('Erro em saveCanopyAnalysisHistory_: ' + error.message);
  }
}

/**
 * Obtém histórico de análises de cobertura.
 * @param {string} canteiroId - Identificador do canteiro
 * @returns {Object} Histórico de análises
 */
function getCanopyAnalysisHistory_(canteiroId) {
  try {
    if (!canteiroId) {
      return { success: false, error: 'canteiroId obrigatório' };
    }
    
    var historyKey = 'canopy_history_' + canteiroId;
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
          coverageRatio: Math.round(h.ratio * 10000) / 100,
          leafArea_cm2: h.leafArea,
          stressLevel: h.stressLevel
        };
      }),
      count: history.length
    };
    
  } catch (error) {
    Logger.log('Erro em getCanopyAnalysisHistory_: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Analisa múltiplas imagens e calcula crescimento temporal.
 * @param {Array} images - Array de objetos { base64, timestamp, canteiroId }
 * @returns {Object} Análise de crescimento
 */
function analyzeGrowthSeries(images) {
  try {
    if (!Array.isArray(images) || images.length < 2) {
      return {
        success: false,
        error: 'São necessárias pelo menos 2 imagens'
      };
    }
    
    var analyses = [];
    
    for (var i = 0; i < images.length; i++) {
      var result = processCanopyImage_(images[i].base64, {
        canteiroId: images[i].canteiroId
      });
      
      if (result.success) {
        analyses.push({
          timestamp: images[i].timestamp || new Date().toISOString(),
          coverageRatio: result.greenCoverage.ratio,
          leafArea: result.leafArea.estimated_cm2
        });
      }
    }
    
    if (analyses.length < 2) {
      return {
        success: false,
        error: 'Análise insuficiente de imagens'
      };
    }
    
    // Calcular taxa de crescimento
    var first = analyses[0];
    var last = analyses[analyses.length - 1];
    var timeSpan = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();
    var days = timeSpan / (1000 * 60 * 60 * 24);
    
    var areaDiff = last.leafArea - first.leafArea;
    var growthRate = days > 0 ? areaDiff / days : 0;
    
    return {
      success: true,
      analyses: analyses,
      growth: {
        totalDays: Math.round(days * 10) / 10,
        initialArea_cm2: Math.round(first.leafArea * 100) / 100,
        finalArea_cm2: Math.round(last.leafArea * 100) / 100,
        areaIncrease_cm2: Math.round(areaDiff * 100) / 100,
        growthRate_cm2_per_day: Math.round(growthRate * 100) / 100,
        percentIncrease: Math.round((areaDiff / first.leafArea) * 10000) / 100
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Erro em analyzeGrowthSeries: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
