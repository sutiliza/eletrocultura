/**
 * Persistência do ciclo POE escolar (Predição, Observação e Explicação).
 * Os dados experimentais só são devolvidos depois de uma predição justificada;
 * a tentativa só termina após observação numérica, explicação e próximo teste.
 */
var POE_CYCLES_SHEET = 'POE_Ciclos';
var POE_CYCLES_HEADERS = [
  'ID', 'UsuarioID', 'Predicao', 'Justificativa', 'LiderObservado', 'MetricasJSON',
  'Observacao', 'Explicacao', 'ProximoTeste', 'FonteFeedback', 'Status',
  'CriadoEm', 'AtualizadoEm'
];

function validatePoePrediction(payload) {
  var validPredictions = { controle: true, cobre: true, pemf: true };
  var prediction = String(payload && payload.predicao || '').toLowerCase().trim();
  var justification = String(payload && payload.justificativa || '').trim();
  if (!validPredictions[prediction]) throw poeCycleError_('POE_PREDICTION_INVALID', 'Escolha controle, cobre ou PEMF para fazer sua predição.');
  if (justification.length < 20) throw poeCycleError_('POE_JUSTIFICATION_SHORT', 'Justifique sua predição com pelo menos 20 caracteres.');
  return { predicao: prediction, justificativa: justification.slice(0, 500) };
}

function validatePoeConclusion(payload) {
  var observation = String(payload && payload.observacao || '').trim();
  var explanation = String(payload && payload.explicacao || '').trim();
  var nextTest = String(payload && payload.proximoTeste || '').trim();
  if (observation.length < 25 || !/\d/.test(observation)) {
    throw poeCycleError_('POE_OBSERVATION_INVALID', 'Registre uma observação de pelo menos 25 caracteres citando um valor medido.');
  }
  if (explanation.length < 30) throw poeCycleError_('POE_EXPLANATION_SHORT', 'Construa uma explicação com pelo menos 30 caracteres.');
  if (nextTest.length < 20) throw poeCycleError_('POE_NEXT_TEST_SHORT', 'Proponha um próximo teste com pelo menos 20 caracteres.');
  return {
    observacao: observation.slice(0, 700),
    explicacao: explanation.slice(0, 1000),
    proximoTeste: nextTest.slice(0, 700)
  };
}

function startPoeLearningCycle(userId, payload) {
  var owner = String(userId || '').trim().toLowerCase();
  if (!owner) throw new Error('Usuário do ciclo POE não identificado.');
  var prediction = validatePoePrediction(payload || {});
  var evaluation = avaliarPredicaoPOE(prediction);
  var id = 'POE-' + Utilities.getUuid().slice(0, 12).toUpperCase();
  var now = new Date().toISOString();
  poeAppendRow_({
    ID: id,
    UsuarioID: owner,
    Predicao: prediction.predicao,
    Justificativa: prediction.justificativa,
    LiderObservado: evaluation.lider,
    MetricasJSON: JSON.stringify(evaluation.metricas || {}),
    Observacao: '',
    Explicacao: '',
    ProximoTeste: '',
    FonteFeedback: evaluation.fonte,
    Status: 'aguardando_explicacao',
    CriadoEm: now,
    AtualizadoEm: now
  });
  return {
    attemptId: id,
    predicao: evaluation.predicao,
    lider: evaluation.lider,
    metricas: evaluation.metricas,
    feedback: evaluation.feedback,
    fonte: evaluation.fonte,
    requiresExplanation: true
  };
}

function completePoeLearningCycle(userId, payload) {
  var owner = String(userId || '').trim().toLowerCase();
  var attemptId = String(payload && payload.attemptId || '').trim();
  if (!attemptId) throw new Error('Predição anterior não identificada.');
  var conclusion = validatePoeConclusion(payload || {});
  var found = poeFindRow_(attemptId);
  if (!found) throw new Error('Ciclo POE não encontrado.');
  if (String(found.record.UsuarioID || '').toLowerCase() !== owner) {
    throw new Error('Este ciclo POE pertence a outro usuário.');
  }
  if (String(found.record.Status || '') !== 'aguardando_explicacao') {
    throw new Error('Este ciclo POE já foi concluído.');
  }

  var headers = found.headers;
  var row = found.row.slice();
  var values = {
    Observacao: conclusion.observacao,
    Explicacao: conclusion.explicacao,
    ProximoTeste: conclusion.proximoTeste,
    Status: 'concluido',
    AtualizadoEm: new Date().toISOString()
  };
  headers.forEach(function (header, index) {
    if (Object.prototype.hasOwnProperty.call(values, header)) row[index] = values[header];
  });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    found.sheet.getRange(found.rowNumber, 1, 1, headers.length).setValues([row]);
  } finally {
    lock.releaseLock();
  }
  return {
    attemptId: attemptId,
    status: 'concluido',
    message: 'Ciclo POE concluído. Sua explicação virou evidência para o próximo teste.'
  };
}

function poeEnsureSheet_() {
  var spreadsheet = getBoundSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(POE_CYCLES_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(POE_CYCLES_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, POE_CYCLES_HEADERS.length).setValues([POE_CYCLES_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function poeAppendRow_(record) {
  var sheet = poeEnsureSheet_();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.appendRow(headers.map(function (header) { return record[header] === undefined ? '' : record[header]; }));
  } finally {
    lock.releaseLock();
  }
}

function poeFindRow_(attemptId) {
  var sheet = poeEnsureSheet_();
  if (sheet.getLastRow() < 2) return null;
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  var idIndex = headers.indexOf('ID');
  for (var index = 1; index < values.length; index++) {
    if (String(values[index][idIndex]) === String(attemptId)) {
      var record = {};
      headers.forEach(function (header, column) { record[header] = values[index][column]; });
      return { sheet: sheet, headers: headers, row: values[index], rowNumber: index + 1, record: record };
    }
  }
  return null;
}

function poeCycleError_(code, message) {
  if (typeof apiError_ === 'function') return apiError_(code, message);
  var error = new Error(message);
  error.code = code;
  error.publicMessage = message;
  return error;
}
