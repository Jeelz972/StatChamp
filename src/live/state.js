// src/live/state.js -- State global du match live
// Extrait de live.html sans modification de structure

export const SWIPE_CONFIG = { threshold: 50, maxDuration: 500, doubleTapDelay: 300 };

export const State = {
  match: {
    id: null,
    date: null,
    opponent: 'Adversaire',
    isHome: true,
    quarter: 1,
    time: 600,
    running: false,
    pauseStartWall: null,
    phase: 'phase1',
  },
  players: {},
  actions: [],
  onCourt: { home: [], away: [] },
  starters: { 1: [], 2: [], 3: [], 4: [] },
  opponentStarters: { 1: [], 2: [], 3: [], 4: [] },
  teamFouls: { home: [0, 0, 0, 0], away: [0, 0, 0, 0] },
  scoreHistory: [],
  specialFouls: { technical: [], unsportsmanlike: [], offensive: [] },
  playTypes: [
    'Transition', 'Pick & Roll', 'Jeu posté',
    'Isolation', 'Motion', 'Sortie de temps mort',
  ],
  timeouts: { home: [], away: [] },
  currentPlay: null,
  ui: { sel: null, pending: null, ctx: {}, lastActionTime: 0, pendingAction: null },
  selectedIds: [],
  oppPlayers: [
    { num: '4', name: 'J4' }, { num: '5', name: 'J5' },
    { num: '6', name: 'J6' }, { num: '7', name: 'J7' },
    { num: '8', name: 'J8' }, { num: '9', name: 'J9' },
    { num: '10', name: 'J10' }, { num: '11', name: 'J11' },
    { num: '12', name: 'J12' },
  ],
};

// Expose globalement (le script inline y accede encore).
// Guard : le script inline peut avoir defini window.LiveState en premier
// (les module scripts sont differés et s'exécutent après le script inline classique).
if (typeof window !== 'undefined') {
  if (!window.LiveState) window.LiveState = State;
  if (!window.SWIPE_CONFIG) window.SWIPE_CONFIG = SWIPE_CONFIG;
}
