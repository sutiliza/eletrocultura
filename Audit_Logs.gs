/**
 * ==============================================================================
 * COMPONENTE: Audit_Logs.gs
 * TÍTULO: Logs de Auditoria
 * FUNCIONALIDADES:
 *   - Registra acessos de usuários, alterações de parâmetros e intervenções manuais.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Audit_Logs_View.html, Auth.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function logAudit(userId, action, details) {
  insertRow(SHEETS.AUDIT_LOGS, [new Date(), userId, action, details]);
}
