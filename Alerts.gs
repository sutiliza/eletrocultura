/**
 * ==============================================================================
 * COMPONENTE: Alerts.gs
 * TÍTULO: Sistema de Alertas e Notificações
 * FUNCIONALIDADES:
 *   - Envia e-mails de alerta e mensagens de erro do sistema caso limites de segurança sejam violados.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Safety_Core.gs, Config.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function sendSafetyAlert(subject, body) {
  try {
    MailApp.sendEmail(Session.getActiveUser().getEmail(), subject, body);
  } catch (error) {
    Logger.log("Erro em sendSafetyAlert: " + error.message);
    throw error;
  }
}
