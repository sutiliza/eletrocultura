/**
 * Dados sintéticos — Sutiliza - Eletrocultura
 * Gerado em 2026-06-21 01:10:44 por generate_synthetic_data_all_projects.py
 *
 * Execute populateSyntheticData() PELO EDITOR do Apps Script para popular
 * as abas de domínio com ~30 registros cada (valida os gráficos do notebook).
 * Idempotente: limpa as linhas de dados antes de reinserir.
 *
 * NÃO define onOpen() — para não colidir com o menu real do projeto.
 */

function populateSyntheticData() {
  try {
    try {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var results = [];

        // Biomassa_Produtividade
        try {
          var sheet_BIOMASSA = ss.getSheetByName('Biomassa_Produtividade') || ss.insertSheet('Biomassa_Produtividade');
          if (sheet_BIOMASSA.getLastRow() > 1) {
            sheet_BIOMASSA.deleteRows(2, sheet_BIOMASSA.getLastRow() - 1);
          }
          var h_sheet_BIOMASSA = ["ID", "Name", "Description", "Status", "CreatedAt", "UpdatedAt"];
          sheet_BIOMASSA.getRange(1, 1, 1, h_sheet_BIOMASSA.length).setValues([h_sheet_BIOMASSA]);
          var d_sheet_BIOMASSA = [
            ["BIO-0001", "Carla Oliveira", "Observação inicial do processo", "ativo", "2026-06-15 01:10:44", "2026-06-17 01:10:44"],
            ["BIO-0002", "Eduarda Lima", "Registro de sessão experimental", "ativo", "2026-04-06 01:10:44", "2026-06-01 01:10:44"],
            ["BIO-0003", "Diego Souza", "Observação inicial do processo", "ativo", "2026-06-04 01:10:44", "2026-06-01 01:10:44"],
            ["BIO-0004", "Bruno Santos", "Registro de sessão experimental", "ativo", "2026-06-12 01:10:44", "2026-06-15 01:10:44"],
            ["BIO-0005", "Ana Silva", "Registro de sessão experimental", "ativo", "2026-04-20 01:10:44", "2026-06-20 01:10:44"],
            ["BIO-0006", "Diego Souza", "Acompanhamento de evolução", "ativo", "2026-03-25 01:10:44", "2026-06-18 01:10:44"],
            ["BIO-0007", "Eduarda Lima", "Registro de sessão experimental", "ativo", "2026-04-15 01:10:44", "2026-06-05 01:10:44"],
            ["BIO-0008", "Gabriela Rocha", "Acompanhamento de evolução", "inativo", "2026-06-02 01:10:44", "2026-06-06 01:10:44"],
            ["BIO-0009", "Diego Souza", "Acompanhamento de evolução", "inativo", "2026-03-31 01:10:44", "2026-05-27 01:10:44"],
            ["BIO-0010", "Henrique Alves", "Registro de sessão experimental", "inativo", "2026-06-01 01:10:44", "2026-05-29 01:10:44"],
            ["BIO-0011", "Ana Silva", "Dados coletados durante atividade", "ativo", "2026-04-16 01:10:44", "2026-05-29 01:10:44"],
            ["BIO-0012", "Carla Oliveira", "Registro de sessão experimental", "ativo", "2026-05-25 01:10:44", "2026-05-22 01:10:44"],
            ["BIO-0013", "Bruno Santos", "Dados coletados durante atividade", "ativo", "2026-04-12 01:10:44", "2026-05-27 01:10:44"],
            ["BIO-0014", "Bruno Santos", "Dados coletados durante atividade", "ativo", "2026-06-12 01:10:44", "2026-06-17 01:10:44"],
            ["BIO-0015", "Diego Souza", "Dados coletados durante atividade", "ativo", "2026-04-01 01:10:44", "2026-06-12 01:10:44"],
            ["BIO-0016", "Bruno Santos", "Observação inicial do processo", "inativo", "2026-06-19 01:10:44", "2026-05-24 01:10:44"],
            ["BIO-0017", "Bruno Santos", "Dados coletados durante atividade", "inativo", "2026-05-18 01:10:44", "2026-06-06 01:10:44"],
            ["BIO-0018", "Carla Oliveira", "Dados coletados durante atividade", "inativo", "2026-05-07 01:10:44", "2026-06-21 01:10:44"],
            ["BIO-0019", "Carla Oliveira", "Acompanhamento de evolução", "inativo", "2026-04-15 01:10:44", "2026-05-30 01:10:44"],
            ["BIO-0020", "Bruno Santos", "Acompanhamento de evolução", "ativo", "2026-05-28 01:10:44", "2026-05-24 01:10:44"],
            ["BIO-0021", "Felipe Costa", "Acompanhamento de evolução", "inativo", "2026-05-10 01:10:44", "2026-06-13 01:10:44"],
            ["BIO-0022", "Felipe Costa", "Registro de sessão experimental", "inativo", "2026-06-03 01:10:44", "2026-06-09 01:10:44"],
            ["BIO-0023", "Carla Oliveira", "Observação inicial do processo", "ativo", "2026-06-02 01:10:44", "2026-06-02 01:10:44"],
            ["BIO-0024", "Bruno Santos", "Acompanhamento de evolução", "inativo", "2026-03-28 01:10:44", "2026-06-04 01:10:44"],
            ["BIO-0025", "Diego Souza", "Observação inicial do processo", "inativo", "2026-06-14 01:10:44", "2026-06-04 01:10:44"],
            ["BIO-0026", "Carla Oliveira", "Acompanhamento de evolução", "ativo", "2026-03-30 01:10:44", "2026-06-06 01:10:44"],
            ["BIO-0027", "Carla Oliveira", "Observação inicial do processo", "inativo", "2026-03-25 01:10:44", "2026-06-15 01:10:44"],
            ["BIO-0028", "Diego Souza", "Acompanhamento de evolução", "ativo", "2026-04-09 01:10:44", "2026-06-01 01:10:44"],
            ["BIO-0029", "Carla Oliveira", "Observação inicial do processo", "ativo", "2026-05-28 01:10:44", "2026-06-16 01:10:44"],
            ["BIO-0030", "Carla Oliveira", "Dados coletados durante atividade", "inativo", "2026-05-30 01:10:44", "2026-05-22 01:10:44"]
          ];
          sheet_BIOMASSA.getRange(2, 1, d_sheet_BIOMASSA.length, h_sheet_BIOMASSA.length).setValues(d_sheet_BIOMASSA);
          results.push('OK Biomassa_Produtividade: ' + d_sheet_BIOMASSA.length + ' registros');
        } catch (e) {
          results.push('ERRO Biomassa_Produtividade: ' + e.message);
        }

        // Audit_Logs
        try {
          var sheet_AUDIT_LOGS = ss.getSheetByName('Audit_Logs') || ss.insertSheet('Audit_Logs');
          if (sheet_AUDIT_LOGS.getLastRow() > 1) {
            sheet_AUDIT_LOGS.deleteRows(2, sheet_AUDIT_LOGS.getLastRow() - 1);
          }
          var h_sheet_AUDIT_LOGS = ["ID", "Timestamp", "Level", "Action", "Entity", "RecordID", "UserID", "Message", "Details", "CreatedAt"];
          sheet_AUDIT_LOGS.getRange(1, 1, 1, h_sheet_AUDIT_LOGS.length).setValues([h_sheet_AUDIT_LOGS]);
          var d_sheet_AUDIT_LOGS = [
            ["AUD-0001", "2026-06-15 01:10:44", "alto", "remover", "C", "AUD-0001", "USR-773", "Processo executado com sucesso", "Comportamento dentro do esperado", "2026-05-21 01:10:44"],
            ["AUD-0002", "2026-05-17 01:10:44", "alto", "editar", "B", "AUD-0002", "USR-270", "Comportamento dentro do esperado", "Comportamento dentro do esperado", "2026-03-23 01:10:44"],
            ["AUD-0003", "2026-06-06 01:10:44", "alto", "editar", "C", "AUD-0003", "USR-669", "Comportamento dentro do esperado", "Comportamento dentro do esperado", "2026-04-28 01:10:44"],
            ["AUD-0004", "2026-06-14 01:10:44", "medio", "remover", "D", "AUD-0004", "USR-324", "Observações durante a coleta", "Necessita acompanhamento adicional", "2026-05-14 01:10:44"],
            ["AUD-0005", "2026-06-06 01:10:44", "baixo", "visualizar", "C", "AUD-0005", "USR-986", "Comportamento dentro do esperado", "Necessita acompanhamento adicional", "2026-04-03 01:10:44"],
            ["AUD-0006", "2026-05-07 01:10:44", "alto", "criar", "B", "AUD-0006", "USR-557", "Necessita acompanhamento adicional", "Processo executado com sucesso", "2026-05-28 01:10:44"],
            ["AUD-0007", "2026-05-16 01:10:44", "baixo", "remover", "A", "AUD-0007", "USR-265", "Processo executado com sucesso", "Comportamento dentro do esperado", "2026-05-20 01:10:44"],
            ["AUD-0008", "2026-05-10 01:10:44", "alto", "remover", "D", "AUD-0008", "USR-836", "Processo executado com sucesso", "Observações durante a coleta", "2026-04-19 01:10:44"],
            ["AUD-0009", "2026-05-07 01:10:44", "medio", "editar", "B", "AUD-0009", "USR-233", "Observações durante a coleta", "Processo executado com sucesso", "2026-03-26 01:10:44"],
            ["AUD-0010", "2026-05-04 01:10:44", "baixo", "editar", "C", "AUD-0010", "USR-506", "Processo executado com sucesso", "Observações durante a coleta", "2026-05-29 01:10:44"],
            ["AUD-0011", "2026-06-19 01:10:44", "baixo", "visualizar", "D", "AUD-0011", "USR-721", "Necessita acompanhamento adicional", "Necessita acompanhamento adicional", "2026-05-07 01:10:44"],
            ["AUD-0012", "2026-05-09 01:10:44", "baixo", "visualizar", "C", "AUD-0012", "USR-289", "Observações durante a coleta", "Necessita acompanhamento adicional", "2026-06-13 01:10:44"],
            ["AUD-0013", "2026-05-01 01:10:44", "baixo", "editar", "A", "AUD-0013", "USR-384", "Comportamento dentro do esperado", "Observações durante a coleta", "2026-05-02 01:10:44"],
            ["AUD-0014", "2026-05-11 01:10:44", "baixo", "visualizar", "A", "AUD-0014", "USR-571", "Processo executado com sucesso", "Comportamento dentro do esperado", "2026-05-31 01:10:44"],
            ["AUD-0015", "2026-06-08 01:10:44", "alto", "criar", "A", "AUD-0015", "USR-897", "Observações durante a coleta", "Observações durante a coleta", "2026-04-06 01:10:44"],
            ["AUD-0016", "2026-05-05 01:10:44", "medio", "criar", "A", "AUD-0016", "USR-410", "Observações durante a coleta", "Necessita acompanhamento adicional", "2026-05-16 01:10:44"],
            ["AUD-0017", "2026-05-11 01:10:44", "alto", "editar", "A", "AUD-0017", "USR-726", "Observações durante a coleta", "Processo executado com sucesso", "2026-04-08 01:10:44"],
            ["AUD-0018", "2026-05-26 01:10:44", "medio", "criar", "B", "AUD-0018", "USR-803", "Necessita acompanhamento adicional", "Processo executado com sucesso", "2026-04-04 01:10:44"],
            ["AUD-0019", "2026-06-14 01:10:44", "baixo", "remover", "A", "AUD-0019", "USR-748", "Observações durante a coleta", "Observações durante a coleta", "2026-06-06 01:10:44"],
            ["AUD-0020", "2026-06-08 01:10:44", "baixo", "criar", "D", "AUD-0020", "USR-519", "Necessita acompanhamento adicional", "Observações durante a coleta", "2026-06-14 01:10:44"],
            ["AUD-0021", "2026-06-14 01:10:44", "alto", "criar", "A", "AUD-0021", "USR-215", "Necessita acompanhamento adicional", "Necessita acompanhamento adicional", "2026-06-07 01:10:44"],
            ["AUD-0022", "2026-06-13 01:10:44", "baixo", "criar", "A", "AUD-0022", "USR-732", "Processo executado com sucesso", "Necessita acompanhamento adicional", "2026-06-03 01:10:44"],
            ["AUD-0023", "2026-05-06 01:10:44", "medio", "remover", "B", "AUD-0023", "USR-302", "Observações durante a coleta", "Processo executado com sucesso", "2026-05-14 01:10:44"],
            ["AUD-0024", "2026-05-16 01:10:44", "baixo", "remover", "D", "AUD-0024", "USR-445", "Observações durante a coleta", "Processo executado com sucesso", "2026-03-28 01:10:44"],
            ["AUD-0025", "2026-06-10 01:10:44", "medio", "visualizar", "A", "AUD-0025", "USR-253", "Comportamento dentro do esperado", "Observações durante a coleta", "2026-06-08 01:10:44"],
            ["AUD-0026", "2026-06-16 01:10:44", "medio", "criar", "D", "AUD-0026", "USR-740", "Observações durante a coleta", "Comportamento dentro do esperado", "2026-06-19 01:10:44"],
            ["AUD-0027", "2026-05-16 01:10:44", "alto", "visualizar", "B", "AUD-0027", "USR-253", "Comportamento dentro do esperado", "Necessita acompanhamento adicional", "2026-06-04 01:10:44"],
            ["AUD-0028", "2026-06-20 01:10:44", "alto", "editar", "C", "AUD-0028", "USR-458", "Necessita acompanhamento adicional", "Processo executado com sucesso", "2026-03-29 01:10:44"],
            ["AUD-0029", "2026-06-21 01:10:44", "baixo", "visualizar", "B", "AUD-0029", "USR-897", "Necessita acompanhamento adicional", "Processo executado com sucesso", "2026-06-08 01:10:44"],
            ["AUD-0030", "2026-06-07 01:10:44", "medio", "criar", "B", "AUD-0030", "USR-382", "Observações durante a coleta", "Necessita acompanhamento adicional", "2026-05-06 01:10:44"]
          ];
          sheet_AUDIT_LOGS.getRange(2, 1, d_sheet_AUDIT_LOGS.length, h_sheet_AUDIT_LOGS.length).setValues(d_sheet_AUDIT_LOGS);
          results.push('OK Audit_Logs: ' + d_sheet_AUDIT_LOGS.length + ' registros');
        } catch (e) {
          results.push('ERRO Audit_Logs: ' + e.message);
        }

        // Settings
        try {
          var sheet_SETTINGS = ss.getSheetByName('Settings') || ss.insertSheet('Settings');
          if (sheet_SETTINGS.getLastRow() > 1) {
            sheet_SETTINGS.deleteRows(2, sheet_SETTINGS.getLastRow() - 1);
          }
          var h_sheet_SETTINGS = ["Key", "Value", "Description", "Scope", "UpdatedAt", "UpdatedBy"];
          sheet_SETTINGS.getRange(1, 1, 1, h_sheet_SETTINGS.length).setValues([h_sheet_SETTINGS]);
          var d_sheet_SETTINGS = [
            ["C", "C", "Acompanhamento de evolução", "C", "2026-05-28 01:10:44", "2026-04-23 01:10:44"],
            ["B", "B", "Observação inicial do processo", "C", "2026-05-22 01:10:44", "2026-06-17 01:10:44"],
            ["B", "A", "Dados coletados durante atividade", "D", "2026-05-23 01:10:44", "2026-06-18 01:10:44"],
            ["D", "A", "Registro de sessão experimental", "B", "2026-06-06 01:10:44", "2026-06-07 01:10:44"],
            ["D", "C", "Observação inicial do processo", "B", "2026-06-02 01:10:44", "2026-05-13 01:10:44"],
            ["A", "D", "Observação inicial do processo", "D", "2026-06-08 01:10:44", "2026-04-27 01:10:44"],
            ["A", "D", "Dados coletados durante atividade", "B", "2026-06-17 01:10:44", "2026-04-27 01:10:44"],
            ["C", "A", "Registro de sessão experimental", "C", "2026-06-13 01:10:44", "2026-04-22 01:10:44"],
            ["B", "A", "Dados coletados durante atividade", "C", "2026-06-20 01:10:44", "2026-06-06 01:10:44"],
            ["A", "A", "Observação inicial do processo", "C", "2026-05-23 01:10:44", "2026-04-25 01:10:44"],
            ["D", "D", "Acompanhamento de evolução", "C", "2026-06-08 01:10:44", "2026-04-25 01:10:44"],
            ["C", "A", "Registro de sessão experimental", "D", "2026-06-03 01:10:44", "2026-05-09 01:10:44"],
            ["C", "C", "Registro de sessão experimental", "D", "2026-05-26 01:10:44", "2026-06-10 01:10:44"],
            ["B", "C", "Acompanhamento de evolução", "A", "2026-06-17 01:10:44", "2026-04-29 01:10:44"],
            ["C", "D", "Acompanhamento de evolução", "A", "2026-06-18 01:10:44", "2026-06-19 01:10:44"],
            ["A", "A", "Observação inicial do processo", "A", "2026-06-15 01:10:44", "2026-06-20 01:10:44"],
            ["D", "B", "Observação inicial do processo", "D", "2026-06-09 01:10:44", "2026-06-04 01:10:44"],
            ["A", "D", "Dados coletados durante atividade", "D", "2026-06-05 01:10:44", "2026-06-19 01:10:44"],
            ["A", "A", "Registro de sessão experimental", "D", "2026-06-18 01:10:44", "2026-06-12 01:10:44"],
            ["A", "A", "Registro de sessão experimental", "A", "2026-06-07 01:10:44", "2026-06-16 01:10:44"],
            ["B", "A", "Acompanhamento de evolução", "D", "2026-06-18 01:10:44", "2026-06-06 01:10:44"],
            ["A", "D", "Dados coletados durante atividade", "C", "2026-06-19 01:10:44", "2026-06-18 01:10:44"],
            ["C", "C", "Registro de sessão experimental", "D", "2026-06-12 01:10:44", "2026-06-09 01:10:44"],
            ["D", "B", "Observação inicial do processo", "B", "2026-06-21 01:10:44", "2026-06-20 01:10:44"],
            ["D", "B", "Registro de sessão experimental", "C", "2026-06-07 01:10:44", "2026-05-25 01:10:44"],
            ["D", "C", "Acompanhamento de evolução", "A", "2026-06-15 01:10:44", "2026-06-14 01:10:44"],
            ["A", "C", "Dados coletados durante atividade", "B", "2026-06-02 01:10:44", "2026-05-27 01:10:44"],
            ["B", "D", "Registro de sessão experimental", "D", "2026-05-24 01:10:44", "2026-05-27 01:10:44"],
            ["D", "B", "Observação inicial do processo", "C", "2026-06-03 01:10:44", "2026-06-17 01:10:44"],
            ["B", "B", "Acompanhamento de evolução", "A", "2026-06-20 01:10:44", "2026-06-18 01:10:44"]
          ];
          sheet_SETTINGS.getRange(2, 1, d_sheet_SETTINGS.length, h_sheet_SETTINGS.length).setValues(d_sheet_SETTINGS);
          results.push('OK Settings: ' + d_sheet_SETTINGS.length + ' registros');
        } catch (e) {
          results.push('ERRO Settings: ' + e.message);
        }

        Logger.log(results.join('\n'));
        return results;
      } catch (error) {
        Logger.log("Erro em populateSyntheticData: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em populateSyntheticData: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em populateSyntheticData: " + error.message);
    throw error;
  }
}
