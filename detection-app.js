// detection-app.js — Module Détection StatChamp
// React 18 + Babel standalone — pas de import/export

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryBadgeClass(cat) {
  var map = {
    U11: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    U13: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    U15: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    U18: 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
  };
  return (map[cat] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30') +
    ' text-xs px-2 py-0.5 rounded-full font-semibold';
}

function scoreBarColor(score) {
  if (score === null || score === undefined) return 'bg-slate-600';
  if (score < 40) return 'bg-red-500';
  if (score < 60) return 'bg-amber-500';
  if (score < 80) return 'bg-blue-500';
  return 'bg-green-500';
}

// ─── PlayerAvatar ─────────────────────────────────────────────────────────────

function PlayerAvatar({ player }) {
  var initials = ((player.firstName || '')[0] || '') + ((player.lastName || '')[0] || '');
  if (player.photo) {
    return (
      <img
        src={player.photo}
        className="w-12 h-12 rounded-full object-cover shrink-0"
        alt=""
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm shrink-0">
      {initials.toUpperCase() || '?'}
    </div>
  );
}

// ─── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, score }) {
  var hasScore = score !== null && score !== undefined;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-slate-400 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
        <div
          className={scoreBarColor(score) + ' h-1.5 rounded-full transition-all duration-300'}
          style={{ width: hasScore ? score + '%' : '0%' }}
        />
      </div>
      <span className="w-6 text-right text-slate-300 font-mono">
        {hasScore ? score : '—'}
      </span>
    </div>
  );
}

// ─── DetectionFilters ─────────────────────────────────────────────────────────

function DetectionFilters({ filters, onFilterChange }) {
  var selectClass = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none';
  var inputClass = 'flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none';

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-slate-800">
      <select
        value={filters.category}
        onChange={function(e) { onFilterChange({ category: e.target.value, source: filters.source, search: filters.search }); }}
        className={selectClass}
      >
        <option value="">Toutes catégories</option>
        <option value="U11">U11</option>
        <option value="U13">U13</option>
        <option value="U15">U15</option>
        <option value="U18">U18</option>
      </select>

      <select
        value={filters.source}
        onChange={function(e) { onFilterChange({ category: filters.category, source: e.target.value, search: filters.search }); }}
        className={selectClass}
      >
        <option value="">Toutes sources</option>
        <option value="Roster">Roster</option>
        <option value="Externe">Externe</option>
      </select>

      <input
        type="text"
        placeholder="🔍 Rechercher..."
        value={filters.search}
        onChange={function(e) { onFilterChange({ category: filters.category, source: filters.source, search: e.target.value }); }}
        className={inputClass}
      />
    </div>
  );
}

// ─── DetectionCard ────────────────────────────────────────────────────────────

function DetectionCard({ player, onSelect }) {
  var scores = window.DetectionEngine.computeOverallScores(player);

  var sourceBadge = player.source === 'Roster'
    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30';

  return (
    <div
      onClick={function() { onSelect(player.id); }}
      className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-orange-500/50 hover:bg-slate-800/80 transition-all duration-200 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <PlayerAvatar player={player} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">
            {player.firstName} {player.lastName}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={categoryBadgeClass(player.category)}>
              {player.category}
            </span>
            {player.position && (
              <span className="text-xs text-slate-400">{player.position}</span>
            )}
          </div>
          {player.club ? (
            <div className="text-xs text-slate-500 truncate mt-0.5">{player.club}</div>
          ) : null}
          <div className="mt-1.5">
            <span className={'text-xs px-1.5 py-0.5 rounded font-medium ' + sourceBadge}>
              {player.source || 'Externe'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
        <ScoreBar label="Physique" score={scores.physical} />
        <ScoreBar label="Technique" score={scores.technical} />
        <ScoreBar label="Tactique" score={scores.tactical} />
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
  var [source, setSource] = React.useState('Externe');
  var [saving, setSaving] = React.useState(false);

  var category = React.useMemo(function() {
    return birthDate ? window.DetectionEngine.computeCategory(birthDate) : null;
  }, [birthDate]);

  var canCreate = firstName.trim() !== '' && lastName.trim() !== '' && birthDate !== '' && category !== null;

  var inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors';
  var labelClass = 'block text-xs font-medium text-slate-400 mb-1';

  function handleCreate() {
    if (!canCreate || saving) return;
    var db = window.detectionDb;
    if (!db) { alert('Firebase non connecté'); return; }

    setSaving(true);
    var id = window.DetectionEngine.generateId('det');
    var now = new Date().toISOString();
    var doc = {
      id: id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate,
      category: category,
      position: position,
      club: club.trim(),
      source: source,
      rosterId: null,
      photo: null,
      createdAt: now,
      updatedAt: now,
      physicalSessions: [],
      technical: { date: null, evaluations: [], comment: '' },
      tactical: { date: null, evaluations: [], comment: '' },
      generalComment: ''
    };

    db.collection('detection').doc(id).set(doc)
      .then(function() {
        onPlayerCreated(id);
      })
      .catch(function(err) {
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
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold text-white">Nouvelle fiche joueuse</h2>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Prénom + Nom */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Prénom *</label>
              <input
                type="text"
                value={firstName}
                onChange={function(e) { setFirstName(e.target.value); }}
                placeholder="Léa"
                className={inputClass}
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Nom *</label>
              <input
                type="text"
                value={lastName}
                onChange={function(e) { setLastName(e.target.value); }}
                placeholder="Dupont"
                className={inputClass}
              />
            </div>
          </div>

          {/* Date naissance + Catégorie auto */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className={labelClass}>Date de naissance *</label>
              <input
                type="date"
                value={birthDate}
                onChange={function(e) { setBirthDate(e.target.value); }}
                className={inputClass}
              />
            </div>
            <div className="w-28">
              <label className={labelClass}>Catégorie</label>
              <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center h-9 flex items-center justify-center">
                {category ? (
                  <span className={categoryBadgeClass(category)}>{category}</span>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Position */}
          <div>
            <label className={labelClass}>Position</label>
            <select
              value={position}
              onChange={function(e) { setPosition(e.target.value); }}
              className={inputClass}
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
            <label className={labelClass}>Club</label>
            <input
              type="text"
              value={club}
              onChange={function(e) { setClub(e.target.value); }}
              placeholder="Nom du club"
              className={inputClass}
            />
          </div>

          {/* Source */}
          <div>
            <label className={labelClass}>Source *</label>
            <select
              value={source}
              onChange={function(e) { setSource(e.target.value); }}
              className={inputClass}
            >
              <option value="Externe">Externe</option>
              <option value="Roster">Roster</option>
            </select>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
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
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var w = img.width;
      var h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/jpeg', quality);
      callback(dataUrl);
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
    <div className="flex items-center px-4 py-3 gap-4">
      <span className="text-xs font-medium text-slate-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-slate-200 flex-1">{value}</span>
    </div>
  );
}

// ─── Tab placeholders ─────────────────────────────────────────────────────────

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
  var abs = isInt ? Math.round(Math.abs(delta)).toString() : parseFloat(Math.abs(delta).toFixed(2)).toString();
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

function LevelBadge({ level, size }) {
  var B = window.DETECTION_BAREMES;
  if (!level) return <span className="text-xs text-slate-500">—</span>;
  var label = (B.levelLabels && B.levelLabels[level]) || level;
  var color = window.DetectionEngine.levelColor(level);
  var bg = window.DetectionEngine.levelBg(level);
  var padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';
  return (
    <span className={'text-xs rounded font-bold ' + padding + ' ' + color + ' ' + bg}>
      {label}
    </span>
  );
}

// ─── PhysicalSummary ──────────────────────────────────────────────────────────

function PhysicalSummary({ session, category, refLevel }) {
  var tests = window.DetectionEngine.getTestsForCategory(category);
  var sum = 0, count = 0;
  tests.forEach(function(testId) {
    var val = session.tests[testId];
    if (val == null || val === '') return;
    var level = window.DetectionEngine.evaluatePhysical(testId, val, category, refLevel);
    if (!level) return;
    sum += window.DetectionEngine.levelToScore(level);
    count++;
  });
  var score = count > 0 ? Math.round((sum / count) * 20) : null;

  return (
    <div className="mt-4 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400">Score global de la session</span>
        <span className="text-sm font-bold text-white font-mono">
          {score !== null ? score + '/100' : '—'}
        </span>
      </div>
      {score !== null ? (
        <div className="bg-slate-700/60 rounded-full h-2 overflow-hidden">
          <div
            className={scoreBarColor(score) + ' h-2 rounded-full transition-all duration-300'}
            style={{ width: score + '%' }}
          />
        </div>
      ) : (
        <div className="text-xs text-slate-600">Renseignez des tests pour calculer le score.</div>
      )}
      <div className="text-xs text-slate-600 mt-1.5">
        {count} test{count !== 1 ? 's' : ''} évalué{count !== 1 ? 's' : ''} sur {tests.length}
      </div>
    </div>
  );
}

// ─── SessionReadView ──────────────────────────────────────────────────────────

function SessionReadView({ session, category, refLevel }) {
  var tests = window.DetectionEngine.getTestsForCategory(category);
  var B = window.DETECTION_BAREMES;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      {session.comment ? (
        <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800">
          <span className="text-xs text-slate-400 italic">"{session.comment}"</span>
        </div>
      ) : null}
      {tests.map(function(testId, i) {
        var testInfo = B.physical[testId];
        if (!testInfo) return null;
        var val = session.tests[testId];
        var hasVal = val != null && val !== '';
        var level = hasVal ? window.DetectionEngine.evaluatePhysical(testId, val, category, refLevel) : null;
        var displayVal = hasVal
          ? (testInfo.direction === 'qualitative'
              ? (B.levelLabels[val] || val)
              : (val + '\u00a0' + testInfo.unit))
          : '—';

        return (
          <div
            key={testId}
            className={'flex items-center justify-between px-4 py-3 ' + (i < tests.length - 1 ? 'border-b border-slate-800' : '')}
          >
            <span className="text-sm text-slate-300">{testInfo.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white font-mono">{displayVal}</span>
              {hasVal && testInfo.direction !== 'qualitative' ? (
                <LevelBadge level={level} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PhysicalTestForm ─────────────────────────────────────────────────────────

function PhysicalTestForm({ category, initialSession, refLevel, onSave, onCancel }) {
  var tests = window.DetectionEngine.getTestsForCategory(category);
  var B = window.DETECTION_BAREMES;

  var [testValues, setTestValues] = React.useState(function() {
    var obj = {};
    tests.forEach(function(testId) {
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
    tests.forEach(function(id) { next[id] = testValues[id]; });
    next[testId] = val;
    setTestValues(next);
  }

  function handleSave() {
    var cleanTests = {};
    tests.forEach(function(testId) {
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
      sessionId: (initialSession && initialSession.sessionId) || window.DetectionEngine.generateId('ps'),
      date: sessionDate,
      label: sessionLabel.trim() || 'Session',
      tests: cleanTests,
      comment: sessionComment.trim()
    });
  }

  var inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors';
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
            onChange={function(e) { setSessionDate(e.target.value); }}
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Label</label>
          <input
            type="text"
            value={sessionLabel}
            onChange={function(e) { setSessionLabel(e.target.value); }}
            placeholder="Ex: Début saison"
            className={inputClass}
          />
        </div>
      </div>

      {/* Tests */}
      <div className="flex flex-col gap-3 mb-4">
        {tests.map(function(testId) {
          var testInfo = B.physical[testId];
          if (!testInfo) return null;
          var val = testValues[testId];

          // Qualitatif (parcours coordination U11)
          if (testInfo.direction === 'qualitative') {
            return (
              <div key={testId} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                <div className="text-sm font-medium text-slate-300 mb-2">{testInfo.name}</div>
                <div className="flex flex-wrap gap-2">
                  {B.levels.map(function(lvl) {
                    var isActive = val === lvl;
                    var color = window.DetectionEngine.levelColor(lvl);
                    var bg = window.DetectionEngine.levelBg(lvl);
                    return (
                      <button
                        key={lvl}
                        onClick={function() { updateVal(testId, lvl); }}
                        className={'text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors ' +
                          (isActive
                            ? color + ' ' + bg + ' border-current'
                            : 'text-slate-500 bg-slate-800 border-slate-700 hover:text-slate-300')}
                      >
                        {B.levelLabels[lvl]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Quantitatif
          var level = val !== '' ? window.DetectionEngine.evaluatePhysical(testId, val, category, refLevel) : null;
          var hint = val !== '' ? getNextLevelHint(testId, val, category, refLevel) : null;

          return (
            <div key={testId} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-medium text-slate-400 mb-1.5">
                {testInfo.name} <span className="text-slate-600">({testInfo.unit})</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="number"
                  value={val}
                  onChange={function(e) { updateVal(testId, e.target.value); }}
                  step={getInputStep(testInfo.unit)}
                  min="0"
                  placeholder="—"
                  className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors"
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
          onChange={function(e) { setSessionComment(e.target.value); }}
          rows={3}
          placeholder="Conditions, remarques..."
          className={inputClass + ' resize-none'}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Enregistrer la session
        </button>
      </div>
    </div>
  );
}

// ─── SessionComparison ────────────────────────────────────────────────────────

function SessionComparison({ player, sessions, compareIdxA, compareIdxB, onChangeA, onChangeB, refLevel }) {
  var tests = window.DetectionEngine.getTestsForCategory(player.category);
  var B = window.DETECTION_BAREMES;

  var sessionA = sessions[compareIdxA] || null;
  var sessionB = sessions[compareIdxB] || null;

  var selectClass = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:border-orange-500 outline-none';

  if (compareIdxA === compareIdxB) {
    return (
      <div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Référence (ancienne)</div>
            <select value={compareIdxA} onChange={function(e) { onChangeA(e.target.value); }} className={selectClass}>
              {sessions.map(function(s, i) {
                return <option key={s.sessionId || i} value={i}>{(s.label || 'Session') + ' — ' + formatDateFr(s.date)}</option>;
              })}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Session récente</div>
            <select value={compareIdxB} onChange={function(e) { onChangeB(e.target.value); }} className={selectClass}>
              {sessions.map(function(s, i) {
                return <option key={s.sessionId || i} value={i}>{(s.label || 'Session') + ' — ' + formatDateFr(s.date)}</option>;
              })}
            </select>
          </div>
        </div>
        <div className="text-center text-sm text-slate-500 py-8 bg-slate-900/50 border border-slate-800 rounded-xl">
          Sélectionnez deux sessions différentes pour comparer.
        </div>
      </div>
    );
  }

  var safeA = (sessionA && sessionA.tests) ? sessionA : { tests: {} };
  var safeB = (sessionB && sessionB.tests) ? sessionB : { tests: {} };
  var comparison = window.DetectionEngine.comparePhysicalSessions(safeA, safeB, player.category, refLevel);
  var hasData = Object.keys(comparison).length > 0;

  return (
    <div>
      {/* Sélecteurs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Référence (ancienne)</div>
          <select value={compareIdxA} onChange={function(e) { onChangeA(e.target.value); }} className={selectClass}>
            {sessions.map(function(s, i) {
              return <option key={s.sessionId || i} value={i}>{(s.label || 'Session') + ' — ' + formatDateFr(s.date)}</option>;
            })}
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Session récente</div>
          <select value={compareIdxB} onChange={function(e) { onChangeB(e.target.value); }} className={selectClass}>
            {sessions.map(function(s, i) {
              return <option key={s.sessionId || i} value={i}>{(s.label || 'Session') + ' — ' + formatDateFr(s.date)}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-slate-800/50 border-b border-slate-800">
          <div className="text-xs font-semibold text-slate-400">Test</div>
          <div className="text-xs font-semibold text-slate-400 truncate">{(sessionA && sessionA.label) || 'Ancienne'}</div>
          <div className="text-xs font-semibold text-slate-400 truncate">{(sessionB && sessionB.label) || 'Récente'}</div>
          <div className="text-xs font-semibold text-slate-400">Évolution</div>
        </div>

        {tests.map(function(testId, i) {
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
              className={'grid grid-cols-4 gap-2 px-4 py-3 items-start ' + (i < tests.length - 1 ? 'border-b border-slate-800' : '')}
            >
              <div className="text-xs text-slate-400 leading-tight">{testInfo.name}</div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-white font-mono">{data.oldVal + '\u00a0' + testInfo.unit}</span>
                {data.oldLevel ? <LevelBadge level={data.oldLevel} size="sm" /> : null}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-white font-mono">{data.newVal + '\u00a0' + testInfo.unit}</span>
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

// ─── PhysicalTab (complet) ────────────────────────────────────────────────────

function PhysicalTab({ player }) {
  var [selectedSessionIdx, setSelectedSessionIdx] = React.useState(0);
  var [creating, setCreating] = React.useState(false);
  var [editingSession, setEditingSession] = React.useState(false);
  var [comparing, setComparing] = React.useState(false);
  var [compareIdxA, setCompareIdxA] = React.useState(1);
  var [compareIdxB, setCompareIdxB] = React.useState(0);
  var [refLevel, setRefLevel] = React.useState('regional');

  var sessions = player.physicalSessions || [];

  React.useEffect(function() {
    if (sessions.length > 0 && selectedSessionIdx >= sessions.length) {
      setSelectedSessionIdx(0);
    }
  }, [sessions.length]);

  var selectedSession = sessions[selectedSessionIdx] || null;

  var refLevels = [
    { id: 'departemental', label: 'Départemental' },
    { id: 'regional', label: 'Régional' },
    { id: 'national', label: 'National' }
  ];

  var refLevelBar = (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-xs text-slate-400 shrink-0">Niveau de référence :</span>
      {refLevels.map(function(rl) {
        return (
          <button
            key={rl.id}
            onClick={function() { setRefLevel(rl.id); }}
            className={'text-xs px-2.5 py-1 rounded-full font-medium transition-colors ' +
              (refLevel === rl.id ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white')}
          >
            {rl.label}
          </button>
        );
      })}
    </div>
  );

  function handleSaveSession(newSession) {
    var db = window.detectionDb;
    if (!db) { alert('Firebase non connecté'); return; }

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

    updatedSessions.sort(function(a, b) {
      return (b.date || '').localeCompare(a.date || '');
    });

    db.collection('detection').doc(player.id).update({
      physicalSessions: updatedSessions,
      updatedAt: new Date().toISOString()
    }).then(function() {
      setCreating(false);
      setEditingSession(false);
      setSelectedSessionIdx(0);
    }).catch(function(err) {
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

    var updatedSessions = (player.physicalSessions || []).filter(function(s) {
      return s.sessionId !== selectedSession.sessionId;
    });

    db.collection('detection').doc(player.id).update({
      physicalSessions: updatedSessions,
      updatedAt: new Date().toISOString()
    }).then(function() {
      setSelectedSessionIdx(0);
      setComparing(false);
    }).catch(function(err) {
      console.error('[Detection] Delete session error:', err);
      alert('Erreur de suppression');
    });
  }

  // Mode création ou édition
  if (creating || editingSession) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={function() { setCreating(false); setEditingSession(false); }}
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
          onCancel={function() { setCreating(false); setEditingSession(false); }}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      {refLevelBar}

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <div className="text-3xl mb-3">🏃</div>
          <div className="text-sm font-medium mb-4">Aucune session de tests physiques.</div>
          <button
            onClick={function() { setCreating(true); }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
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
              onChange={function(e) {
                setSelectedSessionIdx(parseInt(e.target.value));
                setComparing(false);
              }}
              className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
            >
              {sessions.map(function(s, i) {
                return (
                  <option key={s.sessionId || i} value={i}>
                    {(s.label || 'Session') + ' — ' + formatDateFr(s.date)}
                  </option>
                );
              })}
            </select>
            <button
              onClick={function() { setCreating(true); setComparing(false); }}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg px-3 py-2 transition-colors shrink-0"
            >
              + Nouvelle
            </button>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={function() { setEditingSession(true); setComparing(false); }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 transition-colors border border-slate-700"
            >
              Modifier
            </button>
            {sessions.length >= 2 ? (
              <button
                onClick={function() {
                  var next = !comparing;
                  setComparing(next);
                  if (next) {
                    setCompareIdxA(sessions.length > 1 ? sessions.length - 1 : 1);
                    setCompareIdxB(0);
                  }
                }}
                className={'text-xs rounded-lg px-3 py-1.5 transition-colors border ' +
                  (comparing
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700')}
              >
                {comparing ? 'Fermer comparaison' : 'Comparer'}
              </button>
            ) : null}
            <button
              onClick={handleDeleteSession}
              className="text-red-500/50 hover:text-red-500 text-xs rounded-lg px-3 py-1.5 transition-colors border border-red-500/20 hover:border-red-500/50 ml-auto"
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
              onChangeA={function(v) { setCompareIdxA(parseInt(v)); }}
              onChangeB={function(v) { setCompareIdxB(parseInt(v)); }}
              refLevel={refLevel}
            />
          ) : selectedSession ? (
            <div>
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

function TechnicalTab(props) {
  return (
    <div className="p-8 text-center text-slate-500">
      Évaluation technique — Prompt 5
    </div>
  );
}

function TacticalTab(props) {
  return (
    <div className="p-8 text-center text-slate-500">
      Évaluation tactique — Prompt 5
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

  var editCategory = React.useMemo(function() {
    return editBirthDate ? window.DetectionEngine.computeCategory(editBirthDate) : null;
  }, [editBirthDate]);

  var inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors';
  var labelClass = 'block text-xs font-medium text-slate-400 mb-1';

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
    if (!db) { alert('Firebase non connecté'); return; }
    var category = window.DetectionEngine.computeCategory(editBirthDate);
    if (!category) { alert('Date de naissance invalide'); return; }

    setSaving(true);
    var updates = {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      birthDate: editBirthDate,
      category: category,
      position: editPosition,
      club: editClub.trim(),
      source: editSource,
      photo: editPhoto,
      generalComment: editComment.trim(),
      updatedAt: new Date().toISOString()
    };

    db.collection('detection').doc(player.id).update(updates)
      .then(function() {
        setEditing(false);
        setSaving(false);
      })
      .catch(function(err) {
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
    db.collection('detection').doc(player.id).delete()
      .then(function() { onBack(); })
      .catch(function(err) {
        console.error('[Detection] Delete error:', err);
        alert('Erreur de suppression');
      });
  }

  function handleFileChange(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    compressImage(file, 300, 0.7, function(dataUrl) {
      if (dataUrl.length > 200000) {
        alert('Image trop volumineuse après compression. Choisissez une image plus petite.');
        return;
      }
      setEditPhoto(dataUrl);
    });
    e.target.value = '';
  }

  // ── MODE LECTURE ──
  if (!editing) {
    var sourceBadge = player.source === 'Roster'
      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    var initials = (((player.firstName || '')[0] || '') + ((player.lastName || '')[0] || '')).toUpperCase() || '?';

    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={function() { setEditing(true); }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm rounded-lg px-3 py-1.5 transition-colors border border-slate-700"
          >
            Modifier
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          {player.photo ? (
            <img src={player.photo} className="w-24 h-24 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-2xl font-bold text-slate-300">
              {initials}
            </div>
          )}
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl divide-y divide-slate-800">
          <InfoRow label="Prénom" value={player.firstName || '—'} />
          <InfoRow label="Nom" value={player.lastName || '—'} />
          <InfoRow label="Date de naissance" value={formatDateFr(player.birthDate)} />
          <InfoRow label="Catégorie" value={
            <span className={categoryBadgeClass(player.category)}>{player.category}</span>
          } />
          <InfoRow label="Position" value={player.position || '—'} />
          <InfoRow label="Club" value={player.club || '—'} />
          <InfoRow label="Source" value={
            <span className={'text-xs px-1.5 py-0.5 rounded font-medium ' + sourceBadge}>
              {player.source || 'Externe'}
            </span>
          } />
        </div>

        {player.generalComment ? (
          <div className="mt-4 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 mb-2">Commentaire général</div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{player.generalComment}</p>
          </div>
        ) : null}

        <div className="mt-4 text-xs text-slate-600 space-y-0.5 px-1">
          {player.createdAt ? (
            <div>Créée le {formatDateFr(player.createdAt.substring(0, 10))}</div>
          ) : null}
          {player.updatedAt ? (
            <div>Mise à jour le {formatDateFr(player.updatedAt.substring(0, 10))}</div>
          ) : null}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleDelete}
            className="text-red-500/50 hover:text-red-500 text-sm transition-colors"
          >
            🗑 Supprimer cette fiche
          </button>
        </div>
      </div>
    );
  }

  // ── MODE ÉDITION ──
  var editInitials = (((editFirstName || '')[0] || '') + ((editLastName || '')[0] || '')).toUpperCase() || '?';

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex flex-col items-center mb-6">
        <div
          className="cursor-pointer group relative"
          onClick={function() { fileInputRef.current && fileInputRef.current.click(); }}
        >
          {editPhoto ? (
            <img src={editPhoto} className="w-24 h-24 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-2xl font-bold text-slate-300">
              {editInitials}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-semibold">Changer</span>
          </div>
        </div>
        <button
          type="button"
          onClick={function() { fileInputRef.current && fileInputRef.current.click(); }}
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
            <input type="text" value={editFirstName}
              onChange={function(e) { setEditFirstName(e.target.value); }}
              className={inputClass} />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Nom *</label>
            <input type="text" value={editLastName}
              onChange={function(e) { setEditLastName(e.target.value); }}
              className={inputClass} />
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className={labelClass}>Date de naissance *</label>
            <input type="date" value={editBirthDate}
              onChange={function(e) { setEditBirthDate(e.target.value); }}
              className={inputClass} />
          </div>
          <div className="w-28">
            <label className={labelClass}>Catégorie</label>
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 h-9 flex items-center justify-center">
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
          <select value={editPosition}
            onChange={function(e) { setEditPosition(e.target.value); }}
            className={inputClass}>
            <option value="Meneur">Meneur</option>
            <option value="Arrière">Arrière</option>
            <option value="Ailier">Ailier</option>
            <option value="Ailier fort">Ailier fort</option>
            <option value="Pivot">Pivot</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Club</label>
          <input type="text" value={editClub}
            onChange={function(e) { setEditClub(e.target.value); }}
            placeholder="Nom du club"
            className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Source</label>
          <select value={editSource}
            onChange={function(e) { setEditSource(e.target.value); }}
            className={inputClass}>
            <option value="Externe">Externe</option>
            <option value="Roster">Roster</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Commentaire général</label>
          <textarea
            value={editComment}
            onChange={function(e) { setEditComment(e.target.value); }}
            rows={4}
            placeholder="Notes sur la joueuse..."
            className={inputClass + ' resize-none'}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editFirstName.trim() || !editLastName.trim() || !editBirthDate}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DetectionDetail (complet) ────────────────────────────────────────────────

function DetectionDetail({ player, onBack }) {
  var [activeTab, setActiveTab] = React.useState('profile');

  if (!player) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500">Joueuse introuvable.</div>
      </div>
    );
  }

  var sourceBadge = player.source === 'Roster'
    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30';

  var tabs = [
    { id: 'profile',   label: 'Profil' },
    { id: 'physical',  label: 'Physique' },
    { id: 'technical', label: 'Technique' },
    { id: 'tactical',  label: 'Tactique' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white text-xl transition-colors shrink-0"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-base font-bold text-white truncate">
                {player.firstName} {player.lastName}
              </h1>
              <span className={categoryBadgeClass(player.category)}>
                {player.category}
              </span>
              {player.position ? (
                <span className="text-xs text-slate-500">{player.position}</span>
              ) : null}
              <span className={'text-xs px-1.5 py-0.5 rounded font-medium ' + sourceBadge}>
                {player.source || 'Externe'}
              </span>
            </div>
            {player.club ? (
              <div className="text-xs text-slate-500 mt-0.5 truncate">{player.club}</div>
            ) : null}
          </div>
        </div>

        {/* TabBar */}
        <div className="flex border-t border-slate-800">
          {tabs.map(function(tab) {
            var isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={function() { setActiveTab(tab.id); }}
                className={
                  'flex-1 py-2.5 text-xs font-semibold tracking-wide transition-colors border-b-2 ' +
                  (isActive
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300')
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu onglet */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'profile' ? (
          <ProfileTab player={player} onBack={onBack} />
        ) : activeTab === 'physical' ? (
          <PhysicalTab player={player} />
        ) : activeTab === 'technical' ? (
          <TechnicalTab player={player} />
        ) : (
          <TacticalTab player={player} />
        )}
      </div>
    </div>
  );
}

// ─── DetectionList ────────────────────────────────────────────────────────────

function DetectionList({ players, loading, onSelect, onCreateNew, showCreateForm, onCloseForm, onPlayerCreated }) {
  var [filters, setFilters] = React.useState({ category: '', source: '', search: '' });

  var filtered = players.filter(function(p) {
    if (filters.category && p.category !== filters.category) return false;
    if (filters.source && p.source !== filters.source) return false;
    if (filters.search) {
      var q = filters.search.toLowerCase();
      var name = ((p.firstName || '') + ' ' + (p.lastName || '')).toLowerCase();
      if (name.indexOf(q) === -1) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1
              className="text-xl font-black tracking-wide"
              style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              DÉTECTION
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading
                ? 'Chargement...'
                : filtered.length + '\u00a0/\u00a0' + players.length + ' joueuse' + (players.length !== 1 ? 's' : '')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreateNew}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg px-3 py-2 transition-colors flex items-center gap-1"
            >
              <span className="text-base leading-none">+</span>
              <span className="hidden sm:inline">Nouvelle fiche</span>
            </button>
            <a
              href="index.html"
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              ←
            </a>
          </div>
        </div>

        <DetectionFilters filters={filters} onFilterChange={setFilters} />
      </div>

      {/* Contenu */}
      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <div className="text-center">
              <div className="text-2xl mb-2 animate-pulse">⏳</div>
              <div className="text-sm">Chargement des fiches...</div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center text-slate-500">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm font-medium mb-1">
                {players.length === 0 ? 'Aucune fiche créée.' : 'Aucune joueuse trouvée.'}
              </div>
              {players.length === 0 && (
                <button
                  onClick={onCreateNew}
                  className="mt-3 text-orange-400 hover:text-orange-300 text-sm underline transition-colors"
                >
                  Créer la première fiche
                </button>
              )}
              {players.length > 0 && filters.search && (
                <div className="text-xs text-slate-600 mt-1">Essayez d'élargir votre recherche.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(function(player) {
              return (
                <DetectionCard
                  key={player.id}
                  player={player}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Modal création */}
      {showCreateForm && (
        <CreatePlayerForm
          onClose={onCloseForm}
          onPlayerCreated={onPlayerCreated}
        />
      )}
    </div>
  );
}

// ─── DetectionApp (racine) ────────────────────────────────────────────────────

function DetectionApp() {
  var [players, setPlayers] = React.useState([]);
  var [selectedId, setSelectedId] = React.useState(null);
  var [showCreateForm, setShowCreateForm] = React.useState(false);
  var [loading, setLoading] = React.useState(true);

  React.useEffect(function() {
    var db = window.detectionDb;
    if (!db) {
      setLoading(false);
      return;
    }
    var unsub = db.collection('detection').onSnapshot(
      function(snapshot) {
        var list = [];
        snapshot.forEach(function(doc) { list.push(doc.data()); });
        list.sort(function(a, b) {
          return (b.updatedAt || '').localeCompare(a.updatedAt || '');
        });
        setPlayers(list);
        setLoading(false);
      },
      function(err) {
        console.error('[Detection] Firestore error:', err);
        setLoading(false);
      }
    );
    return function() { unsub(); };
  }, []);

  if (selectedId) {
    var player = players.find(function(p) { return p.id === selectedId; });
    return (
      <DetectionDetail
        player={player}
        onBack={function() { setSelectedId(null); }}
      />
    );
  }

  return (
    <DetectionList
      players={players}
      loading={loading}
      onSelect={function(id) { setSelectedId(id); }}
      onCreateNew={function() { setShowCreateForm(true); }}
      showCreateForm={showCreateForm}
      onCloseForm={function() { setShowCreateForm(false); }}
      onPlayerCreated={function(id) { setShowCreateForm(false); setSelectedId(id); }}
    />
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────

var root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(DetectionApp));
