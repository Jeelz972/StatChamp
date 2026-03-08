// nba-profiles.js
// Base de profils NBA pour comparaison PlayerDNA
// Chaque profil = fingerprint normalisé (0-100) + répartition de tirs (%)
// + vecteur Production (stats per-game) + vecteur Style (ratios normalisés)
// Éditable indépendamment du moteur d'analyse
// À terme : remplaçable par un fetch('nba-profiles.json')

(function () {
  'use strict';

  window.NBA_PROFILES = [
    // ═══ GUARDS — SCORERS ═══
    {
      name: 'Stephen Curry',
      fp: { volume: 88, efficiency: 95, shooting: 99, creation: 80, rebounding: 20, interior: 15, defense: 35, impact: 90 },
      shot: { paintPct: 22, midPct: 8, cornerPct: 12, abPct: 58 },
      desc: "Tireur d'élite, gravité offensive maximale",
      prod: { pts: 24.8, reb: 4.7, ast: 6.4, stl: 1.6, blk: 0.2, tov: 3.2, TS: 62.4, usage: 31.2, eff: 21.3 },
      style: { astRatio: 0.20, rebRatio: 0.13, defRatio: 0.14, threePAr: 0.70, ftRate: 0.18, usageNorm: 0.89 }
    },
    {
      name: 'Damian Lillard',
      fp: { volume: 90, efficiency: 80, shooting: 88, creation: 82, rebounding: 15, interior: 20, defense: 30, impact: 78 },
      shot: { paintPct: 28, midPct: 12, cornerPct: 8, abPct: 52 },
      desc: 'Scoreur clutch, range illimité',
      prod: { pts: 25.2, reb: 4.2, ast: 6.7, stl: 1.0, blk: 0.3, tov: 3.0, TS: 59.0, usage: 31.5, eff: 20.5 },
      style: { astRatio: 0.21, rebRatio: 0.12, defRatio: 0.11, threePAr: 0.60, ftRate: 0.28, usageNorm: 0.90 }
    },
    {
      name: 'Devin Booker',
      fp: { volume: 85, efficiency: 82, shooting: 70, creation: 65, rebounding: 18, interior: 35, defense: 32, impact: 75 },
      shot: { paintPct: 32, midPct: 22, cornerPct: 10, abPct: 36 },
      desc: 'Scoreur complet, mid-range + 3PT',
      prod: { pts: 24.5, reb: 4.3, ast: 4.9, stl: 1.0, blk: 0.3, tov: 2.7, TS: 57.5, usage: 28.8, eff: 18.2 },
      style: { astRatio: 0.17, rebRatio: 0.13, defRatio: 0.12, threePAr: 0.46, ftRate: 0.26, usageNorm: 0.82 }
    },
    {
      name: 'Kyrie Irving',
      fp: { volume: 82, efficiency: 88, shooting: 75, creation: 70, rebounding: 15, interior: 40, defense: 28, impact: 70 },
      shot: { paintPct: 35, midPct: 25, cornerPct: 8, abPct: 32 },
      desc: 'Finisseur créatif, technique pure',
      prod: { pts: 23.5, reb: 4.0, ast: 5.6, stl: 1.2, blk: 0.3, tov: 2.6, TS: 58.8, usage: 29.0, eff: 18.5 },
      style: { astRatio: 0.19, rebRatio: 0.12, defRatio: 0.14, threePAr: 0.40, ftRate: 0.22, usageNorm: 0.83 }
    },
    {
      name: 'Donovan Mitchell',
      fp: { volume: 85, efficiency: 72, shooting: 72, creation: 55, rebounding: 18, interior: 35, defense: 35, impact: 68 },
      shot: { paintPct: 35, midPct: 18, cornerPct: 10, abPct: 37 },
      desc: 'Scoreur explosif, attaque le cercle',
      prod: { pts: 24.0, reb: 4.3, ast: 4.6, stl: 1.4, blk: 0.3, tov: 2.8, TS: 56.5, usage: 29.5, eff: 17.0 },
      style: { astRatio: 0.16, rebRatio: 0.13, defRatio: 0.16, threePAr: 0.47, ftRate: 0.25, usageNorm: 0.84 }
    },

    // ═══ GUARDS — CREATORS ═══
    {
      name: 'Chris Paul',
      fp: { volume: 55, efficiency: 85, shooting: 65, creation: 98, rebounding: 18, interior: 30, defense: 50, impact: 88 },
      shot: { paintPct: 30, midPct: 35, cornerPct: 10, abPct: 25 },
      desc: 'Meneur gestionnaire, mid-range clinique',
      prod: { pts: 17.5, reb: 4.5, ast: 9.5, stl: 2.1, blk: 0.1, tov: 2.4, TS: 58.0, usage: 23.0, eff: 18.8 },
      style: { astRatio: 0.35, rebRatio: 0.14, defRatio: 0.14, threePAr: 0.35, ftRate: 0.20, usageNorm: 0.66 }
    },
    {
      name: 'Trae Young',
      fp: { volume: 88, efficiency: 68, shooting: 78, creation: 95, rebounding: 10, interior: 20, defense: 12, impact: 65 },
      shot: { paintPct: 25, midPct: 12, cornerPct: 5, abPct: 58 },
      desc: 'Créateur offensif volume, defense liability',
      prod: { pts: 26.0, reb: 3.7, ast: 9.5, stl: 0.9, blk: 0.1, tov: 4.0, TS: 58.5, usage: 33.0, eff: 19.8 },
      style: { astRatio: 0.27, rebRatio: 0.09, defRatio: 0.07, threePAr: 0.63, ftRate: 0.32, usageNorm: 0.94 }
    },
    {
      name: 'Tyrese Haliburton',
      fp: { volume: 65, efficiency: 82, shooting: 80, creation: 88, rebounding: 15, interior: 15, defense: 42, impact: 78 },
      shot: { paintPct: 22, midPct: 10, cornerPct: 18, abPct: 50 },
      desc: 'Meneur efficace, excellent décision-maker',
      prod: { pts: 19.5, reb: 3.8, ast: 10.0, stl: 1.5, blk: 0.3, tov: 2.5, TS: 61.0, usage: 25.0, eff: 20.0 },
      style: { astRatio: 0.34, rebRatio: 0.11, defRatio: 0.12, threePAr: 0.68, ftRate: 0.15, usageNorm: 0.71 }
    },
    {
      name: 'Jalen Brunson',
      fp: { volume: 80, efficiency: 78, shooting: 55, creation: 72, rebounding: 14, interior: 50, defense: 30, impact: 72 },
      shot: { paintPct: 40, midPct: 28, cornerPct: 8, abPct: 24 },
      desc: 'Meneur physique, mid-range et pénétration',
      prod: { pts: 24.0, reb: 3.5, ast: 6.5, stl: 0.9, blk: 0.2, tov: 2.4, TS: 58.0, usage: 30.0, eff: 18.5 },
      style: { astRatio: 0.21, rebRatio: 0.10, defRatio: 0.10, threePAr: 0.32, ftRate: 0.30, usageNorm: 0.86 }
    },

    // ═══ GUARDS — DEFENSIVE ═══
    {
      name: 'Marcus Smart',
      fp: { volume: 45, efficiency: 50, shooting: 55, creation: 55, rebounding: 18, interior: 25, defense: 88, impact: 68 },
      shot: { paintPct: 30, midPct: 15, cornerPct: 15, abPct: 40 },
      desc: 'Chien de garde, hustle et défense',
      prod: { pts: 12.0, reb: 3.5, ast: 5.0, stl: 1.5, blk: 0.3, tov: 2.0, TS: 52.0, usage: 20.0, eff: 10.5 },
      style: { astRatio: 0.29, rebRatio: 0.17, defRatio: 0.18, threePAr: 0.55, ftRate: 0.18, usageNorm: 0.57 }
    },
    {
      name: 'Jrue Holiday',
      fp: { volume: 55, efficiency: 78, shooting: 60, creation: 65, rebounding: 22, interior: 30, defense: 90, impact: 82 },
      shot: { paintPct: 35, midPct: 18, cornerPct: 12, abPct: 35 },
      desc: 'Two-way guard complet, défense élite sur porteurs de balle',
      prod: { pts: 17.5, reb: 4.5, ast: 6.0, stl: 1.6, blk: 0.4, tov: 2.2, TS: 56.5, usage: 22.5, eff: 16.0 },
      style: { astRatio: 0.26, rebRatio: 0.16, defRatio: 0.16, threePAr: 0.47, ftRate: 0.18, usageNorm: 0.64 }
    },
    {
      name: 'Dejounte Murray',
      fp: { volume: 60, efficiency: 65, shooting: 45, creation: 70, rebounding: 35, interior: 35, defense: 82, impact: 68 },
      shot: { paintPct: 40, midPct: 22, cornerPct: 8, abPct: 30 },
      desc: 'Meneur défensif, rebondeur atypique pour un guard',
      prod: { pts: 18.5, reb: 6.5, ast: 7.0, stl: 2.0, blk: 0.4, tov: 2.8, TS: 53.5, usage: 25.0, eff: 17.5 },
      style: { astRatio: 0.27, rebRatio: 0.20, defRatio: 0.15, threePAr: 0.38, ftRate: 0.20, usageNorm: 0.71 }
    },

    // ═══ FORWARDS — PLAYMAKERS ═══
    {
      name: 'LeBron James',
      fp: { volume: 85, efficiency: 82, shooting: 60, creation: 90, rebounding: 45, interior: 55, defense: 60, impact: 95 },
      shot: { paintPct: 38, midPct: 15, cornerPct: 10, abPct: 37 },
      desc: 'Point forward ultime, fait tout',
      prod: { pts: 27.1, reb: 7.4, ast: 7.4, stl: 1.5, blk: 0.8, tov: 3.5, TS: 59.5, usage: 31.0, eff: 26.0 },
      style: { astRatio: 0.21, rebRatio: 0.18, defRatio: 0.13, threePAr: 0.47, ftRate: 0.28, usageNorm: 0.89 }
    },
    {
      name: 'Luka Doncic',
      fp: { volume: 92, efficiency: 72, shooting: 65, creation: 92, rebounding: 40, interior: 40, defense: 28, impact: 82 },
      shot: { paintPct: 32, midPct: 15, cornerPct: 8, abPct: 45 },
      desc: 'Créateur dominant, usage massif',
      prod: { pts: 28.5, reb: 8.5, ast: 8.5, stl: 1.3, blk: 0.4, tov: 3.8, TS: 58.0, usage: 34.5, eff: 25.0 },
      style: { astRatio: 0.23, rebRatio: 0.19, defRatio: 0.09, threePAr: 0.53, ftRate: 0.30, usageNorm: 0.99 }
    },
    {
      name: 'Nikola Jokic',
      fp: { volume: 80, efficiency: 90, shooting: 55, creation: 95, rebounding: 65, interior: 60, defense: 40, impact: 95 },
      shot: { paintPct: 40, midPct: 25, cornerPct: 5, abPct: 30 },
      desc: 'Pivot-meneur, vision + efficacité',
      prod: { pts: 24.8, reb: 11.5, ast: 9.0, stl: 1.3, blk: 0.7, tov: 3.2, TS: 64.5, usage: 28.5, eff: 30.0 },
      style: { astRatio: 0.27, rebRatio: 0.25, defRatio: 0.09, threePAr: 0.35, ftRate: 0.25, usageNorm: 0.81 }
    },
    {
      name: 'Draymond Green',
      fp: { volume: 18, efficiency: 55, shooting: 30, creation: 72, rebounding: 45, interior: 35, defense: 92, impact: 78 },
      shot: { paintPct: 55, midPct: 10, cornerPct: 15, abPct: 20 },
      desc: 'Défenseur-créateur, QI basket élite',
      prod: { pts: 8.0, reb: 6.8, ast: 5.8, stl: 1.4, blk: 1.0, tov: 2.5, TS: 55.0, usage: 14.5, eff: 12.5 },
      style: { astRatio: 0.42, rebRatio: 0.33, defRatio: 0.17, threePAr: 0.35, ftRate: 0.18, usageNorm: 0.41 }
    },

    // ═══ WINGS — TWO-WAY ═══
    {
      name: 'Kawhi Leonard',
      fp: { volume: 80, efficiency: 88, shooting: 68, creation: 50, rebounding: 35, interior: 40, defense: 90, impact: 88 },
      shot: { paintPct: 30, midPct: 30, cornerPct: 12, abPct: 28 },
      desc: 'Two-way dominant, mid-range mortel',
      prod: { pts: 24.5, reb: 6.5, ast: 4.0, stl: 1.8, blk: 0.5, tov: 2.3, TS: 60.5, usage: 30.0, eff: 21.0 },
      style: { astRatio: 0.14, rebRatio: 0.19, defRatio: 0.18, threePAr: 0.40, ftRate: 0.28, usageNorm: 0.86 }
    },
    {
      name: 'Paul George',
      fp: { volume: 78, efficiency: 78, shooting: 80, creation: 50, rebounding: 30, interior: 28, defense: 80, impact: 78 },
      shot: { paintPct: 25, midPct: 18, cornerPct: 15, abPct: 42 },
      desc: 'Ailier two-way, polyvalent des deux côtés',
      prod: { pts: 21.0, reb: 6.0, ast: 3.8, stl: 1.5, blk: 0.4, tov: 2.5, TS: 58.0, usage: 27.0, eff: 17.0 },
      style: { astRatio: 0.15, rebRatio: 0.19, defRatio: 0.17, threePAr: 0.57, ftRate: 0.22, usageNorm: 0.77 }
    },
    {
      name: 'Jimmy Butler',
      fp: { volume: 72, efficiency: 82, shooting: 30, creation: 65, rebounding: 30, interior: 65, defense: 82, impact: 85 },
      shot: { paintPct: 48, midPct: 28, cornerPct: 8, abPct: 16 },
      desc: 'Two-way physique, attaque le cercle et la ligne',
      prod: { pts: 21.5, reb: 6.0, ast: 5.8, stl: 1.8, blk: 0.4, tov: 2.2, TS: 59.5, usage: 25.5, eff: 21.0 },
      style: { astRatio: 0.21, rebRatio: 0.18, defRatio: 0.16, threePAr: 0.24, ftRate: 0.40, usageNorm: 0.73 }
    },

    // ═══ WINGS — SCORERS ═══
    {
      name: 'Jayson Tatum',
      fp: { volume: 88, efficiency: 75, shooting: 72, creation: 55, rebounding: 40, interior: 35, defense: 65, impact: 82 },
      shot: { paintPct: 28, midPct: 18, cornerPct: 12, abPct: 42 },
      desc: 'Ailier scoreur complet, all-around',
      prod: { pts: 26.0, reb: 8.0, ast: 4.5, stl: 1.1, blk: 0.7, tov: 2.8, TS: 58.0, usage: 30.5, eff: 22.5 },
      style: { astRatio: 0.15, rebRatio: 0.21, defRatio: 0.13, threePAr: 0.54, ftRate: 0.25, usageNorm: 0.87 }
    },
    {
      name: 'Brandon Ingram',
      fp: { volume: 78, efficiency: 75, shooting: 55, creation: 55, rebounding: 25, interior: 50, defense: 30, impact: 55 },
      shot: { paintPct: 38, midPct: 28, cornerPct: 8, abPct: 26 },
      desc: 'Scoreur longiligne, mid-range et drive',
      prod: { pts: 22.0, reb: 5.2, ast: 5.0, stl: 0.8, blk: 0.5, tov: 2.5, TS: 56.5, usage: 28.0, eff: 16.5 },
      style: { astRatio: 0.19, rebRatio: 0.16, defRatio: 0.11, threePAr: 0.34, ftRate: 0.28, usageNorm: 0.80 }
    },
    {
      name: 'DeMar DeRozan',
      fp: { volume: 82, efficiency: 80, shooting: 15, creation: 65, rebounding: 20, interior: 50, defense: 35, impact: 75 },
      shot: { paintPct: 35, midPct: 50, cornerPct: 5, abPct: 10 },
      desc: 'Maître absolu du mid-range et des lancers francs',
      prod: { pts: 22.5, reb: 4.5, ast: 5.2, stl: 1.0, blk: 0.3, tov: 2.2, TS: 56.0, usage: 28.0, eff: 17.5 },
      style: { astRatio: 0.19, rebRatio: 0.14, defRatio: 0.12, threePAr: 0.15, ftRate: 0.38, usageNorm: 0.80 }
    },
    {
      name: 'Khris Middleton',
      fp: { volume: 70, efficiency: 82, shooting: 75, creation: 55, rebounding: 25, interior: 20, defense: 55, impact: 72 },
      shot: { paintPct: 20, midPct: 35, cornerPct: 10, abPct: 35 },
      desc: 'Ailier complet, shot-maker sur demi-terrain',
      prod: { pts: 20.0, reb: 5.5, ast: 4.5, stl: 1.0, blk: 0.2, tov: 2.2, TS: 58.5, usage: 25.5, eff: 16.5 },
      style: { astRatio: 0.18, rebRatio: 0.18, defRatio: 0.11, threePAr: 0.45, ftRate: 0.25, usageNorm: 0.73 }
    },
    {
      name: 'Michael Porter Jr.',
      fp: { volume: 65, efficiency: 85, shooting: 90, creation: 10, rebounding: 35, interior: 25, defense: 45, impact: 70 },
      shot: { paintPct: 25, midPct: 15, cornerPct: 15, abPct: 45 },
      desc: 'Finisseur élite de grande taille, catch & shoot',
      prod: { pts: 17.5, reb: 7.5, ast: 1.5, stl: 0.7, blk: 0.8, tov: 1.2, TS: 63.0, usage: 22.0, eff: 16.5 },
      style: { astRatio: 0.08, rebRatio: 0.28, defRatio: 0.14, threePAr: 0.60, ftRate: 0.15, usageNorm: 0.63 }
    },
    {
      name: 'Kyle Kuzma',
      fp: { volume: 75, efficiency: 65, shooting: 65, creation: 45, rebounding: 35, interior: 35, defense: 35, impact: 55 },
      shot: { paintPct: 35, midPct: 15, cornerPct: 10, abPct: 40 },
      desc: 'Ailier fort volume, attaquant polyvalent mais inefficace',
      prod: { pts: 18.5, reb: 6.5, ast: 2.8, stl: 0.6, blk: 0.5, tov: 2.0, TS: 54.0, usage: 25.0, eff: 13.5 },
      style: { astRatio: 0.13, rebRatio: 0.23, defRatio: 0.10, threePAr: 0.50, ftRate: 0.22, usageNorm: 0.71 }
    },

    // ═══ WINGS — SHOOTERS ═══
    {
      name: 'Klay Thompson',
      fp: { volume: 70, efficiency: 80, shooting: 95, creation: 20, rebounding: 15, interior: 15, defense: 60, impact: 72 },
      shot: { paintPct: 15, midPct: 10, cornerPct: 18, abPct: 57 },
      desc: 'Sniper pur, catch & shoot élite',
      prod: { pts: 19.5, reb: 3.5, ast: 2.3, stl: 0.8, blk: 0.5, tov: 1.5, TS: 57.0, usage: 24.5, eff: 13.0 },
      style: { astRatio: 0.11, rebRatio: 0.14, defRatio: 0.18, threePAr: 0.75, ftRate: 0.12, usageNorm: 0.70 }
    },
    {
      name: 'Mikal Bridges',
      fp: { volume: 60, efficiency: 78, shooting: 75, creation: 25, rebounding: 18, interior: 20, defense: 78, impact: 72 },
      shot: { paintPct: 25, midPct: 12, cornerPct: 22, abPct: 41 },
      desc: '3-and-D moderne, très efficace',
      prod: { pts: 16.5, reb: 4.0, ast: 2.5, stl: 1.0, blk: 0.5, tov: 1.5, TS: 59.0, usage: 21.0, eff: 13.0 },
      style: { astRatio: 0.13, rebRatio: 0.17, defRatio: 0.19, threePAr: 0.63, ftRate: 0.15, usageNorm: 0.60 }
    },
    {
      name: 'Buddy Hield',
      fp: { volume: 55, efficiency: 72, shooting: 92, creation: 15, rebounding: 14, interior: 10, defense: 25, impact: 45 },
      shot: { paintPct: 12, midPct: 8, cornerPct: 20, abPct: 60 },
      desc: 'Spécialiste 3PT pur, spacing',
      prod: { pts: 15.5, reb: 3.8, ast: 2.0, stl: 0.8, blk: 0.2, tov: 1.5, TS: 57.5, usage: 21.0, eff: 10.5 },
      style: { astRatio: 0.11, rebRatio: 0.18, defRatio: 0.15, threePAr: 0.80, ftRate: 0.10, usageNorm: 0.60 }
    },
    {
      name: 'Desmond Bane',
      fp: { volume: 65, efficiency: 78, shooting: 82, creation: 35, rebounding: 18, interior: 22, defense: 50, impact: 68 },
      shot: { paintPct: 22, midPct: 12, cornerPct: 16, abPct: 50 },
      desc: 'Tireur polyvalent, bon des deux côtés',
      prod: { pts: 19.0, reb: 4.5, ast: 3.8, stl: 1.0, blk: 0.3, tov: 1.8, TS: 59.0, usage: 24.0, eff: 15.0 },
      style: { astRatio: 0.17, rebRatio: 0.16, defRatio: 0.14, threePAr: 0.66, ftRate: 0.18, usageNorm: 0.69 }
    },
    {
      name: 'Duncan Robinson',
      fp: { volume: 45, efficiency: 75, shooting: 98, creation: 15, rebounding: 10, interior: 5, defense: 15, impact: 55 },
      shot: { paintPct: 5, midPct: 2, cornerPct: 23, abPct: 70 },
      desc: 'Shooteur exclusif, mouvement sans ballon',
      prod: { pts: 12.0, reb: 2.8, ast: 1.8, stl: 0.5, blk: 0.2, tov: 0.8, TS: 60.0, usage: 17.0, eff: 9.0 },
      style: { astRatio: 0.13, rebRatio: 0.17, defRatio: 0.13, threePAr: 0.93, ftRate: 0.08, usageNorm: 0.49 }
    },
    {
      name: 'Seth Curry',
      fp: { volume: 50, efficiency: 82, shooting: 88, creation: 25, rebounding: 10, interior: 10, defense: 15, impact: 50 },
      shot: { paintPct: 15, midPct: 25, cornerPct: 10, abPct: 50 },
      desc: 'Sniper très efficace, un peu de création secondaire',
      prod: { pts: 12.5, reb: 2.2, ast: 2.5, stl: 0.6, blk: 0.1, tov: 1.0, TS: 62.0, usage: 18.0, eff: 10.0 },
      style: { astRatio: 0.17, rebRatio: 0.13, defRatio: 0.13, threePAr: 0.60, ftRate: 0.12, usageNorm: 0.51 }
    },
    {
      name: 'Davis Bertans',
      fp: { volume: 35, efficiency: 65, shooting: 90, creation: 5, rebounding: 15, interior: 5, defense: 8, impact: 30 },
      shot: { paintPct: 2, midPct: 3, cornerPct: 15, abPct: 80 },
      desc: 'Stretch 4/5 extrême, aucune présence intérieure',
      prod: { pts: 10.0, reb: 3.0, ast: 1.0, stl: 0.4, blk: 0.3, tov: 0.8, TS: 59.0, usage: 16.0, eff: 7.5 },
      style: { astRatio: 0.09, rebRatio: 0.21, defRatio: 0.15, threePAr: 0.95, ftRate: 0.08, usageNorm: 0.46 }
    },

    // ═══ CONNECTORS & POINT FORWARDS ═══
    {
      name: 'Scottie Barnes',
      fp: { volume: 72, efficiency: 68, shooting: 55, creation: 70, rebounding: 45, interior: 60, defense: 80, impact: 75 },
      shot: { paintPct: 50, midPct: 15, cornerPct: 10, abPct: 25 },
      desc: 'Ailier à tout faire, physique, vision et défense',
      prod: { pts: 18.0, reb: 7.5, ast: 5.0, stl: 1.2, blk: 0.8, tov: 2.5, TS: 55.0, usage: 24.0, eff: 17.0 },
      style: { astRatio: 0.22, rebRatio: 0.25, defRatio: 0.15, threePAr: 0.35, ftRate: 0.25, usageNorm: 0.69 }
    },
    {
      name: 'Franz Wagner',
      fp: { volume: 72, efficiency: 72, shooting: 55, creation: 50, rebounding: 25, interior: 55, defense: 65, impact: 70 },
      shot: { paintPct: 45, midPct: 15, cornerPct: 10, abPct: 30 },
      desc: 'Ailier très intelligent, coupeur et créateur secondaire',
      prod: { pts: 20.0, reb: 5.5, ast: 4.0, stl: 1.0, blk: 0.4, tov: 2.2, TS: 57.0, usage: 26.0, eff: 16.0 },
      style: { astRatio: 0.17, rebRatio: 0.19, defRatio: 0.13, threePAr: 0.40, ftRate: 0.28, usageNorm: 0.74 }
    },
    {
      name: 'Paolo Banchero',
      fp: { volume: 85, efficiency: 65, shooting: 55, creation: 65, rebounding: 35, interior: 55, defense: 50, impact: 75 },
      shot: { paintPct: 40, midPct: 25, cornerPct: 10, abPct: 25 },
      desc: 'Ailier fort créateur, physique imposant, mismatch constant',
      prod: { pts: 22.5, reb: 6.8, ast: 5.0, stl: 0.8, blk: 0.5, tov: 3.0, TS: 54.5, usage: 29.0, eff: 17.0 },
      style: { astRatio: 0.18, rebRatio: 0.20, defRatio: 0.10, threePAr: 0.35, ftRate: 0.30, usageNorm: 0.83 }
    },
    {
      name: 'Aaron Gordon',
      fp: { volume: 50, efficiency: 80, shooting: 40, creation: 35, rebounding: 30, interior: 65, defense: 55, impact: 72 },
      shot: { paintPct: 50, midPct: 15, cornerPct: 10, abPct: 25 },
      desc: 'Ailier fort connecteur, dunk et défense',
      prod: { pts: 14.5, reb: 6.0, ast: 3.0, stl: 0.8, blk: 0.7, tov: 1.5, TS: 60.5, usage: 19.0, eff: 14.0 },
      style: { astRatio: 0.17, rebRatio: 0.26, defRatio: 0.14, threePAr: 0.35, ftRate: 0.18, usageNorm: 0.54 }
    },

    // ═══ BIGS — INTERIOR ═══
    {
      name: 'Giannis Antetokounmpo',
      fp: { volume: 92, efficiency: 85, shooting: 15, creation: 60, rebounding: 62, interior: 95, defense: 75, impact: 92 },
      shot: { paintPct: 72, midPct: 15, cornerPct: 2, abPct: 11 },
      desc: 'Force de la nature, attaque le cercle',
      prod: { pts: 28.5, reb: 11.5, ast: 5.5, stl: 1.2, blk: 1.3, tov: 3.5, TS: 61.0, usage: 34.0, eff: 28.5 },
      style: { astRatio: 0.16, rebRatio: 0.25, defRatio: 0.13, threePAr: 0.13, ftRate: 0.42, usageNorm: 0.97 }
    },
    {
      name: 'Joel Embiid',
      fp: { volume: 88, efficiency: 82, shooting: 45, creation: 40, rebounding: 55, interior: 90, defense: 72, impact: 85 },
      shot: { paintPct: 45, midPct: 25, cornerPct: 5, abPct: 25 },
      desc: 'Pivot scoreur dominant, post + face-up',
      prod: { pts: 28.0, reb: 11.0, ast: 3.5, stl: 1.0, blk: 1.7, tov: 3.3, TS: 62.0, usage: 33.5, eff: 27.0 },
      style: { astRatio: 0.11, rebRatio: 0.26, defRatio: 0.17, threePAr: 0.30, ftRate: 0.42, usageNorm: 0.96 }
    },
    {
      name: 'Anthony Davis',
      fp: { volume: 78, efficiency: 82, shooting: 30, creation: 30, rebounding: 60, interior: 82, defense: 88, impact: 85 },
      shot: { paintPct: 55, midPct: 25, cornerPct: 3, abPct: 17 },
      desc: 'Intérieur two-way, protection de cercle',
      prod: { pts: 24.0, reb: 10.5, ast: 2.8, stl: 1.2, blk: 2.3, tov: 2.2, TS: 59.0, usage: 28.0, eff: 24.5 },
      style: { astRatio: 0.10, rebRatio: 0.28, defRatio: 0.21, threePAr: 0.20, ftRate: 0.32, usageNorm: 0.80 }
    },
    {
      name: 'Rudy Gobert',
      fp: { volume: 15, efficiency: 75, shooting: 0, creation: 8, rebounding: 85, interior: 88, defense: 95, impact: 72 },
      shot: { paintPct: 95, midPct: 5, cornerPct: 0, abPct: 0 },
      desc: 'Ancre défensive pure, rim protector',
      prod: { pts: 12.5, reb: 12.5, ast: 1.2, stl: 0.7, blk: 2.1, tov: 1.5, TS: 66.0, usage: 14.0, eff: 17.5 },
      style: { astRatio: 0.05, rebRatio: 0.48, defRatio: 0.17, threePAr: 0.00, ftRate: 0.25, usageNorm: 0.40 }
    },
    {
      name: 'Bam Adebayo',
      fp: { volume: 75, efficiency: 75, shooting: 15, creation: 55, rebounding: 55, interior: 60, defense: 95, impact: 85 },
      shot: { paintPct: 60, midPct: 25, cornerPct: 5, abPct: 10 },
      desc: 'Pivot two-way, switchable, hub offensif court',
      prod: { pts: 19.5, reb: 9.5, ast: 3.5, stl: 1.2, blk: 0.8, tov: 2.5, TS: 56.0, usage: 24.0, eff: 18.5 },
      style: { astRatio: 0.15, rebRatio: 0.29, defRatio: 0.13, threePAr: 0.15, ftRate: 0.28, usageNorm: 0.69 }
    },
    {
      name: 'Domantas Sabonis',
      fp: { volume: 75, efficiency: 85, shooting: 10, creation: 85, rebounding: 85, interior: 80, defense: 45, impact: 82 },
      shot: { paintPct: 80, midPct: 15, cornerPct: 0, abPct: 5 },
      desc: 'Hub offensif, rebond et passes, pas de tir extérieur',
      prod: { pts: 19.0, reb: 12.5, ast: 6.5, stl: 0.8, blk: 0.5, tov: 3.0, TS: 61.0, usage: 24.5, eff: 24.0 },
      style: { astRatio: 0.25, rebRatio: 0.33, defRatio: 0.06, threePAr: 0.05, ftRate: 0.22, usageNorm: 0.70 }
    },
    {
      name: 'Alperen Sengun',
      fp: { volume: 78, efficiency: 78, shooting: 20, creation: 75, rebounding: 55, interior: 85, defense: 45, impact: 78 },
      shot: { paintPct: 70, midPct: 20, cornerPct: 0, abPct: 10 },
      desc: 'Pivot très technique, footwork et vision de jeu',
      prod: { pts: 18.0, reb: 9.0, ast: 5.0, stl: 0.8, blk: 0.8, tov: 2.8, TS: 59.0, usage: 25.0, eff: 18.5 },
      style: { astRatio: 0.22, rebRatio: 0.28, defRatio: 0.10, threePAr: 0.10, ftRate: 0.30, usageNorm: 0.71 }
    },

    // ═══ BIGS — STRETCH ═══
    {
      name: 'Karl-Anthony Towns',
      fp: { volume: 75, efficiency: 78, shooting: 72, creation: 30, rebounding: 55, interior: 55, defense: 35, impact: 65 },
      shot: { paintPct: 30, midPct: 12, cornerPct: 10, abPct: 48 },
      desc: 'Pivot shooteur, stretch 5 offensif',
      prod: { pts: 22.0, reb: 10.0, ast: 3.0, stl: 0.8, blk: 1.0, tov: 2.5, TS: 61.5, usage: 27.5, eff: 20.0 },
      style: { astRatio: 0.12, rebRatio: 0.29, defRatio: 0.12, threePAr: 0.58, ftRate: 0.22, usageNorm: 0.79 }
    },
    {
      name: 'Kristaps Porzingis',
      fp: { volume: 70, efficiency: 80, shooting: 72, creation: 15, rebounding: 45, interior: 55, defense: 70, impact: 70 },
      shot: { paintPct: 35, midPct: 15, cornerPct: 8, abPct: 42 },
      desc: 'Unicorn, shoot et protection de cercle',
      prod: { pts: 20.5, reb: 8.5, ast: 1.8, stl: 0.7, blk: 1.8, tov: 1.5, TS: 60.5, usage: 26.0, eff: 19.0 },
      style: { astRatio: 0.08, rebRatio: 0.28, defRatio: 0.20, threePAr: 0.50, ftRate: 0.22, usageNorm: 0.74 }
    },
    {
      name: 'Brook Lopez',
      fp: { volume: 55, efficiency: 78, shooting: 70, creation: 10, rebounding: 30, interior: 45, defense: 75, impact: 68 },
      shot: { paintPct: 25, midPct: 8, cornerPct: 12, abPct: 55 },
      desc: 'Stretch 5, spacing + rim protection',
      prod: { pts: 14.5, reb: 5.0, ast: 1.5, stl: 0.5, blk: 2.5, tov: 1.0, TS: 59.0, usage: 20.0, eff: 14.0 },
      style: { astRatio: 0.09, rebRatio: 0.24, defRatio: 0.32, threePAr: 0.67, ftRate: 0.12, usageNorm: 0.57 }
    },
    {
      name: 'Myles Turner',
      fp: { volume: 50, efficiency: 78, shooting: 72, creation: 10, rebounding: 35, interior: 50, defense: 82, impact: 68 },
      shot: { paintPct: 30, midPct: 10, cornerPct: 10, abPct: 50 },
      desc: 'Stretch 5 + rim protector, spacing et contres',
      prod: { pts: 13.5, reb: 6.5, ast: 1.2, stl: 0.6, blk: 2.5, tov: 1.2, TS: 59.5, usage: 19.5, eff: 14.5 },
      style: { astRatio: 0.08, rebRatio: 0.31, defRatio: 0.29, threePAr: 0.60, ftRate: 0.12, usageNorm: 0.56 }
    },
    {
      name: 'Naz Reid',
      fp: { volume: 60, efficiency: 75, shooting: 80, creation: 25, rebounding: 25, interior: 50, defense: 45, impact: 65 },
      shot: { paintPct: 40, midPct: 5, cornerPct: 15, abPct: 40 },
      desc: 'Intérieur très mobile, shoot à 3PT et drives',
      prod: { pts: 14.5, reb: 5.5, ast: 1.8, stl: 0.6, blk: 1.2, tov: 1.2, TS: 60.0, usage: 21.0, eff: 13.5 },
      style: { astRatio: 0.11, rebRatio: 0.25, defRatio: 0.20, threePAr: 0.55, ftRate: 0.18, usageNorm: 0.60 }
    },
    {
      name: 'Kelly Olynyk',
      fp: { volume: 40, efficiency: 72, shooting: 65, creation: 60, rebounding: 25, interior: 35, defense: 30, impact: 55 },
      shot: { paintPct: 35, midPct: 15, cornerPct: 15, abPct: 35 },
      desc: 'Pivot créateur et shooteur, QI basket',
      prod: { pts: 10.5, reb: 5.0, ast: 3.5, stl: 0.5, blk: 0.5, tov: 1.5, TS: 58.0, usage: 17.0, eff: 11.5 },
      style: { astRatio: 0.25, rebRatio: 0.26, defRatio: 0.11, threePAr: 0.50, ftRate: 0.20, usageNorm: 0.49 }
    },
    {
      name: 'Al Horford',
      fp: { volume: 35, efficiency: 78, shooting: 72, creation: 40, rebounding: 35, interior: 40, defense: 72, impact: 72 },
      shot: { paintPct: 28, midPct: 12, cornerPct: 15, abPct: 45 },
      desc: 'Pivot vétéran, spacing, défense intelligente',
      prod: { pts: 11.0, reb: 6.5, ast: 3.5, stl: 0.7, blk: 1.2, tov: 1.2, TS: 60.0, usage: 16.5, eff: 14.0 },
      style: { astRatio: 0.24, rebRatio: 0.31, defRatio: 0.16, threePAr: 0.60, ftRate: 0.12, usageNorm: 0.47 }
    },

    // ═══ BIGS — PURE RIM PROTECTORS / REBOUNDERS ═══
    {
      name: 'Robert Williams',
      fp: { volume: 25, efficiency: 85, shooting: 0, creation: 20, rebounding: 60, interior: 85, defense: 82, impact: 72 },
      shot: { paintPct: 92, midPct: 8, cornerPct: 0, abPct: 0 },
      desc: 'Lob threat, rim runner + défense',
      prod: { pts: 10.0, reb: 8.5, ast: 2.0, stl: 0.8, blk: 2.0, tov: 1.0, TS: 72.0, usage: 13.0, eff: 16.0 },
      style: { astRatio: 0.17, rebRatio: 0.41, defRatio: 0.21, threePAr: 0.00, ftRate: 0.15, usageNorm: 0.37 }
    },
    {
      name: 'Mitchell Robinson',
      fp: { volume: 15, efficiency: 80, shooting: 0, creation: 5, rebounding: 85, interior: 85, defense: 85, impact: 65 },
      shot: { paintPct: 98, midPct: 2, cornerPct: 0, abPct: 0 },
      desc: 'Contreur et rebondeur offensif, zéro tir',
      prod: { pts: 8.0, reb: 8.5, ast: 0.5, stl: 0.5, blk: 2.0, tov: 0.8, TS: 70.0, usage: 10.5, eff: 13.5 },
      style: { astRatio: 0.06, rebRatio: 0.50, defRatio: 0.22, threePAr: 0.00, ftRate: 0.22, usageNorm: 0.30 }
    },
    {
      name: 'Clint Capela',
      fp: { volume: 35, efficiency: 75, shooting: 0, creation: 5, rebounding: 80, interior: 85, defense: 65, impact: 60 },
      shot: { paintPct: 95, midPct: 5, cornerPct: 0, abPct: 0 },
      desc: 'Rouleur classique, lobs et protection de cercle',
      prod: { pts: 12.0, reb: 11.0, ast: 1.0, stl: 0.5, blk: 1.5, tov: 1.2, TS: 65.5, usage: 15.0, eff: 16.0 },
      style: { astRatio: 0.08, rebRatio: 0.46, defRatio: 0.15, threePAr: 0.00, ftRate: 0.20, usageNorm: 0.43 }
    },
    {
      name: 'Ivica Zubac',
      fp: { volume: 35, efficiency: 78, shooting: 0, creation: 15, rebounding: 75, interior: 80, defense: 60, impact: 60 },
      shot: { paintPct: 92, midPct: 8, cornerPct: 0, abPct: 0 },
      desc: 'Pivot traditionnel, rebond, hook shots, écrans',
      prod: { pts: 11.5, reb: 10.0, ast: 1.8, stl: 0.5, blk: 1.2, tov: 1.5, TS: 63.0, usage: 16.0, eff: 15.0 },
      style: { astRatio: 0.13, rebRatio: 0.43, defRatio: 0.13, threePAr: 0.00, ftRate: 0.25, usageNorm: 0.46 }
    },

    // ═══ TRADITIONAL BIGS & REBOUNDING MACHINES ═══
    {
      name: 'Andre Drummond',
      fp: { volume: 30, efficiency: 60, shooting: 0, creation: 5, rebounding: 99, interior: 75, defense: 50, impact: 40 },
      shot: { paintPct: 95, midPct: 5, cornerPct: 0, abPct: 0 },
      desc: 'Aspirateur à rebonds offensifs, finition hasardeuse',
      prod: { pts: 10.5, reb: 13.5, ast: 1.5, stl: 1.0, blk: 1.2, tov: 1.8, TS: 54.0, usage: 16.5, eff: 15.5 },
      style: { astRatio: 0.13, rebRatio: 0.53, defRatio: 0.14, threePAr: 0.00, ftRate: 0.22, usageNorm: 0.47 }
    },
    {
      name: 'Steven Adams',
      fp: { volume: 20, efficiency: 65, shooting: 0, creation: 35, rebounding: 95, interior: 75, defense: 65, impact: 65 },
      shot: { paintPct: 95, midPct: 5, cornerPct: 0, abPct: 0 },
      desc: "Poseur d'écrans d'élite, monstre au rebond offensif",
      prod: { pts: 9.5, reb: 10.0, ast: 2.5, stl: 0.8, blk: 0.8, tov: 1.5, TS: 60.0, usage: 12.5, eff: 14.0 },
      style: { astRatio: 0.21, rebRatio: 0.45, defRatio: 0.11, threePAr: 0.00, ftRate: 0.18, usageNorm: 0.36 }
    },
    {
      name: 'Isaiah Hartenstein',
      fp: { volume: 25, efficiency: 75, shooting: 5, creation: 45, rebounding: 65, interior: 60, defense: 80, impact: 72 },
      shot: { paintPct: 80, midPct: 18, cornerPct: 2, abPct: 0 },
      desc: 'Pivot très complet sans ballon, floater et bonnes passes',
      prod: { pts: 9.0, reb: 8.5, ast: 3.0, stl: 0.8, blk: 1.2, tov: 1.2, TS: 62.0, usage: 14.0, eff: 14.5 },
      style: { astRatio: 0.25, rebRatio: 0.41, defRatio: 0.15, threePAr: 0.02, ftRate: 0.20, usageNorm: 0.40 }
    },
    {
      name: 'Kevon Looney',
      fp: { volume: 15, efficiency: 65, shooting: 0, creation: 25, rebounding: 70, interior: 45, defense: 60, impact: 55 },
      shot: { paintPct: 90, midPct: 10, cornerPct: 0, abPct: 0 },
      desc: "Soldat de l'ombre, rebonds offensifs et écrans",
      prod: { pts: 6.0, reb: 8.0, ast: 2.0, stl: 0.5, blk: 0.5, tov: 1.0, TS: 60.0, usage: 10.0, eff: 10.5 },
      style: { astRatio: 0.25, rebRatio: 0.50, defRatio: 0.09, threePAr: 0.00, ftRate: 0.15, usageNorm: 0.29 }
    },
    {
      name: 'Dennis Rodman',
      fp: { volume: 8, efficiency: 50, shooting: 5, creation: 10, rebounding: 99, interior: 70, defense: 85, impact: 70 },
      shot: { paintPct: 90, midPct: 10, cornerPct: 0, abPct: 0 },
      desc: 'Rebondeur historique, énergie pure',
      prod: { pts: 7.5, reb: 13.0, ast: 1.8, stl: 0.7, blk: 0.5, tov: 1.2, TS: 52.0, usage: 9.0, eff: 13.0 },
      style: { astRatio: 0.19, rebRatio: 0.58, defRatio: 0.07, threePAr: 0.00, ftRate: 0.18, usageNorm: 0.26 }
    },
    {
      name: 'Bismack Biyombo',
      fp: { volume: 15, efficiency: 45, shooting: 0, creation: 5, rebounding: 65, interior: 60, defense: 60, impact: 30 },
      shot: { paintPct: 95, midPct: 5, cornerPct: 0, abPct: 0 },
      desc: "Pivot physique à l'ancienne, très limité offensivement",
      prod: { pts: 5.5, reb: 6.0, ast: 0.5, stl: 0.3, blk: 1.2, tov: 0.8, TS: 52.0, usage: 11.0, eff: 7.0 },
      style: { astRatio: 0.08, rebRatio: 0.50, defRatio: 0.19, threePAr: 0.00, ftRate: 0.25, usageNorm: 0.31 }
    },

    // ═══ MODERN SUPERSTARS & ALL-STARS ═══
    {
      name: 'Shai Gilgeous-Alexander',
      fp: { volume: 90, efficiency: 88, shooting: 40, creation: 75, rebounding: 25, interior: 70, defense: 75, impact: 92 },
      shot: { paintPct: 45, midPct: 30, cornerPct: 5, abPct: 20 },
      desc: "Slasher d'élite, roi du mid-range et provocateur de fautes",
      prod: { pts: 30.0, reb: 5.5, ast: 6.2, stl: 2.0, blk: 0.8, tov: 2.5, TS: 63.5, usage: 33.0, eff: 27.0 },
      style: { astRatio: 0.17, rebRatio: 0.13, defRatio: 0.19, threePAr: 0.25, ftRate: 0.40, usageNorm: 0.94 }
    },
    {
      name: 'Anthony Edwards',
      fp: { volume: 88, efficiency: 75, shooting: 75, creation: 65, rebounding: 25, interior: 45, defense: 68, impact: 85 },
      shot: { paintPct: 35, midPct: 15, cornerPct: 10, abPct: 40 },
      desc: 'Arrière explosif, gros volume à 3PT et athlétisme',
      prod: { pts: 26.0, reb: 5.5, ast: 5.0, stl: 1.5, blk: 0.5, tov: 2.8, TS: 57.5, usage: 31.0, eff: 19.5 },
      style: { astRatio: 0.16, rebRatio: 0.15, defRatio: 0.17, threePAr: 0.50, ftRate: 0.28, usageNorm: 0.89 }
    },
    {
      name: 'Victor Wembanyama',
      fp: { volume: 82, efficiency: 70, shooting: 60, creation: 45, rebounding: 65, interior: 70, defense: 99, impact: 88 },
      shot: { paintPct: 45, midPct: 15, cornerPct: 5, abPct: 35 },
      desc: 'Alien, protection de cercle irréelle et spacing',
      prod: { pts: 22.5, reb: 10.5, ast: 3.8, stl: 1.2, blk: 3.5, tov: 2.5, TS: 56.5, usage: 28.0, eff: 24.0 },
      style: { astRatio: 0.14, rebRatio: 0.29, defRatio: 0.25, threePAr: 0.40, ftRate: 0.22, usageNorm: 0.80 }
    },
    {
      name: "De'Aaron Fox",
      fp: { volume: 85, efficiency: 75, shooting: 60, creation: 75, rebounding: 18, interior: 55, defense: 60, impact: 80 },
      shot: { paintPct: 40, midPct: 25, cornerPct: 5, abPct: 30 },
      desc: 'Meneur ultra-rapide, roi du clutch et du floater',
      prod: { pts: 25.0, reb: 4.5, ast: 6.0, stl: 1.5, blk: 0.4, tov: 3.0, TS: 57.5, usage: 30.0, eff: 19.0 },
      style: { astRatio: 0.19, rebRatio: 0.13, defRatio: 0.16, threePAr: 0.35, ftRate: 0.30, usageNorm: 0.86 }
    },
    {
      name: 'Ja Morant',
      fp: { volume: 88, efficiency: 72, shooting: 45, creation: 80, rebounding: 20, interior: 65, defense: 35, impact: 82 },
      shot: { paintPct: 55, midPct: 15, cornerPct: 5, abPct: 25 },
      desc: 'Meneur ultra-athlétique, finisseur et créateur',
      prod: { pts: 24.5, reb: 5.5, ast: 7.5, stl: 1.0, blk: 0.4, tov: 3.2, TS: 55.0, usage: 31.0, eff: 19.0 },
      style: { astRatio: 0.23, rebRatio: 0.15, defRatio: 0.10, threePAr: 0.30, ftRate: 0.30, usageNorm: 0.89 }
    },

    // ═══ VOLUME SCORERS (CROQUEURS) ═══
    {
      name: 'Russell Westbrook',
      fp: { volume: 92, efficiency: 48, shooting: 30, creation: 82, rebounding: 42, interior: 55, defense: 35, impact: 55 },
      shot: { paintPct: 45, midPct: 25, cornerPct: 5, abPct: 25 },
      desc: 'Triple-double machine, volume brut',
      prod: { pts: 22.5, reb: 8.0, ast: 8.5, stl: 1.6, blk: 0.3, tov: 4.2, TS: 51.5, usage: 33.0, eff: 18.0 },
      style: { astRatio: 0.27, rebRatio: 0.21, defRatio: 0.10, threePAr: 0.30, ftRate: 0.32, usageNorm: 0.94 }
    },
    {
      name: 'Andrew Wiggins (early)',
      fp: { volume: 75, efficiency: 52, shooting: 45, creation: 20, rebounding: 22, interior: 40, defense: 40, impact: 35 },
      shot: { paintPct: 38, midPct: 22, cornerPct: 10, abPct: 30 },
      desc: 'Talent brut, efficacité à développer',
      prod: { pts: 19.5, reb: 4.5, ast: 2.2, stl: 1.0, blk: 0.7, tov: 2.0, TS: 52.5, usage: 26.0, eff: 12.5 },
      style: { astRatio: 0.10, rebRatio: 0.17, defRatio: 0.18, threePAr: 0.40, ftRate: 0.22, usageNorm: 0.74 }
    },

    // ═══ GUARDS — BENCH SCORERS (6th MEN) ═══
    {
      name: 'Jordan Clarkson',
      fp: { volume: 75, efficiency: 45, shooting: 60, creation: 45, rebounding: 15, interior: 30, defense: 15, impact: 45 },
      shot: { paintPct: 35, midPct: 20, cornerPct: 5, abPct: 40 },
      desc: 'Micro-onde offensif, croqueur assumé',
      prod: { pts: 16.5, reb: 3.0, ast: 2.8, stl: 0.8, blk: 0.2, tov: 1.8, TS: 53.0, usage: 26.0, eff: 10.0 },
      style: { astRatio: 0.15, rebRatio: 0.13, defRatio: 0.15, threePAr: 0.45, ftRate: 0.18, usageNorm: 0.74 }
    },
    {
      name: 'Lou Williams (Prime)',
      fp: { volume: 80, efficiency: 60, shooting: 65, creation: 65, rebounding: 10, interior: 25, defense: 5, impact: 65 },
      shot: { paintPct: 25, midPct: 35, cornerPct: 5, abPct: 35 },
      desc: '6ème homme ultime, pick-and-roll et isolation',
      prod: { pts: 18.5, reb: 2.5, ast: 5.0, stl: 0.8, blk: 0.1, tov: 2.2, TS: 56.0, usage: 28.0, eff: 13.0 },
      style: { astRatio: 0.21, rebRatio: 0.10, defRatio: 0.11, threePAr: 0.40, ftRate: 0.35, usageNorm: 0.80 }
    },
    {
      name: 'Malik Monk',
      fp: { volume: 65, efficiency: 62, shooting: 70, creation: 55, rebounding: 12, interior: 25, defense: 20, impact: 55 },
      shot: { paintPct: 30, midPct: 15, cornerPct: 10, abPct: 45 },
      desc: 'Arrière explosif, étincelle offensive',
      prod: { pts: 14.5, reb: 3.0, ast: 3.5, stl: 0.8, blk: 0.2, tov: 1.5, TS: 57.0, usage: 22.0, eff: 11.0 },
      style: { astRatio: 0.19, rebRatio: 0.14, defRatio: 0.14, threePAr: 0.55, ftRate: 0.15, usageNorm: 0.63 }
    },
    {
      name: 'Tyler Herro',
      fp: { volume: 75, efficiency: 70, shooting: 82, creation: 50, rebounding: 25, interior: 15, defense: 25, impact: 60 },
      shot: { paintPct: 20, midPct: 30, cornerPct: 10, abPct: 40 },
      desc: 'Arrière shot-creator, pull-up 3PT et floater',
      prod: { pts: 20.5, reb: 5.0, ast: 4.5, stl: 0.7, blk: 0.2, tov: 2.2, TS: 58.0, usage: 26.5, eff: 15.5 },
      style: { astRatio: 0.18, rebRatio: 0.17, defRatio: 0.09, threePAr: 0.50, ftRate: 0.20, usageNorm: 0.76 }
    },
    {
      name: 'Anfernee Simons',
      fp: { volume: 75, efficiency: 72, shooting: 88, creation: 55, rebounding: 15, interior: 15, defense: 15, impact: 55 },
      shot: { paintPct: 20, midPct: 15, cornerPct: 10, abPct: 55 },
      desc: 'Guard explosif, volume à 3PT très élevé',
      prod: { pts: 20.0, reb: 2.8, ast: 4.5, stl: 0.6, blk: 0.2, tov: 2.0, TS: 57.5, usage: 27.5, eff: 13.5 },
      style: { astRatio: 0.18, rebRatio: 0.10, defRatio: 0.10, threePAr: 0.65, ftRate: 0.15, usageNorm: 0.79 }
    },
    {
      name: 'Bones Hyland',
      fp: { volume: 55, efficiency: 52, shooting: 65, creation: 45, rebounding: 10, interior: 15, defense: 10, impact: 35 },
      shot: { paintPct: 25, midPct: 10, cornerPct: 10, abPct: 55 },
      desc: 'Meneur scoreur très instable, range NBA',
      prod: { pts: 11.5, reb: 2.5, ast: 3.0, stl: 0.5, blk: 0.1, tov: 1.5, TS: 52.0, usage: 22.0, eff: 7.5 },
      style: { astRatio: 0.21, rebRatio: 0.15, defRatio: 0.10, threePAr: 0.65, ftRate: 0.12, usageNorm: 0.63 }
    },

    // ═══ SCORING WINGS & FORWARDS ═══
    {
      name: 'CJ McCollum',
      fp: { volume: 72, efficiency: 75, shooting: 78, creation: 55, rebounding: 15, interior: 25, defense: 25, impact: 60 },
      shot: { paintPct: 22, midPct: 28, cornerPct: 10, abPct: 40 },
      desc: 'Combo guard, mid-range et pull-up, volume constant',
      prod: { pts: 20.5, reb: 3.5, ast: 4.0, stl: 1.0, blk: 0.2, tov: 2.0, TS: 56.5, usage: 27.0, eff: 14.0 },
      style: { astRatio: 0.16, rebRatio: 0.13, defRatio: 0.14, threePAr: 0.50, ftRate: 0.18, usageNorm: 0.77 }
    },
    {
      name: 'Jamal Murray',
      fp: { volume: 72, efficiency: 75, shooting: 72, creation: 65, rebounding: 18, interior: 30, defense: 35, impact: 68 },
      shot: { paintPct: 28, midPct: 22, cornerPct: 10, abPct: 40 },
      desc: 'Combo guard clutch, shot-creation et playmaking',
      prod: { pts: 20.0, reb: 4.0, ast: 5.5, stl: 1.0, blk: 0.3, tov: 2.2, TS: 57.5, usage: 26.0, eff: 15.5 },
      style: { astRatio: 0.22, rebRatio: 0.14, defRatio: 0.12, threePAr: 0.50, ftRate: 0.22, usageNorm: 0.74 }
    },

    // ═══ ROLE PLAYERS — HUSTLE / UTILITY ═══
    {
      name: 'Josh Hart',
      fp: { volume: 35, efficiency: 60, shooting: 30, creation: 35, rebounding: 75, interior: 45, defense: 70, impact: 68 },
      shot: { paintPct: 55, midPct: 10, cornerPct: 15, abPct: 20 },
      desc: "Ailier rebondeur d'élite, transition et cœur",
      prod: { pts: 10.5, reb: 8.0, ast: 3.5, stl: 0.8, blk: 0.3, tov: 1.5, TS: 54.0, usage: 15.5, eff: 13.5 },
      style: { astRatio: 0.25, rebRatio: 0.36, defRatio: 0.09, threePAr: 0.35, ftRate: 0.15, usageNorm: 0.44 }
    },
    {
      name: 'Kyle Anderson',
      fp: { volume: 25, efficiency: 55, shooting: 25, creation: 65, rebounding: 35, interior: 35, defense: 75, impact: 60 },
      shot: { paintPct: 45, midPct: 35, cornerPct: 5, abPct: 15 },
      desc: 'Point-forward lent, QI basket très élevé',
      prod: { pts: 7.5, reb: 4.5, ast: 3.5, stl: 1.0, blk: 0.5, tov: 1.2, TS: 55.0, usage: 14.0, eff: 10.0 },
      style: { astRatio: 0.32, rebRatio: 0.29, defRatio: 0.16, threePAr: 0.20, ftRate: 0.15, usageNorm: 0.40 }
    },
    {
      name: 'Jose Alvarado',
      fp: { volume: 25, efficiency: 50, shooting: 45, creation: 40, rebounding: 10, interior: 15, defense: 85, impact: 55 },
      shot: { paintPct: 30, midPct: 15, cornerPct: 15, abPct: 40 },
      desc: 'Peste défensive, énergie pure',
      prod: { pts: 9.5, reb: 2.5, ast: 3.0, stl: 1.8, blk: 0.2, tov: 1.2, TS: 53.0, usage: 16.0, eff: 8.5 },
      style: { astRatio: 0.24, rebRatio: 0.17, defRatio: 0.27, threePAr: 0.55, ftRate: 0.12, usageNorm: 0.46 }
    },
    {
      name: 'PJ Tucker',
      fp: { volume: 20, efficiency: 65, shooting: 65, creation: 12, rebounding: 35, interior: 30, defense: 78, impact: 62 },
      shot: { paintPct: 18, midPct: 8, cornerPct: 45, abPct: 29 },
      desc: 'Corner specialist + défenseur physique',
      prod: { pts: 7.5, reb: 5.5, ast: 1.5, stl: 1.0, blk: 0.3, tov: 0.8, TS: 56.0, usage: 11.5, eff: 8.5 },
      style: { astRatio: 0.17, rebRatio: 0.38, defRatio: 0.15, threePAr: 0.74, ftRate: 0.10, usageNorm: 0.33 }
    },
    {
      name: 'Andre Iguodala',
      fp: { volume: 35, efficiency: 72, shooting: 50, creation: 50, rebounding: 22, interior: 30, defense: 78, impact: 75 },
      shot: { paintPct: 35, midPct: 18, cornerPct: 15, abPct: 32 },
      desc: 'Glue guy, QI basket et polyvalence',
      prod: { pts: 11.5, reb: 4.5, ast: 4.0, stl: 1.2, blk: 0.4, tov: 1.5, TS: 56.0, usage: 16.0, eff: 12.5 },
      style: { astRatio: 0.26, rebRatio: 0.22, defRatio: 0.16, threePAr: 0.47, ftRate: 0.18, usageNorm: 0.46 }
    },
    {
      name: 'Alex Caruso',
      fp: { volume: 20, efficiency: 68, shooting: 55, creation: 30, rebounding: 15, interior: 15, defense: 90, impact: 72 },
      shot: { paintPct: 28, midPct: 10, cornerPct: 22, abPct: 40 },
      desc: 'Hustle défensif, impact sans stats',
      prod: { pts: 7.0, reb: 3.0, ast: 2.5, stl: 1.5, blk: 0.5, tov: 0.8, TS: 57.0, usage: 12.0, eff: 8.5 },
      style: { astRatio: 0.26, rebRatio: 0.24, defRatio: 0.25, threePAr: 0.62, ftRate: 0.12, usageNorm: 0.34 }
    },
    {
      name: 'Luguentz Dort',
      fp: { volume: 50, efficiency: 55, shooting: 55, creation: 20, rebounding: 18, interior: 30, defense: 85, impact: 55 },
      shot: { paintPct: 30, midPct: 12, cornerPct: 18, abPct: 40 },
      desc: 'Défenseur tenace, scoring irrégulier',
      prod: { pts: 13.5, reb: 4.0, ast: 2.0, stl: 1.0, blk: 0.3, tov: 1.2, TS: 53.5, usage: 21.0, eff: 9.5 },
      style: { astRatio: 0.13, rebRatio: 0.20, defRatio: 0.18, threePAr: 0.58, ftRate: 0.18, usageNorm: 0.60 }
    },

    // ═══ 3-AND-D WINGS ═══
    {
      name: 'Dorian Finney-Smith',
      fp: { volume: 30, efficiency: 72, shooting: 72, creation: 12, rebounding: 25, interior: 15, defense: 78, impact: 60 },
      shot: { paintPct: 20, midPct: 8, cornerPct: 28, abPct: 44 },
      desc: '3-and-D fiable, défense switcher, scoring très bas volume',
      prod: { pts: 9.5, reb: 4.5, ast: 1.5, stl: 0.8, blk: 0.5, tov: 0.8, TS: 57.0, usage: 14.0, eff: 9.0 },
      style: { astRatio: 0.14, rebRatio: 0.29, defRatio: 0.18, threePAr: 0.72, ftRate: 0.10, usageNorm: 0.40 }
    },
    {
      name: 'Kentavious Caldwell-Pope',
      fp: { volume: 40, efficiency: 75, shooting: 78, creation: 12, rebounding: 15, interior: 10, defense: 75, impact: 62 },
      shot: { paintPct: 15, midPct: 10, cornerPct: 25, abPct: 50 },
      desc: '3-and-D vétéran, consistent et fiable des deux côtés',
      prod: { pts: 11.5, reb: 3.0, ast: 1.8, stl: 1.2, blk: 0.3, tov: 1.0, TS: 58.0, usage: 16.0, eff: 9.5 },
      style: { astRatio: 0.14, rebRatio: 0.18, defRatio: 0.24, threePAr: 0.75, ftRate: 0.10, usageNorm: 0.46 }
    },
    {
      name: "Royce O'Neale",
      fp: { volume: 25, efficiency: 65, shooting: 75, creation: 35, rebounding: 25, interior: 10, defense: 65, impact: 55 },
      shot: { paintPct: 15, midPct: 5, cornerPct: 25, abPct: 55 },
      desc: 'Ailier 3-and-D qui fait un peu de tout pour aider',
      prod: { pts: 7.5, reb: 4.5, ast: 2.5, stl: 0.8, blk: 0.3, tov: 0.8, TS: 55.0, usage: 12.5, eff: 8.5 },
      style: { astRatio: 0.25, rebRatio: 0.31, defRatio: 0.13, threePAr: 0.80, ftRate: 0.08, usageNorm: 0.36 }
    },
    {
      name: 'Grant Williams',
      fp: { volume: 30, efficiency: 68, shooting: 65, creation: 20, rebounding: 20, interior: 25, defense: 60, impact: 50 },
      shot: { paintPct: 25, midPct: 5, cornerPct: 30, abPct: 40 },
      desc: "Intérieur râblé, s'écarte à 3PT et défend dur",
      prod: { pts: 9.0, reb: 4.5, ast: 1.5, stl: 0.5, blk: 0.5, tov: 0.8, TS: 56.0, usage: 15.0, eff: 8.0 },
      style: { astRatio: 0.14, rebRatio: 0.30, defRatio: 0.14, threePAr: 0.70, ftRate: 0.12, usageNorm: 0.43 }
    },

    // ═══ ENERGY DE BANC / HUSTLE ═══
    {
      name: 'Patrick Beverley',
      fp: { volume: 22, efficiency: 48, shooting: 55, creation: 30, rebounding: 20, interior: 15, defense: 88, impact: 58 },
      shot: { paintPct: 25, midPct: 10, cornerPct: 18, abPct: 47 },
      desc: 'Agitateur défensif, énergie de banc contagieuse',
      prod: { pts: 8.5, reb: 4.0, ast: 3.5, stl: 1.2, blk: 0.3, tov: 1.5, TS: 52.0, usage: 15.0, eff: 8.0 },
      style: { astRatio: 0.29, rebRatio: 0.25, defRatio: 0.17, threePAr: 0.65, ftRate: 0.12, usageNorm: 0.43 }
    },
    {
      name: 'Torrey Craig',
      fp: { volume: 15, efficiency: 62, shooting: 45, creation: 8, rebounding: 25, interior: 30, defense: 72, impact: 42 },
      shot: { paintPct: 35, midPct: 10, cornerPct: 22, abPct: 33 },
      desc: 'Ailier énergie pure, défense et rebond sur courtes rotations',
      prod: { pts: 6.0, reb: 4.0, ast: 0.8, stl: 0.5, blk: 0.4, tov: 0.5, TS: 55.0, usage: 12.0, eff: 6.5 },
      style: { astRatio: 0.12, rebRatio: 0.37, defRatio: 0.16, threePAr: 0.55, ftRate: 0.10, usageNorm: 0.34 }
    },

    // ═══ POINT FORWARD EUROPÉEN ═══
    {
      name: 'Deni Avdija',
      fp: { volume: 45, efficiency: 62, shooting: 55, creation: 55, rebounding: 30, interior: 30, defense: 68, impact: 58 },
      shot: { paintPct: 35, midPct: 12, cornerPct: 15, abPct: 38 },
      desc: 'Ailier polyvalent style Euro, vision, cutting et défense',
      prod: { pts: 12.0, reb: 5.5, ast: 3.5, stl: 1.0, blk: 0.3, tov: 1.5, TS: 55.0, usage: 19.0, eff: 12.0 },
      style: { astRatio: 0.23, rebRatio: 0.26, defRatio: 0.13, threePAr: 0.53, ftRate: 0.18, usageNorm: 0.54 }
    },
    {
      name: 'Nicolas Batum',
      fp: { volume: 15, efficiency: 75, shooting: 70, creation: 35, rebounding: 20, interior: 10, defense: 70, impact: 65 },
      shot: { paintPct: 15, midPct: 5, cornerPct: 30, abPct: 50 },
      desc: 'Liaison offensive, QI basket, passes rapides et 3PT',
      prod: { pts: 8.0, reb: 4.5, ast: 2.5, stl: 0.8, blk: 0.5, tov: 1.0, TS: 58.0, usage: 11.5, eff: 9.5 },
      style: { astRatio: 0.24, rebRatio: 0.30, defRatio: 0.17, threePAr: 0.80, ftRate: 0.10, usageNorm: 0.33 }
    },

    // ═══ YOUNG RAW ATHLETES ═══
    {
      name: 'Amen Thompson',
      fp: { volume: 45, efficiency: 65, shooting: 10, creation: 55, rebounding: 45, interior: 65, defense: 85, impact: 65 },
      shot: { paintPct: 80, midPct: 10, cornerPct: 5, abPct: 5 },
      desc: 'Meneur/Ailier athlétisme mutant, coupeur, pas de shoot',
      prod: { pts: 11.5, reb: 7.0, ast: 4.0, stl: 1.2, blk: 0.8, tov: 2.0, TS: 55.5, usage: 18.0, eff: 13.0 },
      style: { astRatio: 0.26, rebRatio: 0.31, defRatio: 0.15, threePAr: 0.10, ftRate: 0.28, usageNorm: 0.51 }
    },
    {
      name: 'Jonathan Kuminga',
      fp: { volume: 65, efficiency: 72, shooting: 45, creation: 25, rebounding: 25, interior: 65, defense: 55, impact: 60 },
      shot: { paintPct: 55, midPct: 15, cornerPct: 10, abPct: 20 },
      desc: 'Ailier fort surpuissant, attaque le cercle',
      prod: { pts: 15.0, reb: 4.5, ast: 2.0, stl: 0.7, blk: 0.5, tov: 1.5, TS: 57.0, usage: 22.0, eff: 11.5 },
      style: { astRatio: 0.12, rebRatio: 0.21, defRatio: 0.14, threePAr: 0.30, ftRate: 0.28, usageNorm: 0.63 }
    },
    {
      name: 'Shaedon Sharpe',
      fp: { volume: 60, efficiency: 62, shooting: 65, creation: 30, rebounding: 25, interior: 35, defense: 35, impact: 45 },
      shot: { paintPct: 30, midPct: 20, cornerPct: 15, abPct: 35 },
      desc: 'Athlète aérien, jumper pur mais sélection de tir suspecte',
      prod: { pts: 14.0, reb: 3.5, ast: 2.0, stl: 0.6, blk: 0.4, tov: 1.5, TS: 54.0, usage: 23.0, eff: 9.5 },
      style: { astRatio: 0.13, rebRatio: 0.18, defRatio: 0.13, threePAr: 0.50, ftRate: 0.20, usageNorm: 0.66 }
    },

    // ═══ DEEP BENCH / FRINGE NBA ═══
    {
      name: 'Thanasis Antetokounmpo',
      fp: { volume: 15, efficiency: 25, shooting: 10, creation: 10, rebounding: 30, interior: 35, defense: 40, impact: 10 },
      shot: { paintPct: 75, midPct: 5, cornerPct: 5, abPct: 15 },
      desc: 'Énergie brute, indiscipliné, très peu de minutes',
      prod: { pts: 3.5, reb: 2.5, ast: 0.5, stl: 0.3, blk: 0.2, tov: 0.5, TS: 48.0, usage: 14.0, eff: 2.0 },
      style: { astRatio: 0.13, rebRatio: 0.38, defRatio: 0.15, threePAr: 0.20, ftRate: 0.15, usageNorm: 0.40 }
    },
    {
      name: 'Jericho Sims',
      fp: { volume: 10, efficiency: 65, shooting: 0, creation: 5, rebounding: 45, interior: 50, defense: 35, impact: 15 },
      shot: { paintPct: 100, midPct: 0, cornerPct: 0, abPct: 0 },
      desc: 'Pivot athlétique de rotation, attrape les lobs',
      prod: { pts: 4.0, reb: 5.0, ast: 0.3, stl: 0.3, blk: 0.5, tov: 0.5, TS: 65.0, usage: 9.0, eff: 6.0 },
      style: { astRatio: 0.07, rebRatio: 0.54, defRatio: 0.13, threePAr: 0.00, ftRate: 0.20, usageNorm: 0.26 }
    },
    {
      name: 'Hamidou Diallo',
      fp: { volume: 35, efficiency: 55, shooting: 15, creation: 15, rebounding: 35, interior: 55, defense: 45, impact: 35 },
      shot: { paintPct: 70, midPct: 15, cornerPct: 5, abPct: 10 },
      desc: 'Slasher pur, athlétique mais sans spacing',
      prod: { pts: 10.0, reb: 4.0, ast: 1.5, stl: 0.8, blk: 0.3, tov: 1.2, TS: 53.0, usage: 19.0, eff: 8.0 },
      style: { astRatio: 0.13, rebRatio: 0.26, defRatio: 0.17, threePAr: 0.15, ftRate: 0.30, usageNorm: 0.54 }
    },
    {
      name: 'Isaac Okoro',
      fp: { volume: 25, efficiency: 55, shooting: 40, creation: 15, rebounding: 20, interior: 30, defense: 80, impact: 45 },
      shot: { paintPct: 40, midPct: 10, cornerPct: 25, abPct: 25 },
      desc: 'Défenseur extérieur robuste, attaque en développement',
      prod: { pts: 8.5, reb: 2.8, ast: 1.5, stl: 0.7, blk: 0.3, tov: 0.8, TS: 54.0, usage: 15.0, eff: 6.5 },
      style: { astRatio: 0.15, rebRatio: 0.22, defRatio: 0.18, threePAr: 0.50, ftRate: 0.18, usageNorm: 0.43 }
    },
    {
      name: 'Matisse Thybulle',
      fp: { volume: 15, efficiency: 45, shooting: 35, creation: 10, rebounding: 15, interior: 10, defense: 95, impact: 50 },
      shot: { paintPct: 20, midPct: 5, cornerPct: 30, abPct: 45 },
      desc: "Voleur de ballons d'élite, quasi-inexistant en attaque",
      prod: { pts: 5.0, reb: 2.0, ast: 1.0, stl: 1.5, blk: 0.8, tov: 0.5, TS: 52.0, usage: 10.0, eff: 5.5 },
      style: { astRatio: 0.17, rebRatio: 0.25, defRatio: 0.38, threePAr: 0.75, ftRate: 0.08, usageNorm: 0.29 }
    },

    // ═══ DÉVELOPPEMENT / PROJET ═══
    {
      name: 'Killian Hayes (Détroit era)',
      fp: { volume: 35, efficiency: 20, shooting: 25, creation: 55, rebounding: 20, interior: 15, defense: 55, impact: 15 },
      shot: { paintPct: 25, midPct: 40, cornerPct: 10, abPct: 25 },
      desc: 'Meneur gestionnaire, grosses difficultés au tir',
      prod: { pts: 8.0, reb: 3.5, ast: 4.5, stl: 1.0, blk: 0.3, tov: 2.0, TS: 44.0, usage: 18.0, eff: 5.5 },
      style: { astRatio: 0.36, rebRatio: 0.22, defRatio: 0.14, threePAr: 0.35, ftRate: 0.15, usageNorm: 0.51 }
    },
    {
      name: 'Cam Reddish',
      fp: { volume: 45, efficiency: 35, shooting: 35, creation: 20, rebounding: 15, interior: 25, defense: 50, impact: 20 },
      shot: { paintPct: 35, midPct: 20, cornerPct: 15, abPct: 30 },
      desc: 'Ailier talentueux mais très inefficace',
      prod: { pts: 11.0, reb: 3.0, ast: 1.5, stl: 0.8, blk: 0.3, tov: 1.5, TS: 49.0, usage: 21.0, eff: 6.0 },
      style: { astRatio: 0.12, rebRatio: 0.19, defRatio: 0.17, threePAr: 0.45, ftRate: 0.22, usageNorm: 0.60 }
    },

    // ═══ MODERN BIGS — RIM RUNNER / ENERGY ═══
    {
      name: 'Dereck Lively II',
      fp: { volume: 25, efficiency: 80, shooting: 0, creation: 15, rebounding: 55, interior: 75, defense: 78, impact: 65 },
      shot: { paintPct: 95, midPct: 5, cornerPct: 0, abPct: 0 },
      desc: 'Jeune pivot mobile, lobs, protection de cercle, bon passeur',
      prod: { pts: 9.0, reb: 7.5, ast: 2.0, stl: 0.5, blk: 1.5, tov: 1.0, TS: 68.0, usage: 13.0, eff: 13.5 },
      style: { astRatio: 0.18, rebRatio: 0.41, defRatio: 0.17, threePAr: 0.00, ftRate: 0.18, usageNorm: 0.37 }
    },
    {
      name: 'Nic Claxton',
      fp: { volume: 28, efficiency: 78, shooting: 0, creation: 18, rebounding: 50, interior: 78, defense: 82, impact: 68 },
      shot: { paintPct: 93, midPct: 7, cornerPct: 0, abPct: 0 },
      desc: 'Rim protector mobile, switchable, lobs',
      prod: { pts: 11.0, reb: 8.0, ast: 2.0, stl: 0.8, blk: 2.0, tov: 1.2, TS: 67.0, usage: 14.5, eff: 15.5 },
      style: { astRatio: 0.15, rebRatio: 0.38, defRatio: 0.22, threePAr: 0.00, ftRate: 0.25, usageNorm: 0.41 }
    }
  ];
})();