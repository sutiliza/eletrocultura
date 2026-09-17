/**
 * AuthStandardService — contrato comum de autenticacao por token.
 *
 * Fase 2: tokens de sessao ficam na aba SessoesAuth da planilha principal,
 * nao em ScriptProperties. Configuracoes e IDs continuam podendo usar
 * ScriptProperties fora deste modulo.
 */
var AuthStandardService = (function () {
  'use strict';

  var adapters_ = {};
  var config_ = {
    tokenPrefix: 'FLEET_AUTH_TOK_',
    sessionTtlSeconds: 21600
  };

  function configure(options) {
    options = options || {};
    adapters_ = options.adapters || adapters_;
    if (options.sessionKey)        config_.tokenPrefix = options.sessionKey + '_TOK_';
    if (options.tokenPrefix)       config_.tokenPrefix = options.tokenPrefix;
    if (options.sessionTtlSeconds) config_.sessionTtlSeconds = options.sessionTtlSeconds;
    return api;
  }

  function login(username, password) {
    try {
      if (!username || !password || typeof adapters_.findUser !== 'function') {
        return { ok: false, message: 'Credenciais Invalidas' };
      }

      var user = adapters_.findUser(String(username));
      if (!user || user.active === false || !verify_(password, user)) {
        return { ok: false, message: 'Credenciais Invalidas' };
      }

      var token = uuid_();
      var session = {
        userId:      String(user.id || user.username || username),
        username:    String(user.username || username),
        role:        String(user.role || 'USER'),
        permissions: user.permissions || [],
        issuedAt:    now_(),
        expiresAt:   now_() + config_.sessionTtlSeconds * 1000
      };

      saveSession_(token, session);

      return {
        ok:    true,
        token: token,
        user:  { id: session.userId, username: session.username, role: session.role }
      };
    } catch (error) {
      Logger.log("Erro em login: " + error.message);
      throw error;
    }
  }

  function isAuthenticatedByToken(token) {
    return getSessionByToken_(token) !== null;
  }

  function isAuthenticated() {
    return false;
  }

  function getUserRole(token) {
    var session = getSessionByToken_(token);
    return session ? session.role : null;
  }

  function checkPermission(required, token) {
    try {
      var session = getSessionByToken_(token);
      if (!session) return denied_();
      if (!required) return { ok: true, principal: session };

      var requiredList = Array.isArray(required) ? required : [required];
      var permissions = session.permissions || [];
      var allowed = requiredList.indexOf(session.role) >= 0 ||
        permissions.indexOf('*') >= 0 ||
        requiredList.some(function (permission) {
          return permissions.indexOf(permission) >= 0;
        });
      return allowed ? { ok: true, principal: session } : denied_();
    } catch (error) {
      Logger.log("Erro em checkPermission: " + error.message);
      throw error;
    }
  }

  function logout(token) {
    deleteSession_(token);
    return { ok: true };
  }

  function saveSession_(token, session) {
    try {
      try {
        var sheet = sessionSheet_();
        sheet.appendRow([
          token,
          session.userId,
          session.username,
          session.role,
          session.expiresAt,
          session.issuedAt,
          JSON.stringify(session.permissions || []),
          config_.tokenPrefix
        ]);
      } catch (error) {
        Logger.log("Erro em saveSession_: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em saveSession_: " + error.message);
      throw error;
    }
  }

  function getSessionByToken_(token) {
    try {
      try {
        try {
          if (typeof token !== 'string' || !/^[A-Za-z0-9]{20,80}$/.test(token.trim())) return null;
          token = token.trim();
          var sheet = sessionSheet_();
          var lastRow = sheet.getLastRow();
          if (lastRow < 2) return null;

          var values = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 8)).getValues();
          for (var i = 0; i < values.length; i++) {
            var row = values[i];
            if (String(row[0]) !== String(token)) continue;

            var expiresAt = Number(row[4]);
            if (!isFinite(expiresAt) || expiresAt <= now_()) {
              sheet.deleteRow(i + 2);
              return null;
            }

            return {
              userId: String(row[1] || ''),
              username: String(row[2] || ''),
              role: String(row[3] || 'USER'),
              expiresAt: expiresAt,
              issuedAt: Number(row[5]) || null,
              permissions: parsePermissions_(row[6])
            };
          }
          return null;
        } catch (error) {
          Logger.log("Erro em getSessionByToken_: " + error.message);
          throw error; // Re-lança para tratamento superior
        }
      } catch (error) {
        Logger.log("Erro em getSessionByToken_: " + error.message);
        throw error;
      }
    } catch (error) {
      Logger.log("Erro em getSessionByToken_: " + error.message);
      throw error;
    }
  }

  function deleteSession_(token) {
    try {
      try {
        try {
          if (!token) return;
          var sheet = sessionSheet_();
          var lastRow = sheet.getLastRow();
          if (lastRow < 2) return;

          var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
          for (var i = values.length - 1; i >= 0; i--) {
            if (String(values[i][0]) === String(token)) sheet.deleteRow(i + 2);
          }
        } catch (error) {
          Logger.log("Erro em deleteSession_: " + error.message);
          throw error; // Re-lança para tratamento superior
        }
      } catch (error) {
        Logger.log("Erro em deleteSession_: " + error.message);
        throw error;
      }
    } catch (error) {
      Logger.log("Erro em deleteSession_: " + error.message);
      throw error;
    }
  }

  function sessionSheet_() {
    try {
      try {
        try {
          if (adapters_.sessionSheet) return adapters_.sessionSheet;
          if (typeof getSessoesAuthSheet_ === 'function') {
            var existing = getSessoesAuthSheet_();
            if (existing) return existing;
          }

          var ss = resolveSpreadsheet_();
          var sheet = ss.getSheetByName('SessoesAuth');
          if (!sheet) {
            sheet = ss.insertSheet('SessoesAuth');
            sheet.getRange(1, 1, 1, 8).setValues([[
              'token', 'userId', 'username', 'role', 'expiresAt', 'issuedAt', 'permissions', 'source'
            ]]);
          }
          return sheet;
        } catch (error) {
          Logger.log("Erro em sessionSheet_: " + error.message);
          throw error; // Re-lança para tratamento superior
        }
      } catch (error) {
        Logger.log("Erro em sessionSheet_: " + error.message);
        throw error;
      }
    } catch (error) {
      Logger.log("Erro em sessionSheet_: " + error.message);
      throw error;
    }
  }

  function resolveSpreadsheet_() {
    try {
      if (adapters_.spreadsheet) return adapters_.spreadsheet;
      if (typeof AuthStd_getSpreadsheet_ === 'function') return AuthStd_getSpreadsheet_();
      if (typeof Auth_getSpreadsheet_ === 'function') return Auth_getSpreadsheet_();
      if (typeof getBoundSpreadsheet_ === 'function') return getBoundSpreadsheet_();
      var active = SpreadsheetApp.getActiveSpreadsheet();
      if (active) return active;
      return SpreadsheetApp.getActive();
    } catch (error) {
      Logger.log("Erro em resolveSpreadsheet_: " + error.message);
      throw error;
    }
  }

  function parsePermissions_(raw) {
    try {
      try {
        if (!raw) return [];
        try {
          var parsed = JSON.parse(String(raw));
          return Array.isArray(parsed) ? parsed : [];
        } catch (ignored) {
          return [];
        }
      } catch (error) {
        Logger.log("Erro em parsePermissions_: " + error.message);
        throw error;
      }
    } catch (error) {
      Logger.log("Erro em parsePermissions_: " + error.message);
      throw error;
    }
  }

  function verify_(password, user) {
    var plain = user.password;
    if (plain !== undefined && plain !== null && plain !== '' &&
        constantTimeEqual_(String(password), String(plain))) {
      return true;
    }

    var hash = String(user.passwordHash || '').trim();
    if (!/^[0-9a-fA-F]{64}$/.test(hash) || typeof Utilities === 'undefined' ||
        !Utilities.computeDigest) return false;
    var digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(password),
      Utilities.Charset.UTF_8
    );
    var candidate = digest.map(function (byte) {
      return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
    }).join('');
    return constantTimeEqual_(candidate.toLowerCase(), hash.toLowerCase());
  }

  function constantTimeEqual_(left, right) {
    if (left.length !== right.length) return false;
    var difference = 0;
    for (var i = 0; i < left.length; i++) {
      difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }
    return difference === 0;
  }

  function denied_() {
    return { ok: false, message: 'Acesso Negado' };
  }

  function uuid_() {
    try {
      if (adapters_.uuid) return adapters_.uuid();
      return typeof Utilities !== 'undefined'
        ? Utilities.getUuid().replace(/-/g, '')
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    } catch (error) {
      Logger.log("Erro em uuid_: " + error.message);
      throw error;
    }
  }

  function now_() {
    return adapters_.now ? adapters_.now() : new Date().getTime();
  }

  var api = {
    configure:              configure,
    login:                  login,
    isAuthenticated:        isAuthenticated,
    isAuthenticatedByToken: isAuthenticatedByToken,
    getUserRole:            getUserRole,
    checkPermission:        checkPermission,
    logout:                 logout
  };
  return api;
}());

var getScriptUrl = (typeof getScriptUrl === 'function') ? getScriptUrl : function () {
  try {
    return ScriptApp.getService().getUrl();
  } catch (e) {
    return '';
  }
};

