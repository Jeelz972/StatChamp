import React, { useState, useEffect, useMemo } from 'react';

const SHOOT_ZONES = [
  { id: 'left_0', label: '0° gauche', short: '0°G' },
  { id: 'left_45', label: '45° gauche', short: '45°G' },
  { id: 'left_70', label: '70° gauche', short: '70°G' },
  { id: 'axis', label: 'Axe', short: 'AXE' },
  { id: 'right_70', label: '70° droit', short: '70°D' },
  { id: 'right_45', label: '45° droit', short: '45°D' },
  { id: 'right_0', label: '0° droit', short: '0°D' },
];

const ZONE_ARROWS = {
  left_0:   '◄',
  left_45:  '↙',
  left_70:  '↖',
  axis:     '⬆',
  right_70: '↗',
  right_45: '↘',
  right_0:  '►',
};

// SVG court dot positions (viewBox 0 0 90 80)
const ZONE_DOTS = {
  left_0:   { cx: 5,  cy: 64 },
  left_45:  { cx: 9,  cy: 42 },
  left_70:  { cx: 22, cy: 18 },
  axis:     { cx: 45, cy: 45 },
  right_70: { cx: 68, cy: 18 },
  right_45: { cx: 81, cy: 42 },
  right_0:  { cx: 85, cy: 64 },
};

const ZONE_MAP = {
  '0G': 'left_0',
  '45G': 'left_45',
  '70G': 'left_70',
  Axe: 'axis',
  '70D': 'right_70',
  '45D': 'right_45',
  '0D': 'right_0',
};
const SKIP_KEYS = new Set(['Distance', 'types']);

function getWk() {
  return sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
}

function pct(made, attempted) {
  if (!attempted) return null;
  return ((made / attempted) * 100).toFixed(1);
}

function pctColor(value) {
  if (value === null) return 'var(--text-3)';
  const n = parseFloat(value);
  return n >= 50 ? 'var(--make)' : n >= 35 ? '#facc15' : 'var(--miss)';
}

function PctColor({ value }) {
  if (value === null) return <span style={{ color: 'var(--text-3)' }}>—</span>;
  return <span style={{ color: pctColor(value) }}>{value}%</span>;
}

function PlayerRing({ initial, pctVal, isSelected }) {
  const CIRC = 100.53;
  const fill = pctVal !== null ? (parseFloat(pctVal) / 100) * CIRC : 0;
  const color =
    pctVal === null
      ? '#1e293b'
      : parseFloat(pctVal) >= 50
      ? '#22c55e'
      : parseFloat(pctVal) >= 35
      ? '#facc15'
      : '#ef4444';
  const textColor =
    pctVal === null ? '#334155' : color;
  return (
    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ position: 'absolute', top: 0, left: 0 }}>
        <circle cx="18" cy="18" r="16" fill="none" stroke="#1e293b" strokeWidth="2.5" />
        {fill > 0 && (
          <circle
            cx="18" cy="18" r="16"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeDasharray={`${fill} ${CIRC}`}
            strokeDashoffset={-10}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
          />
        )}
      </svg>
      <div
        style={{
          position: 'absolute', top: 4, left: 4,
          width: 28, height: 28, borderRadius: '50%',
          background: isSelected ? 'rgba(249,115,22,0.2)' : '#1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: textColor,
        }}
      >
        {initial}
      </div>
    </div>
  );
}

function StatsTable({ shotsData, players }) {
  if (!players.length) {
    return (
      <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>
        Aucune donnée
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th
              className="py-2 px-3 text-left text-xs font-semibold"
              style={{ color: 'var(--text-3)' }}
            >
              Joueur
            </th>
            {SHOOT_ZONES.map((z) => (
              <th
                key={z.id}
                className="py-2 px-2 text-center text-xs font-semibold"
                style={{ color: 'var(--text-3)', minWidth: '48px' }}
              >
                {z.short}
              </th>
            ))}
            <th
              className="py-2 px-3 text-center text-xs font-semibold"
              style={{ color: 'var(--text-3)' }}
            >
              Total
            </th>
            <th
              className="py-2 px-3 text-center text-xs font-semibold"
              style={{ color: 'var(--text-3)' }}
            >
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const pid = String(p.id);
            const zones = shotsData[pid] || {};
            let totalAtt = 0,
              totalMade = 0;
            SHOOT_ZONES.forEach((z) => {
              totalAtt += zones[z.id]?.attempted || 0;
              totalMade += zones[z.id]?.made || 0;
            });
            const totalPct = pct(totalMade, totalAtt);
            return (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td
                  className="py-2 px-3 font-medium"
                  style={{ color: 'var(--text-1)', background: 'var(--bg-2)' }}
                >
                  <span className="text-xs mr-1.5" style={{ color: 'var(--text-3)' }}>
                    #{p.number}
                  </span>
                  {p.name}
                </td>
                {SHOOT_ZONES.map((z) => {
                  const s = zones[z.id];
                  return (
                    <td
                      key={z.id}
                      className="py-2 px-2 text-center text-xs font-mono"
                      style={{ color: 'var(--text-2)' }}
                    >
                      {s?.attempted ? (
                        `${s.made}/${s.attempted}`
                      ) : (
                        <span style={{ color: 'var(--text-3)' }}>—</span>
                      )}
                    </td>
                  );
                })}
                <td
                  className="py-2 px-3 text-center text-sm font-bold font-mono"
                  style={{ color: 'var(--text-1)' }}
                >
                  {totalAtt > 0 ? (
                    `${totalMade}/${totalAtt}`
                  ) : (
                    <span style={{ color: 'var(--text-3)' }}>—</span>
                  )}
                </td>
                <td className="py-2 px-3 text-center text-sm font-bold font-mono">
                  <PctColor value={totalPct} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrainingShooter({ players }) {
  const today = new Date().toISOString().split('T')[0];

  // ── saisie ──
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [attempted, setAttempted] = useState('');
  const [made, setMade] = useState('');
  const [trainingDocs, setTrainingDocs] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [lastSave, setLastSave] = useState({ made: 0, attempted: 0, zone: null });

  // ── import ──
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importLog, setImportLog] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importMapping, setImportMapping] = useState({});

  const rosterList = useMemo(() => {
    if (!players) return [];
    const arr = Array.isArray(players) ? players : Object.values(players);
    return arr
      .filter((p) => p && p.id != null)
      .sort((a, b) => parseInt(a.number || 99) - parseInt(b.number || 99));
  }, [players]);

  // Firestore listener
  useEffect(() => {
    const db = window.db;
    if (!db) return;
    const unsub = db
      .collection('training')
      .where('type', '==', 'shooting')
      .limit(90)
      .onSnapshot(
        (snap) => {
          const docs = {};
          snap.forEach((d) => {
            docs[d.id] = d.data();
          });
          setTrainingDocs(docs);
        },
        () => {}
      );
    return unsub;
  }, []);

  const docId = `shooting_${selectedDate}`;
  const todayDoc = trainingDocs[docId] || null;
  const dayData = todayDoc?.shots || {};

  // ── sidebar players ──
  const dayTotalsByPlayer = useMemo(() => {
    const totals = {};
    for (const p of rosterList) {
      const pid = String(p.id);
      const zones = dayData[pid] || {};
      let att = 0,
        mk = 0;
      SHOOT_ZONES.forEach((z) => {
        att += zones[z.id]?.attempted || 0;
        mk += zones[z.id]?.made || 0;
      });
      totals[pid] = { att, mk };
    }
    return totals;
  }, [rosterList, dayData]);

  const sortedSidebarPlayers = useMemo(() => {
    const withData = [],
      withoutData = [];
    for (const p of rosterList) {
      const { att } = dayTotalsByPlayer[String(p.id)] || { att: 0 };
      if (att > 0) withData.push({ ...p, _att: att });
      else withoutData.push(p);
    }
    withData.sort((a, b) => b._att - a._att);
    withoutData.sort((a, b) => a.name.localeCompare(b.name));
    return [...withData, ...withoutData];
  }, [rosterList, dayTotalsByPlayer]);

  // ── saisie submit ──
  const handleSubmit = async () => {
    const att = parseInt(attempted, 10);
    const mk = parseInt(made, 10);
    if (!selectedPlayerId || !selectedZone) return;
    if (!att || att <= 0 || isNaN(mk) || mk < 0 || mk > att) return;
    const db = window.db;
    if (!db) return;
    setSaving(true);
    try {
      const shots = todayDoc?.shots ? JSON.parse(JSON.stringify(todayDoc.shots)) : {};
      const pid = String(selectedPlayerId);
      if (!shots[pid]) shots[pid] = {};
      if (!shots[pid][selectedZone]) shots[pid][selectedZone] = { attempted: 0, made: 0 };
      shots[pid][selectedZone].attempted += att;
      shots[pid][selectedZone].made += mk;
      await db
        .collection('training')
        .doc(docId)
        .set({ date: selectedDate, type: 'shooting', shots, _wk: getWk() });
      setLastSave({ made: parseInt(made, 10), attempted: parseInt(attempted, 10), zone: selectedZone });
      setAttempted('');
      setMade('');
      setSaveMsg('Enregistré');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      setSaveMsg('Erreur: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const playersToday = useMemo(
    () => rosterList.filter((p) => dayData[String(p.id)]),
    [rosterList, dayData]
  );

  // ── stats globales ──
  const { globalByPlayer, sessionCountByPlayer } = useMemo(() => {
    const byPlayer = {},
      sessionCount = {};
    for (const doc of Object.values(trainingDocs)) {
      if (!doc.shots) continue;
      for (const [pid, zones] of Object.entries(doc.shots)) {
        if (!byPlayer[pid]) {
          byPlayer[pid] = {};
          sessionCount[pid] = new Set();
        }
        sessionCount[pid].add(doc.date);
        for (const [zoneId, s] of Object.entries(zones)) {
          if (!byPlayer[pid][zoneId]) byPlayer[pid][zoneId] = { attempted: 0, made: 0 };
          byPlayer[pid][zoneId].attempted += s.attempted || 0;
          byPlayer[pid][zoneId].made += s.made || 0;
        }
      }
    }
    return { globalByPlayer: byPlayer, sessionCountByPlayer: sessionCount };
  }, [trainingDocs]);

  const globalPlayersWithData = useMemo(
    () => rosterList.filter((p) => globalByPlayer[String(p.id)]),
    [rosterList, globalByPlayer]
  );

  // ── export CSV ──
  const handleExportCSV = () => {
    const rows = ['Date,Joueur,Zone,Tentés,Marqués,Pourcentage'];
    const sorted = Object.values(trainingDocs).sort((a, b) =>
      (a.date || '').localeCompare(b.date || '')
    );
    for (const doc of sorted) {
      if (!doc.shots) continue;
      for (const [pid, zones] of Object.entries(doc.shots)) {
        const player = rosterList.find((p) => String(p.id) === pid);
        const name = player ? player.name : `id_${pid}`;
        for (const [zoneId, s] of Object.entries(zones)) {
          if (!s.attempted) continue;
          const zone = SHOOT_ZONES.find((z) => z.id === zoneId);
          const p = ((s.made / s.attempted) * 100).toFixed(1);
          rows.push(
            `${doc.date},"${name}","${zone?.label || zoneId}",${s.attempted},${s.made},${p}%`
          );
        }
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entrainement_tir_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const playerMap = useMemo(() => new Map(rosterList.map((p) => [p.id, p.name])), [rosterList]);

  const handleImportAnalyze = () => {
    setImportLog([]);
    setImportDone(false);
    const errors = [];
    let entries = [];
    try {
      const raw = JSON.parse(importJson.trim());
      entries = Array.isArray(raw) ? raw : [raw];
    } catch (e) {
      setImportPreview({
        entries: [],
        errors: [`JSON invalide : ${e.message}`],
        byDate: new Map(),
        mapped: [],
        unmapped: [],
      });
      return;
    }
    const valid = [];
    for (const e of entries) {
      if (!e.playerId || !e.date || !e.zones) {
        errors.push(`Entrée ignorée (champ manquant) : ${JSON.stringify(e).slice(0, 60)}…`);
      } else {
        valid.push(e);
      }
    }
    const byDate = new Map();
    for (const e of valid) {
      if (!byDate.has(e.date)) byDate.set(e.date, new Set());
      byDate.get(e.date).add(e.playerId);
    }
    const seenIds = [...new Set(valid.map((e) => e.playerId))];
    const mapped = seenIds.filter((id) => playerMap.has(id));
    const unmapped = seenIds.filter((id) => !playerMap.has(id));
    setImportPreview({ entries: valid, errors, byDate, mapped, unmapped });
    const initialMapping = {};
    seenIds.forEach((id) => {
      initialMapping[id] = playerMap.has(id) ? id : null;
    });
    setImportMapping(initialMapping);
  };

  const handleImportRun = async () => {
    if (!importPreview?.entries.length) return;
    const db = window.db;
    if (!db) {
      setImportLog([{ t: 'err', msg: 'Firebase non initialisé' }]);
      return;
    }
    setImporting(true);
    setImportDone(false);
    const log = [];
    const push = (t, msg) => {
      log.push({ t, msg });
      setImportLog([...log]);
    };
    const byDate = new Map();
    for (const entry of importPreview.entries) {
      if (!byDate.has(entry.date)) byDate.set(entry.date, []);
      byDate.get(entry.date).push(entry);
    }
    let written = 0;
    for (const [date, entries] of [...byDate.entries()].sort()) {
      const docId = `shooting_${date}`;
      try {
        const snap = await db.collection('training').doc(docId).get();
        const shots = snap.exists ? snap.data().shots || {} : {};
        let added = 0;
        for (const entry of entries) {
          const mappedId = importMapping[entry.playerId];
          if (mappedId === 'SKIP' || mappedId === null || mappedId === undefined) continue;
          const pid = String(mappedId);
          if (!shots[pid]) shots[pid] = {};
          for (const [key, val] of Object.entries(entry.zones)) {
            if (SKIP_KEYS.has(key)) continue;
            const zoneId = ZONE_MAP[key];
            if (!zoneId) continue;
            if (!shots[pid][zoneId]) shots[pid][zoneId] = { attempted: 0, made: 0 };
            shots[pid][zoneId].attempted += val.attempted;
            shots[pid][zoneId].made += val.made;
            added++;
          }
        }
        await db
          .collection('training')
          .doc(docId)
          .set({ date, type: 'shooting', shots, _wk: getWk() });
        const names = [
          ...new Set(
            entries
              .map((e) => importMapping[e.playerId])
              .filter((id) => id !== 'SKIP' && id != null)
              .map((id) => playerMap.get(id) || `id_${id}`)
          ),
        ];
        push(
          'ok',
          `${date} — ${names.join(', ')} — ${added} zones ${snap.exists ? '(fusionné)' : '(nouveau)'}`
        );
        written++;
      } catch (e) {
        push('err', `${date} — ${e.message}`);
      }
    }
    push('info', `${written} document(s) écrit(s)`);
    setImportDone(true);
    setImporting(false);
  };

  const selectedPlayer = selectedPlayerId
    ? rosterList.find((p) => String(p.id) === selectedPlayerId)
    : null;
  const selectedZoneLabel = selectedZone
    ? SHOOT_ZONES.find((z) => z.id === selectedZone)?.label
    : null;
  const canSubmit =
    !saving && selectedPlayerId && selectedZone && attempted !== '' && parseInt(attempted, 10) > 0;

  // ── derived values for recap column ──
  const selectedPlayerDayData = selectedPlayerId ? (dayData[String(selectedPlayerId)] || {}) : {};
  const selectedPlayerDayTotals = selectedPlayerId ? (dayTotalsByPlayer[String(selectedPlayerId)] || { att: 0, mk: 0 }) : { att: 0, mk: 0 };
  const selectedPlayerGlobalPct = pct(selectedPlayerDayTotals.mk, selectedPlayerDayTotals.att);

  // zones worked today for selected player
  const { zonesWorkedToday, zonesNotWorked, bestZoneToday } = useMemo(() => {
    const pdata = selectedPlayerId ? (dayData[String(selectedPlayerId)] || {}) : {};
    const worked = SHOOT_ZONES.filter(
      (z) => selectedPlayerId && pdata[z.id]?.attempted > 0
    );
    const notWorked = SHOOT_ZONES.filter(
      (z) => !selectedPlayerId || !pdata[z.id]?.attempted
    );
    let best = null;
    let bestPct = -1;
    if (selectedPlayerId) {
      SHOOT_ZONES.forEach((z) => {
        const s = pdata[z.id];
        if (s?.attempted > 0) {
          const p = (s.made / s.attempted) * 100;
          if (p > bestPct) { bestPct = p; best = z.id; }
        }
      });
    }
    return { zonesWorkedToday: worked, zonesNotWorked: notWorked, bestZoneToday: best };
  }, [selectedPlayerId, dayData]);

  // sparkline + trend: computed together to avoid sorting trainingDocs twice
  const { sparkPoints, trendBadge, lastSparkPoint } = useMemo(() => {
    if (!selectedPlayerId) return { sparkPoints: null, trendBadge: null, lastSparkPoint: null };
    const pid = selectedPlayerId;
    const sorted = Object.values(trainingDocs)
      .filter((d) => d.shots && d.shots[pid])
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // sparkline (last 8 sessions)
    const last8 = sorted.slice(-8);
    let sp = null;
    if (last8.length >= 2) {
      const sessions = last8.map((d) => {
        let mk = 0, att = 0;
        Object.values(d.shots[pid]).forEach((s) => { mk += s.made; att += s.attempted; });
        return att > 0 ? (mk / att) * 100 : 0;
      });
      const W = 80, H = 28;
      const dx = W / (sessions.length - 1);
      sp = sessions.map((v, i) => `${i * dx},${H - (v / 100) * H}`).join(' ');
    }

    // trend badge (all sessions, linear regression)
    const vals = sorted.map((d) => {
      let mk = 0, att = 0;
      Object.values(d.shots[pid]).forEach((s) => { mk += s.made; att += s.attempted; });
      return att > 0 ? (mk / att) * 100 : null;
    }).filter((v) => v !== null);
    let tb = null;
    if (vals.length >= 2) {
      const n = vals.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) { sumX += i; sumY += vals[i]; sumXY += i * vals[i]; sumX2 += i * i; }
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      if (slope > 1.5) tb = { text: 'En progression', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' };
      else if (slope < -1.5) tb = { text: 'En régression', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' };
      else tb = { text: 'Stable', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };
    }

    let lastSparkPoint = null;
    if (sp) {
      const pts = sp.split(' ');
      const lastPair = pts[pts.length - 1].split(',');
      lastSparkPoint = { cx: lastPair[0], cy: lastPair[1] };
    }
    return { sparkPoints: sp, trendBadge: tb, lastSparkPoint };
  }, [selectedPlayerId, trainingDocs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
    <style>{`
      @media (max-width: 767px) {
        .shooter-grid {
          grid-template-columns: 1fr !important;
        }
        .shooter-grid > div:nth-child(1) {
          border-right: none !important;
          border-bottom: 1px solid #1e293b;
        }
        .shooter-grid > div:nth-child(2) {
          border-right: none !important;
          border-bottom: 1px solid #1e293b;
        }
      }
    `}</style>

    {/* ══════════════════════════════════════
        3-COLUMN GRID
    ══════════════════════════════════════ */}
    <div
      className="shooter-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr 260px',
        minHeight: '500px',
        borderBottom: '2px solid #1e293b',
      }}
    >

      {/* ═══ COL 1 : JOUEURS ═══ */}
      <div style={{ background: '#0c0f1a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#475569' }}>Joueurs</span>
          <span style={{ fontSize: 9, color: '#334155' }}>{rosterList.length} en roster</span>
        </div>

        {/* Date picker */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setSelectedPlayerId(null); }}
            style={{
              width: '100%', background: '#1e293b', border: '1px solid #334155',
              borderRadius: 6, padding: '4px 8px', fontFamily: 'monospace',
              fontSize: 11, color: '#94a3b8', cursor: 'pointer',
            }}
          />
        </div>

        {/* Player list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sortedSidebarPlayers.map((p) => {
            const pid = String(p.id);
            const { att, mk } = dayTotalsByPlayer[pid] || { att: 0, mk: 0 };
            const isSelected = selectedPlayerId === pid;
            const pctVal = pct(mk, att);
            const initial = (p.name || '?')[0].toUpperCase();
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(isSelected ? null : pid)}
                style={{
                  borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', border: `1px solid ${isSelected ? '#f97316' : '#1e293b'}`,
                  background: isSelected ? 'rgba(249,115,22,0.12)' : '#111827',
                  opacity: att === 0 && !isSelected ? 0.55 : 1,
                  transition: 'all .15s', textAlign: 'left',
                }}
              >
                <PlayerRing initial={initial} pctVal={pctVal} isSelected={isSelected} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#475569', marginRight: 4, fontFamily: 'monospace' }}>#{p.number}</span>
                    {p.name}
                  </div>
                  {att > 0 ? (
                    <div style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 2, color: '#94a3b8' }}>
                      {mk}<span style={{ color: '#475569' }}>/</span>{att}
                      <span style={{ margin: '0 3px', color: '#334155' }}>·</span>
                      <span style={{ color: pctColor(pctVal) }}>{pctVal}%</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, marginTop: 2, color: '#475569' }}>Aucun tir</div>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: pctVal ? pctColor(pctVal) : '#475569' }}>
                  {pctVal ? `${pctVal}%` : '—'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ COL 2 : SAISIE ═══ */}
      <div style={{ background: '#080b14', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '.08em', textTransform: 'uppercase' }}>Saisie</span>
          {selectedPlayer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,.15)', border: '1px solid rgba(249,115,22,.4)', borderRadius: 20, padding: '5px 12px 5px 6px' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'white' }}>
                {(selectedPlayer.name || '?')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>{selectedPlayer.name} — #{selectedPlayer.number}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {!selectedPlayer && (
            <div style={{ color: '#475569', fontSize: 13, paddingTop: 8 }}>
              Sélectionnez un joueur dans la colonne de gauche
            </div>
          )}

          {/* ── ZONE SELECTOR ── */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#475569', marginBottom: 10 }}>Zone de tir</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

              {/* Mini court — decorative */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6, textAlign: 'center' }}>Court</div>
                <svg viewBox="0 0 90 80" style={{ width: 90, height: 80, borderRadius: 8, border: '1px solid #1e293b', background: '#0f172a' }}>
                  <rect x="2" y="2" width="86" height="76" rx="3" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                  <rect x="33" y="2" width="24" height="28" fill="none" stroke="#1e293b" strokeWidth="0.6" />
                  <circle cx="45" cy="30" r="9" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 2" />
                  <circle cx="45" cy="8" r="3" fill="none" stroke="#f97316" strokeWidth="1.2" />
                  <path d="M 11 2 A 36 36 0 0 1 79 2" fill="none" stroke="#1e293b" strokeWidth="0.7" />
                  <line x1="2" y1="25" x2="11" y2="25" stroke="#1e293b" strokeWidth="0.6" />
                  <line x1="79" y1="25" x2="88" y2="25" stroke="#1e293b" strokeWidth="0.6" />
                  {SHOOT_ZONES.map((z) => {
                    const pos = ZONE_DOTS[z.id];
                    const isActive = selectedZone === z.id;
                    const isAxis = z.id === 'axis';
                    return (
                      <g key={z.id}>
                        <circle
                          cx={pos.cx} cy={pos.cy} r={isActive ? 7 : 5.5}
                          fill={isActive ? 'rgba(249,115,22,0.25)' : isAxis ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)'}
                          stroke={isActive ? '#f97316' : isAxis ? '#3b82f6' : '#334155'}
                          strokeWidth={isActive ? 1.2 : 0.7}
                        />
                        <text x={pos.cx} y={pos.cy + 3.5} fontSize="4.5" fill={isActive ? '#f97316' : isAxis ? '#60a5fa' : '#475569'} textAnchor="middle" fontWeight={isActive ? 700 : 400}>
                          {z.short}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Zone buttons */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SHOOT_ZONES.map((z) => {
                  const isSelected = selectedZone === z.id;
                  const isAxis = z.id === 'axis';
                  return (
                    <button
                      key={z.id}
                      onClick={() => setSelectedZone(isSelected ? null : z.id)}
                      style={{
                        padding: '11px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                        transition: 'all .12s', textAlign: 'left',
                        border: isSelected ? '1.5px solid #f97316' : isAxis ? '1px solid #1e3a5f' : '1.5px solid #1e293b',
                        background: isSelected ? 'rgba(249,115,22,.18)' : isAxis ? 'rgba(59,130,246,.05)' : '#111827',
                        color: isSelected ? '#f97316' : isAxis ? '#60a5fa' : '#64748b',
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: isSelected ? '#f97316' : isAxis ? '#3b82f6' : '#334155',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12 }}>{z.label}</div>
                      </div>
                      <span style={{ fontSize: 14, opacity: 0.6, marginLeft: 'auto' }}>{ZONE_ARROWS[z.id]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── INPUTS ── */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#475569', marginBottom: 10 }}>Résultats</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
              <div style={{ flex: 1, background: '#111827', border: '2px solid #1e293b', borderRadius: 14, padding: '14px 12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#475569' }}>Tentés</div>
                <input
                  type="number"
                  min="0"
                  value={attempted}
                  onChange={(e) => setAttempted(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
                  placeholder="0"
                  style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', width: '100%', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9' }}
                />
                <div style={{ fontSize: 10, color: '#334155' }}>tirs tentés</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#334155', fontSize: 18, paddingBottom: 12 }}>→</div>
              <div style={{ flex: 1, background: '#111827', border: '2px solid #1e293b', borderRadius: 14, padding: '14px 12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#475569' }}>Marqués</div>
                <input
                  type="number"
                  min="0"
                  value={made}
                  onChange={(e) => setMade(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
                  placeholder="0"
                  style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', width: '100%', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9' }}
                />
                {attempted && parseInt(attempted, 10) > 0 ? (
                  <div style={{ fontSize: 10, color: pctColor(pct(parseInt(made || 0, 10), parseInt(attempted, 10))) }}>
                    = {pct(parseInt(made || 0, 10), parseInt(attempted, 10))}%
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: '#334155' }}>tirs marqués</div>
                )}
              </div>
            </div>
          </div>

          {/* ── SUBMIT ── */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              background: canSubmit ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#1e293b',
              color: canSubmit ? 'white' : '#475569',
              fontSize: 14, fontWeight: 800, border: 'none', borderRadius: 14,
              padding: '14px 24px', cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', letterSpacing: '.05em',
              boxShadow: canSubmit ? '0 4px 24px rgba(249,115,22,.3)' : 'none',
              transition: 'all .2s',
            }}
          >
            {saving ? (
              'Enregistrement\u2026'
            ) : (
              <>
                <span style={{ fontSize: 16 }}>&#10003;</span>
                {canSubmit && attempted
                  ? `Valider \u2014 ${made}/${attempted} \u00b7 ${pct(parseInt(made, 10), parseInt(attempted, 10))}%`
                  : 'Valider'
                }
              </>
            )}
          </button>

          {/* ── SUCCESS FLASH ── */}
          {saveMsg && !saveMsg.startsWith('Erreur') && (
            <div style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>&#10003;</span>
              <span>Enregistr\u00e9 \u00b7 {SHOOT_ZONES.find((z) => z.id === lastSave.zone)?.label} \u00b7 {lastSave.made}/{lastSave.attempted} \u00b7 <strong>{pct(lastSave.made, lastSave.attempted)}%</strong></span>
            </div>
          )}
          {saveMsg && saveMsg.startsWith('Erreur') && (
            <div style={{ color: '#ef4444', fontSize: 12 }}>{saveMsg}</div>
          )}

        </div>
      </div>

      {/* ═══ COL 3 : RÉCAP LIVE ═══ */}
      <div style={{ background: '#0a0d17', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#475569', marginBottom: 6 }}>Récap live</div>
          {selectedPlayer ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                {selectedPlayer.name} <span style={{ fontSize: 11, color: '#475569' }}>#{selectedPlayer.number}</span>
              </div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>
                Séance du {selectedDate} · {zonesWorkedToday.length} zone{zonesWorkedToday.length !== 1 ? 's' : ''} travaillée{zonesWorkedToday.length !== 1 ? 's' : ''}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#334155' }}>— sélectionnez un joueur</div>
          )}
        </div>

        {selectedPlayer && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Global % card */}
            <div style={{ margin: '12px 14px 8px', background: 'linear-gradient(135deg, rgba(249,115,22,.12), rgba(249,115,22,.04))', border: '1px solid rgba(249,115,22,.25)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: '#f97316', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>% Global aujourd'hui</div>
                <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'monospace', lineHeight: 1, color: selectedPlayerGlobalPct ? pctColor(selectedPlayerGlobalPct) : '#334155' }}>
                  {selectedPlayerGlobalPct ? `${selectedPlayerGlobalPct}%` : '—'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, fontFamily: 'monospace' }}>
                  {selectedPlayerDayTotals.mk}<span style={{ color: '#334155' }}>/</span>{selectedPlayerDayTotals.att} tirs
                </div>
              </div>
              {sparkPoints && (
                <div style={{ flex: 1 }}>
                  <svg viewBox="0 0 80 28" style={{ width: '100%', opacity: 0.8 }}>
                    <polyline points={sparkPoints} fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
                    {lastSparkPoint && (
                      <circle cx={lastSparkPoint.cx} cy={lastSparkPoint.cy} r="3" fill="#f97316" />
                    )}
                  </svg>
                  {trendBadge && (
                    <div style={{ fontSize: 9, color: trendBadge.color, textAlign: 'center', marginTop: 2 }}>
                      {trendBadge.text}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Zone breakdown */}
            {zonesWorkedToday.length > 0 && (
              <>
                <div style={{ padding: '4px 14px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#475569' }}>Par zone</div>
                <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {zonesWorkedToday.map((z) => {
                    const s = selectedPlayerDayData[z.id];
                    const zPct = pct(s.made, s.attempted);
                    const zPctNum = parseFloat(zPct ?? '0');
                    const isBest = z.id === bestZoneToday;
                    const barColor =
                      zPctNum >= 50
                        ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                        : zPctNum >= 35
                        ? 'linear-gradient(90deg, #facc15, #ca8a04)'
                        : 'linear-gradient(90deg, #ef4444, #dc2626)';
                    return (
                      <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: isBest ? 'rgba(249,115,22,.07)' : '#111827', border: `1px solid ${isBest ? 'rgba(249,115,22,.35)' : '#1e293b'}` }}>
                        <div style={{ fontSize: 8, color: '#f97316', fontWeight: 700, minWidth: 6 }}>{isBest ? '★' : ''}</div>
                        <div style={{ fontSize: 11, color: '#64748b', minWidth: 55, fontWeight: 600 }}>{z.short}</div>
                        <div style={{ flex: 1, height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: barColor, width: `${Math.min(zPctNum, 100)}%` }} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', minWidth: 34, textAlign: 'right', color: pctColor(zPct) }}>{zPct}%</div>
                        <div style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace', minWidth: 36, textAlign: 'right' }}>{s.made}/{s.attempted}</div>
                      </div>
                    );
                  })}

                  {zonesNotWorked.length > 0 && (
                    <div style={{ marginTop: 4, padding: '6px 10px', fontSize: 10, color: '#334155', fontStyle: 'italic', border: '1px dashed #1e293b', borderRadius: 8, textAlign: 'center' }}>
                      {zonesNotWorked.map((z) => z.short).join(' · ')} non travaillées
                    </div>
                  )}
                </div>
              </>
            )}

            {zonesWorkedToday.length === 0 && (
              <div style={{ padding: '12px 14px', fontSize: 12, color: '#334155', fontStyle: 'italic' }}>
                Aucun tir enregistré pour cette séance
              </div>
            )}

            {/* Trend section */}
            {trendBadge && (
              <div style={{ margin: '8px 14px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 6 }}>Tendance globale</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: trendBadge.bg, color: trendBadge.color, border: `1px solid ${trendBadge.border}` }}>
                    {trendBadge.text}
                  </span>
                  <span style={{ fontSize: 10, color: '#475569' }}>
                    {(sessionCountByPlayer[selectedPlayerId]?.size || 0)} séances
                  </span>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>{/* end 3-col grid */}

    {/* ══════════════════════════════════════
        BELOW-FOLD: Import + Stats tables + Analyses
    ══════════════════════════════════════ */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <button
            onClick={() => setShowImport((v) => !v)}
            aria-expanded={showImport}
            className="text-xs font-semibold rounded px-3 py-1.5"
            style={{
              background: showImport ? 'var(--accent)' : 'var(--bg-3)',
              color: showImport ? '#fff' : 'var(--text-2)',
              border: `1px solid ${showImport ? 'transparent' : 'var(--border)'}`,
              cursor: 'pointer',
            }}
          >
            {showImport ? '← Fermer import' : '↑ Import JSON'}
          </button>
        </div>

        {/* SAISIE */}
        <div className="sc-card">
          <div className="sc-card-header">Saisie</div>
          <div className="p-4 space-y-4">
            {selectedPlayer ? (
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                <span className="text-xs mr-1.5 font-normal" style={{ color: 'var(--text-3)' }}>
                  #{selectedPlayer.number}
                </span>
                {selectedPlayer.name}
                {selectedZoneLabel && (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-3)' }}>
                    · {selectedZoneLabel}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Sélectionnez un joueur dans la liste
              </p>
            )}

            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {SHOOT_ZONES.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}
                  className={selectedZone === z.id ? 'sc-btn-accent' : 'sc-btn-ghost'}
                  style={{
                    padding: '0.5rem 0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '0.375rem',
                    border: selectedZone === z.id ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {z.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Tentés
                </label>
                <input
                  type="number"
                  min="0"
                  value={attempted}
                  onChange={(e) => setAttempted(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
                  placeholder="0"
                  className="w-20 px-3 py-2 rounded text-sm font-mono text-center"
                  style={{
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-1)',
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Marqués
                </label>
                <input
                  type="number"
                  min="0"
                  value={made}
                  onChange={(e) => setMade(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
                  placeholder="0"
                  className="w-20 px-3 py-2 rounded text-sm font-mono text-center"
                  style={{
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-1)',
                  }}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="sc-btn-accent"
                style={{
                  padding: '0.5rem 1.25rem',
                  opacity: canSubmit ? 1 : 0.45,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? 'Enregistrement…' : 'Valider'}
              </button>
              {saveMsg && (
                <span
                  className="text-sm font-medium"
                  style={{ color: saveMsg.startsWith('Erreur') ? 'var(--miss)' : 'var(--make)' }}
                >
                  {saveMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RÉCAP DU JOUR */}
        <div className="sc-card">
          <div className="sc-card-header">Récapitulatif — {selectedDate}</div>
          <div className="p-4">
            <StatsTable shotsData={dayData} players={playersToday} />
          </div>
        </div>

        {/* STATS GLOBALES */}
        <div className="sc-card">
          <div
            className="sc-card-header"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>Stats globales</span>
            <button
              onClick={handleExportCSV}
              disabled={!globalPlayersWithData.length}
              className="sc-btn-ghost"
              style={{
                fontSize: '0.7rem',
                padding: '0.2rem 0.6rem',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                opacity: globalPlayersWithData.length ? 1 : 0.4,
              }}
            >
              Export CSV
            </button>
          </div>
          <div className="p-4">
            <StatsTable shotsData={globalByPlayer} players={globalPlayersWithData} />
          </div>
        </div>

        {/* ── NOUVEAU : ANALYSES INDIVIDUELLES ── */}
        <div className="sc-card">
          <div className="sc-card-header">Analyses Individuelles</div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {globalPlayersWithData.map((p) => {
              const pid = String(p.id);
              const docs = Object.values(trainingDocs).filter((d) => d.shots && d.shots[pid]);
              docs.sort((a, b) => a.date.localeCompare(b.date));

              const sessions = [];
              const zoneStats = {};
              SHOOT_ZONES.forEach((z) => (zoneStats[z.id] = { made: 0, att: 0 }));

              docs.forEach((d) => {
                let sMade = 0,
                  sAtt = 0;
                Object.entries(d.shots[pid]).forEach(([zId, s]) => {
                  sMade += s.made;
                  sAtt += s.attempted;
                  if (zoneStats[zId]) {
                    zoneStats[zId].made += s.made;
                    zoneStats[zId].att += s.attempted;
                  }
                });
                if (sAtt > 0) {
                  sessions.push({
                    date: d.date,
                    made: sMade,
                    att: sAtt,
                    pct: (sMade / sAtt) * 100,
                  });
                }
              });

              if (sessions.length === 0) return null;

              let bestZone = null;
              let bestPct = -1;
              SHOOT_ZONES.forEach((z) => {
                const st = zoneStats[z.id];
                if (st.att >= 3) {
                  const pct = (st.made / st.att) * 100;
                  if (pct > bestPct) {
                    bestPct = pct;
                    bestZone = { label: z.label, pct, made: st.made, att: st.att };
                  }
                }
              });
              // Fallback si aucun spot > 3 tirs
              if (!bestZone) {
                SHOOT_ZONES.forEach((z) => {
                  const st = zoneStats[z.id];
                  if (st.att > 0) {
                    const pct = (st.made / st.att) * 100;
                    if (pct > bestPct) {
                      bestPct = pct;
                      bestZone = { label: z.label, pct, made: st.made, att: st.att };
                    }
                  }
                });
              }

              const n = sessions.length;
              let trend = { status: 'stable', text: 'Stable', color: 'var(--text-3)' };
              if (n > 1) {
                let sumX = 0,
                  sumY = 0,
                  sumXY = 0,
                  sumX2 = 0;
                for (let i = 0; i < n; i++) {
                  sumX += i;
                  sumY += sessions[i].pct;
                  sumXY += i * sessions[i].pct;
                  sumX2 += i * i;
                }
                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                if (slope > 1.5)
                  trend = { status: 'up', text: 'En progression', color: 'var(--make)' };
                else if (slope < -1.5)
                  trend = { status: 'down', text: 'En régression', color: 'var(--miss)' };
              }

              const graphW = 250;
              const graphH = 50;
              const dx = n > 1 ? graphW / (n - 1) : graphW;
              const points = sessions
                .map((s, i) => `${i * dx},${graphH - (s.pct / 100) * graphH}`)
                .join(' ');

              return (
                <div
                  key={p.id}
                  className="p-3 rounded-lg"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
                >
                  {/* Header : Nom + Tendance */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                      <span className="text-xs mr-1" style={{ color: 'var(--text-3)' }}>
                        #{p.number}
                      </span>
                      {p.name}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: trend.color }}>
                      {n > 1 ? trend.text : 'Données insuf.'}
                    </span>
                  </div>

                  {/* Spot Préférentiel */}
                  {bestZone && (
                    <div
                      className="text-xs mb-3 p-2 rounded"
                      style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}
                    >
                      Spot préférentiel :{' '}
                      <strong style={{ color: 'var(--text-1)' }}>{bestZone.label}</strong>
                      <span className="ml-2 font-mono" style={{ color: pctColor(bestZone.pct) }}>
                        {bestZone.pct.toFixed(1)}% ({bestZone.made}/{bestZone.att})
                      </span>
                    </div>
                  )}

                  {/* Graphique de l'évolution */}
                  <div className="mt-2">
                    <div className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>
                      Évolution du % par session
                    </div>
                    {sessions.length > 1 ? (
                      <div style={{ position: 'relative', height: `${graphH + 20}px` }}>
                        <svg
                          width="100%"
                          height="100%"
                          viewBox={`-10 -10 ${graphW + 20} ${graphH + 20}`}
                          style={{ overflow: 'visible' }}
                        >
                          <line
                            x1="0"
                            y1="0"
                            x2={graphW}
                            y2="0"
                            stroke="var(--border)"
                            strokeDasharray="2"
                          />
                          <line
                            x1="0"
                            y1={graphH / 2}
                            x2={graphW}
                            y2={graphH / 2}
                            stroke="var(--border)"
                            strokeDasharray="2"
                          />
                          <line
                            x1="0"
                            y1={graphH}
                            x2={graphW}
                            y2={graphH}
                            stroke="var(--border)"
                            strokeDasharray="2"
                          />
                          <polyline
                            points={points}
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="2"
                          />
                          {sessions.map((s, i) => {
                            const cx = i * dx;
                            const cy = graphH - (s.pct / 100) * graphH;
                            return (
                              <g key={i}>
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r="3"
                                  fill="var(--bg-1)"
                                  stroke="var(--accent)"
                                  strokeWidth="1.5"
                                />
                                <text
                                  x={cx}
                                  y={cy - 8}
                                  fontSize="8"
                                  fill="var(--text-3)"
                                  textAnchor="middle"
                                >
                                  {s.pct.toFixed(0)}%
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    ) : (
                      <div className="text-xs italic" style={{ color: 'var(--text-3)' }}>
                        Il faut au moins 2 sessions pour afficher l'évolution.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </div>
    </div>
  );
}

window.TrainingShooter = TrainingShooter;
