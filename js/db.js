/**
 * db.js — Simulated database using localStorage
 * In production, replace with Supabase client calls.
 */
(function(w) {
  'use strict';

  const DAILY_LIMIT = 16; // minutes

  // ---- Seeds ----
  function seedIfEmpty() {
    if (!localStorage.getItem('sesi_users')) {
      const users = [
        { id: 'u1', rm: '123456', email: 'ana@sesi.sp.br', senha: '123456', nome: 'Ana Silva', turma: '7ºA', avatar: '👧', tipo: 'aluno' },
        { id: 'u2', rm: '654321', email: 'joao@sesi.sp.br', senha: '123456', nome: 'João Pedro', turma: '9ºB', avatar: '👦', tipo: 'aluno' },
        { id: 'u3', rm: '111222', email: 'maria@sesi.sp.br', senha: '123456', nome: 'Maria Oliveira', turma: '8ºC', avatar: '👩', tipo: 'aluno' },
        { id: 'u4', rm: '444555', email: 'carlos@sesi.sp.br', senha: '123456', nome: 'Carlos Souza', turma: '6ºA', avatar: '🧑', tipo: 'aluno' },
        { id: 'r1', rm: 'resp01', email: 'responsavel@gmail.com', senha: '123456', nome: 'Sandra Silva', turma: null, avatar: '👩‍👧', tipo: 'responsavel', filhos: ['u1'] },
      ];
      localStorage.setItem('sesi_users', JSON.stringify(users));
    }

    if (!localStorage.getItem('sesi_logs')) {
      // Seed some historical reading data
      const today = new Date();
      const logs = [];
      const entries = [
        { uid: 'u1', days: [0,1,2,3,4,5,6], mins: [16,12,16,10,14,16,8] },
        { uid: 'u2', days: [0,1,2,3,4,5,6], mins: [10,16,14,16,16,12,6] },
        { uid: 'u3', days: [0,1,2,3,4,5,6], mins: [14,10,16,8,12,16,10] },
        { uid: 'u4', days: [0,1,2,3,4,5,6], mins: [8,14,10,16,10,14,6] },
      ];
      entries.forEach(e => {
        e.days.forEach((d, i) => {
          if (i < 6) { // Don't seed today
            const date = new Date(today);
            date.setDate(date.getDate() - (6 - i));
            logs.push({
              id: `log_${e.uid}_${i}`,
              userId: e.uid,
              minutos: e.mins[i],
              timestamp: date.toISOString(),
              date: date.toISOString().slice(0, 10)
            });
          }
        });
      });
      localStorage.setItem('sesi_logs', JSON.stringify(logs));
    }
  }

  seedIfEmpty();

  // ---- Helpers ----
  function getUsers() { return JSON.parse(localStorage.getItem('sesi_users') || '[]'); }
  function getLogs() { return JSON.parse(localStorage.getItem('sesi_logs') || '[]'); }
  function saveLogs(logs) { localStorage.setItem('sesi_logs', JSON.stringify(logs)); }
  function today() { return new Date().toISOString().slice(0, 10); }

  // ---- Auth ----
  function login(identifier, senha) {
    const users = getUsers();
    const user = users.find(u =>
      (u.rm === identifier || u.email === identifier) && u.senha === senha
    );
    if (!user) return { ok: false, error: 'RM/e-mail ou senha incorretos.' };
    const session = { ...user };
    delete session.senha;
    localStorage.setItem('sesi_session', JSON.stringify(session));
    return { ok: true, user: session };
  }

  function logout() { localStorage.removeItem('sesi_session'); }

  function getSession() {
    const s = localStorage.getItem('sesi_session');
    return s ? JSON.parse(s) : null;
  }

  // ---- Reading Logs ----
  function getTodayMinutes(userId) {
    return getLogs()
      .filter(l => l.userId === userId && l.date === today())
      .reduce((sum, l) => sum + l.minutos, 0);
  }

  function getRemainingToday(userId) {
    return Math.max(0, DAILY_LIMIT - getTodayMinutes(userId));
  }

  function registerMinutes(userId, minutos) {
    // Validation (simulates back-end check)
    if (!Number.isInteger(minutos) || minutos < 1) {
      return { ok: false, error: 'Quantidade de minutos inválida.' };
    }
    const already = getTodayMinutes(userId);
    const remaining = DAILY_LIMIT - already;
    if (minutos > remaining) {
      return {
        ok: false,
        error: remaining <= 0
          ? `Você já atingiu sua meta diária de ${DAILY_LIMIT} minutos! Parabéns! 🎉`
          : `Você só pode registrar mais ${remaining} minuto${remaining !== 1 ? 's' : ''} hoje. A meta diária recomendada é de ${DAILY_LIMIT} minutos.`
      };
    }
    const logs = getLogs();
    logs.push({
      id: `log_${userId}_${Date.now()}`,
      userId,
      minutos,
      timestamp: new Date().toISOString(),
      date: today()
    });
    saveLogs(logs);
    return { ok: true, totalHoje: already + minutos, remaining: remaining - minutos };
  }

  // ---- Stats ----
  function getWeekData(userId) {
    const logs = getLogs();
    const days = [];
    const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const mins = logs.filter(l => l.userId === userId && l.date === dateStr).reduce((s, l) => s + l.minutos, 0);
      days.push({ date: dateStr, day: dayNames[d.getDay()], mins, isToday: i === 0 });
    }
    return days;
  }

  function getMonthTotal(userId) {
    const logs = getLogs();
    const month = today().slice(0, 7);
    return logs.filter(l => l.userId === userId && l.date.startsWith(month)).reduce((s, l) => s + l.minutos, 0);
  }

  function getAllTimeTotal(userId) {
    return getLogs().filter(l => l.userId === userId).reduce((s, l) => s + l.minutos, 0);
  }

  function getSchoolTotal() {
    return getLogs().reduce((s, l) => s + l.minutos, 0);
  }

  function getSchoolGoal() { return 20000; }

  function getTurmaRanking() {
    const users = getUsers().filter(u => u.tipo === 'aluno');
    const logs = getLogs();
    const month = today().slice(0, 7);
    const turmas = {};
    users.forEach(u => {
      const mins = logs.filter(l => l.userId === u.id && l.date.startsWith(month)).reduce((s, l) => s + l.minutos, 0);
      turmas[u.turma] = (turmas[u.turma] || 0) + mins;
    });
    return Object.entries(turmas)
      .map(([turma, mins]) => ({ turma, mins }))
      .sort((a, b) => b.mins - a.mins);
  }

  function getStudentRanking() {
    const users = getUsers().filter(u => u.tipo === 'aluno');
    const logs = getLogs();
    const month = today().slice(0, 7);
    return users
      .map(u => ({
        ...u,
        mins: logs.filter(l => l.userId === u.id && l.date.startsWith(month)).reduce((s, l) => s + l.minutos, 0)
      }))
      .sort((a, b) => b.mins - a.mins);
  }

  function getConquests(userId) {
    const total = getAllTimeTotal(userId);
    const month = getMonthTotal(userId);
    return [
      { id: 'c1', nome: 'Leitor Iniciante', icon: '📖', desc: 'Registrou a primeira leitura', unlocked: getLogs().some(l => l.userId === userId) },
      { id: 'c2', nome: 'Leitor Dedicado', icon: '📚', desc: '100 min lidos no total', unlocked: total >= 100 },
      { id: 'c3', nome: 'Super Leitor', icon: '🏆', desc: '300 min lidos no total', unlocked: total >= 300 },
      { id: 'c4', nome: 'Meta Semanal', icon: '⭐', desc: 'Meta completa em uma semana', unlocked: false },
      { id: 'c5', nome: 'Rei da Leitura', icon: '👑', desc: '1.000 min lidos', unlocked: total >= 1000 },
      { id: 'c6', nome: 'Turma Campeã', icon: '🥇', desc: 'Sua turma ficou em 1º no ranking', unlocked: false },
    ];
  }

  function getChallenges(userId) {
    const weekData = getWeekData(userId);
    const weekTotal = weekData.reduce((s, d) => s + d.mins, 0);
    const month = getMonthTotal(userId);
    return [
      {
        id: 'ch1', tipo: 'Desafio da Semana', icon: '🎁',
        nome: 'Leia 80 minutos esta semana',
        current: weekTotal, goal: 80
      },
      {
        id: 'ch2', tipo: 'Desafio Mensal', icon: '🎖️',
        nome: 'Leia 400 minutos este mês',
        current: month, goal: 400
      },
    ];
  }

  function getFilhos(responsavelId) {
    const users = getUsers();
    const resp = users.find(u => u.id === responsavelId);
    if (!resp || !resp.filhos) return [];
    return resp.filhos.map(fid => {
      const filho = users.find(u => u.id === fid);
      if (!filho) return null;
      return { ...filho, monthMins: getMonthTotal(fid), conquests: getConquests(fid) };
    }).filter(Boolean);
  }

  // ---- Export ----
  w.DB = {
    DAILY_LIMIT,
    login, logout, getSession,
    getTodayMinutes, getRemainingToday, registerMinutes,
    getWeekData, getMonthTotal, getAllTimeTotal,
    getSchoolTotal, getSchoolGoal,
    getTurmaRanking, getStudentRanking,
    getConquests, getChallenges,
    getFilhos
  };

})(window);