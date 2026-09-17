/**
 * ==============================================================================
 * COMPONENTE: Main.gs
 * TÍTULO: Roteamento Principal (doGet / doPost)
 * FUNCIONALIDADES:
 *   - Gerencia as requisições HTTP recebidas, servindo a interface web e processando chamadas de API (CRUD).
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Interface com todos os componentes HTML e endpoints de borda (ESP32-S3).
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function doGet(e) {
  // FLEET_FRAGMENT_BOOTSTRAP: o token fica no fragmento (#tok=), que não é
  // enviado ao servidor. O shell valida o token antes de chamar qualquer API.
  var fleetBootstrapPage = e && e.parameter && String(e.parameter.page || '') === 'app';
  var fleetBootstrapToken = e && e.parameter && e.parameter.tok;
  if (fleetBootstrapPage && !fleetBootstrapToken) {
    var fleetTemplates = ['Index', 'index', 'Dashboard'];
    for (var fleetI = 0; fleetI < fleetTemplates.length; fleetI++) {
      try {
        var fleetTemplate = HtmlService.createTemplateFromFile(fleetTemplates[fleetI]);
        fleetTemplate.authToken = '';
        fleetTemplate.tok = '';
        fleetTemplate.sessionUser = {};
        fleetTemplate.data = { scriptUrl: ScriptApp.getService().getUrl() };
        return fleetTemplate.evaluate()
          .setTitle('Sutiliza - Eletrocultura')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      } catch (fleetTemplateError) {}
    }
    return HtmlService.createHtmlOutput('Aplicação indisponível.');
  }
  try {
    var params = e && e.parameter ? e.parameter : {};
    var tok = params.tok || '';
    var page = params.page || '';

    // Se foi pedido explicitamente para ir ao login
    if (page === 'login') {
      return HtmlService.createTemplateFromFile('Login').evaluate()
        .setTitle('Sistema de Eletrocultura Comparada | Login')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // Se tem token válido, renderizar app
    if (tok && isAuthenticatedByToken(tok)) {
      var template = HtmlService.createTemplateFromFile('Index');
      template.authToken = tok;
      template.sessionUser = getSessionUser(tok) || {};
      return template.evaluate()
        .setTitle('Sistema de Eletrocultura Comparada')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // Se não tem token ou token inválido, mostrar login
    return HtmlService.createTemplateFromFile('Login').evaluate()
      .setTitle('Sistema de Eletrocultura Comparada | Login')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log("Erro em doGet: " + error.message);
    throw error;
  }
}


function doPost(e) {
  try {
    try {
      let response;
      try {
        const request = JSON.parse(e.postData.contents);
        if (request.action === 'insertTelemetry') {
          response = {
            success: true,
            data: syncEdgeData(request.data),
            message: 'Telemetria sincronizada.'
          };
        } else if (request.action === 'login') {
          response = apiRequest({
            action: 'auth.login',
            payload: {
              email: request.email,
              password: request.password
            }
          });
        } else {
          response = apiRequest(request);
        }
      } catch (err) {
        Logger.log('Requisicao invalida: ' + (err && err.message ? err.message : String(err)));
        response = {
          success: false,
          data: null,
          message: 'Requisicao invalida.',
          error: { code: 'INVALID_REQUEST', message: 'Requisicao invalida.' }
        };
      }
      return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      Logger.log("Erro em doPost: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em doPost: " + error.message);
    throw error;
  }
}

function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    Logger.log("Erro em include: " + error.message);
    throw error;
  }
}

/**
 * Compacta dados estáticos para uso em data URLs (como logos base64)
 * Remove todos os espaços em branco para otimizar o tamanho
 */
function includeInlineData(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent().replace(/\s+/g, '');
}

function includeAppPages() {
  try {
    const pages = [
      'Dashboard',
      'Canteiros_List',
      'Canteiros_Form',
      'Leituras_List',
      'Leituras_Chart',
      'Eletroma_Monitor',
      'Eletroma_PSD',
      'Biomassa_Log',
      'Biomassa_Chart',
      'NDVI_Monitor',
      'XAI_Console',
      'ICR_Calculator',
      'Foliage_Growth_View',
      'PANC_OraProNobis_View',
      'PANC_Peixinho_View',
      'PANC_Taioba_View',
      'Canteiro_Controle_View',
      'Canteiro_CobrePassivo_View',
      'Canteiro_PEMFAtivo_View',
      'Calibration_Panel',
      'Alerts_Config',
      'Audit_Logs_View',
      'Export_Panel',
      'Safety_Console',
      'Test_Runner',
      'Users_Admin',
      'Settings',
      'About'
    ];
    return pages.map(include).join('\n');
  } catch (error) {
    Logger.log("Erro em includeAppPages: " + error.message);
    throw error;
  }
}
