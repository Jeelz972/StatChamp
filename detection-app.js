// detection-app.js — Module Détection StatChamp
// React 18 + Babel standalone — pas de import/export

// ─── Icons ────────────────────────────────────────────────────────────────────

var DetectionIcons = {
  Back: 'M15 18l-6-6 6-6',
  Plus: 'M12 5v14M5 12h14',
  Search: 'M21 21l-5.2-5.2M10 4a6 6 0 100 12 6 6 0 000-12z',
  ChevronDown: 'M6 9l6 6 6-6',
  MoreH: 'M12 12h.01M8 12h.01M16 12h.01',
  Trash: 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
  Edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7',
  Camera:
    'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 13a4 4 0 100-8 4 4 0 000 8z',
  User: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 3a4 4 0 100 8 4 4 0 000-8z',
  Check: 'M20 6L9 17l-5-5',
};
var SettingsPage = function() {
  const [baremes, setBaremes] = React.useState(window.DETECTION_BAREMES);
  const categories = ['U11','U13','U15','U18'];

  const saveAll = () => {
    window.saveBaremes(baremes);
    alert('Barèmes sauvegardés ✅');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">⚙️ Paramètres – Barèmes & Tests</h1>
      
      {/* Tests par catégorie */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Tests physiques activés par catégorie</h2>
        {categories.map(cat => (
          <div key={cat} className="mb-8">
            <h3 className="font-bold text-lg mb-3">{cat}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.keys(window.DETECTION_BAREMES.physical).map(testId => {
                const active = window.DetectionEngine.getActiveTestsForCategory(cat).includes(testId);
                return (
                  <label key={testId} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={e => {
                        let list = window.DetectionEngine.getActiveTestsForCategory(cat);
                        if (e.target.checked) list.push(testId);
                        else list = list.filter(t => t !== testId);
                        window.DetectionEngine.setActiveTestsForCategory(cat, list);
                        // refresh
                        setBaremes({...baremes});
                      }}
                    />
                    <span>{window.DETECTION_BAREMES.physical[testId].name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Éditeur barèmes simplifié (tableau) */}
      <div className="bg-zinc-900 rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-6">Modifier les seuils (barèmes)</h2>
        {/* Pour simplifier, on montre un éditeur JSON éditable */}
        <textarea
          value={JSON.stringify(baremes, null, 2)}
          onChange={e => setBaremes(JSON.parse(e.target.value))}
          className="w-full h-96 font-mono text-sm bg-black text-emerald-300 p-4 rounded-xl"
        />
        <div className="flex gap-4 mt-6">
          <button onClick={saveAll} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold">Sauvegarder tous les barèmes</button>
          <button onClick={() => { window.resetBaremes(); setBaremes(window.DETECTION_BAREMES); }} className="px-6 py-3 border border-zinc-700 rounded-xl">Réinitialiser par défaut</button>
        </div>
      </div>
    </div>
  );
};

var ScoutReport = function({ player }) {
  const scores = window.DetectionEngine.computeOverallScores(player);
  const global = window.DetectionEngine.computeGlobalScore(player);
  const radar = window.DetectionEngine.getGlobalRadarData(player);

  const getDescriptor = (domain, criterionId, level) => {
    if (!window.DETECTION_DESCRIPTORS[domain] || !window.DETECTION_DESCRIPTORS[domain][criterionId]) return '';
    return window.DETECTION_DESCRIPTORS[domain][criterionId][player.category]?.[level] || '';
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-black dark:bg-zinc-950 dark:text-white rounded-3xl shadow-2xl print:shadow-none" style={{fontFamily:'system-ui'}}>
      <div className="flex justify-between border-b pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold">{player.firstName} {player.lastName}</h1>
          <p className="text-2xl text-orange-500">{player.category} • {player.position || '—'}</p>
        </div>
        <div className="text-right">
          <div className="text-7xl font-bold text-orange-500">{global.score || '—'}</div>
          <div className="text-sm tracking-widest">OVERALL GRADE</div>
        </div>
      </div>

      {/* Radar global */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Profil Athlétique &amp; Skills</h2>
        {/* Tu peux réutiliser ton radar existant ou laisser un placeholder SVG simple */}
        <div className="grid grid-cols-4 gap-4 text-center">
          {radar.map(ax => (
            <div key={ax.id}>
              <div className="text-4xl font-bold text-orange-500">{ax.value}</div>
              <div className="text-xs uppercase">{ax.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sections avec descriptors */}
      {['physical','technical','tactical','mental'].map(domain => (
        <div key={domain} className="mb-10">
          <h3 className="uppercase text-sm font-bold tracking-widest mb-3 border-l-4 border-orange-500 pl-3">
            {domain.toUpperCase()}
          </h3>
          <div className="pl-6 space-y-4">
            {player[domain]?.evaluations?.map(ev => (
              <div key={ev.criterionId}>
                <div className="flex justify-between">
                  <span className="font-medium">{ev.criterionId}</span>
                  <span className={window.DetectionEngine.levelColor(ev.level)}>{ev.level}</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {getDescriptor(domain, ev.criterionId, ev.level)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Scout Summary */}
      <div className="mt-12 p-6 bg-orange-50 dark:bg-orange-950/30 rounded-2xl">
        <h3 className="font-bold mb-3">SCOUT SUMMARY – NBA PROJECTION</h3>
        <p className="text-lg leading-relaxed">
          {global.score >= 80 
            ? `${player.firstName} est un prospect élite avec un plafond très élevé.` 
            : global.score >= 65 
            ? `Joueuse solide avec un très bon potentiel de rotation.` 
            : `Prospect intéressant à développer, surtout sur le plan physique et mental.`}
        </p>
      </div>

      <div className="text-center text-xs mt-12 text-zinc-500 print:hidden">
        Rapport généré le {new Date().toLocaleDateString('fr-FR')} • StatChamp Detection
      </div>
    </div>
  );
};

// Dans DetectionDashboard, ajoute l’onglet "Rapport Scout"
const tabs = ['Overview', 'Physique', 'Technique', 'Tactique', 'Mental', 'Rapport Scout'];

// Dans le rendu du player detail :
{activeTab === 'Rapport Scout' && <ScoutReport player={player} />}

// Dans DetectionList, remplace Firebase par :
React.useEffect(() => {
  const players = window.DetectionEngine.getAllPlayers();
  setPlayers(players);
  setLoading(false);
}, []);
function DIcon({ d, path, className, style }) {
  // Extraction robuste de la taille pour contrer le comportement flexbox
  var w = '20px'; // h-5 w-5 par défaut
  if (className) {
    if (className.indexOf('w-3.5') !== -1) w = '14px';
    else if (className.indexOf('w-4') !== -1) w = '16px';
    else if (className.indexOf('w-5') !== -1) w = '20px';
    else if (className.indexOf('w-7') !== -1) w = '28px';
    else if (className.indexOf('w-8') !== -1) w = '32px';
  }

  // Application stricte des contraintes (width + minWidth) fusionnées avec un style existant
  var safeStyle = Object.assign({ width: w, height: w, minWidth: w, minHeight: w }, style);

  return (
    <svg
      className={'shrink-0 ' + (className || 'h-5 w-5')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={safeStyle}
    >
      <path d={d || path} />
    </svg>
  );
}

var DPaths = {
  back: 'M15 18l-6-6 6-6',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.35-4.35M11 5a6 6 0 100 12 6 6 0 000-12z',
  chevDown: 'M6 9l6 6 6-6',
  moreH: 'M5 12h.01M12 12h.01M19 12h.01',
  trash: 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
  users:
    'M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  camera:
    'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 13a4 4 0 100-8 4 4 0 000 8z',
  target:
    'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6a6 6 0 100 12 6 6 0 000-12zM12 10a2 2 0 100 4 2 2 0 000-4z',
  arrowR: 'M5 12h14M12 5l7 7-7 7',
  filter: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  x: 'M18 6L6 18M6 6l12 12',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  calendar:
    'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6',
  settings:
    'M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.1a2 2 0 01-1-1.72v-.51a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2zM12 9a3 3 0 100 6 3 3 0 000-6z',
  chevLeft: 'M15 18l-6-6 6-6',
  chevRight: 'M9 18l6-6-6-6',
  help: 'M12 22a10 10 0 100-20 10 10 0 000 20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

var catBadge = {
  U11: 'bg-violet-500/15 text-violet-400 border border-violet-500/25',
  U13: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  U15: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  U18: 'bg-orange-500/15 text-orange-400 border border-orange-500/25',
};

var srcBadge = {
  roster:   'bg-green-500/15 text-green-400 border border-green-500/25',
  external: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
};

var srcLabel = { roster: 'Roster', external: 'Externe' };

var levelGradient = {
  excellent: 'linear-gradient(90deg, #22c55e, #34d399)',
  tres_bien: 'linear-gradient(90deg, #10b981, #6ee7b7)',
  bien: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
  moyen: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
  insuffisant: 'linear-gradient(90deg, #ef4444, #f87171)',
};

var levelTextColor = {
  excellent: 'text-green-400',
  tres_bien: 'text-emerald-400',
  bien: 'text-blue-400',
  moyen: 'text-amber-400',
  insuffisant: 'text-red-400',
};

var levelSelectedStyle = {
  excellent: 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40',
  tres_bien: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40',
  bien: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40',
  moyen: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40',
  insuffisant: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40',
};

var levelShortLabels = {
  excellent: 'Excl.',
  tres_bien: 'T.Bien',
  bien: 'Bien',
  moyen: 'Moy.',
  insuffisant: 'Insuf.',
};

function categoryBadgeClass(cat) {
  return (
    (catBadge[cat] || 'bg-slate-500/15 text-slate-400 border border-slate-500/25') +
    ' inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold'
  );
}

function scoreBarColor(score) {
  if (score === null || score === undefined) return 'bg-slate-600';
  if (score < 40) return 'bg-red-500';
  if (score < 60) return 'bg-amber-500';
  if (score < 80) return 'bg-blue-500';
  return 'bg-green-500';
}

function scoreTextColor(score) {
  if (score === null || score === undefined) return 'text-slate-600';
  if (score < 40) return 'text-red-400';
  if (score < 60) return 'text-amber-400';
  if (score < 80) return 'text-blue-400';
  return 'text-green-400';
}

// ─── PlayerAvatar ─────────────────────────────────────────────────────────────

function PlayerAvatar({ player, size }) {
  var s = size || 'h-12 w-12';
  var hasPhoto = player.photo && player.photo.length > 0;

  if (hasPhoto) {
    return (
      <div
        className={
          s +
          ' rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-orange-500/30 transition-all shrink-0'
        }
      >
        <img src={player.photo} className="h-full w-full object-cover" alt="" />
      </div>
    );
  }

  var avatarBg = {
    U11: 'linear-gradient(135deg, #7c3aed22, #7c3aed44)',
    U13: 'linear-gradient(135deg, #3b82f622, #3b82f644)',
    U15: 'linear-gradient(135deg, #f59e0b22, #f59e0b44)',
    U18: 'linear-gradient(135deg, #FF6B3522, #FF6B3544)',
  };
  var initials = ((player.firstName || '')[0] || '') + ((player.lastName || '')[0] || '');

  return (
    <div
      className={s + ' flex items-center justify-center rounded-full text-sm font-bold shrink-0'}
      style={{ background: avatarBg[player.category] || avatarBg.U18, color: 'var(--text-2)' }}
    >
      {initials.toUpperCase() || '?'}
    </div>
  );
}

// ─── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, score }) {
  var hasScore = score !== null && score !== undefined;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-20 shrink-0">{label}</span>
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(51,65,85,0.5)' }}
      >
        <div
          className={scoreBarColor(score) + ' h-full rounded-full'}
          style={{
            width: hasScore ? score + '%' : '0%',
            transition: 'width 700ms cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-6 text-right">
        {hasScore ? score : '—'}
      </span>
    </div>
  );
}

// ─── FilterDropdown ───────────────────────────────────────────────────────────

function FilterDropdown({ value, onChange, options, placeholder }) {
  var [open, setOpen] = React.useState(false);
  var ref = React.useRef(null);

  React.useEffect(function () {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return function () {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  var selected = options.find(function (o) {
    return o.value === value;
  });
  var selectedLabel = selected ? selected.label : placeholder;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={function () {
          setOpen(!open);
        }}
        className="flex items-center gap-2 h-10 rounded-lg px-3 text-sm text-slate-300 hover:text-white transition-colors"
        style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
      >
        <span>{selectedLabel}</span>
        <DIcon path={DetectionIcons.ChevronDown} className="h-4 w-4 text-slate-500" />
      </button>
      {open && (
        <div
          className="absolute top-full mt-1 z-20 w-48 rounded-lg py-1 shadow-xl"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
        >
          {options.map(function (opt) {
            var isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={function () {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={
                  'w-full px-3 py-2 text-left text-sm transition-colors ' +
                  (isActive
                    ? 'text-orange-400 bg-orange-500/10'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white')
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CustomDropdown ───────────────────────────────────────────────────────────

function CustomDropdown({ options, value, onChange, placeholder }) {
  var [open, setOpen] = React.useState(false);
  var ref = React.useRef(null);

  React.useEffect(function () {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return function () {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  var selectedLabel = placeholder || 'Sélectionner';
  options.forEach(function (opt) {
    if (opt.value === value) selectedLabel = opt.label;
  });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={function () {
          setOpen(!open);
        }}
        className="flex items-center gap-2 h-10 rounded-lg px-3 text-sm transition-colors hover:text-white"
        style={{
          background: 'var(--bg-3)',
          border: '1px solid var(--border)',
          color: 'var(--text-2)',
        }}
      >
        <span className="truncate">{selectedLabel}</span>
        <DIcon d={DPaths.chevDown} className="h-4 w-4 text-slate-500 shrink-0" />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 z-30 w-48 rounded-lg py-1 shadow-xl"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
        >
          {options.map(function (opt) {
            var isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={function () {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={
                  'w-full px-3 py-2 text-left text-sm transition-colors ' +
                  (isActive
                    ? 'text-orange-400 bg-orange-500/10'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white')
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DetectionFilters ─────────────────────────────────────────────────────────

function DetectionFilters({ filters, onFilterChange }) {
  var [focused, setFocused] = React.useState(false);

  var catOptions = [
    { value: '', label: 'Toutes catégories' },
    { value: 'U11', label: 'U11' },
    { value: 'U13', label: 'U13' },
    { value: 'U15', label: 'U15' },
    { value: 'U18', label: 'U18' },
  ];
  var srcOptions = [
    { value: '', label: 'Toutes sources' },
    { value: 'Roster', label: 'Roster' },
    { value: 'Externe', label: 'Externe' },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-6 py-3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="relative flex-1 max-w-md">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="10" cy="10" r="6" />
          <line x1="15.2" y1="15.2" x2="21" y2="21" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher une joueuse..."
          value={filters.search}
          onChange={function (e) {
            onFilterChange({
              category: filters.category,
              source: filters.source,
              search: e.target.value,
            });
          }}
          onFocus={function () {
            setFocused(true);
          }}
          onBlur={function () {
            setFocused(false);
          }}
          className="h-10 w-full rounded-lg pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors"
          style={{
            background: 'var(--bg-3)',
            border: '1px solid ' + (focused ? 'var(--accent)' : 'var(--border)'),
            boxShadow: focused ? '0 0 0 3px var(--accent-ghost)' : 'none',
            outline: 'none',
          }}
        />
      </div>

      <FilterDropdown
        value={filters.category}
        onChange={function (v) {
          onFilterChange({ category: v, source: filters.source, search: filters.search });
        }}
        options={catOptions}
        placeholder="Catégorie"
      />
      <FilterDropdown
        value={filters.source}
        onChange={function (v) {
          onFilterChange({ category: filters.category, source: v, search: filters.search });
        }}
        options={srcOptions}
        placeholder="Source"
      />
    </div>
  );
}

// ─── ScoreBadge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score, size }) {
  var isLarge = size === 'lg';
  if (score == null) {
    return (
      <div
        className={
          'flex items-center justify-center rounded-full font-bold font-mono text-slate-500 ' +
          (isLarge ? 'w-16 h-16 text-lg' : 'w-12 h-12 text-sm')
        }
        style={{ background: 'var(--bg-3)', border: '2px solid var(--border)' }}
      >
        —
      </div>
    );
  }
  var color =
    score >= 80
      ? '#22c55e'
      : score >= 60
      ? 'var(--accent)'
      : score >= 40
      ? '#f59e0b'
      : '#ef4444';
  var circumference = isLarge ? 2 * Math.PI * 26 : 2 * Math.PI * 18;
  var dash = (score / 100) * circumference;
  var svgSize = isLarge ? 72 : 50;
  var r = isLarge ? 26 : 18;
  var center = svgSize / 2;
  var textSize = isLarge ? '14px' : '11px';

  return (
    <div className={'relative shrink-0'} style={{ width: svgSize, height: svgSize }}>
      <svg width={svgSize} height={svgSize} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(51,65,85,0.6)" strokeWidth="3" />
        <circle
          cx={center} cy={center} r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={dash + ' ' + circumference}
          strokeLinecap="round"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-bold font-mono"
        style={{ fontSize: textSize, color: color }}
      >
        {score}
      </div>
    </div>
  );
}

// ─── DetectionCard ────────────────────────────────────────────────────────────

function DetectionCard({ player, onSelect }) {
  var scores = window.DetectionEngine.computeOverallScores(player);
  var globalResult = window.DetectionEngine.computeGlobalScore(player);
  var globalScore = globalResult.score;

  return (
    <div
      onClick={function () {
        onSelect(player.id);
      }}
      className="group relative overflow-hidden rounded-xl p-5 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-orange-500/5"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
      onMouseEnter={function (e) {
        e.currentTarget.style.borderColor = 'rgba(255,107,53,0.3)';
      }}
      onMouseLeave={function (e) {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Header : avatar + nom + score global */}
      <div className="flex items-center gap-3 mb-4">
        <PlayerAvatar player={player} size="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate text-sm">
            {player.firstName + ' ' + player.lastName}
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {player.position || '—'}
          </p>
        </div>
        <ScoreBadge score={globalScore} />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span
          className={
            'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ' +
            (catBadge[player.category] || catBadge.U18)
          }
        >
          {player.category}
        </span>
        <span
          className={
            'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ' +
            (srcBadge[player.source] || srcBadge.external)
          }
        >
          {srcLabel[player.source] || 'Externe'}
        </span>
      </div>

      {/* 4 barres de domaine */}
      <div className="space-y-2 mb-4">
        {[
          { label: 'Physique',  score: scores.physical },
          { label: 'Technique', score: scores.technical },
          { label: 'Tactique',  score: scores.tactical },
          { label: 'Mental',    score: scores.mental },
        ].map(function (item) {
          return (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-xs w-16 shrink-0" style={{ color: 'var(--text-3)' }}>
                {item.label}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--bg-3)' }}
              >
                {item.score != null && (
                  <div
                    className={'h-full rounded-full transition-all duration-700 ' + scoreBarColor(item.score)}
                    style={{ width: item.score + '%' }}
                  />
                )}
              </div>
              <span className="text-xs font-mono w-6 text-right" style={{ color: 'var(--text-2)' }}>
                {item.score != null ? item.score : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer : club + lien */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
          {player.club || '—'}
        </span>
        <span className="text-xs font-semibold transition-colors text-slate-600 group-hover:text-orange-400">
          Voir détails →
        </span>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onCreateNew }) {
  if (hasFilters) {
    return (
      <div
        className="mt-8 flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center"
        style={{ background: 'var(--bg-2)', border: '1px dashed var(--border)' }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'var(--accent-ghost)' }}
        >
          <DIcon path={DetectionIcons.Search} className="h-7 w-7 text-orange-400" />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-white">Aucune joueuse trouvée</h3>
        <p className="mt-2 max-w-sm text-slate-500 text-sm">
          Essayez d'élargir votre recherche ou de modifier les filtres.
        </p>
      </div>
    );
  }

  return (
    <div
      className="mt-8 flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center"
      style={{ background: 'var(--bg-2)', border: '1px dashed var(--border)' }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'var(--accent-ghost)' }}
      >
        <DIcon path={DetectionIcons.User} className="h-7 w-7 text-orange-400" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-white">Aucune fiche créée</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Commencez par créer votre première fiche de joueuse pour débuter le suivi de vos prospects.
      </p>
      <button
        onClick={onCreateNew}
        className="mt-8 flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold text-sm transition-colors"
        style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
      >
        + Créer la première fiche
      </button>
      <div className="mt-10 grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        {[
          { title: 'Organisez', desc: 'Classez par catégorie et source' },
          { title: 'Évaluez', desc: 'Physique, technique, tactique' },
          { title: 'Suivez', desc: 'Progression multi-sessions' },
        ].map(function (tip) {
          return (
            <div
              key={tip.title}
              className="rounded-lg p-4 text-left"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
            >
              <h4 className="font-semibold text-white text-sm">{tip.title}</h4>
              <p className="mt-1 text-xs text-slate-500">{tip.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CreatePlayerForm ─────────────────────────────────────────────────────────

function CreatePlayerForm({ onClose, onPlayerCreated }) {
  var [firstName, setFirstName] = React.useState('');
  var [lastName, setLastName] = React.useState('');
  var [birthDate, setBirthDate] = React.useState('');
  var [position, setPosition] = React.useState('Meneur');
  var [club, setClub] = React.useState('');
  var [height, setHeight] = React.useState('');
  var [source, setSource] = React.useState('external');
  var [saving, setSaving] = React.useState(false);
  var [rosterPlayers, setRosterPlayers] = React.useState([]);
  var [rosterLoading, setRosterLoading] = React.useState(false);
  var [selectedRoster, setSelectedRoster] = React.useState(null);

  React.useEffect(function() {
    if (source !== 'roster') {
      setRosterPlayers([]);
      setSelectedRoster(null);
      return;
    }
    var db = window.detectionDb;
    if (!db) return;
    setRosterLoading(true);
    db.collection('team_data').doc('roster').get()
      .then(function(doc) {
        if (doc.exists) {
          var list = doc.data().list || [];
          setRosterPlayers(list);
        }
        setRosterLoading(false);
      })
      .catch(function(err) {
        console.error('[Detection] Load roster error:', err);
        setRosterLoading(false);
      });
  }, [source]);

  var category = React.useMemo(
    function () {
      return birthDate ? window.DetectionEngine.computeCategory(birthDate) : null;
    },
    [birthDate]
  );

  var canCreate =
    firstName.trim() !== '' && lastName.trim() !== '' && birthDate !== '' && category !== null;

  var inputClass =
    'w-full h-10 rounded-lg px-3 text-sm text-white placeholder-slate-600 transition-colors' +
    ' focus:outline-none';
  var inputStyle = { background: 'var(--bg-3)', border: '1px solid var(--border)' };
  var labelClass = 'block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider';

  function handleCreate() {
    if (!canCreate || saving) return;
    var db = window.detectionDb;
    if (!db) {
      alert('Firebase non connecté');
      return;
    }

    setSaving(true);
    var id = window.DetectionEngine.generateId('det');
    var now = new Date().toISOString();
    var wk = sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
    var doc = {
      id: id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate,
      category: category,
      position: position,
      club: club.trim(),
      source: source,
      rosterId: selectedRoster ? selectedRoster.id : null,
      height: height !== '' ? parseInt(height, 10) : null,
      photoUrl: null,
      scoutNotes: '',
      createdAt: now,
      updatedAt: now,
      physicalSessions: [],
      technical: { date: null, evaluations: [], comment: '' },
      tactical: { date: null, evaluations: [], comment: '' },
      mental: { date: null, evaluations: [], comment: '' },
      generalComment: '',
      _wk: wk,
    };

    db.collection('detection')
      .doc(id)
      .set(doc)
      .then(function () {
        onPlayerCreated(id);
      })
      .catch(function (err) {
        console.error('[Detection] Create error:', err);
        alert('Erreur de sauvegarde');
        setSaving(false);
      });
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-lg font-bold text-white">Nouvelle fiche</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <DIcon d={DPaths.x} className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Prénom */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-2)' }}
            >
              Prénom *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={function (e) {
                setFirstName(e.target.value);
              }}
              className="w-full h-10 rounded-lg px-3 text-sm text-white placeholder-slate-600"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
              placeholder="Léa"
            />
          </div>

          {/* Nom */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-2)' }}
            >
              Nom *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={function (e) {
                setLastName(e.target.value);
              }}
              className="w-full h-10 rounded-lg px-3 text-sm text-white placeholder-slate-600"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
              placeholder="Dupont"
            />
          </div>

          {/* Date de naissance */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-2)' }}
            >
              Date de naissance *
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={function (e) {
                setBirthDate(e.target.value);
              }}
              className="w-full h-10 rounded-lg px-3 text-sm text-white"
              style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                colorScheme: 'dark',
              }}
            />
            {birthDate && (
              <div className="mt-2">
                <span
                  className={
                    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ' +
                    (catBadge[window.DetectionEngine.computeCategory(birthDate)] ||
                      'bg-slate-700 text-slate-400')
                  }
                >
                  {window.DetectionEngine.computeCategory(birthDate) || '—'}
                </span>
              </div>
            )}
          </div>

          {/* Position */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-2)' }}
            >
              Position
            </label>
            <select
              value={position}
              onChange={function (e) {
                setPosition(e.target.value);
              }}
              className="w-full h-10 rounded-lg px-3 text-sm text-white appearance-none"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
            >
              <option value="Meneur">Meneur</option>
              <option value="Arrière">Arrière</option>
              <option value="Ailier">Ailier</option>
              <option value="Ailier fort">Ailier fort</option>
              <option value="Pivot">Pivot</option>
            </select>
          </div>

          {/* Club */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-2)' }}
            >
              Club
            </label>
            <input
              type="text"
              value={club}
              onChange={function (e) {
                setClub(e.target.value);
              }}
              className="w-full h-10 rounded-lg px-3 text-sm text-white placeholder-slate-600"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
              placeholder="CABF"
            />
          </div>

          {/* Taille */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-2)' }}
            >
              Taille (cm)
            </label>
            <input
              type="number"
              value={height}
              onChange={function (e) { setHeight(e.target.value); }}
              className="w-full h-10 rounded-lg px-3 text-sm text-white placeholder-slate-600"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
              placeholder="175"
              min="100"
              max="220"
            />
          </div>

          {/* Source */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-2)' }}
            >
              Source *
            </label>
            <div className="flex gap-2">
              {[
                { value: 'roster', label: 'Roster' },
                { value: 'external', label: 'Externe' },
              ].map(function (opt) {
                var isActive = source === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={function () {
                      setSource(opt.value);
                    }}
                    className={
                      'flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ' +
                      (isActive ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300')
                    }
                    style={{
                      background: isActive ? 'var(--accent-ghost)' : 'var(--bg-3)',
                      border: isActive
                        ? '1px solid rgba(255,107,53,0.3)'
                        : '1px solid var(--border)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Import depuis le roster */}
          {source === 'roster' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                     style={{color: 'var(--text-2)'}}>
                Importer depuis le roster
              </label>
              {rosterLoading ? (
                <div className="text-xs text-slate-500 py-2">Chargement du roster...</div>
              ) : rosterPlayers.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">Aucun joueur dans le roster.</div>
              ) : (
                <select
                  value={selectedRoster ? selectedRoster.id : ''}
                  onChange={function(e) {
                    var pid = e.target.value;
                    var p = rosterPlayers.find(function(r) { return r.id === pid || String(r.id) === pid; });
                    if (p) {
                      setSelectedRoster(p);
                      setFirstName(p.firstName || (p.name && p.name.split(' ')[0]) || '');
                      setLastName(p.lastName || (p.name && p.name.split(' ').slice(1).join(' ')) || '');
                      if (p.birthDate) setBirthDate(p.birthDate);
                    } else {
                      setSelectedRoster(null);
                    }
                  }}
                  className="w-full h-10 rounded-lg px-3 text-sm text-white appearance-none"
                  style={{background: 'var(--bg-3)', border: '1px solid var(--border)'}}
                >
                  <option value="">— Sélectionner un joueur —</option>
                  {rosterPlayers.map(function(p) {
                    var label = (p.firstName || '') + ' ' + (p.lastName || p.name || '');
                    if (p.number) label = '#' + p.number + ' ' + label;
                    return <option key={p.id} value={p.id}>{label.trim()}</option>;
                  })}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors text-slate-400 hover:text-white"
            style={{ background: 'var(--bg-3)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
          >
            {saving ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers profil ───────────────────────────────────────────────────────────

function compressImage(file, maxSize, quality, callback) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      var w = img.width,
        h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) {
          h = Math.round((h * maxSize) / w);
          w = maxSize;
        } else {
          w = Math.round((w * maxSize) / h);
          h = maxSize;
        }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function formatDateFr(isoStr) {
  if (!isoStr) return '—';
  var parts = isoStr.split('-');
  if (parts.length < 3) return isoStr;
  return parts[2].substring(0, 2) + '/' + parts[1] + '/' + parts[0];
}

function InfoRow({ label, value }) {
  return (
    <div
      className="flex items-center px-4 py-3 gap-4"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-xs font-medium text-slate-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-slate-200 flex-1">{value}</span>
    </div>
  );
}

// ─── Helpers physique ─────────────────────────────────────────────────────────

function getInputStep(unit) {
  if (unit === 's') return '0.01';
  if (unit === 'cm') return '1';
  if (unit === 'm') return '0.01';
  if (unit === 'km/h') return '0.1';
  if (unit === 'reps') return '1';
  if (unit === 'x') return '0.05';
  if (unit === '%') return '0.1';
  return '0.1';
}

function formatDelta(delta, unit) {
  var isInt = unit === 'cm' || unit === 'reps';
  var abs = isInt
    ? Math.round(Math.abs(delta)).toString()
    : parseFloat(Math.abs(delta).toFixed(2)).toString();
  return (delta > 0 ? '+' : '-') + abs;
}

function getNextLevelHint(testId, value, category, refLevel) {
  var B = window.DETECTION_BAREMES;
  var test = B.physical[testId];
  if (!test || test.direction === 'qualitative') return null;
  if (value === '' || value == null) return null;
  var catData = test.categories[category];
  if (!catData) return null;
  var thresholds = catData[refLevel];
  if (!thresholds) return null;
  var currentLevel = window.DetectionEngine.evaluatePhysical(testId, value, category, refLevel);
  if (!currentLevel) return null;
  var levels = B.levels;
  var currentIdx = levels.indexOf(currentLevel);
  if (currentIdx <= 0) return null;
  var nextLevel = levels[currentIdx - 1];
  var t = thresholds[nextLevel];
  if (!t) return null;
  if (test.direction === 'lower_is_better') {
    if (t.max !== undefined) return '< ' + t.max + '\u00a0' + test.unit;
  } else {
    if (t.min !== undefined) return '>= ' + t.min + '\u00a0' + test.unit;
  }
  return null;
}

// ─── LevelBadge ───────────────────────────────────────────────────────────────

function LevelBadge({ level, size }) {
  var B = window.DETECTION_BAREMES;
  if (!level) return <span className="text-xs text-slate-500">—</span>;
  var label = (B.levelLabels && B.levelLabels[level]) || level;
  var padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';
  var color = levelTextColor[level] || 'text-slate-400';
  var bg = window.DetectionEngine.levelBg(level);
  return (
    <span className={'text-xs rounded font-bold ' + padding + ' ' + color + ' ' + bg}>{label}</span>
  );
}

// ─── PhysicalSummary ──────────────────────────────────────────────────────────

function PhysicalSummary({ session, category, refLevel }) {
  var tests = window.DetectionEngine.getTestsForCategory(category);
  var sum = 0,
    count = 0;
  tests.forEach(function (testId) {
    var val = session.tests[testId];
    if (val == null || val === '') return;
    var level = window.DetectionEngine.evaluatePhysical(testId, val, category, refLevel);
    if (!level) return;
    sum += window.DetectionEngine.levelToScore(level);
    count++;
  });
  var score = count > 0 ? Math.round((sum / count) * 20) : null;

  return (
    <div
      className="mt-4 rounded-xl p-4"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Score global de la session
        </span>
        <span className="text-sm font-bold text-white font-mono">
          {score !== null ? score + '/100' : '—'}
        </span>
      </div>
      {score !== null ? (
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
          <div
            className={scoreBarColor(score) + ' h-full rounded-full'}
            style={{ width: score + '%', transition: 'width 700ms cubic-bezier(0.4,0,0.2,1)' }}
          />
        </div>
      ) : null}
      <div className="text-xs text-slate-600 mt-1.5">
        {count} test{count !== 1 ? 's' : ''} évalué{count !== 1 ? 's' : ''} sur {tests.length}
      </div>
    </div>
  );
}

// ─── PhysicalGauge ────────────────────────────────────────────────────────────

function PhysicalGauge({ testId, value, category, refLevel }) {
  var E = window.DetectionEngine;
  var B = window.DETECTION_BAREMES;
  var testInfo = B.physical[testId];
  if (!testInfo) return null;

  var hasVal = value != null && value !== '';
  var level = hasVal ? E.evaluatePhysical(testId, value, category, refLevel) : null;
  var score = level ? E.levelToScore(level) * 20 : 0;

  var displayVal = hasVal
    ? testInfo.direction === 'qualitative'
      ? B.levelLabels[value] || value
      : value + '\u00a0' + testInfo.unit
    : '—';

  return (
    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">{testInfo.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white">{displayVal}</span>
          {hasVal ? <LevelBadge level={level} /> : null}
        </div>
      </div>
      {hasVal && testInfo.direction !== 'qualitative' ? (
        <div
          className="relative h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-3)' }}
        >
          {/* Zones de fond */}
          <div className="absolute inset-0 flex">
            <div className="flex-1" style={{ background: 'rgba(239,68,68,0.06)' }} />
            <div className="flex-1" style={{ background: 'rgba(245,158,11,0.06)' }} />
            <div className="flex-1" style={{ background: 'rgba(59,130,246,0.06)' }} />
            <div className="flex-1" style={{ background: 'rgba(16,185,129,0.06)' }} />
            <div className="flex-1" style={{ background: 'rgba(34,197,94,0.06)' }} />
          </div>
          {/* Barre remplie */}
          <div
            className="relative h-full rounded-full"
            style={{
              width: score + '%',
              background: levelGradient[level] || 'var(--bg-3)',
              transition: 'width 700ms cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

// ─── FitScoreBadge ────────────────────────────────────────────────────────────

function FitScoreBadge({ session, category }) {
  var regScore = window.DetectionEngine.computeFitScore(session, category, 'regional');
  var natScore = window.DetectionEngine.computeFitScore(session, category, 'national');
  if (regScore == null && natScore == null) return null;

  var label = window.DetectionEngine.fitScoreLabel(regScore || natScore);

  var fitLabelStyle =
    regScore >= 75
      ? 'bg-green-500/15 text-green-400'
      : regScore >= 60
        ? 'bg-blue-500/15 text-blue-400'
        : regScore >= 40
          ? 'bg-amber-500/15 text-amber-400'
          : 'bg-red-500/15 text-red-400';

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
    >
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-4">
        Indice d'Adéquation
      </h3>

      {regScore !== null && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-slate-500 w-16 shrink-0">Régional</span>
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--bg-3)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: regScore + '%',
                background: 'var(--accent)',
                transition: 'width 1000ms cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>
          <span
            className="text-sm font-bold font-mono w-12 text-right"
            style={{ color: 'var(--accent)' }}
          >
            {regScore}%
          </span>
          <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + fitLabelStyle}>
            {label}
          </span>
        </div>
      )}

      {natScore !== null && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-16 shrink-0">National</span>
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--bg-3)' }}
          >
            <div
              className="h-full rounded-full bg-green-500"
              style={{
                width: natScore + '%',
                transition: 'width 1000ms cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>
          <span className="text-sm font-bold font-mono w-12 text-right text-green-400">
            {natScore}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── RadarSVG (composant partagé) ─────────────────────────────────────────────
// data: [{ id, label, value (0-100), hasData }]
// fillColor/strokeColor optionnels (défaut : teal/cyan)

function RadarSVG({ data, fillColor, strokeColor, size }) {
  if (!data || data.length === 0) return null;
  var N = data.length;
  var viewSize = size || 200;
  var cx = viewSize / 2;
  var cy = viewSize / 2;
  var R = viewSize * 0.33;       // rayon données
  var labelR = viewSize * 0.46;  // rayon labels

  var fill   = fillColor   || 'rgba(20,184,166,0.18)';  // teal-500 semi-transparent
  var stroke = strokeColor || 'rgba(45,212,191,0.9)';   // teal-400

  function angle(idx) {
    return -Math.PI / 2 + (2 * Math.PI / N) * idx;
  }

  function toPoint(idx, pct) {
    var a = angle(idx);
    var r = R * (pct / 100);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function toLabelPoint(idx) {
    var a = angle(idx);
    return [cx + labelR * Math.cos(a), cy + labelR * Math.sin(a)];
  }

  var gridLevels = [20, 40, 60, 80, 100];

  var dataPoints = data.map(function (d, i) {
    return toPoint(i, d.value || 0);
  });
  var dataPolyStr = dataPoints.map(function (p) {
    return p[0].toFixed(1) + ',' + p[1].toFixed(1);
  }).join(' ');

  return (
    <svg viewBox={'0 0 ' + viewSize + ' ' + viewSize} className="w-full" style={{ maxHeight: 230 }}>
      {/* Cercles de grille concentriques */}
      {gridLevels.map(function (pct, gi) {
        var pts = data.map(function (_d, i) {
          var p = toPoint(i, pct);
          return p[0].toFixed(1) + ',' + p[1].toFixed(1);
        }).join(' ');
        return (
          <polygon
            key={gi}
            points={pts}
            fill="transparent"
            stroke="rgba(51,65,85,0.55)"
            strokeWidth="0.6"
          />
        );
      })}

      {/* Lignes des axes */}
      {data.map(function (_d, i) {
        var p = toPoint(i, 100);
        return (
          <line
            key={i}
            x1={cx.toFixed(1)} y1={cy.toFixed(1)}
            x2={p[0].toFixed(1)} y2={p[1].toFixed(1)}
            stroke="rgba(51,65,85,0.55)"
            strokeWidth="0.6"
          />
        );
      })}

      {/* Remplissage données */}
      <polygon
        points={dataPolyStr}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Points sur les axes avec données */}
      {dataPoints.map(function (p, i) {
        return data[i].hasData ? (
          <circle
            key={i}
            cx={p[0].toFixed(1)}
            cy={p[1].toFixed(1)}
            r="2.8"
            fill={stroke}
          />
        ) : null;
      })}

      {/* Labels */}
      {data.map(function (d, i) {
        var lp = toLabelPoint(i);
        return (
          <text
            key={i}
            x={lp[0].toFixed(1)}
            y={lp[1].toFixed(1)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={d.hasData ? '#e2e8f0' : '#475569'}
            fontSize={viewSize <= 200 ? '7.5' : '8'}
            fontWeight="700"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── PhysicalRadar ────────────────────────────────────────────────────────────

function PhysicalRadar({ session, category, refLevel }) {
  var data = window.DetectionEngine.getRadarData(session, category, refLevel || 'regional');
  if (!data) return null;

  var hasAnyData = data.some(function (d) { return d.hasData; });

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
    >
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">
        Profil Physique
      </h3>
      {hasAnyData ? (
        <RadarSVG data={data} />
      ) : (
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ height: 180, background: 'var(--bg-2)', border: '1px dashed var(--border)' }}
        >
          <span className="text-xs text-slate-600">Aucun test renseigné</span>
        </div>
      )}
    </div>
  );
}

// ─── GlobalRadar ──────────────────────────────────────────────────────────────

function GlobalRadar({ player }) {
  var data = window.DetectionEngine.getGlobalRadarData(player);
  var hasAnyData = data.some(function (d) { return d.hasData; });

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
    >
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">
        Radar Global
      </h3>
      {hasAnyData ? (
        <RadarSVG data={data} />
      ) : (
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ height: 180, background: 'var(--bg-2)', border: '1px dashed var(--border)' }}
        >
          <span className="text-xs text-slate-600">Aucune donnée disponible</span>
        </div>
      )}
    </div>
  );
}

// ─── SessionReadView ──────────────────────────────────────────────────────────

function SessionReadView({ session, category, refLevel }) {
  var tests = window.DetectionEngine.getTestsForCategory(category);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
    >
      {session.comment ? (
        <div
          className="px-4 py-3"
          style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-xs text-slate-400 italic">"{session.comment}"</span>
        </div>
      ) : null}
      {tests.map(function (testId) {
        var val = session.tests ? session.tests[testId] : null;
        return (
          <PhysicalGauge
            key={testId}
            testId={testId}
            value={val != null ? val : null}
            category={category}
            refLevel={refLevel}
          />
        );
      })}
    </div>
  );
}

// ─── PhysicalTestForm ─────────────────────────────────────────────────────────

function PhysicalTestForm({ category, initialSession, refLevel, onSave, onCancel }) {
  var tests = window.DetectionEngine.getTestsForCategory(category);
  var B = window.DETECTION_BAREMES;

  var [testValues, setTestValues] = React.useState(function () {
    var obj = {};
    tests.forEach(function (testId) {
      var stored = initialSession && initialSession.tests && initialSession.tests[testId];
      obj[testId] = stored != null ? String(stored) : '';
    });
    return obj;
  });
  var [sessionDate, setSessionDate] = React.useState(
    (initialSession && initialSession.date) || new Date().toISOString().substring(0, 10)
  );
  var [sessionLabel, setSessionLabel] = React.useState(
    (initialSession && initialSession.label) || ''
  );
  var [sessionComment, setSessionComment] = React.useState(
    (initialSession && initialSession.comment) || ''
  );

  function updateVal(testId, val) {
    var next = {};
    tests.forEach(function (id) {
      next[id] = testValues[id];
    });
    next[testId] = val;
    setTestValues(next);
  }

  function handleSave() {
    var cleanTests = {};
    tests.forEach(function (testId) {
      var v = testValues[testId];
      if (v !== '' && v != null) {
        var testInfo = B.physical[testId];
        if (testInfo && testInfo.direction === 'qualitative') {
          cleanTests[testId] = v;
        } else {
          var num = parseFloat(v);
          if (!isNaN(num)) cleanTests[testId] = num;
        }
      }
    });
    onSave({
      sessionId:
        (initialSession && initialSession.sessionId) || window.DetectionEngine.generateId('ps'),
      date: sessionDate,
      label: sessionLabel.trim() || 'Session',
      tests: cleanTests,
      comment: sessionComment.trim(),
    });
  }

  var inputStyle = { background: 'var(--bg-2)', border: '1px solid var(--border)' };
  var inputClass =
    'w-full h-10 rounded-lg px-3 text-white text-sm focus:outline-none transition-colors';
  var labelClass = 'block text-xs font-medium text-slate-400 mb-1';

  return (
    <div>
      {/* Métadonnées session */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className={labelClass}>Date</label>
          <input
            type="date"
            value={sessionDate}
            onChange={function (e) {
              setSessionDate(e.target.value);
            }}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Label</label>
          <input
            type="text"
            value={sessionLabel}
            onChange={function (e) {
              setSessionLabel(e.target.value);
            }}
            placeholder="Ex: Début saison"
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Tests */}
      <div className="flex flex-col gap-3 mb-4">
        {tests.map(function (testId) {
          var testInfo = B.physical[testId];
          if (!testInfo) return null;
          var val = testValues[testId];

          if (testInfo.direction === 'qualitative') {
            return (
              <div
                key={testId}
                className="rounded-xl p-3"
                style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
              >
                <div className="text-sm font-medium text-slate-300 mb-2">{testInfo.name}</div>
                <div className="flex flex-wrap gap-2">
                  {B.levels.map(function (lvl) {
                    var isActive = val === lvl;
                    return (
                      <button
                        key={lvl}
                        onClick={function () {
                          updateVal(testId, lvl);
                        }}
                        className={
                          'text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors ' +
                          (isActive
                            ? (levelTextColor[lvl] || 'text-slate-400') +
                              ' ' +
                              window.DetectionEngine.levelBg(lvl) +
                              ' border-current'
                            : 'text-slate-500 border-slate-700 hover:text-slate-300')
                        }
                        style={isActive ? {} : { background: 'var(--bg-2)' }}
                      >
                        {B.levelLabels[lvl]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          var level =
            val !== ''
              ? window.DetectionEngine.evaluatePhysical(testId, val, category, refLevel)
              : null;
          var hint = val !== '' ? getNextLevelHint(testId, val, category, refLevel) : null;

          return (
            <div
              key={testId}
              className="rounded-xl p-3"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
            >
              <div className="text-xs font-medium text-slate-400 mb-1.5">
                {testInfo.name} <span className="text-slate-600">({testInfo.unit})</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="number"
                  value={val}
                  onChange={function (e) {
                    updateVal(testId, e.target.value);
                  }}
                  step={getInputStep(testInfo.unit)}
                  min="0"
                  placeholder="—"
                  className="w-28 h-9 rounded-lg px-3 text-white text-sm font-mono focus:outline-none transition-colors"
                  style={inputStyle}
                />
                <div className="flex flex-col gap-0.5">
                  <LevelBadge level={level} />
                  {hint ? <span className="text-xs text-slate-600">{hint}</span> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Commentaire */}
      <div className="mb-5">
        <label className={labelClass}>Commentaire de session</label>
        <textarea
          value={sessionComment}
          onChange={function (e) {
            setSessionComment(e.target.value);
          }}
          rows={3}
          placeholder="Conditions, remarques..."
          className="w-full rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none transition-colors"
          style={inputStyle}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          style={{ background: 'var(--bg-3)' }}
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
        >
          Enregistrer la session
        </button>
      </div>
    </div>
  );
}

// ─── SessionComparison ────────────────────────────────────────────────────────

function SessionComparison({
  player,
  sessions,
  compareIdxA,
  compareIdxB,
  onChangeA,
  onChangeB,
  refLevel,
}) {
  var tests = window.DetectionEngine.getTestsForCategory(player.category);
  var B = window.DETECTION_BAREMES;
  var sessionA = sessions[compareIdxA] || null;
  var sessionB = sessions[compareIdxB] || null;

  var selectStyle = { background: 'var(--bg-2)', border: '1px solid var(--border)' };
  var selectClass = 'w-full rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none';

  if (compareIdxA === compareIdxB) {
    return (
      <div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Référence (ancienne)</div>
            <select
              value={compareIdxA}
              onChange={function (e) {
                onChangeA(e.target.value);
              }}
              className={selectClass}
              style={selectStyle}
            >
              {sessions.map(function (s, i) {
                return (
                  <option key={s.sessionId || i} value={i}>
                    {(s.label || 'Session') + ' — ' + formatDateFr(s.date)}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Session récente</div>
            <select
              value={compareIdxB}
              onChange={function (e) {
                onChangeB(e.target.value);
              }}
              className={selectClass}
              style={selectStyle}
            >
              {sessions.map(function (s, i) {
                return (
                  <option key={s.sessionId || i} value={i}>
                    {(s.label || 'Session') + ' — ' + formatDateFr(s.date)}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div
          className="text-center text-sm text-slate-500 py-8 rounded-xl"
          style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
        >
          Sélectionnez deux sessions différentes pour comparer.
        </div>
      </div>
    );
  }

  var safeA = sessionA && sessionA.tests ? sessionA : { tests: {} };
  var safeB = sessionB && sessionB.tests ? sessionB : { tests: {} };
  var comparison = window.DetectionEngine.comparePhysicalSessions(
    safeA,
    safeB,
    player.category,
    refLevel
  );
  var hasData = Object.keys(comparison).length > 0;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Référence (ancienne)</div>
          <select
            value={compareIdxA}
            onChange={function (e) {
              onChangeA(e.target.value);
            }}
            className={selectClass}
            style={selectStyle}
          >
            {sessions.map(function (s, i) {
              return (
                <option key={s.sessionId || i} value={i}>
                  {(s.label || 'Session') + ' — ' + formatDateFr(s.date)}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Session récente</div>
          <select
            value={compareIdxB}
            onChange={function (e) {
              onChangeB(e.target.value);
            }}
            className={selectClass}
            style={selectStyle}
          >
            {sessions.map(function (s, i) {
              return (
                <option key={s.sessionId || i} value={i}>
                  {(s.label || 'Session') + ' — ' + formatDateFr(s.date)}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
      >
        <div
          className="grid grid-cols-4 gap-2 px-4 py-2"
          style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-xs font-semibold text-slate-400">Test</div>
          <div className="text-xs font-semibold text-slate-400 truncate">
            {(sessionA && sessionA.label) || 'Ancienne'}
          </div>
          <div className="text-xs font-semibold text-slate-400 truncate">
            {(sessionB && sessionB.label) || 'Récente'}
          </div>
          <div className="text-xs font-semibold text-slate-400">Évolution</div>
        </div>
        {tests.map(function (testId, i) {
          var testInfo = B.physical[testId];
          if (!testInfo || testInfo.direction === 'qualitative') return null;
          var data = comparison[testId];
          if (!data) return null;
          var deltaStr = formatDelta(data.delta, testInfo.unit);
          var arrow = data.improved ? '↑' : '↓';
          var arrowColor = data.improved ? 'text-green-400' : 'text-red-400';
          return (
            <div
              key={testId}
              className="grid grid-cols-4 gap-2 px-4 py-3 items-start"
              style={{ borderBottom: i < tests.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div className="text-xs text-slate-400 leading-tight">{testInfo.name}</div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-white font-mono">
                  {data.oldVal + '\u00a0' + testInfo.unit}
                </span>
                {data.oldLevel ? <LevelBadge level={data.oldLevel} size="sm" /> : null}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-white font-mono">
                  {data.newVal + '\u00a0' + testInfo.unit}
                </span>
                {data.newLevel ? <LevelBadge level={data.newLevel} size="sm" /> : null}
              </div>
              <div className={'flex items-center gap-1 font-bold ' + arrowColor}>
                <span className="text-sm leading-none">{arrow}</span>
                <span className="text-xs font-mono">{deltaStr + '\u00a0' + testInfo.unit}</span>
              </div>
            </div>
          );
        })}
        {!hasData && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Aucune donnée commune entre ces deux sessions.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PhysicalTab ──────────────────────────────────────────────────────────────

function PhysicalTab({ player }) {
  var [selectedSessionIdx, setSelectedSessionIdx] = React.useState(0);
  var [creating, setCreating] = React.useState(false);
  var [editingSession, setEditingSession] = React.useState(false);
  var [comparing, setComparing] = React.useState(false);
  var [compareIdxA, setCompareIdxA] = React.useState(1);
  var [compareIdxB, setCompareIdxB] = React.useState(0);
  var [refLevel, setRefLevel] = React.useState('regional');

  var sessions = player.physicalSessions || [];

  React.useEffect(
    function () {
      if (sessions.length > 0 && selectedSessionIdx >= sessions.length) {
        setSelectedSessionIdx(0);
      }
    },
    [sessions.length]
  );

  var selectedSession = sessions[selectedSessionIdx] || null;

  var refLevels = [
    { id: 'departemental', label: 'Départemental' },
    { id: 'regional', label: 'Régional' },
    { id: 'national', label: 'National' },
  ];

  var refLevelBar = (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-xs text-slate-400 shrink-0">Référence :</span>
      {refLevels.map(function (rl) {
        var isActive = refLevel === rl.id;
        return (
          <button
            key={rl.id}
            onClick={function () {
              setRefLevel(rl.id);
            }}
            className={
              'text-xs px-2.5 py-1 rounded-full font-medium transition-colors ' +
              (isActive ? 'text-white' : 'text-slate-400 hover:text-white')
            }
            style={isActive ? { background: 'var(--accent)' } : { background: 'var(--bg-3)' }}
          >
            {rl.label}
          </button>
        );
      })}
    </div>
  );

  function handleSaveSession(newSession) {
    var db = window.detectionDb;
    if (!db) {
      alert('Firebase non connecté');
      return;
    }

    var updatedSessions = (player.physicalSessions || []).slice();
    if (editingSession) {
      var found = false;
      for (var i = 0; i < updatedSessions.length; i++) {
        if (updatedSessions[i].sessionId === newSession.sessionId) {
          updatedSessions[i] = newSession;
          found = true;
          break;
        }
      }
      if (!found) updatedSessions.push(newSession);
    } else {
      updatedSessions.unshift(newSession);
    }
    updatedSessions.sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
    });

    var wk = sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
    db.collection('detection')
      .doc(player.id)
      .update({
        physicalSessions: updatedSessions,
        updatedAt: new Date().toISOString(),
        _wk: wk,
      })
      .then(function () {
        setCreating(false);
        setEditingSession(false);
        setSelectedSessionIdx(0);
      })
      .catch(function (err) {
        console.error('[Detection] Save session error:', err);
        alert('Erreur de sauvegarde');
      });
  }

  function handleDeleteSession() {
    if (!selectedSession) return;
    var label = selectedSession.label || 'cette session';
    if (!window.confirm('Supprimer définitivement la session "' + label + '" ?')) return;
    var db = window.detectionDb;
    if (!db) return;
    var updatedSessions = (player.physicalSessions || []).filter(function (s) {
      return s.sessionId !== selectedSession.sessionId;
    });
    var wk = sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
    db.collection('detection')
      .doc(player.id)
      .update({
        physicalSessions: updatedSessions,
        updatedAt: new Date().toISOString(),
        _wk: wk,
      })
      .then(function () {
        setSelectedSessionIdx(0);
        setComparing(false);
      })
      .catch(function (err) {
        console.error('[Detection] Delete session error:', err);
        alert('Erreur de suppression');
      });
  }

  if (creating || editingSession) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={function () {
              setCreating(false);
              setEditingSession(false);
            }}
            className="text-slate-400 hover:text-white text-lg transition-colors"
          >
            ←
          </button>
          <h3 className="text-sm font-semibold text-white">
            {editingSession ? 'Modifier la session' : 'Nouvelle session de tests'}
          </h3>
        </div>
        {refLevelBar}
        <PhysicalTestForm
          category={player.category}
          initialSession={editingSession ? selectedSession : null}
          refLevel={refLevel}
          onSave={handleSaveSession}
          onCancel={function () {
            setCreating(false);
            setEditingSession(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      {refLevelBar}

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <div className="text-sm font-medium mb-4">Aucune session de tests physiques.</div>
          <button
            onClick={function () {
              setCreating(true);
            }}
            className="text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
          >
            + Première session
          </button>
        </div>
      ) : (
        <div>
          {/* Sélecteur de session */}
          <div className="flex items-center gap-2 mb-3">
            <select
              value={selectedSessionIdx}
              onChange={function (e) {
                setSelectedSessionIdx(parseInt(e.target.value));
                setComparing(false);
              }}
              className="flex-1 min-w-0 h-10 rounded-lg px-3 text-sm text-white focus:outline-none"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
            >
              {sessions.map(function (s, i) {
                return (
                  <option key={s.sessionId || i} value={i}>
                    {(s.label || 'Session') + ' — ' + formatDateFr(s.date)}
                  </option>
                );
              })}
            </select>
            <button
              onClick={function () {
                setCreating(true);
                setComparing(false);
              }}
              className="text-sm font-semibold rounded-lg px-3 py-2 transition-colors shrink-0"
              style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
            >
              + Nouvelle
            </button>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={function () {
                setEditingSession(true);
                setComparing(false);
              }}
              className="text-xs rounded-lg px-3 py-1.5 transition-colors text-slate-300 hover:text-white"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
            >
              Modifier
            </button>
            {sessions.length >= 2 && (
              <button
                onClick={function () {
                  var next = !comparing;
                  setComparing(next);
                  if (next) {
                    setCompareIdxA(sessions.length > 1 ? sessions.length - 1 : 1);
                    setCompareIdxB(0);
                  }
                }}
                className={
                  'text-xs rounded-lg px-3 py-1.5 transition-colors border ' +
                  (comparing ? 'text-orange-400' : 'text-slate-300 hover:text-white')
                }
                style={
                  comparing
                    ? {
                        background: 'rgba(255,107,53,0.12)',
                        border: '1px solid rgba(255,107,53,0.2)',
                      }
                    : { background: 'var(--bg-2)', border: '1px solid var(--border)' }
                }
              >
                {comparing ? 'Fermer comparaison' : 'Comparer'}
              </button>
            )}
            <button
              onClick={handleDeleteSession}
              className="ml-auto text-xs rounded-lg px-3 py-1.5 transition-colors text-red-500/50 hover:text-red-500"
              style={{ border: '1px solid rgba(239,68,68,0.2)' }}
            >
              Supprimer
            </button>
          </div>

          {/* Contenu principal */}
          {comparing && sessions.length >= 2 ? (
            <SessionComparison
              player={player}
              sessions={sessions}
              compareIdxA={compareIdxA}
              compareIdxB={compareIdxB}
              onChangeA={function (v) {
                setCompareIdxA(parseInt(v));
              }}
              onChangeB={function (v) {
                setCompareIdxB(parseInt(v));
              }}
              refLevel={refLevel}
            />
          ) : selectedSession ? (
            <div>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <FitScoreBadge
                    session={selectedSession}
                    category={player.category}
                    refLevel={refLevel}
                  />
                </div>
                <div className="flex-1">
                  <PhysicalRadar
                    session={selectedSession}
                    category={player.category}
                    refLevel={refLevel}
                  />
                </div>
              </div>
              <SessionReadView
                session={selectedSession}
                category={player.category}
                refLevel={refLevel}
              />
              <PhysicalSummary
                session={selectedSession}
                category={player.category}
                refLevel={refLevel}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── CriterionEval ────────────────────────────────────────────────────────────

function CriterionEval({
  criterionId,
  domain,
  category,
  currentLevel,
  currentComment,
  onLevelChange,
  onCommentChange,
  editing,
}) {
  var [hoveredLevel, setHoveredLevel] = React.useState(null);

  var B = window.DETECTION_BAREMES;
  var descriptors = window.DETECTION_DESCRIPTORS || {};

  var domainDef = B[domain];
  var criterionDef = domainDef && domainDef[criterionId];
  if (!criterionDef) return null;

  var descData = descriptors[domain] && descriptors[domain][criterionId];
  var catDesc = descData && descData[category];

  var displayName = criterionDef.name;
  if (category === 'U11' && catDesc && catDesc._replacement) {
    displayName = catDesc._replacement;
  }

  function getDescriptor(level) {
    if (!catDesc || !level) return null;
    return catDesc[level] || null;
  }

  var levels = B.levels;
  var levelLabels = B.levelLabels;
  var activeDisplayLevel = editing && hoveredLevel ? hoveredLevel : currentLevel;

  // ── Mode lecture ──
  if (!editing) {
    var descriptor = currentLevel ? getDescriptor(currentLevel) : null;
    return (
      <div className="py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-sm font-semibold text-white">{displayName}</span>
            <span className="ml-2 text-xs text-slate-600">{criterionId}</span>
          </div>
          {currentLevel ? (
            <span
              className={
                'text-xs font-bold px-2.5 py-1 rounded-md ' +
                (levelSelectedStyle[currentLevel] || '')
              }
            >
              {levelLabels[currentLevel] || currentLevel}
            </span>
          ) : (
            <span className="text-xs text-slate-600">—</span>
          )}
        </div>
        {currentLevel && descriptor && (
          <p className="text-xs text-slate-500 italic leading-relaxed">{descriptor}</p>
        )}
        {!currentLevel && <p className="text-xs text-slate-600">Non évalué</p>}
        {currentComment && (
          <p
            className="mt-2 text-xs text-slate-400 pl-3"
            style={{ borderLeft: '2px solid rgba(255,107,53,0.2)' }}
          >
            {currentComment}
          </p>
        )}
      </div>
    );
  }

  // ── Mode édition ──
  var activeDesc = getDescriptor(activeDisplayLevel);

  return (
    <div className="py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-semibold text-white">{displayName}</span>
        <span className="text-xs text-slate-600">{criterionId}</span>
      </div>

      {/* Boutons niveaux */}
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {levels.map(function (lvl) {
          var isSelected = currentLevel === lvl;
          return (
            <button
              key={lvl}
              onClick={function () {
                onLevelChange(criterionId, isSelected ? null : lvl);
              }}
              onMouseEnter={function () {
                setHoveredLevel(lvl);
              }}
              onMouseLeave={function () {
                setHoveredLevel(null);
              }}
              className={
                'flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ' +
                (isSelected ? levelSelectedStyle[lvl] || '' : 'text-slate-600 hover:text-slate-300')
              }
              style={isSelected ? {} : { background: 'var(--bg-3)' }}
            >
              {levelShortLabels[lvl]}
            </button>
          );
        })}
        {currentLevel && (
          <button
            onClick={function () {
              onLevelChange(criterionId, null);
            }}
            className="text-xs px-2 py-1 rounded text-slate-600 hover:text-slate-400 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Descripteur au hover / sélection */}
      {(hoveredLevel || currentLevel) && (
        <div
          className="mt-2 mb-2.5 px-3 py-2 rounded-lg min-h-8"
          style={{ background: 'var(--bg-3)' }}
        >
          {activeDesc ? (
            <p className="text-xs text-slate-400 italic">{activeDesc}</p>
          ) : (
            <p className="text-xs text-slate-600">—</p>
          )}
        </div>
      )}

      {/* Commentaire coach */}
      <textarea
        value={currentComment}
        onChange={function (e) {
          onCommentChange(criterionId, e.target.value);
        }}
        rows={2}
        placeholder="Commentaire coach (optionnel)..."
        className="w-full rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 resize-none focus:outline-none transition-colors"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
      />
    </div>
  );
}

// ─── TechnicalTab ─────────────────────────────────────────────────────────────

function TechnicalTab({ player }) {
  var B = window.DETECTION_BAREMES;
  var technicalCriteria = Object.keys(B.technical);

  var [editing, setEditing] = React.useState(false);
  var [evaluations, setEvaluations] = React.useState(function () {
    return player.technical && player.technical.evaluations ? player.technical.evaluations : [];
  });
  var [globalComment, setGlobalComment] = React.useState(function () {
    return (player.technical && player.technical.comment) || '';
  });

  function getEval(criterionId) {
    return (
      evaluations.find(function (e) {
        return e.criterionId === criterionId;
      }) || null
    );
  }

  function handleLevelChange(criterionId, level) {
    setEvaluations(function (prev) {
      var found = false;
      var updated = prev.map(function (e) {
        if (e.criterionId === criterionId) {
          found = true;
          return { criterionId: e.criterionId, level: level, comment: e.comment || '' };
        }
        return e;
      });
      if (!found) return updated.concat([{ criterionId: criterionId, level: level, comment: '' }]);
      return updated;
    });
  }

  function handleCommentChange(criterionId, comment) {
    setEvaluations(function (prev) {
      var found = false;
      var updated = prev.map(function (e) {
        if (e.criterionId === criterionId) {
          found = true;
          return { criterionId: e.criterionId, level: e.level || null, comment: comment };
        }
        return e;
      });
      if (!found)
        return updated.concat([{ criterionId: criterionId, level: null, comment: comment }]);
      return updated;
    });
  }

  function handleCancel() {
    setEvaluations(
      player.technical && player.technical.evaluations ? player.technical.evaluations : []
    );
    setGlobalComment((player.technical && player.technical.comment) || '');
    setEditing(false);
  }

  function handleSave() {
    var db = window.detectionDb;
    if (!db) {
      alert('Firebase non connecté');
      return;
    }
    var wk = sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
    db.collection('detection')
      .doc(player.id)
      .update({
        technical: {
          date: new Date().toISOString().split('T')[0],
          evaluations: evaluations,
          comment: globalComment.trim(),
        },
        updatedAt: new Date().toISOString(),
        _wk: wk,
      })
      .then(function () {
        setEditing(false);
      })
      .catch(function (err) {
        console.error('[Detection] Save technical error:', err);
        alert('Erreur de sauvegarde');
      });
  }

  var scoreSum = 0,
    scoreCount = 0;
  evaluations.forEach(function (ev) {
    if (ev.level) {
      scoreSum += window.DetectionEngine.levelToScore(ev.level);
      scoreCount++;
    }
  });
  var score = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 20) : null;
  var lastDate = player.technical && player.technical.date ? player.technical.date : null;

  return (
    <div>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <div className="text-sm font-semibold text-white">Évaluation technique</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {lastDate
              ? 'Dernière évaluation : ' + formatDateFr(lastDate)
              : 'Aucune évaluation enregistrée'}
          </div>
        </div>
        {!editing && (
          <button
            onClick={function () {
              setEditing(true);
            }}
            className="text-sm rounded-lg px-3 py-1.5 transition-colors text-slate-300 hover:text-white"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
          >
            Modifier
          </button>
        )}
      </div>

      {/* Critères */}
      <div className="px-4">
        {technicalCriteria.map(function (cId) {
          var ev = getEval(cId);
          return (
            <CriterionEval
              key={cId}
              criterionId={cId}
              domain="technical"
              category={player.category}
              currentLevel={ev ? ev.level : null}
              currentComment={ev ? ev.comment || '' : ''}
              onLevelChange={handleLevelChange}
              onCommentChange={handleCommentChange}
              editing={editing}
            />
          );
        })}
      </div>

      {/* Commentaire global */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
          Commentaire global
        </div>
        {editing ? (
          <textarea
            value={globalComment}
            onChange={function (e) {
              setGlobalComment(e.target.value);
            }}
            rows={3}
            placeholder="Synthèse technique de la joueuse..."
            className="w-full rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none transition-colors"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
          />
        ) : globalComment ? (
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{globalComment}</p>
        ) : (
          <p className="text-xs text-slate-600">—</p>
        )}
      </div>

      {/* Score */}
      {score !== null && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Score technique
            </span>
            <span className="text-sm font-bold text-white font-mono">{score}/100</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
            <div
              className={scoreBarColor(score) + ' h-full rounded-full'}
              style={{ width: score + '%', transition: 'width 700ms cubic-bezier(0.4,0,0.2,1)' }}
            />
          </div>
        </div>
      )}

      {/* Boutons édition */}
      {editing && (
        <div
          className="px-4 pb-6 pt-3 flex gap-3 justify-end"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            style={{ background: 'var(--bg-3)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
          >
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TacticalTab ──────────────────────────────────────────────────────────────

function TacticalTab({ player }) {
  var B = window.DETECTION_BAREMES;

  var tacticalCriteriaToShow = Object.keys(B.tactical).filter(function (cId) {
    var def = B.tactical[cId];
    var isAvailable = def.availableFor.indexOf(player.category) !== -1;
    var hasReplacement = player.category === 'U11' && !!def.u11Replacement;
    return isAvailable || hasReplacement;
  });

  var [editing, setEditing] = React.useState(false);
  var [evaluations, setEvaluations] = React.useState(function () {
    return player.tactical && player.tactical.evaluations ? player.tactical.evaluations : [];
  });
  var [globalComment, setGlobalComment] = React.useState(function () {
    return (player.tactical && player.tactical.comment) || '';
  });

  function getEval(criterionId) {
    return (
      evaluations.find(function (e) {
        return e.criterionId === criterionId;
      }) || null
    );
  }

  function handleLevelChange(criterionId, level) {
    setEvaluations(function (prev) {
      var found = false;
      var updated = prev.map(function (e) {
        if (e.criterionId === criterionId) {
          found = true;
          return { criterionId: e.criterionId, level: level, comment: e.comment || '' };
        }
        return e;
      });
      if (!found) return updated.concat([{ criterionId: criterionId, level: level, comment: '' }]);
      return updated;
    });
  }

  function handleCommentChange(criterionId, comment) {
    setEvaluations(function (prev) {
      var found = false;
      var updated = prev.map(function (e) {
        if (e.criterionId === criterionId) {
          found = true;
          return { criterionId: e.criterionId, level: e.level || null, comment: comment };
        }
        return e;
      });
      if (!found)
        return updated.concat([{ criterionId: criterionId, level: null, comment: comment }]);
      return updated;
    });
  }

  function handleCancel() {
    setEvaluations(
      player.tactical && player.tactical.evaluations ? player.tactical.evaluations : []
    );
    setGlobalComment((player.tactical && player.tactical.comment) || '');
    setEditing(false);
  }

  function handleSave() {
    var db = window.detectionDb;
    if (!db) {
      alert('Firebase non connecté');
      return;
    }
    var wk = sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
    db.collection('detection')
      .doc(player.id)
      .update({
        tactical: {
          date: new Date().toISOString().split('T')[0],
          evaluations: evaluations,
          comment: globalComment.trim(),
        },
        updatedAt: new Date().toISOString(),
        _wk: wk,
      })
      .then(function () {
        setEditing(false);
      })
      .catch(function (err) {
        console.error('[Detection] Save tactical error:', err);
        alert('Erreur de sauvegarde');
      });
  }

  var scoreSum = 0,
    scoreCount = 0;
  evaluations.forEach(function (ev) {
    if (ev.level) {
      scoreSum += window.DetectionEngine.levelToScore(ev.level);
      scoreCount++;
    }
  });
  var score = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 20) : null;
  var lastDate = player.tactical && player.tactical.date ? player.tactical.date : null;

  return (
    <div>
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <div className="text-sm font-semibold text-white">Évaluation tactique</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {lastDate
              ? 'Dernière évaluation : ' + formatDateFr(lastDate)
              : 'Aucune évaluation enregistrée'}
          </div>
        </div>
        {!editing && (
          <button
            onClick={function () {
              setEditing(true);
            }}
            className="text-sm rounded-lg px-3 py-1.5 transition-colors text-slate-300 hover:text-white"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
          >
            Modifier
          </button>
        )}
      </div>

      <div className="px-4">
        {tacticalCriteriaToShow.map(function (cId) {
          var ev = getEval(cId);
          return (
            <CriterionEval
              key={cId}
              criterionId={cId}
              domain="tactical"
              category={player.category}
              currentLevel={ev ? ev.level : null}
              currentComment={ev ? ev.comment || '' : ''}
              onLevelChange={handleLevelChange}
              onCommentChange={handleCommentChange}
              editing={editing}
            />
          );
        })}
      </div>

      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
          Commentaire global
        </div>
        {editing ? (
          <textarea
            value={globalComment}
            onChange={function (e) {
              setGlobalComment(e.target.value);
            }}
            rows={3}
            placeholder="Synthèse tactique de la joueuse..."
            className="w-full rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none transition-colors"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
          />
        ) : globalComment ? (
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{globalComment}</p>
        ) : (
          <p className="text-xs text-slate-600">—</p>
        )}
      </div>

      {score !== null && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Score tactique
            </span>
            <span className="text-sm font-bold text-white font-mono">{score}/100</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
            <div
              className={scoreBarColor(score) + ' h-full rounded-full'}
              style={{ width: score + '%', transition: 'width 700ms cubic-bezier(0.4,0,0.2,1)' }}
            />
          </div>
        </div>
      )}

      {editing && (
        <div
          className="px-4 pb-6 pt-3 flex gap-3 justify-end"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            style={{ background: 'var(--bg-3)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
          >
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MentalTab ────────────────────────────────────────────────────────────────

function MentalTab({ player }) {
  var B = window.DETECTION_BAREMES;
  var mentalCriteria = Object.keys(B.mental);

  var [editing, setEditing] = React.useState(false);
  var [evaluations, setEvaluations] = React.useState(function () {
    return player.mental && player.mental.evaluations ? player.mental.evaluations : [];
  });
  var [globalComment, setGlobalComment] = React.useState(function () {
    return (player.mental && player.mental.comment) || '';
  });

  function getEval(criterionId) {
    return evaluations.find(function (e) { return e.criterionId === criterionId; }) || null;
  }

  function handleLevelChange(criterionId, level) {
    setEvaluations(function (prev) {
      var found = false;
      var updated = prev.map(function (e) {
        if (e.criterionId === criterionId) {
          found = true;
          return { criterionId: e.criterionId, level: level, comment: e.comment || '' };
        }
        return e;
      });
      if (!found) return updated.concat([{ criterionId: criterionId, level: level, comment: '' }]);
      return updated;
    });
  }

  function handleCommentChange(criterionId, comment) {
    setEvaluations(function (prev) {
      var found = false;
      var updated = prev.map(function (e) {
        if (e.criterionId === criterionId) {
          found = true;
          return { criterionId: e.criterionId, level: e.level || null, comment: comment };
        }
        return e;
      });
      if (!found) return updated.concat([{ criterionId: criterionId, level: null, comment: comment }]);
      return updated;
    });
  }

  function handleCancel() {
    setEvaluations(player.mental && player.mental.evaluations ? player.mental.evaluations : []);
    setGlobalComment((player.mental && player.mental.comment) || '');
    setEditing(false);
  }

  function handleSave() {
    var db = window.detectionDb;
    if (!db) { alert('Firebase non connecté'); return; }
    var wk = sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
    db.collection('detection').doc(player.id).update({
      mental: {
        date: new Date().toISOString().split('T')[0],
        evaluations: evaluations,
        comment: globalComment.trim(),
      },
      updatedAt: new Date().toISOString(),
      _wk: wk,
    }).then(function () {
      setEditing(false);
    }).catch(function (err) {
      console.error('[Detection] Save mental error:', err);
      alert('Erreur de sauvegarde');
    });
  }

  var scoreSum = 0, scoreCount = 0;
  evaluations.forEach(function (ev) {
    if (ev.level) { scoreSum += window.DetectionEngine.levelToScore(ev.level); scoreCount++; }
  });
  var score = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 20) : null;
  var lastDate = player.mental && player.mental.date ? player.mental.date : null;

  return (
    <div>
      <div className="px-4 py-3 flex items-center justify-between"
           style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="text-sm font-semibold text-white">Évaluation mentale</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {lastDate ? 'Dernière évaluation : ' + formatDateFr(lastDate) : 'Aucune évaluation enregistrée'}
          </div>
        </div>
        {!editing && (
          <button
            onClick={function () { setEditing(true); }}
            className="text-sm rounded-lg px-3 py-1.5 transition-colors text-slate-300 hover:text-white"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
          >
            Modifier
          </button>
        )}
      </div>

      <div className="px-4">
        {mentalCriteria.map(function (cId) {
          var ev = getEval(cId);
          return (
            <CriterionEval
              key={cId}
              criterionId={cId}
              domain="mental"
              category={player.category}
              currentLevel={ev ? ev.level : null}
              currentComment={ev ? ev.comment || '' : ''}
              onLevelChange={handleLevelChange}
              onCommentChange={handleCommentChange}
              editing={editing}
            />
          );
        })}
      </div>

      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
          Commentaire global
        </div>
        {editing ? (
          <textarea
            value={globalComment}
            onChange={function (e) { setGlobalComment(e.target.value); }}
            rows={3}
            placeholder="Synthèse mentale de la joueuse..."
            className="w-full rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none transition-colors"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
          />
        ) : globalComment ? (
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{globalComment}</p>
        ) : (
          <p className="text-xs text-slate-600">—</p>
        )}
      </div>

      {score !== null && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Score mental
            </span>
            <span className="text-sm font-bold text-white font-mono">{score}/100</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
            <div
              className={scoreBarColor(score) + ' h-full rounded-full'}
              style={{ width: score + '%', transition: 'width 700ms cubic-bezier(0.4,0,0.2,1)' }}
            />
          </div>
        </div>
      )}

      {editing && (
        <div className="px-4 pb-6 pt-3 flex gap-3 justify-end"
             style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            style={{ background: 'var(--bg-3)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
          >
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ScoutNotesSection ────────────────────────────────────────────────────────

function ScoutNotesSection({ player }) {
  var [editing, setEditing] = React.useState(false);
  var [notes, setNotes] = React.useState(function () {
    return player.scoutNotes || '';
  });
  var [saving, setSaving] = React.useState(false);

  function handleSave() {
    var db = window.detectionDb;
    if (!db) { alert('Firebase non connecté'); return; }
    setSaving(true);
    var wk = sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
    db.collection('detection').doc(player.id).update({
      scoutNotes: notes.trim(),
      updatedAt: new Date().toISOString(),
      _wk: wk,
    }).then(function () {
      setSaving(false);
      setEditing(false);
    }).catch(function (err) {
      console.error('[Detection] Save scoutNotes error:', err);
      setSaving(false);
      alert('Erreur de sauvegarde');
    });
  }

  function handleCancel() {
    setNotes(player.scoutNotes || '');
    setEditing(false);
  }

  return (
    <div className="rounded-xl overflow-hidden"
         style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-5 py-4"
           style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Notes Scout</span>
        {!editing && (
          <button
            onClick={function () { setEditing(true); }}
            className="text-xs rounded-lg px-3 py-1.5 transition-colors text-slate-400 hover:text-white"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
          >
            Éditer
          </button>
        )}
      </div>
      <div className="px-5 py-4">
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={function (e) { setNotes(e.target.value); }}
              rows={5}
              placeholder="Observations, contexte du match, potentiel détecté..."
              className="w-full rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none transition-colors"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                style={{ background: 'var(--bg-3)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : notes ? (
          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{notes}</p>
        ) : (
          <p className="text-sm text-slate-600 italic">
            Aucune note scout. Cliquez sur Éditer pour ajouter des observations.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ProfileTab ───────────────────────────────────────────────────────────────

function ProfileTab({ player, onBack }) {
  var [editing, setEditing] = React.useState(false);
  var [editFirstName, setEditFirstName] = React.useState(player.firstName || '');
  var [editLastName, setEditLastName] = React.useState(player.lastName || '');
  var [editBirthDate, setEditBirthDate] = React.useState(player.birthDate || '');
  var [editPosition, setEditPosition] = React.useState(player.position || 'Meneur');
  var [editClub, setEditClub] = React.useState(player.club || '');
  var [editSource, setEditSource] = React.useState(player.source || 'Externe');
  var [editPhoto, setEditPhoto] = React.useState(player.photo || null);
  var [editComment, setEditComment] = React.useState(player.generalComment || '');
  var [saving, setSaving] = React.useState(false);
  var fileInputRef = React.useRef(null);

  var editCategory = React.useMemo(
    function () {
      return editBirthDate ? window.DetectionEngine.computeCategory(editBirthDate) : null;
    },
    [editBirthDate]
  );

  var inputStyle = { background: 'var(--bg-3)', border: '1px solid var(--border)' };
  var inputClass =
    'w-full h-10 rounded-lg px-3 text-white text-sm focus:outline-none transition-colors';
  var labelClass = 'block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider';

  function handleCancel() {
    setEditFirstName(player.firstName || '');
    setEditLastName(player.lastName || '');
    setEditBirthDate(player.birthDate || '');
    setEditPosition(player.position || 'Meneur');
    setEditClub(player.club || '');
    setEditSource(player.source || 'Externe');
    setEditPhoto(player.photo || null);
    setEditComment(player.generalComment || '');
    setEditing(false);
  }

  function handleSave() {
    if (saving) return;
    var db = window.detectionDb;
    if (!db) {
      alert('Firebase non connecté');
      return;
    }
    var category = window.DetectionEngine.computeCategory(editBirthDate);
    if (!category) {
      alert('Date de naissance invalide');
      return;
    }
    setSaving(true);
    var wk = sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
    db.collection('detection')
      .doc(player.id)
      .update({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        birthDate: editBirthDate,
        category: category,
        position: editPosition,
        club: editClub.trim(),
        source: editSource,
        photo: editPhoto,
        generalComment: editComment.trim(),
        updatedAt: new Date().toISOString(),
        _wk: wk,
      })
      .then(function () {
        setEditing(false);
        setSaving(false);
      })
      .catch(function (err) {
        console.error('[Detection] Update error:', err);
        alert('Erreur de sauvegarde');
        setSaving(false);
      });
  }

  function handleDelete() {
    var name = ((player.firstName || '') + ' ' + (player.lastName || '')).trim();
    if (!window.confirm('Supprimer définitivement la fiche de ' + name + ' ?')) return;
    var db = window.detectionDb;
    if (!db) return;
    db.collection('detection')
      .doc(player.id)
      .delete()
      .then(function () {
        onBack();
      })
      .catch(function (err) {
        console.error('[Detection] Delete error:', err);
        alert('Erreur de suppression');
      });
  }

  function handleFileChange(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    compressImage(file, 300, 0.7, function (dataUrl) {
      if (dataUrl.length > 200000) {
        alert('Image trop volumineuse après compression.');
        return;
      }
      setEditPhoto(dataUrl);
    });
    e.target.value = '';
  }

  // ── MODE LECTURE ──
  if (!editing) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={function () {
              setEditing(true);
            }}
            className="text-sm rounded-lg px-3 py-1.5 transition-colors text-slate-300 hover:text-white"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
          >
            Modifier
          </button>
        </div>

        {/* Avatar grand */}
        <div className="flex flex-col items-center mb-6">
          {player.photo ? (
            <img src={player.photo} className="h-20 w-20 rounded-full object-cover" alt="" />
          ) : (
            <div
              className="h-20 w-20 flex items-center justify-center rounded-full text-2xl font-bold"
              style={{
                background:
                  {
                    U11: 'linear-gradient(135deg,#7c3aed22,#7c3aed44)',
                    U13: 'linear-gradient(135deg,#3b82f622,#3b82f644)',
                    U15: 'linear-gradient(135deg,#f59e0b22,#f59e0b44)',
                    U18: 'linear-gradient(135deg,#FF6B3522,#FF6B3544)',
                  }[player.category] || 'var(--bg-3)',
                color: 'var(--text-2)',
              }}
            >
              {(
                ((player.firstName || '')[0] || '') + ((player.lastName || '')[0] || '')
              ).toUpperCase() || '?'}
            </div>
          )}
          <h2 className="mt-3 text-lg font-bold text-white">
            {player.firstName} {player.lastName}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={categoryBadgeClass(player.category)}>{player.category}</span>
            {player.position && <span className="text-xs text-slate-500">{player.position}</span>}
            <span
              className={
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ' +
                (srcBadge[player.source] || srcBadge.Externe)
              }
            >
              {player.source || 'Externe'}
            </span>
          </div>
        </div>

        {/* Infos */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
        >
          <InfoRow label="Date de naissance" value={formatDateFr(player.birthDate)} />
          <InfoRow label="Club" value={player.club || '—'} />
          <div className="px-4 py-3">
            <span className="text-xs font-medium text-slate-500 w-36 inline-block">Créée le</span>
            <span className="text-sm text-slate-200">
              {player.createdAt ? formatDateFr(player.createdAt.substring(0, 10)) : '—'}
            </span>
          </div>
        </div>

        {player.generalComment && (
          <div
            className="mt-4 rounded-xl p-4"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
              Commentaire général
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{player.generalComment}</p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-sm text-red-500/50 hover:text-red-500 transition-colors"
          >
            <DIcon path={DetectionIcons.Trash} className="h-4 w-4" />
            Supprimer cette fiche
          </button>
        </div>
      </div>
    );
  }

  // ── MODE ÉDITION ──
  var editInitials =
    (((editFirstName || '')[0] || '') + ((editLastName || '')[0] || '')).toUpperCase() || '?';

  return (
    <div className="p-6 max-w-lg mx-auto">
      {/* Avatar + changement photo */}
      <div className="flex flex-col items-center mb-6">
        <div
          className="cursor-pointer group relative"
          onClick={function () {
            fileInputRef.current && fileInputRef.current.click();
          }}
        >
          {editPhoto ? (
            <img src={editPhoto} className="h-20 w-20 rounded-full object-cover" alt="" />
          ) : (
            <div
              className="h-20 w-20 flex items-center justify-center rounded-full text-2xl font-bold"
              style={{ background: 'var(--bg-3)', color: 'var(--text-2)' }}
            >
              {editInitials}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <DIcon path={DetectionIcons.Camera} className="h-5 w-5 text-white" />
          </div>
        </div>
        <button
          type="button"
          onClick={function () {
            fileInputRef.current && fileInputRef.current.click();
          }}
          className="mt-2 text-xs text-slate-400 hover:text-orange-400 transition-colors"
        >
          Changer la photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelClass}>Prénom *</label>
            <input
              type="text"
              value={editFirstName}
              onChange={function (e) {
                setEditFirstName(e.target.value);
              }}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Nom *</label>
            <input
              type="text"
              value={editLastName}
              onChange={function (e) {
                setEditLastName(e.target.value);
              }}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className={labelClass}>Date de naissance *</label>
            <input
              type="date"
              value={editBirthDate}
              onChange={function (e) {
                setEditBirthDate(e.target.value);
              }}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div className="w-28">
            <label className={labelClass}>Catégorie</label>
            <div
              className="h-10 rounded-lg px-3 flex items-center justify-center"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
            >
              {editCategory ? (
                <span className={categoryBadgeClass(editCategory)}>{editCategory}</span>
              ) : (
                <span className="text-xs text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Position</label>
          <select
            value={editPosition}
            onChange={function (e) {
              setEditPosition(e.target.value);
            }}
            className={inputClass}
            style={inputStyle}
          >
            <option value="Meneur">Meneur</option>
            <option value="Arrière">Arrière</option>
            <option value="Ailier">Ailier</option>
            <option value="Ailier fort">Ailier fort</option>
            <option value="Pivot">Pivot</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Club</label>
          <input
            type="text"
            value={editClub}
            onChange={function (e) {
              setEditClub(e.target.value);
            }}
            placeholder="Nom du club"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className={labelClass}>Source</label>
          <select
            value={editSource}
            onChange={function (e) {
              setEditSource(e.target.value);
            }}
            className={inputClass}
            style={inputStyle}
          >
            <option value="Externe">Externe</option>
            <option value="Roster">Roster</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Commentaire général</label>
          <textarea
            value={editComment}
            onChange={function (e) {
              setEditComment(e.target.value);
            }}
            rows={4}
            placeholder="Notes sur la joueuse..."
            className="w-full rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none transition-colors"
            style={inputStyle}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            style={{ background: 'var(--bg-3)' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editFirstName.trim() || !editLastName.trim() || !editBirthDate}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DetectionDashboard ───────────────────────────────────────────────────────

function DetectionDashboard({ player, onBack }) {
  if (!player) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
        <div className="text-slate-500">Joueuse introuvable.</div>
      </div>
    );
  }

  var E = window.DetectionEngine;
  var scores = E.computeOverallScores(player);
  var globalResult = E.computeGlobalScore(player);
  var hasSessions = (player.physicalSessions || []).length > 0;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-0)' }}>

      {/* ─── Header sticky ─── */}
      <div
        className="sticky top-0 z-30 shrink-0"
        style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <button
            onClick={onBack}
            className="text-slate-500 hover:text-white transition-colors shrink-0"
          >
            <DIcon d={DPaths.back} className="h-5 w-5" />
          </button>

          <PlayerAvatar player={player} size="h-9 w-9" />

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate leading-tight">
              {player.firstName} {player.lastName}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={categoryBadgeClass(player.category)}>{player.category}</span>
              {player.position && <span className="text-xs text-slate-500">{player.position}</span>}
              {player.club && <span className="text-xs text-slate-600 truncate">· {player.club}</span>}
              {player.height && <span className="text-xs text-slate-600">· {player.height} cm</span>}
            </div>
          </div>

          <ScoreBadge score={globalResult.score} />
        </div>
      </div>

      {/* ─── Contenu scroll ─── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">

          {/* ─── Radars ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlobalRadar player={player} />

            {/* Radar physique */}
            {hasSessions ? (
              <PhysicalRadar
                session={player.physicalSessions[0]}
                category={player.category}
                refLevel="regional"
              />
            ) : (
              <div
                className="rounded-xl p-5"
                style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
              >
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-4">
                  Profil Physique
                </h3>
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{ height: 180, background: 'var(--bg-2)', border: '1px dashed var(--border)' }}
                >
                  <span className="text-xs text-slate-600">Aucune session physique</span>
                </div>
              </div>
            )}
          </div>

          {/* ─── Physique ─── */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Physique</span>
              {scores.physical != null && (
                <span className={'text-xs font-mono font-bold ' + scoreTextColor(scores.physical)}>
                  {scores.physical}/100
                </span>
              )}
            </div>
            <PhysicalTab player={player} />
          </div>

          {/* ─── Technique ─── */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Technique</span>
              {scores.technical != null && (
                <span className={'text-xs font-mono font-bold ' + scoreTextColor(scores.technical)}>
                  {scores.technical}/100
                </span>
              )}
            </div>
            <TechnicalTab player={player} />
          </div>

          {/* ─── Tactique ─── */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Tactique</span>
              {scores.tactical != null && (
                <span className={'text-xs font-mono font-bold ' + scoreTextColor(scores.tactical)}>
                  {scores.tactical}/100
                </span>
              )}
            </div>
            <TacticalTab player={player} />
          </div>

          {/* ─── Mental ─── */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Mental</span>
              {scores.mental != null && (
                <span className={'text-xs font-mono font-bold ' + scoreTextColor(scores.mental)}>
                  {scores.mental}/100
                </span>
              )}
            </div>
            <MentalTab player={player} />
          </div>

          {/* ─── Notes Scout ─── */}
          <ScoutNotesSection player={player} />

        </div>
      </div>
    </div>
  );
}

// ─── DetectionList ────────────────────────────────────────────────────────────

function DetectionList({
  players,
  loading,
  onSelect,
  onCreateNew,
  showCreateForm,
  onCloseForm,
  onPlayerCreated,
}) {
  var [filters, setFilters] = React.useState({ category: '', source: '', search: '' });

  var filtered = players.filter(function (p) {
    if (filters.category && p.category !== filters.category) return false;
    if (filters.source && p.source !== filters.source) return false;
    if (filters.search) {
      var q = filters.search.toLowerCase();
      var name = ((p.firstName || '') + ' ' + (p.lastName || '')).toLowerCase();
      if (name.indexOf(q) === -1) return false;
    }
    return true;
  });

  function handleDelete(player) {
    var name = ((player.firstName || '') + ' ' + (player.lastName || '')).trim();
    if (!window.confirm('Supprimer définitivement la fiche de ' + name + ' ?')) return;
    var db = window.detectionDb;
    if (!db) return;
    db.collection('detection')
      .doc(player.id)
      .delete()
      .catch(function (err) {
        console.error('[Detection] Delete error:', err);
        alert('Erreur de suppression');
      });
  }

  var hasFilters = !!(filters.category || filters.source || filters.search);

  return (
    <React.Fragment>
      {/* ═══ HEADER ═══ */}
      <header
        className="sticky top-0 z-30 flex h-16 items-center justify-between px-6 lg:px-8 shrink-0"
        style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={function () {
              window.location.href = 'index.html';
            }}
            className="text-slate-500 hover:text-white transition-colors md:hidden"
          >
            <DIcon d={DPaths.back} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Détection</h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              {filtered.length + ' / ' + players.length + ' joueuses'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="h-9 w-9 flex items-center justify-center rounded-lg transition-colors text-slate-500 hover:text-white hover:bg-slate-800/50"
            title="Aide"
          >
            <DIcon d={DPaths.help} className="h-5 w-5" />
          </button>
          <button
            className="relative h-9 w-9 flex items-center justify-center rounded-lg transition-colors text-slate-500 hover:text-white hover:bg-slate-800/50"
            title="Notifications"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'20px',height:'20px',minWidth:'20px'}}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-orange-500"></span>
          </button>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
          >
            <DIcon d={DPaths.plus} className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle fiche</span>
          </button>
        </div>
      </header>

      {/* ═══ FILTRES ═══ */}
      <div
        className="px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="relative flex-1 sm:max-w-md">
          <DIcon
            d={DPaths.search}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
          />
          <input
            type="text"
            placeholder="Rechercher une joueuse..."
            value={filters.search}
            onChange={function (e) {
              setFilters(Object.assign({}, filters, { search: e.target.value }));
            }}
            className="h-10 w-full rounded-lg pl-10 pr-4 text-sm text-white placeholder-slate-600"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
          />
        </div>

        <CustomDropdown
          value={filters.category}
          onChange={function (v) {
            setFilters(Object.assign({}, filters, { category: v }));
          }}
          placeholder="Toutes catégories"
          options={[
            { value: '', label: 'Toutes catégories' },
            { value: 'U11', label: 'U11' },
            { value: 'U13', label: 'U13' },
            { value: 'U15', label: 'U15' },
            { value: 'U18', label: 'U18' },
          ]}
        />

        <CustomDropdown
          value={filters.source}
          onChange={function (v) {
            setFilters(Object.assign({}, filters, { source: v }));
          }}
          placeholder="Toutes sources"
          options={[
            { value: '', label: 'Toutes sources' },
            { value: 'roster', label: 'Roster' },
            { value: 'external', label: 'Externe' },
          ]}
        />

        <div className="sm:ml-auto">
          <button
            className="flex items-center gap-2 h-10 rounded-lg px-3 text-sm transition-colors text-slate-500 hover:text-white"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
          >
            <DIcon d={DPaths.sliders} className="h-4 w-4" />
            <span className="hidden sm:inline">Filtres avancés</span>
          </button>
        </div>
      </div>

      {/* ═══ CONTENU ═══ */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        {loading && <div className="text-center py-20 text-slate-500 text-sm">Chargement...</div>}

        {!loading && filtered.length === 0 && (
          <div
            className="mt-8 flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center"
            style={{ background: 'var(--bg-2)', border: '1px dashed var(--border)' }}
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: 'var(--accent-ghost)' }}
            >
              <DIcon d={DPaths.users} className="h-8 w-8" style={{ color: 'var(--accent)' }} />
            </div>

            <h3 className="mt-6 text-lg font-semibold text-white">Aucune fiche créée</h3>
            <p className="mt-2 max-w-sm" style={{ color: 'var(--text-3)' }}>
              Commencez par créer votre première fiche de joueuse pour débuter le suivi de vos
              prospects.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={onCreateNew}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-colors"
                style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
              >
                <DIcon d={DPaths.plus} className="h-4 w-4" />
                Créer la première fiche
              </button>
              <button
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-colors text-slate-400 hover:text-white"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}
              >
                En savoir plus
                <DIcon d={DPaths.arrowR} className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-12 grid w-full max-w-2xl gap-4 sm:grid-cols-3">
              {[
                { t: 'Organisez', d: 'Classez vos joueuses par catégorie et source' },
                { t: 'Évaluez', d: 'Notez et suivez la progression de chaque prospect' },
                { t: 'Analysez', d: 'Générez des rapports détaillés pour votre équipe' },
              ].map(function (tip) {
                return (
                  <div
                    key={tip.t}
                    className="rounded-lg p-4 text-left"
                    style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}
                  >
                    <h4 className="font-semibold text-white text-sm">{tip.t}</h4>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>
                      {tip.d}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(function (p) {
              return (
                <DetectionCard key={p.id} player={p} onSelect={onSelect} onDelete={handleDelete} />
              );
            })}
          </div>
        )}
      </main>

      {showCreateForm && (
        <CreatePlayerForm onClose={onCloseForm} onPlayerCreated={onPlayerCreated} />
      )}
    </React.Fragment>
  );
}

// ─── DetectionSidebar ─────────────────────────────────────────────────────────

function DetectionSidebar({ collapsed, onToggle }) {
  var navItems = [
    { icon: DPaths.target, label: 'Détection', href: 'detection.html', active: true },
    { icon: DPaths.users, label: 'Joueuses', href: 'index.html', active: false },
    { icon: DPaths.chart, label: 'Statistiques', href: 'index.html', active: false },
    { icon: DPaths.calendar, label: 'Calendrier', href: '#', active: false },
    { icon: DPaths.file, label: 'Rapports', href: '#', active: false },
    { icon: DPaths.settings, label: 'Paramètres', href: 'index.html', active: false },
  ];

  return (
    <aside
      className={
        'relative flex-col shrink-0 transition-all duration-300 hidden md:flex ' +
        (collapsed ? 'w-16' : 'w-60')
      }
      style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div
        className="flex h-16 items-center gap-3 px-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
          style={{ background: 'var(--accent-ghost)' }}
        >
          <DIcon
            d={DPaths.target}
            className="h-5 w-5"
            style={{ color: 'var(--accent)', width: '20px', height: '20px' }}
          />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-white tracking-tight">StatChamp</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(function (item) {
          return (
            <a
              key={item.label}
              href={item.href}
              className={
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
                (item.active
                  ? 'text-orange-400'
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/50')
              }
              style={item.active ? { background: 'var(--accent-ghost)' } : {}}
            >
              <DIcon d={item.icon} className="shrink-0" style={{ width: '20px', height: '20px' }} />
              {!collapsed && <span>{item.label}</span>}
            </a>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-colors text-slate-500 hover:text-white"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
      >
        <DIcon
          d={collapsed ? DPaths.chevRight : DPaths.chevLeft}
          className="shrink-0"
          style={{ width: '14px', height: '14px' }}
        />
      </button>

      {/* User */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--bg-0)' }}
          >
            JD
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">Jean Dupont</p>
              <p className="truncate text-xs text-slate-500">Recruteur</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── DetectionApp ─────────────────────────────────────────────────────────────

function DetectionApp() {
  var [players, setPlayers] = React.useState([]);
  var [selectedId, setSelectedId] = React.useState(null);
  var [showCreateForm, setShowCreateForm] = React.useState(false);
  var [loading, setLoading] = React.useState(true);
  var [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  React.useEffect(function () {
    var db = window.detectionDb;
    if (!db) {
      setLoading(false);
      return;
    }
    var unsub = db.collection('detection').onSnapshot(
      function (snapshot) {
        var list = [];
        snapshot.forEach(function (doc) {
          var data = doc.data();
          if (data.source === 'Externe') data.source = 'external';
          if (data.source === 'Roster') data.source = 'roster';
          list.push(data);
        });
        list.sort(function (a, b) {
          return (b.updatedAt || '').localeCompare(a.updatedAt || '');
        });
        setPlayers(list);
        setLoading(false);
      },
      function (err) {
        console.error('[Detection] Firestore error:', err);
        setLoading(false);
      }
    );
    return function () {
      unsub();
    };
  }, []);

  if (selectedId) {
    var player = players.find(function (p) {
      return p.id === selectedId;
    });
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-0)' }}>
        <DetectionSidebar
          collapsed={sidebarCollapsed}
          onToggle={function () {
            setSidebarCollapsed(!sidebarCollapsed);
          }}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DetectionDashboard
            player={player}
            onBack={function () {
              setSelectedId(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-0)' }}>
      <DetectionSidebar
        collapsed={sidebarCollapsed}
        onToggle={function () {
          setSidebarCollapsed(!sidebarCollapsed);
        }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DetectionList
          players={players}
          loading={loading}
          onSelect={function (id) {
            setSelectedId(id);
          }}
          onCreateNew={function () {
            setShowCreateForm(true);
          }}
          showCreateForm={showCreateForm}
          onCloseForm={function () {
            setShowCreateForm(false);
          }}
          onPlayerCreated={function (id) {
            setShowCreateForm(false);
            setSelectedId(id);
          }}
        />
      </div>
    </div>
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────

var root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DetectionApp));
