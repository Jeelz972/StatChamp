export function calcImpactStats(actions, players) {
  const safeActions = actions ?? [];
  const homeIds = new Set((players ?? []).map(p => p.id));
  const isHome = pid => pid != null && (homeIds.has(pid) || pid < 1000);
  const isAway = pid => pid != null && pid >= 1000;
  let tovCost = 0, foulCost = 0, oppOrebCost = 0, stlGain = 0, orebGain = 0, lfGain = 0;

  for (let i = 0; i < safeActions.length; i++) {
    const a = safeActions[i];

    if (a.type === 'TOV' && isHome(a.pid)) {
      let cost = 0;
      for (let j = i + 1; j < safeActions.length; j++) {
        const b = safeActions[j];
        if (
          (b.type === 'DREB' && isHome(b.pid)) ||
          (b.type === 'SHOT' && isHome(b.pid)) ||
          (b.type === 'STL' && isHome(b.pid)) ||
          (b.type === 'TOV' && isHome(b.pid))
        ) break;
        if (b.type === 'SHOT' && b.made && isAway(b.pid)) cost += b.val ?? 0;
        if (b.type === 'FT' && isAway(b.pid)) cost += b.ftMade ?? 0;
      }
      tovCost += cost;
    }

    if (
      a.type === 'FOUL' && (a.foulType === 'PERSONAL' || a.foulType === 'personal') &&
      isHome(a.pid) && isAway(a.victimId ?? a.victim)
    ) {
      let cost = 0;
      for (let j = i + 1; j < safeActions.length; j++) {
        const b = safeActions[j];
        if (b.type !== 'FT' && b.type !== 'TIMEOUT' && b.type !== 'STOPPAGE' && b.type !== 'SUB') break;
        if (b.type === 'FT' && isAway(b.pid)) cost += b.ftMade ?? 0;
      }
      foulCost += cost;
    }

    if (a.type === 'OREB' && isAway(a.pid)) {
      let cost = 0;
      for (let j = i + 1; j < safeActions.length; j++) {
        const b = safeActions[j];
        if (
          (b.type === 'DREB' && isHome(b.pid)) ||
          (b.type === 'STL' && isHome(b.pid)) ||
          (b.type === 'TOV' && isAway(b.pid))
        ) break;
        if (b.type === 'SHOT' && b.made && isAway(b.pid)) cost += b.val ?? 0;
        if (b.type === 'FT' && isAway(b.pid)) cost += b.ftMade ?? 0;
      }
      oppOrebCost += cost;
    }

    if (a.type === 'STL' && isHome(a.pid)) {
      let gain = 0;
      for (let j = i + 1; j < safeActions.length; j++) {
        const b = safeActions[j];
        if (
          (b.type === 'DREB' && isAway(b.pid)) ||
          (b.type === 'SHOT' && isAway(b.pid)) ||
          (b.type === 'STL' && isAway(b.pid)) ||
          (b.type === 'TOV' && isHome(b.pid))
        ) break;
        if (b.type === 'SHOT' && b.made && isHome(b.pid)) gain += b.val ?? 0;
        if (b.type === 'FT' && isHome(b.pid)) gain += b.ftMade ?? 0;
      }
      stlGain += gain;
    }

    if (a.type === 'OREB' && isHome(a.pid)) {
      let gain = 0;
      for (let j = i + 1; j < safeActions.length; j++) {
        const b = safeActions[j];
        if (
          (b.type === 'DREB' && isAway(b.pid)) ||
          (b.type === 'STL' && isAway(b.pid)) ||
          (b.type === 'TOV' && isHome(b.pid))
        ) break;
        if (b.type === 'SHOT' && b.made && isHome(b.pid)) gain += b.val ?? 0;
        if (b.type === 'FT' && isHome(b.pid)) gain += b.ftMade ?? 0;
      }
      orebGain += gain;
    }

    if (
      a.type === 'FOUL' && (a.foulType === 'PERSONAL' || a.foulType === 'personal') &&
      isAway(a.pid) && isHome(a.victimId ?? a.victim)
    ) {
      let gain = 0;
      for (let j = i + 1; j < safeActions.length; j++) {
        const b = safeActions[j];
        if (b.type !== 'FT' && b.type !== 'TIMEOUT' && b.type !== 'STOPPAGE' && b.type !== 'SUB') break;
        if (b.type === 'FT' && isHome(b.pid)) gain += b.ftMade ?? 0;
      }
      lfGain += gain;
    }
  }

  return { tovCost, foulCost, oppOrebCost, stlGain, orebGain, lfGain };
}
