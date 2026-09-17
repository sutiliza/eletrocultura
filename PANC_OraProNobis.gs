/**
 * ==============================================================================
 * COMPONENTE: PANC_OraProNobis.gs
 * TÍTULO: Parâmetros Ora-pro-nóbis
 * FUNCIONALIDADES:
 *   - Configura os limiares de estresse, umidade ideal e faixas seguras para Pereskia aculeata.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - PANC_OraProNobis_View.html, Safety_Core.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

const ORA_PRO_NOBIS_LIMITS = {
  moisture_min: 30.0,
  temp_max: 38.0,
  target_icr: 'Ca2+'
};
