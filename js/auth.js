/**
 * auth.js
 * Gerencia sessão via Supabase Auth no lado do cliente.
 * Expõe o objeto global `Auth` para as demais páginas.
 */

const Auth = (() => {

  /* ── Rotas por perfil ────────────────────────────────────────── */
  const ROUTES = {
    aluno:       '/pages/home.html',
    responsavel: '/pages/responsavel.html',
    admin:       '/pages/home.html',
  };

  const LOGIN_URL = '/pages/index.html';

  /* ── Sessão atual (cache em memória) ─────────────────────────── */
  let _session = null;
  let _profile  = null;

  /**
   * Inicializa o listener de mudança de sessão.
   * Chame isso no topo de cada página protegida.
   */
  async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    _session = session;

    _supabase.auth.onAuthStateChange((_event, sess) => {
      _session = sess;
    });

    return _session;
  }

  /* ── Getters ─────────────────────────────────────────────────── */
  function getSession()  { return _session; }
  function getUser()     { return _session?.user ?? null; }
  function getProfile()  { return _profile; }

  /* ── Busca o perfil na tabela `alunos` ─────────────────────── */
  async function fetchProfile(userId) {
    // 1. Tenta buscar na tabela alunos
    const { data, error } = await _supabase
      .from('alunos')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      _profile = {
        ...data,
        role: data.role ?? data.tipo ?? 'aluno',
        tipo: data.tipo ?? data.role ?? 'aluno',
      };
      return _profile;
    }

    // 2. Fallback: usa user_metadata do Supabase Auth
    const user = _session?.user;
    if (user?.user_metadata) {
      _profile = {
        id: userId,
        nome: user.user_metadata.nome || user.user_metadata.full_name || 'Usuário',
        rm: user.user_metadata.rm || '',
        turma: user.user_metadata.turma || '',
        ano: user.user_metadata.ano || '',
        email: user.email || '',
        avatar: user.user_metadata.avatar || '🧒',
        role: user.user_metadata.role || user.user_metadata.tipo || 'aluno',
        tipo: user.user_metadata.tipo || user.user_metadata.role || 'aluno',
      };
      return _profile;
    }

    throw error || new Error('Perfil não encontrado.');
  }

  /* ── Logout ──────────────────────────────────────────────────── */
  async function logout() {
    await _supabase.auth.signOut();
    _session = null;
    _profile  = null;
    window.location.href = LOGIN_URL;
  }

  /* ── Guards ──────────────────────────────────────────────────── */

  /**
   * Use em páginas protegidas: redireciona para login se não tiver sessão.
   * Retorna o perfil do usuário ou null (se redirecionou).
   */
  async function requireAuth(allowedRoles = []) {
    const session = await init();
    if (!session) {
      window.location.href = LOGIN_URL;
      return null;
    }

    const profile = await fetchProfile(session.user.id);

    if (allowedRoles.length && !allowedRoles.includes(profile.role)) {
      window.location.href = ROUTES[profile.role] ?? LOGIN_URL;
      return null;
    }

    return profile;
  }

  /**
   * Use na página de login: redireciona para home se já logado.
   */
  async function requireGuest() {
    const session = await init();
    if (!session) return;

    try {
      const profile = await fetchProfile(session.user.id);
      redirectByRole(profile.role);
    } catch {
      // Sessão existe mas perfil não — deixa na tela de login
    }
  }

  /**
   * Redireciona o usuário para a rota correta pelo papel (role).
   */
  function redirectByRole(role) {
    window.location.href = ROUTES[role] ?? ROUTES.aluno;
  }

  /* ── Toast helper ────────────────────────────────────────────── */
  function showToast(msg, type = '') {
    const t = document.createElement('div');
    t.className = `toast${type ? ' ' + type : ''}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ── API pública ─────────────────────────────────────────────── */
  return {
    init, getSession, getUser, getProfile,
    fetchProfile, logout,
    requireAuth, requireGuest, redirectByRole,
    showToast,
    LOGIN_URL,
  };

})();