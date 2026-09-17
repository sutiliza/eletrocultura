/**
 * ==============================================================================
 * COMPONENTE: Db_Usuarios.gs
 * TÍTULO: Cadastro de Usuários
 * FUNCIONALIDADES:
 *   - Gerenciamento de credenciais e permissões de acesso ao sistema.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Users_Admin.html, Auth.gs.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function addUser(name, email, password, role) {
  try {
    return insertRow(SHEETS.USUARIOS, [
      String(name || '').trim(),
      String(email || '').trim().toLowerCase(),
      String(password || ''),
      String(role || 'usuario').trim()
    ]);
  } catch (error) {
    Logger.log("Erro em addUser: " + error.message);
    throw error;
  }
}
