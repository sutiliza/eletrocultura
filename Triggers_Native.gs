/**
 * ==============================================================================
 * COMPONENTE: Triggers_Native.gs
 * TÍTULO: Gatilhos Nativos do Google Apps Script
 * FUNCIONALIDADES:
 *   - Configura os gatilhos baseados em tempo e eventos de planilha (onEdit, onOpen).
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Config.gs, Alerts.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function setupNativeTriggers() {
  try {
    ScriptApp.newTrigger('runPeriodicAnalysis')
      .timeBased()
      .everyHours(1)
      .create();
  } catch (error) {
    Logger.log("Erro em setupNativeTriggers: " + error.message);
    throw error;
  }
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Eletrocultura')
      .addItem('Abrir Painel', 'openDashboard')
      .addToUi();
  } catch (error) {
    Logger.log("Erro em onOpen: " + error.message);
    throw error;
  }
}
