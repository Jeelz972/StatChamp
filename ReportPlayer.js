// reportPlayer.js
// Version : "Direct Client-Side AI" (Sans PHP)
// Dépendances : React, TailwindCSS

// --- CONFIGURATION ---

// --- UTILITAIRE : Gestion des Dates ---
var parseFrenchDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

// =================================================================================
// 2. MOTEUR D'ANALYSE STATISTIQUE
// =================================================================================

const LEVEL_BENCHMARKS = {
  NBA: {
    id: 'NBA',
    label: 'NBA',
    ts_elite: 62,
    ts_good: 57,
    ts_bad: 52,
    usage_high: 28,
    usage_low: 15,
    ast_good: 6,
    astTov_good: 2.8,
    astTov_bad: 1.5,
    oreb_good: 2.0,
    reb_dom: 10,
    def_active: 2.5,
    pf36_warn: 4.0,
    pf36_bad: 5.0,
    threePct_good: 37,
    trend_delta: 3,
  },
  Euroleague: {
    id: 'Euroleague',
    label: 'Euroleague',
    ts_elite: 60,
    ts_good: 55,
    ts_bad: 50,
    usage_high: 26,
    usage_low: 14,
    ast_good: 5,
    astTov_good: 2.5,
    astTov_bad: 1.3,
    oreb_good: 2.0,
    reb_dom: 9,
    def_active: 2.5,
    pf36_warn: 4.0,
    pf36_bad: 5.0,
    threePct_good: 36,
    trend_delta: 3,
  },
  Eurocup: {
    id: 'Eurocup',
    label: 'Eurocup',
    ts_elite: 59,
    ts_good: 54,
    ts_bad: 49,
    usage_high: 25,
    usage_low: 14,
    ast_good: 5,
    astTov_good: 2.3,
    astTov_bad: 1.2,
    oreb_good: 2.0,
    reb_dom: 9,
    def_active: 2.3,
    pf36_warn: 4.2,
    pf36_bad: 5.2,
    threePct_good: 35,
    trend_delta: 3,
  },
  LNB: {
    id: 'LNB',
    label: 'Betclic Élite',
    ts_elite: 58,
    ts_good: 53,
    ts_bad: 48,
    usage_high: 25,
    usage_low: 14,
    ast_good: 4.5,
    astTov_good: 2.2,
    astTov_bad: 1.2,
    oreb_good: 1.8,
    reb_dom: 8,
    def_active: 2.2,
    pf36_warn: 4.2,
    pf36_bad: 5.5,
    threePct_good: 34,
    trend_delta: 3,
  },
  ProB: {
    id: 'ProB',
    label: 'Pro B',
    ts_elite: 57,
    ts_good: 52,
    ts_bad: 47,
    usage_high: 25,
    usage_low: 14,
    ast_good: 4.5,
    astTov_good: 2.2,
    astTov_bad: 1.2,
    oreb_good: 1.8,
    reb_dom: 8,
    def_active: 2.2,
    pf36_warn: 4.2,
    pf36_bad: 5.5,
    threePct_good: 34,
    trend_delta: 3,
  },
  NM1: {
    id: 'NM1',
    label: 'NM1',
    ts_elite: 56,
    ts_good: 51,
    ts_bad: 46,
    usage_high: 25,
    usage_low: 14,
    ast_good: 4.5,
    astTov_good: 2.2,
    astTov_bad: 1.2,
    oreb_good: 1.8,
    reb_dom: 8,
    def_active: 2.2,
    pf36_warn: 4.2,
    pf36_bad: 5.5,
    threePct_good: 34,
    trend_delta: 3,
  },
  NM2: {
    id: 'NM2',
    label: 'NM2',
    ts_elite: 56,
    ts_good: 51,
    ts_bad: 46,
    usage_high: 24,
    usage_low: 13,
    ast_good: 4,
    astTov_good: 2.0,
    astTov_bad: 1.1,
    oreb_good: 1.8,
    reb_dom: 8,
    def_active: 2.0,
    pf36_warn: 4.5,
    pf36_bad: 5.5,
    threePct_good: 33,
    trend_delta: 4,
  },
  U21_Elite: {
    id: 'U21_Elite',
    label: 'U21 Élite',
    ts_elite: 58, // Top 10% des scoreurs du championnat (ex: Fodzo, Boisdur)
    ts_good: 52, // Moyenne d'efficacité globale (Team FG% ~44, 3P% ~31)
    ts_bad: 46, // Seuil de faible rendement offensif
    usage_high: 25, // Responsabilité de leader (1ère/2ème option offensive)
    usage_low: 14, // Joueur de rotation / Role player
    ast_good: 4.5, // Profil créateur (Top 15 des passeurs de la ligue)
    astTov_good: 1.8, // Ratio de sécurité optimal pour le rythme U21
    astTov_bad: 0.8, // Perte de contrôle du jeu (plus de TOV que d'AST)
    oreb_good: 2.4, // Impact fort au rebond offensif (profil intérieur actif)
    reb_dom: 8.5, // Seuil de domination statistique au rebond total
    def_active: 2.5, // Activité cumulée (Interceptions + Contres par match)
    pf36_warn: 4.2, // Alerte gestion des fautes rapportée à 36 min
    pf36_bad: 5.5, // Indiscipline défensive récurrente
    threePct_good: 34, // Fiabilité extérieure supérieure (Moyenne ligue ~31%)
    trend_delta: 5,
  },
  U18_Elite: {
    id: 'U18_Elite',
    label: 'U18 Élite',
    ts_elite: 56, // Top tiers d'efficacité (inférieur à l'U21, tir moins régulier)
    ts_good: 50, // Moyenne correcte pour la catégorie
    ts_bad: 44, // Seuil critique de rendement offensif
    usage_high: 25, // Responsabilité majeure (joueur à 15-20+ tirs/match)
    usage_low: 15, // Joueur de rotation / Complément
    ast_good: 4.5, // Excellent créateur (Moyenne haute pour les meneurs U18)
    astTov_good: 1.6, // Ratio de sécurité (plus bas qu'en U21 dû au nombre de TOV élevé)
    astTov_bad: 0.7, // Perte de contrôle fréquente (plus de turnovers que de passes)
    oreb_good: 2.5, // Impact fort au rebond offensif (plus d'opportunités en U18)
    reb_dom: 8.5, // Seuil de domination physique au rebond
    def_active: 2.5, // Activité (Stl + Blk) ; reflète l'intensité défensive U18
    pf36_warn: 4.5, // Alerte fautes rapide (fréquent en formation)
    pf36_bad: 5.8, // Indiscipline défensive marquée
    threePct_good: 31, // Réussite extérieure "Good" (Moyenne ligue ~28-30%)
    trend_delta: 5, // Seuil de fluctuation de performance
  },
};

let CURRENT_LEVEL = 'U18_Elite';
const getBenchmarks = () => LEVEL_BENCHMARKS[CURRENT_LEVEL] || LEVEL_BENCHMARKS['U18_Elite'];

const AnalysisEngine = {
  _estimatePoss: (teamTotals, oppTotals) => {
    return window.StatsEngine.possAdvanced(teamTotals, oppTotals);
  },
  _impact: (playerStats) => {
    const Ois =
      playerStats.avg.pts +
      playerStats.avg.ast * 1.5 +
      playerStats.avg.reb * 1.2 +
      playerStats.avg.oreb * 1.2 +
      playerStats.avg.fte * 1.2 -
      playerStats.avg.tov * 1.5;
    const Dis =
      playerStats.avg.stl * 2 +
      playerStats.avg.blk * 2 +
      playerStats.avg.dreb -
      playerStats.avg.fouls * 0.7 +
      playerStats.avg.plusMinus * 0.3;
    const Impact = ((Ois + Dis) / playerStats.avg.min) * 40;
    return Impact;
  },
  _calcPlayerNetRtg: (playerStat, teamTotals, oppTotals, teamMin) => {
    const pMin = parseFloat(playerStat.min || playerStat.minutes || 0);
    const poss = window.StatsEngine.possAdvanced(teamTotals, oppTotals);
    const pm = parseFloat(playerStat.plusMinus || 0);
    return window.StatsEngine.playerNetRtg(pm, poss, pMin, teamMin);
  },

  // --- PROCESSEUR PRINCIPAL ---
  processPlayerData: (games, roster) => {
    if (!roster || !Array.isArray(roster)) return [];

    const gameContext = {};
    if (games && Array.isArray(games)) {
      games.forEach((game) => {
        const rawData = game.players || game.playerStats;
        if (!rawData) return;
        const list = Array.isArray(rawData) ? rawData : Object.values(rawData);
        const team = { min: 0, fga: 0, fgm: 0, fta: 0, ftm: 0, tov: 0, oreb: 0, dreb: 0 };
        list.forEach((s) => {
          team.min += parseFloat(s.min || s.minutes || 0);
          team.fga += parseFloat(s.fga || 0);
          team.fgm += parseFloat(s.fgm || 0);
          team.fta += parseFloat(s.fta || 0);
          team.ftm += parseFloat(s.ftm || 0);
          team.tov += parseFloat(s.tov || 0);
          team.oreb += parseFloat(s.oreb || 0);
          team.dreb += parseFloat(s.dreb || 0);
        });
        const opp = game.opponentStats || game.oppStats || null;
        gameContext[game.id] = { team, opp };
      });
    }

    const playerMap = {};
    roster.forEach((p) => (playerMap[p.id] = { ...p, logs: [] }));

    if (games && Array.isArray(games)) {
      const sortedGames = [...games].sort(
        (a, b) => parseFrenchDate(b.date) - parseFrenchDate(a.date)
      );
      sortedGames.forEach((game) => {
        const rawData = game.players || game.playerStats;
        if (!rawData) return;
        const ctx = gameContext[game.id] || {
          team: { min: 200, fga: 50, fta: 10, tov: 10, oreb: 0, dreb: 0, fgm: 20, ftm: 5 },
          opp: null,
        };
        let matchStats = Array.isArray(rawData)
          ? rawData
          : Object.keys(rawData).map((key) => ({ ...rawData[key], id: rawData[key].id || key }));

        matchStats.forEach((stat) => {
          if (!playerMap[stat.id]) {
            playerMap[stat.id] = {
              id: stat.id,
              name: stat.name || `#${stat.number}`,
              number: stat.number,
              logs: [],
            };
          }
          const min = parseFloat(stat.min || stat.minutes || 0);
          const pts = parseFloat(stat.pts || 0);
          const fga = parseFloat(stat.fga || 0);
          const fouls = parseFloat(stat.fouls || stat.pf || 0);

          if (min > 0 || pts > 0 || fouls > 0 || fga > 0) {
            const reb =
              parseFloat(stat.reb || 0) > 0
                ? parseFloat(stat.reb)
                : parseFloat(stat.oreb || 0) + parseFloat(stat.dreb || 0);
            const ast = parseFloat(stat.ast || 0);
            const stl = parseFloat(stat.stl || 0);
            const blk = parseFloat(stat.blk || 0);
            const tov = parseFloat(stat.tov || 0);
            const fgm = parseFloat(stat.fgm || 0);
            const fta = parseFloat(stat.fta || 0);
            const ftm = parseFloat(stat.ftm || 0);
            const oreb = parseFloat(stat.oreb || 0);
            const threea = parseFloat(stat.threea || stat.threePA || 0);
            const threem = parseFloat(stat.threem || stat.threePM || 0);
            const missedFG = Math.max(0, fga - fgm);
            const missedFT = Math.max(0, fta - ftm);
            const eff = pts + reb + ast + stl + blk - (missedFG + missedFT + tov);
            let usage = 0;
            if (min > 0 && ctx.team.min > 0) {
              const teamPoss = ctx.team.fga + 0.44 * ctx.team.fta + ctx.team.tov;
              const playPoss = fga + 0.44 * fta + tov;
              usage = 100 * ((playPoss * (ctx.team.min / 5)) / (min * teamPoss));
            }
            const netRtg = AnalysisEngine._calcPlayerNetRtg(stat, ctx.team, ctx.opp, ctx.team.min);
            playerMap[stat.id].logs.push({
              date: game.date || '',
              rawDate: parseFrenchDate(game.date),
              opponent: game.opponent || 'N/A',
              isWin: parseInt(game.homeScore) > parseInt(game.awayScore),
              pts,
              reb,
              ast,
              stl,
              blk,
              tov,
              fga,
              fgm,
              fta,
              ftm,
              threea,
              threem,
              oreb,
              min,
              fouls,
              plusMinus: parseFloat(stat.plusMinus || 0),
              eff,
              usage,
              netRtg,
              _hasFteData: stat.foulDrawn !== undefined,
              foulDrawn: parseFloat(stat.foulDrawn || 0),
            });
          }
        });
      });
    }

    return Object.values(playerMap)
      .map((p) => {
        p.logs.sort((a, b) => b.rawDate - a.rawDate);
        const gp = p.logs.length;
        if (gp === 0)
          return {
            ...p,
            avg: {
              pts: 0,
              reb: 0,
              ast: 0,
              eff: 0,
              min: 0,
              usage: 0,
              TS: 0,
              eFG: 0,
              threePAr: 0,
              FTr: 0,
              astTov: 0,
              pf36: 0,
              netRtg: 0,
              fgPct: 0,
              threePct: 0,
              ftPct: 0,
              threea: 0,
              oreb: 0,
              stl: 0,
              blk: 0,
              tov: 0,
              fouls: 0,
              plusMinus: 0,
              impactTotal: 0,
              fte: 0,
              threem: 0,
              fga: 0,
              fgm: 0,
              fta: 0,
              ftm: 0,
            },
          };
        const sum = (k) => p.logs.reduce((acc, c) => acc + (c[k] || 0), 0);
        const avg = {
          pts: sum('pts') / gp,
          reb: sum('reb') / gp,
          ast: sum('ast') / gp,
          stl: sum('stl') / gp,
          blk: sum('blk') / gp,
          tov: sum('tov') / gp,
          min: sum('min') / gp,
          eff: sum('eff') / gp,
          plusMinus: sum('plusMinus') / gp,
          oreb: sum('oreb') / gp,
          fouls: sum('fouls') / gp,
          usage: sum('usage') / gp,
          netRtg: sum('netRtg') / gp,
          fga: sum('fga'),
          fgm: sum('fgm'),
          threea: sum('threea'),
          threem: sum('threem'),
          fta: sum('fta'),
          ftm: sum('ftm'),
        };
        avg.fgPct = avg.fga > 0 ? (avg.fgm / avg.fga) * 100 : 0;
        avg.threePct = avg.threea > 0 ? avg.threem / avg.threea : 0;
        avg.ftPct = avg.fta > 0 ? (avg.ftm / avg.fta) * 100 : 0;
        avg.threePAr = avg.fga > 0 ? avg.threea / avg.fga : 0;
        avg.FTr = avg.fga > 0 ? avg.fta / avg.fga : 0;
        avg.TS = window.StatsEngine.TS(sum('pts'), avg.fga, avg.fta);
        avg.eFG = window.StatsEngine.eFG(avg.fgm, avg.threem, avg.fga);
        avg.astTov = window.StatsEngine.astTovRatio(avg.ast, avg.tov);
        avg.pf36 = window.StatsEngine.per36(avg.fouls, avg.min);
        // FTE
        const trackedLogs = p.logs.filter((l) => l._hasFteData);
        const untrackedLogs = p.logs.filter((l) => !l._hasFteData);
        let totalFte;
        if (trackedLogs.length > 0) {
          const trackedFte = trackedLogs.reduce((a, l) => a + (l.foulDrawn || 0), 0);
          const trackedMin = trackedLogs.reduce((a, l) => a + (l.min || 0), 0);
          const ftePerMin = trackedMin > 0 ? trackedFte / trackedMin : 0;
          const estimatedFte = untrackedLogs.reduce((a, l) => a + ftePerMin * (l.min || 0), 0);
          totalFte = trackedFte + estimatedFte;
        } else {
          totalFte = sum('fta') / 2;
        }
        avg.fte = totalFte / gp;
        // Impact Total
        const dreb_pg = avg.reb - avg.oreb;
        const DIS =
          avg.stl * 2.5 + avg.blk * 2 + dreb_pg * 1.2 - avg.fouls * 0.8 + avg.plusMinus * 0.5;
        const OIS = avg.pts + 2 * avg.ast + 1.5 * avg.oreb + 1.2 * avg.fte - 2 * avg.tov;
        avg.impactTotal = avg.min > 0 ? ((OIS + DIS) / avg.min) * 100 : 0;
        return { ...p, avg };
      })
      .sort((a, b) => b.avg.eff - a.avg.eff);
  },

  // --- ARCHETYPE ---
  getArchetype: (p, allPlayers = []) => {
    if (!p)
      return {
        name: 'Non Évalué',
        desc: 'Données manquantes.',
        color: 'text-slate-500',
        border: 'border-slate-700',
        bg: 'bg-slate-800',
      };
    const avg = p.avg || p;
    if (!avg || typeof avg !== 'object' || (avg.pts === undefined && avg.reb === undefined))
      return {
        name: 'Non Évalué',
        desc: 'Pas de données.',
        color: 'text-slate-500',
        border: 'border-slate-700',
        bg: 'bg-slate-800',
      };
    const playerId = p.id || (p.info ? p.info.id : null) || 'unknown';
    const rotation =
      Array.isArray(allPlayers) && allPlayers.length > 0
        ? allPlayers.filter((x) => x && x.avg && typeof x.avg.min === 'number' && x.avg.min > 5)
        : [];
    let isTopUsage = false,
      isTopEfficiency = false,
      isTopCreator = false,
      isTopShooter = false,
      isTopRebounder = false,
      isTopDefender = false,
      isTopOreb = false,
      isLowUsage = false;

    if (rotation.length >= 4) {
      const topTier = Math.max(2, Math.ceil(rotation.length * 0.25));
      const bottomTier = rotation.length - topTier;
      const getRank = (stat) =>
        [...rotation]
          .sort((a, b) => (b.avg[stat] || 0) - (a.avg[stat] || 0))
          .findIndex((x) => x.id === playerId) + 1;
      const rankUsage = getRank('usage'),
        rankTS = getRank('TS'),
        rankAst = getRank('ast');
      const rankAstTov = getRank('astTov'),
        rank3PAr = getRank('threePAr'),
        rankReb = getRank('reb');
      const rankOreb = getRank('oreb');
      const rankDef =
        [...rotation]
          .sort(
            (a, b) => (b.avg.stl || 0) + (b.avg.blk || 0) - ((a.avg.stl || 0) + (a.avg.blk || 0))
          )
          .findIndex((x) => x.id === playerId) + 1;
      isTopUsage = rankUsage > 0 && rankUsage <= topTier;
      isLowUsage = rankUsage > bottomTier;
      isTopEfficiency = rankTS > 0 && rankTS <= topTier;
      isTopCreator = rankAst > 0 && rankAst <= topTier && rankAstTov <= topTier + 1;
      isTopShooter = rank3PAr > 0 && rank3PAr <= topTier && (avg.threePAr || 0) > 0.25;
      isTopRebounder = rankReb > 0 && rankReb <= topTier;
      isTopOreb = rankOreb > 0 && rankOreb <= topTier;
      isTopDefender = rankDef > 0 && rankDef <= topTier;
    } else {
      isTopUsage = (avg.usage || 0) > 24;
      isLowUsage = (avg.usage || 0) < 15;
      isTopEfficiency = (avg.TS || 0) > 52;
      isTopCreator = (avg.ast || 0) > 3.5 && (avg.astTov || 0) > 1.5;
      isTopShooter = (avg.threePAr || 0) > 0.35;
      isTopRebounder = (avg.reb || 0) > 7;
      isTopOreb = (avg.oreb || 0) > 2.5;
      isTopDefender = (avg.stl || 0) + (avg.blk || 0) > 2.0;
    }

    if (isTopUsage && isTopDefender)
      return {
        name: 'Two-Way Star',
        desc: 'Domine des deux côtés du terrain.',
        color: 'text-purple-400',
        border: 'border-purple-500',
        bg: 'bg-purple-900/20',
      };
    if (isTopUsage && isTopCreator)
      return {
        name: 'Moteur Offensif',
        desc: 'Crée pour lui et les autres.',
        color: 'text-amber-400',
        border: 'border-amber-500',
        bg: 'bg-amber-900/20',
      };
    if (isTopUsage)
      return {
        name: 'Option #1',
        desc: "Focal point de l'attaque.",
        color: 'text-orange-400',
        border: 'border-orange-500',
        bg: 'bg-orange-900/20',
      };
    if (isTopShooter && isTopDefender)
      return {
        name: '3-and-D',
        desc: 'Menace extérieure et verrou défensif.',
        color: 'text-teal-400',
        border: 'border-teal-500',
        bg: 'bg-teal-900/20',
      };
    if (isTopRebounder && isTopShooter)
      return {
        name: 'Stretch Big',
        desc: 'Écarte le jeu et contrôle la raquette.',
        color: 'text-pink-400',
        border: 'border-pink-500',
        bg: 'bg-pink-900/20',
      };
    if (isTopRebounder && isTopCreator)
      return {
        name: 'Point Forward',
        desc: 'Intérieur/Ailier créateur.',
        color: 'text-indigo-300',
        border: 'border-indigo-400',
        bg: 'bg-indigo-900/20',
      };
    if (isTopCreator)
      return {
        name: 'Floor General',
        desc: 'Garant du jeu collectif.',
        color: 'text-indigo-500',
        border: 'border-indigo-600',
        bg: 'bg-indigo-900/20',
      };
    if (isTopShooter)
      return {
        name: 'Sniper',
        desc: 'Menace extérieure principale.',
        color: 'text-cyan-400',
        border: 'border-cyan-500',
        bg: 'bg-cyan-900/20',
      };
    if (isTopRebounder && isTopEfficiency)
      return {
        name: 'Paint Beast',
        desc: 'Finition et ancrage intérieur.',
        color: 'text-blue-400',
        border: 'border-blue-500',
        bg: 'bg-blue-900/20',
      };
    if (isTopOreb && isTopDefender)
      return {
        name: 'Guerrier',
        desc: 'Énergie, rebonds offensifs et hustle.',
        color: 'text-rose-400',
        border: 'border-rose-500',
        bg: 'bg-rose-900/20',
      };
    if (isTopDefender)
      return {
        name: 'Lockdown',
        desc: 'Spécialiste défensif majeur.',
        color: 'text-red-500',
        border: 'border-red-600',
        bg: 'bg-red-900/20',
      };
    if (isTopEfficiency && isLowUsage)
      return {
        name: 'Finisseur',
        desc: 'Très efficace sur un faible volume.',
        color: 'text-green-400',
        border: 'border-green-500',
        bg: 'bg-green-900/20',
      };
    if ((avg.eff || 0) > 9 && !isTopUsage && !isLowUsage)
      return {
        name: 'Glue Guy',
        desc: 'Fait le liant, bon partout.',
        color: 'text-emerald-400',
        border: 'border-emerald-500',
        bg: 'bg-emerald-900/20',
      };
    return {
      name: 'Rotation',
      desc: 'Joueur de collectif.',
      color: 'text-slate-400',
      border: 'border-slate-500',
      bg: 'bg-slate-900',
    };
  },

  // --- SWOT ---
  getSWOT: (p) => {
    const s = [],
      w = [],
      a = p.avg;
    const B = getBenchmarks();
    if (p.logs.length === 0) return { strengths: [], weaknesses: [] };
    if (a.TS > B.ts_elite) s.push(`Scoreur Élite (TS% ${a.TS.toFixed(0)}%)`);
    else if (a.TS > B.ts_good) s.push(`Efficace (TS% ${a.TS.toFixed(0)}%)`);
    if (a.astTov > B.astTov_good && a.ast > 2)
      s.push(`Gestionnaire Sûr (Ratio ${a.astTov.toFixed(1)})`);
    if (a.oreb > B.oreb_good) s.push('Guerrier Rebond Offensif');
    if (a.FTr > 0.35) s.push('Provoque des Fautes');
    if (a.netRtg > 8) s.push(`Impact Victoire (+/-)`);
    if (a.threePct > B.threePct_good && a.threea > 2) s.push('Spacer (3 pts)');
    if (a.TS < B.ts_bad && a.usage > B.usage_low + 5) w.push('Inefficace pour son volume');
    if (a.astTov < B.astTov_bad && a.ast > 1) w.push('Prise de décision (Pertes de balle)');
    if (a.pf36 > B.pf36_warn) w.push(`Foul Trouble (${a.pf36.toFixed(1)}/36m)`);
    return { strengths: s, weaknesses: w };
  },

  // --- FALLBACK NARRATIVE ---
  getFallbackNarrative: (p) => {
    const a = p.avg;
    const gp = p.logs.length;
    if (!a || gp === 0) return 'Pas assez de données pour établir un profil.';
    const B = getBenchmarks();
    const arch = AnalysisEngine.getArchetype(a);
    const parts = [];
    parts.push(`Profil ${arch.name} sur ${gp} match${gp > 1 ? 's' : ''} (réf. ${B.label}).`);
    if (a.usage > B.usage_high) {
      if (a.TS > B.ts_elite)
        parts.push(
          `Première option offensive crédible : ${a.pts.toFixed(1)} pts à ${a.TS.toFixed(0)}% TS, ratio volume/efficacité au-dessus du lot pour le niveau.`
        );
      else if (a.TS > B.ts_bad)
        parts.push(
          `Gros volume (USG ${a.usage.toFixed(0)}%) mais efficacité perfectible (${a.TS.toFixed(0)}% TS). Tendance croqueur.`
        );
      else
        parts.push(
          `Volume de tir élevé (USG ${a.usage.toFixed(0)}%) pour une efficacité insuffisante (${a.TS.toFixed(0)}% TS, seuil ${B.label} : ${B.ts_good}%). Doit apprendre à choisir ses tirs.`
        );
    } else if (a.usage > B.usage_low) {
      if (a.TS > B.ts_elite)
        parts.push(
          `Scoreur efficace dans l'ombre : ${a.pts.toFixed(1)} pts à ${a.TS.toFixed(0)}% TS sur volume modéré.`
        );
      else if (a.TS < B.ts_bad)
        parts.push(
          `Production offensive limitée (${a.pts.toFixed(1)} pts, ${a.TS.toFixed(0)}% TS). Doit contribuer autrement.`
        );
    } else {
      if (a.TS > B.ts_elite + 2)
        parts.push(
          `Finisseur discret mais redoutable : convertit à ${a.TS.toFixed(0)}% TS sur faible volume.`
        );
      else parts.push(`Rôle offensif mineur (USG ${a.usage.toFixed(0)}%).`);
    }
    if (a.threePAr > 0.5 && a.threePct > B.threePct_good)
      parts.push(
        `Menace extérieure confirmée (${a.threePct.toFixed(0)}% à 3pts, rate ${a.threePAr.toFixed(2)}).`
      );
    else if (a.threePAr > 0.4 && a.threePct < B.threePct_good - 4)
      parts.push(
        `Shoot trop de 3pts (rate ${a.threePAr.toFixed(2)}) pour son adresse (${a.threePct.toFixed(0)}%, réf. ${B.label} : ${B.threePct_good}%). Sélection à revoir.`
      );
    if (a.ast > B.ast_good && a.astTov > B.astTov_good)
      parts.push(
        `Gestionnaire de balle sûr (${a.ast.toFixed(1)} ast, ratio ${a.astTov.toFixed(1)}).`
      );
    else if (a.ast > B.ast_good * 0.75 && a.astTov < B.astTov_bad)
      parts.push(
        `Crée du jeu (${a.ast.toFixed(1)} ast) mais perd trop de ballons (ratio ${a.astTov.toFixed(1)}). Discipline à travailler.`
      );
    else if (a.astTov < 1.0 && a.tov > 1.5)
      parts.push(`Pertes de balle préoccupantes (ratio Ast/TO ${a.astTov.toFixed(1)}).`);
    if (a.oreb > B.oreb_good)
      parts.push(`Présence au rebond offensif (${a.oreb.toFixed(1)}/match). Seconde chance.`);
    if (a.reb > B.reb_dom) parts.push(`Dominant au rebond (${a.reb.toFixed(1)}/match).`);
    if (a.netRtg > 10)
      parts.push(
        `Impact collectif fort : l'équipe performe nettement mieux avec lui sur le terrain.`
      );
    else if (a.netRtg < -8)
      parts.push(`Impact collectif négatif : le groupe souffre sur ses minutes.`);
    if (a.stl + (a.blk || 0) > B.def_active)
      parts.push(
        `Activité défensive notable (${a.stl.toFixed(1)} int + ${(a.blk || 0).toFixed(1)} ctr).`
      );
    if (a.pf36 > B.pf36_bad)
      parts.push(
        `Problème de fautes récurrent (${a.pf36.toFixed(1)}/36m). Risque de foul trouble.`
      );
    else if (a.pf36 > B.pf36_warn)
      parts.push(`Discipline limite (${a.pf36.toFixed(1)} fautes/36m).`);
    if (gp >= 5) {
      const last3 = p.logs.slice(0, 3);
      const recentPts = last3.reduce((s, l) => s + l.pts, 0) / 3;
      const diff = recentPts - a.pts;
      if (diff > B.trend_delta)
        parts.push(
          `Montée en puissance récente (+${diff.toFixed(1)} pts sur les 3 derniers matchs).`
        );
      else if (diff < -B.trend_delta)
        parts.push(`En baisse de régime sur les 3 derniers matchs (${diff.toFixed(1)} pts).`);
    }
    return parts.join(' ');
  },
};

// =================================================================================
// 3. COMPOSANTS VISUELS
// =================================================================================
const ScoutingRadar = ({ avg }) => {
  const MAX = { pts: 22, reb: 11, ast: 7, def: 4.5, eff: 20 };
  const val = (v, m) => Math.min((v || 0) / m, 1);
  const stats = [
    { l: 'SCO', v: val(avg.pts, MAX.pts) },
    { l: 'REB', v: val(avg.reb, MAX.reb) },
    { l: 'AST', v: val(avg.ast, MAX.ast) },
    { l: 'DEF', v: val(avg.stl + avg.blk, MAX.def) },
    { l: 'EFF', v: val(avg.eff, MAX.eff) },
  ];
  const c = 60,
    r = 40;
  const poly = (d, f) =>
    d
      .map((s, i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2,
          v = f ? f(s.v) : r;
        return `${c + Math.cos(a) * v},${c + Math.sin(a) * v}`;
      })
      .join(' ');
  return (
    <svg viewBox="0 0 120 120" className="w-full h-40 filter drop-shadow-lg">
      {[0.2, 0.4, 0.6, 0.8, 1].map((k, i) => (
        <polygon
          key={i}
          points={poly(stats, () => r * k)}
          fill={i % 2 ? '#0f172a' : '#1e1e3a'}
          stroke="#334155"
          strokeWidth="0.5"
        />
      ))}
      <polygon
        points={poly(stats, (v) => r * v)}
        fill="rgba(212,165,116,0.4)"
        stroke="#d4a574"
        strokeWidth="2"
      />
      {stats.map((s, i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return (
          <text
            key={i}
            x={c + Math.cos(a) * (r + 14)}
            y={c + Math.sin(a) * (r + 10)}
            fontSize="7"
            fontWeight="bold"
            fill="#94a3b8"
            textAnchor="middle"
          >
            {s.l}
          </text>
        );
      })}
    </svg>
  );
};

function calcFiveManLineups(playerId, games, roster) {
  const MIN_POSS = 8;
  const homeIds = new Set(roster.map((p) => p.id || parseInt(p.id)));
  const lineupMap = {};
  games.forEach((game) => {
    if (!game.actions || !game.actions.length || !game.actions[0].onCourt) return;
    game.actions.forEach((a) => {
      if (!a.onCourt) return;
      const homeOnCourt = a.onCourt.filter((id) => homeIds.has(id)).sort((x, y) => x - y);
      if (homeOnCourt.length !== 5 || !homeOnCourt.includes(playerId)) return;
      const key = homeOnCourt.join('-');
      if (!lineupMap[key])
        lineupMap[key] = {
          ids: homeOnCourt,
          actions: 0,
          pts: 0,
          ptsConceded: 0,
          fga: 0,
          fta: 0,
          tov: 0,
          orb: 0,
          oppFga: 0,
          oppFta: 0,
          oppTov: 0,
          oppOrb: 0,
        };
      const m = lineupMap[key];
      const isHome = homeIds.has(a.pid);
      m.actions++;
      if (a.type === 'SHOT') {
        if (isHome) {
          m.fga++;
          if (a.made) m.pts += a.val;
        } else {
          m.oppFga++;
          if (a.made) m.ptsConceded += a.val;
        }
      }
      if (a.type === 'FT') {
        if (isHome) {
          m.fta += a.ftAtt || 0;
          m.pts += a.ftMade || 0;
        } else {
          m.oppFta += a.ftAtt || 0;
          m.ptsConceded += a.ftMade || 0;
        }
      }
      if (a.type === 'TOV') {
        if (isHome) m.tov++;
        else m.oppTov++;
      }
      if (a.type === 'OREB') {
        if (isHome) m.orb++;
        else m.oppOrb++;
      }
    });
  });
  const results = Object.values(lineupMap)
    .map((m) => {
      const poss = Math.max(1, m.fga + 0.44 * m.fta + m.tov - m.orb);
      const oppPoss = Math.max(1, m.oppFga + 0.44 * m.oppFta + m.oppTov - m.oppOrb);
      const avgPoss = (poss + oppPoss) / 2;
      if (avgPoss < MIN_POSS) return null;
      const ortg = Math.round((m.pts / avgPoss) * 100);
      const drtg = Math.round((m.ptsConceded / avgPoss) * 100);
      const names = m.ids.map((id) => {
        const p = roster.find((r) => (r.id || parseInt(r.id)) === id);
        return p ? '#' + (p.number || '?') : '#' + id;
      });
      return {
        ids: m.ids,
        names,
        poss: Math.round(avgPoss),
        ortg,
        drtg,
        netRtg: ortg - drtg,
        pm: m.pts - m.ptsConceded,
        lowSample: avgPoss < 20,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.netRtg - a.netRtg);
  return { best: results.slice(0, 5), worst: results.slice(-5).reverse(), total: results.length };
}

// =================================================================================
// 4. COMPOSANT PRINCIPAL
// =================================================================================
const PlayerReportModule = ({ currentUser, onClose, games: propGames, roster: propRoster }) => {
  const [players, setPlayers] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [aiNarrative, setAiNarrative] = React.useState(null);
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);

  const exportPlayerPDF = async (player) => {
    if (!window.html2canvas || !window.jspdf) {
      alert('Librairies PDF non chargees (html2canvas / jsPDF).');
      return;
    }
    setIsExportingPDF(true);
    try {
      const container = document.querySelector('.max-w-6xl');
      if (!container) {
        alert('Conteneur introuvable');
        setIsExportingPDF(false);
        return;
      }
      const canvas = await window.html2canvas(container, {
        backgroundColor: '#0a0a1a',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 16;
      const imgH = (canvas.height / canvas.width) * imgW;
      if (imgH <= pageH - 16) {
        pdf.addImage(imgData, 'PNG', 8, 8, imgW, imgH);
      } else {
        const pageImgH = pageH - 16;
        const totalPages = Math.ceil(imgH / pageImgH);
        for (let pg = 0; pg < totalPages; pg++) {
          if (pg > 0) pdf.addPage();
          const srcY = ((pg * pageImgH) / imgH) * canvas.height;
          const srcH = (pageImgH / imgH) * canvas.height;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = Math.min(srcH, canvas.height - srcY);
          const tCtx = tempCanvas.getContext('2d');
          tCtx.drawImage(
            canvas,
            0,
            srcY,
            canvas.width,
            tempCanvas.height,
            0,
            0,
            tempCanvas.width,
            tempCanvas.height
          );
          const pageImg = tempCanvas.toDataURL('image/png');
          const drawH = (tempCanvas.height / canvas.width) * imgW;
          pdf.addImage(pageImg, 'PNG', 8, 8, imgW, drawH);
        }
      }
      const safeName = (player.name || 'joueur').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${safeName}_rapport.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
      alert('Erreur export PDF.');
    }
    setIsExportingPDF(false);
  };

  React.useEffect(() => {
    if (propRoster) setPlayers(AnalysisEngine.processPlayerData(propGames || [], propRoster));
  }, [propGames, propRoster]);

  React.useEffect(() => {
    setAiNarrative(null);
    if (!selectedId) return;
    if (!players || players.length === 0) return;
    const player = players.find(
      (p) =>
        p.id === selectedId ||
        String(p.id) === String(selectedId) ||
        Number(p.id) === Number(selectedId)
    );
    if (!player || !player.logs || player.logs.length === 0) return;
    setAiNarrative(AnalysisEngine.getFallbackNarrative(player));
  }, [selectedId, players]);

  if (!currentUser || (currentUser.role !== 'coach' && currentUser.role !== 'admin')) return null;

  // --- LISTE DES JOUEURS ---
  if (!selectedId) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col font-sans text-slate-200">
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center shadow-lg z-10">
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-300 uppercase tracking-tighter">
              Scouting<span className="text-white">Pro</span>
            </h1>
            <p className="text-slate-400 text-xs mt-1">{players.length} Profils</p>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg hover:text-white border border-slate-700"
          >
            Fermer
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {players.map((p) => {
              const arch = AnalysisEngine.getArchetype(p, players);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl text-left hover:border-indigo-500 hover:bg-slate-800/80 transition-all relative overflow-hidden group shadow-lg flex flex-col h-full"
                >
                  {p.photo && (
                    <div
                      className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-cover bg-center grayscale"
                      style={{ backgroundImage: `url(${p.photo})` }}
                    ></div>
                  )}
                  <div className="relative z-10">
                    <div
                      className={`absolute -right-3 -top-3 text-6xl font-black opacity-[0.05] group-hover:opacity-[0.1] ${arch.color}`}
                    >
                      #{p.number}
                    </div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xl font-bold text-white truncate pr-2">{p.name}</span>
                      <span className="text-slate-500 font-mono text-sm">#{p.number}</span>
                    </div>
                    <div
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-4 border ${arch.border} ${arch.color} ${arch.bg}`}
                    >
                      {arch.name}
                    </div>
                    <div className="flex items-end gap-4 mt-auto pt-4 border-t border-slate-800/50">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">PTS</div>
                        <div className="text-lg font-bold text-white">{p.avg.pts.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">USG%</div>
                        <div className="text-lg font-bold text-slate-300">
                          {p.avg.usage.toFixed(0)}%
                        </div>
                      </div>
                      <div className="ml-auto">
                        <div className="text-[10px] text-slate-500 uppercase text-right">EVAL</div>
                        <div className="text-lg font-bold text-yellow-500 text-right">
                          {p.avg.eff.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- VUE DETAIL ---
  const p = players.find((x) => x.id === selectedId);
  if (!p) return null;
  const arch = AnalysisEngine.getArchetype(p, players);
  const swot = AnalysisEngine.getSWOT(p);
  const narrativeText = aiNarrative || AnalysisEngine.getFallbackNarrative(p);
  const last5 = p.logs.slice(0, 5);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 overflow-y-auto font-sans text-slate-200">
      {/* STICKY HEADER */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 p-3 flex justify-between items-center z-50 print:hidden shadow-md">
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white font-bold uppercase text-sm"
        >
          <span>← Retour</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-2"
          >
            <span>🖨️</span> Imprimer
          </button>
          <button
            onClick={() => exportPlayerPDF(p)}
            disabled={isExportingPDF}
            className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-2"
          >
            <span>📄</span> {isExportingPDF ? 'Export...' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 pb-24 print:p-0">
        {/* HERO HEADER */}
        <section
          className={`rounded-2xl p-8 border-l-8 ${arch.border} bg-slate-900 relative overflow-hidden shadow-2xl`}
        >
          {p.photo && (
            <div
              className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
              style={{ backgroundImage: `url(${p.photo})`, backgroundBlendMode: 'overlay' }}
            ></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-0"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-5xl font-black text-white uppercase tracking-tighter">
                  {p.name}
                </h1>
                <span className="text-3xl text-slate-500 font-mono">#{p.number}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold uppercase tracking-wide ${arch.color}`}>
                  {arch.name}
                </span>
                <span className="text-slate-400 italic">"{arch.desc}"</span>
              </div>
            </div>
            <div className="flex gap-6 bg-slate-950/50 p-4 rounded-xl backdrop-blur-sm border border-slate-800/50">
              <div>
                <div className="text-3xl font-black text-white">{p.avg.pts.toFixed(1)}</div>
                <div className="text-[10px] font-bold text-slate-500">PTS</div>
              </div>
              <div>
                <div className="text-3xl font-black text-white">{p.avg.reb.toFixed(1)}</div>
                <div className="text-[10px] font-bold text-slate-500">REB</div>
              </div>
              <div>
                <div className="text-3xl font-black text-white">{p.avg.ast.toFixed(1)}</div>
                <div className="text-[10px] font-bold text-slate-500">AST</div>
              </div>
              <div>
                <div className="text-3xl font-black text-yellow-400">{p.avg.eff.toFixed(1)}</div>
                <div className="text-[10px] font-bold text-yellow-600">EVAL</div>
              </div>
            </div>
          </div>
        </section>

        {/* NARRATIVE */}
        <div className="border p-6 rounded-xl relative overflow-hidden bg-slate-900 border-slate-800">
          <h3 className="text-slate-400 font-bold uppercase text-xs mb-2 flex items-center gap-2">
            <span className="text-lg">📝</span> Note Rapide
          </h3>
          <p className="text-slate-200 text-lg leading-relaxed font-medium">{narrativeText}</p>
        </div>

        {/* ============================================================ */}
        {/* TABLEAU DE BORD — 5 SECTIONS                                 */}
        {/* ============================================================ */}
        {(() => {
          const a = p.avg;
          const gp = p.logs.length;
          const B = getBenchmarks();
          const dreb = a.reb - a.oreb;
          const total3PA = a.threea * gp;
          const totalFGA = a.fga + total3PA;
          const totalFGM = a.fgm + a.threem;
          const fgPctGlobal = totalFGA > 0 ? (totalFGM / totalFGA) * 100 : 0;
          const per30 = (stat) => (a.min > 0 ? (stat / a.min) * 30 : 0);
          const p30 = {
            pts: per30(a.pts),
            reb: per30(a.reb),
            ast: per30(a.ast),
            stl: per30(a.stl),
            pf: per30(a.fouls),
          };

          // Analyse Coach
          const strengths = [];
          const improvements = [];
          if (a.TS > B.ts_elite)
            strengths.push({
              icon: '🟢',
              text: `Efficacité au scoring élite (TS% ${a.TS.toFixed(1)}%). Excellent choix de tirs.`,
            });
          else if (a.TS > B.ts_good)
            strengths.push({
              icon: '🟢',
              text: `Bonne efficacité au scoring (TS% ${a.TS.toFixed(1)}%).`,
            });
          if (a.astTov > B.astTov_good && a.ast > 2)
            strengths.push({
              icon: '🟢',
              text: `Gestionnaire fiable — ratio AST/TOV de ${a.astTov.toFixed(1)} avec ${a.ast.toFixed(1)} passes décisives/match.`,
            });
          if (a.threePct > B.threePct_good && a.threea > 2)
            strengths.push({
              icon: '🟢',
              text: `Menace à 3 points : ${a.threePct.toFixed(1)}% sur ${a.threea.toFixed(1)} tentatives/match.`,
            });
          if (p30.reb > 8 && strengths.length < 3)
            strengths.push({
              icon: '🟢',
              text: `Présence au rebond : ${p30.reb.toFixed(1)} rebonds projetés sur 30 min.`,
            });
          if (a.stl + a.blk > B.def_active && strengths.length < 3)
            strengths.push({
              icon: '🟢',
              text: `Activité défensive notable : ${a.stl.toFixed(1)} INT + ${a.blk.toFixed(1)} CTR/match.`,
            });
          if (a.oreb > B.oreb_good && strengths.length < 3)
            strengths.push({
              icon: '🟢',
              text: `Guerrier au rebond offensif (${a.oreb.toFixed(1)}/match).`,
            });
          if (a.min < 20 && a.min > 5 && p30.pts > 15 && strengths.length < 3)
            strengths.push({
              icon: '🟢',
              text: `Impact fort rapporté au temps de jeu : ${p30.pts.toFixed(1)} PTS projetés sur 30 min (${a.min.toFixed(1)} min jouées).`,
            });
          if (a.plusMinus > 5 && strengths.length < 3)
            strengths.push({
              icon: '🟢',
              text: `Impact collectif positif : +${a.plusMinus.toFixed(1)} de +/- moyen.`,
            });
          if (a.FTr > 0.35 && strengths.length < 3)
            strengths.push({
              icon: '🟢',
              text: `Provoque des fautes régulièrement (FTr ${a.FTr.toFixed(2)}).`,
            });
          if (a.netRtg > 8 && strengths.length < 3)
            strengths.push({
              icon: '🟢',
              text: `L'équipe performe nettement mieux avec lui (NetRtg +${a.netRtg.toFixed(0)}).`,
            });
          if (p30.pf > 4.5)
            improvements.push({
              icon: '🟠',
              text: `Gestion des fautes à travailler — ${p30.pf.toFixed(1)} fautes projetées sur 30 min. Risque de foul trouble si temps de jeu élargi.`,
            });
          else if (a.pf36 > B.pf36_warn)
            improvements.push({
              icon: '🟠',
              text: `Discipline : ${a.pf36.toFixed(1)} fautes/36 min, au-dessus du seuil d'alerte (${B.pf36_warn}).`,
            });
          if (a.astTov < B.astTov_bad && a.tov > 1.5)
            improvements.push({
              icon: '🟠',
              text: `Ratio AST/TOV faible (${a.astTov.toFixed(1)}). Réduire les pertes de balle (${a.tov.toFixed(1)}/match).`,
            });
          if (a.TS < B.ts_bad && a.usage > B.usage_low + 5 && improvements.length < 2)
            improvements.push({
              icon: '🟠',
              text: `Efficacité offensive insuffisante (TS% ${a.TS.toFixed(1)}%) pour le volume de tirs.`,
            });
          if (a.ftPct < 60 && a.fta / Math.max(gp, 1) > 1.5 && improvements.length < 2)
            improvements.push({
              icon: '🟠',
              text: `Lancer-franc à travailler : ${a.ftPct.toFixed(1)}%. Points gratuits perdus.`,
            });
          if (a.threePct < B.threePct_good - 5 && a.threea > 2 && improvements.length < 2)
            improvements.push({
              icon: '🟠',
              text: `Adresse extérieure insuffisante (${a.threePct.toFixed(1)}% à 3pts sur ${a.threea.toFixed(1)} tent./match).`,
            });
          if (a.netRtg < -8 && improvements.length < 2)
            improvements.push({
              icon: '🟠',
              text: `Impact collectif négatif (NetRtg ${a.netRtg.toFixed(0)}). Le groupe souffre sur ses minutes.`,
            });
          const topS = strengths.slice(0, 3),
            topI = improvements.slice(0, 2);

          return (
            <React.Fragment>
              {/* S1 : VUE D'ENSEMBLE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 w-full">
                    Empreinte Statistique
                  </h3>
                  <ScoutingRadar avg={a} />
                </div>
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    <span className="text-orange-400">1.</span> Vue d'ensemble{' '}
                    <span className="text-xs font-mono text-slate-600 bg-slate-950 px-2 py-0.5 rounded ml-3">
                      {gp} Matchs
                    </span>
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 text-center">
                      <div
                        className={`text-3xl font-black ${a.eff > 12 ? 'text-yellow-400' : a.eff > 6 ? 'text-white' : 'text-slate-400'}`}
                      >
                        {a.eff.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">
                        Évaluation (PIR)
                      </div>
                    </div>
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 text-center">
                      <div
                        className={`text-3xl font-black ${a.plusMinus > 0 ? 'text-green-400' : a.plusMinus < 0 ? 'text-red-400' : 'text-slate-400'}`}
                      >
                        {a.plusMinus > 0 ? '+' : ''}
                        {a.plusMinus.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">
                        Plus / Minus
                      </div>
                    </div>
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 text-center">
                      <div className="text-3xl font-black text-cyan-400">{a.min.toFixed(1)}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">
                        Minutes
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-indigo-950/50 to-cyan-950/50 p-3 rounded-xl border border-indigo-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-indigo-400 uppercase">
                        Impact Total
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Elite ≥ 110 · Bon ≥ 85 · Correct ≥ 60
                      </div>
                    </div>
                    <div
                      className={`text-2xl font-black ${a.impactTotal > 110 ? 'text-blue-400' : a.impactTotal > 85 ? 'text-green-400' : a.impactTotal > 59 ? 'text-white' : 'text-red-400'}`}
                    >
                      {a.impactTotal.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* S2 : EFFICACITE OFFENSIVE */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                  <span className="text-orange-400">2.</span> Efficacité Offensive
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div className="text-2xl font-black text-orange-400">{a.pts.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">PTS</div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${fgPctGlobal > 50 ? 'text-green-400' : fgPctGlobal > 40 ? 'text-white' : 'text-red-400'}`}
                    >
                      {fgPctGlobal.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">FG%</div>
                    <div className="text-[9px] text-slate-600">
                      {totalFGM}/{totalFGA > 0 ? totalFGA.toFixed(0) : 0}
                    </div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${a.threePct > B.threePct_good ? 'text-green-400' : a.threePct > 30 ? 'text-white' : 'text-red-400'}`}
                    >
                      {a.threePct.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">3P%</div>
                    <div className="text-[9px] text-slate-600">
                      {a.threem}/{total3PA.toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${a.ftPct > 75 ? 'text-green-400' : a.ftPct > 60 ? 'text-white' : 'text-red-400'}`}
                    >
                      {a.ftPct.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">FT%</div>
                    <div className="text-[9px] text-slate-600">
                      {a.ftm}/{a.fta}
                    </div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${a.TS > B.ts_elite ? 'text-blue-400' : a.TS > B.ts_good ? 'text-green-400' : a.TS > B.ts_bad ? 'text-white' : 'text-red-400'}`}
                    >
                      {a.TS.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">TS%</div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div className="text-2xl font-black text-white">{a.eFG.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">eFG%</div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${a.usage > B.usage_high ? 'text-orange-400' : 'text-white'}`}
                    >
                      {a.usage.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">USG%</div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${a.astTov > B.astTov_good ? 'text-green-400' : a.astTov > 1.0 ? 'text-white' : 'text-red-400'}`}
                    >
                      {a.astTov.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">AST/TOV</div>
                    <div className="text-[9px] text-slate-600">
                      {a.ast.toFixed(1)} / {a.tov.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* S3 : IMPACT DEFENSIF */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                  <span className="text-orange-400">3.</span> Impact Défensif & Hustle
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div className="text-2xl font-black text-white">{a.reb.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">TRB</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">
                      <span className="text-orange-400">{a.oreb.toFixed(1)} OFF</span>
                      {' / '}
                      <span className="text-blue-400">{dreb.toFixed(1)} DEF</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${a.stl > 1.5 ? 'text-green-400' : 'text-white'}`}
                    >
                      {a.stl.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">STL</div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${a.blk > 1.0 ? 'text-green-400' : 'text-white'}`}
                    >
                      {a.blk.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">BLK</div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${a.fouls > 3.5 ? 'text-red-400' : a.fouls > 2.5 ? 'text-yellow-400' : 'text-white'}`}
                    >
                      {a.fouls.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">PF</div>
                    <div className="text-[9px] text-slate-600">{a.pf36.toFixed(1)} /36m</div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${a.netRtg > 0 ? 'text-green-400' : a.netRtg < 0 ? 'text-red-400' : 'text-slate-400'}`}
                    >
                      {a.netRtg > 0 ? '+' : ''}
                      {a.netRtg.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Net Rtg</div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-center">
                    <div className="text-2xl font-black text-white">
                      {(a.stl + a.blk).toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">STL+BLK</div>
                  </div>
                </div>
              </div>

              {/* S4 : PER 30 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  <span className="text-orange-400">4.</span> Projection Titulaire FIBA
                </h3>
                <p className="text-[11px] text-slate-500 mb-5">
                  Statistiques projetées sur 30 minutes — (Stat / MIN) × 30.
                  {a.min < 10 && (
                    <span className="text-amber-400 ml-1">
                      ⚠ Faible échantillon ({a.min.toFixed(1)} min/match).
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-5 gap-3">
                  <div className="bg-gradient-to-b from-slate-950 to-slate-950/50 p-4 rounded-lg border border-slate-800/50 text-center">
                    <div className="text-2xl font-black text-orange-400">{p30.pts.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">PTS</div>
                    <div className="text-[9px] text-slate-600">réel: {a.pts.toFixed(1)}</div>
                  </div>
                  <div className="bg-gradient-to-b from-slate-950 to-slate-950/50 p-4 rounded-lg border border-slate-800/50 text-center">
                    <div className="text-2xl font-black text-blue-400">{p30.reb.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">REB</div>
                    <div className="text-[9px] text-slate-600">réel: {a.reb.toFixed(1)}</div>
                  </div>
                  <div className="bg-gradient-to-b from-slate-950 to-slate-950/50 p-4 rounded-lg border border-slate-800/50 text-center">
                    <div className="text-2xl font-black text-purple-400">{p30.ast.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">AST</div>
                    <div className="text-[9px] text-slate-600">réel: {a.ast.toFixed(1)}</div>
                  </div>
                  <div className="bg-gradient-to-b from-slate-950 to-slate-950/50 p-4 rounded-lg border border-slate-800/50 text-center">
                    <div className="text-2xl font-black text-green-400">{p30.stl.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">STL</div>
                    <div className="text-[9px] text-slate-600">réel: {a.stl.toFixed(1)}</div>
                  </div>
                  <div className="bg-gradient-to-b from-slate-950 to-slate-950/50 p-4 rounded-lg border border-slate-800/50 text-center">
                    <div
                      className={`text-2xl font-black ${p30.pf > 4.5 ? 'text-red-400' : p30.pf > 3.5 ? 'text-yellow-400' : 'text-white'}`}
                    >
                      {p30.pf.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">PF</div>
                    <div className="text-[9px] text-slate-600">réel: {a.fouls.toFixed(1)}</div>
                  </div>
                </div>
              </div>

              {/* S5 : ANALYSE DU COACH */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-bl-full pointer-events-none"></div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    <span className="text-orange-400">5.</span> Analyse du Coach
                  </h4>
                  <h4 className="text-green-400 font-black uppercase text-sm mb-4">
                    ▲ Points Forts
                  </h4>
                  {topS.length > 0 ? (
                    <div className="space-y-2">
                      {topS.map((s, i) => (
                        <div
                          key={i}
                          className="flex gap-3 text-slate-300 text-sm p-3 bg-slate-950/50 rounded-lg border border-green-900/20"
                        >
                          <span className="shrink-0">{s.icon}</span>
                          <span>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm italic">
                      Pas de point fort marquant identifié.
                    </p>
                  )}
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-bl-full pointer-events-none"></div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    &nbsp;
                  </h4>
                  <h4 className="text-orange-400 font-black uppercase text-sm mb-4">
                    ▼ Axes de Progression
                  </h4>
                  {topI.length > 0 ? (
                    <div className="space-y-2">
                      {topI.map((s, i) => (
                        <div
                          key={i}
                          className="flex gap-3 text-slate-300 text-sm p-3 bg-slate-950/50 rounded-lg border border-orange-900/20"
                        >
                          <span className="shrink-0">{s.icon}</span>
                          <span>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm italic">
                      Aucun axe de progression critique détecté.
                    </p>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })()}

        {/* 5 DERNIERS MATCHS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase">5 Derniers Matchs</h3>
          </div>
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-[10px] text-slate-500 uppercase bg-slate-950">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Adv</th>
                <th className="p-3 text-center">MIN</th>
                <th className="p-3 text-center">PTS</th>
                <th className="p-3 text-center">REB</th>
                <th className="p-3 text-center">AST</th>
                <th className="p-3 text-center">EVAL</th>
                <th className="p-3 text-center">+/-</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {last5.map((l, i) => (
                <tr key={i} className="hover:bg-slate-800/30">
                  <td className="p-3 text-xs font-mono">{l.rawDate.toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 text-white">{l.opponent}</td>
                  <td className="p-3 text-center text-xs">{l.min}</td>
                  <td className="p-3 text-center font-bold text-white">{l.pts}</td>
                  <td className="p-3 text-center">{l.reb}</td>
                  <td className="p-3 text-center">{l.ast}</td>
                  <td className="p-3 text-center font-bold text-yellow-400">{l.eff.toFixed(0)}</td>
                  <td
                    className={`p-3 text-center font-bold ${l.plusMinus > 0 ? 'text-green-500' : l.plusMinus < 0 ? 'text-red-500' : 'text-slate-500'}`}
                  >
                    {l.plusMinus > 0 ? '+' : ''}
                    {l.plusMinus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* SHOT CHART */}
          {(() => {
            const ShotChart = window.ShotChart;
            if (!ShotChart || !propGames) return null;
            const rawPid = p.id;
            if (!rawPid) return null;
            const numPid = Number(rawPid);
            const playerShots = [];
            propGames.forEach((g) => {
              if (!g.actions || !g.actions.length) return;
              g.actions.forEach((a) => {
                if (a.type === 'SHOT' && (a.pid === rawPid || a.pid === numPid))
                  playerShots.push(a);
              });
            });
            if (playerShots.length === 0) return null;
            return (
              <div className="mt-6">
                <ShotChart shots={playerShots} playerName={p.name || ''} />
              </div>
            );
          })()}
          {/* 5-MAN LINEUPS */}
          {(() => {
            const currentPlayerId = p.id;
            const lineups = calcFiveManLineups(currentPlayerId, propGames, propRoster);
            if (lineups.total === 0) return null;
            const renderLineup = (lu, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-slate-950/50 rounded border border-slate-800/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-medium">{lu.names.join(' ')}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500">{lu.poss} poss</span>
                    {lu.lowSample && (
                      <span className="text-[9px] bg-amber-900/30 text-amber-400 px-1 rounded">
                        Faible éch.
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-center px-2">
                  <div className="text-[10px] text-slate-500">ORtg</div>
                  <div className="text-xs font-bold text-purple-400">{lu.ortg}</div>
                </div>
                <div className="text-center px-2">
                  <div className="text-[10px] text-slate-500">DRtg</div>
                  <div className="text-xs font-bold text-red-400">{lu.drtg}</div>
                </div>
                <div className="text-center px-2">
                  <div
                    className={`text-sm font-bold ${lu.netRtg >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {lu.netRtg > 0 ? '+' : ''}
                    {lu.netRtg}
                  </div>
                  <div className="text-[10px] text-slate-500">Net</div>
                </div>
              </div>
            );
            return (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-6">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase">Lineups 5-Man</h3>
                  <span className="text-[10px] text-slate-600">
                    {lineups.total} combos analysés (matchs PBP uniquement)
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lineups.best.length > 0 && (
                    <div>
                      <h4 className="text-xs text-green-400 uppercase font-bold mb-2">
                        Meilleurs lineups
                      </h4>
                      <div className="space-y-1">{lineups.best.map(renderLineup)}</div>
                    </div>
                  )}
                  {lineups.worst.length > 0 && (
                    <div>
                      <h4 className="text-xs text-red-400 uppercase font-bold mb-2">
                        Pires lineups
                      </h4>
                      <div className="space-y-1">{lineups.worst.map(renderLineup)}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

window.PlayerReportModule = PlayerReportModule;
