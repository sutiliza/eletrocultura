/**
 * ==============================================================================
 * COMPONENTE: Auth.gs
 * TÍTULO: Autenticação de Usuários
 * FUNCIONALIDADES:
 *   - Compara a credencial em TEXTO PLANO (decisão de frota) e reescreve em
 *     texto plano a linha que ainda estiver com o hash v1$ legado.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Integrado com Main.gs (doPost) e Login.html.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function authenticateUser(email, password) {
  try {
    const sheet = getConfiguredSheet_(SHEETS.USUARIOS);
    const data = sheet.getDataRange().getValues();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      const rowEmail = String(data[i][1] || '').trim().toLowerCase();
      const storedPassword = String(data[i][2] || '');
      if (rowEmail === normalizedEmail && verifyPassword_(password, storedPassword)) {
        // Migracao na direcao da frota: a linha ainda gravada com hash e
        // reescrita em texto plano assim que a senha se prova correta.
        if (storedPassword.indexOf('v1$') === 0) {
          sheet.getRange(i + 1, 3).setValue(String(password || ''));
        }
        return {
          success: true,
          user: {
            id: String(data[i][4] || normalizedEmail),
            username: normalizedEmail,
            name: String(data[i][0] || normalizedEmail),
            email: normalizedEmail,
            role: String(data[i][3] || 'USER'),
            perfil: String(data[i][3] || 'USER')
          }
        };
      }
    }
    return { success: false, message: 'Credenciais inválidas.' };
  } catch (error) {
    Logger.log("Erro em authenticateUser: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}

/**
 * NEUTRALIZADO: devolve a senha em TEXTO PLANO, sem hash.
 *
 * A frota opera com credencial em texto plano por decisao de contexto
 * (quiosque escolar supervisionado): a coordenacao precisa conseguir ler a
 * senha na planilha para auxiliar quem a esqueceu. Nome mantido por
 * compatibilidade com quem ja chamava.
 */
function hashPassword_(password) {
  return String(password || '');
}

function verifyPassword_(password, storedPassword) {
  try {
    const stored = String(storedPassword || '');
    if (stored.indexOf('v1$') !== 0) {
      return stored === String(password || '');
    }

    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const iterations = Number(parts[1]);
    const salt = parts[2];
    const expected = parts[3];
    if (!isFinite(iterations) || iterations < 1 || !salt || !expected) return false;
    return derivePasswordHash_(String(password || ''), salt, iterations) === expected;
  } catch (error) {
    Logger.log("Erro em verifyPassword_: " + error.message);
    throw error;
  }
}

function derivePasswordHash_(password, salt, iterations) {
  try {
    let value = password + ':' + salt;
    for (let i = 0; i < iterations; i++) {
      const digest = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        value,
        Utilities.Charset.UTF_8
      );
      value = digest.map(function(byte) {
        return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
      }).join('');
    }
    return value;
  } catch (error) {
    Logger.log("Erro em derivePasswordHash_: " + error.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Sessoes baseadas em token — armazenadas em aba 'SessoesAuth' em vez de
// ScriptProperties para evitar poluição de configurações e permitir limpeza.
// ---------------------------------------------------------------------------

var AUTH_TOK_TTL_MS_ = 21600 * 1000; // 6 horas

/** Normaliza tokens emitidos por este componente e rejeita entradas ambíguas. */
function normalizeAuthToken_(tok) {
  if (typeof tok !== 'string') return '';
  var token = tok.trim();
  return /^[A-Za-z0-9]{20,80}$/.test(token) ? token : '';
}

/** Obtem ou cria a aba SessoesAuth para armazenar sessoes. */
function getSessoesAuthSheet_() {
  try {
    try {
      var ss = (typeof Auth_getSpreadsheet_ === 'function') ? Auth_getSpreadsheet_() :
        ((typeof getBoundSpreadsheet_ === 'function') ? getBoundSpreadsheet_() : SpreadsheetApp.getActiveSpreadsheet());
      if (!ss) return null;
      var sheet = ss.getSheetByName('SessoesAuth');
      if (!sheet) {
        sheet = ss.insertSheet('SessoesAuth');
        sheet.getRange(1, 1, 1, 5).setValues([['token', 'userId', 'username', 'role', 'expiresAt']]);
      }
      return sheet;
    } catch (error) {
      Logger.log("Erro em getSessoesAuthSheet_: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em getSessoesAuthSheet_: " + error.message);
    throw error;
  }
}

/**
 * Valida credenciais e devolve um token unico para o cliente.
 * Armazena sessao na aba 'SessoesAuth'.
 * @return {{success:boolean, token?:string, redirectUrl?:string, message?:string}}
 */
function loginWithToken(username, password) {
  try {
    try {
      if (!String(username || '').trim() || !String(password || '')) {
        return { success: false, message: 'Informe usuario e senha.' };
      }
      var result = authenticateUser(username, password);
      if (!result || !result.success || !result.user) {
        return { success: false, message: 'Credenciais invalidas.' };
      }

      var sheet = getSessoesAuthSheet_();
      if (!sheet) return { success: false, message: 'Erro ao criar sessao.' };

      var token = Utilities.getUuid().replace(/-/g, '');
      var expiresAt = new Date().getTime() + AUTH_TOK_TTL_MS_;
      var user = result.user;
      sheet.appendRow([
        token,
        String(user.id || user.username),
        String(user.username),
        String(user.role || 'USER'),
        expiresAt
      ]);

      var baseUrl = '';
      try {
        baseUrl = ScriptApp.getService().getUrl();
      } catch (e) {
        baseUrl = '';
      }

      return {
        success: true,
        token: token,
        user: user,
        redirectUrl: baseUrl ? baseUrl + '?page=app#tok=' + token : ''
      };
    } catch (error) {
      Logger.log("Erro em loginWithToken: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em loginWithToken: " + error.message);
    throw error;
  }
}

/**
 * Verifica se o token corresponde a uma sessao valida na aba 'SessoesAuth'.
 * Deleta sessoes expiradas.
 */
function isAuthenticatedByToken(tok) {
  try {
    try {
      try {
        var normalizedToken = normalizeAuthToken_(tok);
        if (!normalizedToken) return false;
        var sheet = getSessoesAuthSheet_();
        if (!sheet) return false;

        var data = sheet.getDataRange().getValues();
        var now = new Date().getTime();
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]) === normalizedToken) {
            var expiresAt = Number(data[i][4]);
            if (!isFinite(expiresAt) || expiresAt <= now) {
              sheet.deleteRow(i + 1);
              return false;
            }
            return true;
          }
        }
        return false;
      } catch (error) {
        Logger.log("Erro em isAuthenticatedByToken: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em isAuthenticatedByToken: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em isAuthenticatedByToken: " + error.message);
    throw error;
  }
}

/**
 * Retorna o usuario logado a partir do token.
 * @param {string} tok
 * @return {{ username: string, role: string }|null}
 */
function getSessionUser(tok) {
  try {
    try {
      try {
        var normalizedToken = normalizeAuthToken_(tok);
        if (!normalizedToken) return null;
        var sheet = getSessoesAuthSheet_();
        if (!sheet) return null;

        var data = sheet.getDataRange().getValues();
        var now = new Date().getTime();
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]) === normalizedToken) {
            var expiresAt = Number(data[i][4]);
            if (!isFinite(expiresAt) || expiresAt <= now) {
              sheet.deleteRow(i + 1);
              return null;
            }
            var username = String(data[i][2] || '');
            var role = String(data[i][3] || 'USER');
            return {
              userId: String(data[i][1] || username),
              id: String(data[i][1] || username),
              username: username,
              name: username,
              nome: username,
              email: username,
              role: role,
              perfil: role
            };
          }
        }
        return null;
      } catch (error) {
        Logger.log("Erro em getSessionUser: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em getSessionUser: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em getSessionUser: " + error.message);
    throw error;
  }
}

/** Encerra a sessao identificada pelo token. */
function logoutWithToken(tok) {
  try {
    try {
      try {
        var normalizedToken = normalizeAuthToken_(tok);
        if (!normalizedToken) return { ok: true };
        var sheet = getSessoesAuthSheet_();
        if (!sheet) return { ok: true };

        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]) === normalizedToken) {
            sheet.deleteRow(i + 1);
            return { ok: true };
          }
        }
        return { ok: true };
      } catch (error) {
        Logger.log("Erro em logoutWithToken: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em logoutWithToken: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em logoutWithToken: " + error.message);
    throw error;
  }
}

