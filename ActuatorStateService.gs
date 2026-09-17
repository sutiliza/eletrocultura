/**
 * Estado durável dos atuadores.
 *
 * CacheService continua sendo útil para dados efêmeros de sensores, mas
 * acionamentos físicos, contadores e histórico precisam sobreviver à
 * expiração/evicção do cache. PropertiesService é o armazenamento primário;
 * o cache de 6 horas fica apenas como fallback quando a propriedade não puder
 * ser gravada.
 */
var ACTUATOR_STATE_PROPERTY_PREFIX = 'SUTILIZA_ACTUATOR_STATE_V1:';
var ACTUATOR_STATE_MAX_CACHE_TTL_SECONDS = 21600;

function actuatorStatePropertyKey_(logicalKey) {
  var safeKey = String(logicalKey == null ? '' : logicalKey)
    .replace(/[^a-zA-Z0-9._:-]/g, '_')
    .slice(0, 240);
  return ACTUATOR_STATE_PROPERTY_PREFIX + safeKey;
}

function getActuatorState_(logicalKey) {
  var propertyKey = actuatorStatePropertyKey_(logicalKey);
  try {
    if (typeof PropertiesService !== 'undefined') {
      var persisted = PropertiesService.getScriptProperties().getProperty(propertyKey);
      if (persisted !== null && typeof persisted !== 'undefined') return persisted;
    }
  } catch (_) {}

  try {
    return CacheService.getScriptCache().get(String(logicalKey));
  } catch (_) {
    return null;
  }
}

function setActuatorState_(logicalKey, value, fallbackTtlSeconds) {
  var serialized = String(value);
  var propertyKey = actuatorStatePropertyKey_(logicalKey);
  try {
    if (typeof PropertiesService !== 'undefined') {
      PropertiesService.getScriptProperties().setProperty(propertyKey, serialized);
      return true;
    }
  } catch (_) {}

  try {
    var ttl = Number(fallbackTtlSeconds);
    if (!isFinite(ttl) || ttl <= 0) ttl = 600;
    ttl = Math.min(Math.floor(ttl), ACTUATOR_STATE_MAX_CACHE_TTL_SECONDS);
    CacheService.getScriptCache().put(String(logicalKey), serialized, ttl);
    return true;
  } catch (_) {
    return false;
  }
}

function appendActuatorHistory_(logicalKey, entry, maxEntries) {
  var raw = getActuatorState_(logicalKey);
  var history = [];
  if (raw) {
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) history = parsed;
    } catch (_) {}
  }
  history.push(entry);
  var limit = Math.max(1, Number(maxEntries) || 20);
  if (history.length > limit) history = history.slice(-limit);
  setActuatorState_(logicalKey, JSON.stringify(history), ACTUATOR_STATE_MAX_CACHE_TTL_SECONDS);
  return history;
}
