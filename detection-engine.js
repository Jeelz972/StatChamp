(function() {
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
    evaluatePhysical: function(testId, value, category, refLevel) {
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
          if (t.min !== undefined && t.max !== undefined && value >= t.min && value < t.max) return levels[i];
          if (t.min !== undefined && !t.max && value >= t.min) return levels[i];
        }
      } else { // higher_is_better
        for (var j = 0; j < levels.length; j++) {
          var th = thresholds[levels[j]];
          if (!th) continue;
          if (th.min !== undefined && !th.max && value >= th.min) return levels[j];
          if (th.min !== undefined && th.max !== undefined && value >= th.min && value < th.max) return levels[j];
          if (!th.min && th.max !== undefined && value < th.max) return levels[j];
        }
      }
      return null;
    },

    /**
     * Retourne les testId disponibles pour une catégorie.
     */
    getTestsForCategory: function(category) {
      return (B.testsByCategory[category] || []).slice();
    },

    /**
     * Retourne les infos d'un test physique.
     */
    getTestInfo: function(testId) {
      return B.physical[testId] || null;
    },

    /**
     * Compare deux sessions physiques.
     * @returns {object} { testId: { oldVal, newVal, delta, oldLevel, newLevel, improved } }
     */
    comparePhysicalSessions: function(sessionOld, sessionNew, category, refLevel) {
      refLevel = refLevel || 'regional';
      var self = this;
      var tests = self.getTestsForCategory(category);
      var result = {};

      tests.forEach(function(testId) {
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
          improved: improved
        };
      });

      return result;
    },

    /**
     * Calcule les scores globaux (0-100) par domaine.
     */
    computeOverallScores: function(player) {
      var self = this;
      var result = { physical: null, technical: null, tactical: null };

      // --- PHYSIQUE (dernière session) ---
      if (player.physicalSessions && player.physicalSessions.length > 0) {
        var session = player.physicalSessions[0]; // Plus récente en premier
        var tests = self.getTestsForCategory(player.category);
        var sum = 0, count = 0;
        tests.forEach(function(testId) {
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
      if (player.technical && player.technical.evaluations && player.technical.evaluations.length > 0) {
        var tSum = 0, tCount = 0;
        player.technical.evaluations.forEach(function(ev) {
          if (!ev.level) return;
          tSum += self.levelToScore(ev.level);
          tCount++;
        });
        if (tCount > 0) result.technical = Math.round((tSum / tCount) * 20);
      }

      // --- TACTIQUE ---
      if (player.tactical && player.tactical.evaluations && player.tactical.evaluations.length > 0) {
        var kSum = 0, kCount = 0;
        player.tactical.evaluations.forEach(function(ev) {
          if (!ev.level) return;
          kSum += self.levelToScore(ev.level);
          kCount++;
        });
        if (kCount > 0) result.tactical = Math.round((kSum / kCount) * 20);
      }

      return result;
    },

    /**
     * Convertit un niveau en score numérique.
     */
    levelToScore: function(level) {
      var map = { excellent: 5, tres_bien: 4, bien: 3, moyen: 2, insuffisant: 1 };
      return map[level] || 0;
    },

    /**
     * Retourne la classe Tailwind de couleur pour un niveau.
     */
    levelColor: function(level) {
      var map = {
        excellent:    'text-green-400',
        tres_bien:    'text-emerald-400',
        bien:         'text-blue-400',
        moyen:        'text-amber-400',
        insuffisant:  'text-red-400'
      };
      return map[level] || 'text-slate-400';
    },

    /**
     * Retourne la classe Tailwind bg pour un niveau.
     */
    levelBg: function(level) {
      var map = {
        excellent:    'bg-green-500/20',
        tres_bien:    'bg-emerald-500/20',
        bien:         'bg-blue-500/20',
        moyen:        'bg-amber-500/20',
        insuffisant:  'bg-red-500/20'
      };
      return map[level] || 'bg-slate-500/20';
    },

    /**
     * Calcule la catégorie d'âge depuis la date de naissance.
     * Référence : 1er janvier de la saison en cours.
     * Saison 2025-2026 → année de référence = 2026.
     */
    computeCategory: function(birthDateStr) {
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
    generateId: function(prefix) {
      return (prefix || 'det') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }
  };

})();
