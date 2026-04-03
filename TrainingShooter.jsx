import React, { useState, useEffect, useMemo } from 'react';

const SHOOT_ZONES = [
  { id: 'left_0',   label: '0° gauche',  short: '0°G'  },
  { id: 'left_45',  label: '45° gauche', short: '45°G' },
  { id: 'left_70',  label: '70° gauche', short: '70°G' },
  { id: 'axis',     label: 'Axe',        short: 'AXE'  },
  { id: 'right_70', label: '70° droit',  short: '70°D' },
  { id: 'right_45', label: '45° droit',  short: '45°D' },
  { id: 'right_0',  label: '0° droit',   short: '0°D'  },
];

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
            <th className="py-2 px-3 text-left text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Joueur</th>
            {SHOOT_ZONES.map(z => (
              <th key={z.id} className="py-2 px-2 text-center text-xs font-semibold" style={{ color: 'var(--text-3)', minWidth: '48px' }}>
                {z.short}
              </th>
            ))}
            <th className="py-2 px-3 text-center text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Total</th>
            <th className="py-2 px-3 text-center text-xs font-semibold" style={{ color: 'var(--text-3)' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => {
            const pid = String(p.id);
            const zones = shotsData[pid] || {};
            let totalAtt = 0, totalMade = 0;
            SHOOT_ZONES.forEach(z => {
              totalAtt  += zones[z.id]?.attempted || 0;
              totalMade += zones[z.id]?.made      || 0;
            });
            const totalPct = pct(totalMade, totalAtt);
            return (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-1)', background: 'var(--bg-2)' }}>
                  <span className="text-xs mr-1.5" style={{ color: 'var(--text-3)' }}>#{p.number}</span>
                  {p.name}
                </td>
                {SHOOT_ZONES.map(z => {
                  const s = zones[z.id];
                  return (
                    <td key={z.id} className="py-2 px-2 text-center text-xs font-mono" style={{ color: 'var(--text-2)' }}>
                      {s?.attempted ? `${s.made}/${s.attempted}` : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-center text-sm font-bold font-mono" style={{ color: 'var(--text-1)' }}>
                  {totalAtt > 0 ? `${totalMade}/${totalAtt}` : <span style={{ color: 'var(--text-3)' }}>—</span>}
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
  const [selectedDate,     setSelectedDate]     = useState(today);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedZone,     setSelectedZone]     = useState(null);
  const [attempted,        setAttempted]        = useState('');
  const [made,             setMade]             = useState('');
  const [trainingDocs,     setTrainingDocs]     = useState({});
  const [saving,           setSaving]           = useState(false);
  const [saveMsg,          setSaveMsg]          = useState('');

  // ── import ──
  const [showImport,    setShowImport]    = useState(false);
  const [importJson,    setImportJson]    = useState('');
  const [importPreview, setImportPreview] = useState(null); // { entries, byDate, mapped, unmapped, errors }
  const [importLog,     setImportLog]     = useState([]);
  const [importing,     setImporting]     = useState(false);
  const [importDone,    setImportDone]    = useState(false);

  const rosterList = useMemo(() => {
    if (!players) return [];
    const arr = Array.isArray(players) ? players : Object.values(players);
    return arr
      .filter(p => p && p.id != null)
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
        snap => {
          const docs = {};
          snap.forEach(d => { docs[d.id] = d.data(); });
          setTrainingDocs(docs);
        },
        err => console.error('TrainingShooter snapshot:', err)
      );
    return unsub;
  }, []);

  const docId    = `shooting_${selectedDate}`;
  const todayDoc = trainingDocs[docId] || null;
  const dayData  = todayDoc?.shots || {};

  // ── sidebar players ──
  const dayTotalsByPlayer = useMemo(() => {
    const totals = {};
    for (const p of rosterList) {
      const pid = String(p.id);
      const zones = dayData[pid] || {};
      let att = 0, mk = 0;
      SHOOT_ZONES.forEach(z => {
        att += zones[z.id]?.attempted || 0;
        mk  += zones[z.id]?.made      || 0;
      });
      totals[pid] = { att, mk };
    }
    return totals;
  }, [rosterList, dayData]);

  const sortedSidebarPlayers = useMemo(() => {
    const withData = [], withoutData = [];
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
    const mk  = parseInt(made, 10);
    if (!selectedPlayerId || !selectedZone) return;
    if (!att || att <= 0 || isNaN(mk) || mk < 0 || mk > att) return;
    const db = window.db;
    if (!db) return;
    setSaving(true);
    try {
      const shots = todayDoc?.shots ? JSON.parse(JSON.stringify(todayDoc.shots)) : {};
      const pid = String(selectedPlayerId);
      if (!shots[pid])               shots[pid]               = {};
      if (!shots[pid][selectedZone]) shots[pid][selectedZone] = { attempted: 0, made: 0 };
      shots[pid][selectedZone].attempted += att;
      shots[pid][selectedZone].made      += mk;
      await db.collection('training').doc(docId).set({ date: selectedDate, type: 'shooting', shots, _wk: getWk() });
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
    () => rosterList.filter(p => dayData[String(p.id)]),
    [rosterList, dayData]
  );

  // ── stats globales ──
  const { globalByPlayer, sessionCountByPlayer } = useMemo(() => {
    const byPlayer = {}, sessionCount = {};
    for (const doc of Object.values(trainingDocs)) {
      if (!doc.shots) continue;
      for (const [pid, zones] of Object.entries(doc.shots)) {
        if (!byPlayer[pid]) { byPlayer[pid] = {}; sessionCount[pid] = new Set(); }
        sessionCount[pid].add(doc.date);
        for (const [zoneId, s] of Object.entries(zones)) {
          if (!byPlayer[pid][zoneId]) byPlayer[pid][zoneId] = { attempted: 0, made: 0 };
          byPlayer[pid][zoneId].attempted += s.attempted || 0;
          byPlayer[pid][zoneId].made      += s.made      || 0;
        }
      }
    }
    return { globalByPlayer: byPlayer, sessionCountByPlayer: sessionCount };
  }, [trainingDocs]);

  const globalPlayersWithData = useMemo(
    () => rosterList.filter(p => globalByPlayer[String(p.id)]),
    [rosterList, globalByPlayer]
  );

  // ── export CSV ──
  const handleExportCSV = () => {
    const rows = ['Date,Joueur,Zone,Tentés,Marqués,Pourcentage'];
    const sorted = Object.values(trainingDocs).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    for (const doc of sorted) {
      if (!doc.shots) continue;
      for (const [pid, zones] of Object.entries(doc.shots)) {
        const player = rosterList.find(p => String(p.id) === pid);
        const name = player ? player.name : `id_${pid}`;
        for (const [zoneId, s] of Object.entries(zones)) {
          if (!s.attempted) continue;
          const zone = SHOOT_ZONES.find(z => z.id === zoneId);
          const p = ((s.made / s.attempted) * 100).toFixed(1);
          rows.push(`${doc.date},"${name}","${zone?.label || zoneId}",${s.attempted},${s.made},${p}%`);
        }
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `entrainement_tir_${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── import logic ──
  const ZONE_MAP = { '0G': 'left_0', '45G': 'left_45', '70G': 'left_70', 'Axe': 'axis', '70D': 'right_70', '45D': 'right_45', '0D': 'right_0' };
  const SKIP_KEYS = new Set(['Distance', 'types']);

  const playerMap = useMemo(() => new Map(rosterList.map(p => [p.id, p.name])), [rosterList]);

  const handleImportAnalyze = () => {
    setImportLog([]);
    setImportDone(false);
    const errors = [];
    let entries = [];
    try {
      const raw = JSON.parse(importJson.trim());
      entries = Array.isArray(raw) ? raw : [raw];
    } catch (e) {
      setImportPreview({ entries: [], errors: [`JSON invalide : ${e.message}`], byDate: new Map(), mapped: [], unmapped: [] });
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
    const seenIds  = [...new Set(valid.map(e => e.playerId))];
    const mapped   = seenIds.filter(id => playerMap.has(id));
    const unmapped = seenIds.filter(id => !playerMap.has(id));
    setImportPreview({ entries: valid, errors, byDate, mapped, unmapped });
  };

  const handleImportRun = async () => {
    if (!importPreview?.entries.length) return;
    const db = window.db;
    if (!db) { setImportLog([{ t: 'err', msg: 'Firebase non initialisé' }]); return; }
    setImporting(true);
    setImportDone(false);
    const log = [];
    const push = (t, msg) => { log.push({ t, msg }); setImportLog([...log]); };
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
        const shots = snap.exists ? (snap.data().shots || {}) : {};
        let added = 0;
        for (const entry of entries) {
          const pid = String(entry.playerId);
          if (!shots[pid]) shots[pid] = {};
          for (const [key, val] of Object.entries(entry.zones)) {
            if (SKIP_KEYS.has(key)) continue;
            const zoneId = ZONE_MAP[key];
            if (!zoneId) continue;
            if (!shots[pid][zoneId]) shots[pid][zoneId] = { attempted: 0, made: 0 };
            shots[pid][zoneId].attempted += val.attempted;
            shots[pid][zoneId].made      += val.made;
            added++;
          }
        }
        await db.collection('training').doc(docId).set({ date, type: 'shooting', shots, _wk: getWk() });
        const names = [...new Set(entries.map(e => playerMap.get(e.playerId) || `id_${e.playerId}`))];
        push('ok', `${date} — ${names.join(', ')} — ${added} zones ${snap.exists ? '(fusionné)' : '(nouveau)'}`);
        written++;
      } catch (e) {
        push('err', `${date} — ${e.message}`);
      }
    }
    push('info', `${written} document(s) écrit(s)`);
    setImportDone(true);
    setImporting(false);
  };

  const selectedPlayer    = selectedPlayerId ? rosterList.find(p => String(p.id) === selectedPlayerId) : null;
  const selectedZoneLabel = selectedZone ? SHOOT_ZONES.find(z => z.id === selectedZone)?.label : null;
  const canSubmit = !saving && selectedPlayerId && selectedZone && attempted !== '' && parseInt(attempted, 10) > 0;

  return (
    <div className="flex flex-col lg:flex-row" style={{ minHeight: 0 }}>

      {/* ── SIDEBAR ── */}
      <div className="lg:w-72 lg:flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-1)' }}>

        {/* Date */}
        <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <label className="block text-xs mb-1.5 font-semibold" style={{ color: 'var(--text-3)' }}>Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setSelectedPlayerId(null); }}
            className="w-full px-3 py-1.5 rounded text-sm font-mono"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
          />
        </div>

        {/* Import toggle */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowImport(v => !v)}
            className="w-full text-xs font-semibold rounded px-2 py-1.5 text-left"
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

        {/* Desktop player list */}
        <div className="hidden lg:block p-2 space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
          {sortedSidebarPlayers.map(p => {
            const pid = String(p.id);
            const { att, mk } = dayTotalsByPlayer[pid] || { att: 0, mk: 0 };
            const isSelected = selectedPlayerId === pid;
            const pctVal = pct(mk, att);
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(isSelected ? null : pid)}
                className="w-full text-left rounded-lg px-3 py-2.5"
                style={{ background: isSelected ? 'var(--accent)' : 'var(--bg-2)', border: `1px solid ${isSelected ? 'transparent' : 'var(--border)'}`, boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.3)' : 'none', cursor: 'pointer' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-3)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-2)'; }}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-mono" style={{ color: isSelected ? 'rgba(255,255,255,0.65)' : 'var(--text-3)' }}>#{p.number}</span>
                  <span className="font-semibold text-sm truncate" style={{ color: isSelected ? '#fff' : 'var(--text-1)' }}>{p.name}</span>
                </div>
                {att > 0 ? (
                  <div className="text-xs mt-0.5 font-mono" style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-2)' }}>
                    {mk}/{att}<span className="mx-1 opacity-50">·</span>
                    <span style={{ color: isSelected ? 'rgba(255,255,255,0.9)' : pctColor(pctVal) }}>{pctVal}%</span>
                  </div>
                ) : (
                  <div className="text-xs mt-0.5" style={{ color: isSelected ? 'rgba(255,255,255,0.55)' : 'var(--text-3)' }}>Aucun tir</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile player band */}
        <div className="lg:hidden flex overflow-x-auto gap-2 p-2" style={{ scrollbarWidth: 'none' }}>
          {sortedSidebarPlayers.map(p => {
            const pid = String(p.id);
            const { att, mk } = dayTotalsByPlayer[pid] || { att: 0, mk: 0 };
            const isSelected = selectedPlayerId === pid;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(isSelected ? null : pid)}
                className="flex-shrink-0 rounded-lg px-3 py-2 text-left"
                style={{ background: isSelected ? 'var(--accent)' : 'var(--bg-2)', border: `1px solid ${isSelected ? 'transparent' : 'var(--border)'}`, minWidth: '90px', cursor: 'pointer' }}
              >
                <div className="text-xs font-semibold truncate" style={{ color: isSelected ? '#fff' : 'var(--text-1)' }}>
                  <span className="font-normal mr-1" style={{ color: isSelected ? 'rgba(255,255,255,0.65)' : 'var(--text-3)' }}>#{p.number}</span>
                  {p.name}
                </div>
                <div className="text-xs mt-0.5 font-mono" style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-3)' }}>
                  {att > 0 ? `${mk}/${att}` : '—'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── IMPORT ── */}
        {showImport && (
          <div className="sc-card">
            <div className="sc-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Import JSON</span>
              <button
                onClick={() => { setShowImport(false); setImportJson(''); setImportPreview(null); setImportLog([]); setImportDone(false); }}
                className="sc-btn-ghost"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.7rem', border: '1px solid var(--border)', borderRadius: '0.375rem' }}
              >
                Fermer
              </button>
            </div>
            <div className="p-4 space-y-3">

              {/* Zone reference */}
              <div className="text-xs font-mono flex flex-wrap gap-x-3 gap-y-0.5 px-2 py-1.5 rounded" style={{ background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                <span>0G→left_0</span><span>45G→left_45</span><span>70G→left_70</span>
                <span>Axe→axis</span><span>70D→right_70</span><span>45D→right_45</span><span>0D→right_0</span>
                <span style={{ fontStyle: 'italic', fontFamily: 'sans-serif' }}>· Distance/types ignorés</span>
              </div>

              {/* Textarea */}
              <textarea
                value={importJson}
                onChange={e => { setImportJson(e.target.value); setImportPreview(null); setImportLog([]); setImportDone(false); }}
                placeholder={'[\n  {"id":"...","playerId":1,"date":"2025-12-11","zones":{"0G":{"made":10,"attempted":14},...}},\n  ...\n]'}
                style={{
                  width: '100%',
                  minHeight: '200px',
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-1)',
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  display: 'block',
                }}
              />

              {/* Analyser */}
              <button
                onClick={handleImportAnalyze}
                disabled={!importJson.trim()}
                className="sc-btn-ghost"
                style={{ padding: '0.45rem 1rem', border: '1px solid var(--border)', borderRadius: '0.375rem', opacity: importJson.trim() ? 1 : 0.4, cursor: importJson.trim() ? 'pointer' : 'not-allowed' }}
              >
                Analyser
              </button>

              {/* Preview */}
              {importPreview && (
                <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                  {importPreview.errors.map((err, i) => (
                    <p key={i} className="text-xs" style={{ color: 'var(--miss)' }}>❌ {err}</p>
                  ))}
                  {importPreview.entries.length > 0 && (
                    <>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                        {importPreview.entries.length} entrée(s) — {importPreview.byDate.size} date(s)
                      </p>
                      {importPreview.mapped.length > 0 && (
                        <p className="text-xs" style={{ color: 'var(--make)' }}>
                          ✅ {importPreview.mapped.map(id => `${playerMap.get(id)} (id=${id})`).join(' · ')}
                        </p>
                      )}
                      {importPreview.unmapped.length > 0 && (
                        <p className="text-xs" style={{ color: '#facc15' }}>
                          ⚠️ id non mappés : {importPreview.unmapped.join(', ')} → importés comme id_N
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {[...importPreview.byDate.entries()].sort().map(([date, pids]) => (
                          <span key={date} className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                            {date} · {pids.size}p
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={handleImportRun}
                        disabled={importing}
                        className="sc-btn-accent"
                        style={{ padding: '0.5rem 1.25rem', opacity: importing ? 0.6 : 1, cursor: importing ? 'not-allowed' : 'pointer' }}
                      >
                        {importing ? 'Import en cours…' : `Importer ${importPreview.entries.length} entrée(s)`}
                      </button>
                    </>
                  )}
                  {importPreview.entries.length === 0 && !importPreview.errors.length && (
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Aucune entrée valide.</p>
                  )}
                </div>
              )}

              {/* Log */}
              {importLog.length > 0 && (
                <div className="rounded-lg p-3 space-y-1 overflow-y-auto" style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}>
                  {importLog.map((entry, i) => (
                    <p key={i} className="text-xs font-mono" style={{ color: entry.t === 'ok' ? 'var(--make)' : entry.t === 'err' ? 'var(--miss)' : 'var(--text-3)' }}>
                      {entry.t === 'ok' ? '✅' : entry.t === 'err' ? '❌' : '─'} {entry.msg}
                    </p>
                  ))}
                  {importDone && (
                    <button
                      onClick={() => { setImportJson(''); setImportPreview(null); setImportLog([]); setImportDone(false); }}
                      className="text-xs mt-1 block"
                      style={{ color: 'var(--text-3)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── SAISIE ── */}
        <div className="sc-card">
          <div className="sc-card-header">Saisie</div>
          <div className="p-4 space-y-4">
            {selectedPlayer ? (
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                <span className="text-xs mr-1.5 font-normal" style={{ color: 'var(--text-3)' }}>#{selectedPlayer.number}</span>
                {selectedPlayer.name}
                {selectedZoneLabel && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-3)' }}>· {selectedZoneLabel}</span>}
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Sélectionnez un joueur dans la liste</p>
            )}

            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {SHOOT_ZONES.map(z => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}
                  className={selectedZone === z.id ? 'sc-btn-accent' : 'sc-btn-ghost'}
                  style={{ padding: '0.5rem 0.25rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.375rem', border: selectedZone === z.id ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                >
                  {z.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>Tentés</label>
                <input type="number" min="0" value={attempted} onChange={e => setAttempted(e.target.value)} onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()} placeholder="0" className="w-20 px-3 py-2 rounded text-sm font-mono text-center" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-1)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--text-3)' }}>Marqués</label>
                <input type="number" min="0" value={made} onChange={e => setMade(e.target.value)} onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()} placeholder="0" className="w-20 px-3 py-2 rounded text-sm font-mono text-center" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-1)' }} />
              </div>
              <button onClick={handleSubmit} disabled={!canSubmit} className="sc-btn-accent" style={{ padding: '0.5rem 1.25rem', opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
                {saving ? 'Enregistrement…' : 'Valider'}
              </button>
              {saveMsg && <span className="text-sm font-medium" style={{ color: saveMsg.startsWith('Erreur') ? 'var(--miss)' : 'var(--make)' }}>{saveMsg}</span>}
            </div>
          </div>
        </div>

        {/* ── RÉCAP DU JOUR ── */}
        <div className="sc-card">
          <div className="sc-card-header">Récapitulatif — {selectedDate}</div>
          <div className="p-4">
            <StatsTable shotsData={dayData} players={playersToday} />
          </div>
        </div>

        {/* ── STATS GLOBALES ── */}
        <div className="sc-card">
          <div className="sc-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Stats globales</span>
            <button onClick={handleExportCSV} disabled={!globalPlayersWithData.length} className="sc-btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', border: '1px solid var(--border)', borderRadius: '0.375rem', opacity: globalPlayersWithData.length ? 1 : 0.4 }}>
              Export CSV
            </button>
          </div>
          <div className="p-4">
            {globalPlayersWithData.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {globalPlayersWithData.map(p => {
                  const n = sessionCountByPlayer[String(p.id)]?.size || 0;
                  return (
                    <span key={p.id} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                      {p.name} — {n} séance{n > 1 ? 's' : ''}
                    </span>
                  );
                })}
              </div>
            )}
            <StatsTable shotsData={globalByPlayer} players={globalPlayersWithData} />
          </div>
        </div>

      </div>
    </div>
  );
}

window.TrainingShooter = TrainingShooter;
