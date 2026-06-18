/**
 * login.js
 * Controlador da tela de login. Depende de supabase.js e auth.js.
 *
 * ── FLUXO DE AUTENTICAÇÃO ────────────────────────────────────────
 *
 *  1. Usuário preenche RM/e-mail + senha e clica em "Entrar".
 *
 *  2. O front faz POST /api/auth/login com { identifier, password }.
 *
 *  3. O back-end (Express):
 *     a. Resolve o RM para um e-mail Supabase (se necessário),
 *        ou usa o e-mail diretamente.
 *     b. Chama supabase.auth.signInWithPassword({ email, password }).
 *     c. Retorna { access_token, refresh_token, role } ao front.
 *
 *  4. O front chama _supabase.auth.setSession() com os tokens,
 *     ativando a sessão no cliente.
 *
 *  5. Auth.redirectByRole(role) envia o usuário para a tela certa:
 *       'aluno'       → /pages/home.html
 *       'professor'   → /pages/teacher.html
 *       'responsavel' → /pages/responsible.html
 *       (default)     → /pages/home.html
 *
 * ── CREDENCIAIS DE TESTE (ambiente de desenvolvimento) ───────────
 *
 *  Aluno:
 *    RM:    123456
 *    Senha: aluno@123
 *
 *  Professor:
 *    E-mail: prof@sesi.sp.br
 *    Senha:  prof@123
 *
 *  Responsável:
 *    E-mail: responsavel@email.com
 *    Senha:  resp@123
 *
 *  Obs.: em produção, as senhas são gerenciadas pelo Supabase Auth.
 *        O RM é mapeado para e-mail na tabela `alunos` do banco.
 * ────────────────────────────────────────────────────────────────
 */
(async function () {

  /* Redireciona se já estiver logado */
  await Auth.requireGuest();

  /* ── Elementos ───────────────────────────────────────────────── */
  const btnLogin  = document.getElementById('btn-login');
  const inpRm     = document.getElementById('inp-rm');
  const inpSenha  = document.getElementById('inp-senha');
  const errBox    = document.getElementById('login-error');
  const togglePw  = document.getElementById('toggle-pw');

  /* ── Toggle senha ────────────────────────────────────────────── */
  togglePw.addEventListener('click', () => {
    const show = inpSenha.type === 'password';
    inpSenha.type        = show ? 'text' : 'password';
    togglePw.textContent = show ? '🙈' : '👁';
  });

  /* ── Utilitários de UI ───────────────────────────────────────── */
  function showError(msg) {
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
    inpRm.classList.add('error');
    inpSenha.classList.add('error');
  }

  function clearError() {
    errBox.classList.add('hidden');
    inpRm.classList.remove('error');
    inpSenha.classList.remove('error');
  }

  function setLoading(on) {
    btnLogin.disabled    = on;
    btnLogin.innerHTML   = on
      ? '<span class="spinner"></span> Entrando...'
      : 'Entrar';
  }

  /* ── Lógica principal ────────────────────────────────────────── */
  async function attemptLogin() {
    clearError();
    const id = inpRm.value.trim();
    const pw = inpSenha.value;

    if (!id || !pw) {
      showError('Preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      /* Chama a API Express para validar + devolver sessão */
      const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ identifier: id, password: pw }),
      });

      const json = await res.json();

      if (!res.ok) {
        showError(json.error ?? 'Erro ao entrar. Tente novamente.');
        return;
      }

      const session = json.session;
      if (!session?.access_token || !session?.refresh_token) {
        throw new Error('Sessão inválida retornada pelo servidor.');
      }

      /* Define sessão no cliente Supabase com o token retornado */
      const { error: sessErr } = await _supabase.auth.setSession({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
      });

      if (sessErr) throw sessErr;

      const profile = json.profile ?? await Auth.fetchProfile(json.user.id);

      Auth.showToast('Bem-vindo!', 'success');

      /* Aguarda 0.5s para o toast aparecer antes de redirecionar */
      setTimeout(() => Auth.redirectByRole(profile.role), 500);

    } catch (err) {
      showError(err.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Eventos ─────────────────────────────────────────────────── */
  btnLogin.addEventListener('click', attemptLogin);

  [inpRm, inpSenha].forEach(inp =>
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); })
  );

  document.getElementById('btn-google')?.addEventListener('click', () => {
    Auth.showToast('Login com Google em breve!');
  });

})();