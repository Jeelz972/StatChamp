(function () {
  'use strict';

  window.DETECTION_BAREMES = {
    // ═══════════════════════════════════════════
    // TESTS PHYSIQUES
    // ═══════════════════════════════════════════
    physical: {
      navette_5_10_15: {
        name: 'Navette 5-10-15m',
        unit: 's',
        direction: 'lower_is_better',
        availableFor: ['U11', 'U13', 'U15', 'U18'],
        categories: {
          U11: {
            departemental: {
              excellent: { max: 14.0 },
              tres_bien: { min: 14.0, max: 14.5 },
              bien: { min: 14.5, max: 15.0 },
              moyen: { min: 15.0, max: 15.5 },
              insuffisant: { min: 15.5 },
            },
            regional: {
              excellent: { max: 13.0 },
              tres_bien: { min: 13.0, max: 13.5 },
              bien: { min: 13.5, max: 14.0 },
              moyen: { min: 14.0, max: 14.5 },
              insuffisant: { min: 14.5 },
            },
            national: {
              excellent: { max: 12.0 },
              tres_bien: { min: 12.0, max: 12.5 },
              bien: { min: 12.5, max: 13.0 },
              moyen: { min: 13.0, max: 13.5 },
              insuffisant: { min: 13.5 },
            },
          },
          U13: {
            departemental: {
              excellent: { max: 13.0 },
              tres_bien: { min: 13.0, max: 13.5 },
              bien: { min: 13.5, max: 14.0 },
              moyen: { min: 14.0, max: 14.5 },
              insuffisant: { min: 14.5 },
            },
            regional: {
              excellent: { max: 12.0 },
              tres_bien: { min: 12.0, max: 12.4 },
              bien: { min: 12.4, max: 12.8 },
              moyen: { min: 12.8, max: 13.2 },
              insuffisant: { min: 13.2 },
            },
            national: {
              excellent: { max: 11.0 },
              tres_bien: { min: 11.0, max: 11.4 },
              bien: { min: 11.4, max: 11.8 },
              moyen: { min: 11.8, max: 12.2 },
              insuffisant: { min: 12.2 },
            },
          },
          U15: {
            departemental: {
              excellent: { max: 12.0 },
              tres_bien: { min: 12.0, max: 12.5 },
              bien: { min: 12.5, max: 13.0 },
              moyen: { min: 13.0, max: 13.5 },
              insuffisant: { min: 13.5 },
            },
            regional: {
              excellent: { max: 11.0 },
              tres_bien: { min: 11.0, max: 11.4 },
              bien: { min: 11.4, max: 11.8 },
              moyen: { min: 11.8, max: 12.2 },
              insuffisant: { min: 12.2 },
            },
            national: {
              excellent: { max: 10.2 },
              tres_bien: { min: 10.2, max: 10.6 },
              bien: { min: 10.6, max: 11.0 },
              moyen: { min: 11.0, max: 11.4 },
              insuffisant: { min: 11.4 },
            },
          },
          U18: {
            departemental: {
              excellent: { max: 11.2 },
              tres_bien: { min: 11.2, max: 11.6 },
              bien: { min: 11.6, max: 12.0 },
              moyen: { min: 12.0, max: 12.5 },
              insuffisant: { min: 12.5 },
            },
            regional: {
              excellent: { max: 10.4 },
              tres_bien: { min: 10.4, max: 10.7 },
              bien: { min: 10.7, max: 11.0 },
              moyen: { min: 11.0, max: 11.4 },
              insuffisant: { min: 11.4 },
            },
            national: {
              excellent: { max: 9.8 },
              tres_bien: { min: 9.8, max: 10.1 },
              bien: { min: 10.1, max: 10.4 },
              moyen: { min: 10.4, max: 10.8 },
              insuffisant: { min: 10.8 },
            },
          },
        },
      },

      sprint_20m: {
        name: 'Sprint 20m',
        unit: 's',
        direction: 'lower_is_better',
        availableFor: ['U11', 'U13', 'U15', 'U18'],
        categories: {
          U11: {
            departemental: {
              excellent: { max: 4.2 },
              tres_bien: { min: 4.2, max: 4.5 },
              bien: { min: 4.5, max: 4.8 },
              moyen: { min: 4.8, max: 5.1 },
              insuffisant: { min: 5.1 },
            },
            regional: {
              excellent: { max: 3.9 },
              tres_bien: { min: 3.9, max: 4.1 },
              bien: { min: 4.1, max: 4.3 },
              moyen: { min: 4.3, max: 4.6 },
              insuffisant: { min: 4.6 },
            },
            national: {
              excellent: { max: 3.6 },
              tres_bien: { min: 3.6, max: 3.8 },
              bien: { min: 3.8, max: 4.0 },
              moyen: { min: 4.0, max: 4.3 },
              insuffisant: { min: 4.3 },
            },
          },
          U13: {
            departemental: {
              excellent: { max: 3.9 },
              tres_bien: { min: 3.9, max: 4.1 },
              bien: { min: 4.1, max: 4.3 },
              moyen: { min: 4.3, max: 4.6 },
              insuffisant: { min: 4.6 },
            },
            regional: {
              excellent: { max: 3.6 },
              tres_bien: { min: 3.6, max: 3.8 },
              bien: { min: 3.8, max: 4.0 },
              moyen: { min: 4.0, max: 4.3 },
              insuffisant: { min: 4.3 },
            },
            national: {
              excellent: { max: 3.4 },
              tres_bien: { min: 3.4, max: 3.6 },
              bien: { min: 3.6, max: 3.8 },
              moyen: { min: 3.8, max: 4.0 },
              insuffisant: { min: 4.0 },
            },
          },
          U15: {
            departemental: {
              excellent: { max: 3.6 },
              tres_bien: { min: 3.6, max: 3.8 },
              bien: { min: 3.8, max: 4.0 },
              moyen: { min: 4.0, max: 4.2 },
              insuffisant: { min: 4.2 },
            },
            regional: {
              excellent: { max: 3.4 },
              tres_bien: { min: 3.4, max: 3.55 },
              bien: { min: 3.55, max: 3.7 },
              moyen: { min: 3.7, max: 3.9 },
              insuffisant: { min: 3.9 },
            },
            national: {
              excellent: { max: 3.2 },
              tres_bien: { min: 3.2, max: 3.35 },
              bien: { min: 3.35, max: 3.5 },
              moyen: { min: 3.5, max: 3.7 },
              insuffisant: { min: 3.7 },
            },
          },
          U18: {
            departemental: {
              excellent: { max: 3.4 },
              tres_bien: { min: 3.4, max: 3.55 },
              bien: { min: 3.55, max: 3.7 },
              moyen: { min: 3.7, max: 3.9 },
              insuffisant: { min: 3.9 },
            },
            regional: {
              excellent: { max: 3.2 },
              tres_bien: { min: 3.2, max: 3.3 },
              bien: { min: 3.3, max: 3.45 },
              moyen: { min: 3.45, max: 3.6 },
              insuffisant: { min: 3.6 },
            },
            national: {
              excellent: { max: 3.0 },
              tres_bien: { min: 3.0, max: 3.1 },
              bien: { min: 3.1, max: 3.2 },
              moyen: { min: 3.2, max: 3.35 },
              insuffisant: { min: 3.35 },
            },
          },
        },
      },

      equilibre_unipodal: {
        name: 'Équilibre unipodal (yeux ouverts)',
        unit: 's',
        direction: 'higher_is_better',
        availableFor: ['U11'],
        categories: {
          U11: {
            departemental: {
              excellent: { min: 25 },
              tres_bien: { min: 20, max: 25 },
              bien: { min: 15, max: 20 },
              moyen: { min: 10, max: 15 },
              insuffisant: { max: 10 },
            },
            regional: {
              excellent: { min: 35 },
              tres_bien: { min: 30, max: 35 },
              bien: { min: 25, max: 30 },
              moyen: { min: 20, max: 25 },
              insuffisant: { max: 20 },
            },
            national: {
              excellent: { min: 45 },
              tres_bien: { min: 40, max: 45 },
              bien: { min: 35, max: 40 },
              moyen: { min: 30, max: 35 },
              insuffisant: { max: 30 },
            },
          },
        },
      },

      course_6min: {
        name: 'Course 6 minutes',
        unit: 'm',
        direction: 'higher_is_better',
        availableFor: ['U11', 'U13'],
        categories: {
          U11: {
            departemental: {
              excellent: { min: 900 },
              tres_bien: { min: 850, max: 900 },
              bien: { min: 800, max: 850 },
              moyen: { min: 750, max: 800 },
              insuffisant: { max: 750 },
            },
            regional: {
              excellent: { min: 1000 },
              tres_bien: { min: 950, max: 1000 },
              bien: { min: 900, max: 950 },
              moyen: { min: 850, max: 900 },
              insuffisant: { max: 850 },
            },
            national: {
              excellent: { min: 1100 },
              tres_bien: { min: 1050, max: 1100 },
              bien: { min: 1000, max: 1050 },
              moyen: { min: 950, max: 1000 },
              insuffisant: { max: 950 },
            },
          },
          U13: {
            departemental: {
              excellent: { min: 1050 },
              tres_bien: { min: 1000, max: 1050 },
              bien: { min: 950, max: 1000 },
              moyen: { min: 900, max: 950 },
              insuffisant: { max: 900 },
            },
            regional: {
              excellent: { min: 1150 },
              tres_bien: { min: 1100, max: 1150 },
              bien: { min: 1050, max: 1100 },
              moyen: { min: 1000, max: 1050 },
              insuffisant: { max: 1000 },
            },
            national: {
              excellent: { min: 1250 },
              tres_bien: { min: 1200, max: 1250 },
              bien: { min: 1150, max: 1200 },
              moyen: { min: 1100, max: 1150 },
              insuffisant: { max: 1100 },
            },
          },
        },
      },

      parcours_coordination: {
        name: 'Parcours coordination',
        unit: 'qualitatif',
        direction: 'qualitative',
        availableFor: ['U11'],
        categories: {
          U11: {
            // Pas de seuils numériques. Évaluation directe par le coach.
            // Le coach sélectionne le niveau manuellement.
            _qualitative: true,
          },
        },
      },

      cmj: {
        name: 'CMJ (détente verticale)',
        unit: 'cm',
        direction: 'higher_is_better',
        availableFor: ['U13', 'U15', 'U18'],
        categories: {
          U13: {
            departemental: {
              excellent: { min: 30 },
              tres_bien: { min: 27, max: 30 },
              bien: { min: 24, max: 27 },
              moyen: { min: 21, max: 24 },
              insuffisant: { max: 21 },
            },
            regional: {
              excellent: { min: 35 },
              tres_bien: { min: 32, max: 35 },
              bien: { min: 29, max: 32 },
              moyen: { min: 26, max: 29 },
              insuffisant: { max: 26 },
            },
            national: {
              excellent: { min: 40 },
              tres_bien: { min: 37, max: 40 },
              bien: { min: 34, max: 37 },
              moyen: { min: 31, max: 34 },
              insuffisant: { max: 31 },
            },
          },
          U15: {
            departemental: {
              excellent: { min: 35 },
              tres_bien: { min: 32, max: 35 },
              bien: { min: 29, max: 32 },
              moyen: { min: 26, max: 29 },
              insuffisant: { max: 26 },
            },
            regional: {
              excellent: { min: 42 },
              tres_bien: { min: 39, max: 42 },
              bien: { min: 36, max: 39 },
              moyen: { min: 33, max: 36 },
              insuffisant: { max: 33 },
            },
            national: {
              excellent: { min: 48 },
              tres_bien: { min: 45, max: 48 },
              bien: { min: 42, max: 45 },
              moyen: { min: 39, max: 42 },
              insuffisant: { max: 39 },
            },
          },
          U18: {
            departemental: {
              excellent: { min: 40 },
              tres_bien: { min: 37, max: 40 },
              bien: { min: 34, max: 37 },
              moyen: { min: 31, max: 34 },
              insuffisant: { max: 31 },
            },
            regional: {
              excellent: { min: 47 },
              tres_bien: { min: 44, max: 47 },
              bien: { min: 41, max: 44 },
              moyen: { min: 38, max: 41 },
              insuffisant: { max: 38 },
            },
            national: {
              excellent: { min: 54 },
              tres_bien: { min: 51, max: 54 },
              bien: { min: 48, max: 51 },
              moyen: { min: 45, max: 48 },
              insuffisant: { max: 45 },
            },
          },
        },
      },

      illinois: {
        name: 'Illinois Test (agilité)',
        unit: 's',
        direction: 'lower_is_better',
        availableFor: ['U13', 'U15', 'U18'],
        categories: {
          U13: {
            departemental: {
              excellent: { max: 20.5 },
              tres_bien: { min: 20.5, max: 21.5 },
              bien: { min: 21.5, max: 22.5 },
              moyen: { min: 22.5, max: 23.5 },
              insuffisant: { min: 23.5 },
            },
            regional: {
              excellent: { max: 19.0 },
              tres_bien: { min: 19.0, max: 19.8 },
              bien: { min: 19.8, max: 20.6 },
              moyen: { min: 20.6, max: 21.5 },
              insuffisant: { min: 21.5 },
            },
            national: {
              excellent: { max: 17.5 },
              tres_bien: { min: 17.5, max: 18.2 },
              bien: { min: 18.2, max: 18.9 },
              moyen: { min: 18.9, max: 19.6 },
              insuffisant: { min: 19.6 },
            },
          },
          U15: {
            departemental: {
              excellent: { max: 19.0 },
              tres_bien: { min: 19.0, max: 19.8 },
              bien: { min: 19.8, max: 20.6 },
              moyen: { min: 20.6, max: 21.5 },
              insuffisant: { min: 21.5 },
            },
            regional: {
              excellent: { max: 17.5 },
              tres_bien: { min: 17.5, max: 18.1 },
              bien: { min: 18.1, max: 18.7 },
              moyen: { min: 18.7, max: 19.4 },
              insuffisant: { min: 19.4 },
            },
            national: {
              excellent: { max: 16.2 },
              tres_bien: { min: 16.2, max: 16.7 },
              bien: { min: 16.7, max: 17.2 },
              moyen: { min: 17.2, max: 17.8 },
              insuffisant: { min: 17.8 },
            },
          },
          U18: {
            departemental: {
              excellent: { max: 17.5 },
              tres_bien: { min: 17.5, max: 18.1 },
              bien: { min: 18.1, max: 18.7 },
              moyen: { min: 18.7, max: 19.4 },
              insuffisant: { min: 19.4 },
            },
            regional: {
              excellent: { max: 16.2 },
              tres_bien: { min: 16.2, max: 16.7 },
              bien: { min: 16.7, max: 17.2 },
              moyen: { min: 17.2, max: 17.8 },
              insuffisant: { min: 17.8 },
            },
            national: {
              excellent: { max: 15.2 },
              tres_bien: { min: 15.2, max: 15.6 },
              bien: { min: 15.6, max: 16.0 },
              moyen: { min: 16.0, max: 16.5 },
              insuffisant: { min: 16.5 },
            },
          },
        },
      },

      gainage_ventral: {
        name: 'Gainage ventral (planche)',
        unit: 's',
        direction: 'higher_is_better',
        availableFor: ['U13', 'U15', 'U18'],
        categories: {
          U13: {
            departemental: {
              excellent: { min: 70 },
              tres_bien: { min: 60, max: 70 },
              bien: { min: 50, max: 60 },
              moyen: { min: 40, max: 50 },
              insuffisant: { max: 40 },
            },
            regional: {
              excellent: { min: 90 },
              tres_bien: { min: 80, max: 90 },
              bien: { min: 70, max: 80 },
              moyen: { min: 60, max: 70 },
              insuffisant: { max: 60 },
            },
            national: {
              excellent: { min: 120 },
              tres_bien: { min: 105, max: 120 },
              bien: { min: 90, max: 105 },
              moyen: { min: 75, max: 90 },
              insuffisant: { max: 75 },
            },
          },
          U15: {
            departemental: {
              excellent: { min: 90 },
              tres_bien: { min: 80, max: 90 },
              bien: { min: 70, max: 80 },
              moyen: { min: 60, max: 70 },
              insuffisant: { max: 60 },
            },
            regional: {
              excellent: { min: 120 },
              tres_bien: { min: 105, max: 120 },
              bien: { min: 90, max: 105 },
              moyen: { min: 75, max: 90 },
              insuffisant: { max: 75 },
            },
            national: {
              excellent: { min: 150 },
              tres_bien: { min: 135, max: 150 },
              bien: { min: 120, max: 135 },
              moyen: { min: 105, max: 120 },
              insuffisant: { max: 105 },
            },
          },
          U18: {
            departemental: {
              excellent: { min: 120 },
              tres_bien: { min: 105, max: 120 },
              bien: { min: 90, max: 105 },
              moyen: { min: 75, max: 90 },
              insuffisant: { max: 75 },
            },
            regional: {
              excellent: { min: 150 },
              tres_bien: { min: 135, max: 150 },
              bien: { min: 120, max: 135 },
              moyen: { min: 105, max: 120 },
              insuffisant: { max: 105 },
            },
            national: {
              excellent: { min: 180 },
              tres_bien: { min: 165, max: 180 },
              bien: { min: 150, max: 165 },
              moyen: { min: 135, max: 150 },
              insuffisant: { max: 135 },
            },
          },
        },
      },

      ift_30_15: {
        name: '30-15 IFT (VMA intermittente)',
        unit: 'km/h',
        direction: 'higher_is_better',
        availableFor: ['U15', 'U18'],
        categories: {
          U15: {
            departemental: {
              excellent: { min: 15.0 },
              tres_bien: { min: 14.5, max: 15.0 },
              bien: { min: 14.0, max: 14.5 },
              moyen: { min: 13.5, max: 14.0 },
              insuffisant: { max: 13.5 },
            },
            regional: {
              excellent: { min: 16.5 },
              tres_bien: { min: 16.0, max: 16.5 },
              bien: { min: 15.5, max: 16.0 },
              moyen: { min: 15.0, max: 15.5 },
              insuffisant: { max: 15.0 },
            },
            national: {
              excellent: { min: 18.0 },
              tres_bien: { min: 17.5, max: 18.0 },
              bien: { min: 17.0, max: 17.5 },
              moyen: { min: 16.5, max: 17.0 },
              insuffisant: { max: 16.5 },
            },
          },
          U18: {
            departemental: {
              excellent: { min: 16.0 },
              tres_bien: { min: 15.5, max: 16.0 },
              bien: { min: 15.0, max: 15.5 },
              moyen: { min: 14.5, max: 15.0 },
              insuffisant: { max: 14.5 },
            },
            regional: {
              excellent: { min: 17.5 },
              tres_bien: { min: 17.0, max: 17.5 },
              bien: { min: 16.5, max: 17.0 },
              moyen: { min: 16.0, max: 16.5 },
              insuffisant: { max: 16.0 },
            },
            national: {
              excellent: { min: 19.0 },
              tres_bien: { min: 18.5, max: 19.0 },
              bien: { min: 18.0, max: 18.5 },
              moyen: { min: 17.5, max: 18.0 },
              insuffisant: { max: 17.5 },
            },
          },
        },
      },

      squat_unipodal: {
        name: 'Squat unipodal (pistol squat partiel)',
        unit: 'reps',
        direction: 'higher_is_better',
        availableFor: ['U15'],
        categories: {
          U15: {
            departemental: {
              excellent: { min: 8 },
              tres_bien: { min: 6, max: 8 },
              bien: { min: 4, max: 6 },
              moyen: { min: 2, max: 4 },
              insuffisant: { max: 2 },
            },
            regional: {
              excellent: { min: 12 },
              tres_bien: { min: 10, max: 12 },
              bien: { min: 8, max: 10 },
              moyen: { min: 6, max: 8 },
              insuffisant: { max: 6 },
            },
            national: {
              excellent: { min: 15 },
              tres_bien: { min: 13, max: 15 },
              bien: { min: 11, max: 13 },
              moyen: { min: 9, max: 11 },
              insuffisant: { max: 9 },
            },
          },
        },
      },

      triple_saut: {
        name: 'Triple saut sans élan',
        unit: 'm',
        direction: 'higher_is_better',
        availableFor: ['U15', 'U18'],
        categories: {
          U15: {
            departemental: {
              excellent: { min: 5.2 },
              tres_bien: { min: 5.0, max: 5.2 },
              bien: { min: 4.8, max: 5.0 },
              moyen: { min: 4.6, max: 4.8 },
              insuffisant: { max: 4.6 },
            },
            regional: {
              excellent: { min: 5.8 },
              tres_bien: { min: 5.6, max: 5.8 },
              bien: { min: 5.4, max: 5.6 },
              moyen: { min: 5.2, max: 5.4 },
              insuffisant: { max: 5.2 },
            },
            national: {
              excellent: { min: 6.4 },
              tres_bien: { min: 6.2, max: 6.4 },
              bien: { min: 6.0, max: 6.2 },
              moyen: { min: 5.8, max: 6.0 },
              insuffisant: { max: 5.8 },
            },
          },
          U18: {
            departemental: {
              excellent: { min: 5.6 },
              tres_bien: { min: 5.4, max: 5.6 },
              bien: { min: 5.2, max: 5.4 },
              moyen: { min: 5.0, max: 5.2 },
              insuffisant: { max: 5.0 },
            },
            regional: {
              excellent: { min: 6.3 },
              tres_bien: { min: 6.1, max: 6.3 },
              bien: { min: 5.9, max: 6.1 },
              moyen: { min: 5.7, max: 5.9 },
              insuffisant: { max: 5.7 },
            },
            national: {
              excellent: { min: 7.0 },
              tres_bien: { min: 6.8, max: 7.0 },
              bien: { min: 6.6, max: 6.8 },
              moyen: { min: 6.4, max: 6.6 },
              insuffisant: { max: 6.4 },
            },
          },
        },
      },

      rsa_best: {
        name: 'RSA — Meilleur temps',
        unit: 's',
        direction: 'lower_is_better',
        availableFor: ['U18'],
        categories: {
          U18: {
            regional: { excellent: { max: 3.3 }, bien: { min: 3.3, max: 3.45 } },
            national: { excellent: { max: 3.1 }, bien: { min: 3.1, max: 3.2 } },
          },
        },
      },

      rsa_mean: {
        name: 'RSA — Temps moyen',
        unit: 's',
        direction: 'lower_is_better',
        availableFor: ['U18'],
        categories: {
          U18: {
            regional: { excellent: { max: 3.45 }, bien: { min: 3.45, max: 3.6 } },
            national: { excellent: { max: 3.25 }, bien: { min: 3.25, max: 3.4 } },
          },
        },
      },

      rsa_fatigue: {
        name: 'RSA — Indice fatigue',
        unit: '%',
        direction: 'lower_is_better',
        availableFor: ['U18'],
        categories: {
          U18: {
            regional: { excellent: { max: 4 }, bien: { min: 4, max: 6 } },
            national: { excellent: { max: 3 }, bien: { min: 3, max: 5 } },
          },
        },
      },

      force_squat_ratio: {
        name: 'Force relative Squat (1RM / Poids corps)',
        unit: 'x',
        direction: 'higher_is_better',
        availableFor: ['U18'],
        categories: {
          U18: {
            departemental: {
              excellent: { min: 1.1 },
              tres_bien: { min: 1.0, max: 1.1 },
              bien: { min: 0.9, max: 1.0 },
              moyen: { min: 0.8, max: 0.9 },
              insuffisant: { max: 0.8 },
            },
            regional: {
              excellent: { min: 1.3 },
              tres_bien: { min: 1.2, max: 1.3 },
              bien: { min: 1.1, max: 1.2 },
              moyen: { min: 1.0, max: 1.1 },
              insuffisant: { max: 1.0 },
            },
            national: {
              excellent: { min: 1.5 },
              tres_bien: { min: 1.4, max: 1.5 },
              bien: { min: 1.3, max: 1.4 },
              moyen: { min: 1.2, max: 1.3 },
              insuffisant: { max: 1.2 },
            },
          },
        },
      },
    },

    // ═══════════════════════════════════════════
    // TESTS DISPONIBLES PAR CATÉGORIE
    // ═══════════════════════════════════════════
    testsByCategory: {
      U11: [
        'navette_5_10_15',
        'sprint_20m',
        'equilibre_unipodal',
        'course_6min',
        'parcours_coordination',
      ],
      U13: ['navette_5_10_15', 'sprint_20m', 'cmj', 'illinois', 'course_6min', 'gainage_ventral'],
      U15: [
        'navette_5_10_15',
        'sprint_20m',
        'cmj',
        'illinois',
        'ift_30_15',
        'gainage_ventral',
        'squat_unipodal',
        'triple_saut',
      ],
      U18: [
        'navette_5_10_15',
        'sprint_20m',
        'cmj',
        'illinois',
        'ift_30_15',
        'gainage_ventral',
        'triple_saut',
        'rsa_best',
        'rsa_mean',
        'rsa_fatigue',
        'force_squat_ratio',
      ],
    },

    // ═══════════════════════════════════════════
    // CRITÈRES TECHNIQUES
    // ═══════════════════════════════════════════
    technical: {
      T1: { name: 'Maniement de balle', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      T2: { name: 'Tir', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      T3: { name: 'Passe', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      T4: { name: 'Jeu de pieds', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      T5: { name: 'Finition au cercle', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      T6: { name: 'Lancers francs', availableFor: ['U11', 'U13', 'U15', 'U18'] },
    },

    // ═══════════════════════════════════════════
    // CRITÈRES TACTIQUES
    // ═══════════════════════════════════════════
    tactical: {
      K1: { name: 'Lecture de jeu', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      K2: { name: 'Spacing', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      K3: { name: 'Défense individuelle', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      K4: {
        name: 'Aide défensive',
        availableFor: ['U13', 'U15', 'U18'],
        u11Replacement: 'Effort et intensité',
      },
      K5: { name: 'Transition', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      K6: {
        name: 'Collaboration écran / main-à-main',
        availableFor: ['U13', 'U15', 'U18'],
        u11Replacement: 'Jeu sans ballon',
      },
    },

    // ═══════════════════════════════════════════
    // CRITÈRES MENTAUX
    // ═══════════════════════════════════════════
    mental: {
      M1: { name: 'Compétitivité', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      M2: { name: 'Coachabilité', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      M3: { name: 'Leadership', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      M4: { name: 'Résilience', availableFor: ['U11', 'U13', 'U15', 'U18'] },
      M5: { name: 'Concentration', availableFor: ['U11', 'U13', 'U15', 'U18'] },
    },

    // ═══════════════════════════════════════════
    // NIVEAUX (référence commune)
    // ═══════════════════════════════════════════
    levels: ['excellent', 'tres_bien', 'bien', 'moyen', 'insuffisant'],
    levelLabels: {
      excellent: 'Excellent',
      tres_bien: 'Très bien',
      bien: 'Bien',
      moyen: 'Moyen',
      insuffisant: 'Insuffisant',
    },

    // ═══════════════════════════════════════════
    // PONDÉRATIONS SCORE GLOBAL
    // ═══════════════════════════════════════════
    globalScoreWeights: {
      physical: 0.25,
      technical: 0.2,
      tactical: 0.25,
      mental: 0.3,
    },
  };
  // Chargement depuis localStorage ou defaults
  let baremes = JSON.parse(localStorage.getItem('DETECTION_BAREMES')) || DEFAULT_BAREMES;

  // Expose global + helper pour sauvegarde
  window.DETECTION_BAREMES = baremes;
  window.saveBaremes = function (newBaremes) {
    window.DETECTION_BAREMES = newBaremes;
    localStorage.setItem('DETECTION_BAREMES', JSON.stringify(newBaremes));
  };
  window.resetBaremes = function () {
    window.DETECTION_BAREMES = JSON.parse(JSON.stringify(DEFAULT_BAREMES));
    localStorage.setItem('DETECTION_BAREMES', JSON.stringify(window.DETECTION_BAREMES));
  };
})();
