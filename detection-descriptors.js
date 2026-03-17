(function() {
  'use strict';

  window.DETECTION_DESCRIPTORS = {

    technical: {
      T1: {
        name: "Maniement de balle",
        U11: {
          excellent: "Dribble main forte fluide, ébauche main faible",
          tres_bien: "Main forte fiable en mouvement",
          bien: "Dribble tête haute en exercice",
          moyen: "Dribble fonctionnel, regarde souvent le ballon",
          insuffisant: "Difficulté à dribbler en mouvement"
        },
        U13: {
          excellent: "Dribble 2 mains courant, changements devant",
          tres_bien: "Main faible correcte, 1 changement maîtrisé",
          bien: "Main forte propre en match, faible hésitante",
          moyen: "Perd la balle sous pression légère",
          insuffisant: "Perte fréquente, aucun changement de main"
        },
        U15: {
          excellent: "Crossover, entre-les-jambes, recul sous pression",
          tres_bien: "2-3 moves solides, protège la balle",
          bien: "Changements corrects mais prévisibles",
          moyen: "Limité à 1-2 moves, difficulté en espace réduit",
          insuffisant: "Incapable de remonter face à une pression"
        },
        U18: {
          excellent: "Combo moves enchaînés, créé de l'avantage en 1c1",
          tres_bien: "Dribble de création, gère la pression haute",
          bien: "Solide sans être créatif, bon en transition",
          moyen: "Peut avancer la balle mais ne crée pas",
          insuffisant: "Dribble passif, aucune menace"
        }
      },

      T2: {
        name: "Tir",
        U11: {
          excellent: "Geste fluide courte/moyenne distance",
          tres_bien: "Tir en course correct, mécanique en construction",
          bien: "Geste reconnaissable, puissance suffisante peinture",
          moyen: "Pousse la balle, peu de régularité",
          insuffisant: "Incapable de toucher le cercle régulièrement"
        },
        U13: {
          excellent: "Mécanique propre à mi-distance, ébauche 3PT",
          tres_bien: "Bonne forme, régulier en mi-distance",
          bien: "Touche correcte, irrégulier au-delà de la raquette",
          moyen: "Mécanique approximative, résultats aléatoires",
          insuffisant: "Lancer incorrect (2 mains, pas d'arc)"
        },
        U15: {
          excellent: "Tir fiable mi-distance + 3PT, off the catch",
          tres_bien: "Catch & shoot régulier, pull-up en développement",
          bien: "Tir posé correct, décline sous pression défensive",
          moyen: "Tir plat ou trop haut, mécanique à corriger",
          insuffisant: "Mécanique cassée, évite de tirer"
        },
        U18: {
          excellent: "Tir en mouvement, step-back, catch & shoot fiable",
          tres_bien: "Menace à 3PT, tir en course des deux côtés",
          bien: "Régulier à mi-distance, 3PT inconsistant",
          moyen: "Tir statique uniquement, pas de variété",
          insuffisant: "Pas de menace extérieure, défense le laisse ouvert"
        }
      },

      T3: {
        name: "Passe",
        U11: {
          excellent: "Passe à terre et poitrine précises en mouvement",
          tres_bien: "Trouve le joueur démarqué dans l'axe",
          bien: "Passe à l'arrêt correcte, hésitante en mouvement",
          moyen: "Passe molle ou imprécise",
          insuffisant: "Difficulté à transmettre le ballon proprement"
        },
        U13: {
          excellent: "Passe dans le timing, début de passe à une main",
          tres_bien: "Passe correcte en déplacement, des deux côtés",
          bien: "Passe fonctionnelle, parfois en retard",
          moyen: "Tourne le dos à la passe facile, vision tunnel",
          insuffisant: "Pertes de balle fréquentes sur les passes"
        },
        U15: {
          excellent: "Passes variées (skip, lobée, wrap-around), bon timing",
          tres_bien: "Skip pass fiable, trouve le shooteur en rotation",
          bien: "Exécution correcte mais lecture lente",
          moyen: "Passe uniquement au joueur face à lui",
          insuffisant: "Incapable de passer sous pression"
        },
        U18: {
          excellent: "Passe de création, anticipe les coupes, vision complète",
          tres_bien: "Passe dans le trafic, pick & roll delivery",
          bien: "Exécute les passes classiques, manque de créativité",
          moyen: "Passes lisibles par la défense, timing décalé",
          insuffisant: "Passes télégraphiées, source de turnovers"
        }
      },

      T4: {
        name: "Jeu de pieds",
        U11: {
          excellent: "Arrêt 1 temps et 2 temps acquis, pivot correct",
          tres_bien: "Arrêt 2 temps fiable, pied de pivot identifié",
          bien: "Arrêt parfois déséquilibré mais fonctionnel",
          moyen: "Marcher fréquent, concept du pivot flou",
          insuffisant: "Aucune conscience du pied de pivot"
        },
        U13: {
          excellent: "Pivot pied d'appui maîtrisé, drop step début",
          tres_bien: "Marcher rare, jab step en apprentissage",
          bien: "Marcher occasionnel sous pression",
          moyen: "Perd souvent son pivot, pas d'enchaînement",
          insuffisant: "Marcher systématique"
        },
        U15: {
          excellent: "Jab step, shot fake + drive, up & under",
          tres_bien: "Combinaisons pivot + tir en progression",
          bien: "Jeu de pieds correct en situation simple",
          moyen: "Jeu de pieds rigide, lent à réagir",
          insuffisant: "Statique, aucune feinte de pied"
        },
        U18: {
          excellent: "Footwork complet attaque + défense, posts moves",
          tres_bien: "Solide en poste bas, close-out contrôlé",
          bien: "Fondamentaux acquis, manque de variété",
          moyen: "Pieds lents en défense, enchaînements limités",
          insuffisant: "Footwork inexistant, handicap en 1c1"
        }
      },

      T5: {
        name: "Finition au cercle",
        U11: {
          excellent: "Lay-up main droite + gauche en course",
          tres_bien: "Lay-up main forte fiable",
          bien: "Lay-up en situation facile, hésite en match",
          moyen: "Manque le lay-up en situation de jeu",
          insuffisant: "Ne sait pas faire de lay-up"
        },
        U13: {
          excellent: "Lay-up 2 mains + début de double-pas varié",
          tres_bien: "Lay-up main faible en progression, power lay-up",
          bien: "Main forte correcte, main faible évitée",
          moyen: "Lay-up uniquement côté fort",
          insuffisant: "Évite d'aller au panier"
        },
        U15: {
          excellent: "Finition en contact, euro step, floater",
          tres_bien: "Bonne main faible, supporte le contact léger",
          bien: "Finit proprement sans opposition forte",
          moyen: "Perd ses moyens au contact",
          insuffisant: "Aucune finition sous le cercle"
        },
        U18: {
          excellent: "Finition ambidextre, ajuste en l'air, and-1",
          tres_bien: "Varié, gère les aide-défenseurs",
          bien: "Correct mais prévisible, manque de toucher",
          moyen: "Finition limitée, déposé facilement",
          insuffisant: "Se fait contrer systématiquement"
        }
      },

      T6: {
        name: "Lancers francs",
        U11: {
          excellent: "Routine installée, > 50%",
          tres_bien: "Geste correct, 40-50%",
          bien: "Touche le cercle régulièrement, 30-40%",
          moyen: "Arc insuffisant, < 30%",
          insuffisant: "Ne touche pas le cercle"
        },
        U13: {
          excellent: "Mécanique propre, > 60%",
          tres_bien: "50-60%, routine en place",
          bien: "40-50%, mécanique en progrès",
          moyen: "< 40%, geste irrégulier",
          insuffisant: "< 30%, peur de la ligne"
        },
        U15: {
          excellent: "Régulier, > 70%",
          tres_bien: "60-70%, gère la pression",
          bien: "55-60%, régulier sans pression",
          moyen: "45-55%, mécanique à stabiliser",
          insuffisant: "< 45%, mécanique cassée"
        },
        U18: {
          excellent: "Fiable, > 75%, clutch",
          tres_bien: "70-75%, régulier",
          bien: "65-70%, quelques séries faibles",
          moyen: "55-65%, irrégulier",
          insuffisant: "< 55%, déficit mental"
        }
      }
    },

    tactical: {
      K1: {
        name: "Lecture de jeu",
        U11: {
          excellent: "Choisit souvent la bonne option (passe/tir/dribble)",
          tres_bien: "Comprend quand tirer vs passer",
          bien: "Fait des choix logiques en situation simple",
          moyen: "Décisions souvent en retard",
          insuffisant: "Aucune lecture, joue à l'instinct"
        },
        U13: {
          excellent: "Lit les surnombres, exploite le 2c1",
          tres_bien: "Reconnaît les situations de surnombre",
          bien: "Début de lecture, parfois en retard",
          moyen: "Joue en tunnel, ignore les démarquages",
          insuffisant: "Ne comprend pas les situations de jeu"
        },
        U15: {
          excellent: "Lit la défense, timing des coupes, drive & kick",
          tres_bien: "Bonne lecture en jeu posé, plus lent en transition",
          bien: "Lecture correcte mais lente",
          moyen: "Prend des décisions prévisibles",
          insuffisant: "Décisions erronées répétées"
        },
        U18: {
          excellent: "Anticipe les rotations, décisions rapides en PnR",
          tres_bien: "Décisions correctes, quelques erreurs sous pression",
          bien: "Lit le jeu mais exécution parfois décalée",
          moyen: "Lecture mécanique, pas d'anticipation",
          insuffisant: "Pertes de balle décisionnelles chroniques"
        }
      },

      K2: {
        name: "Spacing",
        U11: {
          excellent: "Se déplace pour offrir une solution de passe",
          tres_bien: "Ne colle pas le porteur, se positionne à distance",
          bien: "Reste relativement en place, ne gêne pas",
          moyen: "Suit le ballon (grappe)",
          insuffisant: "Toujours collé au porteur"
        },
        U13: {
          excellent: "Occupe le côté faible, se replace après un écran",
          tres_bien: "Comprend les spots de base",
          bien: "Spacing correct mais statique",
          moyen: "Encombre la raquette",
          insuffisant: "Aucune notion d'espacement"
        },
        U15: {
          excellent: "Se démarque activement, crée de l'espace pour les autres",
          tres_bien: "Se place correctement en jeu posé",
          bien: "Occupe les spots mais manque de dynamisme",
          moyen: "Spacing aléatoire, oublie le côté faible",
          insuffisant: "Crée des embouteillages"
        },
        U18: {
          excellent: "Spacing parfait, tire parti du floor balance",
          tres_bien: "Bon positionnement, ajuste au drive adverse",
          bien: "Connaît les spots, mouvement limité",
          moyen: "Spacing passif, mauvais timing de remplacement",
          insuffisant: "Nuit à l'attaque par son positionnement"
        }
      },

      K3: {
        name: "Défense individuelle",
        U11: {
          excellent: "Reste entre son joueur et le panier",
          tres_bien: "Suit son joueur, effort constant",
          bien: "Effort défensif présent, positionnement approximatif",
          moyen: "Se perd souvent, regarde le ballon",
          insuffisant: "Aucun effort défensif"
        },
        U13: {
          excellent: "Bonne position défensive, conteste les tirs",
          tres_bien: "Position correcte, réagit au drive",
          bien: "Défend correctement à mi-distance",
          moyen: "Position haute, se fait couper",
          insuffisant: "Ne défend pas, spectateur"
        },
        U15: {
          excellent: "Pression sur la balle, ferme les lignes de drive",
          tres_bien: "Force le joueur sur son côté faible",
          bien: "Défense honnête, se fait battre en vitesse",
          moyen: "Défense réactive, jamais proactive",
          insuffisant: "Passoire en 1c1"
        },
        U18: {
          excellent: "Défend en 1c1, aide et récupère, switch",
          tres_bien: "Solide sur le porteur, communique",
          bien: "Correct mais pas dominant, quelques retards",
          moyen: "Se fait battre en 1c1, aide tardive",
          insuffisant: "Liability défensive"
        }
      },

      K4: {
        name: "Aide défensive",
        U11: {
          _replacement: "Effort et intensité",
          excellent: "Effort maximal sur chaque action, ne lâche jamais",
          tres_bien: "Effort constant, quelques baisses de régime",
          bien: "Effort présent, régularité à travailler",
          moyen: "Effort par intermittence",
          insuffisant: "Peu ou pas d'effort défensif"
        },
        U13: {
          excellent: "Comprend le principe d'aide sur drive",
          tres_bien: "Réagit à la pénétration adverse",
          bien: "Aide en retard mais effort visible",
          moyen: "Reste sur son joueur systématiquement",
          insuffisant: "Aucune conscience de l'aide"
        },
        U15: {
          excellent: "Aide et récupère, rotation côté faible",
          tres_bien: "Aide correcte, récupération parfois lente",
          bien: "Aide présente, mauvais timing",
          moyen: "Aide absente ou tardive",
          insuffisant: "Ne comprend pas les rotations"
        },
        U18: {
          excellent: "Aide positionnée, rotation complète, communication",
          tres_bien: "Aide fiable, couvre les erreurs des coéquipiers",
          bien: "Aide correcte, rotation incomplète",
          moyen: "Aide aléatoire, crée des 3PT ouvertes",
          insuffisant: "Trou dans la défense collective"
        }
      },

      K5: {
        name: "Transition",
        U11: {
          excellent: "Sprinte en attaque ET en défense",
          tres_bien: "Court des deux côtés, bon effort",
          bien: "Court en attaque, repli moyen",
          moyen: "Ne court que quand il a la balle",
          insuffisant: "Statique"
        },
        U13: {
          excellent: "Remplit les couloirs, prend de bonnes décisions",
          tres_bien: "Repli défensif constant, attaque rapide",
          bien: "Transition offensive correcte, repli parfois lent",
          moyen: "Repli défensif négligé",
          insuffisant: "Aucun repli défensif"
        },
        U15: {
          excellent: "Premier ou deuxième coureur, sait quand pousser ou poser",
          tres_bien: "Couloir large ou drive, décision correcte",
          bien: "Effort constant, décisions basiques",
          moyen: "Marche en repli, se fait prendre",
          insuffisant: "Ne participe pas à la transition"
        },
        U18: {
          excellent: "Gère la transition, répartit les côtés, early offense",
          tres_bien: "Bon tempo, repli + communication",
          bien: "Transition honnête, pas de création",
          moyen: "Lent à se replacer, opportunités gâchées",
          insuffisant: "Handicap en jeu rapide"
        }
      },

      K6: {
        name: "Collaboration écran / main-à-main",
        U11: {
          _replacement: "Jeu sans ballon",
          excellent: "Se démarque activement, appels de balle clairs",
          tres_bien: "Bouge pour offrir des solutions",
          bien: "Quelques démarquages, parfois statique",
          moyen: "Attend la balle sans bouger",
          insuffisant: "Statique, aucun mouvement sans ballon"
        },
        U13: {
          excellent: "Main-à-main fluide, bon timing de remise, enchaîne après la réception",
          tres_bien: "Main-à-main correct, se rend disponible au bon moment",
          bien: "Comprend le principe du main-à-main, timing parfois décalé",
          moyen: "Main-à-main mécanique, ne lit pas la suite",
          insuffisant: "Ignore les situations de main-à-main, statique"
        },
        U15: {
          excellent: "Utilise le PnR, lit la réaction du défenseur, main-à-main maîtrisé",
          tres_bien: "PnR correct, lit le switch vs hedge",
          bien: "Utilise l'écran mais choix limité, main-à-main acquis",
          moyen: "Écran mou, utilisation mécanique",
          insuffisant: "Incapable d'utiliser un écran ou main-à-main"
        },
        U18: {
          excellent: "Reads complets : reject, snake, split, pop/roll",
          tres_bien: "Utilise et pose, bon timing",
          bien: "Correct sans créativité",
          moyen: "PnR basique, ne lit pas la défense",
          insuffisant: "Aucune lecture PnR"
        }
      }
    }
  };

})();
