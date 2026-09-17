/**
 * Fronteira unica entre a interface HTML Service e o backend.
 *
 * Todas as respostas seguem:
 * { success, data, message, error, meta: { requestId } }
 */

const API_SESSION_TTL_SECONDS = 21600;
const API_SESSION_PREFIX = 'APP_SESSION_';

function apiRequest(request) {
  try {
    try {
      const requestId = Utilities.getUuid();

      try {
        if (!request || typeof request !== 'object') {
          throw apiError_('INVALID_REQUEST', 'Requisicao invalida.');
        }

        const action = String(request.action || '').trim();
        const payload = request.payload && typeof request.payload === 'object'
          ? request.payload
          : {};

        if (!action) {
          throw apiError_('ACTION_REQUIRED', 'A acao da requisicao e obrigatoria.');
        }

        if (action === 'auth.login') {
          return apiLogin_(payload, requestId);
        }

        if (action === 'auth.logout') {
          apiDeleteSession_(request.token);
          return apiSuccess_(null, 'Sessao encerrada.', requestId);
        }

        const session = apiRequireSession_(request.token);

        switch (action) {
          case 'auth.restore':
            return apiSuccess_({ user: session }, '', requestId);
          case 'app.bootstrap':
            return apiSuccess_({
              user: session,
              dashboard: getDashboardMetrics(),
              canteiros: getCanteiros()
            }, '', requestId);
          case 'dashboard.get':
            return apiSuccess_(getDashboardMetrics(), '', requestId);
          case 'system.health':
            return apiSuccess_(healthCheck(), '', requestId);
          case 'canteiros.list':
            return apiSuccess_(getCanteiros(), '', requestId);
          case 'canteiros.create':
            return apiCreateCanteiro_(payload, session, requestId);
          case 'leituras.list':
            return apiSuccess_(apiListSheetObjects_(SHEETS.LEITURAS, payload.limit || 50), '', requestId);
          case 'biomassa.create':
            return apiCreateBiomassa_(payload, session, requestId);
          case 'settings.get':
            apiRequireRole_(session, ['admin', 'administrador']);
            return apiSuccess_({
              spreadsheetsId: PropertiesService.getScriptProperties().getProperty('SPREADSHEETS_ID') || ''
            }, '', requestId);
          case 'settings.update':
            apiRequireRole_(session, ['admin', 'administrador']);
            return apiUpdateSettings_(payload, session, requestId);
          case 'export.csv':
            apiRequireRole_(session, ['admin', 'administrador', 'professor', 'pesquisador']);
            return apiExportCsv_(payload, requestId);
          case 'icr.calculate':
            return apiCalculateIcr_(payload, requestId);
          case 'ia.interpretar':
            apiRequireRole_(session, ['admin', 'administrador', 'professor', 'pesquisador']);
            return apiSuccess_(interpretarExperimentoComIA_(payload), '', requestId);
          case 'ia.poe':
            // POE (Predição-Observação-Explicação): aberto a qualquer sessão —
            // é atividade de estudante, não de gestão. Degrada sem GEMINI_API_KEY.
            return apiSuccess_(avaliarPredicaoPOE(payload), '', requestId);
          case 'poe.predict':
            return apiSuccess_(startPoeLearningCycle(session.email, payload), '', requestId);
          case 'poe.complete':
            return apiSuccess_(completePoeLearningCycle(session.email, payload), '', requestId);
          case 'tests.run':
            apiRequireRole_(session, ['admin', 'administrador', 'pesquisador']);
            return apiSuccess_(runSystemTests(), '', requestId);
          case 'safety.shutdown':
            apiRequireRole_(session, ['admin', 'administrador']);
            emergencyShutdown();
            apiSafeAudit_(session.email, 'SAFETY_SHUTDOWN', 'Parada de emergencia solicitada pela interface.');
            return apiSuccess_({ shutdown: true }, 'Parada de emergencia acionada.', requestId);
          default:
            throw apiError_('UNKNOWN_ACTION', 'Acao nao reconhecida.');
        }
      } catch (error) {
        Logger.log(JSON.stringify({
          event: 'api_request_failed',
          requestId: requestId,
          code: error.code || 'INTERNAL_ERROR',
          detail: error.message || String(error)
        }));
        return apiFailure_(
          error.code || 'INTERNAL_ERROR',
          error.publicMessage || 'Nao foi possivel concluir a operacao.',
          requestId
        );
      }
    } catch (error) {
      Logger.log("Erro em apiRequest: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em apiRequest: " + error.message);
    throw error;
  }
}

function apiLogin_(payload, requestId) {
  try {
    try {
      const username = String(payload.username || payload.email || '').trim().toLowerCase();
      const password = String(payload.password || '');

      if (!username || !password) {
        throw apiError_('CREDENTIALS_REQUIRED', 'Informe usuário e senha.');
      }

      const auth = authenticateUser(username, password);
      if (!auth || !auth.success) {
        throw apiError_('INVALID_CREDENTIALS', 'Usuário ou senha inválidos.');
      }

      const user = {
        id: String(auth.user.id || auth.user.email || username),
        username: String(auth.user.username || auth.user.email || username),
        name: String(auth.user.name || ''),
        email: String(auth.user.email || username),
        role: String(auth.user.role || 'usuario'),
        perfil: String(auth.user.perfil || auth.user.role || 'usuario')
      };
      const token = Utilities.getUuid();
      CacheService.getScriptCache().put(
        API_SESSION_PREFIX + token,
        JSON.stringify(user),
        API_SESSION_TTL_SECONDS
      );
      apiSafeAudit_(user.email, 'LOGIN', 'Sessao iniciada na aplicacao web.');

      return apiSuccess_({ token: token, user: user }, 'Acesso autorizado.', requestId);
    } catch (error) {
      Logger.log("Erro em apiLogin_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em apiLogin_: " + error.message);
    throw error;
  }
}

function apiRequireSession_(token) {
  try {
    try {
      const normalizedToken = typeof token === 'string' ? token.trim() : '';
      if (!/^[A-Za-z0-9-]{20,80}$/.test(normalizedToken)) {
        throw apiError_('AUTH_REQUIRED', 'Sua sessao expirou. Entre novamente.');
      }

      const cache = CacheService.getScriptCache();
      const serialized = cache.get(API_SESSION_PREFIX + normalizedToken);
      if (!serialized) {
        throw apiError_('SESSION_EXPIRED', 'Sua sessao expirou. Entre novamente.');
      }

      let session;
      try {
        session = JSON.parse(serialized);
      } catch (parseError) {
        cache.remove(API_SESSION_PREFIX + normalizedToken);
        throw apiError_('SESSION_EXPIRED', 'Sua sessao expirou. Entre novamente.');
      }
      if (!session || typeof session !== 'object' || Array.isArray(session) ||
          !String(session.email || '').trim() || !String(session.role || '').trim()) {
        cache.remove(API_SESSION_PREFIX + normalizedToken);
        throw apiError_('SESSION_EXPIRED', 'Sua sessao expirou. Entre novamente.');
      }
      cache.put(API_SESSION_PREFIX + normalizedToken, JSON.stringify(session), API_SESSION_TTL_SECONDS);
      return session;
    } catch (error) {
      Logger.log("Erro em apiRequireSession_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em apiRequireSession_: " + error.message);
    throw error;
  }
}

function apiDeleteSession_(token) {
  try {
    const normalizedToken = String(token || '').trim();
    if (normalizedToken) {
      CacheService.getScriptCache().remove(API_SESSION_PREFIX + normalizedToken);
    }
  } catch (error) {
    Logger.log("Erro em apiDeleteSession_: " + error.message);
    throw error;
  }
}

function apiRequireRole_(session, allowedRoles) {
  try {
    const role = apiNormalizeKey_(session.role);
    const allowed = allowedRoles.map(apiNormalizeKey_);
    if (allowed.indexOf(role) === -1) {
      throw apiError_('FORBIDDEN', 'Seu perfil nao possui permissao para esta operacao.');
    }
  } catch (error) {
    Logger.log("Erro em apiRequireRole_: " + error.message);
    throw error;
  }
}

function apiCreateCanteiro_(payload, session, requestId) {
  try {
    const name = String(payload.name || '').trim();
    const type = String(payload.type || '').trim();
    const allowedTypes = ['Controle', 'Cobre Passivo', 'PEMF Ativo'];

    if (name.length < 2) {
      throw apiError_('INVALID_NAME', 'Informe um nome de canteiro com pelo menos 2 caracteres.');
    }
    if (allowedTypes.indexOf(type) === -1) {
      throw apiError_('INVALID_TYPE', 'Selecione um tipo de canteiro valido.');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const id = 'CT-' + Utilities.getUuid().slice(0, 8).toUpperCase();
      apiAppendMappedRow_(SHEETS.CANTEIROS, {
        id: id,
        name: name,
        type: type,
        status: 'ATIVO',
        createdAt: new Date()
      });
      apiSafeAudit_(session.email, 'CANTEIRO_CREATE', id + ' - ' + name);
      return apiSuccess_(
        { id: id, name: name, type: type, status: 'ATIVO' },
        'Canteiro cadastrado.',
        requestId
      );
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    Logger.log("Erro em apiCreateCanteiro_: " + error.message);
    throw error;
  }
}

function apiCreateBiomassa_(payload, session, requestId) {
  try {
    const data = {
      canteiroId: String(payload.canteiroId || '').trim(),
      biomassaFresca: Number(payload.biomassaFresca),
      biomassaSeca: Number(payload.biomassaSeca),
      areaFoliar: payload.areaFoliar === '' || payload.areaFoliar == null
        ? ''
        : Number(payload.areaFoliar)
    };

    if (!data.canteiroId) {
      throw apiError_('CANTEIRO_REQUIRED', 'Selecione o canteiro medido.');
    }
    if (!isFinite(data.biomassaFresca) || data.biomassaFresca < 0) {
      throw apiError_('INVALID_FRESH_BIOMASS', 'Informe um peso fresco valido.');
    }
    if (!isFinite(data.biomassaSeca) || data.biomassaSeca < 0) {
      throw apiError_('INVALID_DRY_BIOMASS', 'Informe um peso seco valido.');
    }
    if (data.areaFoliar !== '' && (!isFinite(data.areaFoliar) || data.areaFoliar < 0)) {
      throw apiError_('INVALID_LEAF_AREA', 'Informe uma area foliar valida.');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      logBiomassa(data);
    } finally {
      lock.releaseLock();
    }
    apiSafeAudit_(session.email, 'BIOMASS_CREATE', data.canteiroId);
    return apiSuccess_(data, 'Medicao de biomassa registrada.', requestId);
  } catch (error) {
    Logger.log("Erro em apiCreateBiomassa_: " + error.message);
    throw error;
  }
}

function apiUpdateSettings_(payload, session, requestId) {
  try {
    try {
      const spreadsheetsId = String(payload.spreadsheetsId || '').trim();
      if (!/^[a-zA-Z0-9_-]{20,}$/.test(spreadsheetsId)) {
        throw apiError_('INVALID_SPREADSHEET_ID', 'Informe um ID de planilha valido.');
      }

      PropertiesService.getScriptProperties().setProperty('SPREADSHEETS_ID', spreadsheetsId);
      apiSafeAudit_(session.email, 'SETTINGS_UPDATE', 'SPREADSHEETS_ID atualizado.');
      return apiSuccess_({ spreadsheetsId: spreadsheetsId }, 'Configuracao salva.', requestId);
    } catch (error) {
      Logger.log("Erro em apiUpdateSettings_: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em apiUpdateSettings_: " + error.message);
    throw error;
  }
}

function apiExportCsv_(payload, requestId) {
  const requested = String(payload.sheet || '').trim();
  const allowed = Object.keys(SHEETS).map(function(key) {
    return SHEETS[key];
  });
  if (allowed.indexOf(requested) === -1) {
    throw apiError_('INVALID_SHEET', 'Selecione um conjunto de dados valido.');
  }

  return apiSuccess_({
    filename: requested.replace(/\s+/g, '_') + '.csv',
    mimeType: 'text/csv;charset=utf-8',
    content: exportToCSV(requested)
  }, '', requestId);
}

function apiCalculateIcr_(payload, requestId) {
  try {
    const ion = String(payload.ion || 'Ca2+');
    const microTesla = Number(payload.microTesla);
    if (!isFinite(microTesla) || microTesla <= 0 || microTesla > 1000) {
      throw apiError_('INVALID_FIELD', 'Informe um campo magnetico entre 0 e 1000 uT.');
    }
    const frequency = getICRFrequency(ion, microTesla * 1e-6);
    if (!isFinite(frequency)) {
      throw apiError_('INVALID_ION', 'Selecione um ion suportado.');
    }
    return apiSuccess_({
      ion: ion,
      microTesla: microTesla,
      frequencyHz: frequency
    }, '', requestId);
  } catch (error) {
    Logger.log("Erro em apiCalculateIcr_: " + error.message);
    throw error;
  }
}

function apiListSheetObjects_(sheetName, limit) {
  try {
    const rows = getRows(sheetName);
    if (!rows || rows.length === 0) {
      return [];
    }
    const headers = rows[0].map(function(header, index) {
      return String(header || 'coluna_' + (index + 1));
    });
    const normalizedLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
    return rows.slice(1).slice(-normalizedLimit).reverse().map(function(row) {
      const item = {};
      headers.forEach(function(header, index) {
        item[header] = apiSerializable_(row[index]);
      });
      return item;
    });
  } catch (error) {
    Logger.log("Erro em apiListSheetObjects_: " + error.message);
    throw error;
  }
}

function apiAppendMappedRow_(sheetName, values) {
  try {
    try {
      const sheet = getConfiguredSheet_(sheetName);
      const lastColumn = sheet.getLastColumn();
      if (lastColumn < 1) {
        throw apiError_('SHEET_WITHOUT_HEADERS', 'A aba "' + sheetName + '" precisa de cabecalhos.');
      }

      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      const row = headers.map(function(header) {
        const key = apiNormalizeKey_(header);
        if (['id', 'codigo', 'canteiro_id', 'id_canteiro'].indexOf(key) !== -1) return values.id;
        if (['nome', 'name', 'canteiro'].indexOf(key) !== -1) return values.name;
        if (['tipo', 'type', 'grupo', 'tratamento'].indexOf(key) !== -1) return values.type;
        if (['status', 'situacao'].indexOf(key) !== -1) return values.status;
        if (['data', 'cadastro', 'created_at', 'criado_em'].indexOf(key) !== -1) return values.createdAt;
        return '';
      });
      sheet.appendRow(row);
    } catch (error) {
      Logger.log("Erro em apiAppendMappedRow_: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em apiAppendMappedRow_: " + error.message);
    throw error;
  }
}

function apiNormalizeKey_(value) {
  try {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  } catch (error) {
    Logger.log("Erro em apiNormalizeKey_: " + error.message);
    throw error;
  }
}

function apiSerializable_(value) {
  try {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
    }
    if (Array.isArray(value)) {
      return value.map(apiSerializable_);
    }
    if (value && typeof value === 'object') {
      const result = {};
      Object.keys(value).forEach(function(key) {
        result[key] = apiSerializable_(value[key]);
      });
      return result;
    }
    return value == null ? '' : value;
  } catch (error) {
    Logger.log("Erro em apiSerializable_: " + error.message);
    throw error;
  }
}

function apiSuccess_(data, message, requestId) {
  return {
    success: true,
    data: apiSerializable_(data),
    message: message || '',
    error: null,
    meta: { requestId: requestId }
  };
}

function apiFailure_(code, message, requestId) {
  return {
    success: false,
    data: null,
    message: message,
    error: { code: code, message: message },
    meta: { requestId: requestId }
  };
}

function apiError_(code, publicMessage) {
  const error = new Error(publicMessage);
  error.code = code;
  error.publicMessage = publicMessage;
  return error;
}

function apiSafeAudit_(userId, action, details) {
  try {
    try {
      logAudit(userId, action, details);
    } catch (error) {
      Logger.log(JSON.stringify({
        event: 'audit_log_failed',
        action: action,
        detail: error.message || String(error)
      }));
    }
  } catch (error) {
    Logger.log("Erro em apiSafeAudit_: " + error.message);
    throw error;
  }
}

function healthCheck() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEETS_ID');
  return {
    status: spreadsheetId ? 'ready' : 'configuration_required',
    configured: Boolean(spreadsheetId),
    timestamp: new Date()
  };
}
