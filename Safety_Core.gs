/**
 * ==============================================================================
 * COMPONENTE: Safety_Core.gs
 * TÍTULO: Intertravamento de Segurança (Safety)
 * FUNCIONALIDADES:
 *   - Verifica condições extremas de estresse ou temperatura e corta a energia das bobinas preventivamente.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Alerts.gs, Actuators_PEMF.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function checkSafetyLimits(temp, moisture, potential) {
  var invalidReading = typeof temp !== 'number' || !isFinite(temp) ||
    typeof moisture !== 'number' || !isFinite(moisture) ||
    (potential !== undefined && potential !== null &&
      (typeof potential !== 'number' || !isFinite(potential)));
  var outsideLimits = temp > SAFETY_LIMITS.TEMP_MAX ||
    temp < SAFETY_LIMITS.TEMP_MIN ||
    moisture < SAFETY_LIMITS.MOISTURE_MIN;

  if (invalidReading || outsideLimits) {
    emergencyShutdown();
    return false;
  }
  return true;
}

function emergencyShutdown() {
  var shutdown = updatePEMFParameters_('ALL', 0, 0);
  sendSafetyAlert('SHUTDOWN DE EMERGÊNCIA', 'Limites de segurança violados!');
  return {
    success: !!(shutdown && shutdown.success),
    pemf: shutdown && shutdown.success ? 'OFF' : 'UNCONFIRMED',
    error: shutdown && shutdown.error ? shutdown.error : ''
  };
}
