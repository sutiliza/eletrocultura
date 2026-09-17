// SessionService.gs
/**
 * @overview Gerencia as sessões de usuário no SGTE, incluindo a criação de tokens de sessão, validação de sessões ativas e encerramento de sessões.
 *           Os tokens de sessão são armazenados de forma segura (por exemplo, em propriedades de script ou cache).
 * @module SessionService
 * @requires CacheService (serviço nativo do Apps Script para cache).
 * @requires PropertiesService (serviço nativo do Apps Script para propriedades de script).
 */

const CURRENT_SESSION_KEY_sgteLegacy = "SGTE_CURRENT_SESSION";
const SESSION_TTL_SECONDS_sgteLegacy = 21600;

function createSession_sgteLegacy(userId) {
  try {
    const user = getUserById(Number(userId));
    if (!user) {
      throw new Error("Não foi possível criar a sessão: usuário inexistente.");
    }

    const session = {
      userId: user.ID,
      user: sanitizeUserForClient_(user),
      createdAt: new Date().toISOString()
    };

    CacheService.getUserCache().put(
      CURRENT_SESSION_KEY_sgteLegacy,
      JSON.stringify(session),
      SESSION_TTL_SECONDS_sgteLegacy
    );
    return session;
  } catch (error) {
    Logger.log("Erro em createSession_sgteLegacy: " + error.message);
    throw error;
  }
}

function getSession_sgteLegacy() {
  try {
    try {
      const serialized = CacheService.getUserCache().get(CURRENT_SESSION_KEY_sgteLegacy);
      if (!serialized) {
        return null;
      }

      try {
        return JSON.parse(serialized);
      } catch (parseError) {
        invalidateSession_sgteLegacy();
        return null;
      }
    } catch (error) {
      Logger.log("Erro em getSession_sgteLegacy: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em getSession_sgteLegacy: " + error.message);
    throw error;
  }
}

function invalidateSession_sgteLegacy() {
  CacheService.getUserCache().remove(CURRENT_SESSION_KEY_sgteLegacy);
}

function getCurrentSessionUser_sgteLegacy() {
  try {
    const session = getSession_sgteLegacy();
    if (!session || !session.userId) {
      return null;
    }

    const user = getUserById(Number(session.userId));
    if (!user || user.Status === "Inactive") {
      invalidateSession_sgteLegacy();
      return null;
    }
    return user;
  } catch (error) {
    Logger.log("Erro em getCurrentSessionUser_sgteLegacy: " + error.message);
    throw error;
  }
}
