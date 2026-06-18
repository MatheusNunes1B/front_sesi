/**
 * api.js — API client para SESI Leitura
 * Substitui o db.js (localStorage) por chamadas reais ao backend Supabase.
 * Depende de supabase.js (_supabase) e auth.js (Auth).
 */
const API = (() => {
  'use strict';

  const DAILY_LIMIT = 16;

  /* ── Token helper ────────────────────────────────────────────── */
  async function getToken() {
    const { data } = await _supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function authFetch(url, options = {}) {
    const token = await getToken();
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
    return json;
  }

  /* ── Leitura ─────────────────────────────────────────────────── */

  /** POST /api/leitura/registrar — registra minutos lidos */
  async function registrarLeitura(minutos) {
    return authFetch('/api/leitura/registrar', {
      method: 'POST',
      body: JSON.stringify({ minutos }),
    });
  }

  /**
   * GET /api/leitura/progresso
   * @param {'semana'|'mes'} periodo
   * @returns {{ periodo, totalPeriodo, lidoHoje, restanteHoje, porDia }}
   */
  async function getProgresso(periodo = 'semana') {
    return authFetch(`/api/leitura/progresso?periodo=${periodo}`);
  }

  /* ── Ranking ─────────────────────────────────────────────────── */

  /** GET /api/ranking?tipo=turmas */
  async function getRankingTurmas() {
    return authFetch('/api/ranking?tipo=turmas');
  }

  /** GET /api/ranking?tipo=escola — termômetro geral */
  async function getTermometro() {
    return authFetch('/api/ranking?tipo=escola');
  }

  /* ── Conquistas (computadas no cliente) ──────────────────────── */

  function computeConquistas(totalMes, porDiaSemana) {
    const diasLidos = porDiaSemana
      ? Object.values(porDiaSemana).filter(m => m > 0).length
      : 0;

    return [
      { id: 'c1', nome: 'Leitor Iniciante', icon: '📖', desc: 'Registrou a primeira leitura', unlocked: totalMes > 0 },
      { id: 'c2', nome: 'Leitor Dedicado',  icon: '📚', desc: '100 min lidos este mês',       unlocked: totalMes >= 100 },
      { id: 'c3', nome: 'Super Leitor',     icon: '🏆', desc: '300 min lidos este mês',       unlocked: totalMes >= 300 },
      { id: 'c4', nome: 'Meta Semanal',     icon: '⭐', desc: 'Leu todos os 7 dias',          unlocked: diasLidos >= 7 },
      { id: 'c5', nome: 'Rei da Leitura',   icon: '👑', desc: '500 min lidos este mês',       unlocked: totalMes >= 500 },
      { id: 'c6', nome: 'Turma Campeã',     icon: '🥇', desc: 'Sua turma ficou em 1º',        unlocked: false },
    ];
  }

  function computeDesafios(totalSemana, totalMes) {
    return [
      {
        id: 'ch1', tipo: 'Desafio da Semana', icon: '🎁',
        nome: 'Leia 80 minutos esta semana',
        current: totalSemana, goal: 80,
      },
      {
        id: 'ch2', tipo: 'Desafio Mensal', icon: '🎖️',
        nome: 'Leia 400 minutos este mês',
        current: totalMes, goal: 400,
      },
    ];
  }

  /* ── Helpers para gráficos ──────────────────────────────────── */

  /** Transforma o objeto porDia { "2026-06-10": 16, ... } em array de 7 dias */
  function buildWeekDays(porDia) {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        date: dateStr,
        day: dayNames[d.getDay()],
        mins: porDia[dateStr] || 0,
        isToday: i === 0,
      });
    }
    return days;
  }

  /* ── API pública ─────────────────────────────────────────────── */
  return {
    DAILY_LIMIT,
    registrarLeitura,
    getProgresso,
    getRankingTurmas,
    getTermometro,
    computeConquistas,
    computeDesafios,
    buildWeekDays,
  };
})();
