(function () {
  'use strict';

  var B = window.DETECTION_BAREMES;

  window.DetectionEngine = {
    /**
     * Évalue le niveau d'un résultat physique.
     * @param {string} testId
     * @param {number|string} value - Résultat brut (number pour quantitatif, string pour qualitatif)
     * @param {string} category - "U11"|"U13"|"U15"|"U18"
     * @param {string} refLevel - "departemental"|"regional"|"national" (défaut: "regional")
     * @returns {string|null} "excellent"|"tres_bien"|"bien"|"moyen"|"insuffisant" ou null si non évaluable
     */
    evaluatePhysical: function (testId, value, category, refLevel) {
      refLevel = refLevel || 'regional';
      var test = B.physical[testId];
      if (!test) return null;
      var catData = test.categories[category];
      if (!catData) return null;

      // Test qualitatif (parcours coordination)
      if (test.direction === 'qualitative') {
        if (typeof value === 'string' && B.levels.indexOf(value) !== -1) return value;
        return null;
      }

      var thresholds = catData[refLevel];
      if (!thresholds) return null;
      value = parseFloat(value);
      if (isNaN(value)) return null;

      var levels = B.levels; // ["excellent", "tres_bien", "bien", "moyen", "insuffisant"]

      if (test.direction === 'lower_is_better') {
        for (var i = 0; i < levels.length; i++) {
          var t = thresholds[levels[i]];
          if (!t) continue;
          if (t.max !== undefined && value < t.max) return levels[i];
          if (t.min !== undefined && t.max !== undefined && value >= t.min && value < t.max)
            return levels[i];
          if (t.min !== undefined && !t.max && value >= t.min) return levels[i];
        }
      } else {
        // higher_is_better
        for (var j = 0; j < levels.length; j++) {
          var th = thresholds[levels[j]];
          if (!th) continue;
          if (th.min !== undefined && !th.max && value >= th.min) return levels[j];
          if (th.min !== undefined && th.max !== undefined && value >= th.min && value < th.max)
            return levels[j];
          if (!th.min && th.max !== undefined && value < th.max) return levels[j];
        }
      }
      return null;
    },

    /**
     * Retourne les testId disponibles pour une catégorie.
     */
    getTestsForCategory: function (category) {
      return (B.testsByCategory[category] || []).slice();
    },

    /**
     * Retourne les infos d'un test physique.
     */
    getTestInfo: function (testId) {
      return B.physical[testId] || null;
    },

    /**
     * Compare deux sessions physiques.
     * @returns {object} { testId: { oldVal, newVal, delta, oldLevel, newLevel, improved } }
     */
    comparePhysicalSessions: function (sessionOld, sessionNew, category, refLevel) {
      refLevel = refLevel || 'regional';
      var self = this;
      var tests = self.getTestsForCategory(category);
      var result = {};

      tests.forEach(function (testId) {
        var oldVal = sessionOld.tests[testId];
        var newVal = sessionNew.tests[testId];
        if (oldVal == null || newVal == null) return;

        var info = B.physical[testId];
        if (!info || info.direction === 'qualitative') return;

        var delta = parseFloat(newVal) - parseFloat(oldVal);
        var improved;
        if (info.direction === 'lower_is_better') {
          improved = delta < 0;
        } else {
          improved = delta > 0;
        }

        result[testId] = {
          oldVal: parseFloat(oldVal),
          newVal: parseFloat(newVal),
          delta: delta,
          oldLevel: self.evaluatePhysical(testId, oldVal, category, refLevel),
          newLevel: self.evaluatePhysical(testId, newVal, category, refLevel),
          improved: improved,
        };
      });

      return result;
    },

    /**
     * Calcule les scores globaux (0-100) par domaine.
     */
    computeOverallScores: function (player) {
      var self = this;
      var result = { physical: null, technical: null, tactical: null, mental: null };

      // --- PHYSIQUE (dernière session) ---
      if (player.physicalSessions && player.physicalSessions.length > 0) {
        var session = player.physicalSessions[0]; // Plus récente en premier
        var tests = self.getTestsForCategory(player.category);
        var sum = 0,
          count = 0;
        tests.forEach(function (testId) {
          var val = session.tests[testId];
          if (val == null) return;
          var level = self.evaluatePhysical(testId, val, player.category);
          if (!level) return;
          sum += self.levelToScore(level);
          count++;
        });
        if (count > 0) result.physical = Math.round((sum / count) * 20); // 1-5 → 0-100
      }

      // --- TECHNIQUE ---
      if (
        player.technical &&
        player.technical.evaluations &&
        player.technical.evaluations.length > 0
      ) {
        var tSum = 0,
          tCount = 0;
        player.technical.evaluations.forEach(function (ev) {
          if (!ev.level) return;
          tSum += self.levelToScore(ev.level);
          tCount++;
        });
        if (tCount > 0) result.technical = Math.round((tSum / tCount) * 20);
      }

      // --- TACTIQUE ---
      if (
        player.tactical &&
        player.tactical.evaluations &&
        player.tactical.evaluations.length > 0
      ) {
        var kSum = 0,
          kCount = 0;
        player.tactical.evaluations.forEach(function (ev) {
          if (!ev.level) return;
          kSum += self.levelToScore(ev.level);
          kCount++;
        });
        if (kCount > 0) result.tactical = Math.round((kSum / kCount) * 20);
      }

      // --- MENTAL ---
      if (player.mental && player.mental.evaluations && player.mental.evaluations.length > 0) {
        var mSum = 0,
          mCount = 0;
        player.mental.evaluations.forEach(function (ev) {
          if (!ev.level) return;
          mSum += self.levelToScore(ev.level);
          mCount++;
        });
        if (mCount > 0) result.mental = Math.round((mSum / mCount) * 20);
      }

      return result;
    },

    /**
     * Convertit un niveau en score numérique.
     */
    levelToScore: function (level) {
      var map = { excellent: 5, tres_bien: 4, bien: 3, moyen: 2, insuffisant: 1 };
      return map[level] || 0;
    },

    /**
     * Retourne la classe Tailwind de couleur pour un niveau.
     */
    levelColor: function (level) {
      var map = {
        excellent: 'text-green-400',
        tres_bien: 'text-emerald-400',
        bien: 'text-blue-400',
        moyen: 'text-amber-400',
        insuffisant: 'text-red-400',
      };
      return map[level] || 'text-slate-400';
    },

    /**
     * Retourne la classe Tailwind bg pour un niveau.
     */
    levelBg: function (level) {
      var map = {
        excellent: 'bg-green-500/20',
        tres_bien: 'bg-emerald-500/20',
        bien: 'bg-blue-500/20',
        moyen: 'bg-amber-500/20',
        insuffisant: 'bg-red-500/20',
      };
      return map[level] || 'bg-slate-500/20';
    },

    /**
     * Calcule la catégorie d'âge depuis la date de naissance.
     * Référence : 1er janvier de la saison en cours.
     * Saison 2025-2026 → année de référence = 2026.
     */
    computeCategory: function (birthDateStr) {
      if (!birthDateStr) return null;
      var birth = new Date(birthDateStr);
      if (isNaN(birth.getTime())) return null;

      var now = new Date();
      var refYear = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
      var age = refYear - birth.getFullYear();

      if (age <= 11) return 'U11';
      if (age <= 13) return 'U13';
      if (age <= 15) return 'U15';
      if (age <= 18) return 'U18';
      return 'U18'; // Senior → barèmes U18 par défaut
    },

    /**
     * Génère un ID unique avec préfixe.
     */
    generateId: function (prefix) {
      return (prefix || 'det') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    },

    /**
     * Normalise une valeur brute en score 0-100 par palier de niveau.
     */
    normalizeTestValue: function (testId, value, category, refLevel) {
      refLevel = refLevel || 'regional';
      var test = B.physical[testId];
      if (!test || test.direction === 'qualitative') return 0;
      var level = this.evaluatePhysical(testId, value, category, refLevel);
      if (!level) return 0;
      return this.levelToScore(level) * 20;
    },

    /**
     * Calcule le Fit Score (0-100) d'une session physique.
     */
    computeFitScore: function (session, category, refLevel) {
      if (!session || !session.tests) return null;
      var self = this;
      refLevel = refLevel || 'regional';
      var tests = self.getTestsForCategory(category);
      var sum = 0,
        count = 0;
      tests.forEach(function (testId) {
        var val = session.tests[testId];
        if (val == null || val === '') return;
        var info = B.physical[testId];
        if (!info || info.direction === 'qualitative') return;
        sum += self.normalizeTestValue(testId, val, category, refLevel);
        count++;
      });
      return count > 0 ? Math.round(sum / count) : null;
    },

    /**
     * Axes du radar chart (5 qualités physiques).
     */
    _radarAxes: [
      { id: 'vitesse', label: 'Vitesse', tests: ['sprint_20m', 'cmj', 'triple_saut'] },
      { id: 'endurance', label: 'Endurance', tests: ['course_6min', 'ift_30_15', 'rsa_best'] },
      { id: 'agilite', label: 'Agilité', tests: ['navette_5_10_15', 'illinois'] },
      {
        id: 'force',
        label: 'Force',
        tests: ['equilibre_unipodal', 'gainage_ventral', 'squat_unipodal', 'force_squat_ratio'],
      },
      {
        id: 'coordination',
        label: 'Coord.',
        tests: ['parcours_coordination', 'rsa_fatigue', 'rsa_mean'],
      },
    ],

    /**
     * Retourne les données pour le radar chart.
     * @returns {Array} [{ id, label, value (0-100), hasData }]
     */
    getRadarData: function (session, category, refLevel) {
      if (!session || !session.tests) return null;
      var self = this;
      refLevel = refLevel || 'regional';
      var catTests = self.getTestsForCategory(category);
      var result = [];

      self._radarAxes.forEach(function (axis) {
        var sum = 0,
          count = 0;
        axis.tests.forEach(function (testId) {
          if (catTests.indexOf(testId) === -1) return;
          var val = session.tests[testId];
          if (val == null || val === '') return;
          var info = B.physical[testId];
          if (!info) return;
          var score;
          if (info.direction === 'qualitative') {
            score = typeof val === 'string' ? self.levelToScore(val) * 20 : 0;
          } else {
            score = self.normalizeTestValue(testId, val, category, refLevel);
          }
          sum += score;
          count++;
        });
        result.push({
          id: axis.id,
          label: axis.label,
          value: count > 0 ? Math.round(sum / count) : 0,
          hasData: count > 0,
        });
      });

      return result;
    },

    /**
     * Retourne le label textuel d'un Fit Score.
     */
    fitScoreLabel: function (score) {
      if (score == null) return '—';
      if (score >= 90) return 'Elite';
      if (score >= 75) return 'Performant';
      if (score >= 60) return 'Compétitif';
      if (score >= 40) return 'En progression';
      return 'À développer';
    },

    /**
     * Score global pondéré /100.
     * Pondération : physique 25%, technique 20%, tactique 25%, mental 30%.
     * Ne prend en compte que les domaines renseignés.
     * @returns {{ score: number|null, domains: number }}
     */
    computeGlobalScore: function (player) {
      var W = window.DETECTION_BAREMES.globalScoreWeights;
      var scores = this.computeOverallScores(player);
      var totalWeight = 0;
      var weightedSum = 0;

      var mapping = [
        { key: 'physical', weight: W.physical },
        { key: 'technical', weight: W.technical },
        { key: 'tactical', weight: W.tactical },
        { key: 'mental', weight: W.mental },
      ];

      mapping.forEach(function (m) {
        if (scores[m.key] != null) {
          weightedSum += scores[m.key] * m.weight;
          totalWeight += m.weight;
        }
      });

      if (totalWeight === 0) return { score: null, domains: 0 };
      return {
        score: Math.round(weightedSum / totalWeight),
        domains: mapping.filter(function (m) {
          return scores[m.key] != null;
        }).length,
      };
    },

    /**
     * Radar global 8 axes fusionnant les 4 domaines.
     * @returns {Array} [{ id, label, value (0-100), hasData }]
     */
    getGlobalRadarData: function (player) {
      var self = this;
      var scores = self.computeOverallScores(player);

      function avgCriteria(domain, criterionIds) {
        var data = player[domain];
        if (!data || !data.evaluations || data.evaluations.length === 0) return null;
        var sum = 0,
          count = 0;
        data.evaluations.forEach(function (ev) {
          if (criterionIds.indexOf(ev.criterionId) === -1) return;
          if (!ev.level) return;
          sum += self.levelToScore(ev.level) * 20; // 1-5 → 20-100
          count++;
        });
        return count > 0 ? Math.round(sum / count) : null;
      }

      var axes = [
        { id: 'athletisme', label: 'Athlétisme', value: scores.physical },
        {
          id: 'maniement',
          label: 'Maniement/Finition',
          value: avgCriteria('technical', ['T1', 'T5']),
        },
        { id: 'tir', label: 'Tir', value: avgCriteria('technical', ['T2', 'T6']) },
        { id: 'passe', label: 'Passe/Création', value: avgCriteria('technical', ['T3', 'T4']) },
        { id: 'lecture', label: 'Lecture/QI', value: avgCriteria('tactical', ['K1', 'K2']) },
        { id: 'defense', label: 'Défense', value: avgCriteria('tactical', ['K3', 'K4']) },
        {
          id: 'transition',
          label: 'Transition/Collectif',
          value: avgCriteria('tactical', ['K5', 'K6']),
        },
        { id: 'mental', label: 'Mental', value: scores.mental },
      ];

      return axes.map(function (a) {
        return {
          id: a.id,
          label: a.label,
          value: a.value || 0,
          hasData: a.value != null,
        };
      });
    },

    /**
     * Upload une photo dans Firebase Storage.
     * @param {File} file
     * @param {string} playerId
     * @returns {Promise<string>} downloadURL
     */
    uploadPhoto: function (file, playerId) {
      var maxSize = 2 * 1024 * 1024; // 2 Mo
      var allowed = ['image/jpeg', 'image/png', 'image/webp'];

      if (file.size > maxSize) return Promise.reject(new Error('Fichier trop lourd (max 2 Mo)'));
      if (allowed.indexOf(file.type) === -1)
        return Promise.reject(new Error('Format non supporté (jpg, png, webp)'));

      var storage = firebase.storage();
      var path = 'detection-photos/' + playerId + '/' + Date.now() + '_' + file.name;
      var ref = storage.ref(path);

      return ref.put(file).then(function (snapshot) {
        return snapshot.ref.getDownloadURL();
      });
    },
    getActiveTestsForCategory: function (category) {
      const active = JSON.parse(localStorage.getItem('activeTestsByCategory') || '{}');
      return active[category] || B.testsByCategory[category] || [];
    },

    setActiveTestsForCategory: function (category, testIds) {
      let active = JSON.parse(localStorage.getItem('activeTestsByCategory') || '{}');
      active[category] = testIds;
      localStorage.setItem('activeTestsByCategory', JSON.stringify(active));
    },

    // Persistance joueurs
    savePlayer: function (player) {
      let players = JSON.parse(localStorage.getItem('detectionPlayers') || '[]');
      const idx = players.findIndex((p) => p.id === player.id);
      if (idx >= 0) players[idx] = player;
      else players.unshift(player);
      localStorage.setItem('detectionPlayers', JSON.stringify(players));
      return player;
    },

    getAllPlayers: function () {
      return JSON.parse(localStorage.getItem('detectionPlayers') || '[]');
    },

    deletePlayer: function (id) {
      let players = JSON.parse(localStorage.getItem('detectionPlayers') || '[]');
      players = players.filter((p) => p.id !== id);
      localStorage.setItem('detectionPlayers', JSON.stringify(players));
    },
  };
})();
