/**
 * ==============================================================================
 * COMPONENTE: Config.gs
 * TÍTULO: Configuração Global do Sistema
 * FUNCIONALIDADES:
 *   - Centraliza todas as constantes do sistema, SPREADSHEETS_ID, nomes de abas e chaves de APIs.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Utilizado por todos os componentes do banco de dados (Db_*) e integrações externas.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

const SPREADSHEETS_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEETS_ID') || 'SPREADSHEETS_ID_EXEMPLO_123456';
const SHEETS = {
  USUARIOS: 'Usuarios',
  CANTEIROS: 'Canteiros',
  LEITURAS: 'Leituras_Sensores',
  ELETROMA: 'Eletroma_Sinais',
  BIOMASSA: 'Biomassa_Produtividade',
  XAI_LOGS: 'XAI_Explicabilidade',
  AUDIT_LOGS: 'Logs_Auditoria'
};
const SAFETY_LIMITS = {
  TEMP_MAX: 40.0,
  TEMP_MIN: 10.0,
  MOISTURE_MIN: 20.0
};
